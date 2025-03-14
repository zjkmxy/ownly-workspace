//go:build js && wasm

package app

import (
	_ "embed"
	"time"

	enc "github.com/named-data/ndnd/std/encoding"
	"github.com/named-data/ndnd/std/engine"
	"github.com/named-data/ndnd/std/engine/face"
	"github.com/named-data/ndnd/std/log"
	"github.com/named-data/ndnd/std/ndn"
	"github.com/named-data/ndnd/std/ndn/spec_2022"
)

//go:embed testbed.root.cert
var testbedRootCert []byte

// TODO: better way to configure/change this as needed
var testbedRootName, _ = enc.NameFromStr("/ndn/KEY/%27%C4%B2%2A%9F%7B%81%27/ndn/v=1651246789556")
var testbedPrefix = enc.Name{enc.NewGenericComponent("ndn")}

// GetTestbedKey returns the testbed key, or nil if not found.
// Returns (signer, certData, certSigCov)
func (a *App) GetTestbedKey() (ndn.Signer, ndn.Data, enc.Wire) {
	// TODO: move most of this to NDNd
	now := time.Now()

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

				// TODO: actually validate the certificate with testbed root cert
				if certName.At(-2).String() != "NDNCERT" {
					continue
				}

				certData, certSigCov, err := spec_2022.Spec{}.ReadData(enc.NewBufferView(certWire))
				if err != nil {
					log.Error(nil, "Failed to decode certificate", "err", err)
					continue
				}

				notBefore, notAfter := certData.Signature().Validity()
				if !notBefore.IsSet() || !notAfter.IsSet() {
					log.Error(nil, "Certificate validity not set", "name", certData.Name())
					continue
				}

				if notBefore.Unwrap().After(now) || notAfter.Unwrap().Before(now) {
					continue // expired
				}

				log.Info(nil, "Found valid testbed cert", "name", certData.Name())

				return key.Signer(), certData, certSigCov
			}
		}
	}

	return nil, nil, nil
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
