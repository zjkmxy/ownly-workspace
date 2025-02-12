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
