import router from "@/router";
import ndn, { type WorkspaceAPI } from "@/services/ndn";
import storage from "@/services/storage";
import type { IWorkspace } from "@/services/types";
import { useToast } from "vue-toast-notification";
import * as utils from "@/utils/index";

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

    constructor(public metadata: IWorkspace) {
    }

    async start() {
        // Start connection to testbed
        await ndn.api.connect_testbed();

        // Start SVS instance
        this.api = await ndn.api.make_workspace(this.metadata.name);
        console.log("Workspace started", this.api);
    }

    stop() {
        // TODO: Stop SVS instance
    }
}
