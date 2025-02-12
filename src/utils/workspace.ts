import router from "@/router";
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

function unescape(input: string) {

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

export async function getWorkspaceOrRedirect(): Promise<IWorkspace | null> {
    let space = String(router.currentRoute.value?.params?.space);
    if (!space) {
        router.replace("/");
        return null;
    }

    space = unescapeUrlName(space);

    const wksp = await storage.db.workspaces.get(space);
    if (!wksp) {
        const $toast = useToast();
        $toast.error(`Workspace not found, have you joined it? <br/> [${space}]`);
        router.replace("/");
        return null;
    }

    return wksp;
}