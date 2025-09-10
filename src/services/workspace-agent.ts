import { EventEmitter } from 'events';
import * as Y from 'yjs';
import { nanoid } from 'nanoid'

import { GlobalBus } from '@/services/event-bus';
import type { SvsProvider } from '@/services/svs-provider';
import type { WorkspaceAPI } from './ndn';
import type TypedEmitter from 'typed-emitter';
import type {IAgentCard, IAgentChannel, IAgentMessage, IChatMessage} from '@/services/types';
import type {Workspace} from '@/services/workspace';


/** WorkspaceAgent encapsulates discovery of agents, creation of dedicated channels and chat with those agents. It persists its state in a Yjs document backed by an SVS provider so taht channel lists and chat history are replicated to peers via NDN */
export class WorkspaceAgentManager{
  /** List of all available agent cards */
  private readonly agentCards: Y.Array<IAgentCard>;

  private readonly channels: Y.Array<IAgentChannel>;
  private readonly history: Y.Map<Y.Array<IAgentMessage>>;
  public readonly events = new EventEmitter();


  /** private constructor. instances should be created via the static {@link create} method which handles loading the underlying Yjs documents. */

  private constructor(
    private readonly api: WorkspaceAPI,
    private readonly doc: Y.Doc,
    private readonly provider: SvsProvider,
    private readonly workspace: Workspace,


  ) {
      /** Event emitter to notify listenrs about new messages or channel changes.
     * - 'chat' fires when a new message is added to any channel
     * - 'channelAdded' fires when a new agent channel is created.
     */
    this.events = this.workspace.chat.events as TypedEmitter<{
      chat: (channel: string, message: IChatMessage) => void;
      channelAdded: (channel: IAgentChannel) => void;
    }>;
    this.agentCards = doc.getArray<IAgentCard>('_agent_cards_');
    this.channels = doc.getArray<IAgentChannel>('_agent_chan_');
    this.history = doc.getMap<Y.Array<IAgentMessage>>('_agent_msg_');

    // Observe channel list changes and forward them onto the global bus.
    const emitChannels = () => {
      // Emit agent channels to a separate event
      GlobalBus.emit('agent-channels', this.channels.toArray());
    };
    this.channels.observe(emitChannels);
    //broadcast the current state of channels when the WorkspaceAgent is first created, ensuring the UI starts with the correct channel list.
    emitChannels();

    //Observe deep changes to the message map and notify local listeners.
    this.history.observeDeep((events)=> {
      if (this.events.listenerCount(('chat'))=== 0) return;
      for (const ev of events){
        if (ev.path.length > 0) {
          const channelUuid = String(ev.path[0]);

          // Find the channel name by UUID
          const channelData = this.channels.toArray().find(ch => ch.uuid === channelUuid);
          if (!channelData) {
            console.warn('Channel not found for UUID:', channelUuid);
            continue;
          }
          const channelName = channelData.name;

          // Use Set.forEach instead of for...of
          ev.changes.added.forEach(delta => {
            try {
              const content = delta.content.getContent();
              const messages = Array.isArray(content) ? content : [content];

              messages.forEach(msg => {
                if (msg) {
                  this.events.emit('chat', channelName, msg as IAgentMessage);
                }
              });
            } catch (error) {
              console.warn('Error processing message delta:', error);
            }
          });
        }
      }
    });

    // Listen for chat messages to respond when agents are active in channels
    // this.workspace.chat.events.addListener('chat', this.handleChatMessage.bind(this));
  }
  /**
   * Create the agent service for a workspace. A Yjs doc name 'agent' will be loaded or created via the given provider.
   * @param api WorkspaceAPI instance associated with teh workspave
   * @param provider SVS provider used to persist and sync state
   */
  public static async create(api: WorkspaceAPI, provider: SvsProvider, workspace: Workspace): Promise<WorkspaceAgentManager> {
      const doc = await provider.getDoc('agent');
      return new WorkspaceAgentManager(api, doc, provider, workspace);
    }

  /**
   * Destroy the agent service and release its resources.
   */
  public async destroy() {
    // this.workspace.chat.events.removeListener('chat', this.handleChatMessage.bind(this));
    this.doc.destroy();
  }

  /**
   * Get a snapshot of the current list of agent cards.
   */
  public getAgentCards(): IAgentCard[] {
    return this.agentCards.toArray();
  }

  /**
   * Add or update an agent card in the shared collection.
   */
  public addOrUpdateAgentCard(agentCard: IAgentCard): void {
    const existingIndex = this.agentCards.toArray().findIndex(card => card.url === agentCard.url);

    if (existingIndex >= 0) {
      // Update existing card
      this.agentCards.delete(existingIndex, 1);
      this.agentCards.insert(existingIndex, [agentCard]);
    } else {
      // Add new card
      this.agentCards.push([agentCard]);
    }
  }

  /**
   * Get an agent card by its URL (used as ID).
   */
  public getAgentCard(agentId: string): IAgentCard | undefined {
    return this.agentCards.toArray().find(card => card.url === agentId);
  }

  /**
   * Remove an agent card from the shared collection by URL.
   */
  public removeAgentCard(agentUrl: string): boolean {
    const existingIndex = this.agentCards.toArray().findIndex(card => card.url === agentUrl);

    if (existingIndex >= 0) {
      this.agentCards.delete(existingIndex, 1);
      return true;
    }
    return false;
  }

