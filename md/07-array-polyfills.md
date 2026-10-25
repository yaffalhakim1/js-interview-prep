> This file is generated from `html/07-array-polyfills.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 1 · Language basics -->

# Array methods you write yourself

Writing `map` from scratch looks easy. Interviewers score it on the small details: the three arguments the callback gets, the optional `thisArg`, empty slots in arrays, and whether you change the original. Get those right and you show that you read the rules, not just examples.

## 1. Why interviewers still ask this

In the past, browsers did not all support these methods. So developers wrote their own copies. That is called a polyfill. Today the question tests three things: do you understand functions that take other functions, do you know the exact contract, and can you handle the edge cases.

## 2. map

`map` makes a new array. Each item is replaced by whatever the callback returns. The new array has the same length.

**myMap.js**

```js
Array.prototype.myMap = function (callback, thisArg) {
  if (typeof callback !== "function") {
    throw new TypeError(callback + " is not a function");
  }

  const len = this.length >>> 0;      // force a safe whole number
  const result = new Array(len);       // same length, empty slots kept

  for (let i = 0; i < len; i++) {
    if (i in this) {                   // skip empty slots
      result[i] = callback.call(thisArg, this[i], i, this);
    }
  }
  return result;
};

console.log([1, 2, 3].myMap((v) => v * 2));

// thisArg becomes `this` inside the callback
const ctx = { factor: 10 };
console.log([1, 2].myMap(function (v) { return v * this.factor; }, ctx));

// Empty slots stay empty. They are not filled with undefined.
const sparse = [1, , 3];
console.log("result:", sparse.myMap((v) => v * 2));
console.log("slot 1 still empty:", !(1 in sparse.myMap((v) => v * 2)));
```

**Why this matters**

**Four details to mention**

- The callback gets three arguments: the item, the index, and the whole array. `thisArg` is separate, not a fourth argument.
- Inside the callback, `this` is `thisArg`. In strict mode it is `undefined` when you do not pass one.
- The length is read once, before the loop. Items added during the loop are not visited.
- Empty slots are skipped, and stay empty in the result.

The full rule about changes during the loop: items added later are never visited. Items changed before being visited give their new value. Items deleted before being visited are skipped. You rarely implement this, but saying it out loud shows depth.

## 3. filter

`filter` makes a new array with only the items where the callback returned true.

**myFilter.js**

```js
Array.prototype.myFilter = function (callback, thisArg) {
  if (typeof callback !== "function") throw new TypeError("need a function");

  const result = [];
  for (let i = 0; i < this.length; i++) {
    if (i in this && callback.call(thisArg, this[i], i, this)) {
      result.push(this[i]);
    }
  }
  return result;
};

console.log([1, 2, 3, 4].myFilter((n) => n % 2 === 0));
console.log(["a", "bb", "ccc"].myFilter((s) => s.length > 1));
```

`filter` never changes the original array. A common follow-up question: what does `filter(Boolean)` do? It removes every value that counts as false, including `0` and `""`. That is often a bug.

## 4. reduce

The argument order catches people out. The callback is `(accumulator, current, index, array)`. The accumulator comes first. And there are two cases: with a starting value, and without one.

**myReduce.js**

```js
Array.prototype.myReduce = function (callback, initialValue) {
  if (typeof callback !== "function") throw new TypeError("need a function");

  const len = this.length >>> 0;
  let i = 0;
  let acc;

  if (arguments.length >= 2) {
    acc = initialValue;              // a starting value was passed
  } else {
    // no starting value: the first real item becomes the accumulator
    while (i < len && !(i in this)) i++;
    if (i >= len) {
      throw new TypeError("Reduce of empty array with no initial value");
    }
    acc = this[i++];
  }

  for (; i < len; i++) {
    if (i in this) acc = callback(acc, this[i], i, this);
  }
  return acc;
};

