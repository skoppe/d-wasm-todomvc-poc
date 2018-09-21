const recycler = {
  create(name) {
    name = name.toUpperCase();
    const list = recycler.nodes[name];
    if (list !== undefined) {
      const node = list.pop();
      if (node !== undefined) return node;
    }
    return document.createElement(name);
  },
  createNS(name, ns) {
    name = name.toUpperCase();
    const list = recycler.nodes[name + ns];
    if (list !== undefined) {
      const node = list.pop();
      if (node !== undefined) return node;
    }
    const node = document.createElementNS(ns, name);
    node.asmDomNS = ns;
    return node;
  },
  createText(text) {
    const list = recycler.nodes['#text'];
    if (list !== undefined) {
      const node = list.pop();
      if (node !== undefined) {
        node.nodeValue = text;
        return node;
      }
    }
    return document.createTextNode(text);
  },
  createComment(comment) {
    const list = recycler.nodes['#comment'];
    if (list !== undefined) {
      const node = list.pop();
      if (node !== undefined) {
        node.nodeValue = comment;
        return node;
      }
    }
    return document.createComment(comment);
  },
  collect(node) {
    // clean
    let i;

    // eslint-disable-next-line
    while (i = node.lastChild) {
      node.removeChild(i);
      recycler.collect(i);
    }
    i = node.attributes !== undefined ? node.attributes.length : 0;
    while (i--) node.removeAttribute(node.attributes[i].name);
    if (node.wasmEvents !== undefined) {
        Object.keys(node.wasmEvents).forEach((event) => {
        node.removeEventListener(event, domApi.eventHandler, false);
      });
        node.wasmEvents = undefined;
    }
    if (node.nodeValue !== null && node.nodeValue !== '') {
      node.nodeValue = '';
    }
    // collect
    let name = node.nodeName;
    if (node.asmDomNS !== undefined) name += node.namespaceURI;
    const list = recycler.nodes[name];
    if (list !== undefined) list.push(node);
    else recycler.nodes[name] = [node];
  },
  nodes: {},
};

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
        case 4: return 'dblclick';
        case 5: return 'blur';
        }
    },
    eventHandler: (event) => {
        const id = event.target.wasmId;
        const ctx = event.target.wasmEvents[event.type];
        domApi.currentEvent = event;
        Module.asm._domEvent(id, ctx.ctx, ctx.fun, ctx.eventType);
        domApi.currentEvent = null;
    }
};
