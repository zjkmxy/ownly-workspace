//go:build js && wasm

package utils

import "syscall/js"

func AsyncFunc(f func(this js.Value, p []js.Value) (any, error)) js.Func {
	return js.FuncOf(func(this js.Value, p []js.Value) interface{} {
		promise, resolve, reject := Promise()
		go func() {
			ret, err := f(this, p)
			if err != nil {
				reject(err.Error())
			} else {
				resolve(ret)
			}
		}()
		return promise
	})
}

func Promise() (promise js.Value, resolve func(args ...any), reject func(args ...any)) {
	var jsResolve, jsReject js.Value
	return js.Global().Get("Promise").New(js.FuncOf(func(this js.Value, args []js.Value) any {
			jsResolve = args[0]
			jsReject = args[1]
			return nil
		})), func(args ...any) {
			jsResolve.Invoke(args...)
		}, func(args ...any) {
			jsReject.Invoke(args...)
		}
}
