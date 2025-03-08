import fs from 'fs';
import util from 'util';
import crypto from 'crypto';

import ndn from '@/services/ndn';
import { Workspace } from '@/services/workspace';

async function loadGoEnvironment() {
  // Prep environment for WebAssembly
  (globalThis as any).fs = fs;
  globalThis.TextEncoder = util.TextEncoder;
  globalThis.TextDecoder = util.TextDecoder;
  globalThis.performance ??= performance;
  globalThis.crypto ??= crypto as any;

  // @ts-expect-error - go wasm module
  await import('./wasm_exec.js');
  console.log('Go environment loaded');
}

async function main() {
  try {
    await loadGoEnvironment();
    await ndn.setup();

    await Workspace.setup('test-space1');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
