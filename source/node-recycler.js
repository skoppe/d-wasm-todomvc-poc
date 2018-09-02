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

export default recycler;
