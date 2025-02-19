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
