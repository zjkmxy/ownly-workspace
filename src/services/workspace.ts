import router from '@/router';
import { useToast } from 'vue-toast-notification';
import { EventEmitter } from 'events';

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

import { WorkspaceChat } from './workspace-chat';
import { WorkspaceProjManager } from './workspace-proj';

import * as utils from '@/utils/index';
import storage from '@/services/storage';
import ndn from '@/services/ndn';

import type { SvsAloApi, WorkspaceAPI } from '@/services/ndn';
import type { IChatChannel, IProject, IProjectFile, IWorkspace } from '@/services/types';
import type TypedEmitter from 'typed-emitter';

/**
 * Global events across workspace boundaries
 */
export const GlobalWkspEvents = new EventEmitter() as TypedEmitter<{
  'chat-channels': (channels: IChatChannel[]) => void;
  'project-list': (projects: IProject[]) => void;
  'project-files': (name: string, files: IProjectFile[]) => void;
}>;

/**
 * We keep an active instance of the open workspace.
 * This always runs in the background collecting data.
 */
let active: Workspace | null = null;

/**
 * Workspace service
 */
export class Workspace {
  public readonly chat: WorkspaceChat;
  public readonly proj: WorkspaceProjManager;

  private constructor(
    public readonly metadata: IWorkspace,
    public readonly slug: string,
    public readonly api: WorkspaceAPI,
    public readonly genSvDoc: SvsYDoc,
  ) {
    this.chat = new WorkspaceChat(genSvDoc);
    this.proj = new WorkspaceProjManager(metadata, slug, api, genSvDoc);
  }

  /**
   * Start the workspace.
   * This will connect to the testbed and start the SVS instance.
   */
  private static async start(metadata: IWorkspace): Promise<Workspace> {
    // Start connection to testbed
    await ndn.api.connect_testbed();

    // Set up client and ALO
    const api = await ndn.api.get_workspace(metadata.name);
    await api.start();
    (<any>window).wksp = api;

    // Create general SVS group
    const slug = utils.escapeUrlName(metadata.name);
    const genGroup = await api.svs_alo(`${metadata.name}/32=gen`);
    const genSvDoc = new SvsYDoc(genGroup, `${slug}-gen`);
    await genSvDoc.start();

    // Create workspace object
    return new Workspace(metadata, slug, api, genSvDoc);
  }

  /**
   * Stop the workspace.
   * This will stop the SVS instance and disconnect from the testbed.
   */
  public async stop() {
    await this.proj.stop();
    await this.genSvDoc?.stop();
    await this.api?.stop();
  }

  /**
   * Setup workspace from URL parameter or redirect to home.
   * @returns Workspace object or null if not found
   */
  public static async setupOrRedir(): Promise<Workspace | null> {
    // Unescape workspace name from URL
    let space = String(router.currentRoute.value?.params?.space);
    if (!space) {
      router.replace('/');
      return null;
    }
    space = utils.unescapeUrlName(space);

    // Get workspace configuration from storage
    const metadata = await storage.db.workspaces.get(space);
    if (!metadata) {
      useToast().error(`Workspace not found, have you joined it? <br/> [${space}]`);
      router.replace('/');
      return null;
    }

    // Start workspace if not already active
    if (active?.metadata.name !== metadata.name) {
      try {
        await active?.stop();
        active = await Workspace.start(metadata);
      } catch (e) {
        console.error(e);
        useToast().error(`Failed to start workspace: ${e}`);
        return null;
      }
    }

    return active;
  }
}

/**
 * Yjs document backed by an SVS sync group.
 * Persists to IndexedDB.
 */
export class SvsYDoc {
  public readonly doc = new Y.Doc();
  public readonly pers: IndexeddbPersistence;

  constructor(
    public readonly svs: SvsAloApi,
    public readonly slug: string,
  ) {
    this.pers = new IndexeddbPersistence(this.slug, this.doc);
  }

  async start() {
    await this.svs.subscribe({
      on_yjs_delta: (info, pub) => {
        try {
          Y.applyUpdateV2(this.doc, pub.binary);
        } catch (e) {
          console.error('Failed to apply general update', e);
        }
      },
    });
    await this.svs.start();
    this.doc.on('updateV2', async (buf, _1, _2, tx) => {
      if (!tx.local) return;
      await this.svs.pub_yjs_delta(buf);
    });
  }

  async stop() {
    await this.svs.stop();
    this.doc.destroy();
  }
}