  /**
   * Get a snapshot of the current list of agent channels with resolved agent cards.
   */
  public async getChannels(): Promise<(IAgentChannel & { agent: IAgentCard })[]> {
    return this.channels.toArray().map(channel => {
      const agent = this.getAgentCard(channel.agentId);
      if (!agent) {
        throw new Error(`Agent card not found for channel ${channel.name}: ${channel.agentId}`);
      }
      return { ...channel, agent };
    });
  }

  /**
   * Invite an agent to join an existing chat channel.
   * The agent will participate in the regular chat channel, not create a separate agent channel.
   * Message history will be tracked for context purposes.
   *
   * @param agent The agent card to invite
   * @param channelName The existing chat channel to invite the agent to
   * */
  public async inviteAgentToChannel(agent: IAgentCard, channelName: string): Promise<void> {
    // Check if chat channel exists
    const chatChannels = await this.workspace.chat.getChannels();
    const channel = chatChannels.find(ch => ch.name === channelName);

    if (!channel) {
      throw new Error(`Chat channel '${channelName}' not found`);
    }

    // Add/update the agent card in workspace
    this.addOrUpdateAgentCard(agent);

    // Create agent participation record for this channel
    const agentParticipation: IAgentChannel = {
      uuid: nanoid(),
      name: channelName, // Same name as chat channel
      agentId: agent.url,
    };

    // Track agent participation (allow multiple invitations)
    this.channels.push([agentParticipation]);

    // Initialize message history tracking for context (but don't create separate messages)
    this.history.set(agentParticipation.uuid, new Y.Array<IAgentMessage>());

    // Send NDN invitation to agent
    await this.workspace.invite.invokeAgent(channelName, agent.url);

    // Add system message to the CHAT channel (not agent history)
    await this.workspace.chat.sendMessage(channelName, {
      uuid: nanoid(),
      user: 'ownly-bot',
      ts: Date.now(),
      message: `${agent.name} agent has been invited to join #${channelName}`
    });

    console.log(`Agent ${agent.name} invited to chat channel #${channelName}`);
  }

  /**
   * Get message history context for an agent in a specific channel
   * This retrieves the last N messages
   * It doesn't help for the client side, but if you are an agent, you can use this method to provide context.
   */
  public async getChannelContextForAgent(channelName: string, limit: number = 20): Promise<IAgentMessage[]> {
    // Get actual chat messages from the channel
    const chatMessages = await this.workspace.chat.getMessages(channelName);

    // Convert to agent message format and return last N messages
    const contextMessages: IAgentMessage[] = chatMessages
      .slice(-limit)
      .map(msg => ({
        uuid: msg.uuid,
        user: msg.user,
        ts: msg.ts,
        message: msg.message,
        role: 'user' // Assume human messages for context
      }));

    return contextMessages;
  }

  /**
   * Get all agents participating in a specific chat channel
   */
  public getAgentsInChannel(channelName: string): IAgentCard[] {
    const agentParticipations = this.channels.toArray().filter(ch => ch.name === channelName);
    return agentParticipations
      .map(participation => {
        const agent = this.getAgentCard(participation.agentId);
        if (!agent) {
          console.warn(`Agent card not found for participation: ${participation.agentId}. Cleaning up orphaned participation.`);
          // Clean up orphaned participation record
          const participationIndex = this.channels.toArray().indexOf(participation);
          if (participationIndex >= 0) {
            this.channels.delete(participationIndex, 1);
          }
          return null;
        }
        return agent;
      })
      .filter((agent): agent is IAgentCard => agent !== null);
  }

  /**
   * Remove an agent from a chat channel
   * to REALLY remove it we still have to get the certificate expiration time correct and have server side support.
   * Also, it works differently for HTTP VS NDN, so we should have a clear policy for both.
   * This will be implemented in the future.
   */
  public async removeAgentFromChannel(agentId: string, channelName: string): Promise<void> {
    const participationIndex = this.channels.toArray().findIndex(ch =>
      ch.name === channelName && ch.agentId === agentId
    );

    if (participationIndex === -1) {
      throw new Error(`Agent not found in channel ${channelName}`);
    }

    const participation = this.channels.toArray()[participationIndex];

    // Remove participation record and history
    this.channels.delete(participationIndex);
    this.history.delete(participation.uuid);

    // Add system message to chat channel
    const agent = this.getAgentCard(agentId);
    if (agent) {
      await this.workspace.chat.sendMessage(channelName, {
        uuid: nanoid(),
        user: 'ownly-bot',
        ts: Date.now(),
        message: `${agent.name} agent has left #${channelName}`
      });
    }
  }


  /** Get a snapshot of the message history for a channel */
  public async getMessages(channelName: string): Promise<IAgentMessage[]>{
    const channel = this.channels.toArray().find(c => c.name === channelName);
    if (!channel) throw new Error('Channel not found');

    // Try to get messages by UUID first (new system)
    let arr = this.history.get(channel.uuid);

    // If no messages found by UUID, try the old channel name system (for backward compatibility)
    if (!arr || arr.length === 0) {
      const oldArr = this.history.get(channelName);
      if (oldArr && oldArr.length > 0) {
        // Migrate old messages to new UUID-based system
        const messages = oldArr.toArray();
        const newArr = new Y.Array<IAgentMessage>();
        newArr.insert(0, messages);
        this.history.set(channel.uuid, newArr);

        // Remove old messages (optional, for cleanup)
        this.history.delete(channelName);

        arr = newArr;
      }
    }

    if (!arr) {
      // Create empty array if no messages exist
      arr = new Y.Array<IAgentMessage>();
      this.history.set(channel.uuid, arr);
    }

    return arr.toArray();
  }
}
