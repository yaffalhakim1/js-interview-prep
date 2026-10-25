# Top Practice Questions — Reference Solutions

The 9 highest-value JS questions per GFE. Attempt each yourself first,
then compare. Each solution includes the edge cases interviewers want to hear.

## 1. Debounce
```js
function debounce(fn, wait, { leading = false } = {}) {
  let timer = null;
  function debounced(...args) {
    const callNow = leading && timer === null;
    if (timer) clearTimeout(timer);          // not clearing = throttle, not debounce
    timer = setTimeout(() => {
      timer = null;
      if (!leading) fn.apply(this, args);    // `function` keyword, NOT arrow — preserve this
    }, wait);
    if (callNow) fn.apply(this, args);
  }
  debounced.cancel = () => { clearTimeout(timer); timer = null; };
  return debounced;
}
```
**Say out loud:** leading vs trailing edge; `this` + args forwarded; cancel method;
"this is a debounce because the previous timer is cleared each call".

## 2. Throttle
```js
function throttle(fn, wait) {
  let last = 0, timer = null;
  return function throttled(...args) {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn.apply(this, args);
    } else {
      clearTimeout(timer);
      timer = setTimeout(() => {          // trailing call so the last event isn't lost
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, remaining);
    }
  };
}
```

## 3. Array.prototype.filter (polyfill)
```js
Array.prototype.filter = function (callback, thisArg) {
  if (typeof callback !== 'function') throw new TypeError(callback + ' is not a function');
  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (Object.prototype.hasOwnProperty.call(this, i)) { // skips holes
      if (callback.call(thisArg, this[i], i, this)) result.push(this[i]);
    }
  }
  return result;
};
```
**Say out loud:** callback gets (element, index, array); thisArg; holes skipped;
length snapshot vs mutation (mention, don't need to implement).

## 4. Promise.all
```js
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = [];
    let remaining = promises.length;
    if (remaining === 0) return resolve([]);   // empty input MUST resolve []
    promises.forEach((p, i) => {
      Promise.resolve(p).then((value) => {     // normalize non-promises
        results[i] = value;                    // index-based: preserves order
        if (--remaining === 0) resolve(results);
      }, reject);                              // fail-fast
    });
  });
}
```
**Pitfalls it avoids:** out-of-order results (push as resolved), empty-input hang,
non-promise values.

## 5. Curry
```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) return fn.apply(this, args);
    return curried.bind(this, ...args);
  };
}
// Variadic variant (sum(a,b,c) called as sum(1)(2)(3) or sum(1,2)(3)):
function curryVariadic(fn) {
  return function curried(...args) {
    if (args.length === 0) return curried;     // guard: () shouldn't force evaluation
    if (args.length >= fn.length) return fn.apply(this, args);
    return (...next) => curried.apply(this, [...args, ...next]);
  };
}
```

## 6. Flatten
```js
// Recursive
function flatten(arr) {
  return arr.reduce(
    (acc, val) => acc.concat(Array.isArray(val) ? flatten(val) : val),
    [],
  );
}
// Iterative (handles deep nesting without stack overflow — mention this)
function flattenIterative(arr) {
  const stack = [...arr], result = [];
  while (stack.length) {
    const next = stack.pop();
    if (Array.isArray(next)) stack.push(...next);
    else result.push(next);
  }
  return result.reverse();
}
// Generator
function* flattenGen(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) yield* flattenGen(item);
    else yield item;
  }
}
```

## 7. getElementsByClassName
```js
function getElementsByClassName(root, className) {
  const result = [];
  function traverse(node) {
    if (!node) return;
    if (node.classList && node.classList.contains(className)) result.push(node);
    for (const child of node.children) traverse(child);  // DFS pre-order
  }
  traverse(root);
  return result;
}
```
**Say out loud:** DFS traversal; support multiple classes (split on whitespace);
a real implementation returns a *live* HTMLCollection.

## 8. Deep Clone
```js
function deepClone(value, visited = new WeakMap()) {
  // Primitives + null
  if (value === null || typeof value !== 'object') return value;
  if (visited.has(value)) return visited.get(value);   // circular reference
  if (value instanceof Date) return new Date(value);
  if (value instanceof RegExp) return new RegExp(value.source, value.flags);
  if (value instanceof Map) {
    const clone = new Map();
    visited.set(value, clone);
    for (const [k, v] of value) clone.set(deepClone(k, visited), deepClone(v, visited));
    return clone;
  }
  if (value instanceof Set) {
    const clone = new Set();
    visited.set(value, clone);
    for (const v of value) clone.add(deepClone(v, visited));
    return clone;
  }
  // Plain object or array — preserve prototype
  const clone = Object.create(Object.getPrototypeOf(value));
  visited.set(value, clone);
  for (const key of Reflect.ownKeys(value)) {
    clone[key] = deepClone(value[key], visited);
  }
  return clone;
}
```
**Say out loud:** why not `JSON.parse(JSON.stringify())` (Date→string, undefined
dropped, NaN→null, throws on cycles, kills prototypes); WeakMap for cycles;
structuredClone() exists natively now (but can't clone functions).

## 9. Data Selection (lodash `get`)
```js
function select(data, path) {
  const parts = Array.isArray(path) ? path : path.split('.').flatMap(p =>
    p.includes('[') ? p.replace(']', '').split('[') : p
  ).filter(Boolean);
  let current = data;
  for (const key of parts) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
}
// select({ a: { b: [1, { c: 42 }] } }, 'a.b[1].c') === 42
```
