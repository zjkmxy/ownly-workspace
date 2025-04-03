import { exportWorker } from 'webworker-typed';

/**
 * Write to a file and close it
 * @param handle File handle
 * @param content Content to write
 */
export async function writeContents(
  handle: FileSystemFileHandle,
  content: ArrayBuffer,
): Promise<number> {
  const syncHandle = await handle.createSyncAccessHandle();
  syncHandle.truncate(0);
  syncHandle.write(content);
  syncHandle.flush();

  const size = syncHandle.getSize();
  syncHandle.close();
  return size;
}

export default exportWorker({
  writeContents,
});
