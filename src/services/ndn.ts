import { KeyChainJS } from "./keychain";

interface NDNAPI {
    /** Setup the keychain */
    setupKeyChain(keyChain: KeyChainJS): Promise<void>;

    /** Check if there is a valid testbed key in the keychain */
    hasTestbedKey(): Promise<boolean>;

    /** Connect to the global NDN testbed */
    connectTestbed(): Promise<void>;

    /** Callback on connectivity change */
    onConnectivityChange(callback: (connected: boolean, router: string) => void): void;

    /** NDNCERT email verfication challenge */
    ndncertEmail(email: string, code: (status: string) => Promise<string>): Promise<void>;
}
/**
 * Named Data Networking Service
 */
class NDNService {
    public api!: NDNAPI;

    constructor() { }

    async setup() {
        if (this.api) return;

        const go = new (<any>window).Go();
        const result = await WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject);

        // Callback given by WebAssembly to set the NDN API
        const ndnPromise = new Promise((resolve, reject) => {
            const cancel = setTimeout(() => reject(new Error("NDN API not set")), 5000);
            (<any>window).setNdn = (ndn: any) => {
                (<any>window).setNdn = undefined;
                (<any>window).ndnApi = ndn;
                resolve(ndn);
                clearTimeout(cancel);
            };
        });

        go.run(result.instance);
        this.api = await ndnPromise as NDNAPI;

        // Provide JS APIs
        await this.api.setupKeyChain(new KeyChainJS());

        console.log("NDN API setup is complete", this.api);
    }
}

export default new NDNService();
