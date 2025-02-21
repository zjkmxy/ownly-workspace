/**
 * Prompts the user to select files from their file system.
 */
export async function selectFiles(opts: { accept?: string; multiple?: boolean }): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';

    input.multiple = opts.multiple ?? false;
    input.accept = opts.accept ?? '*/*';

    input.onchange = () => {
      if (input.files) {
        resolve(Array.from(input.files));
      } else {
        resolve([]);
      }
      input.remove();
    };

    input.oncancel = input.onabort = () => {
      resolve([]);
      input.remove();
    };

    input.click();
  });
}

/**
 * Tries to return a monotonically increasing epoch time.
 * If two calls are made within the same millisecond, the second call will be higher.
 * This is useful for sorting updates in a database.
 */
export function monotonicEpoch(): number {
  let time = Date.now();
  while (time <= lastMonotonicEpoch) time++;
  lastMonotonicEpoch = time;
  return time;
}
let lastMonotonicEpoch = 0;

/**
 * Checks if a path is valid for a project.
 *
 * @param path Path to check.
 */
export function isPathValid(path: string): boolean {
  return !/[<>:'"|?*\\]/g.test(path);
}

/**
 * Format bytes as human-readable text.
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
export function humanFileSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + ' ' + units[u];
}
