import * as Y from 'yjs';
import * as awareProto from 'y-protocols/awareness.js';

import Dexie from 'dexie';

import * as utils from '@/utils';

import type { SvsAloApi, WorkspaceAPI } from './ndn';

/** IndexedDB schema for update entry  */
type UpdateEntry = {
  id?: number;
  uuid: string;
  update: Uint8Array;
};

/**
 * Yjs documents backed by an SVS sync group.
 * Persists to IndexedDB.
 */
export class SvsProvider {
  private readonly docs = new Map<string, Y.Doc>();
  private readonly aware = new Map<string, awareProto.Awareness>();

  private persistDirty = new Set<string>();
  private lastCompaction = 0;
  private isCompacting = false;

  private db: Dexie & {
    updates: Dexie.Table<UpdateEntry, number>;
  };

  private constructor(
    private readonly wksp: WorkspaceAPI,
    private readonly project: string,
    private readonly svs: SvsAloApi,
  ) {
    const slug = utils.escapeUrlName(wksp.group);
    this.db = new Dexie(`${slug}-${project}`) as typeof this.db;
    this.db.version(1).stores({
      updates: '++id, uuid',
    });
  }

  public static async create(wksp: WorkspaceAPI, project: string): Promise<SvsProvider> {
    const svs = await wksp.svs_alo(`${wksp.group}/${project}`);

    const provider = new SvsProvider(wksp, project, svs);
    await provider.start();

    return provider;
  }

  public async destroy() {
    for (const doc of this.docs.values()) {
      doc.destroy();
    }
    await this.svs.stop();
  }

  private async start() {
    await this.svs.subscribe({
      on_yjs_delta: async (info, pub) => {
        try {
          // Persist the update to IndexedDB
          await this.persist(pub.uuid, pub.binary);

          // Apply the update to the Yjs document if loaded
          const doc = this.docs.get(pub.uuid);
          if (doc) {
            Y.applyUpdateV2(doc, pub.binary, this);
          }
        } catch (e) {
          console.error('Failed to apply update', e);
        }
      },
    });
    await this.svs.start();
  }

  public async getDoc(uuid: string): Promise<Y.Doc> {
    let doc = this.docs.get(uuid);
    if (doc) return doc;

    doc = new Y.Doc();
    this.docs.set(uuid, doc);

    // Load updates from IndexedDB
    await this.db.updates
      .where('uuid')
      .equals(uuid)
      .each((update) => {
        Y.applyUpdateV2(doc, update.update, this);
      });

    // Subscribe to updates
    doc.on('updateV2', async (update, origin) => {
      // Ignore updates from self
      if (origin === this) return;

      // Publish the update to SVS
      await this.svs.pub_yjs_delta(uuid, update);

      // Persist the update to IndexedDB
      await this.persist(uuid, update);
    });

    // Cleanup on document destroy
    doc.on('destroy', () => {
      this.docs.delete(uuid);
      this.aware.delete(uuid);
    });

    return doc;
  }

  public async getAwareness(uuid: string): Promise<awareProto.Awareness> {
    const doc = this.docs.get(uuid);
    if (!doc) throw new Error('Document not loaded');

    let aware = this.aware.get(uuid);
    if (aware) return aware;

    aware = await NdnAwareness.create(uuid, doc, this.wksp, this.project);
    this.aware.set(doc.guid, aware);

    return aware;
  }

