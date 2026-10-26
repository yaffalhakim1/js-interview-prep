> This file is generated from `html/14-deep-clone.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 2 · Coding questions -->

# Deep clone

Deep clone copies an object and everything inside it. This question walks
through JavaScript's object model: objects that contain themselves,
prototypes, `Map`, `Set`, and functions. Nobody expects you to handle
everything. They expect you to know what you skipped.

## 1. Why the JSON trick fails

*json-trap.js*

```js
const source = {
  when: new Date("2024-01-01"),
  missing: undefined,
  notANumber: NaN,
  fn: () => 1,
  map: new Map([["k", 1]]),
  set: new Set([1]),
};

const copy = JSON.parse(JSON.stringify(source));
console.log(copy);

// What we lost
console.log("Date became a string:", typeof copy.when);
console.log("undefined dropped:", !("missing" in copy));
console.log("NaN became null:", copy.notANumber);
console.log("function dropped:", !("fn" in copy));
console.log("Map became:", JSON.stringify(copy.map));
console.log("Set became:", JSON.stringify(copy.set));

// BigInt cannot be converted at all
try {
  JSON.stringify({ big: 10n });
} catch (e) {
  console.log("BigInt:", e.name);
}

// And an object that contains itself throws
const cyclic = { name: "a" };
cyclic.self = cyclic;
try {
  JSON.parse(JSON.stringify(cyclic));
} catch (e) {
  console.log("self-reference:", e.name);
}
```

> **Say this before you write any code**

"The JSON trick is a conversion, not a copy. It loses types, drops `undefined`
and functions, turns `NaN` into `null`, flattens `Map` and `Set` to `{}`, and
throws on objects that contain themselves. For plain data that came from JSON
it is fine, and fast."

## 2. The built-in answer: structuredClone

*structured-clone.js*

```js
if (typeof structuredClone === "function") {
  const cyclic = { name: "a", date: new Date(0) };
  cyclic.self = cyclic;

  const copy = structuredClone(cyclic);
  console.log("self-reference kept:", copy.self === copy);
  console.log("it is a new object:", copy !== cyclic);
  console.log("Date copied:", copy.date instanceof Date, copy.date !== cyclic.date);

  try {
    structuredClone({ fn: () => 1 });
  } catch (e) {
    console.log("functions fail:", e.name);
  }
} else {
  console.log("not available in this runtime");
}
```

`structuredClone` exists in every current browser and in Node 17+. It handles
self-references, `Date`, `Map`, `Set`, `RegExp` and typed arrays. It does
**not** keep prototypes, getters, setters, or functions. A class instance
comes back as a plain object.

> **Lead with this in an interview**

"In real code I'd use `structuredClone`. If the environment cannot support it,
or I need to keep prototypes and class methods, here is the recursive
version." Knowing the built-in exists is the signal. Reimplementing it without
mentioning it looks like you learned from blog posts.

## 3. Writing it yourself

Three ideas carry the whole thing. Stop at simple values. Keep a `WeakMap` of
objects you already copied, so self-references work. Handle each built-in type
before falling back to a plain object.

*deepClone.js*

```js
function deepClone(value, seen = new WeakMap()) {
  // 1. simple values and functions are returned as they are
  if (value === null || typeof value !== "object") return value;

  // 2. already copied? return the same copy. This also handles self-references.
  if (seen.has(value)) return seen.get(value);

  // 3. built-in types need their own copy
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);

  if (value instanceof Map) {
    const copy = new Map();
    seen.set(value, copy);
    for (const [k, v] of value) copy.set(deepClone(k, seen), deepClone(v, seen));
    return copy;
  }

  if (value instanceof Set) {
    const copy = new Set();
    seen.set(value, copy);
    for (const v of value) copy.add(deepClone(v, seen));
    return copy;
  }

  if (ArrayBuffer.isView(value)) {
    return value.slice ? value.slice() : value;
  }

  // 4. plain objects and arrays: keep the prototype
  const copy = Array.isArray(value)
    ? []
    : Object.create(Object.getPrototypeOf(value));

  seen.set(value, copy);          // save BEFORE going deeper

  for (const key of Reflect.ownKeys(value)) {   // includes symbol keys
    copy[key] = deepClone(value[key], seen);
  }
  return copy;
}

