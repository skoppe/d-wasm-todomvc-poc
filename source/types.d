module types;

pragma(LDC_no_moduleinfo);
alias Handle = uint;
alias JsHandle = uint;
alias EventHandle = uint;

enum NodeType {
  a = 0,
  abbr = 1,
  address = 2,
  area = 3,
  article = 4,
  aside = 5,
  audio = 6,
  b = 7,
  base = 8,
  bdi = 9,
  bdo = 10,
  blockquote = 11,
  body_ = 12,
  br = 13,
  button = 14,
  canvas = 15,
  caption = 16,
  cite = 17,
  code = 18,
  col = 19,
  colgroup = 20,
  data = 21,
  datalist = 22,
  dd = 23,
  del = 24,
  dfn = 25,
  div = 26,
  dl = 27,
  dt = 28,
  em = 29,
  embed = 30,
  fieldset = 31,
  figcaption = 32,
  figure = 33,
  footer = 34,
  form = 35,
  h1 = 36,
  h2 = 37,
  h3 = 38,
  h4 = 39,
  h5 = 40,
  h6 = 41,
  head = 42,
  header = 43,
  hr = 44,
  html = 45,
  i = 46,
  iframe = 47,
  img = 48,
  input = 49,
  ins = 50,
  kbd = 51,
  keygen = 52,
  label = 53,
  legend = 54,
  li = 55,
  link = 56,
  main = 57,
  map = 58,
  mark = 59,
  meta = 60,
  meter = 61,
  nav = 62,
  noscript = 63,
  object = 64,
  ol = 65,
  optgroup = 66,
  option = 67,
  output = 68,
  p = 69,
  param = 70,
  pre = 71,
  progress = 72,
  q = 73,
  rb = 74,
  rp = 75,
  rt = 76,
  rtc = 77,
  ruby = 78,
  s = 79,
  samp = 80,
  script = 81,
  section = 82,
  select = 83,
  small = 84,
  source = 85,
  span = 86,
  strong = 87,
  style = 88,
  sub = 89,
  sup = 90,
  table = 91,
  tbody = 92,
  td = 93,
  template_ = 94,
  textarea = 95,
  tfoot = 96,
  th = 97,
  thead = 98,
  time = 99,
  title = 100,
  tr = 101,
  track = 102,
  u = 103,
  ul = 104,
  var = 105,
  video = 106,
  wbr = 107
}

enum ListenerType {
  click = 0,
  change = 1,
  input = 2,
  keydown = 3
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
      }
  }
}

enum EventType {
  animation = 0,
  audioProcessing = 1,
  beforeUnload = 2,
  blob = 3,
  clipboard = 4,
  close = 5,
  composition = 6,
  custom = 7,
  deviceLight = 8,
  deviceMotion = 9,
  deviceOrientation = 10,
  deviceProximity = 11,
  drag = 12,
  error = 13,
  fetch = 14,
  focus = 15,
  gamepad = 16,
  hashChange = 17,
  idbVersionChange = 18,
  input = 19,
  keyboard = 20,
  mediaStream = 21,
  message = 22,
  mouse = 23,
  mutation = 24,
  offlineAudioCompletion = 25,
  pageTransition = 26,
  paymentRequestUpdate = 27,
  pointer = 28,
  popState = 29,
  progress = 30,
  rtcDataChannel = 31,
  rtcIdentityError = 32,
  rtcIdentity = 33,
  rtcPeerConnectionIce = 34,
  storage = 35,
  svg = 36,
  time = 37,
  touch = 38,
  trackTransition = 39,
  ui = 40,
  userProximity = 41,
  webGlContext = 42,
  wheel = 43,
  event = 44
}

enum child;
enum prop;
enum callback;
enum attr;
struct connect(field...) {};
enum eventemitter;
