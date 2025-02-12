package app

import (
	"time"

	enc "github.com/named-data/ndnd/std/encoding"
	"github.com/named-data/ndnd/std/engine"
	"github.com/named-data/ndnd/std/engine/face"
	"github.com/named-data/ndnd/std/log"
	"github.com/named-data/ndnd/std/ndn/spec_2022"
)

func (a *App) HasTestbedKey() bool {
	// TODO: move most of this to NDNd
	now := time.Now()

	for _, id := range a.keychain.Identities() {
		if !testbedPrefix.IsPrefix(id.Name()) {
			continue
		}

		for _, key := range id.Keys() {
			for _, cname := range key.UniqueCerts() {
				certw, _ := a.store.Get(cname.Prefix(-1), true)
				if certw == nil {
					log.Error(nil, "Failed to find certificate", "name", cname)
					continue
				}

				cert, _, err := spec_2022.Spec{}.ReadData(enc.NewBufferView(certw))
				if err != nil {
					log.Error(nil, "Failed to decode certificate", "err", err)
					continue
				}

				notBefore, notAfter := cert.Signature().Validity()
				if notBefore.Before(now) && notAfter.After(now) {
					log.Info(nil, "Found valid testbed cert", "name", cert.Name())
					return true
				}
			}
		}
	}

	return false
}

func (a *App) ConnectTestbed() error {
	// TODO: fch and connectivity changes
	a.face = face.NewWasmWsFace("wss://suns.cs.ucla.edu/ws/", false)
	a.engine = engine.NewBasicEngine(a.face)
	err := a.engine.Start()
	if err != nil {
		return err
	}

	return nil
}
