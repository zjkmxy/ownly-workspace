all: main.wasm

main.wasm: clean main.go
	cp $(go env GOROOT)/usr/local/go/misc/wasm/wasm_exec.js .
	GOOS=js GOARCH=wasm go build -o main.wasm
	cp main.wasm ../../public/

clean:
	rm -f main.wasm wasm_exec.js
