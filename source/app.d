pragma(LDC_no_moduleinfo);

import types;
import dom;
import dscripten.standard;
import dscripten.memory;
import std.array : Appender;
import std.format : formattedWrite;
import set;
import css;
import std.algorithm : joiner;
import std.conv : text;
import std.range : only;
import std.typecons : tuple;

Appender!(char[]) app;
__gshared int counter = 1;

extern(C):
import ldc.attributes;

App application;

@assumeUsed
void render(JsHandle root) {
  static string css = GetCss!App;
  addCss(css);
  root.render(application);
}

void dispatchEvent(EventType type)(JsHandle node, uint ctx, uint fun) {
  alias Event = ToEvent!type;
  static struct Handler {
    union {
      void delegate(Event) handle;
      struct {
        void* contextPtr;
        void* funcPtr;
      }
    }
  }
  Handler c;
  c.contextPtr = cast(void*)ctx;
  c.funcPtr = cast(void*)fun;
  c.handle(Event());
}

@assumeUsed
void event(JsHandle node, uint ctx, uint fun, EventType type) {
  import std.traits : AliasSeq;
  with (EventType) {
    // TODO: use enum.getMembers
    alias Types = AliasSeq!(__traits(allMembers, EventType));
    final switch (type) {
      foreach(name; Types) {
        alias Type = AliasSeq!(__traits(getMember, EventType, name))[0];
        static if (__traits(compiles, ToEvent!Type))
        case Type: return dispatchEvent!Type(node, ctx, fun);
        else
        case Type: throw new Exception("ToEvent not implemented for "~Type.stringof);
      }
    }
  }
  static struct Handler {
    union {
      void delegate() handle;
      struct {
        void* contextPtr;
        void* funcPtr;
      }
    }
  }
  Handler c;
  c.contextPtr = cast(void*)ctx;
  c.funcPtr = cast(void*)fun;
  c.handle();
}

@assumeUsed
void _start() {
  gc_init();
  render(getRoot());
}

@assumeUsed
ubyte* allocString(uint bytes) {
  return (new ubyte[bytes]).ptr;
}

string format(T...)(string fmt, T t) {
    auto start = app.data.length;
    formattedWrite(app, fmt, t);
    auto end = app.data.length;
    return cast(string)app.data[start..end];
}

auto getMemberTuple(Member, T...)(Member member) {
  import std.algorithm : joiner;
  import std.conv : text;
  import std.meta : staticMap;
  import std.range : only;
  import std.typecons : tuple;
  // TODO: this fails when s == an UFCS function...
  template addMember(alias s) { enum addMember = "member."~s; }
  alias list = staticMap!(addMember, T);
  return mixin("tuple("~list.only.joiner(",").text~")");
}

struct NodeRef {
  uint node;
  uint addr;
  int opCmp(const ref NodeRef s) const {
    return node - s.node;
  }
}


JsHandle createNode(T)(JsHandle parent, ref T t) {
  enum hasNode = hasMember!(T, "node");
  static if (hasNode) {
    static if (is(typeof(t.node) : NamedJsHandle!tag, alias tag)) {
      mixin("NodeType n = NodeType."~tag~";");
      return createElement(n);
    } else
      static assert("node field is invalid type");
  }
  return parent;
}

auto toTuple(Delegate)(Delegate d) {
  import std.typecons : tuple;
  auto ctx = cast(uint)d.ptr;
  auto func = cast(uint)d.funcptr;
  return tuple!("ctx","func")(ctx,func);
}

template getMember(alias T, string name) {
  import std.meta : AliasSeq;
  alias getMember = AliasSeq!(__traits(getMember, T, name))[0];
}

template indexOfPred(alias Pred, TList...) {
  enum indexOfPred = indexOf!(Pred, TList).index;
}

template indexOf(alias Pred, args...) {
  import std.meta : AliasSeq;
  static if (args.length > 0) {
    static if (Pred!(args[0])) {
      enum index = 0;
    } else {
      enum next  = indexOf!(Pred, AliasSeq!(args[1..$])).index;
      enum index = (next == -1) ? -1 : 1 + next;
    }
  } else {
    enum index = -1;
  }
}

void setPointerFromParent(string name, T, Ts...)(ref T t, auto ref Ts ts) {
  import std.traits : PointerTarget;
  import std.meta : AliasSeq;
  alias FieldType = PointerTarget!(typeof(getMember!(T, name)));
  template matchesField(Parent) {
    enum matchesField = hasMember!(Parent, name) && is(typeof(getMember!(Parent, name)) == FieldType);
  }
  enum index = indexOfPred!(matchesField, AliasSeq!Ts);
  __traits(getMember, t, name) = &__traits(getMember, ts[index], name);
}

