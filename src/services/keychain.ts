import Dexie from 'dexie';

export class KeyChainJS {
  private db = new Dexie('keychain') as Dexie & {
    keys: Dexie.Table<{ name: string; blob: Uint8Array }, number>;
  };

  constructor() {
    this.db.version(1).stores({
      keys: 'name',
    });
  }

  public async list() {
    const list = await this.db.keys.toArray();
    return list.map((k) => k.blob);
  }

  public async write(name: string, blob: Uint8Array) {
    await this.db.keys.put({ name, blob });
  }
}
