import router from "@/router";
import { useToast } from "vue-toast-notification";
import { EventEmitter } from "events";

import * as Y from 'yjs';
import { IndexeddbPersistence } from "y-indexeddb";

import { WorkspaceChat } from "./chat";
import * as utils from "@/utils/index";
import storage from "@/services/storage";
import ndn from "@/services/ndn";

import type { SvsAloApi, WorkspaceAPI } from "@/services/ndn";
import type { IChatChannel, IWorkspace } from "@/services/types";
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

    private readonly genDoc = new Y.Doc();
    private readonly genPers: IndexeddbPersistence;
    private genSvs!: SvsAloApi;

    public readonly chat: WorkspaceChat;

    constructor(public readonly metadata: IWorkspace) {
        this.slug = utils.escapeUrlName(metadata.name);
        this.genPers = new IndexeddbPersistence(this.slug + "-gen", this.genDoc);
        this.chat = new WorkspaceChat(this.genDoc, this.genPers);
    }

    /**
     * Start the workspace.
     * This will connect to the testbed and start the SVS instance.
     */
    async start() {
        // Start connection to testbed
        await ndn.api.connect_testbed();

        // Set up client and ALO
        this.api = await ndn.api.get_workspace(this.metadata.name);
        await this.api.start();
        (<any>window).wksp = this.api;

        // Create general SVS group
        this.genSvs = await this.api.svs_alo(this.metadata.name + '/32=gen');
        await this.genSvs.subscribe({
            on_yjs_delta: (info, pub) => {
                try { Y.applyUpdateV2(this.genDoc, pub.binary); }
                catch (e) { console.error("Failed to apply general update", e); }
            },
        });
        await this.genSvs.start();
        this.genDoc.on("updateV2", async (buf, _1, _2, tx) => {
            if (!tx.local) return;
            await this.genSvs.pub_yjs_delta(buf);
        });
    }

    /**
     * Stop the workspace.
     * This will stop the SVS instance and disconnect from the testbed.
     */
    async stop() {
        await this.genSvs.stop();
        await this.api.stop();
        this.genDoc.destroy();
    }
}


