/**
 * Write file to OPFS recursively
 * @param filename Full path of the file
 * @param content File content
 */
export async function writeFileOpfsRecursive(filename: string, content: Uint8Array) {
  let folder = await self.navigator.storage.getDirectory();
  const parts = filename.split('/').filter(Boolean);
  for (let i = 0; i < parts.length - 1; i++) {
    folder = await folder.getDirectoryHandle(parts[i], { create: true });
  }

  const basename = parts[parts.length - 1];
  if (!basename) return;
  const file = await folder.getFileHandle(basename, { create: true });
  const writable = await file.createWritable();
  await writable.write(content);
  await writable.close();
}
