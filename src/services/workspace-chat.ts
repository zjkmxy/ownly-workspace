import { EventEmitter } from 'events';
import * as Y from 'yjs';

import type { IChatChannel, IChatMessage } from './types';
import { GlobalWkspEvents, SvsYDoc } from './workspace';

import type TypedEmitter from 'typed-emitter';

export class WorkspaceChat {
  private readonly chatChannels: Y.Array<IChatChannel>;
  private readonly chatMessages: Y.Map<Y.Array<IChatMessage>>;
  public readonly events = new EventEmitter() as TypedEmitter<{
    chat: (channel: string, message: IChatMessage) => void;
  }>;

  constructor(private readonly svdoc: SvsYDoc) {
    this.chatChannels = svdoc.doc.getArray<IChatChannel>('_chan_');
    this.chatMessages = svdoc.doc.getMap<Y.Array<IChatMessage>>('_msg_');

    const chanObserver = () => GlobalWkspEvents.emit('chat-channels', this.chatChannels.toArray());
    this.chatChannels.observe(chanObserver);
    chanObserver();

    this.chatMessages.observeDeep((events) => {
      if (this.events.listenerCount('chat') === 0) return;
      for (const event of events) {
        const channel = String(event.path[0]);
        for (const delta of event.changes.added) {
          for (const message of delta.content.getContent()) {
            this.events.emit('chat', channel, message);
          }
        }
      }
    });
  }

  /**
   * Get chat channels
   * @returns Array of chat channels
   */
  async getChannels(): Promise<IChatChannel[]> {
    await this.svdoc.pers.whenSynced;
    return this.chatChannels.toArray();
  }

  /**
   * Create a new chat channel
   * @param channel Chat channel
   */
  async newChannel(channel: IChatChannel) {
    this.chatChannels.push([channel]);
    this.chatMessages.set(channel.name, new Y.Array<IChatMessage>());
  }

  /**
   * Get the messages array for a chat channel
   *
   * @param channel Chat channel
   */
  private async getArray(channel: string): Promise<Y.Array<IChatMessage>> {
    await this.svdoc.pers.whenSynced;
    const array = this.chatMessages.get(channel);
    if (!array) throw new Error('Channel does not exist');
    return array;
  }

  /**
   * Get history of chat messages
   *
   * @returns Array of chat messages
   */
  async getMessages(channel: string): Promise<IChatMessage[]> {
    const array = await this.getArray(channel);
    if (!array) throw new Error('Channel does not exist');
    return array.toArray();
  }

  /**
   * Send chat message to a channel
   *
   * @param message Chat message
   */
  async sendMessage(channel: string, message: IChatMessage) {
    (await this.getArray(channel)).push([message]);
  }
}
