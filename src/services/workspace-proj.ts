import { EventEmitter } from 'events';
import * as Y from 'yjs';

import type { WorkspaceAPI } from './ndn';
import { GlobalWkspEvents, type SvsYDoc } from './workspace';
import type { IProject } from './types';

export class WorkspaceProjManager {
  private readonly projectList: Y.Array<IProject>;

  constructor(
    readonly api: WorkspaceAPI,
    private readonly svdoc: SvsYDoc,
  ) {
    this.projectList = svdoc.doc.getArray<IProject>('_proj_');

    const listObserver = () => GlobalWkspEvents.emit('project-list', this.projectList.toArray());
    this.projectList.observe(listObserver);
    listObserver();
  }

  public async stop() {}

  public async getProjects(): Promise<IProject[]> {
    await this.svdoc.pers.whenSynced;
    return this.projectList.toArray();
  }

  public async newProject(project: IProject) {
    this.projectList.push([project]);
  }
}

export class WorkspaceProj {}
