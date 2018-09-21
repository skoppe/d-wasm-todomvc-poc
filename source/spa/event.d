module spa.event;

import spa.types;
import ldc.attributes;

private extern(C) {
  bool getEventBool(string prop);
  uint getEventInt(string prop);
  string getEventString(string prop);
  void addEventListener(JsHandle node, ListenerType type, uint ctx, uint fun, EventType type);
}
enum eventemitter;

mixin template BoolProperty(alias name) {
  mixin("static bool "~name~"() { return getEventBool(\""~name~"\");}");
}

mixin template IntProperty(alias name) {
  mixin("static int "~name~"() { return getEventInt(\""~name~"\");}");
}

mixin template StringProperty(alias name) {
  mixin("static string "~name~"() { return getEventString(\""~name~"\");}");
}

struct Event {
  mixin BoolProperty!("bubbles");
  mixin BoolProperty!("isComposing");
  mixin IntProperty!("eventPhase");
}

struct KeyboardEvent {
  mixin BoolProperty!("altKey");
  mixin StringProperty!("key");
}

struct InputEvent {
  mixin BoolProperty!("isComposing");
  // mixin StringProperty!("inputType");
}

struct MouseEvent {
  
}

template ToEvent(EventType type) {
  import std.range : enumerate;
  import std.algorithm : map;
  import std.conv : text;
  import std.conv : to;
  import std.uni : toUpper;
  static if (type == EventType.event)
    alias ToEvent = Event;
  else {
    mixin("alias ToEvent = "~type.to!string.enumerate.map!(t=>t.index==0?t.value.toUpper:t.value).text~"Event;");
  }
}

auto toTuple(Delegate)(Delegate d) {
  import std.typecons : tuple;
  auto ctx = cast(uint)d.ptr;
  auto func = cast(uint)d.funcptr;
  return tuple!("ctx","func")(ctx,func);
}

EventType toEventType(Node)(ListenerType listener) {
  with (ListenerType) {
    final switch(listener) {
    case click:
      return EventType.mouse;
    case input:
      return EventType.input;
    case change:
      return EventType.event;
    case keydown:
      return EventType.keyboard;
    case dblclick:
      return EventType.mouse;
    case blur:
      return EventType.event;
      }
  }
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

mixin template Slot(string type) {
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

extern(C)
@assumeUsed
void domEvent(JsHandle node, uint ctx, uint fun, EventType type) {
  import std.traits : AliasSeq;
  with (EventType) {
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

