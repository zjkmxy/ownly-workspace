//go:generate gondn_tlv_gen
package tlv

type Message struct {
	//+field:struct:ChatMessage
	Chat *ChatMessage `tlv:"0xC8"`
}

type ChatMessage struct {
	//+field:binary
	Message []byte `tlv:"0x4B0"`
}
