> This file is generated from `html/17-utilities.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 2 · Coding questions -->

# classnames and JSON

Two small helpers that appear as "write this library function" questions. One
teaches API design. The other walks through the rules of turning data into
text, which people get wrong for years.

## 1. classnames

The job: take strings, arrays and objects, and return one string of class
names. It exists because ``${on ? "a" : ""} ${off ? "b" : ""}`` is hard to
read.

*classNames.js*

```js
function classNames(...args) {
  const out = [];

  function walk(value) {
    if (!value) return;                    // skip false, null, undefined, "", 0

    if (typeof value === "string" || typeof value === "number") {
      out.push(String(value));
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) walk(item);   // handles nested arrays
      return;
    }

    if (typeof value === "object") {
      for (const [key, on] of Object.entries(value)) {
        if (on) out.push(key);               // { active: true } gives "active"
      }
    }
  }

  for (const arg of args) walk(arg);
  return out.join(" ");
}

console.log(classNames("btn", "btn-primary"));
console.log(classNames("btn", false, null, undefined, 0, "", "active"));
console.log(classNames("btn", { active: true, disabled: false }));
console.log(classNames(["btn", ["nested", { deep: 1 }]]));
console.log("nothing at all:", JSON.stringify(classNames()));
```

### Details that earn credit

- **Numbers can be class names.** `classNames(0)` gives `""`, but `classNames(42)` gives `"42"`. That is why the false check comes before the number branch.
- **Objects are checked by their values, arrays by their items.** Both can nest.
- **The original does not remove duplicates.** If you add that, say so. It changes behaviour when a class appears twice on purpose.
- **Return `""`, not `undefined`.** Joining `undefined` into a string gives the word "undefined".

*version without duplicates*

```js
function classNamesUnique(...args) {
  const seen = new Set();
  const out = [];

  function walk(value) {
    if (!value) return;

    if (typeof value === "string" || typeof value === "number") {
      for (const token of String(value).split(/\s+/)) {
        if (token && !seen.has(token)) {
          seen.add(token);
          out.push(token);
        }
      }
      return;
    }

    if (Array.isArray(value)) return value.forEach(walk);

    if (typeof value === "object") {
      for (const [k, on] of Object.entries(value)) if (on) walk(k);
    }
  }

  args.forEach(walk);
  return out.join(" ");
}

// Note the split on spaces: "a  b" becomes two names, not one
console.log(classNamesUnique("a a", "b", ["a", "c"]));
console.log(classNamesUnique("p-4  m-2"));
```

## 2. JSON.stringify rules

Six rules cover almost every question.

*stringify-rules.js*

```js
// 1. undefined, functions and symbols are left out of objects…
console.log(JSON.stringify({ a: 1, b: undefined, c: () => 1, d: Symbol("s") }));

// …but become null inside arrays
console.log(JSON.stringify([1, undefined, () => 1, Symbol("s")]));

// 2. NaN and Infinity become null
console.log(JSON.stringify({ n: NaN, i: Infinity, neg: -0 }));

// 3. Dates turn into text
console.log(JSON.stringify({ d: new Date(0) }));

// 4. Any object can decide its own output with toJSON
console.log(JSON.stringify({
  value: 42,
  toJSON() { return { wrapped: this.value }; }
}));

// 5. BigInt throws
try { JSON.stringify({ big: 10n }); }
catch (e) { console.log("BigInt:", e.name); }

// 6. Objects that contain themselves throw
const a = {}; a.self = a;
try { JSON.stringify(a); } catch (e) { console.log("self-reference:", e.name); }
```

### The replacer argument

*replacer.js*

```js
const user = { id: 1, password: "hunter2", name: "ada", meta: { token: "abc" } };

// A function replacer: return undefined to drop a key
const safe = JSON.stringify(user, (key, value) =>
  key === "password" || key === "token" ? undefined : value
);
console.log(safe);

// An array replacer: only keep these keys, at every level
console.log(JSON.stringify(user, ["id", "name"]));

// A safe version that handles self-references
function safeStringify(value, indent = 2) {
  const seen = new WeakSet();
  return JSON.stringify(value, function (key, val) {
    if (typeof val === "object" && val !== null) {
      if (seen.has(val)) return "[Circular]";
      seen.add(val);
    }
    return val;
  }, indent);
}

const cyclic = { name: "root" };
cyclic.self = cyclic;
console.log(safeStringify(cyclic));
```

> **Key order is not what you typed**

Number-like keys always come first, in ascending order. Only then do the
string keys follow in the order you added them. If order matters, use a `Map`
or an array of pairs.

*key-order.js*

```js
const obj = { b: 1, 2: "two", a: 2, 1: "one" };
console.log("keys:", Object.keys(obj));      // numbers first
console.log("as JSON:", JSON.stringify(obj));

// A Map keeps the real order
const m = new Map([["b", 1], [2, "two"], ["a", 2]]);
console.log("map keys:", [...m.keys()]);
```

## 3. JSON.parse and the reviver

*reviver.js*

```js
const payload = '{"id":"7","created":"2024-05-01T00:00:00.000Z","tags":"a,b"}';

const parsed = JSON.parse(payload, (key, value) => {
  if (key === "created") return new Date(value);   // text back into a Date
  if (key === "id") return Number(value);
  if (key === "tags") return value.split(",");
  return value;
});

console.log(parsed);
console.log("types are back:", parsed.created instanceof Date,
  typeof parsed.id, Array.isArray(parsed.tags));

// Invalid JSON throws
try { JSON.parse("{'a':1}"); }        // single quotes are not valid JSON
catch (e) { console.log("bad JSON:", e.name); }

console.log("simple values:", JSON.parse("1"), JSON.parse('"x"'), JSON.parse("null"));
```

> **The sentence that closes the topic**

"JSON is a format for sending data, not a way to copy it. If I need a copy in
memory, I use `structuredClone`. If I am sending data, I decide the shape on
purpose. And I never send a `Date` without choosing a format for it first."

## 4. Check yourself

**Quiz:** What is JSON.stringify([undefined, function(){}])?

Options:

- A. `"[null,null]"` **← correct**
- B. `"[]"`
- C. `"[undefined,null]"`

Inside arrays, values that cannot be turned into JSON become `null`, so the
positions stay. Inside objects they are simply left out.

**Check:** Why does JSON.stringify throw on BigInt instead of converting?

Because turning it into a normal number could lose precision. JSON has no
integer type bigger than what JavaScript numbers hold. Throwing forces you to
choose, and most people choose to send it as a string.

**Check:** What do classNames(0) and classNames("0") return?

`""` and `"0"`. The number 0 counts as false, so it is dropped. The string "0"
counts as true, so it is kept. That is why the false check must come before
the number branch.

---

← [Event emitter](16-emitter.md) · [Contents](index.md) · [How to run the interview](18-interview.md) →
