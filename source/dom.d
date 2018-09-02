module dom;

pragma(LDC_no_moduleinfo);
import types;
import api;

public import api;

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
