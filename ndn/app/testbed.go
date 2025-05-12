//go:build js && wasm

package app

import (
	_ "embed"
	"fmt"
	"time"

	enc "github.com/named-data/ndnd/std/encoding"
	"github.com/named-data/ndnd/std/engine"
	"github.com/named-data/ndnd/std/engine/face"
	"github.com/named-data/ndnd/std/log"
	"github.com/named-data/ndnd/std/ndn"
	spec "github.com/named-data/ndnd/std/ndn/spec_2022"
	"github.com/named-data/ndnd/std/object"
	"github.com/named-data/ndnd/std/security"
	"github.com/named-data/ndnd/std/types/optional"
	"github.com/named-data/ndnd/std/utils"
)

//go:embed testbed.root.cert
var testbedRootCert []byte

// TODO: better way to configure/change this as needed
var testbedRootName, _ = enc.NameFromStr("/ndn/KEY/%27%C4%B2%2A%9F%7B%81%27/ndn/v=1651246789556")
var testbedPrefix = enc.Name{enc.NewGenericComponent("ndn")}

// GetTestbedKey returns the testbed key, or nil if not found.
// Returns (signer, certData, certSigCov)
func (a *App) GetTestbedKey() ndn.Signer {
	// TODO: move most of this to NDNd

	// Check all certificates in the keychain
	for _, id := range a.keychain.Identities() {
		if !testbedPrefix.IsPrefix(id.Name()) {
			continue
		}

		for _, key := range id.Keys() {
			for _, certName := range key.UniqueCerts() {
				certWire, _ := a.store.Get(certName.Prefix(-1), true)
				if certWire == nil {
					log.Error(nil, "Failed to find certificate", "name", certName)
					continue
				}

				// Check if the certificate is a testbed certificate
				if certName.At(-2).String() != "NDNCERT" {
					continue
				}

				// Verify the certificate chain
				certData, err := a.verifyTestbedCert(enc.Wire{certWire}, false)
				if err != nil {
					log.Error(nil, "Failed to validate certificate", "err", err)
					continue
				}

				// Certificate is usable
				log.Info(nil, "Found valid testbed cert", "name", certData.Name())

				return key.Signer()
			}
		}
	}

	return nil
}

func (a *App) SetCmdKey(key ndn.Signer) {
	a.engine.SetCmdSec(key, func(n enc.Name, w enc.Wire, s ndn.Signature) bool {
		return true
	})
}

func (a *App) ConnectTestbed() error {
	// If we already have a face, it should automatically switch
	if a.face != nil {
		return nil
	}

	// TODO: fch
	endpoint := "wss://suns.cs.ucla.edu/ws/"

	face := face.NewWasmWsFace(endpoint, false)
	face.OnUp(func() {
		_ndnd_conn_change_js.Invoke(true, endpoint)
	})
	face.OnDown(func() {
		_ndnd_conn_change_js.Invoke(false, endpoint)
	})

	a.face = face
	a.engine = engine.NewBasicEngine(a.face)
	err := a.engine.Start()
	if err != nil {
		return err
	}

	return nil
}

// ExecWithConnectivity runs the callback when the face is up, or immediately if it is already up.
// The callback will always be called in a new goroutine.
func (a *App) ExecWithConnectivity(callback func()) {
	if a.face.IsRunning() {
		go callback()
	} else {
		var cancel func()
		cancel = a.face.OnUp(func() {
			go callback()
			cancel()
		})
	}
}

// WaitForConnectivity waits for the face to be up.
func (a *App) WaitForConnectivity(timeout time.Duration) error {
	if a.face != nil && a.face.IsRunning() {
		return nil
	}
	if err := a.ConnectTestbed(); err != nil {
		return err
	}
	done := make(chan struct{})
	cancel := a.face.OnUp(func() { close(done) })
	defer cancel()
	select {
	case <-done:
		return nil
	case <-time.After(timeout):
		return fmt.Errorf("timeout waiting for NDN connectivity")
	}
}

func (a *App) verifyTestbedCert(certWire enc.Wire, fetch bool) (ndn.Data, error) {
	certData, certSigCov, err := spec.Spec{}.ReadData(enc.NewWireView(certWire))
	if err != nil {
		return nil, err
	}

	ch := make(chan error, 1)
	a.trust.Validate(security.TrustConfigValidateArgs{
		Data:              certData,
		DataSigCov:        certSigCov,
		UseDataNameFwHint: optional.Some(false), // directly available
		Fetch: func(name enc.Name, cfg *ndn.InterestConfig, callback ndn.ExpressCallbackFunc) {
			if !fetch {
				cfg.Lifetime.Set(1 * time.Millisecond) // no block
			}

			object.ExpressR(a.engine, ndn.ExpressRArgs{
				Name:     name,
				Config:   cfg,
				Retries:  utils.If(fetch, 3, 0),
				TryStore: a.store,
				Callback: callback,
			})
		}, Callback: func(valid bool, err error) {
			if err != nil {
				ch <- err
			} else if !valid {
				ch <- fmt.Errorf("certificate is not valid")
			} else {
				ch <- nil
			}
		},
	})
	return certData, <-ch
}
