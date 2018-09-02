module api;

pragma(LDC_no_moduleinfo);
import types;

extern(C) { // disable D mangling
  JsHandle createElement(NodeType type);
  JsHandle getRoot();
  // JsHandle createElementNS(JsString namespaceURI, JsString qualifiedName);
  // JsHandle createTextNode(JsString text);
  // JsHandle createComment(JsString text);
  // JsHandle createDocumentFragment();
  // void insertBefore(JsHandle parentNodePtr, JsHandle newNodePtr, JsHandle referenceNodePtr);
  void removeChild(JsHandle childPtr);
  void appendChild(JsHandle parentPtr, JsHandle childPtr);
  // void removeAttribute(JsHandle nodePtr, JsString attr);
  void setAttribute(JsHandle nodePtr, string attr, string value);
  void setPropertyBool(JsHandle nodePtr, string attr, bool value);
  void innerText(JsHandle nodePtr, string text);
  void setProperty(JsHandle node, string prop, string value);
  string getProperty(JsHandle node, string prop);

  // void parentNode (JsHandle nodePtr);
  // void nextSibling (JsHandle nodePtr);
  // void setNodeValue (JsHandle nodePtr, JsString text);
  void addEventListener(JsHandle node, ListenerType type, uint ctx, uint fun, EventType type);
  void doLog(uint val);
  void addCss(string css);
  void addClass(JsHandle node, string className);
  void removeClass(JsHandle node, string className);
  void changeClass(JsHandle node, string className, bool on);
  bool getEventBool(string prop);
  uint getEventInt(string prop);
  string getEventString(string prop);
}

// TODO: figure out a way to intercept the api calls in unittests
struct BrowserBackend {
  
}
