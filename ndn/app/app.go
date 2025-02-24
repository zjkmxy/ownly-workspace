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

func NewApp() *App {
	sjs := js.Global().Get("_ndnd_store_js")
	store := object.NewJsStore(sjs)

	kjs := js.Global().Get("_ndnd_keychain_js")
	keychain, err := keychain.NewKeyChainJS(kjs, store)
	if err != nil {
		panic(err)
	}

	return &App{
		store:    store,
		keychain: keychain,
	}
}
