/**
 * Get handle to a file in OPFS recursively
 * @param path Full path of the file
 * @param content File content
 */
export async function getFileHandle(
  path: string,
  opts?: {
    create?: boolean;
    root?: FileSystemDirectoryHandle;
  },
): Promise<FileSystemFileHandle | null> {
  const parts = path.split('/').filter(Boolean);
  const folder = parts.slice(0, -1).join('/');
  const folderHandle = await getDirectoryHandle(folder, {
    create: opts?.create,
    root: opts?.root,
  });

  const basename = parts[parts.length - 1];
  if (!basename) return null;

  return await folderHandle.getFileHandle(basename, { create: opts?.create });
}

/**
 * Write to a file and close it
 * @param handle File handle
 * @param content Content to write
 */
export async function write(handle: FileSystemFileHandle, content: Uint8Array): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

/**
 * Get directory handle from OPFS recursively
 * @param path Path to the directory
 * @returns Directory handle
 */
export async function getDirectoryHandle(
  path: string,
  opts?: {
    create?: boolean;
    root?: FileSystemDirectoryHandle;
  },
): Promise<FileSystemDirectoryHandle> {
  let folder = opts?.root ?? (await self.navigator.storage.getDirectory());
  const parts = path.split('/').filter(Boolean);
  for (const part of parts) {
    folder = await folder.getDirectoryHandle(part, {
      create: opts?.create ?? false,
    });
  }
  return folder;
}

/**
 * Walk through the OPFS and call a callback for each file
 * @param folder Root directory handle
 * @param path Path to the directory
 */
export async function* walk(
  folder: FileSystemDirectoryHandle,
  path: string,
): AsyncGenerator<[string, FileSystemFileHandle, FileSystemDirectoryHandle]> {
  for await (const [name, entry] of folder.entries()) {
    if (entry instanceof FileSystemFileHandle) {
      yield [`${path}${name}`, entry, folder];
    } else if (entry instanceof FileSystemDirectoryHandle) {
      yield* walk(entry, `${path}${name}/`);
    }
  }
}
