//go:build js && wasm

package app

import (
	"crypto/elliptic"
	"fmt"
	"syscall/js"
	"time"

	enc "github.com/named-data/ndnd/std/encoding"
	"github.com/named-data/ndnd/std/log"
	"github.com/named-data/ndnd/std/ndn/svs_ps"
	"github.com/named-data/ndnd/std/object"
	"github.com/named-data/ndnd/std/security"
	sig "github.com/named-data/ndnd/std/security/signer"
	ndn_sync "github.com/named-data/ndnd/std/sync"
	"github.com/named-data/ndnd/std/utils"
	"github.com/pulsejet/ownly/ndn/app/tlv"
)

func (a *App) CreateWorkspace(nameStr string) (nameStrFinal string, err error) {
	name, err := enc.NameFromStr(nameStr)
	if err != nil {
		return
	}
	nameStrFinal = name.String()

	keyName := security.MakeKeyName(name)
	signer, err := sig.KeygenEcc(keyName, elliptic.P256())
	if err != nil {
		return
	}
	if err = a.keychain.InsertKey(signer); err != nil {
		return
	}

	// Create self-signed certificate trust anchor
	cert, err := security.SelfSign(security.SignCertArgs{
		Signer:    signer,
		NotBefore: time.Now().Add(-time.Hour),
		NotAfter:  time.Now().Add(time.Hour * 24 * 365 * 10), // 10 years
	})
	if err != nil {
		return
	}
	if err = a.keychain.InsertCert(cert.Join()); err != nil {
		return
	}

	return
}

func (a *App) MakeWorkspace(nameStr string) (api js.Value, err error) {
	group, err := enc.NameFromStr(nameStr)
	if err != nil {
		return
	}

	// Get name of this node
	key := a.GetTestbedKey()
	if key == nil {
		err = fmt.Errorf("no testbed key")
		return
	}
	a.SetCmdKey(key)
	name := key.KeyName().Prefix(-2) // pop KeyId and KEY

	// Create client object for this workspace
	client := object.NewClient(a.engine, a.store, nil)

	svsAloGroup := group.
		Append(enc.NewKeywordComponent("alo"))

	// Create new SVS ALO instance
	svsAlo := ndn_sync.NewSvsALO(ndn_sync.SvsAloOpts{
		Name: name,
		// InitialState: readState(),

		Svs: ndn_sync.SvSyncOpts{
			Client:      client,
			GroupPrefix: svsAloGroup,
		},

		Snapshot: &ndn_sync.SnapshotNodeHistory{
			Client:    client,
			Threshold: 10,
		},
	})

	routes := []enc.Name{
		svsAlo.SyncPrefix(),
		svsAlo.DataPrefix(),
	}

	apiMap := map[string]any{
		"name":  js.ValueOf(name.String()),
		"group": js.ValueOf(group.String()),

		"start": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			for _, route := range routes {
				if err = a.engine.RegisterRoute(route); err != nil {
					return nil, err
				}
			}
			if err := client.Start(); err != nil {
				return nil, err
			}
			if err := svsAlo.Start(); err != nil {
				return nil, err
			}
			return nil, nil
		}),

		"stop": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			if err := svsAlo.Stop(); err != nil {
				return nil, err
			}
			if err := client.Stop(); err != nil {
				return nil, err
			}
			for _, route := range routes {
				if err = a.engine.UnregisterRoute(route); err != nil {
					return nil, err
				}
			}
			return nil, nil
		}),

		"svs_alo": SvsAloJs(svsAlo),
	}

	return js.ValueOf(apiMap), nil
}

func SvsAloJs(alo *ndn_sync.SvsALO) (api js.Value) {
	return js.ValueOf(map[string]any{
		// set_on_error(): Promise<void>;
		"set_on_error": js.FuncOf(func(this js.Value, p []js.Value) any {
			alo.SetOnError(func(err error) {
				p[0].Invoke(js.ValueOf(err.Error()))
			})
			return nil
		}),

		// publish_chat(message: Uint8Array): Promise<void>;
		"publish_chat": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			pub := &tlv.Message{
				Chat: &tlv.ChatMessage{
					Message: utils.JsArrayToSlice(p[0]),
				},
			}

			name, _, err := alo.Publish(pub.Encode())
			if err != nil {
				return nil, err
			}
			// TODO: persist state

			return js.ValueOf(name.String()), nil
		}),

		// subscribe(name: string, on_chat): Promise<void>;
		"subscribe": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			// Send a single publication to the subscriber
			sendPub := func(pub ndn_sync.SvsPub) {
				info := js.ValueOf(map[string]any{
					"publisher": js.ValueOf(pub.Publisher.String()),
					"boot_time": js.ValueOf(pub.BootTime),
					"seq_num":   js.ValueOf(pub.SeqNum),
				})

				pmsg, err := tlv.ParseMessage(enc.NewWireView(pub.Content), true)
				if err != nil {
					log.Error(nil, "Failed to parse publication", "err", err)
					return
				}

				// All possible message type conversions listed here
				switch {
				case pmsg.Chat != nil:
					p[0].Get("on_chat").Invoke(info, js.ValueOf(map[string]any{
						"message": utils.SliceToJsArray(pmsg.Chat.Message),
					}))
				default:
					log.Error(nil, "Unknown message type", "msg", pmsg)
				}
			}

			// Subscribe to the SVS instance
			alo.SubscribePublisher(enc.Name{}, func(pub ndn_sync.SvsPub) {
				if !pub.IsSnapshot {
					sendPub(pub)
				} else {
					snapshot, err := svs_ps.ParseHistorySnap(enc.NewWireView(pub.Content), true)
					if err != nil {
						panic(err) // we encode this, so this never happens
					}
					for _, entry := range snapshot.Entries {
						sendPub(ndn_sync.SvsPub{
							Publisher: pub.Publisher,
							Content:   entry.Content,
							BootTime:  pub.BootTime,
							SeqNum:    entry.SeqNo,
						})
					}
				}

				// TODO: persist state

				return
			})
			return nil, nil
		}),
	})
}
