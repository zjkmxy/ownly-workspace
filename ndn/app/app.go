//go:build js && wasm

package app

import (
	"fmt"
	"syscall/js"

	"github.com/named-data/ndnd/std/ndn"
	"github.com/named-data/ndnd/std/object/storage"
	"github.com/named-data/ndnd/std/security/keychain"
	jsutil "github.com/named-data/ndnd/std/utils/js"
)

type App struct {
	face     ndn.Face
	engine   ndn.Engine
	store    ndn.Store
	keychain ndn.KeyChain
}

var _ndnd_store_js = js.Global().Get("_ndnd_store_js")
var _ndnd_keychain_js = js.Global().Get("_ndnd_keychain_js")

// function(connected: boolean, router: string): void
var _ndnd_conn_change_js = js.Global().Get("_ndnd_conn_change_js")

func NewApp() *App {
	store := storage.NewJsStore(_ndnd_store_js)

	kc, err := keychain.NewKeyChainJS(_ndnd_keychain_js, store)
	if err != nil {
		panic(err)
	}

	return &App{
		store:    store,
		keychain: kc,
	}
}

func NewNodeApp() *App {
	store := storage.NewMemoryStore()

	kc, err := keychain.NewKeyChainDir("./keychain", store)
	if err != nil {
		panic(err)
	}

	return &App{
		store:    store,
		keychain: kc,
	}
}

func (a *App) String() string {
	return "app"
}

func (a *App) JsApi() js.Value {
	api := map[string]any{
		// has_testbed_key(): Promise<boolean>;
		"has_testbed_key": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return a.GetTestbedKey() != nil, nil
		}),

		// get_identity_name(): Promise<string>;
		"get_identity_name": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			key := a.GetTestbedKey()
			if key == nil {
				return nil, fmt.Errorf("no testbed key")
			}
			return js.ValueOf(key.KeyName().Prefix(-2).String()), nil
		}),

		// connect_testbed(): Promise<void>;
		"connect_testbed": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return nil, a.ConnectTestbed()
		}),

		// ndncert_email(email: string, code: (status: string) => Promise<string>): Promise<void>;
		"ndncert_email": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return nil, a.NdncertEmail(p[0].String(), func(status string) string {
				code, err := jsutil.Await(p[1].Invoke(status))
				if err != nil {
					return ""
				}
				return code.String()
			})
		}),

		// join_workspace(wksp: string, create: boolean): Promise<string>;
		"join_workspace": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return a.JoinWorkspace(p[0].String(), p[1].Bool())
		}),

		// is_workspace_owner(wksp: string): Promise<boolean>;
		"is_workspace_owner": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return a.IsWorkspaceOwner(p[0].String())
		}),

		// get_workspace(name: string): Promise<WorkspaceAPI>;
		"get_workspace": jsutil.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			return a.GetWorkspace(p[0].String())
		}),
	}

	return js.ValueOf(api)
}
