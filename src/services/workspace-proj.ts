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

    // Start SVS for project
    const slug = `${this.slug}-${name}`;
    const svs = await this.api.svs_alo(`${this.metadata.name}/p-${name}`);
    const svdoc = new SvsYDoc(svs, slug);

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

  constructor(
    public readonly name: string,
    public readonly svdoc: SvsYDoc,
  ) {
    this.fileList = svdoc.doc.getArray<IProjectFile>('_file_');
    this.fileList.observe(() => this.onListChange());
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
    this.fileList.push([file]);
  }

  public async deleteFile(file: IProjectFile) {
    let deletedCount = 0;
    this.svdoc.doc.transact(() => {
      this.fileList.forEach((f, i) => {
        const matchFolder = file.path.endsWith('/') && f.path.startsWith(file.path);
        const matchFile = f.path === file.path;
        if (matchFolder || matchFile) {
          this.fileList.delete(i - deletedCount);
          deletedCount++;
        }
      });
    });
    if (!deletedCount) throw new Error('File not found');
  }
}
