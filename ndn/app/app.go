//go:build js && wasm

package app

import (
	"syscall/js"

	"github.com/named-data/ndnd/std/engine/face"
	"github.com/named-data/ndnd/std/log"
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
	return &App{
		store: object.NewMemoryStore(),
	}
}

func (a *App) SetupKeyChain(api js.Value) (err error) {
	a.keychain, err = keychain.NewKeyChainJS(api, a.store)
	if err != nil {
		log.Error(nil, "app.SetupKeyChain: %+v", err)
	}
	return err
}
