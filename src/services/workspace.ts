import router from "@/router";
import ndn from "@/services/ndn";
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
        const $toast = useToast();
        $toast.error(`Workspace not found, have you joined it? <br/> [${space}]`);
        router.replace("/");
        return null;
    }

    // Start workspace if not already active
    if (active?.metadata.name !== wksp.name) {
        active?.stop();
        active = new Workspace(wksp);
        await active.start();
    }

    return active;
}

/**
 * Workspace service
 */
export class Workspace {
    constructor(public metadata: IWorkspace) {
    }

    async start() {
        // Start connection to testbed
        await ndn.api.connect_testbed();

        // TODO: start SVS instance
    }

    stop() {
        // TODO: Stop SVS instance
    }
}
