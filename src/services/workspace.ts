import router from "@/router";
import ndn, { type WorkspaceAPI } from "@/services/ndn";
import storage from "@/services/storage";
import { useToast } from "vue-toast-notification";
import { EventEmitter } from "events";

import * as Y from 'yjs';
import { IndexeddbPersistence } from "y-indexeddb";
import * as utils from "@/utils/index";

import type { IChatChannel, IChatMessage, IWorkspace } from "@/services/types";
import type TypedEmitter from "typed-emitter";

/**
 * Global events across workspace boundaries
 */
export const GlobalWkspEvents = new EventEmitter() as TypedEmitter<{
    'chat-channels': (channels: IChatChannel[]) => void;
}>;

/**
 * We keep an active instance of the open workspace.
 * This always runs in the background collecting data.
 */
let active: Workspace | null = null;

/**
 * Setup workspace from URL parameter or redirect to home.
 * @returns Workspace object or null if not found
 */
export async function setupOrRedir(): Promise<Workspace | null> {
    // Unescape workspace name from URL
    let space = String(router.currentRoute.value?.params?.space);
    if (!space) {
        router.replace("/");
        return null;
    }
    space = utils.unescapeUrlName(space);

    // Get workspace configuration from storage
    const wksp = await storage.db.workspaces.get(space);
    if (!wksp) {
        useToast().error(`Workspace not found, have you joined it? <br/> [${space}]`);
        router.replace("/");
        return null;
    }

    // Start workspace if not already active
    if (active?.metadata.name !== wksp.name) {
        try {
            active?.stop();
            active = new Workspace(wksp);
            await active.start();
        } catch (e) {
            console.error(e);
            useToast().error(`Failed to start workspace: ${e}`);
            return null;
        }
    }

    return active;
}

/**
 * Workspace service
 */
export class Workspace {
    public api!: WorkspaceAPI;
    public readonly slug: string;

    public readonly events = new EventEmitter() as TypedEmitter<{
        chat: (channel: string, message: IChatMessage) => void;
    }>;

    private readonly chatDoc = new Y.Doc();
    private readonly chatChannels = this.chatDoc.getArray<IChatChannel>("_chan_");
    private readonly chatMessages = this.chatDoc.getMap<Y.Array<IChatMessage>>("_msg_");
    private readonly chatPersistence: IndexeddbPersistence;

    constructor(public metadata: IWorkspace) {
        this.slug = utils.escapeUrlName(metadata.name);
        this.chatPersistence = new IndexeddbPersistence(this.slug + "-chat", this.chatDoc);

        // Set up global event notifications
        this.chatChannels.observe(() => {
            GlobalWkspEvents.emit('chat-channels', this.chatChannels.toArray());
        });
    }

    /**
     * Start the workspace.
     * This will connect to the testbed and start the SVS instance.
     */
    async start() {
        // Start connection to testbed
        await ndn.api.connect_testbed();

        // Set up client and ALO
        this.api = await ndn.api.make_workspace(this.metadata.name);
        (<any>window).wksp = this.api;

        // Setup all subscriptions
        this.api.svs_alo.subscribe({
            // Chat YJS updates
            on_chat: (info, pub) => {
                try { Y.applyUpdateV2(this.chatDoc, pub.message); }
                catch (e) { console.error("Failed to apply chat update", e); }
            },
        });

        // Set up YJS publishers
        this.chatDoc.on("updateV2", async (buf, _1, _2, tx) => {
            if (!tx.local) return;
            await this.api.svs_alo.publish_chat(buf);
        });

        // Propagate chat message updates to listeners
        this.chatMessages.observeDeep((events) => {
            if (this.events.listenerCount("chat") === 0) return;
            for (const event of events) {
                const channel = String(event.path[0]);
                for (const delta of event.changes.added) {
                    for (const message of delta.content.getContent()) {
                        this.events.emit("chat", channel, message);
                    }
                }
            }
        });

        // Start SVS instance
        await this.api.start();
    }

    /**
     * Stop the workspace.
     * This will stop the SVS instance and disconnect from the testbed.
     */
    async stop() {
        await this.api.stop();

        // Disconnect all listeners and destroy YJS document
        this.chatDoc.destroy();
    }

    /**
     * Get chat channels
     * @returns Array of chat channels
     */
    async getChatChannels(): Promise<IChatChannel[]> {
        await this.chatPersistence.whenSynced;
        return this.chatChannels.toArray();
    }

    /**
     * Create a new chat channel
     * @param channel Chat channel
     */
    async createChatChannel(channel: IChatChannel) {
        this.chatChannels.push([channel]);
        this.chatMessages.set(channel.name, new Y.Array<IChatMessage>());
    }

    /**
     * Get the messages array for a chat channel
     *
     * @param channel Chat channel
     */
    private async getChatArray(channel: string): Promise<Y.Array<IChatMessage>> {
        await this.chatPersistence.whenSynced;
        const array = this.chatMessages.get(channel);
        if (!array) throw new Error("Channel does not exist");
        return array;
    }

    /**
     * Get history of chat messages
     *
     * @returns Array of chat messages
     */
    async getChatMessages(channel: string): Promise<IChatMessage[]> {
        return (await this.getChatArray(channel)).toArray();
    }

    /**
     * Send chat message to a channel
     *
     * @param message Chat message
     */
    async sendChatMessage(channel: string, message: IChatMessage) {
        (await this.getChatArray(channel)).push([message]);
    }
}


