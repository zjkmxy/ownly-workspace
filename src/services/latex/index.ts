import { EngineStatus, PdfTeXEngine } from './PdfTeXEngine';

import * as opfs from '../opfs';

import type { WorkspaceProj } from '../workspace-proj';

let activeProject: string | null = null;
let activeEngine: PdfTeXEngine | null = null;

export async function compile(project: WorkspaceProj): Promise<Uint8Array | string> {
  if (!activeEngine || activeProject !== project.name) {
    activeEngine?.closeWorker();
    activeEngine = new PdfTeXEngine();
    await activeEngine.loadEngine();
    activeProject = project.name;
  }

  // Fail fast if main.tex is not found
  const fileList = project.fileList();
  if (!fileList.some((file) => file.path === '/main.tex')) {
    throw new Error('main.tex not found at root of project');
  }

  // Sync the project to OPFS
  const root = await project.syncFS();

  // Compile the project
  // TODO: show progress
  const res = await activeEngine.compileLaTeX(root, 'main.tex');
  if (res.status == EngineStatus.Error) {
    throw new Error('Engine Error');
  } else if (res.pdf === undefined) {
    if (res.log) throw new Error(res.log);
    throw new Error('Engine produced no PDF');
  }

  return res.pdf;
}