  private async persist(uuid: string, update: Uint8Array) {
    const id = await this.db.updates.put({ uuid, update });

    // Mark the document as dirty
    this.persistDirty.add(uuid);

    // Compact the database every few updates
    if (id - this.lastCompaction < 100) return;
    if (this.isCompacting) return;

    // Compact the database
    try {
      this.isCompacting = true;

      // For the first compaction, check all documents
      if (this.lastCompaction === 0) {
        await this.db.updates
          .orderBy('uuid')
          .eachUniqueKey((uuid) => this.persistDirty.add(String(uuid)));
      }

      // Check all dirty documents
      for (const uuid of this.persistDirty) {
        this.persistDirty.delete(uuid);

        // Check if we need to compact this document
        const count = await this.db.updates.where('uuid').equals(uuid).count();
        if (count > 100) {
          let maxId = 0; // last update id we merged
          const temp = new Y.Doc(); // temporary document to merge updates
          await this.db.updates
            .where('uuid')
            .equals(uuid)
            .each((update) => {
              Y.applyUpdateV2(temp, update.update, this);
              maxId = Math.max(maxId, update.id!);
            });

          // Encode the merged state
          const merged = Y.encodeStateAsUpdateV2(temp);
          temp.destroy();

          // Merge updates and delete old ones in a transaction
          await this.db.transaction('rw', this.db.updates, async () => {
            await this.db.updates.put({ uuid, update: merged });
            await this.db.updates
              .where('uuid')
              .equals(uuid)
              .and((update) => update.id! <= maxId)
              .delete();
          });
        }
      }

      this.lastCompaction = id;
    } catch (err) {
      console.error('Failed to compact database', err);
    } finally {
      this.isCompacting = false;
    }
  }
}

/**
 * Yjs awareness backed by an NDN sync group.
 */
class NdnAwareness extends awareProto.Awareness {
  private throttle: number = 0;
  private readonly throttleSet: Set<number> = new Set();

  public static async create(
    uuid: string,
    doc: Y.Doc,
    wksp: WorkspaceAPI,
    project: string,
  ): Promise<NdnAwareness> {
    const ndnAwareness = await wksp.awareness(`${wksp.group}/${project}/32=aware/${uuid}`);
    await ndnAwareness.start();

    // Create the awareness instance
    const me = new NdnAwareness(doc);

    // Unhook on document destroy
    doc.on('destroy', async () => {
      await ndnAwareness.stop();
      me.destroy();
    });

    // Make our own color here based on username
    const username = wksp.name ?? 'Unknown';
    const hash = utils.cyrb64(username);
    const r = (hash[0] % 128) + 110;
    const g = ((hash[0] >> 7) % 128) + 110;
    const b = (hash[1] % 128) + 110;

    // Set the local user state
    me.setLocalStateField('user', {
      name: username, // common
      color: `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`, // milkdown
      rgb: [r, g, b], // monaco
    });

    // Check for updates
    me.on('update', ({ added, updated, removed }: any, source: 'local' | 'remote') => {
      // Inject styles for remote updates
      if (source !== 'local') {
        for (const client of added) {
          me.injectStyles(client, me.getStates().get(client)?.user);
        }
        return;
      }

      // Throttle updates
      for (const client of added.concat(updated).concat(removed)) {
        me.throttleSet.add(client);
      }
      if (!me.throttle) {
        me.throttle = window.setTimeout(() => {
          const updates = Array.from(me.throttleSet);
          const updatesBin = awareProto.encodeAwarenessUpdate(me, updates);
          me.throttle = 0;
          me.throttleSet.clear();
          ndnAwareness.publish(updatesBin);
        }, 250);
      }
    });

    // Subscribe to remote updates
    ndnAwareness.subscribe((pub) => {
      try {
        awareProto.applyAwarenessUpdate(me, pub, 'remote');
      } catch (e) {
        console.error(e);
      }
    });

    return me;
  }

  private injectStyles(client: number, user: any) {
    if (!user.color) return;
    if (awarenessHaveStyles.has(client)) return;
    awarenessHaveStyles.add(client);

    let rgb = `${user.rgb[0]},${user.rgb[1]},${user.rgb[2]}`;
    if (utils.themeIsDark()) {
      rgb = `${255 - user.rgb[0]},${255 - user.rgb[1]},${255 - user.rgb[2]}`;
    }

    // Monaco editor colors (see CodeEditor.vue)
    awarenessStyles.textContent += `
      .yRemoteSelection-${client} {
        background-color: rgba(${rgb}, 0.5) !important;
      }
      .yRemoteSelectionHead-${client} {
        border-color: rgb(${rgb}) !important;
      }
      .yRemoteSelectionHead-${client}::after {
        content: "${user.name}" !important;
        background-color: rgb(${rgb}) !important;
      }
    `;
  }
}

// Awareness styles go to the head
const awarenessHaveStyles = new Set<number>();
const awarenessStyles = document.createElement('style');
document.head.appendChild(awarenessStyles);
