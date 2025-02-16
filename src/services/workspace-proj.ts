import * as Y from 'yjs';
import * as aware from 'y-protocols/awareness.js';

import { GlobalWkspEvents, SvsYDoc, ActiveWorkspace } from './workspace';

import type { AwarenessApi, WorkspaceAPI } from './ndn';
import type { IProject, IProjectFile, IWorkspace } from './types';

import * as utils from '@/utils';

/** Currently active project in the workspace */
let active: WorkspaceProj | null = null;

export class WorkspaceProjManager {
  private readonly projectList: Y.Map<IProject>;
  private readonly projectInstances: Map<string, WorkspaceProj> = new Map();

  constructor(
    private readonly metadata: IWorkspace,
    private readonly slug: string,
    private readonly api: WorkspaceAPI,
    private readonly svdoc: SvsYDoc,
  ) {
    this.projectList = svdoc.doc.getMap<IProject>('_proj_');

    const listObserver = async () =>
      GlobalWkspEvents.emit('project-list', await this.getProjects());
    this.projectList.observe(listObserver);
    listObserver();
  }

  public async stop() {
    for (const proj of this.projectInstances.values()) {
      await proj.svdoc.stop();
      await proj.ndnAware.stop();
      active = null;
    }
  }

  public async getProjects(): Promise<IProject[]> {
    await this.svdoc.pers.whenSynced;
    return Array.from(this.projectList.values());
  }

  public async newProject(name: string) {
    if (!name) throw new Error('Project name is required');
    if (this.projectList.has(name)) throw new Error('Project already exists');
    this.projectList.set(name, { name });
  }

  public async get(name: string): Promise<WorkspaceProj> {
    // TODO: add a lock on this
    let proj = this.projectInstances.get(name);
    if (proj) return proj;

    // Get metadata from project list
    await this.svdoc.pers.whenSynced; // TODO: also need SVS to sync first
    if (!this.projectList.has(name)) throw new Error('Project not found');

    // Start SVS for project
    const slug = `${this.slug}-${name}`;
    const svs = await this.api.svs_alo(`${this.metadata.name}/p-${name}`);
    const svdoc = new SvsYDoc(svs, slug);

    // Start awareness for project
    const ndnAware = await this.api.awareness(`${this.metadata.name}/p-${name}/32=aware`);

    // Create project object
    proj = new WorkspaceProj(name, svdoc, ndnAware);
    this.projectInstances.set(name, proj);

    await svdoc.start();
    await ndnAware.start();
    return proj;
  }

  public getActive(): WorkspaceProj {
    if (!active) throw new Error('No active project');
    return active;
  }
}

export class WorkspaceProj {
  private readonly fileMap: Y.Map<IProjectFile>;
  private readonly contentMap: Y.Map<Y.Text | Y.XmlFragment>;

  public readonly awareness: aware.Awareness;
  private awareThrottle: number = 0;
  private readonly awareThrottleSet: Set<number> = new Set();

  constructor(
    public readonly name: string,
    public readonly svdoc: SvsYDoc,
    public readonly ndnAware: AwarenessApi,
  ) {
    // Set up file list
    this.fileMap = svdoc.doc.getMap('_file_');
    this.fileMap.observe(() => this.onListChange());

    // Set up content map
    this.contentMap = svdoc.doc.getMap('_ctn_');

    // Setup awareness for entire project
    this.awareness = new aware.Awareness(svdoc.doc);
    this.setupAwareness();
  }

  public async activate(): Promise<void> {
    active = this;
    this.onListChange();
  }

  public onListChange() {
    if (!this.fileMap || active?.name !== this.name) return;
    GlobalWkspEvents.emit('project-files', this.name, Array.from(this.fileMap.values()));
  }

  public async newFile(path: string) {
    if (!path) throw new Error('File path is required');
    if (this.fileMap.has(path) || this.fileMap.has(path + '/'))
      throw new Error('File or folder already exists');

    this.svdoc.doc.transact(() => {
      const uuid = window.crypto.randomUUID();
      this.fileMap.set(path, { uuid, path });

      const content = path.endsWith('.mdoc') ? new Y.XmlFragment() : new Y.Text();
      this.contentMap.set(uuid, content);
    });
  }

  public async deleteFile(delpath: string) {
    const isFolder = delpath.endsWith('/');

    let deletedCount = 0;
    this.svdoc.doc.transact(() => {
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

  public async getContent(path: string): Promise<Y.Text | Y.XmlFragment> {
    const uuid = this.fileMap.get(path)?.uuid;
    if (!uuid) {
      throw new Error('File not found');
    }

    const content = this.contentMap.get(uuid);
    if (!content) {
      throw new Error('Content not found');
    }
    return content;
  }

  private setupAwareness() {
    // Make our own color here based on username
    const username = ActiveWorkspace?.api.name ?? 'Unknown';
    const hash = utils.cyrb64(username);
    const r = (hash[0] % 128) + 110;
    const g = ((hash[0] >> 7) % 128) + 110;
    const b = (hash[1] % 128) + 110;

    this.awareness.setLocalStateField('user', {
      name: username,
      color: `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`,
      rgb: [r, g, b],
    });

    this.awareness.on('update', ({ added, updated, removed }: any, source: 'local' | 'remote') => {
      if (source !== 'local') {
        for (const client of added) {
          this.injectAwarenessStyles(client, this.awareness.getStates().get(client)?.user);
        }
        return;
      }

      for (const client of added.concat(updated).concat(removed)) {
        this.awareThrottleSet.add(client);
      }
      if (!this.awareThrottle) {
        this.awareThrottle = window.setTimeout(() => {
          const updateBinary = aware.encodeAwarenessUpdate(
            this.awareness,
            Array.from(this.awareThrottleSet),
          );
          this.awareThrottle = 0;
          this.awareThrottleSet.clear();
          this.ndnAware.publish(updateBinary);
        }, 250);
      }
    });

    this.ndnAware.subscribe((pub) => {
      try {
        aware.applyAwarenessUpdate(this.awareness, pub, 'remote');
      } catch (e) {
        console.error(e);
      }
    });
  }

  private injectAwarenessStyles(client: number, user: any) {
    if (!user.color) return;

    let rgb = `${user.rgb[0]},${user.rgb[1]},${user.rgb[2]}`;
    if (utils.themeIsDark()) {
      rgb = `${255 - user.rgb[0]},${255 - user.rgb[1]},${255 - user.rgb[2]}`;
    }

    // Monaco editor colors (see CodeEditor.vue)
    awarenessStyles.textContent += `
      .yRemoteSelection-${client} {
        background-color: rgba(${rgb}, 0.5) !important;
      }
      .yRemoteSelectionHead-${client}, .ProseMirror-yjs-cursor {
        border-color: rgb(${rgb}) !important;
      }
      .yRemoteSelectionHead-${client}::after {
        content: "${user.name}" !important;
        background-color: rgb(${rgb}) !important;
      }
    `;
  }
}

const awarenessStyles = document.createElement('style');
document.head.appendChild(awarenessStyles);
