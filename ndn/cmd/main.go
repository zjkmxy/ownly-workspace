//go:build js && wasm

package main

import (
	"fmt"
	"syscall/js"
	"time"

	"github.com/pulsejet/ownly/ndn/utils"
)

func main() {
	api := map[string]interface{}{
		// connectTestbed(callback: () => void): void;
		"connectTestbed": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			fmt.Println("connectTestbed 1")
			time.Sleep(5 * time.Second)
			fmt.Println("connectTestbed 2")
			return nil, nil
		}),

		// onConnectivityChange(callback: (connected: boolean, router: string) => void): void;
		"onConnectivityChange": js.FuncOf(func(this js.Value, p []js.Value) interface{} {
			fmt.Println("onConnectivityChange")
			return nil
		}),
	}

	js.Global().Call("setNdn", js.ValueOf(api))
	<-make(chan struct{})
}
