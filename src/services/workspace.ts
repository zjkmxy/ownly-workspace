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
import type { Router } from 'vue-router';

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

// Destroy the active workspace on hot reload
import.meta.hot?.on('vite:beforeUpdate', async () => {
  await active?.destroy();
  active = null;
});

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

  get username(): string {
    return this.api.name;
  }

  /**
   * Setup workspace from URL parameter.
   * @param space Workspace name from URL
   * @returns Workspace object or null if not found
   */
  public static async setup(space: string): Promise<Workspace> {
    console.log('Starting workspace:', space);
    if (!space) {
      throw new Error('No workspace name provided');
    }

    // Unescape URL name
    space = utils.unescapeUrlName(space);

    // Get workspace configuration from storage
    const metadata = await storage.db.workspaces.get(space);
    if (!metadata) {
      throw new Error(`Workspace not found, have you joined it? <br/> [${space}]`);
    }

    // Start workspace if not already active
    if (active?.metadata.name !== metadata.name) {
      await active?.destroy();
      active = await Workspace.create(metadata);
    }

    return active;
  }

  public static async setupOrRedir(router: Router): Promise<Workspace | null> {
    try {
      return await Workspace.setup(router.currentRoute.value.params.space as string);
    } catch (e) {
      console.error(e);
      useToast().error(`Failed to start workspace: ${e}`);
      router.push('/');
      return null;
    }
  }
}
