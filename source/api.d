module api;

pragma(LDC_no_moduleinfo);
import types;

extern(C): // disable D mangling

// addNode is called from D when js calls toVNode, useful for root element
// JsHandle addNode(JsObject node);
JsHandle createElement(NodeType type);
JsHandle getRoot();
// JsHandle createElementNS(JsString namespaceURI, JsString qualifiedName);
// JsHandle createTextNode(JsString text);
// JsHandle createComment(JsString text);
// JsHandle createDocumentFragment();
// void insertBefore(JsHandle parentNodePtr, JsHandle newNodePtr, JsHandle referenceNodePtr);
// void removeChild(JsHandle childPtr);
void appendChild(JsHandle parentPtr, JsHandle childPtr);
// void removeAttribute(JsHandle nodePtr, JsString attr);
void setAttribute(JsHandle nodePtr, uint attr, uint value);
void innerText(JsHandle nodePtr, string text);
// void parentNode (JsHandle nodePtr);
// void nextSibling (JsHandle nodePtr);
// void setNodeValue (JsHandle nodePtr, JsString text);
void onClick(JsHandle node, uint callback, uint contextHandle);
void log(uint val);
