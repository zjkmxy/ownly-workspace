//go:generate gondn_tlv_gen
package tlv

type Message struct {
	//+field:struct:YjsDelta
	YjsDelta *YjsDelta `tlv:"0xC8"`
}

type YjsDelta struct {
	//+field:string
	UUID string `tlv:"0x478"`
	//+field:binary
	Binary []byte `tlv:"0x4B0"`
}
