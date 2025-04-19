/** Parses base64 string into Uint8Array. Throws if failed. */
export const base64ToBytes = (base64: string): Uint8Array => {
  const binString = atob(base64);
  return Uint8Array.from(binString, (m) => m.codePointAt(0) || 0);
}

/** Encodes Uint8Array into base64 string. Throws if failed. */
export const bytesToBase64 = (bytes: Uint8Array): string => {
  const binString = Array.from(bytes, (x) => String.fromCodePoint(x)).join('');
  return btoa(binString);
}

/** Convert text to UTF-8 encoded number array for JSON encoding */
export const textToNumberArray = (jsonText: string): Array<number> => {
  return Array.from(new TextEncoder().encode(jsonText));
}

/** Convert UTF-8 encoded number array to text */
export const numberArrayToText = (binaries: Array<number>): string => {
  return new TextDecoder().decode(new Uint8Array(binaries));
}