auto setAttributeTyped(string name, T)(JsHandle node, auto ref T t) {
  import std.traits : isPointer;
  static if (isPointer!T)
    node.setAttributeTyped!name(*t);
  else static if (is(T == bool))
    node.setAttributeBool(name, t);
  else {
    node.setAttribute(name, t);
  }
}

auto setPropertyTyped(string name, T)(JsHandle node, auto ref T t) {
  import std.traits : isPointer;
  static if (isPointer!T) {
    node.setPropertyTyped!name(*t);
  }
  else static if (is(T == bool))
    node.setPropertyBool(name, t);
  else {
    static if (__traits(compiles, __traits(getMember, api, name)))
      __traits(getMember, api, name)(node, t);
    else
      node.setProperty(name, t);
  }
}

auto applyStyles(T, styles...)(JsHandle node) {
  static foreach(style; styles) {
    node.addClass(GetCssClassName!(T, style));
  }
}

auto addEventListenerTyped(string name, T)(JsHandle node, auto ref T t) {
  import std.traits : fullyQualifiedName, Parameters;
  import std.algorithm : findSplitAfter;
  import std.string : toLower;
  enum type = name.findSplitAfter("on")[1].toLower;
  mixin("enum listenerType = ListenerType."~type~";");
  auto delPtr = &__traits(getMember, t, name);
  enum eventType = listenerType.toEventType!T;
  alias Event = ToEvent!eventType;
  alias delParams = Parameters!(typeof(delPtr));
  static if (delParams.length != 1)
    static assert(false, "Expected 1 param of type "~Event.stringof~" in "~fullyQualifiedName!T~"."~name);
  else static if (!is(delParams[0] == Event))
    static assert(false, "Expected param 1 of type "~Event.stringof~" instead of "~delParams[0].stringof~" in "~fullyQualifiedName!T~"."~name);
  addEventListener(node, listenerType, toTuple(delPtr).expand, eventType);
}

auto assignEventListeners(T)(ref Array!T arr, ref T item) {
  alias eventPaths = extractEventPaths!(T);
  static foreach(path; eventPaths) {
    mixin("item."~only(path.expand).joiner(".").text~".add(&arr.__"~only(path.expand).joiner("_").text~");");
  }
}

auto render(T, Ts...)(JsHandle parent, auto ref T t, auto ref Ts ts) {
  import std.traits : hasUDA, getUDAs, ParameterIdentifierTuple;
  import std.typecons : AliasSeq;
  import std.meta : staticMap;
  import std.traits : isCallable, getSymbolsByUDA, isPointer;
  enum hasNode = hasMember!(T, "node");
  auto node = createNode(parent, t);
  alias StyleSet = getStyleSet!T;
  static foreach(i; __traits(allMembers, T)) {{
      alias sym = AliasSeq!(__traits(getMember, t, i))[0];
      alias styles = getStyles!(sym);
      static if (is(typeof(sym) == Prop*, Prop)) {
        setPointerFromParent!(i)(t, ts);
      }
      static if (hasUDA!(sym, child)) {
        static if (is(typeof(sym) : Appender!(Item[]), Item)) {
          alias eventPaths = extractEventPaths!(Item);
          foreach(ref item; __traits(getMember, t, i).data) {
            // TODO: we only need to pass t to a child render function when there is a child that has an alias to one of its member
            node.render(item, AliasSeq!(t, ts));
            static if (is(typeof(t) == Array!Item))
              t.assignEventListeners(item);
          }
        } else {
          // TODO: we only need to pass t to a child render function when there is a child that has an alias to one of its member
          node.render(__traits(getMember, t, i), AliasSeq!(t, ts));
        }
      } else static if (hasUDA!(sym, prop)) {
        static if (isCallable!(sym)) {
          alias params = ParameterIdentifierTuple!sym;
          auto args = getMemberTuple!(T,params)(t);
          node.setPropertyTyped!i(__traits(getMember, t, i)(args.expand));
        } else {
          node.setPropertyTyped!i(__traits(getMember, t, i));
        }
      } else static if (hasUDA!(sym, callback)) {
        node.addEventListenerTyped!i(t);
      } else static if (hasUDA!(sym, attr)) {
        static if (isCallable!(sym)) {
          alias params = ParameterIdentifierTuple!sym;
          auto args = getMemberTuple!(T,params)(t);
          node.setAttributeTyped!i(__traits(getMember, t, i)(args.expand));
        } else {
          node.setAttributeTyped!i(__traits(getMember, t, i));
        }
      } else static if (hasUDA!(sym, connect)) {
        alias connects = getUDAs!(sym, connect);
        static foreach(c; connects) {
          auto del = &__traits(getMember, t, i);
          static if (is(c: connect!(a,b), alias a, alias b)) {
            import std.array : replace;
            mixin("t."~a~"."~b.text.replace(".","_")~".add(del);");
          } else static if (is(c : connect!field, alias field)) {
            mixin("t."~field~".add(del);");
          }
        }
      }
      static if (i == "node") {
        node.applyStyles!(T, styles);
      } else static if (styles.length > 0) {
        static if (isCallable!(sym)) {
          alias params = ParameterIdentifierTuple!sym;
          auto args = getMemberTuple!(T,params)(t);
          if (__traits(getMember, t, i)(args.expand) == true) {
            node.applyStyles!(T, styles);
          }
        } else static if (is(typeof(sym) == bool)) {
          if (__traits(getMember, t, i) == true)
            node.applyStyles!(T, styles);
        }
      }
    }}
  static if (hasNode) {
    t.node.node = node;
    parent.appendChild(node);
  }
}


