pragma(LDC_no_moduleinfo);

import types;
import dom;
import dscripten.standard;
import dscripten.memory;
import std.array : Appender;
import std.format : formattedWrite;

Appender!(char[]) app;
__gshared int counter = 1;

extern(C):

import ldc.attributes;

@assumeUsed
void render(JsHandle root) {
  auto button = createElement(NodeType.button);
  root.appendChild(button);
  button.innerText("clickMe");
  button.onClick(1,2);
}

@assumeUsed
void event(JsHandle node, uint context, EventType type, EventHandle event) {
  app.shrinkTo(0);
  formattedWrite(app, "clickMe %d", ++counter);
  node.innerText(cast(string)app.data);
}

@assumeUsed
void _start() {
  gc_init();
  render(getRoot());
}
