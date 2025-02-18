import { EngineStatus, PdfTeXEngine } from './PdfTeXEngine';

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

  const fileList = project.fileList();
  if (!fileList.some((file) => file.path === '/main.tex')) {
    throw new Error('main.tex not found at root of project');
  }

  // TODO: show progress
  for (const file of fileList) {
    const content = await project.readFile(file.path);
    if (content) {
      activeEngine.writeMemFSFile(file.path, content);
    }
  }

  // TODO: show progress
  const res = await activeEngine.compileLaTeX();
  if (res.status == EngineStatus.Error) {
    throw new Error('Engine Error');
  } else if (res.pdf === undefined) {
    if (res.log) throw new Error(res.log);
    throw new Error('Engine produced no PDF');
  }

  return res.pdf;
}
