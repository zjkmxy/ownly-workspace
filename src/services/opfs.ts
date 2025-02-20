/**
 * Write file to OPFS recursively
 * @param path Full path of the file
 * @param content File content
 */
export async function writeFile(
  path: string,
  content: Uint8Array,
  opts?: {
    create?: boolean;
    root?: FileSystemDirectoryHandle;
  },
) {
  const parts = path.split('/').filter(Boolean);
  const folder = parts.slice(0, -1).join('/');
  const folderHandle = await getDirectoryHandle(folder, {
    create: opts?.create,
    root: opts?.root,
  });

  const basename = parts[parts.length - 1];
  if (!basename) return;
  const file = await folderHandle.getFileHandle(basename, { create: opts?.create });
  const writable = await file.createWritable();
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
