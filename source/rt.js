import recycler from './node-recycler.js';

export const nodes = { 0: null };
let lastPtr = 0;

const addPtr = (node) => {
    if (node === null) return 0;
    if (node.wasmId !== undefined) return node.asmDomPtr;
    nodes[++lastPtr] = node;
    node.wasmId = lastPtr;
    return lastPtr;
};

function getTagFromType(type) {
    switch(type) {
    case 0: return "a";
    case 1: return "abbr";
    case 2: return "address";
    case 3: return "area";
    case 4: return "article";
    case 5: return "aside";
    case 6: return "audio";
    case 7: return "b";
    case 8: return "base";
    case 9: return "bdi";
    case 10: return "bdo";
    case 11: return "blockquote";
    case 12: return "body";
    case 13: return "br";
    case 14: return "button";
    case 15: return "canvas";
    case 16: return "caption";
    case 17: return "cite";
    case 18: return "code";
    case 19: return "col";
    case 20: return "colgroup";
    case 21: return "data";
    case 22: return "datalist";
    case 23: return "dd";
    case 24: return "del";
    case 25: return "dfn";
    case 26: return "div";
    case 27: return "dl";
    case 28: return "dt";
    case 29: return "em";
    case 30: return "embed";
    case 31: return "fieldset";
    case 32: return "figcaption";
    case 33: return "figure";
    case 34: return "footer";
    case 35: return "form";
    case 36: return "h1";
    case 37: return "h2";
    case 38: return "h3";
    case 39: return "h4";
    case 40: return "h5";
    case 41: return "h6";
    case 42: return "head";
    case 43: return "header";
    case 44: return "hr";
    case 45: return "html";
    case 46: return "i";
    case 47: return "iframe";
    case 48: return "img";
    case 49: return "input";
    case 50: return "ins";
    case 51: return "kbd";
    case 52: return "keygen";
    case 53: return "label";
    case 54: return "legend";
    case 55: return "li";
    case 56: return "link";
    case 57: return "main";
    case 58: return "map";
    case 59: return "mark";
    case 60: return "meta";
    case 61: return "meter";
    case 62: return "nav";
    case 63: return "noscript";
    case 64: return "object";
    case 65: return "ol";
    case 66: return "optgroup";
    case 67: return "option";
    case 68: return "output";
    case 69: return "p";
    case 70: return "param";
    case 71: return "pre";
    case 72: return "progress";
    case 73: return "q";
    case 74: return "rb";
    case 75: return "rp";
    case 76: return "rt";
    case 77: return "rtc";
    case 78: return "ruby";
    case 79: return "s";
    case 80: return "samp";
    case 81: return "script";
    case 82: return "section";
    case 83: return "select";
    case 84: return "small";
    case 85: return "source";
    case 86: return "span";
    case 87: return "strong";
    case 88: return "style";
    case 89: return "sub";
    case 90: return "sup";
    case 91: return "table";
    case 92: return "tbody";
    case 93: return "td";
    case 94: return "template";
    case 95: return "textarea";
    case 96: return "tfoot";
    case 97: return "th";
    case 98: return "thead";
    case 99: return "time";
    case 100: return "title";
    case 101: return "tr";
    case 102: return "track";
    case 103: return "u";
    case 104: return "ul";
    case 105: return "var";
    case 106: return "video";
    case 107: return "wbr";
    default: throw new Error("Invalid tag type");
    }
}

let memory;
const utf8Decoder = new TextDecoder('utf-8');
let exports;
const utf8Encoder = new TextEncoder();

function decodeStr(u8ptr) {
    const len = Module.HEAP32[u8ptr / 4];
    const offset = Module.HEAP32[(u8ptr / 4)+1];
    return utf8Decoder.decode(new DataView(Module.buffer,offset,len));
}

function encodeStrIn(u8ptr, str) {
    const encodedString = utf8Encoder.encode(str);
    const buffer = Module.asm._allocString(encodedString.length);
    const asBytes = new Uint8Array(Module.buffer, buffer, encodedString.length);
    Module.HEAP32[u8ptr / 4] = encodedString.length;
    Module.HEAP32[(u8ptr / 4)+1] = buffer;
    asBytes.set(encodedString);
    return u8ptr;
}

