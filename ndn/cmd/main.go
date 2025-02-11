//go:build js && wasm

package main

import (
	"fmt"
	"syscall/js"

	"github.com/named-data/ndnd/std/utils"
	"github.com/pulsejet/ownly/ndn/app"
)

func main() {
	me := app.NewApp()

	api := map[string]any{
		// setupKeyChain(keyChain: KeyChainJS): Promise<void>
		"setupKeyChain": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return nil, me.SetupKeyChain(p[0])
		}),

		// hasTestbedKey(): Promise<boolean>;
		"hasTestbedKey": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return me.HasTestbedKey(), nil
		}),

		// connectTestbed(): Promise<void>;
		"connectTestbed": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return nil, me.ConnectTestbed()
		}),

		// onConnectivityChange(callback: (connected: boolean, router: string) => void): void;
		"onConnectivityChange": js.FuncOf(func(this js.Value, p []js.Value) any {
			fmt.Println("onConnectivityChange")
			return nil
		}),

		// ndncertEmail(email: string, code: (status: string) => Promise<string>): Promise<void>;
		"ndncertEmail": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return nil, me.NdncertEmail(p[0].String(), func(status string) string {
				code, err := utils.Await(p[1].Invoke(status))
				if err != nil {
					return ""
				}
				return code.String()
			})
		}),
	}

	js.Global().Call("setNdn", js.ValueOf(api))
	<-make(chan struct{})
}
