/// <reference types="node" />
/// <reference types="../services.d.ts" />

import fs from 'fs';
import util from 'util';
import crypto from 'crypto';

import { NodeStatsDb } from '../services/database/stats_node';
import { IDBProjDb } from '../services/database/proj_db_browser';

import ndn from '../services/ndn';
import { Workspace } from '../services/workspace';
import * as utils from '../utils';

async function loadServices() {
  globalThis._o = {
    stats: new NodeStatsDb(),
    ProjDb: IDBProjDb,
  };
}

async function loadGoEnvironment() {
  // Prep environment for WebAssembly
  (globalThis as any).fs = fs;
  globalThis.TextEncoder = util.TextEncoder;
  /// @ts-expect-error - TextDecoder is not defined in Node
  globalThis.TextDecoder = util.TextDecoder;
  globalThis.performance ??= performance;
  globalThis.crypto ??= crypto as any;

  // @ts-expect-error - go wasm module
  await import('./wasm_exec.js');
  console.log('Go environment loaded');
}

async function setupWorkspace(wkspName: string) {
  // Join the workspace if not already joined
  const wkspMeta = await globalThis._o.stats.get(wkspName);
  if (!wkspMeta) {
    await _o.stats.put(wkspName, {
      label: wkspName,
      name: wkspName,
      owner: false,
    });
  }

  // Setup the workspace
  await Workspace.setup(utils.escapeUrlName(wkspName));
}

async function main() {
  try {
    await loadServices();
    await loadGoEnvironment();
    await ndn.setup();

    // TODO: get from CLI instead
    await setupWorkspace('/test/space1');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