const domApi = {
    currentEvent: null,
    addPtr: addPtr,
    nodes: nodes,
    log(val) {
        console.log(val);
    },
    init(root,obj) {
        memory = obj.instance.exports.memory;
        exports = obj.instance.exports;
        return addPtr(root);
    },
    'addNode'(node) {
        addPtr(node.parentNode);
        addPtr(node.nextSibling);
        return addPtr(node);
    },
    addRoot(root) {
        return addPtr(root);
    },
    'createElement'(type) {
        return addPtr(recycler.create(getTagFromType(type)));
    },
    'createElementNS'(namespaceURI, qualifiedName) {
        return addPtr(recycler.createNS(qualifiedName, namespaceURI));
    },
    'createTextNode'(text) {
        return addPtr(recycler.createText(text));
    },
    'createComment'(text) {
        return addPtr(recycler.createComment(text));
    },
    'createDocumentFragment'() {
        return addPtr(document.createDocumentFragment());
    },
    'insertBefore'(parentNodePtr, newNodePtr, referenceNodePtr) {
        nodes[parentNodePtr].insertBefore(
            nodes[newNodePtr],
            nodes[referenceNodePtr],
        );
    },
    'removeChild'(childPtr) {
        const node = nodes[childPtr];
        if (node === null || node === undefined) return;
        const parent = node.parentNode;
        if (parent !== null) parent.removeChild(node);
        recycler.collect(node);
    },
    'removeAttribute'(nodePtr, attr) {
        nodes[nodePtr].removeAttribute(attr);
    },
    innerText(nodePtr, textRaw) {
        nodes[nodePtr].innerText = decodeStr(textRaw);
    },
    'setAttribute'(nodePtr, attrRaw, valueRaw) {
        // xChar = 120
        // colonChar = 58
        const attr = decodeStr(attrRaw);
        const value = decodeStr(valueRaw);
        if (attr.charCodeAt(0) !== 120) {
            nodes[nodePtr].setAttribute(attr, value);
        } else if (attr.charCodeAt(3) === 58) {
            // Assume xml namespace
            nodes[nodePtr].setAttributeNS('http://www.w3.org/XML/1998/namespace', attr, value);
        } else if (attr.charCodeAt(5) === 58) {
            // Assume xlink namespace
            nodes[nodePtr].setAttributeNS('http://www.w3.org/1999/xlink', attr, value);
        } else {
            nodes[nodePtr].setAttribute(attr, value);
        }
    },
    // eslint-disable-next-line
    'parentNode': (nodePtr) => {
        const node = nodes[nodePtr];
        return (
            node !== null && node !== undefined &&
                node.parentNode !== null
        ) ? node.parentNode.asmDomPtr : 0;
    },
    // eslint-disable-next-line
    'nextSibling': (nodePtr) => {
        const node = nodes[nodePtr];
        return (
            node !== null && node !== undefined &&
                node.nextSibling !== null
        ) ? node.nextSibling.asmDomPtr : 0;
    },
    'setNodeValue': (nodePtr, text) => {
        nodes[nodePtr].nodeValue = text;
    },
    getEventString: (type) => {
        switch (type) {
        case 0: return 'click';
        case 1: return 'change';
        case 2: return 'input';
        case 3: return 'keydown';
        }
    },
    eventHandler: (event) => {
        console.log(event);
        const id = event.target.wasmId;
        const ctx = event.target.wasmEvents[event.type];
        domApi.currentEvent = event;
        console.log("Event", id, ctx.ctx, ctx.fun, ctx.eventType);
        Module.asm._event(id, ctx.ctx, ctx.fun, ctx.eventType);
        domApi.currentEvent = null;
    }
};
var Module = typeof Module !== "undefined" ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
 if (Module.hasOwnProperty(key)) {
  moduleOverrides[key] = Module[key];
 }
}
Module["arguments"] = [];
Module["thisProgram"] = "./this.program";
Module["quit"] = (function(status, toThrow) {
 throw toThrow;
});
Module["preRun"] = [];
Module["postRun"] = [];
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
if (Module["ENVIRONMENT"]) {
 if (Module["ENVIRONMENT"] === "WEB") {
  ENVIRONMENT_IS_WEB = true;
 } else if (Module["ENVIRONMENT"] === "WORKER") {
  ENVIRONMENT_IS_WORKER = true;
 } else if (Module["ENVIRONMENT"] === "NODE") {
  ENVIRONMENT_IS_NODE = true;
 } else if (Module["ENVIRONMENT"] === "SHELL") {
  ENVIRONMENT_IS_SHELL = true;
 } else {
  throw new Error("Module['ENVIRONMENT'] value is not valid. must be one of: WEB|WORKER|NODE|SHELL.");
 }
} else {
 ENVIRONMENT_IS_WEB = typeof window === "object";
 ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
 ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
 ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
}
if (ENVIRONMENT_IS_NODE) {
 var nodeFS;
 var nodePath;
 Module["read"] = function shell_read(filename, binary) {
  var ret;
  if (!nodeFS) nodeFS = require("fs");
  if (!nodePath) nodePath = require("path");
  filename = nodePath["normalize"](filename);
  ret = nodeFS["readFileSync"](filename);
  return binary ? ret : ret.toString();
 };
 Module["readBinary"] = function readBinary(filename) {
  var ret = Module["read"](filename, true);
  if (!ret.buffer) {
   ret = new Uint8Array(ret);
  }
  assert(ret.buffer);
  return ret;
 };
 if (process["argv"].length > 1) {
  Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
 }
 Module["arguments"] = process["argv"].slice(2);
 if (typeof module !== "undefined") {
  module["exports"] = Module;
 }
 process["on"]("uncaughtException", (function(ex) {
  if (!(ex instanceof ExitStatus)) {
   throw ex;
  }
 }));
 process["on"]("unhandledRejection", (function(reason, p) {
  process["exit"](1);
 }));
 Module["inspect"] = (function() {
  return "[Emscripten Module object]";
 });
} else if (ENVIRONMENT_IS_SHELL) {
 if (typeof read != "undefined") {
  Module["read"] = function shell_read(f) {
   return read(f);
  };
 }
 Module["readBinary"] = function readBinary(f) {
  var data;
  if (typeof readbuffer === "function") {
   return new Uint8Array(readbuffer(f));
  }
  data = read(f, "binary");
  assert(typeof data === "object");
  return data;
 };
 if (typeof scriptArgs != "undefined") {
  Module["arguments"] = scriptArgs;
 } else if (typeof arguments != "undefined") {
  Module["arguments"] = arguments;
 }
 if (typeof quit === "function") {
  Module["quit"] = (function(status, toThrow) {
   quit(status);
  });
 }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 Module["read"] = function shell_read(url) {
  var xhr = new XMLHttpRequest;
  xhr.open("GET", url, false);
  xhr.send(null);
  return xhr.responseText;
 };
 if (ENVIRONMENT_IS_WORKER) {
  Module["readBinary"] = function readBinary(url) {
   var xhr = new XMLHttpRequest;
   xhr.open("GET", url, false);
   xhr.responseType = "arraybuffer";
   xhr.send(null);
   return new Uint8Array(xhr.response);
  };
 }
 Module["readAsync"] = function readAsync(url, onload, onerror) {
  var xhr = new XMLHttpRequest;
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function xhr_onload() {
   if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
    onload(xhr.response);
    return;
   }
   onerror();
  };
  xhr.onerror = onerror;
  xhr.send(null);
 };
 Module["setWindowTitle"] = (function(title) {
  document.title = title;
 });
}
Module["print"] = typeof console !== "undefined" ? console.log.bind(console) : typeof print !== "undefined" ? print : null;
Module["printErr"] = typeof printErr !== "undefined" ? printErr : typeof console !== "undefined" && console.warn.bind(console) || Module["print"];
Module.print = Module["print"];
Module.printErr = Module["printErr"];
for (key in moduleOverrides) {
 if (moduleOverrides.hasOwnProperty(key)) {
  Module[key] = moduleOverrides[key];
 }
}
moduleOverrides = undefined;
var STACK_ALIGN = 16;
function staticAlloc(size) {
 assert(!staticSealed);
 var ret = STATICTOP;
 STATICTOP = STATICTOP + size + 15 & -16;
 return ret;
}
function alignMemory(size, factor) {
 if (!factor) factor = STACK_ALIGN;
 var ret = size = Math.ceil(size / factor) * factor;
 return ret;
}
var functionPointers = new Array(0);
var GLOBAL_BASE = 1024;
var ABORT = 0;
var EXITSTATUS = 0;
function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed: " + text);
 }
}
function Pointer_stringify(ptr, length) {
 if (length === 0 || !ptr) return "";
 var hasUtf = 0;
 var t;
 var i = 0;
 while (1) {
  t = HEAPU8[ptr + i >> 0];
  hasUtf |= t;
  if (t == 0 && !length) break;
  i++;
  if (length && i == length) break;
 }
 if (!length) length = i;
 var ret = "";
 if (hasUtf < 128) {
  var MAX_CHUNK = 1024;
  var curr;
  while (length > 0) {
   curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
   ret = ret ? ret + curr : curr;
   ptr += MAX_CHUNK;
   length -= MAX_CHUNK;
  }
  return ret;
 }
 return UTF8ToString(ptr);
}
var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
function UTF8ArrayToString(u8Array, idx) {
 var endPtr = idx;
 while (u8Array[endPtr]) ++endPtr;
 if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
  return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
 } else {
  var u0, u1, u2, u3, u4, u5;
  var str = "";
  while (1) {
   u0 = u8Array[idx++];
   if (!u0) return str;
   if (!(u0 & 128)) {
    str += String.fromCharCode(u0);
    continue;
   }
   u1 = u8Array[idx++] & 63;
   if ((u0 & 224) == 192) {
    str += String.fromCharCode((u0 & 31) << 6 | u1);
    continue;
   }
   u2 = u8Array[idx++] & 63;
   if ((u0 & 240) == 224) {
    u0 = (u0 & 15) << 12 | u1 << 6 | u2;
   } else {
    u3 = u8Array[idx++] & 63;
    if ((u0 & 248) == 240) {
     u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3;
    } else {
     u4 = u8Array[idx++] & 63;
     if ((u0 & 252) == 248) {
      u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4;
     } else {
      u5 = u8Array[idx++] & 63;
      u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5;
     }
    }
   }
   if (u0 < 65536) {
    str += String.fromCharCode(u0);
   } else {
    var ch = u0 - 65536;
    str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
   }
  }
 }
}
function UTF8ToString(ptr) {
 return UTF8ArrayToString(HEAPU8, ptr);
}
var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;
var WASM_PAGE_SIZE = 65536;
var ASMJS_PAGE_SIZE = 16777216;
function alignUp(x, multiple) {
 if (x % multiple > 0) {
  x += multiple - x % multiple;
 }
 return x;
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateGlobalBuffer(buf) {
 Module["buffer"] = buffer = buf;
}
function updateGlobalBufferViews() {
 Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
 Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
 Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer);
}
var STATIC_BASE, STATICTOP, staticSealed;
var STACK_BASE, STACKTOP, STACK_MAX;
var DYNAMIC_BASE, DYNAMICTOP_PTR;
STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
staticSealed = false;
function abortOnCannotGrowMemory() {
 abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ");
}
function enlargeMemory() {
 abortOnCannotGrowMemory();
}
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
if (Module["buffer"]) {
 buffer = Module["buffer"];
} else {
 if (typeof WebAssembly === "object" && typeof WebAssembly.Memory === "function") {
  Module["wasmMemory"] = new WebAssembly.Memory({
   "initial": TOTAL_MEMORY / WASM_PAGE_SIZE,
   "maximum": TOTAL_MEMORY / WASM_PAGE_SIZE
  });
  buffer = Module["wasmMemory"].buffer;
 } else {
  buffer = new ArrayBuffer(TOTAL_MEMORY);
 }
 Module["buffer"] = buffer;
}
updateGlobalBufferViews();
function getTotalMemory() {
 return TOTAL_MEMORY;
}
HEAP32[0] = 1668509029;
HEAP16[1] = 25459;
if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99) throw "Runtime error: expected the system to be little-endian!";
function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  var callback = callbacks.shift();
  if (typeof callback == "function") {
   callback();
   continue;
  }
  var func = callback.func;
  if (typeof func === "number") {
   if (callback.arg === undefined) {
    Module["dynCall_v"](func);
   } else {
    Module["dynCall_vi"](func, callback.arg);
   }
  } else {
   func(callback.arg === undefined ? null : callback.arg);
  }
 }
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}
function ensureInitRuntime() {
 if (runtimeInitialized) return;
 runtimeInitialized = true;
 callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
 callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
 callRuntimeCallbacks(__ATEXIT__);
 runtimeExited = true;
}
function postRun() {
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}
function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_round = Math.round;
var Math_min = Math.min;
var Math_max = Math.max;
var Math_clz32 = Math.clz32;
var Math_trunc = Math.trunc;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}
function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
var dataURIPrefix = "data:application/octet-stream;base64,";
function isDataURI(filename) {
 return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0;
}
function integrateWasmJS() {
 var wasmTextFile = "app.tmp.wast";
 var wasmBinaryFile = "app.tmp.wasm";
 var asmjsCodeFile = "app.tmp.temp.asm.js";
 if (typeof Module["locateFile"] === "function") {
  if (!isDataURI(wasmTextFile)) {
   wasmTextFile = Module["locateFile"](wasmTextFile);
  }
  if (!isDataURI(wasmBinaryFile)) {
   wasmBinaryFile = Module["locateFile"](wasmBinaryFile);
  }
  if (!isDataURI(asmjsCodeFile)) {
   asmjsCodeFile = Module["locateFile"](asmjsCodeFile);
  }
 }
 var wasmPageSize = 64 * 1024;
 var info = {
  "global": null,
  "env": null,
  "asm2wasm": {
   "f64-rem": (function(x, y) {
    return x % y;
   }),
   "debugger": (function() {
    debugger;
   })
  },
  "parent": Module
 };
 var exports = null;
 function mergeMemory(newBuffer) {
  var oldBuffer = Module["buffer"];
  if (newBuffer.byteLength < oldBuffer.byteLength) {
   Module["printErr"]("the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here");
  }
  var oldView = new Int8Array(oldBuffer);
  var newView = new Int8Array(newBuffer);
  newView.set(oldView);
  updateGlobalBuffer(newBuffer);
  updateGlobalBufferViews();
 }
 function fixImports(imports) {
  return imports;
 }
 function getBinary() {
  try {
   if (Module["wasmBinary"]) {
    return new Uint8Array(Module["wasmBinary"]);
   }
   if (Module["readBinary"]) {
    return Module["readBinary"](wasmBinaryFile);
   } else {
    throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
   }
  } catch (err) {
   abort(err);
  }
 }
 function getBinaryPromise() {
  if (!Module["wasmBinary"] && (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) && typeof fetch === "function") {
   return fetch(wasmBinaryFile, {
    credentials: "same-origin"
   }).then((function(response) {
    if (!response["ok"]) {
     throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
    }
    return response["arrayBuffer"]();
   })).catch((function() {
    return getBinary();
   }));
  }
  return new Promise((function(resolve, reject) {
   resolve(getBinary());
  }));
 }
 function doNativeWasm(global, env, providedBuffer) {
  if (typeof WebAssembly !== "object") {
   Module["printErr"]("no native wasm support detected");
   return false;
  }
  if (!(Module["wasmMemory"] instanceof WebAssembly.Memory)) {
   Module["printErr"]("no native wasm Memory in use");
   return false;
  }
  env["memory"] = Module["wasmMemory"];
  info["global"] = {
   "NaN": NaN,
   "Infinity": Infinity
  };
  info["global.Math"] = Math;
  info["env"] = env;
  function receiveInstance(instance, module) {
   exports = instance.exports;
   if (exports.memory) mergeMemory(exports.memory);
   Module["asm"] = exports;
   Module["usingWasm"] = true;
   removeRunDependency("wasm-instantiate");
  }
  addRunDependency("wasm-instantiate");
  if (Module["instantiateWasm"]) {
   try {
    return Module["instantiateWasm"](info, receiveInstance);
   } catch (e) {
    Module["printErr"]("Module.instantiateWasm callback failed with error: " + e);
    return false;
   }
  }
  function receiveInstantiatedSource(output) {
   receiveInstance(output["instance"], output["module"]);
  }
  function instantiateArrayBuffer(receiver) {
   getBinaryPromise().then((function(binary) {
    return WebAssembly.instantiate(binary, info);
   })).then(receiver).catch((function(reason) {
    Module["printErr"]("failed to asynchronously prepare wasm: " + reason);
    abort(reason);
   }));
  }
  if (!Module["wasmBinary"] && typeof WebAssembly.instantiateStreaming === "function" && !isDataURI(wasmBinaryFile) && typeof fetch === "function") {
   WebAssembly.instantiateStreaming(fetch(wasmBinaryFile, {
    credentials: "same-origin"
   }), info).then(receiveInstantiatedSource).catch((function(reason) {
    Module["printErr"]("wasm streaming compile failed: " + reason);
    Module["printErr"]("falling back to ArrayBuffer instantiation");
    instantiateArrayBuffer(receiveInstantiatedSource);
   }));
  } else {
   instantiateArrayBuffer(receiveInstantiatedSource);
  }
  return {};
 }
 Module["asmPreload"] = Module["asm"];
 var asmjsReallocBuffer = Module["reallocBuffer"];
 var wasmReallocBuffer = (function(size) {
  var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
  size = alignUp(size, PAGE_MULTIPLE);
  var old = Module["buffer"];
  var oldSize = old.byteLength;
  if (Module["usingWasm"]) {
   try {
    var result = Module["wasmMemory"].grow((size - oldSize) / wasmPageSize);
    if (result !== (-1 | 0)) {
     return Module["buffer"] = Module["wasmMemory"].buffer;
    } else {
     return null;
    }
   } catch (e) {
    return null;
   }
  }
 });
 Module["reallocBuffer"] = (function(size) {
  if (finalMethod === "asmjs") {
   return asmjsReallocBuffer(size);
  } else {
   return wasmReallocBuffer(size);
  }
 });
 var finalMethod = "";
 Module["asm"] = (function(global, env, providedBuffer) {
  env = fixImports(env);
  if (!env["table"]) {
   var TABLE_SIZE = Module["wasmTableSize"];
   if (TABLE_SIZE === undefined) TABLE_SIZE = 1024;
   var MAX_TABLE_SIZE = Module["wasmMaxTableSize"];
   if (typeof WebAssembly === "object" && typeof WebAssembly.Table === "function") {
    if (MAX_TABLE_SIZE !== undefined) {
     env["table"] = new WebAssembly.Table({
      "initial": TABLE_SIZE,
      "maximum": MAX_TABLE_SIZE,
      "element": "anyfunc"
     });
    } else {
     env["table"] = new WebAssembly.Table({
      "initial": TABLE_SIZE,
      element: "anyfunc"
     });
    }
   } else {
    env["table"] = new Array(TABLE_SIZE);
   }
   Module["wasmTable"] = env["table"];
  }
  if (!env["memoryBase"]) {
   env["memoryBase"] = Module["STATIC_BASE"];
  }
  if (!env["tableBase"]) {
   env["tableBase"] = 0;
  }
  var exports;
  exports = doNativeWasm(global, env, providedBuffer);
  if (!exports) abort("no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods");
  return exports;
 });
}
integrateWasmJS();
STATIC_BASE = GLOBAL_BASE;
STATICTOP = STATIC_BASE + 38384;
__ATINIT__.push({
 func: (function() {
  __D4core5bitop16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core10checkedint16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core9exception16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core8internal12parseoptions16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core8internal6string16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core8internal6traits16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4math16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core6memory16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc5ctype16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc6signal16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc6stdarg16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc6stdint16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc6string16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc6wchar_16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core6vararg16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3ldc9arrayinit16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3ldc10attributes16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std9algorithm10comparison16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std9algorithm8internal16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std9algorithm9iteration16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std9algorithm8mutation16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std9algorithm16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std9algorithm9searching16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std9algorithm6setops16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std9algorithm7sorting16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std5array16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std8bitmanip16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std4conv16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std9exception16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std6format16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std10functional16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std8internal14unicode_tables16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std4meta16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std5range10interfaces16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std5range16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std5range10primitives16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std6string16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std6traits16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std8typecons16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std3uni16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std3utf16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc6config16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc4fenv16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc4math16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc6stddef16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc5stdio16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc6stdlib16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4core4stdc4time16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D9dscripten6memory16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D9dscripten8typeinfo16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2gc6config16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2gc11gcinterface16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2gc4impl6manual2gc16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2gc5proxy16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt6config16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8lifetime16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo11ti_Acdouble16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo10ti_Acfloat16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo9ti_Acreal16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo10ti_Adouble16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo9ti_Afloat16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo5ti_Ag16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo7ti_Aint16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_Along16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_Areal16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo9ti_Ashort16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo7ti_byte16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo4ti_C16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo10ti_cdouble16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo7ti_cent16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo9ti_cfloat16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo7ti_char16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_creal16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_dchar16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo11ti_delegate16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo9ti_double16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_float16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo10ti_idouble16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo9ti_ifloat16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo6ti_int16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_ireal16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo7ti_long16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo4ti_n16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo6ti_ptr16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo7ti_real16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_short16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_ubyte16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_ucent16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo7ti_uint16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_ulong16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo9ti_ushort16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo7ti_void16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt8typeinfo8ti_wchar16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt4util9container5array16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt4util9container6common16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt4util4hash16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D2rt4util8typeinfo16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std5ascii16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std4math16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3std6system16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D4hash16__moduleinfoCtorZ();
 })
}, {
 func: (function() {
  __D3set16__moduleinfoCtorZ();
 })
});
var STATIC_BUMP = 38384;
Module["STATIC_BASE"] = STATIC_BASE;
Module["STATIC_BUMP"] = STATIC_BUMP;
STATICTOP += 16;
var SYSCALLS = {
 varargs: 0,
 get: (function(varargs) {
  SYSCALLS.varargs += 4;
  var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
  return ret;
 }),
 getStr: (function() {
  var ret = Pointer_stringify(SYSCALLS.get());
  return ret;
 }),
 get64: (function() {
  var low = SYSCALLS.get(), high = SYSCALLS.get();
  if (low >= 0) assert(high === 0); else assert(high === -1);
  return low;
 }),
 getZero: (function() {
  assert(SYSCALLS.get() === 0);
 })
};
function ___syscall140(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD(), offset_high = SYSCALLS.get(), offset_low = SYSCALLS.get(), result = SYSCALLS.get(), whence = SYSCALLS.get();
  var offset = offset_low;
  FS.llseek(stream, offset, whence);
  HEAP32[result >> 2] = stream.position;
  if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}
