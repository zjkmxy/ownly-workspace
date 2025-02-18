import router from '@/router';
import { useToast } from 'vue-toast-notification';
import { EventEmitter } from 'events';

import { WorkspaceChat } from './workspace-chat';
import { WorkspaceProjManager } from './workspace-proj';

import { SvsProvider } from './svs-provider';
import storage from '@/services/storage';
import ndn from '@/services/ndn';
import * as utils from '@/utils/index';

import type { WorkspaceAPI } from '@/services/ndn';
import type { IChatChannel, IProject, IProjectFile, IWorkspace } from '@/services/types';
import type TypedEmitter from 'typed-emitter';

/**
 * Global events across workspace boundaries
 */
export const GlobalWkspEvents = new EventEmitter() as TypedEmitter<{
  'chat-channels': (channels: IChatChannel[]) => void;
  'project-list': (projects: IProject[]) => void;
  'project-files': (project: string, files: IProjectFile[]) => void;
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
  private constructor(
    public readonly metadata: IWorkspace,
    private readonly api: WorkspaceAPI,
    private readonly provider: SvsProvider,
    public readonly chat: WorkspaceChat,
    public readonly proj: WorkspaceProjManager,
  ) {}

  /**
   * Start the workspace.
   * This will connect to the testbed and start the SVS instance.
   */
  private static async create(metadata: IWorkspace): Promise<Workspace> {
    // Start connection to testbed
    await ndn.api.connect_testbed();

    // Set up client and ALO
    const api = await ndn.api.get_workspace(metadata.name);
    await api.start();

    // Create general SVS group
    const provider = await SvsProvider.create(api, 'root');

    // Create general modules
    const chat = await WorkspaceChat.create(provider);
    const proj = await WorkspaceProjManager.create(api, provider);

    // Create workspace object
    return new Workspace(metadata, api, provider, chat, proj);
  }

  /**
   * Destroy the workspace.
   * This will stop the SVS instance and disconnect from the testbed.
   */
  public async destroy() {
    await this.proj.destroy();
    await this.chat.destroy();
    await this.provider?.destroy();
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
        await active?.destroy();
        active = await Workspace.create(metadata);
      } catch (e) {
        console.error(e);
        useToast().error(`Failed to start workspace: ${e}`);
        return null;
      }
    }

    return active;
  }
}