template among(alias field, T...) {
  static if (T.length == 0)
    enum among = false;
  else static if (T.length == 1)
    enum among = field.stringof == T[0];
  else
    enum among = among!(field,T[0..$/2]) || among!(field,T[$/2..$]);
}

template getChildren(Parent) {
  import std.traits : hasUDA;
  import std.meta : AliasSeq;
  alias members = AliasSeq!(__traits(allMembers, Parent));
  template isChild(string member) {
    static if (__traits(compiles, __traits(getMember, Parent, member)))
      enum isChild = hasUDA!(__traits(getMember, Parent, member), child);
    else
      enum isChild = false;
  }
  import std.meta : Filter;
  alias getChildren = Filter!(isChild, members);
}

template updateChildren(string field) {
  static auto updateChildren(Parent, Ts...)(auto ref Parent parent, auto ref Ts ts) {
    import std.traits : getSymbolsByUDA;
    import std.meta : ApplyLeft, staticMap;
    alias getSymbol = ApplyLeft!(getMember, parent);
    alias childrenNames = getChildren!Parent;
    alias children = staticMap!(getSymbol,childrenNames);
    static foreach(c; children) {{
      alias ChildType = typeof(c);
      static if (hasMember!(ChildType, field)) {
        __traits(getMember, parent, c.stringof).update!(__traits(getMember, __traits(getMember, parent, c.stringof), field));
      } else
        .updateChildren!(field)(__traits(getMember, parent, c.stringof));
      }}
  }
}

auto remove(T)(auto ref T t) if (hasMember!(T,"node")) {
  removeChild(t.node.node);
}


template update(alias field) {
  static auto updateDom(Parent, T)(auto ref Parent parent, T t) {
    import std.traits : hasUDA, ParameterIdentifierTuple, isCallable;
    import std.typecons : AliasSeq;
    import std.meta : staticMap;
    static if (hasUDA!(field, prop)) {
      parent.node.setPropertyTyped!(field.stringof)(t);
    } else static if (hasUDA!(field, attr)) {
      parent.node.setAttributeTyped!(field.stringof)(t);
    }
    static if (is(T == bool)) {
      alias styles = getStyles!(field);
      static foreach(style; styles) {
        static string className = GetCssClassName!(Parent, style);
        parent.node.changeClass(className,t);
      }
    }
    static foreach(i; __traits(allMembers, Parent)) {{
        alias sym = AliasSeq!(__traits(getMember, parent, i))[0];
        static if (isCallable!(sym)) {
          alias params = ParameterIdentifierTuple!sym;
          static if (among!(field, params)) {
            auto args = getMemberTuple!(Parent,params)(parent);
            static if (hasUDA!(sym, prop))
              parent.node.node.setPropertyTyped!i(__traits(getMember, parent, i)(args.expand));
            else static if (hasUDA!(sym, style)) {
              alias styles = getStyles!(sym);
              static foreach(style; styles) {
                static string className = GetCssClassName!(Parent, style);
                parent.node.node.changeClass(className,__traits(getMember, parent, i)(args.expand));
              }
            }
          }
        }
      }}
    updateChildren!(field.stringof)(parent);
  }
  static auto update(Parent)(auto ref Parent parent) {
    updateDom(parent, __traits(getMember, parent, field.stringof));
  }
  static auto update(Parent, T)(auto ref Parent parent, T t) {
    // TODO: we can avoid all if parent.field == t
    static if (is(typeof(T) : string)) {
      mixin("parent."~field~" = t;");
    } else {
      mixin("parent."~field.stringof~" = t;");
    }
    updateDom(parent, t);
  }
}

