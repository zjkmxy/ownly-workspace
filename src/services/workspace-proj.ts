import * as Y from 'yjs';
import * as awareProto from 'y-protocols/awareness.js';

import { GlobalWkspEvents } from './workspace';
import { SvsProvider } from './svs-provider';
import * as utils from '@/utils';

import type { WorkspaceAPI } from './ndn';
import type { IProject, IProjectFile } from './types';

/** Currently active project in the workspace */
let active: WorkspaceProj | null = null;

/**
 * Project manager for the workspace.
 * Keeps track of the list of projects and their instances.
 * Each project has its own SVS sync group / provider.
 */
export class WorkspaceProjManager {
  private readonly list: Y.Map<IProject>;
  private readonly instances: Map<string, WorkspaceProj> = new Map();

  private constructor(
    private readonly wksp: WorkspaceAPI,
    private readonly root: Y.Doc,
  ) {
    this.list = this.root.getMap<IProject>('list');

    const listObserver = async () =>
      GlobalWkspEvents.emit('project-list', await this.getProjects());
    this.list.observe(listObserver);
    listObserver();
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
    active = null;
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
    proj = await WorkspaceProj.create(name, this.wksp);
    this.instances.set(name, proj);
    return proj;
  }

  /** Get the active project */
  public getActive(): WorkspaceProj {
    if (!active) throw new Error('No active project');
    return active;
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
  ) {
    // Set up file list
    this.fileMap = root.getMap('file_list');
    this.fileMap.observe(() => this.onListChange());
  }

  /**
   * Create a new project instance
   *
   * @param wksp Workspace API
   */
  public static async create(name: string, wksp: WorkspaceAPI): Promise<WorkspaceProj> {
    // Start SVS for project
    const provider = await SvsProvider.create(wksp, name);

    // Create root document
    const root = await provider.getDoc('root');

    // Create project object
    return new WorkspaceProj(name, root, provider);
  }

  /** Destroy the project instance */
  public async destroy() {
    this.root.destroy();
    await this.provider.destroy();
  }

  /** Make this the active project */
  public async activate(): Promise<void> {
    active = this;
    this.onListChange();
  }

  /** Create a new file or folder in the project */
  public async newFile(path: string) {
    if (!path) throw new Error('File path is required');
    if (this.fileMap.has(path) || this.fileMap.has(path + '/'))
      throw new Error('File or folder already exists');

    const uuid = window.crypto.randomUUID();
    this.fileMap.set(path, { uuid, path });
  }

  /** Delete a file or folder in the project */
  public async deleteFile(delpath: string) {
    const isFolder = delpath.endsWith('/');

    let deletedCount = 0;
    this.root.transact(() => {
      this.fileMap.forEach((_, path) => {
        const matchFolder = isFolder && path.startsWith(delpath);
        const matchFile = path === delpath;
        if (matchFolder || matchFile) {
          this.fileMap.delete(path);
          deletedCount++;
        }
      });
    });

    if (!deletedCount) {
      throw new Error('File not found');
    }
  }

  /** Get the content document for a file */
  public async getFile(path: string): Promise<Y.Doc> {
    const uuid = this.fileMap.get(path)?.uuid;
    if (!uuid) throw new Error('File not found');
    return await this.provider.getDoc(uuid);
  }

  /** Get an awareness instance for a file */
  public async getAwareness(path: string): Promise<awareProto.Awareness> {
    const uuid = this.fileMap.get(path)?.uuid;
    if (!uuid) throw new Error('File not found');

    return await this.provider.getAwareness(uuid);
  }

  /** Read a file's contents directly */
  public async readFile(path: string): Promise<Uint8Array | string | null> {
    const uuid = this.fileMap.get(path)?.uuid;
    if (!uuid) throw new Error('File not found: ' + path);

    const doc = new Y.Doc();
    await this.provider.readInto(doc, uuid);
    if (utils.isExtensionType(path, 'code')) {
      return doc.getText('text').toString();
    }
    doc.destroy();

    return null;
  }

  /** Get the list of files */
  public fileList(): IProjectFile[] {
    return Array.from(this.fileMap.values());
  }

  /** Callback when the list of files changes */
  private onListChange() {
    if (!this.fileMap || active?.root.guid !== this.root.guid) return;
    GlobalWkspEvents.emit('project-files', this.name, this.fileList());
  }
}
