import recycler from './node-recycler.js';

export const nodes = { 0: null };
let lastPtr = 0;

const addPtr = (node) => {
    if (node === null) return 0;
    if (node.asmDomPtr !== undefined) return node.asmDomPtr;
    console.log("addPtr",node,lastPtr);
    nodes[++lastPtr] = node;
    node.asmDomPtr = lastPtr;
    return lastPtr;
};

function getTagFromType(type) {
    switch(type) {
    case 0: return "div";
    case 1: return "button";
    default: throw new Error("Invalid tag type");
    }
}

let memory;
let utfDecoder = new TextDecoder('utf-8');
let exports;

function decodeStr(raw) {
    const len = Module.HEAP32[raw / 4];
    const offset = Module.HEAP32[(raw / 4)+1];
    return utfDecoder.decode(new DataView(Module.buffer,offset,len));
}

const domApi = {
    log(val) {
        console.log(val);
    },
    init(root,obj) {
        console.log(obj)
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
    'appendChild'(parentPtr, childPtr) {
        console.log("appendChild", parentPtr, childPtr);
        nodes[parentPtr].appendChild(nodes[childPtr]);
    },
    'removeAttribute'(nodePtr, attr) {
        nodes[nodePtr].removeAttribute(attr);
    },
    innerText(nodePtr, textRaw) {
        console.log('innerText', textRaw);
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
    onClick: (nodePtr, cb, ctx) => {
        nodes[nodePtr].addEventListener('click', (event)=>{
            Module.asm._event(nodePtr, ctx, 0, 0);
        });
    }
};
