package app

import (
	"crypto/cipher"
	"crypto/ecdh"
	"crypto/sha256"

	"golang.org/x/crypto/hkdf"
)

func x25519HkdfSha256(pk_ []byte, sk_ []byte) (sym []byte, err error) {
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

	return hkdfSha256(ss)
}

func hkdfSha256(ss []byte) (sym []byte, err error) {
	r := hkdf.New(sha256.New, ss, nil, nil)
	sym = make([]byte, 32)
	if _, err := r.Read(sym); err != nil {
		return nil, err
	}
	return sym, nil
}

func aeadSeal(c cipher.Block, nonce []byte, plaintext []byte) ([]byte, error) {
	aead, err := cipher.NewGCM(c)
	if err != nil {
		return nil, err
	}
	return aead.Seal(nil, nonce, plaintext, nil), nil
}

func aeadOpen(c cipher.Block, nonce []byte, ciphertext []byte) ([]byte, error) {
	aead, err := cipher.NewGCM(c)
	if err != nil {
		return nil, err
	}
	return aead.Open(nil, nonce, ciphertext, nil)
}
