watch: build
	fswatch -o ./source | xargs -n1 make build

# /Users/skoppe/dev/d/dscripten-tools/dmd-dscripten source/app.d source/api.d source/dom.d source/types.d --wasm -O3 -od/Users/skoppe/dev/d/wasm-dom/build/objs -ofgenerated/app -v --emcc="--js-library" --emcc="/Users/skoppe/dev/d/wasm-dom/generated/emglue.js"
# cp generated/app.wasm dist/

build: clean
	/Users/skoppe/dev/d/dscripten-tools/rdmd-dscripten --compiler=/Users/skoppe/dev/d/dscripten-tools/dmd-dscripten --wasm -O3 -od/Users/skoppe/dev/d/wasm-dom/build/objs -ofgenerated/app --emcc="--js-library" --emcc="/Users/skoppe/dev/d/wasm-dom/generated/emglue.js" source/app.d || true
	cp generated/app.tmp.wasm dist/
	cat generated/dom-api.js generated/app > source/rt.js
	echo "window.Module = Module;Module['postRun'].push(function(){Module.asm.__start();});" >> source/rt.js

clean:
# rm -rf ./build/objs && mkdir -p build/objs
