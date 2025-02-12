package app

import (
	"crypto/elliptic"
	"fmt"
	"syscall/js"
	"time"

	enc "github.com/named-data/ndnd/std/encoding"
	"github.com/named-data/ndnd/std/object"
	"github.com/named-data/ndnd/std/security"
	sig "github.com/named-data/ndnd/std/security/signer"
	ndn_sync "github.com/named-data/ndnd/std/sync"
	"github.com/named-data/ndnd/std/utils"
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
	name := key.KeyName().Prefix(-2) // pop KeyId and KEY

	// Create client object for this workspace
	client := object.NewClient(a.engine, a.store, nil)

	// Create new SVS ALO instance
	svsalo := ndn_sync.NewSvsALO(ndn_sync.SvsAloOpts{
		Name: name,
		// InitialState: readState(),

		Svs: ndn_sync.SvSyncOpts{
			Client: client,
			GroupPrefix: group.
				Append(enc.NewKeywordComponent("svs")).
				Append(enc.NewGenericComponent("alo")),
		},

		Snapshot: &ndn_sync.SnapshotNodeHistory{
			Client:    client,
			Threshold: 10,
		},
	})

	apiMap := map[string]any{
		"name":  js.ValueOf(name.String()),
		"group": js.ValueOf(group.String()),

		"start": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			if err := client.Start(); err != nil {
				return nil, err
			}
			if err := svsalo.Start(); err != nil {
				return nil, err
			}
			return nil, nil
		}),

		"stop": utils.AsyncFunc(func(this js.Value, p []js.Value) (any, error) {
			if err := client.Stop(); err != nil {
				return nil, err
			}
			if err := svsalo.Stop(); err != nil {
				return nil, err
			}
			return nil, nil
		}),
	}

	return js.ValueOf(apiMap), nil
}