function ___syscall146(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.get(), iov = SYSCALLS.get(), iovcnt = SYSCALLS.get();
  var ret = 0;
  if (!___syscall146.buffers) {
   ___syscall146.buffers = [ null, [], [] ];
   ___syscall146.printChar = (function(stream, curr) {
    var buffer = ___syscall146.buffers[stream];
    assert(buffer);
    if (curr === 0 || curr === 10) {
     (stream === 1 ? Module["print"] : Module["printErr"])(UTF8ArrayToString(buffer, 0));
     buffer.length = 0;
    } else {
     buffer.push(curr);
    }
   });
  }
  for (var i = 0; i < iovcnt; i++) {
   var ptr = HEAP32[iov + i * 8 >> 2];
   var len = HEAP32[iov + (i * 8 + 4) >> 2];
   for (var j = 0; j < len; j++) {
    ___syscall146.printChar(stream, HEAPU8[ptr + j]);
   }
   ret += len;
  }
  return ret;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}
function ___syscall54(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}
function ___syscall6(which, varargs) {
 SYSCALLS.varargs = varargs;
 try {
  var stream = SYSCALLS.getStreamFromFD();
  FS.close(stream);
  return 0;
 } catch (e) {
  if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
  return -e.errno;
 }
}
function __aaEqual() {
 Module["printErr"]("missing function: _aaEqual");
 abort(-1);
}
function __aaGetHash() {
 Module["printErr"]("missing function: _aaGetHash");
 abort(-1);
}
function __d_delThrowable() {
 Module["printErr"]("missing function: _d_delThrowable");
 abort(-1);
}
function __d_dynamic_cast() {
 console.log(arguments);
}
function __d_throw_exception() {
 Module["printErr"]("missing function: _d_throw_exception");
 abort(-1);
}
function _addClass(node, classRaw) {
 nodes[node].classList.add(decodeStr(classRaw));
}
function _addCss(cssRaw) {
 var style = document.createElement("style");
 style.type = "text/css";
 style.innerHTML = decodeStr(cssRaw);
 document.getElementsByTagName("head")[0].appendChild(style);
}
function _addEventListener(nodePtr, listenerType, ctx, fun, eventType) {
 var listenerTypeStr = domApi.getEventString(listenerType);
 var node = nodes[nodePtr];
 if (node.wasmEvents === undefined) var events = node.wasmEvents = {}; else var events = nodes[nodePtr].wasmEvents;
 events[listenerTypeStr] = {
  ctx: ctx,
  fun: fun,
  eventType: eventType
 };
 node.addEventListener(listenerTypeStr, domApi.eventHandler);
}
function _appendChild(parent, child) {
 domApi.nodes[parent].appendChild(domApi.nodes[child]);
}
function _changeClass(node, classRaw, on) {
 if (on) nodes[node].classList.add(decodeStr(classRaw)); else nodes[node].classList.remove(decodeStr(classRaw));
}
function _createElement(type) {
 return domApi.addPtr(document.createElement(getTagFromType(type)));
}
function _doLog(val) {
 console.log(val);
}
function __exit(status) {
 Module["exit"](status);
}
function _exit(status) {
 __exit(status);
}
function _getEventString(resultRaw, propRaw) {
 return encodeStrIn(resultRaw, domApi.currentEvent[decodeStr(propRaw)]);
}
function _getProperty(resultRaw, nodePtr, propRaw) {
 const node = nodes[nodePtr];
 const prop = decodeStr(propRaw);
 if (!node || node[prop] === undefined) return encodeStrIn(resultRaw, "");
 return encodeStrIn(resultRaw, node[prop]);
}
function _getRoot() {
 return addPtr(document.querySelector("#root"));
}
function _innerText(node, textRaw) {
 return domApi.innerText(node, textRaw);
}
function _llvm_trap() {
 abort("trap!");
}
function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
 return dest;
}
function _removeChild(childPtr) {
 var child = nodes[childPtr];
 child.parentNode.removeChild(child);
}
function ___setErrNo(value) {
 if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
 return value;
}
function _setAttribute(node, attrRaw, valueRaw) {
 const attr = decodeStr(attrRaw);
 const value = decodeStr(valueRaw);
 nodes[node].setAttribute(attr, value);
}
function _setProperty(nodePtr, propRaw, value) {
 const node = nodes[nodePtr];
 const prop = decodeStr(propRaw);
 if (node && node[prop] !== undefined) node[prop] = decodeStr(value);
}
function _setPropertyBool(nodePtr, propRaw, value) {
 const node = nodes[nodePtr];
 const prop = decodeStr(propRaw);
 if (node && node[prop] !== undefined) node[prop] = !!value;
}
DYNAMICTOP_PTR = staticAlloc(4);
STACK_BASE = STACKTOP = alignMemory(STATICTOP);
STACK_MAX = STACK_BASE + TOTAL_STACK;
DYNAMIC_BASE = alignMemory(STACK_MAX);
HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
staticSealed = true;
Module["wasmTableSize"] = 730;
Module["wasmMaxTableSize"] = 730;
Module.asmGlobalArg = {};
Module.asmLibraryArg = {
 "abort": abort,
 "enlargeMemory": enlargeMemory,
 "getTotalMemory": getTotalMemory,
 "abortOnCannotGrowMemory": abortOnCannotGrowMemory,
 "___setErrNo": ___setErrNo,
 "___syscall140": ___syscall140,
 "___syscall146": ___syscall146,
 "___syscall54": ___syscall54,
 "___syscall6": ___syscall6,
 "__aaEqual": __aaEqual,
 "__aaGetHash": __aaGetHash,
 "__d_delThrowable": __d_delThrowable,
 "__d_dynamic_cast": __d_dynamic_cast,
 "__d_throw_exception": __d_throw_exception,
 "_addClass": _addClass,
 "_addCss": _addCss,
 "_addEventListener": _addEventListener,
 "_appendChild": _appendChild,
 "_changeClass": _changeClass,
 "_createElement": _createElement,
 "_doLog": _doLog,
 "_emscripten_memcpy_big": _emscripten_memcpy_big,
 "_exit": _exit,
 "_getEventString": _getEventString,
 "_getProperty": _getProperty,
 "_getRoot": _getRoot,
 "_innerText": _innerText,
 "_llvm_trap": _llvm_trap,
 "_removeChild": _removeChild,
 "_setAttribute": _setAttribute,
 "_setProperty": _setProperty,
 "_setPropertyBool": _setPropertyBool,
 "DYNAMICTOP_PTR": DYNAMICTOP_PTR,
 "STACKTOP": STACKTOP
};
var asm = Module["asm"](Module.asmGlobalArg, Module.asmLibraryArg, buffer);
Module["asm"] = asm;
var __D2gc11gcinterface16__moduleinfoCtorZ = Module["__D2gc11gcinterface16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2gc11gcinterface16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2gc4impl6manual2gc16__moduleinfoCtorZ = Module["__D2gc4impl6manual2gc16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2gc4impl6manual2gc16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2gc5proxy16__moduleinfoCtorZ = Module["__D2gc5proxy16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2gc5proxy16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2gc6config16__moduleinfoCtorZ = Module["__D2gc6config16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2gc6config16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt4util4hash16__moduleinfoCtorZ = Module["__D2rt4util4hash16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt4util4hash16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt4util8typeinfo16__moduleinfoCtorZ = Module["__D2rt4util8typeinfo16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt4util8typeinfo16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt4util9container5array16__moduleinfoCtorZ = Module["__D2rt4util9container5array16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt4util9container5array16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt4util9container6common16__moduleinfoCtorZ = Module["__D2rt4util9container6common16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt4util9container6common16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt6config16__moduleinfoCtorZ = Module["__D2rt6config16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt6config16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8lifetime16__moduleinfoCtorZ = Module["__D2rt8lifetime16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8lifetime16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo10ti_Acfloat16__moduleinfoCtorZ = Module["__D2rt8typeinfo10ti_Acfloat16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo10ti_Acfloat16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo10ti_Adouble16__moduleinfoCtorZ = Module["__D2rt8typeinfo10ti_Adouble16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo10ti_Adouble16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo10ti_cdouble16__moduleinfoCtorZ = Module["__D2rt8typeinfo10ti_cdouble16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo10ti_cdouble16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo10ti_idouble16__moduleinfoCtorZ = Module["__D2rt8typeinfo10ti_idouble16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo10ti_idouble16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo11ti_Acdouble16__moduleinfoCtorZ = Module["__D2rt8typeinfo11ti_Acdouble16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo11ti_Acdouble16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo11ti_delegate16__moduleinfoCtorZ = Module["__D2rt8typeinfo11ti_delegate16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo11ti_delegate16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo4ti_C16__moduleinfoCtorZ = Module["__D2rt8typeinfo4ti_C16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo4ti_C16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo4ti_n16__moduleinfoCtorZ = Module["__D2rt8typeinfo4ti_n16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo4ti_n16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo5ti_Ag16__moduleinfoCtorZ = Module["__D2rt8typeinfo5ti_Ag16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo5ti_Ag16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo6ti_int16__moduleinfoCtorZ = Module["__D2rt8typeinfo6ti_int16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo6ti_int16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo6ti_ptr16__moduleinfoCtorZ = Module["__D2rt8typeinfo6ti_ptr16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo6ti_ptr16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo7ti_Aint16__moduleinfoCtorZ = Module["__D2rt8typeinfo7ti_Aint16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo7ti_Aint16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo7ti_byte16__moduleinfoCtorZ = Module["__D2rt8typeinfo7ti_byte16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo7ti_byte16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo7ti_cent16__moduleinfoCtorZ = Module["__D2rt8typeinfo7ti_cent16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo7ti_cent16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo7ti_char16__moduleinfoCtorZ = Module["__D2rt8typeinfo7ti_char16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo7ti_char16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo7ti_long16__moduleinfoCtorZ = Module["__D2rt8typeinfo7ti_long16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo7ti_long16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo7ti_real16__moduleinfoCtorZ = Module["__D2rt8typeinfo7ti_real16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo7ti_real16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo7ti_uint16__moduleinfoCtorZ = Module["__D2rt8typeinfo7ti_uint16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo7ti_uint16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo7ti_void16__moduleinfoCtorZ = Module["__D2rt8typeinfo7ti_void16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo7ti_void16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_Along16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_Along16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_Along16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_Areal16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_Areal16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_Areal16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_creal16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_creal16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_creal16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_dchar16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_dchar16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_dchar16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_float16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_float16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_float16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_ireal16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_ireal16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_ireal16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_short16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_short16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_short16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_ubyte16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_ubyte16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_ubyte16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_ucent16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_ucent16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_ucent16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_ulong16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_ulong16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_ulong16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo8ti_wchar16__moduleinfoCtorZ = Module["__D2rt8typeinfo8ti_wchar16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo8ti_wchar16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo9ti_Acreal16__moduleinfoCtorZ = Module["__D2rt8typeinfo9ti_Acreal16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo9ti_Acreal16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo9ti_Afloat16__moduleinfoCtorZ = Module["__D2rt8typeinfo9ti_Afloat16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo9ti_Afloat16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo9ti_Ashort16__moduleinfoCtorZ = Module["__D2rt8typeinfo9ti_Ashort16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo9ti_Ashort16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo9ti_cfloat16__moduleinfoCtorZ = Module["__D2rt8typeinfo9ti_cfloat16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo9ti_cfloat16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo9ti_double16__moduleinfoCtorZ = Module["__D2rt8typeinfo9ti_double16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo9ti_double16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo9ti_ifloat16__moduleinfoCtorZ = Module["__D2rt8typeinfo9ti_ifloat16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo9ti_ifloat16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D2rt8typeinfo9ti_ushort16__moduleinfoCtorZ = Module["__D2rt8typeinfo9ti_ushort16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D2rt8typeinfo9ti_ushort16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3ldc10attributes16__moduleinfoCtorZ = Module["__D3ldc10attributes16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3ldc10attributes16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3ldc9arrayinit16__moduleinfoCtorZ = Module["__D3ldc9arrayinit16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3ldc9arrayinit16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3set16__moduleinfoCtorZ = Module["__D3set16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3set16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std10functional16__moduleinfoCtorZ = Module["__D3std10functional16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std10functional16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std3uni16__moduleinfoCtorZ = Module["__D3std3uni16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std3uni16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std3utf16__moduleinfoCtorZ = Module["__D3std3utf16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std3utf16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std4conv16__moduleinfoCtorZ = Module["__D3std4conv16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std4conv16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std4math16__moduleinfoCtorZ = Module["__D3std4math16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std4math16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std4meta16__moduleinfoCtorZ = Module["__D3std4meta16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std4meta16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std5array16__moduleinfoCtorZ = Module["__D3std5array16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std5array16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std5ascii16__moduleinfoCtorZ = Module["__D3std5ascii16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std5ascii16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std5range10interfaces16__moduleinfoCtorZ = Module["__D3std5range10interfaces16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std5range10interfaces16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std5range10primitives16__moduleinfoCtorZ = Module["__D3std5range10primitives16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std5range10primitives16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std5range16__moduleinfoCtorZ = Module["__D3std5range16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std5range16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std6format16__moduleinfoCtorZ = Module["__D3std6format16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std6format16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std6string16__moduleinfoCtorZ = Module["__D3std6string16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std6string16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std6system16__moduleinfoCtorZ = Module["__D3std6system16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std6system16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std6traits16__moduleinfoCtorZ = Module["__D3std6traits16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std6traits16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std8bitmanip16__moduleinfoCtorZ = Module["__D3std8bitmanip16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std8bitmanip16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std8internal14unicode_tables16__moduleinfoCtorZ = Module["__D3std8internal14unicode_tables16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std8internal14unicode_tables16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std8typecons16__moduleinfoCtorZ = Module["__D3std8typecons16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std8typecons16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std9algorithm10comparison16__moduleinfoCtorZ = Module["__D3std9algorithm10comparison16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std9algorithm10comparison16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std9algorithm16__moduleinfoCtorZ = Module["__D3std9algorithm16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std9algorithm16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std9algorithm6setops16__moduleinfoCtorZ = Module["__D3std9algorithm6setops16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std9algorithm6setops16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std9algorithm7sorting16__moduleinfoCtorZ = Module["__D3std9algorithm7sorting16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std9algorithm7sorting16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std9algorithm8internal16__moduleinfoCtorZ = Module["__D3std9algorithm8internal16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std9algorithm8internal16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std9algorithm8mutation16__moduleinfoCtorZ = Module["__D3std9algorithm8mutation16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std9algorithm8mutation16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std9algorithm9iteration16__moduleinfoCtorZ = Module["__D3std9algorithm9iteration16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std9algorithm9iteration16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std9algorithm9searching16__moduleinfoCtorZ = Module["__D3std9algorithm9searching16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std9algorithm9searching16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D3std9exception16__moduleinfoCtorZ = Module["__D3std9exception16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D3std9exception16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core10checkedint16__moduleinfoCtorZ = Module["__D4core10checkedint16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core10checkedint16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4math16__moduleinfoCtorZ = Module["__D4core4math16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4math16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc4fenv16__moduleinfoCtorZ = Module["__D4core4stdc4fenv16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc4fenv16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc4math16__moduleinfoCtorZ = Module["__D4core4stdc4math16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc4math16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc4time16__moduleinfoCtorZ = Module["__D4core4stdc4time16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc4time16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc5ctype16__moduleinfoCtorZ = Module["__D4core4stdc5ctype16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc5ctype16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc5stdio16__moduleinfoCtorZ = Module["__D4core4stdc5stdio16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc5stdio16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc6config16__moduleinfoCtorZ = Module["__D4core4stdc6config16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc6config16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc6signal16__moduleinfoCtorZ = Module["__D4core4stdc6signal16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc6signal16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc6stdarg16__moduleinfoCtorZ = Module["__D4core4stdc6stdarg16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc6stdarg16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc6stddef16__moduleinfoCtorZ = Module["__D4core4stdc6stddef16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc6stddef16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc6stdint16__moduleinfoCtorZ = Module["__D4core4stdc6stdint16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc6stdint16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc6stdlib16__moduleinfoCtorZ = Module["__D4core4stdc6stdlib16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc6stdlib16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc6string16__moduleinfoCtorZ = Module["__D4core4stdc6string16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc6string16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core4stdc6wchar_16__moduleinfoCtorZ = Module["__D4core4stdc6wchar_16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core4stdc6wchar_16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core5bitop16__moduleinfoCtorZ = Module["__D4core5bitop16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core5bitop16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core6memory16__moduleinfoCtorZ = Module["__D4core6memory16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core6memory16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core6vararg16__moduleinfoCtorZ = Module["__D4core6vararg16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core6vararg16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core8internal12parseoptions16__moduleinfoCtorZ = Module["__D4core8internal12parseoptions16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core8internal12parseoptions16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core8internal6string16__moduleinfoCtorZ = Module["__D4core8internal6string16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core8internal6string16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core8internal6traits16__moduleinfoCtorZ = Module["__D4core8internal6traits16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core8internal6traits16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4core9exception16__moduleinfoCtorZ = Module["__D4core9exception16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4core9exception16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D4hash16__moduleinfoCtorZ = Module["__D4hash16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D4hash16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D9dscripten6memory16__moduleinfoCtorZ = Module["__D9dscripten6memory16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D9dscripten6memory16__moduleinfoCtorZ"].apply(null, arguments);
});
var __D9dscripten8typeinfo16__moduleinfoCtorZ = Module["__D9dscripten8typeinfo16__moduleinfoCtorZ"] = (function() {
 return Module["asm"]["__D9dscripten8typeinfo16__moduleinfoCtorZ"].apply(null, arguments);
});
var ___errno_location = Module["___errno_location"] = (function() {
 return Module["asm"]["___errno_location"].apply(null, arguments);
});
var __start = Module["__start"] = (function() {
 return Module["asm"]["__start"].apply(null, arguments);
});
var _allocString = Module["_allocString"] = (function() {
 return Module["asm"]["_allocString"].apply(null, arguments);
});
var _event = Module["_event"] = (function() {
 return Module["asm"]["_event"].apply(null, arguments);
});
var _render = Module["_render"] = (function() {
 return Module["asm"]["_render"].apply(null, arguments);
});
var dynCall_v = Module["dynCall_v"] = (function() {
 return Module["asm"]["dynCall_v"].apply(null, arguments);
});
var dynCall_vi = Module["dynCall_vi"] = (function() {
 return Module["asm"]["dynCall_vi"].apply(null, arguments);
});
Module["asm"] = asm;
function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = "Program terminated with exit(" + status + ")";
 this.status = status;
}
ExitStatus.prototype = new Error;
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
dependenciesFulfilled = function runCaller() {
 if (!Module["calledRun"]) run();
 if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
};
function run(args) {
 args = args || Module["arguments"];
 if (runDependencies > 0) {
  return;
 }
 preRun();
 if (runDependencies > 0) return;
 if (Module["calledRun"]) return;
 function doRun() {
  if (Module["calledRun"]) return;
  Module["calledRun"] = true;
  if (ABORT) return;
  ensureInitRuntime();
  preMain();
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout((function() {
   setTimeout((function() {
    Module["setStatus"]("");
   }), 1);
   doRun();
  }), 1);
 } else {
  doRun();
 }
}
Module["run"] = run;
function exit(status, implicit) {
 if (implicit && Module["noExitRuntime"] && status === 0) {
  return;
 }
 if (Module["noExitRuntime"]) {} else {
  ABORT = true;
  EXITSTATUS = status;
  STACKTOP = initialStackTop;
  exitRuntime();
  if (Module["onExit"]) Module["onExit"](status);
 }
 if (ENVIRONMENT_IS_NODE) {
  process["exit"](status);
 }
 Module["quit"](status, new ExitStatus(status));
}
Module["exit"] = exit;
function abort(what) {
 if (Module["onAbort"]) {
  Module["onAbort"](what);
 }
 if (what !== undefined) {
  Module.print(what);
  Module.printErr(what);
  what = JSON.stringify(what);
 } else {
  what = "";
 }
 ABORT = true;
 EXITSTATUS = 1;
 throw "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
}
Module["abort"] = abort;
if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}
Module["noExitRuntime"] = true;
run();



window.Module = Module;Module['postRun'].push(function(){Module.asm.__start();});
