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

    //Observe deep changes to teh message map and notify local listeners.
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
    this.workspace.chat.events.addListener('chat', this.handleChatMessage.bind(this));
  }
  /**
   * Create the agent service for a workspace. A Yjs doc name 'agent' will be loaded or vreated via the given provider.
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
    this.workspace.chat.events.removeListener('chat', this.handleChatMessage.bind(this));
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
   * Discover an agent card from a base URL. The default lookup path is './well-known/agent.json' as per the A2A specification. On success, retrieved JSON will be returned as an {@link AgentCard}.
   * If the request fails an exception will be thrown.
   * @param baseUrl Base URL of the agent server (without trailing slash)
   * @returns Promise resolving to the discovered {@link AgentCard}
   */
  public async discoverAgent(baseUrl: string): Promise<IAgentCard> {
    const trimmed = baseUrl.replace(/\/+$/,'');

    try {
      const res = await fetch(`${trimmed}/.well-known/agent.json`, {
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      // The fetched JSON may include unknown properties; we can cast to IAgentCard
      const card = (await res.json()) as IAgentCard;

      // Attach the base URL if missing
      if (!card.url) {
        card.url = trimmed;
      }

      return card;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(
          `CORS Error: Cannot connect to ${baseUrl}. ` +
          `The agent server needs to allow cross-origin requests from your domain. ` +
          `Please add CORS headers or use a CORS proxy.`
        );
      }
      throw new Error(`Failed to discover agent at ${baseUrl}: ${error}`);
    }
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

  /**
   * Internal helper to perform an A2A invocation against the given agent.
   * This method uses a simple HTTP POST to an '/invoke' endpoint;
   * if the agent implements a differnet contract adjust this accordingly.
   * replies will be recorded int the cahnnel as Agent messages
   *
   * @param agent The agent card used to determine the endpoint
   * @ param userMsg The user message that triggered the invocation
   * @param channel Name of the channel where the reply should be stored
   */
  private async invokeAgent(agent: IAgentCard, userMsg: IAgentMessage, channel: string): Promise<void>{
    // Check if agent uses JSON-RPC protocol
    // requries auto-detection update later
    const useJsonRpc = agent.preferredTransport === 'JSONRPC' ||
                       (agent as any).preferredTransport === 'JSONRPC' ||
                       agent.protocolVersion === '0.3.0' ||  // Our agent card at llama server currently has this
                       (agent as any).protocolVersion === '0.3.0';

    console.log('Agent card properties:', Object.keys(agent));
    console.log('preferredTransport:', agent.preferredTransport || (agent as any).preferredTransport);
    console.log('protocolVersion:', agent.protocolVersion || (agent as any).protocolVersion);
    console.log('Will use JSON-RPC:', useJsonRpc);

    let payload: any;
    let endpoint: string;

    if (useJsonRpc) {
      // Use JSON-RPC 2.0 format
      payload = {
        jsonrpc: "2.0",
        id: userMsg.uuid,
        method: "message/send",
        params: {
          message: {
            role: "user",
            messageId: userMsg.uuid,
            parts: [
              { text: userMsg.message }
            ]
          }
        }
      };
      endpoint = agent.url.replace(/\/+$/, ''); // Use base URL for JSON-RPC
    } else {
      // Use A2A REST format
      payload = {
        input: { text: userMsg.message },
      };
      endpoint = `${agent.url.replace(/\/+$/, '')}/invoke`;
    }

    let responseText: string | undefined;

    try {
      console.log(`Invoking agent at: ${endpoint}`);
      console.log('Protocol:', useJsonRpc ? 'JSON-RPC' : 'REST');
      console.log('Payload:', payload);

      const res = await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      // Parse response based on protocol
      const data = await res.json();
      console.log('Response data:', data);

      if (useJsonRpc) {
        // Handle JSON-RPC response
        if (data.error) {
          throw new Error(`JSON-RPC Error: ${data.error.message || JSON.stringify(data.error)}`);
        }

        const result = data.result;
        if (typeof result === 'string') {
          responseText = result;
        } else if (result && typeof result.content === 'string') {
          responseText = result.content;
        } else if (result && typeof result.text === 'string') {
          responseText = result.text;
        } else if (result && typeof result.message === 'string') {
          responseText = result.message;
        } else if (result && result.parts && Array.isArray(result.parts) && result.parts[0]?.text) {
          responseText = result.parts[0].text;
        } else {
          responseText = JSON.stringify(result || data);
        }
      } else {
        // Handle REST/A2A response
        if (typeof data === 'string') {
          responseText = data;
        } else if (typeof (data as any).content === 'string') {
          responseText = (data as any).content;
        } else if (typeof (data as any).text === 'string') {
          responseText = (data as any).text;
        } else if (typeof (data as any).message === 'string') {
          responseText = (data as any).message;
        } else if (typeof (data as any).response === 'string') {
          responseText = (data as any).response;
        } else {
          responseText = JSON.stringify(data);
        }
      }

    } catch (e) {
      console.error('Agent invocation error:', e);

      if (e instanceof TypeError && e.message.includes('Failed to fetch') ) {
        responseText = `CORS Error: Cannot connect to agent at ${agent.url}. The agent server needs to allow cross-origin requests from your domain. Please contact the agent provider to add CORS headers.`;
      } else if (e instanceof Error) {
        responseText = `Error from agent: ${e.message}`;
      } else {
        responseText = `Unknown error: ${e}`;
      }
    }
    // Append the agent's reply to the channel
    const reply: IAgentMessage = {
      uuid: nanoid(),
      user: agent.name,
      ts: Date.now(),
      message: responseText ??  '',
      role: 'agent',
    };

    // Find the channel and append to its message history
    const channelData = this.channels.toArray().find(ch => ch.name === channel);
    if (channelData) {
      let arr = this.history.get(channelData.uuid);
      if (!arr) {
        arr = new Y.Array<IAgentMessage>();
        this.history.set(channelData.uuid, arr);
      }
      arr.push([reply]);
    }

  }

  /**
   * Handle incoming chat messages and respond if agents are active in the channel
   */
  private async handleChatMessage(channelName: string, message: IChatMessage): Promise<void> {
    console.log(`[AGENT] Processing message in channel #${channelName} from ${message.user}:`, message.message);

    // Check if any agents are active in this channel first
    const agentsInChannel = this.getAgentsInChannel(channelName);
    if (agentsInChannel.length === 0) {
      console.log(`[AGENT] No agents active in channel #${channelName}, skipping`);
      return;
    }

    console.log(`[AGENT] Found ${agentsInChannel.length} active agent(s):`, agentsInChannel.map(a => a.name));

    // Skip if this is a message from an agent (to avoid loops)
    if (this.isMessageFromAgent(channelName, message)) {
      console.log(`[AGENT] Skipping message from agent ${message.user} to prevent infinite loop`);
      return;
    }

    // Get conversation history (last 20 messages) for context
    const chatHistory = await this.workspace.chat.getMessages(channelName);
    const contextMessages = chatHistory.slice(-20);

    // Invoke each agent with the context
    for (const agent of agentsInChannel) {
      try {
        await this.invokeAgentWithContext(agent, message, channelName, contextMessages);
      } catch (error) {
        console.error(`Failed to invoke agent ${agent.name}:`, error);
      }
    }
  }

  /**
   * Check if a message is from an agent to avoid response loops
   */
  private isMessageFromAgent(channelName: string, message: IChatMessage): boolean {
    const agentsInChannel = this.getAgentsInChannel(channelName);
    console.log(`[AGENT] Checking if message from "${message.user}" is from agent. Agents in channel:`, agentsInChannel.map(a => a.name));

    const isFromAgent = agentsInChannel.some(agent => agent.name === message.user);
    console.log(`[AGENT] Message from "${message.user}" is from agent: ${isFromAgent}`);

    return isFromAgent;
  }

  /**
   * Internal helper to perform an A2A invocation against the given agent with conversation context.
   * This method uses a simple HTTP POST to an '/invoke' endpoint;
   * if the agent implements a different contract adjust this accordingly.
   * replies will be recorded in the chat channel as regular chat messages
   *
   * @param agent The agent card used to determine the endpoint
   * @param userMsg The user message that triggered the invocation
   * @param channelName Name of the channel where the reply should be stored
   * @param contextMessages Previous messages for context (last 20)
   */
  private async invokeAgentWithContext(agent: IAgentCard, userMsg: IChatMessage, channelName: string, contextMessages: IChatMessage[]): Promise<void> {
    // Check if agent uses JSON-RPC protocol
    // requires auto-detection update later
    const useJsonRpc = agent.preferredTransport === 'JSONRPC' ||
                       (agent as any).preferredTransport === 'JSONRPC' ||
                       agent.protocolVersion === '0.3.0' ||  // Our agent card at llama server currently has this
                       (agent as any).protocolVersion === '0.3.0';

    console.log(`Invoking agent ${agent.name} with context for channel ${channelName}`);
    console.log('Context messages count:', contextMessages.length);
    console.log('Will use JSON-RPC:', useJsonRpc);

    // Build conversation history for context
    const conversationHistory = contextMessages.map(msg => ({
      role: this.isMessageFromAgent(channelName, msg) ? 'assistant' : 'user',
      content: msg.message,
      user: msg.user,
      timestamp: msg.ts
    }));

    let payload: any;
    let endpoint: string;

    if (useJsonRpc) {
      // Use JSON-RPC 2.0 format with conversation history
      payload = {
        jsonrpc: "2.0",
        id: userMsg.uuid,
        method: "message/send",
        params: {
          message: {
            role: "user",
            messageId: userMsg.uuid,
            parts: [
              { text: userMsg.message }
            ]
          },
          context: {
            channel: channelName,
            conversationHistory: conversationHistory
          }
        }
      };
      endpoint = agent.url.replace(/\/+$/, ''); // Use base URL for JSON-RPC
    } else {
      // Use A2A REST format with conversation history
      payload = {
        input: {
          text: userMsg.message,
          context: {
            channel: channelName,
            conversationHistory: conversationHistory
          }
        },
      };
      endpoint = `${agent.url.replace(/\/+$/, '')}/invoke`;
    }

    let responseText: string | undefined;

    try {
      console.log(`Invoking agent at: ${endpoint}`);
      console.log('Protocol:', useJsonRpc ? 'JSON-RPC' : 'REST');

      const res = await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      // Parse response based on protocol
      const data = await res.json();
      console.log('Response data:', data);

      if (useJsonRpc) {
        // Handle JSON-RPC response
        if (data.error) {
          throw new Error(`JSON-RPC Error: ${data.error.message || JSON.stringify(data.error)}`);
        }

        const result = data.result;
        if (typeof result === 'string') {
          responseText = result;
        } else if (result && typeof result.content === 'string') {
          responseText = result.content;
        } else if (result && typeof result.text === 'string') {
          responseText = result.text;
        } else if (result && typeof result.message === 'string') {
          responseText = result.message;
        } else if (result && result.parts && Array.isArray(result.parts) && result.parts[0]?.text) {
          responseText = result.parts[0].text;
        } else {
          responseText = JSON.stringify(result || data);
        }
      } else {
        // Handle REST/A2A response
        if (typeof data === 'string') {
          responseText = data;
        } else if (typeof (data as any).content === 'string') {
          responseText = (data as any).content;
        } else if (typeof (data as any).text === 'string') {
          responseText = (data as any).text;
        } else if (typeof (data as any).message === 'string') {
          responseText = (data as any).message;
        } else if (typeof (data as any).response === 'string') {
          responseText = (data as any).response;
        } else {
          responseText = JSON.stringify(data);
        }
      }

    } catch (e) {
      console.error('Agent invocation error:', e);

      if (e instanceof TypeError && e.message.includes('Failed to fetch') ) {
        responseText = `CORS Error: Cannot connect to agent at ${agent.url}. The agent server needs to allow cross-origin requests from your domain. Please contact the agent provider to add CORS headers.`;
      } else if (e instanceof Error) {
        responseText = `Error from agent: ${e.message}`;
      } else {
        responseText = `Unknown error: ${e}`;
      }
    }

    // Send the agent's reply to the chat channel (not agent channel)
    // But don't send error messages as chat messages to avoid loops
    if (responseText && responseText.trim()) {
      // Check if this is an error message that shouldn't be sent as a chat message
      const isErrorMessage = responseText.includes('Error from agent:') ||
                           responseText.includes('CORS Error:') ||
                           responseText.includes('HTTP 4') ||
                           responseText.includes('HTTP 5') ||
                           responseText.includes('Unknown error:');

      if (isErrorMessage) {
        console.error(`[AGENT] Agent ${agent.name} returned error, not sending to chat: ${responseText}`);
        return;
      }

      const reply: IChatMessage = {
        uuid: nanoid(),
        user: agent.name,
        ts: Date.now(),
        message: responseText.trim(),
      };

      await this.workspace.chat.sendMessage(channelName, reply);
      console.log(`[AGENT] Agent ${agent.name} replied successfully in channel ${channelName}: "${responseText.slice(0, 100)}${responseText.length > 100 ? '...' : ''}"`);
    }
  }

}


