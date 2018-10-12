# WARNING: this project is superseded by [spasm](https://github.com/skoppe/spasm)

# d-wasm-todomvc-poc

This project is an **experiment** to see if plain D structures with annotated fields and member functions are versatile enough to build frontend applications with.

The structs and annotations are used to create optimized rendering code ahead-of-time, avoiding the need for a runtime framework (e.g. a virtual-dom). This results in a speed-up in cpu and a lot less memory trashing compared to a virtual-dom.

This project was inspired by:

- [asm-dom](https://github.com/mbasso/asm-dom), a virtual dom implementation in C++ which compiles to wasm.
- [percy](https://github.com/chinedufn/percy), similar but in rust.

And could not have worked thanks to:

- [dscripten-tools](https://github.com/CyberShadow/dscripten-tools)
- [dscripten](https://github.com/Ace17/dscripten)

Muchas gracias guys!

# wip

This repo consists of a fully functional TodoMVC (see (todomvc.com)[http://todomvc.com/] for various javascript framework implementations).

Currently emscripten+binaryen is used to generate webassembly. This generates unnecessary large artifacts, but has the benefit of not having to implement several c runtime functions (e.g. malloc, memcpy, etc). One of the goals is to implement these functions in plain D and use the LDC compiler to target webassembly directly.

The toolchain can be simplified.

Memory deallocation. Currently no memory is freed.

# how it works

Each html element is mapped to a D struct. Each html attribute, property, eventlistener and children nodes are (annotated) members of that struct.

Here is an example of rendering a div node.
```d
struct App {
  mixin Node!"div";
}
mixin Spa!App;
```

The mixin ensures the app is connected to emscripten and will render it on startup.

The following example shows how to set properties on the rendered node.

```d
struct App {
  mixin Node!"div";
  @prop innerText = "Hello World!";
}
mixin Spa!App;
```

Properties can also be a result of a function.

```d
struct App {
  mixin Node!"div";
  @prop bool innerText() {
    return "Hello World!"
  };
}
mixin Spa!App;
```

Here we add a button child component.

```d
struct Button {
  mixin Node!"button";
  @prop innerText = "Click me!";
}
struct App {
  mixin Node!"div";
  @child Button button;
}
mixin Spa!App;
```

Now we add a event listener to the button.

```d
struct Button {
  mixin Node!"button";
  @prop innerText = "Click me!";
  mixin Slot!"click";
  @callback void onClick(MouseEvent event) {
    this.emit(click);
  }
}
struct App {
  mixin Node!"div";
  @child Button button;
}
mixin Spa!App;
```

The Slot mixin expands to a delegate which provides a slot for other component to register themselves in. The separation between the slot and the callback function is on purpose. It provides isolation from dom events and it simplifies event listeners on arrays (doesn't require keying).

Also, you can have multiple slots that you can trigger conditionally, e.g. on which key the user pressed. In the app.d file in the repo this is used on the input components to differentiate between escape and enter being pressed.

Here we connect the slot from the App.

```d
struct Button {
  mixin Node!"button";
  @prop innerText = "Click me!";
  mixin Slot!"click";
  @callback void onClick(MouseEvent event) {
    this.emit(click);
  }
}
struct App {
  mixin Node!"div";
  @child Button button;
  @connect!"button.click" void click() {
  }
}
mixin Spa!App;
```

The `@connect` annotation ensures the `click` function is called whenever there is an `this.emit!(click)` call in Button.

In the next example we show how to propagate properties from one component down into another.

```d
struct Button {
  mixin Node!"button";
  @prop string* innerText;
  mixin Slot!"click";
  @callback void onClick(MouseEvent event) {
    this.emit!(click);
  }
}
struct App {
  mixin Node!"div";
  @child Button button;
  string innerText = "Click Me!";
  @connect!"button.click" void click() {
    this.update!(innerText)("Clicked!");
  }
}
mixin Spa!App;
```

The result is when the button is clicked the text is changed into "Clicked!". 

We have inserted a `string innerText` field into App, and made the one in Button a pointer. During the first rendering any pointers from a struct will be assigned to their parent. This approach is chosen due to its low performance impact (just a extra pointer to store) and simplicity (no need to pass prop structs between components).

The second piece is the `update` template function, this function uses static introspection to determine exactly what to update (in this example a call to the innerText of the dom node of the button). This is almost always inlined in the resulting wasm code. Here we deviate the most from traditional virtual-dom approaches. Instead of completely rendering the App component and diffing the result, the `update` template function knows exactly what to update.

Here we show how lists are implemented.

```d
class Item {
  mixin Node!"li";
  @prop string innerText;
  this(string text) {
    this.innerText = text;
  }
}
struct Button {
  mixin Node!"button";
  @prop string innerText = "Add";
  mixin Slot!"click";
  @callback void onClick(MouseEvent event) {
    this.emit!(click);
  }
}
struct App {
  mixin Node!"div";
  @child Button button;
  @child UnorderedList!Item items;
  @connect!"button.click" void click() {
    items.put(new Item("Item"));
  }
}
mixin Spa!App;
```

We added an `UnorderedList!Item` child. This is a standard component and renders an `<ul>` node with children. Here the Item Component is converted into a class. (this is necessary because of how the callbacks mechanism works with arrays. If it were a struct the runtime has to reassign callback pointers any time the list changes, or use a second indirection layer.)

The UnorderedList uses `alias this` subtyping to expose its internal `std.array.Appender` and we have access to its underlying array, where we can add and remote items from.

Here we show how to do event listeners on arrays.

```d
class Item {
  mixin Node!"li";
  @prop string innerText;
  mixin Slot!"click";
  this(string text) {
    this.innerText = text;
  }
  @callback void onClick(MouseEvent event) {
    this.emit!(click);
  }
}
struct Button {
  mixin Node!"button";
  @prop string innerText = "Add";
  mixin Slot!"click";
  @callback void onClick(MouseEvent event) {
    this.emit!(click);
  }
}
struct App {
  mixin Node!"div";
  @child Button button;
  @child UnorderedList!Item list;
  @connect!"button.click" void click() {
    list.put(new Item("Item"));
  }
  @connect!("list.items","click") void itemClick(size_t idx) {
  }
}
mixin Spa!App;
```

In the `@connect` annotation we split the part to the underlying Appender in `UnorderedList` and the path to the slot from the Item component. Plus there is an extra argument signifying the index of the item in the array.

This is works with a simple pointer range search in the array. It introduces no memory overhead or keying.

In this example we show how we can use standard range algorithms to transform arrays.

```d
class Item {
  mixin Node!"li";
  @prop string innerText;
  mixin Slot!"click";
  @style!"active" bool active = false;
  this(string text) {
    this.innerText = text;
  }
  @callback void onClick(MouseEvent event) {
    this.emit!(click);
  }
  void toggle() {
    this.update!(active)(!active);
  }
}
struct Button {
  mixin Node!"button";
  @prop string innerText = "Add";
  mixin Slot!"click";
  @callback void onClick(MouseEvent event) {
    this.emit!(click);
  }
}
struct App {
  mixin Node!"div";
  @child Button addButton;
  @child Button toggleButton = {innerText: "Only Active"};
  @child UnorderedList!Item list;
  bool onlyActive;
  Appender!(Item[]) items;
  @connect!"toggleButton.click" void toggleClick() {
    this.update!(onlyActive)(!onlyActive);
  }
  @connect!"addButton.click" void addClick() {
    items.put(new Item("Item"));
    this.update!(items);
  }
  @connect!("list.items","click") void itemClick(size_t idx) {
    list.items.data[idx].toggle();
    this.update!(items);
  }
  auto transform(ref Appender!(Item[]) items, bool onlyActive) {
    import std.algorithm : filter;
    items.data.filter!(i=>(i.active || !onlyActive)).update(list);
  }
}
mixin Spa!App;
```

Before showing the standard range usage we had to make some adjustments and additions to the example.

In the Item Component we added an `active` bool, and we annotated this with `@style!"active"`. Whenever active is true the active style is added, and vice versa. We added a `toggle` function that toggles the `active` bool.

We reused the Button component in the App for a Toggle, using D's struct initializer to overwrite the innerText property.

We added the `onlyActive` bool and this is updated by clicking on the toggleButton.

We also added an `Appender!(Item[]) items` field. This will contain our complete list and the UnorderedList's appender will only contain the items we want.

The `itemClick` function is updated to call the items toggle function and updates the items.

Now we can discuss the `transform` function. This function does the filtering of Item's based on the value of `onlyActive` compared to the Item's `active` bool.

Anytime there is a call to the templated `update` function (e.g. in `toggleClick` and in `addClick`), besides updating what is necessary it will also call any member function which has a parameter which correspronds with the value that is being updated.

Since the transform function has the `items` and `onlyActive` as parameters, the update function will call it whenever `items` or `onlyActive` is changed.

In the `transform` function we have our normal D range programming with an `update(list)` at the end. This will make sure our `UnorderedList!Item` field will get the items from the range. Essentially the `UnorderedList!Item` acts as an Sink or OutputRange where each element of the InputRange will be placed into, it also does any necessary diffing with the dom.

There is a little caveat here. Since the transform function works by filtering on the active field of the Item, whenever the active field of an Item changes we need to call `update` on `items` again to ensure the list is updated. Therefore we needed to hoist the toggling from the Item Component into the App Component. The update function only works downwards and it cannot update parent properties.

The next example shows how we can do inline css styles.

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
  @style!"button" mixin Node!"button";
  @style!"toggle" bool toggle;
  mixin Event!"click";
  @callback void onClick(MouseEvent event) {
    this.click.emit;
  }
}
mixin Spa!App;
```

Here you see the AppStyle struct, which contains some nested structs which themselves contains properties known from css. The idea is that Component can apply any of these nested structs.

Both the App and the Button struct have a `@styleset!(AppStyle)` annotation.

The App Component has a `@style!"root"` applied to its Node mixin. This means it will get a css class set with all the css properties defined in `AppStyle.root`.

The Button Component has the `AppStyle.button` on its Node mixin, and the `AppStyle.toggle` applies to the `toggle` bool. Whenever toggle is true, the toggle class is applied and vica versa.

The css is created at compile time and injected on startup into the html page. The class names are converted to hashes based on css name + css properties. This allows use to deduplicate classes with same css content.

# building

If you wish to build this project, there are several dependencies that need to be fulfilled:

- [dscripten-tools](https://github.com/CyberShadow/dscripten-tools)
- [dscripten](https://github.com/Ace17/dscripten)
- npm

Make sure to install and get these running first.

After which a simple `make build` should suffice to compile the webassembly and a `npx webpack` to bundle the javascript.
