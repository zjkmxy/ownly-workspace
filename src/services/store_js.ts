/**
 * StoreJS interface for storing NDN data.
 *
 * @license Apache-2.0
 */
export interface StoreJS {
  /** Get gets a page of packets from the storage */
  get(
    name: Uint8Array,
    prefix: boolean,
    last: Uint8Array | undefined,
  ): Promise<[Uint8Array, Uint8Array][]>;

  /** Put stores a packet in the storage */
  put(name: Uint8Array, version: number, blob: Uint8Array): Promise<void>;

  /** Remove removes packets from the storage */
  remove(name: Uint8Array, prefix: boolean): Promise<void>;
}

import Dexie from 'dexie';

/**
 * StoreJS implementation using Dexie.
 *
 * @license Apache-2.0
 */
export class StoreDexie implements StoreJS {
  private db: Dexie & {
    packets: Dexie.Table<
      {
        name: Uint8Array;
        version: number;
        blob: Uint8Array;
      },
      Uint8Array
    >;
  };

  // private cache: Map<string, Uint8Array> = new Map();

  constructor(name: string) {
    this.db = new Dexie(name) as any;
    this.db.version(1).stores({
      packets: '[name+version]',
    });
  }

  public async get(
    name: Uint8Array,
    prefix: boolean,
    last: Uint8Array | undefined,
  ): Promise<[Uint8Array, Uint8Array][]> {
    // Get the range of packets
    const range = await this.range(name, prefix, last);

    // Fetch entire range if hint was provided
    if (last) {
      const entries = await range.toArray();
      return entries.map((pkt) => [pkt.name, pkt.blob]);
    }

    const pkt = await range.last();
    if (!pkt?.blob) return [];
    return [[pkt.name, pkt.blob]];
  }

  public async put(name: Uint8Array, version: number, blob: Uint8Array) {
    await this.db.packets.put({ name, version, blob });
  }

  public async remove(name: Uint8Array, prefix: boolean) {
    const range = await this.range(name, prefix, undefined);
    await range.delete();
  }

  private async range(name: Uint8Array, prefix: boolean, last: Uint8Array | undefined) {
    last = last ?? name;

    // Prefix always overwrites last
    if (prefix) {
      // T=255 for the next byte (see TLV encoding)
      last = new Uint8Array(name.length + 1);
      last.set(name, 0);
      last[name.length] = 255;
    }

    return this.db.packets
      .where('[name+version]')
      .between([name, Dexie.minKey], [last, Dexie.maxKey], true, true);
  }
}
