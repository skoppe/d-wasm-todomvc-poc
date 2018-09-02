module set;

import std.range;
import std.typecons : Tuple;
import std.algorithm;
import std.range;

struct Set(T) {
  T[] data;
  void put(T t) {
    auto tri = data.assumeSorted.trisect(t);
    if (tri[1].length == 0)
      data.insertInPlace(tri[0].length,t);
    else
      data[tri[0].length] = t;
  }
}
