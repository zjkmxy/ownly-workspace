import * as utils from '@/utils';

import type { WorkspaceAPI } from '@/services/ndn';
import type { SvsProvider } from '@/services/svs-provider';
import type { Router } from 'vue-router';
import type { IWkspStats } from '@/services/types';

export class WorkspaceInviteManager {
  private constructor(
    private readonly api: WorkspaceAPI,
    private readonly wsmeta: IWkspStats,
    private readonly provider: SvsProvider,
  ) {}

  public static async create(
    api: WorkspaceAPI,
    wsmeta: IWkspStats,
    provider: SvsProvider,
  ): Promise<WorkspaceInviteManager> {
    return new WorkspaceInviteManager(api, wsmeta, provider);
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

  /**
   * Get the join link for the workspace
   * @param router Vue router instance
   */
  public async getJoinLink(router: Router) {
    const space = utils.escapeUrlName(this.wsmeta.name);
    const inviteHref = router.resolve({
      name: 'join',
      params: { space },
      query: {
        label: this.wsmeta.label,
      },
    }).href;
    return `${window.location.origin}${inviteHref}`;
  }
}
