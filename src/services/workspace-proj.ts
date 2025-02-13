import type { WorkspaceAPI } from './ndn';
import type { SvsYDoc } from './workspace';

export class WorkspaceProjManager {
  constructor(
    readonly api: WorkspaceAPI,
    private readonly genDoc: SvsYDoc,
  ) {}
}

export class WorkspaceProj {}
