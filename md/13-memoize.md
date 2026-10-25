> This file is generated from `html/13-memoize.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 2 · Coding questions -->

# Memoize

Memoize saves the result of a function so it does not have to run again with the same arguments. The basic version is ten lines. Then come the real questions: how do you build the cache key, how do you avoid holding memory forever, and what if the same call is already running?

## 1. The basic version

**memoize.js**

```js
function memoize(fn) {
  const cache = new Map();              // kept alive by the closure

  return function memoized(...args) {
    const key = args[0];                // simple version: one argument
    if (cache.has(key)) return cache.get(key);

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

let calls = 0;
const slowSquare = memoize((n) => { calls++; return n * n; });

console.log(slowSquare(4), slowSquare(4), slowSquare(4));
console.log("fn ran", calls, "time(s)");

// Use `has`, not a truthiness check, or a saved 0 gets lost
const zero = memoize((n) => { calls++; return 0; });
zero(1);
zero(1);
console.log("saved zero works:", calls);
```

**Watch out**

**if (cache[key]) is the classic bug**

It fails for a saved `0`, `""`, `false`, `null` and `NaN`. Use `Map.has`, or `key in cache` for a plain object. Small detail, very common mistake.

## 2. Making a key from several arguments

`JSON.stringify(args)` is the popular answer, and it is wrong in specific ways you can name.

**keys.js**

```js
console.log(JSON.stringify([1, "1"]));       // [1,"1"], fine
console.log(JSON.stringify([undefined]));    // [null], clashes with [null]
console.log(JSON.stringify([{ a: 1, b: 2 }]));
console.log(JSON.stringify([{ b: 2, a: 1 }]));   // different string, same data
console.log(JSON.stringify([new Date(0)]));  // becomes a string
console.log(JSON.stringify([Symbol("x")]));  // [null]

// A hand-written key fixes most of this
function keyOf(args) {
  return args.map((a) => {
    if (typeof a === "object" && a !== null) {
      return JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]]));
    }
    return `${typeof a}:${String(a)}`;
  }).join("|");
}

console.log(keyOf([1, "1"]));
console.log("order no longer matters:",
  keyOf([{ a: 1, b: 2 }]) === keyOf([{ b: 2, a: 1 }]));
```

Even this only looks at the top level. The honest answer: the key is a design choice, and the right one depends on the data. For simple values, joining them as a string is fine. For objects, either ask the caller for a key, or use a `WeakMap`.

**memoize-with-resolver.js**

```js
function memoize(fn, makeKey) {
  const cache = new Map();

  return function memoized(...args) {
    const key = makeKey ? makeKey.apply(this, args) : args[0];
    if (!cache.has(key)) cache.set(key, fn.apply(this, args));
    return cache.get(key);
  };
}

// The caller decides what counts as the same call
const getUser = memoize(
  (id, opts) => ({ id, name: "user " + id }),
  (id) => id                       // ignore `opts` on purpose
);

console.log("same object returned:", getUser(1) === getUser(1, { fresh: true }));
```

## 3. Objects: compare by reference, not by content

If the argument is an object, the cache should usually use the object itself as the key. A `WeakMap` is the right tool. Its entries disappear when the object is garbage collected, so the cache cannot leak.

**weak.js**

```js
function memoizeByObject(fn) {
  const cache = new WeakMap();

  return function (obj, ...rest) {
    if (cache.has(obj)) return cache.get(obj);
    const value = fn.call(this, obj, ...rest);
    cache.set(obj, value);
    return value;
  };
}

let computed = 0;
const describe = memoizeByObject((user) => {
  computed++;
  return { label: user.name.toUpperCase() };
});

const alice = { name: "alice" };
console.log(describe(alice), describe(alice));
console.log("computed", computed, "time(s)");

// A different object with the same data is a cache miss, on purpose
console.log("different object misses:",
  describe({ name: "alice" }) !== describe(alice));
