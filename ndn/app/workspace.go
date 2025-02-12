package app

import (
	"crypto/elliptic"
	"time"

	enc "github.com/named-data/ndnd/std/encoding"
	"github.com/named-data/ndnd/std/security"
	sig "github.com/named-data/ndnd/std/security/signer"
)

func (a *App) CreateWorkspace(nameStr string) (err error) {
	name, err := enc.NameFromStr(nameStr)
	if err != nil {
		return err
	}

	keyName := security.MakeKeyName(name)
	signer, err := sig.KeygenEcc(keyName, elliptic.P256())
	if err != nil {
		return err
	}
	if err = a.keychain.InsertKey(signer); err != nil {
		return err
	}

	// Create self-signed certificate trust anchor
	cert, err := security.SelfSign(security.SignCertArgs{
		Signer:    signer,
		NotBefore: time.Now().Add(-time.Hour),
		NotAfter:  time.Now().Add(time.Hour * 24 * 365 * 10), // 10 years
	})
	if err != nil {
		return err
	}
	if err = a.keychain.InsertCert(cert.Join()); err != nil {
		return err
	}

	return nil
}
