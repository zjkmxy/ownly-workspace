/**
 * Escape NDN name to URL parameter.
 * All / are replaced with -
 * All - are replaced with %2D
 */
export function escapeUrlName(input: string) {
  if (input[0] === '/') input = input.slice(1);
  return input.replace(/-/g, '--').replace(/\//g, '-');
}

/**
 * Unescape URL parameter to NDN name.
 * @param name Escaped NDN name
 */
export function unescapeUrlName(input: string) {
  let output = input.replace(/--/g, '||').replace(/-/g, '/').replace(/\|\|/g, '-');
  if (output[0] !== '/') output = '/' + output;
  return output;
}

/**
 * Encode JSON data to Uint8Array
 * @param data Data to encode
 */
export function byteify<T>(data: T): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(JSON.stringify(data));
}

/**
 * Decode JSON data from Uint8Array
 * @param data Data to decode
 */
export function unbyteify<T>(data: Uint8Array): T {
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(data));
}

/**
 * Normalize a path.
 * @param path Path to normalize
 */
export function normalizePath(path: string): string {
  if (!path) return path;
  if (path[0] !== '/') path = '/' + path;
  return path.replace(/\/+/g, '/');
}
