//go:build js && wasm

package main

import (
	"syscall/js"

	"github.com/pulsejet/ownly/ndn/app"
)

func main() {
	var me *app.App
	if js.Global().Get("window").IsUndefined() {
		me = app.NewNodeApp()
	} else {
		me = app.NewApp()
	}
	js.Global().Call("set_ndn", me.JsApi())
	select {}
}