struct NamedJsHandle(string tag) {
  JsHandle node = uint.max;
  alias node this;
}

mixin template Node(string str) {
  mixin("NamedJsHandle!\""~str~"\" node;");
}

struct EventEmitter {
  void delegate() plain = null;
  void delegate(size_t) addr = null;
  void add(void delegate() del) {
    plain = del;
  }
  void add(void delegate(size_t) del) {
    addr = del;
  }
}

mixin template Event(string type) {
  mixin("@eventemitter EventEmitter "~type~";");
}

auto emit(T)(ref T t, EventEmitter emitter) {
  if (emitter.plain != null)
    emitter.plain();
  if (emitter.addr != null) {
    size_t addr = cast(size_t)(&t);
    emitter.addr(addr);
  }
}

auto emit(EventEmitter emitter, size_t addr) {
  if (emitter.plain != null)
    emitter.plain();
  if (emitter.addr != null) {
    emitter.addr(addr);
  }
}

template getName(alias sym) {
  enum getName = __traits(identifier, sym);
}

template extractEventPaths(T, Ts...) {
  import std.meta : staticMap, AliasSeq;
  import std.traits : getSymbolsByUDA;
  alias events = getSymbolsByUDA!(T, eventemitter);
  alias children = getChildren!T;
  template recur(string NextT) {
    alias recur = extractEventPaths!(typeof(__traits(getMember, T, NextT)), AliasSeq!(Ts, NextT));
  }
  template prefixNames(string Event) {
    enum prefixNames = tuple(Ts, Event);
  }
  alias eventNames = staticMap!(getName, AliasSeq!(events));
  alias prefixed = staticMap!(prefixNames, eventNames);
  alias extractEventPaths = AliasSeq!(prefixed,staticMap!(recur, getChildren!T));
}

auto getIndexInArray(T)(auto ref Array!T arr, size_t ptr) {
  import std.algorithm : countUntil;
  return arr.data.countUntil!((ref T item){
      auto baseAddr = cast(size_t)(cast(void*)item);
      enum size = __traits(classInstanceSize, T);
      return baseAddr <= ptr && (baseAddr + size) > ptr;
    });
}

mixin template ArrayItemEvents(T) {
  import std.algorithm : joiner;
  import std.range : only;
  import std.conv : text;
  static foreach(path; extractEventPaths!(T)) {
    mixin Event!(only(path.expand).joiner("_").text);
    mixin ("void __"~only(path.expand).joiner("_").text~"(size_t addr) { "~only(path.expand).joiner("_").text~".emit(this.getIndexInArray(addr));}");
  }
}

struct Array(T) {
  @child Appender!(T[]) appender;
  mixin ArrayItemEvents!T;
  alias appender this;
  void put(T t) {
    this.assignEventListeners(t);
    appender.put(t);
  }
}

struct UnorderedList(T) {
  @style!"todo-list" mixin Node!"ul";
  @child Array!(T) items;
  void put(T t) {
    items.put(t);
    node.render(items.data[$-1]);
  }
  void remove(size_t idx) {
    doLog(idx);
    .remove(items.appender.data[idx]);
    // TODO: this remove creates a problem with the callbacks which are by pointer. Now all of them are shifted and point to the wrong (or no) instance.
    // We can solve this by:
    // - rewrite the ctx and fun of each event listener
    // - keeping a offset table
    // - use classes for array items (probably easiest)
    // - keep a nodePtr to ctx/fun table around (and update that)
    import std.algorithm : remove;
    items.appender.data.remove(idx);
    items.appender.shrinkTo(items.appender.data.length - 1);
  }
}

enum FilterStyle {
  All,
  Active,
  Completed
}

