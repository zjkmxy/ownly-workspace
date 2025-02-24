/// <reference types="golang-wasm-exec" />

import * as Y from 'yjs';

import { StoreDexie, type StoreJS } from './store_js';
import { KeyChainDexie, type KeyChainJS } from './keychain_js';
import { GlobalBus } from './event-bus';

declare global {
  interface Window {
    _ndnd_store_js: StoreJS;
    _ndnd_keychain_js: KeyChainJS;
    _yjs_merge_updates: (updates: Uint8Array[]) => Uint8Array;

    Go: typeof Go;
    set_ndn?: (ndn: NDNAPI) => void;
    ndn_api: NDNAPI;
  }
}

interface NDNAPI {
  /** Check if there is a valid testbed key in the keychain */
  has_testbed_key(): Promise<boolean>;

  /** Connect to the global NDN testbed */
  connect_testbed(): Promise<void>;

  /** Callback on connectivity change */
  on_conn_change(callback: (connected: boolean, router: string) => void): void;

  /** NDNCERT email verfication challenge */
  ndncert_email(email: string, code: (status: string) => Promise<string>): Promise<void>;

  /** Create new workspace */
  create_workspace(name: string): Promise<string>;

  /** Get an existing workspace */
  get_workspace(name: string): Promise<WorkspaceAPI>;
}

export interface WorkspaceAPI {
  /** Name of this user / node */
  name: string;
  /** Overall prefix of workspace */
  group: string;

  /** Start the workspace */
  start(): Promise<void>;
  /** Stop the workspace */
  stop(): Promise<void>;

  /** Produce an NDN object under a given name */
  produce(name: string, data: Uint8Array): Promise<void>;
  /** Consume an NDN object with a name */
  consume(name: string): Promise<{ data: Uint8Array; name: string }>;

  /** SVS ALO instance */
  svs_alo(
    group: string,
    state: Uint8Array | undefined,
    persist_state: (state: Uint8Array) => Promise<void>,
  ): Promise<SvsAloApi>;
  /** Awareness instance */
  awareness(group: string): Promise<AwarenessApi>;
}

/** API of the SVS ALO instance */
export interface SvsAloApi {
  /** Sync prefix of the instance */
  sync_prefix: string;
  /** Data prefix of the instance */
  data_prefix: string;

  /** Start the SVS instance */
  start(): Promise<void>;
  /** Stop the SVS instance */
  stop(): Promise<void>;
  /** Set the error callback */
  set_on_error(): Promise<void>;

  /** Publish chat message to SVS ALO */
  pub_yjs_delta(uuid: string, binary: Uint8Array): Promise<void>;

  /** Set SVS ALO subscription callbacks */
  subscribe(params: {
    on_yjs_delta: SvsAloSub<{ uuid: string; binary: Uint8Array }>;
  }): Promise<void>;
}

/** Subscription to SVS ALO */
export type SvsAloSub<T> = (pub: T[]) => Promise<void>;

/** Metadata of received publication */
export type SvsAloPubInfo = {
  publisher: string;
  boot_time: number;
  seq_num: number;
};

/** API for Awareness */
export interface AwarenessApi {
  /** Start the awareness */
  start(): Promise<void>;
  /** Stop the awareness */
  stop(): Promise<void>;
  /** Publish new data */
  publish(data: Uint8Array): Promise<void>;
  /** Subscribe to data */
  subscribe(cb: (pub: Uint8Array) => void): Promise<void>;
}

/**
 * Named Data Networking Service
 */
class NDNService {
  public api!: NDNAPI;

  constructor() {}

  async setup() {
    if (this.api) return;

    // Provide JS APIs
    window._ndnd_store_js = new StoreDexie('store');
    window._ndnd_keychain_js = new KeyChainDexie();
    window._yjs_merge_updates = Y.mergeUpdatesV2;

    // Load the Go WASM module
    const go = new window.Go();
    const result = await WebAssembly.instantiateStreaming(fetch('/main.wasm'), go.importObject);

    // Callback given by WebAssembly to set the NDN API
    const ndnPromise = new Promise<NDNAPI>((resolve, reject) => {
      const cancel = setTimeout(() => reject(new Error('NDN API not set')), 5000);
      window.set_ndn = (ndn: NDNAPI) => {
        window.set_ndn = undefined;
        window.ndn_api = ndn;
        resolve(ndn);
        clearTimeout(cancel);
      };
    });

    go.run(result.instance).then(() => {
      GlobalBus.emit(
        'wksp-error',
        new Error('WASM backend crashed. Check JS console for logs and refresh the page.'),
      );
    });
    this.api = await ndnPromise;
  }
}

export default new NDNService();
