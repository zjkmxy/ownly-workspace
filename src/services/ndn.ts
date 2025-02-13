/// <reference types="golang-wasm-exec" />

import { KeyChainJS } from "./keychain";

declare global {
    interface Window {
        Go: typeof Go;
        set_ndn?: (ndn: NDNAPI) => void;
        ndn_api: NDNAPI;
    }
}

interface NDNAPI {
    /** Setup the keychain */
    setup_keychain(keychain: KeyChainJS): Promise<void>;

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

    /** SVS ALO instance */
    svs_alo(group: string): Promise<SvsAloApi>;
};

/** API of the SVS ALO instance */
export interface SvsAloApi {
    /** Start the SVS instance */
    start(): Promise<void>;
    /** Stop the SVS instance */
    stop(): Promise<void>;
    /** Set the error callback */
    set_on_error(): Promise<void>;

    /** Publish chat message to SVS ALO */
    pub_yjs_delta(binary: Uint8Array): Promise<void>;

    /** Set SVS ALO subscription callbacks */
    subscribe(params: {
        on_yjs_delta: SvsAloSub<{ binary: Uint8Array; }>,
    }): Promise<void>;
};

/** Subscription to SVS ALO */
export type SvsAloSub<T> = (info: SvsAloPubInfo, pub: T) => void;

/** Metadata of received publication */
export type SvsAloPubInfo = {
    publisher: string;
    boot_time: number;
    seq_num: number;
};

/**
 * Named Data Networking Service
 */
class NDNService {
    public api!: NDNAPI;

    constructor() { }

    async setup() {
        if (this.api) return;

        const go = new window.Go();
        const result = await WebAssembly.instantiateStreaming(fetch("/main.wasm"), go.importObject);

        // Callback given by WebAssembly to set the NDN API
        const ndnPromise = new Promise((resolve, reject) => {
            const cancel = setTimeout(() => reject(new Error("NDN API not set")), 5000);
            window.set_ndn = (ndn: NDNAPI) => {
                window.set_ndn = undefined;
                window.ndn_api = ndn;
                resolve(ndn);
                clearTimeout(cancel);
            };
        });

        go.run(result.instance);
        this.api = await ndnPromise as NDNAPI;

        // Provide JS APIs
        await this.api.setup_keychain(new KeyChainJS());

        console.log("NDN API setup is complete", this.api);
    }
}

export default new NDNService();
