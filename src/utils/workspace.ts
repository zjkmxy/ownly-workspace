import router from "@/router";
import ndn from "@/services/ndn";
import storage from "@/services/storage";
import type { IWorkspace } from "@/services/types";
import { useToast } from "vue-toast-notification";

/**
 * Escape NDN name to URL parameter.
 * All / are replaced with -
 * All - are replaced with %2D
 */
export function escapeUrlName(input: string) {
    if (input[0] === "/") input = input.slice(1);
    return input
        .replace(/-/g, "--")
        .replace(/\//g, "-");
}

/**
 * Unescape URL parameter to NDN name.
 * @param name Escaped NDN name
 */
export function unescapeUrlName(input: string) {
    let output = input
        .replace(/--/g, "||")
        .replace(/-/g, "/")
        .replace(/\|\|/g, "-");
    if (output[0] !== "/") output = "/" + output;
    return output;
}

/**
 * Setup workspace from URL parameter or redirect to home.
 * @returns Workspace object or null if not found
 */
export async function setupWorkspaceOrRedirect(): Promise<IWorkspace | null> {
    // Unescape workspace name from URL
    let space = String(router.currentRoute.value?.params?.space);
    if (!space) {
        router.replace("/");
        return null;
    }
    space = unescapeUrlName(space);

    // Get workspace configuration from storage
    const wksp = await storage.db.workspaces.get(space);
    if (!wksp) {
        const $toast = useToast();
        $toast.error(`Workspace not found, have you joined it? <br/> [${space}]`);
        router.replace("/");
        return null;
    }

    // Start state vector sync
    ndn.startWorkspace(wksp.name);

    return wksp;
}