import router from "@/router";
import ndn, { type SvsAloPubInfo, type WorkspaceAPI } from "@/services/ndn";
import storage from "@/services/storage";
import { useToast } from "vue-toast-notification";
import { EventEmitter } from "events";
import * as utils from "@/utils/index";

import type { IChatMessage, IWorkspace } from "@/services/types";
import type TypedEmitter from "typed-emitter";

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
            on_chat: (info, pub) => this.onChat(info, utils.unbyteify(pub.message)),
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
    }

    /**
     * Send chat message to SVS ALO
     * @param pub Chat message
     */
    async sendChat(pub: IChatMessage) {
        await this.api.svs_alo.publish_chat(utils.byteify(pub));
    }

    /**
     * Process incoming chat message
     * @param info Publication metadata
     * @param msg Chat message
     */
    private onChat(info: SvsAloPubInfo, msg: IChatMessage): void {
        this.events.emit("chat", msg);
    }
}


