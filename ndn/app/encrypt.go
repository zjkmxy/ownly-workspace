//go:build js && wasm

package app

import (
	"crypto/aes"
	"crypto/ecdh"
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"time"

	spec_repo "github.com/named-data/ndnd/repo/tlv"
	enc "github.com/named-data/ndnd/std/encoding"
	"github.com/named-data/ndnd/std/log"
	"github.com/named-data/ndnd/std/ndn"
	spec "github.com/named-data/ndnd/std/ndn/spec_2022"
	"github.com/named-data/ndnd/std/types/optional"
	"github.com/pulsejet/ownly/ndn/app/tlv"
	"golang.org/x/crypto/hkdf"
)

func x25519hkdf(pk_ []byte, sk_ []byte) (sym []byte, err error) {
	pk, err := ecdh.X25519().NewPublicKey(pk_)
	if err != nil {
		return nil, err
	}
	sk, err := ecdh.X25519().NewPrivateKey(sk_)
	if err != nil {
		return nil, err
	}
	ss, err := sk.ECDH(pk)
	if err != nil {
		return nil, err
	}

	symReader := hkdf.New(sha256.New, ss, nil, nil)
	sym = make([]byte, 16) // AES-128
	if _, err := symReader.Read(sym); err != nil {
		return nil, err
	}

	return sym, nil
}

func (a *App) processDskRequest(client ndn.Client, group enc.Name, pub []byte, dsk []byte) enc.Wire {
	if len(dsk) != 32 || len(pub) > 64 {
		// We are not capable of answering DSK requests
		return nil
	}

	sk, err := ecdh.X25519().GenerateKey(rand.Reader)
	if err != nil {
		log.Error(a, "Failed to generate DSK response key", "err", err)
		return nil
	}
	sym, err := x25519hkdf(pub, sk.Bytes())
	if err != nil {
		log.Error(a, "Failed to compute DSK response sym key", "err", err)
		return nil
	}

	cipher, err := aes.NewCipher(sym)
	if err != nil {
		log.Error(a, "Failed to create AES cipher", "err", err)
		return nil
	}

	// Encrypt the DSK, should be multiple of block size
	ciphertext := make([]byte, len(dsk))
	for i := 0; i < len(dsk); i += cipher.BlockSize() {
		cipher.Encrypt(ciphertext[i:], dsk[i:])
	}

	dskRes := &tlv.DSKResponse{
		X25519Peer: sk.PublicKey().Bytes(),
		Ciphertext: ciphertext,
	}

	// Create Data packet under the group
	name := group.
		Append(enc.NewKeywordComponent("DSK")).
		Append(enc.NewGenericBytesComponent(pub)).
		WithVersion(enc.VersionUnixMicro)

	signer := client.SuggestSigner(name)
	if signer == nil {
		log.Error(a, "Failed to suggest signer for DSK response", "name", name)
		return nil
	}

	data, err := spec.Spec{}.MakeData(name, &ndn.DataConfig{
		Freshness: optional.Some(60 * time.Second),
	}, dskRes.Encode(), signer)
	if err != nil {
		log.Error(a, "Failed to create DSK response", "err", err)
		return nil
	}
	log.Info(a, "Created DSK response", "name", name)

	repoCmd := &spec_repo.RepoCmd{
		BlobFetch: &spec_repo.BlobFetch{
			Data: [][]byte{data.Wire.Join()},
		},
	}
	return repoCmd.Encode()
}

func (a *App) fetchDsk(client ndn.Client, wksp enc.Name, priv []byte) ([]byte, error) {
	sk, err := ecdh.X25519().NewPrivateKey(priv)
	if err != nil {
		return nil, err
	}

	name := wksp.
		Append(enc.NewGenericComponent("root")).
		Append(enc.NewKeywordComponent("DSK")).
		Append(enc.NewGenericBytesComponent(sk.PublicKey().Bytes()))
	log.Info(a, "Expressing DSK request", "name", name)

	ch := make(chan ndn.ExpressCallbackArgs, 1)
	client.ExpressR(ndn.ExpressRArgs{
		Name: name,
		Config: &ndn.InterestConfig{
			CanBePrefix: true,
			MustBeFresh: true,
			Lifetime:    optional.Some(2 * time.Second),
		},
		Retries:  3,
		Callback: func(args ndn.ExpressCallbackArgs) { ch <- args },
	})
	args := <-ch

	if args.Error != nil {
		return nil, args.Error
	}
	if args.Result != ndn.InterestResultData {
		return nil, fmt.Errorf("%s", args.Result)
	}

	dskRes, err := tlv.ParseDSKResponse(enc.NewWireView(args.Data.Content()), false)
	if err != nil {
		return nil, fmt.Errorf("failed to parse DSK response: %w", err)
	}

	sym, err := x25519hkdf(dskRes.X25519Peer, priv)
	if err != nil {
		return nil, fmt.Errorf("failed to compute DSK response sym key: %w", err)
	}

	cipher, err := aes.NewCipher(sym)
	if err != nil {
		return nil, fmt.Errorf("failed to create AES cipher: %w", err)
	}

	// Decrypt the DSK, should be multiple of block size
	dsk := make([]byte, len(dskRes.Ciphertext))
	for i := 0; i < len(dskRes.Ciphertext); i += cipher.BlockSize() {
		cipher.Decrypt(dsk[i:], dskRes.Ciphertext[i:])
	}

	return dsk, nil
}
