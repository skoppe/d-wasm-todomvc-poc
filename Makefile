watch: build
	fswatch -o ./source | xargs -n1 make build

build:
	# DSCRIPTEN_TOOLCHAINS=/Users/skoppe/dev/d/dscripten-toolchain /Users/skoppe/dev/d/dscripten-tools/rdmd-dscripten --compiler=/Users/skoppe/dev/d/dscripten-tools/dmd-dscripten --wasm --release -od/Users/skoppe/dev/d/wasm-dom/build/objs -ofgenerated/app -O3 --emcc="-g2" --emcc="--js-library" --emcc="source/spa/js/emglue.js" source/app.d || true
	DSCRIPTEN_TOOLCHAINS=/Users/skoppe/dev/d/dscripten-toolchain /Users/skoppe/dev/d/dscripten-tools/rdmd-dscripten --compiler=/Users/skoppe/dev/d/dscripten-tools/dmd-dscripten --wasm --release -od/Users/skoppe/dev/d/wasm-dom/build/objs -ofgenerated/app -O3 --emcc="--js-library" --emcc="source/spa/js/emglue.js" source/app.d || true
	cp generated/app.tmp.wasm dist/
	cat source/spa/js/dom-api.js generated/app > generated/rt.js
	echo "window.Module = Module;Module['postRun'].push(function(){Module.asm.__start();});" >> generated/rt.js
