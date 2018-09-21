pragma(LDC_no_moduleinfo);

import std.array : Appender;
import std.format : formattedWrite;
import spa.spa;

Appender!(char[]) app;

mixin Spa!App;

string format(T...)(string fmt, T t) {
  auto start = app.data.length;
  formattedWrite(app, fmt, t);
  auto end = app.data.length;
  return cast(string)app.data[start..end];
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
  int completed = 0;
  int size = 0;
  FilterStyle filter = FilterStyle.All;
  @visible!"footer" bool showFooter(int size) {
    return size > 0;
  }
  @visible!"main" bool showMain(int size) {
    return size > 0;
  }
  void updateItems() {
    import std.algorithm : count;
    main.update!(main.items);
    this.update!(this.size)(main.items.data.length);
    this.update!(this.count)(main.items.data.count!(i=>!i.checked));
    this.update!(this.completed)(main.items.data.length - this.count);
  }
  @connect!"main.toggleAll.input.toggle" void toggle() {
    bool checked = main.toggleAll.input.node.getPropertyBool("checked");
    main.toggleEach(checked);
    updateItems();
  }
  @connect!"header.field.enter" void enter() {
    Item item = new Item(header.field.value);
    main.items.put(item);
    header.field.update!(header.field.value)("");
    updateItems();
  }
  @connect!("main.list.items","view.button.click") void removeItem(size_t idx) {
    main.items.removeItem(idx);
    updateItems();
  }
  @connect!("main.list.items","view.checkbox.toggle") void toggleItem(size_t idx) {
    main.list.items.data[idx].checked = !main.list.items.data[idx].checked;
    // TODO: here we need to update data[idx] again, else state in dom is wrong
    updateItems();
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
  @connect!"footer.clear.click" void clearCompleted() {
    import std.algorithm : remove;
    auto slice = main.items.data.remove!(i => i.checked);
    main.items.shrinkTo(slice.length);
    updateItems();
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

struct ToggleAll {
  struct Input {
    @style!"toggle-all" mixin Node!"input";
    mixin Slot!"toggle";
    @attr type = "checkbox";
    @prop id = "toggle-all";
    int* count;
    @prop bool checked(int* count) {
      return *count == 0;
    }
    @callback void onChange(Event event) {
      // TODO: would be great if we can add the event.target.checked as second arg
      this.emit(toggle);
    }
  }
  struct Label {
    mixin Node!"label";
    @attr for_ = "toggle-all";
  }
  @child Input input;
  @child Label label;
}

struct Main {
  @style!"main" mixin Node!"section";
  @child ToggleAll toggleAll;
  @style!"todo-list" @child UnorderedList!Item list;
  FilterStyle* filter;
  Appender!(Item[]) items;
  auto transform(ref Appender!(Item[]) items, FilterStyle* filter) {
    with (FilterStyle) {
      final switch(*filter) {
      case All:
        return items.data.update(list);
      case Active:
        import std.algorithm : filter ;
        return items.data.filter!(i=>!i.checked).update(list);
      case Completed:
        import std.algorithm : filter ;
        return items.data.filter!(i=>i.checked).update(list);
      }
    }
  }
  void toggleEach(bool toggle) {
    foreach(i; items.data)
      i.update!(i.checked)(toggle);
  }
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
      mixin Slot!"click";
      @attr string href = "#";
      @prop string innerText = text;
      FilterStyle* filter;
      FilterStyle* option;
      @style!"selected" bool selected(FilterStyle* filter, FilterStyle* option) {
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
  struct Button {
    @style!"clear-completed" mixin Node!"button";
    mixin Slot!"click";
    @prop innerText = "Clear Completed";
    @callback void onClick(MouseEvent event) {
      this.emit(click);
    }
  }
  @style!"footer" mixin Node!"footer";
  @child Span span;
  @child Filters filters;
  @child Button clear;
  int* completed;
  @visible!"clear" bool canClear(int* completed) {
    return *completed > 0;
  }
}

// TODO: we can move some data into an upper state struct (like the todo list), and use an pointer to get a reference to it.

struct Input {
  @style!"new-todo" mixin Node!"input";
  mixin Slot!"enter";
  mixin Slot!"input";
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
  @style!"completed" bool checked = false;
  @style!"editing" bool editing;
  @child View view;
  @child InlineInput editField;
  string innerText;
  this(string text) {
    innerText = text;
  }
  @connect!"view.label.click" void onEdit() {
    this.update!(editing)(true);
    editField.update!(editField.value)(innerText);
    editField.focus();
  }
  @connect!"editField.enter" void onSubmit() {
    this.update!(editing)(false);
    this.update!(innerText)(editField.value);
  }
  @connect!"editField.esc" void onEsc() {
    this.update!(editing)(false);
  }
}

struct View {
  @style!"view" mixin Node!"div";
  @child Checkbox checkbox;
  @child ClickableLabel label;
  @child Button button;
}

struct InlineInput {
  @style!"edit" mixin Node!"input";
  mixin Slot!"enter";
  mixin Slot!"esc";
  mixin Slot!"input";
  @prop string value;
  @callback void onKeyDown(KeyboardEvent event) {
    value = node.getProperty("value");
    if (event.key == "Enter")
      this.emit(enter);
    else if (event.key == "Escape")
      this.emit(esc);
    else
      this.emit(input);
  }
  @callback void onBlur(Event event) {
    this.emit(enter);
  }
}

struct Button {
  mixin Slot!"click";
  @style!"destroy" mixin Node!"button";
  @callback void onClick(MouseEvent event) {
    this.emit(click);
  }
}

struct ClickableLabel {
  mixin Slot!"click";
  mixin Node!"label";
  @prop string* innerText;
  @callback void onDblClick(MouseEvent event) {
    this.emit(click);
  }
}

struct Label {
  mixin Node!"label";
  @prop string* innerText;
}

struct Checkbox {
  @style!"toggle" mixin Node!"input";
  mixin Slot!"toggle";
  @attr string type = "checkbox";
  @prop bool* checked;
  @callback void onChange(Event event) {
    // TODO: would be great if we can add the event.target.checked as second arg
    this.emit(toggle);
  }
}

// Challanges:
// - Optional items
// - removing nodes
// - input validations
// - forms
// - deallocate memory from allocString/arrays
// - convert all attr to prop (and call proper function under the hood)
