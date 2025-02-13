import Dexie from 'dexie';
import type * as types from './types';

/**
 * IndexedDB storage service
 */
class StorageService {
  public db = new Dexie('ownly') as Dexie & {
    workspaces: Dexie.Table<types.IWorkspace, string>;
  };

  constructor() {
    this.db.version(1).stores({
      workspaces: 'name',
    });
  }
}

export default new StorageService();
