module dom;

pragma(LDC_no_moduleinfo);
import types;
import api;

public import api : createElement, appendChild, log, getRoot, innerText;

uint toPtrSize(string s) {
  return ((cast(uint)s.ptr) & 0xFFFF) << 16 | (cast(uint)s.length & 0xFFFF);
}

void setAttribute(JsHandle node, string attr, string val) {
  api.setAttribute(node, attr.toPtrSize, val.toPtrSize);
}

// void innerText(JsHandle nodePtr, string attr) {
//   api.innerText(nodePtr, attr.toPtrSize);
// }

void onClick(JsHandle node, uint callback, uint contextHandle) {
  api.onClick(node, callback, contextHandle);
}
