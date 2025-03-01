import Dexie from 'dexie';

import type { IWkspStats } from './types';

/**
 * IndexedDB storage service
 */
class StatsService {
  public db = new Dexie('ownly') as Dexie & {
    workspaces: Dexie.Table<IWkspStats, string>;
  };

  constructor() {
    this.db.version(1).stores({
      workspaces: 'name',
    });
  }
}

export default new StatsService();
