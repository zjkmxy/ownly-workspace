//go:build js && wasm

package app

import (
	_ "embed"
	"encoding/base64"
	"fmt"
	"os"
	"syscall/js"
	"time"

	enc "github.com/named-data/ndnd/std/encoding"
	"github.com/named-data/ndnd/std/engine"
	"github.com/named-data/ndnd/std/engine/face"
	"github.com/named-data/ndnd/std/log"
	"github.com/named-data/ndnd/std/ndn"
	"github.com/named-data/ndnd/std/ndn/spec_2022"
	"github.com/named-data/ndnd/std/object"
	"github.com/named-data/ndnd/std/security/keychain"
	"github.com/named-data/ndnd/std/security/ndncert"
	spec_ndncert "github.com/named-data/ndnd/std/security/ndncert/tlv"
)

//go:embed testbed.root.cert
var testbedRootCert []byte
var testbedPrefix = enc.Name{enc.NewGenericComponent("ndn")}

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

func (a *App) NdncertEmail(email string, CodeCb func(status string) string) (err error) {
	rootCert, err := base64.StdEncoding.DecodeString(string(testbedRootCert))
	if err != nil {
		panic(err)
	}

	certClient, err := ndncert.NewClient(a.engine, rootCert)
	if err != nil {
		return err
	}

	// Request a certificate from NDNCERT
	certRes, err := certClient.RequestCert(ndncert.RequestCertArgs{
		Challenge: &ndncert.ChallengePin{
			// Email: email,
			CodeCallback: CodeCb,
		},
		OnProfile: func(profile *spec_ndncert.CaProfile) error {
			fmt.Fprintf(os.Stderr, "NDNCERT CA: %s\n", profile.CaInfo)
			return nil
		},
		OnProbeParam: func(key string) ([]byte, error) {
			switch key {
			case ndncert.KwEmail:
				return []byte(email), nil
			default:
				return nil, fmt.Errorf("unknown probe key: %s", key)
			}
		},
		OnChooseKey: func(suggestions []enc.Name) int {
			return 0 // choose the first key
		},
		OnKeyChosen: func(keyName enc.Name) error {
			fmt.Fprintf(os.Stderr, "Certifying key: %s\n", keyName)
			return nil
		},
	})
	if err != nil {
		return err
	}

	// Store the certificate and the signer key
	if err = a.keychain.InsertKey(certRes.Signer); err != nil {
		return err
	}
	if err = a.keychain.InsertCert(certRes.CertWire.Join()); err != nil {
		return err
	}

	return nil
}
