import * as utils from '@/utils';
import * as Y from 'yjs';

import type { Router } from 'vue-router';
import type { WorkspaceAPI } from '@/services/ndn';
import type { SvsProvider } from '@/services/svs-provider';
import type { IProfile, IWkspStats } from '@/services/types';

export class WorkspaceInviteManager {
  private readonly inviteeProfiles: Y.Map<IProfile>;

  private constructor(
    private readonly api: WorkspaceAPI,
    private readonly wsmeta: IWkspStats,
    private readonly provider: SvsProvider,
    private readonly doc: Y.Doc,
  ) {
    this.inviteeProfiles = doc.getMap<IProfile>('invite-map');

    // Add owner to the profiles
    if (!this.inviteeProfiles.has(api.name) && this.wsmeta.owner) {
      this.inviteeProfiles.set(api.name, { name: api.name, owner: true });
    }
  }

  public static async create(
    api: WorkspaceAPI,
    wsmeta: IWkspStats,
    provider: SvsProvider,
  ): Promise<WorkspaceInviteManager> {
    const doc = await provider.getDoc('invite');
    return new WorkspaceInviteManager(api, wsmeta, provider, doc);
  }

  /**
   * Destroy the chat module
   */
  public async destroy() {
    this.doc.destroy();
  }

  /**
   * Try to invite a profile to the workspace
   *
   * @param invitee Profile of the invitee
   */
  public async tryInvite(invitee: IProfile): Promise<void> {
    // Check if the name is already in the list
    if (this.inviteeProfiles.has(invitee.name)) {
      throw new Error(`Invitation for ${invitee.name} already exists`);
    }

    // Add invitee
    this.inviteeProfiles.set(invitee.name, invitee);

    // Publish the invitation
    await this.invite(invitee.name); // Publish the invitation
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

  /**
   * Get the invitation list
   *
   * @returns Array of invitations
   */
  public getInviteArray(): IProfile[] {
    return [...this.inviteeProfiles.values()];
  }
}
