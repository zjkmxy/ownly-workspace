//go:build js && wasm

package main

import (
	"fmt"
	"syscall/js"

	jsutil "github.com/named-data/ndnd/std/utils/js"
	"github.com/pulsejet/ownly/ndn/app"
)

func main() {
	me := app.NewApp()

	api := map[string]any{
		// setup_keychain(keychain: KeyChainJS): Promise<void>
		"setup_keychain": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return nil, me.SetupKeyChain(p[0])
		}),

		// has_testbed_key(): Promise<boolean>;
		"has_testbed_key": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return me.GetTestbedKey() != nil, nil
		}),

		// connect_testbed(): Promise<void>;
		"connect_testbed": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return nil, me.ConnectTestbed()
		}),

		// on_conn_change(callback: (connected: boolean, router: string) => void): void;
		"on_conn_change": js.FuncOf(func(this js.Value, p []js.Value) any {
			fmt.Println("onConnectivityChange")
			return nil
		}),

		// ndncert_email(email: string, code: (status: string) => Promise<string>): Promise<void>;
		"ndncert_email": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return nil, me.NdncertEmail(p[0].String(), func(status string) string {
				code, err := jsutil.Await(p[1].Invoke(status))
				if err != nil {
					return ""
				}
				return code.String()
			})
		}),

		// create_workspace(name: string): Promise<string>;
		"create_workspace": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return me.CreateWorkspace(p[0].String())
		}),

		// get_workspace(name: string): Promise<WorkspaceAPI>;
		"get_workspace": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return me.GetWorkspace(p[0].String())
		}),
	}

	js.Global().Call("set_ndn", js.ValueOf(api))
	<-make(chan struct{})
}