struct App {
  @style!"todoapp" mixin Node!"section";
  @child Header header;
  @child Main main;
  @child Footer footer;
  int count = 0;
  FilterStyle filter = FilterStyle.All;
  @connect!"header.field.enter" void enter() {
    Item item = new Item();
    item.innerText = header.field.value;
    main.list.put(item);
    header.field.update!(header.field.value)("");
    this.update!(count)(main.list.items.data.length);
  }
  @connect!("main.list.items","view.button.click") void removeItem(size_t idx) {
    main.list.remove(idx);
  }
  @connect!"footer.filters.all.link.click" void allClick() {
    this.update!(filter)(FilterStyle.All);
  }
  @connect!"footer.filters.active.link.click" void activeClick() {
    this.update!(filter)(FilterStyle.Active);
  }
  @connect!"footer.filters.completed.link.click" void completedClick() {
    this.update!(filter)(FilterStyle.Completed);
  }
}

struct Header {
  @style!"header" mixin Node!"header";
  @child Title title;
  @child Input field;
}

struct Title {
  mixin Node!"h1";
  @prop auto innerText = "todos";
}
struct Main {
  @style!"main" mixin Node!"section";
  @child UnorderedList!Item list;
}

struct Footer {
  struct Span {
    @style!"todo-count" mixin Node!"span";
    int* count;
    @prop string innerHTML(int* count) {
      return format("<strong>%s</strong> %s left", *count, *count > 1 ? "items":"item");
    }
  }
  struct Filters {
    @style!"filters" mixin Node!"ul";
    @child Option!"All" all = {option: FilterStyle.All};
    @child Option!"Active" active = {option: FilterStyle.Active};
    @child Option!"Completed" completed = {option: FilterStyle.Completed};
  }
  struct Option(string text) {
    struct Link {
      mixin Node!"a";
      mixin Event!"click";
      @attr string href = "#";
      @prop string innerText = text;
      FilterStyle* filter;
      FilterStyle* option;
      @style!"selected" bool selected(FilterStyle* filter, FilterStyle* option) {
        // TODO: These pointers here are ugly, find a way to dereference them automatically
        return *filter == *option;
      }
      @callback void onClick(MouseEvent event) {
        this.emit(click);
      }
    }
    mixin Node!"li";
    @child Link link;
    FilterStyle option;
  }
  @style!"footer" mixin Node!"footer";
  @child Span span;
  @child Filters filters;
}

// struct ButtonStyle {
//   struct root {
//     auto margin = "10px";
//     auto backgroundColor = "white";
//     @("hover") struct Hover {
//       auto backgroundColor = "gray";
//     }
//   }
//   struct clicked {
//     auto backgroundColor = "purple";
//   }
// }

// @styleset!(ButtonStyle)
// struct Button {
//   @style!"root" mixin Node!"button";
//   @style!"clicked" bool clicked = false;
//   mixin Event!"click";
//   @prop string innerText = "clickMe";
//   @callback void onClick() {
//     this.click.emit;
//     this.update!(clicked)(!clicked);
//   }
// }

struct Input {
  @style!"new-todo" mixin Node!"input";
  mixin Event!"enter";
  mixin Event!"input";
  @prop string value;
  @attr string placeholder = "What needs to be done?";
  @callback void onKeyDown(KeyboardEvent event) {
    value = node.getProperty("value");
    if (event.key == "Enter")
      this.emit(enter);
    this.emit(input);
  }
}

class Item {
  mixin Node!"li";
  @style!"completed" bool completed;
  @style!"editing" bool editing;
  @child View view;
  string innerText;
}

struct View {
  @style!"view" mixin Node!"div";
  @child Checkbox checkbox;
  @child Label label;
  @child Button button;
}

struct InlineInput {
  @style!"edit" mixin Node!"input";
  mixin Event!"enter";
  mixin Event!"esc";
  mixin Event!"input";
  @prop string value; // TODO: somehow we need this to be the text in Item
  @callback void onKeyDown(KeyboardEvent event) {
    value = node.getProperty("value");
    if (event.key == "Enter")
      this.emit(enter);
    else if (event.key == "Esc")
      this.emit(esc);
    else
      this.emit(input);
  }
}

struct Button {
  mixin Event!"click";
  @style!"destroy" mixin Node!"button";
  @callback void onClick(MouseEvent event) {
    this.emit(click);
  }
}

struct Label {
  mixin Node!"label";
  @prop string* innerText;
}

struct Prop(alias t) {
}

struct Checkbox {
  @style!"toggle" mixin Node!"input";
  mixin Event!"toggle";
  @attr string type = "checkbox";
  @prop bool checked = false;
}

// Challanges:
// - event listeners on arrays
// - diffing arrays
// - Optional items
// - removing nodes
// - input validations
// - forms
// - deallocate memory from allocString
// - convert all attr to prop (and call proper function under the hood)

