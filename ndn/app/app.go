//go:build js && wasm

package app

import (
	_ "embed"
	"encoding/base64"
	"fmt"
	"os"

	enc "github.com/named-data/ndnd/std/encoding"
	"github.com/named-data/ndnd/std/engine"
	"github.com/named-data/ndnd/std/engine/face"
	"github.com/named-data/ndnd/std/ndn"
	"github.com/named-data/ndnd/std/security/ndncert"
	spec_ndncert "github.com/named-data/ndnd/std/security/ndncert/tlv"
)

//go:embed testbed.root.cert
var testbedRootCert []byte

type App struct {
	face   face.Face
	engine ndn.Engine
}

func NewApp() *App {
	return &App{}
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

	fmt.Fprintf(os.Stderr, "Certification response: %s\n", certRes)

	return nil
}
