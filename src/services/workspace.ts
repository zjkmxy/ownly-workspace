import router from "@/router";
import ndn, { type WorkspaceAPI } from "@/services/ndn";
import storage from "@/services/storage";
import { useToast } from "vue-toast-notification";
import { EventEmitter } from "events";

import * as Y from 'yjs';
import { IndexeddbPersistence } from "y-indexeddb";
import * as utils from "@/utils/index";

import type { IChatMessage, IWorkspace } from "@/services/types";
import type TypedEmitter from "typed-emitter";

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

    public events = new EventEmitter() as TypedEmitter<{
        chat: (msg: IChatMessage) => void;
    }>;

    private chatDoc = new Y.Doc();
    private chatPersistence = new IndexeddbPersistence("chat", this.chatDoc); //TODO: per workspace
    private chatArray = this.chatDoc.getArray<IChatMessage>("chat");

    constructor(public metadata: IWorkspace) { }

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

        // Propagate updates to application
        this.chatArray.observe((event) => {
            if (this.events.listenerCount("chat") === 0) return;

            for (const delta of event.changes.added) {
                for (const c of delta.content.getContent()) {
                    this.events.emit("chat", c);
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
     * Send chat message to SVS ALO
     * @param pub Chat message
     */
    async sendChat(pub: IChatMessage) {
        this.chatArray.push([pub]);
    }

    /**
     * Get state of chat messages
     * @returns Array of chat messages
     */
    async getChatState(): Promise<IChatMessage[]> {
        await this.chatPersistence.whenSynced;
        return this.chatArray.toArray();
    }
}