```

**Why this matters**

**Why WeakMap and not Map**

A `Map` keeps a strong reference to its keys. So every object you ever memoized stays in memory forever. That is a classic leak. A `WeakMap` holds them weakly and removes the entry when the object is collected. The catch: keys must be objects, and you cannot loop over it, so no LRU on top.

## 4. A cache with a size limit

An unlimited cache grows with every new argument. An LRU keeps the most recent N and drops the oldest. JavaScript's `Map` keeps insertion order, which makes this almost free.

**memoize-lru.js**

```js
function memoizeLRU(fn, maxSize = 2) {
  const cache = new Map();

  return function memoized(...args) {
    const key = args[0];

    if (cache.has(key)) {
      const value = cache.get(key);
      cache.delete(key);        // re-insert so it counts as most recent
      cache.set(key, value);
      return value;
    }

    const value = fn.apply(this, args);
    cache.set(key, value);

    if (cache.size > maxSize) {
      cache.delete(cache.keys().next().value);   // drop the oldest
    }
    return value;
  };
}

let calls = 0;
const f = memoizeLRU((n) => { calls++; return n * 10; }, 2);

f(1); f(2); f(3);    // 1 gets dropped
f(1);                // so this recomputes
console.log("fn ran", calls, "times (expect 4)");
```

## 5. Async: do not run the same request twice

Saving the finished value is only half of it. If ten components ask for the same user at once, you want one request. So save the *promise*, not the value.

**memoize-async.js**

```js
function memoizeAsync(fn) {
  const cache = new Map();

  return function (key) {
    if (!cache.has(key)) {
      const p = Promise.resolve()
        .then(() => fn(key))
        .catch((err) => {
          cache.delete(key);      // do not save failures, allow a retry
          throw err;
        });
      cache.set(key, p);
    }
    return cache.get(key);
  };
}

let requests = 0;
const load = memoizeAsync(async (id) => {
  requests++;
  await new Promise((r) => setTimeout(r, 20));
  return { id };
});

Promise.all([load(1), load(1), load(1)]).then(([a, b, c]) => {
  console.log("all the same object:", a === b && b === c);
  console.log("requests made:", requests, "(expect 1)");
});
```

**Tip**

**Three details that make it production ready**

- Save the **promise**, so callers at the same time share one request.
- Delete on failure, or one network blip breaks the cache forever.
- Add a time limit or an `invalidate(key)` if the data can change.

## 6. When not to memoize

- **Functions that are not pure.** If the result depends on the time, random values, or outside state, the cache gives old answers.
- **Cheap functions.** Building the key can cost more than the call. Memoizing `(a, b) => a + b` is pure overhead.
- **Many different arguments.** A cache that misses 99% of the time is a memory leak with extra steps.
- **Results that get changed.** Two callers get the same object. If one changes it, the other sees the change. Freeze it or copy it.

**Say this in an interview**

"I'd build the key from the arguments, with an option for the caller to supply their own key. I'd use a `WeakMap` when the arguments are objects, so entries can be freed. I'd limit the size with an LRU so new arguments cannot grow it forever. For async functions I'd save the promise and delete it on failure."

## 7. Check yourself

**Check:** Why is React.useMemo not the same thing?

`useMemo` is a cache for one component instance, keyed by the dependency list. React may throw it away at any time. It is a speed hint, not a guarantee. This memoize is a general cache keyed by arguments. Treating them as the same causes bugs where people expect `useMemo` to always return the same object.

**Check:** What happens if the memoized function throws?

In the basic version nothing is saved, so every call tries again. That is usually what you want. In the async version you must delete the entry, or the failed promise stays in the cache and every later call fails at once.

**Check:** How would you add a time limit to entries?

Save `{ value, expiresAt }` and check it when reading. Or set one timer per entry, but that adds overhead for many keys. For many keys, check lazily when someone reads, instead of scheduling timers.

---

← [Flatten](12-flatten.md) · [Contents](index.md) · [Deep clone](14-deep-clone.md) →
