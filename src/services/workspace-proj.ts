import * as Y from 'yjs';

import { GlobalWkspEvents, SvsYDoc } from './workspace';

import type { WorkspaceAPI } from './ndn';
import type { IProject, IProjectFile, IWorkspace } from './types';

/** Currently active project in the workspace */
let active: WorkspaceProj | null = null;

export class WorkspaceProjManager {
  private readonly projectList: Y.Array<IProject>;
  private readonly projectMap: Map<string, WorkspaceProj> = new Map();

  constructor(
    private readonly metadata: IWorkspace,
    private readonly slug: string,
    private readonly api: WorkspaceAPI,
    private readonly svdoc: SvsYDoc,
  ) {
    this.projectList = svdoc.doc.getArray<IProject>('_proj_');

    const listObserver = () => GlobalWkspEvents.emit('project-list', this.projectList.toArray());
    this.projectList.observe(listObserver);
    listObserver();
  }

  public async stop() {
    for (const proj of this.projectMap.values()) {
      await proj.svdoc.stop();
      active = null;
    }
  }

  public async getProjects(): Promise<IProject[]> {
    await this.svdoc.pers.whenSynced;
    return this.projectList.toArray();
  }

  public async newProject(project: IProject) {
    this.projectList.push([project]);
  }

  public async get(name: string): Promise<WorkspaceProj> {
    // TODO: add a lock on this
    let proj = this.projectMap.get(name);
    if (proj) return proj;

    // Get metadata from project list
    await this.svdoc.pers.whenSynced; // TODO: also need SVS to sync first
    const projMeta = this.projectList.toArray().find((p) => p.name === name);
    if (!projMeta) throw new Error('Project not found');

    // Start SVS for project
    const slug = `${this.slug}-${name}`;
    const svs = await this.api.svs_alo(`${this.metadata.name}/p-${name}`);
    const svdoc = new SvsYDoc(svs, slug);

    // Create project object
    proj = new WorkspaceProj(name, svdoc);
    this.projectMap.set(name, proj);

    await svdoc.start();
    return proj;
  }

  public getActive(): WorkspaceProj {
    if (!active) throw new Error('No active project');
    return active;
  }
}

export class WorkspaceProj {
  private readonly fileList: Y.Array<IProjectFile>;
  private readonly contentMap: Y.Map<Y.Text | Y.XmlFragment>;

  constructor(
    public readonly name: string,
    public readonly svdoc: SvsYDoc,
  ) {
    this.fileList = svdoc.doc.getArray('_file_');
    this.fileList.observe(() => this.onListChange());
    this.contentMap = svdoc.doc.getMap('_ctn_');
  }

  public async activate(): Promise<void> {
    active = this;
    this.onListChange();
  }

  public onListChange() {
    if (!this.fileList || active?.name !== this.name) return;
    GlobalWkspEvents.emit('project-files', this.name, this.fileList.toArray());
  }

  public async newFile(file: IProjectFile) {
    if (!file.path) throw new Error('Path is required');
    this.fileList.forEach((f) => {
      if (f.path === file.path || f.path === `${file.path}/`) {
        throw new Error('File or folder already exists');
      }
    });

    this.svdoc.doc.transact(() => {
      this.fileList.push([file]);
      this.contentMap.set(
        file.path,
        file.path.endsWith('.mdoc') ? new Y.XmlFragment() : new Y.Text(),
      );
    });
  }

  public async deleteFile(file: IProjectFile) {
    let deletedCount = 0;
    this.svdoc.doc.transact(() => {
      this.fileList.forEach((f, i) => {
        const matchFolder = file.path.endsWith('/') && f.path.startsWith(file.path);
        const matchFile = f.path === file.path;
        if (matchFolder || matchFile) {
          this.fileList.delete(i - deletedCount);
          this.contentMap.delete(f.path);
          deletedCount++;
        }
      });
    });
    if (!deletedCount) throw new Error('File not found');
  }

  public async getContent(path: string): Promise<Y.Text | Y.XmlFragment> {
    const file = this.contentMap.get(path);
    if (!file) throw new Error('File not found');
    return file;
  }
}
