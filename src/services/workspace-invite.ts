import type { WorkspaceAPI } from '@/services/ndn';
import type { SvsProvider } from '@/services/svs-provider';

export class WorkspaceInviteManager {
  private constructor(
    private readonly api: WorkspaceAPI,
    private readonly provider: SvsProvider,
  ) {}

  public static async create(
    api: WorkspaceAPI,
    provider: SvsProvider,
  ): Promise<WorkspaceInviteManager> {
    return new WorkspaceInviteManager(api, provider);
  }

  /**
   * Generate and publish an invitation for a name
   *
   * @param name NDN name to invite
   */
  public async invite(name: string): Promise<void> {
    // Sign the invitation
    const invite = await this.api.sign_invitation(name);

    // Alert repo to fetch the invitation
    // name is unused when encapsulated
    await this.provider.svs.pub_blob_fetch(String(), invite);
  }
}
