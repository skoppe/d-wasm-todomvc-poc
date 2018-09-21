module spa.array;

import spa.event;
import spa.node;
import spa.ct;
import spa.node;
import spa.dom;
import spa.types;
import std.range : only;
import std.algorithm : joiner;
import std.conv : text;
import std.typecons : tuple;
import std.array : Appender;

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

mixin template ArrayItemEvents(T) {
  import std.algorithm : joiner;
  import std.range : only;
  import std.conv : text;
  static foreach(path; extractEventPaths!(T)) {
    mixin Slot!(only(path.expand).joiner("_").text);
    mixin ("void __"~only(path.expand).joiner("_").text~"(size_t addr) { "~only(path.expand).joiner("_").text~".emit(this.getIndexInArray(addr));}");
  }
}

auto assignEventListeners(T)(ref Array!T arr, ref T item) {
  alias eventPaths = extractEventPaths!(T);
  static foreach(path; eventPaths) {
    mixin("item."~only(path.expand).joiner(".").text~".add(&arr.__"~only(path.expand).joiner("_").text~");");
  }
}

auto getIndexInArray(T)(auto ref Array!T arr, size_t ptr) {
  import std.algorithm : countUntil;
  return arr.data.countUntil!((ref T item){
      auto baseAddr = cast(size_t)(cast(void*)item);
      enum size = __traits(classInstanceSize, T);
      return baseAddr <= ptr && (baseAddr + size) > ptr;
    });
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

struct Updater(T) {
  private {
    T* list;
    size_t idx;
  }
  this(T* list) {
    this.list=list;
    foreach(i; list.items.data) {
      i.node.marked = true;
    }
  }
  ~this() {
    list.shrinkTo(idx);
  }
  void put(Item)(Item t) {
    scope(exit) idx++;
    t.node.marked = false;
    if (list.items.data.length > idx) {
      if (list.items.data[idx] is t) {
        return;
      }
      // TODO: here we can use replaceChild
      if (list.items.data[idx].node.marked)
        unmount(list.items.data[idx]);
      if (idx+1 < list.items.data.length) {
        if (list.items.data[idx+1] is t) {
          list.items.data[idx..$-1] = list.items.data[idx+1..$];
          return;
        } else {
          list.items.data[idx] = t;
          list.items.assignEventListeners(t);
          if (list.items.data[idx+1].node.marked)
            list.node.renderBefore(list.items.data[idx], list.items.data[idx+1].node);
          else {
            size_t off = 2;
            while (idx+off < list.items.data.length) {
              if (list.items.data[idx+off].node.marked) {
                list.node.renderBefore(list.items.data[idx], list.items.data[idx+off].node);
                return;
              }
              off+=1;
            }
            list.node.render(list.items.data[idx]);
            return;
          }
        }
      } else {
        list.items.data[idx] = t;
        list.items.assignEventListeners(t);
        list.node.render(list.items.data[idx]);
      }
    } else
      list.put(t);
  }
}

bool removeItem(T)(ref Appender!(T[]) app, size_t idx) {
  import std.algorithm : remove;
  app.data.remove(idx);
  app.shrinkTo(app.data.length - 1);
  return true;
}

bool removeItem(T)(ref Appender!(T[]) app, ref T t) {
  import std.algorithm : countUntil, remove;
  auto idx = app.data.countUntil(t);
  if (idx == -1)
    return false;
  app.data.remove(idx);
  app.shrinkTo(app.data.length - 1);
  return true;
}

struct List(T, string tag) {
  mixin Node!tag;
  @child Array!(T) items;
  void put(T t) {
    items.put(t);
    spa.dom.render(node,items.data[$-1]);
  }
  void shrinkTo(size_t size) {
    if (size < items.data.length)
      foreach(i; items.data[size..$]) {
        if (i.node.marked)
          unmount(i);
      }
    items.shrinkTo(size);
  }
  void remove(size_t idx) {
    .removeChild(items.appender.data[idx]);
    import std.algorithm : remove;
    items.appender.data.remove(idx);
    items.appender.shrinkTo(items.appender.data.length - 1);
  }
}

alias UnorderedList(T) = List!(T,"ul");
