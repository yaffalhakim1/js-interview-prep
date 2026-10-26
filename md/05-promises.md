> This file is generated from `html/05-promises.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 1 · Language basics -->

# Promises and async/await

A promise is a placeholder for a value that is not ready yet. Using one is
easy. The interview questions are about three details: each `then` returns a
new promise, errors travel down the chain, and `async` is just a shorter way
to write `then`.

## 1. Three states, and only one change

A promise starts as **pending**. Then it becomes either **fulfilled** with a
value, or **rejected** with a reason. Once it changes, it never changes again.
Calling `resolve` twice does nothing the second time.

*settles once*

```js
const p = new Promise((resolve, reject) => {
  resolve("first");
  resolve("second");              // ignored, already settled
  reject(new Error("too late"));  // also ignored
});

p.then(v => console.log("value:", v));

// The function you pass to `new Promise` runs immediately
console.log("this line runs after the executor");
```

The function you pass to `new Promise` runs straight away. But the callback
you pass to `.then` waits. It goes into a queue and runs after the current
code finishes. That is why promise questions are really queue questions.

## 2. Each then makes a new promise

`then` does not change the original promise. It returns a new one, filled with
whatever your callback returns. That is how chains work. It is also where most
real bugs come from.

*chaining.js*

```js
Promise.resolve(1)
  .then((v) => {
    console.log("got", v);
    return v + 1;                   // this becomes the next value
  })
  .then((v) => {
    console.log("got", v);
    return Promise.resolve(v * 10); // returning a promise unwraps it
  })
  .then((v) => console.log("got", v))
  .finally(() => console.log("finally always runs"));
```

> **Forgetting return**

`.then(() => fetchUser())` waits for the fetch. `.then(() => { fetchUser();
})` does not. The chain continues with `undefined` while the fetch is still
running. Mention this before the interviewer asks.

## 3. How errors travel

A rejection skips every `then` until it reaches a `catch`. Throwing inside a
`then` also rejects the new promise. So `throw` and `return Promise.reject()`
have the same effect one step down the chain.

*errors.js*

```js
function step(n) {
  return new Promise((resolve, reject) => {
    if (n === 2) reject(new Error("failed at " + n));
    else resolve(n);
  });
}

step(1)
  .then((n) => { console.log("step", n); return step(2); })
  .then((n) => { console.log("never runs", n); })
  .catch((err) => {
    console.log("caught:", err.message);
    return "recovered";             // catch returns a value, so the chain continues
  })
  .then((v) => console.log("after catch:", v));
```

### Three ways to catch, and how they differ

| Form | What it catches | Note |
| --- | --- | --- |
| `.then(ok, fail)` | only a rejection from before it | an error thrown inside `ok` is **not** caught |
| `.catch(fail)` | anything before it, including errors in `ok` | safer, and what most people mean |
| `.finally(fn)` | nothing, it passes everything through | runs on both paths, for cleanup |

## 4. async and await

An `async` function always returns a promise. A `throw` inside it becomes a
rejection. `await` pauses the function until the promise finishes, then gives
you the value.

*same code, two ways*

```js
// with then
function load() {
  return fetch("/api").then(r => r.json()).then(d => d.items);
}

// with await, exactly the same behaviour
async function load() {
  const r = await fetch("/api");
  const d = await r.json();
  return d.items;      // wrapped in a promise for you
}
```

*errors.js*

```js
async function fails() {
  throw new Error("boom");          // becomes a rejection, not a crash
}

fails().catch(e => console.log("caught outside:", e.message));

async function handled() {
  try {
    await fails();
  } catch (e) {
    console.log("caught inside:", e.message);
    return "recovered";
  } finally {
    console.log("cleanup runs either way");
  }
}

handled().then(v => console.log("returned:", v));
```

> **await inside a loop runs one at a time**

`for (const id of ids) await load(id)` waits for each one before starting the
next. Sometimes that is what you want. Sometimes it makes the code 10 times
slower. The parallel version is `await Promise.all(ids.map(load))`. Say which
you chose and why. That is the point of the question.

## 5. When the callbacks actually run

Each `then` callback and each `await` waits in a queue. That queue runs after
the current code, but before the next timer. The next page covers this fully.
Here is the shape you need now:

*order.js*

```js
console.log("A");
setTimeout(() => console.log("B (timer)"), 0);
Promise.resolve().then(() => console.log("C (promise)"));

(async () => {
  console.log("D");
  await null;                     // pause here, continue later
  console.log("E (after await)");
})();

console.log("F");
```

**Check:** Show the order

`A, D, F, C, E, B`. Normal code runs first: A, D, F. Then the promise
callbacks in order: C, then E. The timer runs last.

## 6. Four traps

### 1. An async function does not throw straight away

*sync-try.js*

```js
async function bad() { throw new Error("nope"); }

try {
  const p = bad();          // no throw here, it returns a rejected promise
  p.catch(() => {});        // handled, so this demo stays quiet
  console.log("try block finished normally");
} catch (e) {
  console.log("this never runs");
}

bad().catch((e) => console.log("handled separately:", e.message));
```

### 2. An async callback inside forEach is not awaited

*foreach.js*

```js
// Wrong: forEach does not wait, so this finishes immediately
items.forEach(async (item) => {
  await save(item);
});

// Right: collect the promises, then wait for all of them
await Promise.all(items.map((item) => save(item)));
```

### 3. An unhandled rejection is a real error

In Node it can stop the program. In the browser it appears in the console.
Either way, every promise needs a `catch`, or must be returned to a caller who
will handle it.

### 4. Promise.resolve accepts anything

*normalise.js*

```js
// You can call .then on a plain value
Promise.resolve(42).then((v) => console.log("number:", v));
Promise.resolve({ a: 1 }).then((v) => console.log("object:", v));

// An object with a .then method is treated like a promise
const thenable = { then(res) { res("from thenable"); } };
Promise.resolve(thenable).then(console.log);

// A promise is returned unchanged
const p = Promise.resolve(1);
console.log("same promise:", Promise.resolve(p) === p);
```

## 7. Check yourself

**Check:** After .catch(), does the next .then() run?

Yes, unless the catch itself throws. A catch handler that returns a value
produces a fulfilled promise, so the chain continues. That is how you recover
from an error and carry on.

**Check:** What does this print?

```js
const p = Promise.resolve(1);
p.then(v => console.log("a", v));
p.then(v => console.log("b", v));
```

`a 1` then `b 1`. Callbacks run in the order you added them, and each one gets
the same value. A promise can have many listeners.

**Check:** Why can you not cancel a promise?

The language has no cancellation for promises. The work carries on. You can
only stop listening to the result. In real code you use `AbortController` to
stop the work itself, or check a flag before acting on the result.

---

← [Types and conversion](04-types.md) · [Contents](index.md) · [The event loop](06-event-loop.md) →
