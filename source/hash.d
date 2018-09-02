module hash;

ubyte[7] toHash(string s) {
  import std.utf : byChar;
  import std.range : chunks,front,enumerate;
  ubyte[7] buf;
  foreach(chunk; s.byChar.chunks(7)) {
    size_t idx = 0;
    foreach(c; chunk) {
      buf[idx++] ^= c;
    }
  }
  return buf;
}

string toCssName(string s) {
  import std.base64 : Base64Impl;
  alias Encoder = Base64Impl!('-', '_', '\x00');
  return Encoder.encode(s.toHash());
}

unittest {
  enum i = "{backgroundColor:gray2}".toCssName();
  enum g = "{display:inline}".toCssName();
  enum h = "{backgroundColor:gray}".toCssName();
  assert(i == "SRg1YFppZw");
  assert(g == "ZyMAHRwFDw");
  assert(h == "BmU1YFppZw");
}
