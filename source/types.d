module types;

pragma(LDC_no_moduleinfo);
alias Handle = uint;
alias JsHandle = uint;
alias EventHandle = uint;

enum NodeType {
  div = 0,
  button = 1
}

enum EventType {
  click = 0
}
