/// <reference types="node" />
/// <reference types="../services.d.ts" />

import fs from 'fs';
import util from 'util';
import crypto from 'crypto';

import { NodeStatsDb } from '../services/database/stats_node';
import { NodeProjDb } from '../services/database/proj_db_node';
import { getOriginPrivateDirectory } from 'file-system-access';
import nodeAdapter from 'file-system-access/lib/adapters/node.js';

import ndn from '../services/ndn';
import { Workspace } from '../services/workspace';
import * as utils from '../utils';

async function loadServices() {
  globalThis._o = {
    stats: new NodeStatsDb(),
    ProjDb: NodeProjDb,

    getStorageRoot: () => getOriginPrivateDirectory(nodeAdapter, './'),
    streamSaver: null as any, // no node
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

async function setupWorkspace(wkspName: string): Promise<Workspace> {
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
  return await Workspace.setup(utils.escapeUrlName(wkspName));
}

async function main() {
  try {
    await loadServices();
    await loadGoEnvironment();
    await ndn.setup();

    // TODO: get name from CLI instead
    const wksp = await setupWorkspace('/test/space1');
    const proj = await wksp.proj.get('documents');

    // TODO: need a hook to wait for sync to complete instead of this
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Synchornize the filesystem
    await proj.syncFs();
    process.exit(0);
  } catch (e) {
    console.error('FATAL:', e);
    process.exit(1);
  }
}

main();
