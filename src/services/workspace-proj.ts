import * as Y from 'yjs';
import * as awareProto from 'y-protocols/awareness.js';

import { GlobalBus } from './event-bus';
import { SvsProvider } from './svs-provider';
import * as opfs from '@/services/opfs';
import * as utils from '@/utils';

import type { WorkspaceAPI } from './ndn';
import type { IProject, IProjectFile } from './types';

/**
 * Project manager for the workspace.
 * Keeps track of the list of projects and their instances.
 * Each project has its own SVS sync group / provider.
 */
export class WorkspaceProjManager {
  private readonly list: Y.Map<IProject>;
  private readonly instances: Map<string, WorkspaceProj> = new Map();
  public active: WorkspaceProj | null = null;

  private constructor(
    private readonly wksp: WorkspaceAPI,
    private readonly root: Y.Doc,
  ) {
    this.list = this.root.getMap<IProject>('list');

    const listObserver = async () => GlobalBus.emit('project-list', await this.getProjects());
    this.list.observe(listObserver);
    listObserver();
  }

  /** Name of the workspace (group) */
  public get group(): string {
    return this.wksp.group;
  }

  /** Create the project manager instance */
  public static async create(
    wksp: WorkspaceAPI,
    provider: SvsProvider,
  ): Promise<WorkspaceProjManager> {
    const doc = await provider.getDoc('proj');
    return new WorkspaceProjManager(wksp, doc);
  }

  /** Destroy the project manager instance */
  public async destroy() {
    await Promise.all(Array.from(this.instances.values()).map((proj) => proj.destroy()));
    this.instances.clear();
    this.root.destroy();
    this.active = null;
  }

  /** Get the list of projects */
  public async getProjects(): Promise<IProject[]> {
    return Array.from(this.list.values());
  }

  /** Create a new project */
  public async newProject(name: string) {
    if (!name) throw new Error('Project name is required');
    if (this.list.has(name)) throw new Error('Project already exists');
    this.list.set(name, { name });
  }

  /** Get a project instance */
  public async get(name: string): Promise<WorkspaceProj> {
    let proj = this.instances.get(name);
    if (proj) return proj;

    // Get metadata from project list
    if (!this.list.has(name)) throw new Error('Project not found');

    // Create project instance
    proj = await WorkspaceProj.create(name, this.wksp, this);
    this.instances.set(name, proj);
    return proj;
  }
}

/**
 * Project instance for the workspace.
 * Each project has its own SVS sync group / provider.
 */
export class WorkspaceProj {
  private readonly fileMap: Y.Map<IProjectFile>;

  private constructor(
    public readonly name: string,
    private readonly root: Y.Doc,
    private readonly provider: SvsProvider,
    private readonly manager: WorkspaceProjManager,
  ) {
    // Set up file list
    this.fileMap = root.getMap('file_list');
    this.fileMap.observe(() => this.onListChange());
  }

  /**
   * Create a new project instance
   *
   * @param name Project name (slug)
   * @param wksp Workspace API
   * @param manager Project manager instance
   */
  public static async create(
    name: string,
    wksp: WorkspaceAPI,
    manager: WorkspaceProjManager,
  ): Promise<WorkspaceProj> {
    // Start SVS for project
    const provider = await SvsProvider.create(wksp, name);

    // Create root document
    const root = await provider.getDoc('root');

    // Create project object
    return new WorkspaceProj(name, root, provider, manager);
  }

  /** Destroy the project instance */
  public async destroy() {
    this.root.destroy();
    await this.provider.destroy();
  }

  /** Make this the active project */
  public async activate(): Promise<void> {
    this.manager.active = this;
    this.onListChange();
  }

  /** Get the list of files */
  public fileList(): IProjectFile[] {
    return Array.from(this.fileMap.values());
  }

  /** Callback when the list of files changes */
  private onListChange() {
    if (!this.fileMap || this.manager.active?.root.guid !== this.root.guid) return;
    GlobalBus.emit('project-files', this.name, this.fileList());
  }

  /** Check if a file or folder exists */
  public fileMeta(path: string): IProjectFile | undefined {
    path = utils.normalizePath(path);
    return this.fileMap.get(path);
  }

