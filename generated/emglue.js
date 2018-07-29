mergeInto(LibraryManager.library, {
    appendChild: function(parent, child) {
        return domApi.appendChild(parent,child);
    },
    getRoot: function() {
        console.log("START!");
        return addPtr(document.querySelector("#root"));
    },
    createElement: function(type) {
        return domApi.createElement(type)
    },
    innerText: function(node,textRaw) {
        return domApi.innerText(node,textRaw);
    },
    onClick: function(node, cb, ctx) {
        return domApi.onClick(node, cb, ctx);
    }
});
