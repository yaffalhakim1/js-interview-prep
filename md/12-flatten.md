> This file is generated from `html/12-flatten.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 2 · Coding questions -->

# Flatten

Flatten takes a nested array and returns a flat one. It is an easy recursion question until you are asked for a depth limit, a version without recursion, or a generator. Each one tests a different skill.

## 1. Ask these three questions first

- **How deep?** One level, a fixed depth, or everything?
- **What counts as nested?** Only arrays, or any list-like thing?
- **New array or change the original?** Almost always a new array. Say it.

## 2. The recursive version

**flatten.js**

```js
function flatten(arr) {
  return arr.reduce(
    (acc, item) => acc.concat(Array.isArray(item) ? flatten(item) : item),
    []
  );
}

console.log(flatten([1, [2, [3, [4, [5]]]]]));

// With a depth limit, which is usually what they actually want
function flattenDepth(arr, depth = 1) {
  return arr.reduce(
    (acc, item) =>
      Array.isArray(item) && depth > 0
        ? acc.concat(flattenDepth(item, depth - 1))
        : acc.concat(item),
    []
  );
}

const nested = [1, [2, [3, [4]]]];
console.log("depth 1:", flattenDepth(nested, 1));
console.log("depth 2:", flattenDepth(nested, 2));
console.log("no limit:", flattenDepth(nested, Infinity));
```

Watch `concat` here. `acc.concat(item)` spreads the array. `acc.concat([item])` would wrap it instead. That difference causes a lot of accidental double flattening.

### About the cost

`concat` makes a new array at every level, so the recursive version can be O(n·d). Pushing into one shared array keeps it O(n). Worth mentioning if the input could be large.

**flatten-push.js**

```js
function flattenFast(arr, out = []) {
  for (const item of arr) {
    if (Array.isArray(item)) flattenFast(item, out);   // reuse one array
    else out.push(item);
  }
  return out;
}

console.log(flattenFast([1, [2, [3, [4]]]]));
```

## 3. Without recursion, when the stack is the problem

Recursion is limited by the call stack, which holds a few thousand levels. A very deep input throws `RangeError: Maximum call stack size exceeded`. Using your own list has no such limit.

**flatten-iterative.js**

```js
function flattenIterative(arr) {
  const stack = [...arr];       // our own list of work
  const result = [];

  while (stack.length) {
    const next = stack.pop();
    if (Array.isArray(next)) stack.push(...next);
    else result.push(next);
  }
  return result.reverse();      // pop reads backwards, so undo it
}

console.log(flattenIterative([1, [2, [3, 4]], 5]));

// This version keeps the order without reversing at the end
function flattenIterative2(arr) {
  const stack = [{ list: arr, i: 0 }];
  const result = [];

  while (stack.length) {
    const frame = stack[stack.length - 1];
    if (frame.i >= frame.list.length) {
      stack.pop();
      continue;
    }
    const item = frame.list[frame.i++];
    if (Array.isArray(item)) stack.push({ list: item, i: 0 });
    else result.push(item);
  }
  return result;
}

console.log(flattenIterative2([1, [2, [3, 4]], 5]));
```

**Why this matters**

**Why show both**

The first is five lines and what you would write under time pressure. It reverses at the end because `pop` reads backwards. The second keeps an explicit list of positions, so the order is right and a depth limit is easy to add. Being able to explain the tradeoff is worth more than either version.

## 4. A generator version

**flatten-generator.js**

```js
function* flattenGen(arr) {
  for (const item of arr) {
    if (Array.isArray(item)) yield* flattenGen(item);   // hand off to the nested call
    else yield item;
  }
}

console.log([...flattenGen([1, [2, [3, [4]]]])]);

// The payoff: you can stop early and skip the rest of the work
function firstMatch(arr, predicate) {
  for (const v of flattenGen(arr)) {
    if (predicate(v)) return v;     // stops the whole walk here
  }
  return undefined;
}

const big = [[1, 2], [3, [4, 5]], [6]];
console.log("first match:", firstMatch(big, (n) => n % 2 === 0 && n > 3));
```

The generator is still recursive, so the stack limit still applies. But it gives you laziness and early exit. "Nothing is built until someone asks for it" is the sentence that earns the point.

## 5. Edge cases

**edges.js**

```js
function flatten(arr) {
  return arr.reduce(
    (acc, item) => acc.concat(Array.isArray(item) ? flatten(item) : item),
    []
  );
}

console.log("empty:", flatten([]));
console.log("already flat:", flatten([1, 2, 3]));

// Strings are not arrays, so they are not split into letters
console.log("strings stay whole:", flatten(["ab", ["cd"]]));

// Empty slots are skipped by reduce, so they vanish
console.log("with holes:", [1, , 3].length, "→", flatten([1, , 3]).length);

// arguments objects are list-like but not real arrays
function demo() { return Array.isArray(arguments); }
console.log("arguments is an array?", demo(1, 2));

// If you must accept any list-like value, widen the check
const isIterable = (v) => v != null && typeof v !== "string" && Symbol.iterator in Object(v);
console.log("typed array counts:", isIterable(new Uint8Array([1, 2])));
```

**Watch out**

**Arrays that contain themselves**

`const a = [1]; a.push(a);` makes any recursive flatten loop forever or overflow the stack. JSON cannot contain loops, so this rarely happens. But asking "can the input contain itself?" before you code is exactly the kind of question interviewers like.

## 6. Follow-up questions

**Check:** Flatten a nested object into dot paths.

```js
function flattenObject(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flattenObject(v, key, out);
    else out[key] = v;
  }
  return out;
}
// { a: { b: { c: 1 } } } → { "a.b.c": 1 }
```

Same recursion, different result. Say why you skip arrays. Turning them into index keys is usually not wanted.

**Check:** How is Array.prototype.flat(Infinity) different?

It is built in. It removes empty slots completely instead of turning them into `undefined`. It also respects `Symbol.isConcatSpreadable`. Your version is the right approximation for an interview. Say that.

**Check:** What is the complexity?

O(n) items visited, O(n) space for the result. The recursive `concat` version also allocates at every level. The push version and the generator do not. Depth costs O(d) stack space.

---

← [Curry](11-curry.md) · [Contents](index.md) · [Memoize](13-memoize.md) →