  /** Create a new file or folder in the project */
  public async newFile(path: string, is_blob?: boolean) {
    if (!path) throw new Error('File path is required');
    if (this.fileMeta(path) || this.fileMeta(path + '/'))
      throw new Error('File or folder already exists');

    // check for invalid characters
    if (/[<>:'"|?*\\]/g.test(path)) {
      throw new Error(`Invalid characters in file path: ${path}`);
    }

    // create the file
    path = utils.normalizePath(path);
    const uuid = window.crypto.randomUUID();
    const file: IProjectFile = { uuid, path, is_blob };
    this.fileMap.set(path, file);
    return file;
  }

  /** Delete a file or folder in the project */
  public async deleteFile(path: string) {
    path = utils.normalizePath(path);
    const isFolder = path.endsWith('/');

    let deletedCount = 0;
    this.root.transact(() => {
      this.fileMap.forEach((_, fpath) => {
        const matchFolder = isFolder && fpath.startsWith(path);
        const matchFile = fpath === path;
        if (matchFolder || matchFile) {
          this.fileMap.delete(fpath);
          deletedCount++;
        }
      });
    });

    if (!deletedCount) {
      throw new Error(`File or folder not found: ${path}`);
    }
  }

  /** Get the content document for a file */
  public async getFile(path: string): Promise<Y.Doc> {
    const meta = this.fileMeta(path);
    if (!meta?.uuid) throw new Error(`File not found: ${path}`);
    if (meta.is_blob) throw new Error('Binary files not implemented'); // TODO
    return await this.provider.getDoc(meta.uuid);
  }

  /**
   * Export the contents of a file directly.
   *
   * @throws {Error} If file path is invalid.
   * @throws {Error} If path is a folder.
   * @throws {Error} If file is too large.
   *
   * @returns The file content as Uint8Array.
   */
  public async exportFile(path: string): Promise<Uint8Array | null> {
    if (path.endsWith('/')) {
      throw new Error('Cannot export folder as file');
    }

    // Get the file metadata
    const meta = this.fileMap.get(path);
    if (!meta?.uuid) throw new Error(`File not found: ${path}`);
    if (meta.is_blob) throw new Error('Binary files not implemented'); // TODO

    // Always return a Uint8Array
    const toUtf8 = (str: string) => new TextEncoder().encode(str);

    // Get the file content
    const doc = new Y.Doc();
    try {
      await this.provider.readInto(doc, meta.uuid);
      if (utils.isExtensionType(path, 'code')) {
        return toUtf8(doc.getText('text').toString());
      } else if (utils.isExtensionType(path, 'milkdown')) {
        return toUtf8(doc.getXmlFragment('milkdown').toJSON());
      }
    } finally {
      doc.destroy();
    }

    return null;
  }

  /**
   * Import a text or binary file into the project.
   *
   * If the file does not exist, it will be created.
   * If the file already exists, it will be overwritten.
   * Text or blob will be decided based on the file extension.
   *
   * @throws {Error} If file path is invalid.
   * @throws {Error} If attempting to replace a text with blob or vice versa.
   * @throws {Error} If text file cannot be decoded.
   * @throws {Error} If blob or text is too large.
   */
  public async importFile(path: string, content: ReadableStream<Uint8Array>) {
    path = utils.normalizePath(path);
    if (path.endsWith('/')) {
      throw new Error('Cannot import file as folder');
    }

    // Check if this is a blob or text file
    const isText = utils.isExtensionType(path, 'code');
    const isMilkdown = utils.isExtensionType(path, 'milkdown');
    const isBlob = !isText && !isMilkdown;
    if (isBlob) throw new Error('Binary files not implemented'); // TODO

    // This requires us to parse the XML document. A better way might be
    // to export to markdown and then import it back.
    if (isMilkdown) {
      throw new Error('Format cannot be imported');
    }

    // Get the existing file if present
    let meta = this.fileMap.get(path);
    if (meta && meta.is_blob !== isBlob) {
      throw new Error('Cannot replace text with blob or vice versa');
    }

    // Create a new file if it does not exist
    if (!meta) {
      meta = await this.newFile(path, isBlob);
    }

    // Import binary content
    if (isBlob) {
      throw new Error('Not implemented'); // TODO
    }

    // Import text content
    if (isText) {
      const buffer = await new Response(content).arrayBuffer();
      const strContent = new TextDecoder().decode(buffer);
      const doc = await this.getFile(path);
      try {
        const text = doc.getText('text');
        doc.transact(() => {
          text.delete(0, text.length);
          text.insert(0, strContent);
        });
      } finally {
        // TODO: if the doc is already open, we should not destroy it
        // Or use some better technique like reference counting
        doc.destroy();
      }
      return;
    }
  }

  /**
   * Get an awareness instance for a file.
   * Awareness is used by Yjs to track user cursors and selections.
   *
   * @param path File path.
   */
  public async getAwareness(path: string): Promise<awareProto.Awareness> {
    const uuid = this.fileMap.get(path)?.uuid;
    if (!uuid) throw new Error(`File not found: ${path}`);

    return await this.provider.getAwareness(uuid);
  }

  /**
   * Synchronize the project to the OPFS.
   *
   * @param prefix The prefix to synchronize, relative path in the project.
   *
   * @returns The path to the project in the OPFS + prefix.
   */
  public async syncFs(prefix: string = '/'): Promise<string> {
    if (prefix[prefix.length - 1] !== '/') {
      return this.syncFsFile(prefix);
    }

    // Get the folder in the FS
    prefix = utils.normalizePath(prefix);
    const basedir = `${this.manager.group}/${this.name}`;
    const folder = await opfs.getDirectoryHandle(basedir + prefix, { create: true });

    // TODO: show progress
    // TODO: catch errors but continue

    // Map path => [uuid, utime]
    const updateList = new Map<string, [string, number]>();
    for (const entry of this.fileMap.values()) {
      if (!entry.path.startsWith(prefix)) continue;
      updateList.set(entry.path, [entry.uuid, -2]);
    }

    // Iterate over each file in the project already in the FS.
    for await (const [path, entry, parent] of opfs.walk(folder, prefix)) {
      const uuid = updateList.get(path)?.[0];
      if (!uuid) {
        // Delete the file from the OPFS filesystem.
        // We may need to preserve some, e.g. generated files
        await parent.removeEntry(entry.name);
        continue;
      }

      // Check if the file is up to date
      const file = await entry.getFile();
      const utime = await this.provider.needsSync(uuid, file.lastModified);
      if (utime === null) {
        updateList.delete(path);
        continue;
      }

      // Update the file in the OPFS filesystem.
      updateList.set(path, [uuid, utime]);
    }

    for (const [path, meta] of updateList.entries()) {
      const uuid = meta[0];

      // Folders are automatically created, don't bother writing them
      if (path.endsWith('/')) continue;

      // Get the update time for the file
      let utime = meta[1];
      if (utime < 0) utime = (await this.provider.needsSync(uuid, -1)) ?? -1;

      // Write the file to the OPFS filesystem.
      const content = await this.exportFile(path);
      if (content !== null) {
        const relpath = path.substring(prefix.length);
        const fileHandle = await opfs.getFileHandle(relpath, { create: true, root: folder });
        if (fileHandle) {
          await opfs.write(fileHandle, content);

          const mtime = (await fileHandle.getFile()).lastModified;
          await this.provider.markSynced(uuid, utime, mtime);
        }
      }
    }

    return basedir + prefix;
  }

  /**
   * Sync a single file in the OPFS.
   *
   * @param path Path to the file in the project.
   */
  private async syncFsFile(path: string): Promise<string> {
    if (path.endsWith('/')) throw new Error('Cannot sync folder as file');

    // Get metadata for the file
    path = utils.normalizePath(path);
    const meta = this.fileMap.get(path);
    if (!meta) throw new Error(`File not found: ${path}`);

    // Get the file in the FS
    const basedir = `${this.manager.group}/${this.name}`;
    const folder = await opfs.getDirectoryHandle(basedir, { create: true });
    const fileHandle = await opfs.getFileHandle(path, { create: true, root: folder });
    if (!fileHandle) throw new Error(`File could not be created: ${path}`);

    // Check if the file is up to date
    let mtime = (await fileHandle.getFile()).lastModified;
    const utime = await this.provider.needsSync(meta.uuid, mtime);
    if (utime === null) return basedir + path;

    // Write the file to the filesystem.
    const content = await this.exportFile(path);
    if (content !== null) {
      await opfs.write(fileHandle, content);

      mtime = (await fileHandle.getFile()).lastModified;
      await this.provider.markSynced(meta.uuid, utime, mtime);
    }

    return basedir + path;
  }
}
