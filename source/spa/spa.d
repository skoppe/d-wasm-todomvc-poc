module spa.spa;

pragma(LDC_no_moduleinfo);

import ldc.attributes;
import dscripten.standard;
import dscripten.memory;
public import spa.types;
public import spa.dom;
public import spa.node;
public import spa.event;
public import spa.array;
public import spa.css;

extern(C) {
  JsHandle getRoot();
  void doLog(uint val);
}

@assumeUsed
extern(C)
ubyte* allocString(uint bytes) {
  return (new ubyte[bytes]).ptr;
}

void initialize() {
  gc_init();
}

mixin template Spa(Application) {
  import ldc.attributes;
  Application application;
  @assumeUsed
  pragma(mangle, "_start")
  extern(C)
  void _start() {
    initialize();
    JsHandle root = getRoot();
    enum string css = GetCss!App;
    static if (css.length > 0)
      addCss(css);
    application.setPointers();
    spa.dom.render(root, application);
  }
}
