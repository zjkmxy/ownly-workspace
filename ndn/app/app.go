//go:build js && wasm

package app

import (
	"syscall/js"

	"github.com/named-data/ndnd/std/engine/face"
	"github.com/named-data/ndnd/std/ndn"
	"github.com/named-data/ndnd/std/object"
	"github.com/named-data/ndnd/std/security/keychain"
)

type App struct {
	face     face.Face
	engine   ndn.Engine
	store    ndn.Store
	keychain ndn.KeyChain
}

var _ndnd_store_js = js.Global().Get("_ndnd_store_js")
var _ndnd_keychain_js = js.Global().Get("_ndnd_keychain_js")

func NewApp() *App {
	store := object.NewJsStore(_ndnd_store_js)

	keychain, err := keychain.NewKeyChainJS(_ndnd_keychain_js, store)
	if err != nil {
		panic(err)
	}

	return &App{
		store:    store,
		keychain: keychain,
	}
}
