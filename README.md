# wasm-dom

This project is an experiment to see if plain D structures with annotated fields are versatile enough to build frontend applications with.

The structures are used to create optimized rendering code ahead-of-time, avoiding the need for a runtime framework (e.g. a virtual-dom).

# benefits

- static typing
- generates fast applications
- battery friendly
- can move many runtime warnings/errors to compile time 

# wip

Currently emscripten is used to generate webassembly. This generates unnecessary large artifacts, but has the benefit of not having to implement several c runtime functions (e.g. malloc, memcpy, etc). One of the goals is to implement these functions in plain D and use the LDC compiler to target webassembly directly.

No easy toolchain.

# example

```d
struct AppStyle {
  struct root {
    auto margin = "10px";
  }
  struct button {
    auto backgroundColor = "white";
    @("hover") struct Hover {
      auto backgroundColor = "gray";
    }
  }
  struct toggle {
    auto backgroundColor = "purple";
  }
}

@styleset!(AppStyle)
struct App {
  @style!"root" mixin Node!"div";
  @child Button button;
  @connect("button.click") void toggle() {
    button.update!(button.toggle)(!button.toggle);
  }
}

@styleset!(AppStyle)
struct Button {
  @style("button") mixin Node!"button";
  @style("toggle") bool toggle;
  mixin Event!"click";
  @callback void onClick(MouseEvent event) {
    this.click.emit;
  }
}

App application;

@assumeUsed
void render(JsHandle root) {
  static string css = GetCss!App;
  addCss(css);
  root.render(application);
}
```

Here we define a `<div><button/></div>` complete with inline styles. Any time the button is clicked the toggle style is toggled, making the button background alternate from white -> purple.