// ── tests ───────────────────────────────────────────────
const original = {
  name: "root",
  when: new Date(0),
  tags: new Set(["a"]),
  meta: new Map([["k", { deep: true }]]),
  nested: { list: [1, 2, { x: 3 }] },
};
original.self = original;         // contains itself

const clone = deepClone(original);
console.log("self-reference kept:", clone.self === clone);
console.log("Date:", clone.when instanceof Date, clone.when.getTime());
console.log("Map value copied:", clone.meta.get("k") !== original.meta.get("k"));
console.log("Set:", [...clone.tags]);
console.log("nested value:", clone.nested.list[2].x);

clone.nested.list[0] = 99;
console.log("original untouched:", original.nested.list[0] === 1);

class User { constructor(n) { this.name = n; } greet() { return this.name; } }
const u = deepClone(new User("ada"));
console.log("class method still works:", u.greet());
```

> **Why save the copy before going deeper?**

Because the copy must exist in the map before any child is copied. Otherwise
an object that contains itself recurses forever. It also means two properties
pointing at the same object still point at the same copy. This one line
matters more than any single type branch.

## 4. What this still does not handle

| Case | What happens | Fix |
| --- | --- | --- |
| Getters and setters | They run, and become plain values | Copy the property descriptors |
| Hidden properties | `Reflect.ownKeys` finds them, but their flags are lost | Copy the descriptors |
| Functions | Shared, not copied | Cannot be copied meaningfully. Say so. |
| Promises, WeakMap, WeakSet | Returned as they are, or break | Not copyable by design |
| DOM nodes | Not plain objects, behaviour undefined | `node.cloneNode(true)` |
| Private `#` fields | Lost, they are not real properties | Add a `clone()` method to the class |

### Keeping getters, if they ask

*descriptors.js*

```js
function cloneWithDescriptors(value, seen = new WeakMap()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);

  const copy = Object.create(Object.getPrototypeOf(value));
  seen.set(value, copy);

  for (const key of Reflect.ownKeys(value)) {
    const desc = Object.getOwnPropertyDescriptor(value, key);
    if ("value" in desc) desc.value = cloneWithDescriptors(desc.value, seen);
    Object.defineProperty(copy, key, desc);   // keeps hidden, read-only and getters
  }
  return copy;
}

const obj = {};
Object.defineProperty(obj, "hidden", { value: 1, enumerable: false });

const c = cloneWithDescriptors(obj);
console.log("hidden property kept:",
  Object.getOwnPropertyDescriptor(c, "hidden").enumerable === false);
```

## 5. Shallow, deep, and the middle

*levels.js*

```js
const src = { a: 1, nested: { b: 2 }, list: [{ c: 3 }] };

const shallow1 = { ...src };              // one level only
const shallow2 = Object.assign({}, src);  // same
const deep = structuredClone(src);        // everything

console.log("spread shares the nested object:", shallow1.nested === src.nested);
console.log("structuredClone does not:", deep.nested !== src.nested);

// Arrays: spread is shallow too
const arr = [{ x: 1 }];
const arrCopy = [...arr];
console.log("array items shared:", arrCopy[0] === arr[0]);
```

Shallow copies are usually the right choice in React. You replace the part
that changed and keep the rest by reference. Deep copying state on every
render is a performance bug, not a safety feature.

## 6. Check yourself

**Quiz:** What is the smallest change that makes a simple recursive clone
handle self-references?

Options:

- A. Add a depth limit
- B. Keep a `WeakMap` of copies and check it before going deeper **← correct**
- C. Wrap it in try/catch

A depth limit avoids the crash but silently cuts off data.

**Check:** Why WeakMap and not Map for the seen list?

The list is only needed while the copy runs. A `WeakMap` avoids holding strong
references. A local `Map` would also be freed when the call returns, but
`WeakMap` is the better habit and the expected answer.

**Check:** Does a deep clone keep "these two properties are the same object"?

With the `seen` map, yes. If `a.x === a.y`, then `clone.x === clone.y`.
Without it you get two separate copies, which breaks code that relies on them
being the same.

---

← [Memoize](13-memoize.md) · [Contents](index.md) · [The DOM and events](15-dom.md) →