console.log([1, 2, 3, 4].myReduce((sum, n) => sum + n, 0));
console.log([1, 2, 3].myReduce((a, b) => a + b));    // no start value, gives 6

try {
  [].myReduce((a, b) => a + b);
} catch (e) {
  console.log("empty array:", e.name);
}

// Counting things is the most common real use
const words = ["a", "b", "a", "c", "a"];
console.log(words.myReduce((acc, w) => {
  acc[w] = (acc[w] || 0) + 1;
  return acc;
}, {}));
```

**Watch out**

**The empty array trap**

`[].reduce(fn)` throws a `TypeError`. But `[].reduce(fn, 0)` returns `0`. So always pass a starting value. Note the check uses `arguments.length`, not `initialValue === undefined`. Passing `undefined` on purpose still counts as passing a value.

## 5. forEach and find, for comparison

**forEach / find**

```js
Array.prototype.myForEach = function (callback, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (i in this) callback.call(thisArg, this[i], i, this);
  }
  // returns nothing on purpose
};

Array.prototype.myFind = function (predicate, thisArg) {
  for (let i = 0; i < this.length; i++) {
    if (i in this && predicate.call(thisArg, this[i], i, this)) return this[i];
  }
  return undefined;      // find gives undefined, findIndex gives -1
};

const log = [];
[1, 2, 3].myForEach((v, i) => log.push(`${i}:${v}`));
console.log(log.join(", "));

console.log("found:", [5, 8, 12].myFind((n) => n > 6));
console.log("not found:", [1].myFind((n) => n > 6));
```

`forEach` returns nothing and you cannot break out of it early. It is not a loop. If you need to stop early, use `some`, `every`, `find`, or a normal `for` loop.

## 6. Chaining has a cost

**cost.js**

```js
const rows = Array.from({ length: 1_000_000 }, (_, i) => i);

// Three passes, three temporary arrays
let t = performance.now();
const a = rows
  .filter((n) => n % 2 === 0)
  .map((n) => n * 2)
  .reduce((s, n) => s + n, 0);
const chainedMs = performance.now() - t;

// One pass
const b = rows.reduce((s, n) => (n % 2 === 0 ? s + n * 2 : s), 0);

console.log("same answer:", a === b);
console.log("chained version took:", chainedMs.toFixed(1), "ms");
```

Each method takes O(n) time. Chaining three of them is still O(n), but it makes three temporary arrays. That is fine for normal page data and wasteful for millions of rows. Saying that shows you have used these methods on real data.

## 7. Mistakes to avoid

- **Not throwing when the callback is not a function.** The real methods throw `TypeError`.
- **Forgetting `thisArg`.** The most commonly missed detail.
- **Using `for...in`.** It also walks inherited keys.
- **Reading `this.length` on every loop run.** Save it in a variable.
- **Changing the array inside the callback.** Just mention it rather than handling it.
- **Thinking `map` fills empty slots.** It does not.

**Say this in an interview**

"I'll write map to the spec. Check the callback is a function. Read the length once. Loop by index so I can skip empty slots. Call the callback with the item, the index and the array, and set `thisArg`. It returns a new array of the same length and never changes the original."

## 8. Check yourself

**Check:** What does [1,2,3].map(parseInt) return?

`[1, NaN, NaN]`. `map` passes the index as the second argument. `parseInt` reads that second argument as the base. So it tries base 1, then base 2, and fails. The fix is `map(Number)` or `map((v) => parseInt(v, 10))`.

**Check:** Why is the accumulator the first argument of reduce?

Because the accumulator is the value you carry forward, and the callback returns it. Putting it first also lets you pass a plain two-argument function like `Math.max` straight in.

**Check:** Does map change the original array?

No, it returns a new array. But if the items are objects and your callback changes them, the original objects change too. "Does not change the array" and "does not change the items" are different promises.

---

← [The event loop](06-event-loop.md) · [Contents](index.md) · [Debounce and throttle](08-debounce.md) →
