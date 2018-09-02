mergeInto(LibraryManager.library, {
    appendChild: function(parent, child) {
        domApi.nodes[parent].appendChild(domApi.nodes[child]);
    },
    addCss: function(cssRaw) {
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = decodeStr(cssRaw);
        document.getElementsByTagName('head')[0].appendChild(style);
    },
    addClass: function(node, classRaw) {
        nodes[node].classList.add(decodeStr(classRaw));
    },
    removeClass: function(node, classRaw) {
        nodes[node].classList.remove(decodeStr(classRaw));
    },
    changeClass: function(node, classRaw, on) {
        if (on)
            nodes[node].classList.add(decodeStr(classRaw));
        else
            nodes[node].classList.remove(decodeStr(classRaw));
    },
    removeChild: function(childPtr) {
        var child = nodes[childPtr];
        child.parentNode.removeChild(child);
        // TODO: we can reuse the child node (it is cheaper than recreating a new one...)
    },
    getRoot: function() {
        return addPtr(document.querySelector("#root"));
    },
    createElement: function(type) {
        return domApi.addPtr(document.createElement(getTagFromType(type)));
        // return domApi.createElement(type)
    },
    innerText: function(node,textRaw) {
        return domApi.innerText(node,textRaw);
    },
    setAttribute: function(node, attrRaw, valueRaw) {
        const attr = decodeStr(attrRaw);
        const value = decodeStr(valueRaw);
        nodes[node].setAttribute(attr, value);
    },
    addEventListener: function(nodePtr, listenerType, ctx, fun, eventType) {
        var listenerTypeStr = domApi.getEventString(listenerType);
        var node = nodes[nodePtr];
        if (node.wasmEvents === undefined)
            var events = node.wasmEvents = {};
        else
            var events = nodes[nodePtr].wasmEvents;
        events[listenerTypeStr] = {ctx: ctx, fun: fun, eventType: eventType};
        node.addEventListener(listenerTypeStr, domApi.eventHandler);
    },
    getEventBool: function(propRaw) {
        return !!domApi.currentEvent[decodeStr(propRaw)];
    },
    getEventInt: function(propRaw) {
        return 0+domApi.currentEvent[decodeStr(propRaw)];
    },
    getEventString: function(resultRaw, propRaw) {
        return encodeStrIn(resultRaw, domApi.currentEvent[decodeStr(propRaw)]);
    },
    _d_dynamic_cast: function() {
        console.log(arguments)
    },
    setPropertyBool: function(nodePtr, propRaw, value) {
        const node = nodes[nodePtr];
        const prop = decodeStr(propRaw);
        if (node && node[prop] !== undefined)
            node[prop] = !!value;
    },
    setProperty: function(nodePtr, propRaw, value) {
        const node = nodes[nodePtr];
        const prop = decodeStr(propRaw);
        if (node && node[prop] !== undefined)
            node[prop] = decodeStr(value);
    },
    getProperty: function(resultRaw, nodePtr, propRaw) {
        const node = nodes[nodePtr];
        const prop = decodeStr(propRaw);
        if (!node || node[prop] === undefined)
            return encodeStrIn(resultRaw, "");
        return encodeStrIn(resultRaw, node[prop]);
    },
    doLog: function(val) {
        console.log(val);
    }
});
