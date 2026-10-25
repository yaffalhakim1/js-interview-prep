> This file is generated from `html/01-closures.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 1 · Language basics -->

# Closures

A closure is a scope that stays alive after its function returns. That is the whole idea. It is not a new feature and not a new kind of function. It is the name for what happens when an inner function keeps its outer scope alive. You will see why that matters in the first example.

## 1. What a closure is

When you create a function, it remembers the variables around it. Those variables stay alive as long as the function exists.

That is the mechanism. Now the question that matters: why would anyone care about a variable staying alive? Because it lets a function keep state between calls without using a global variable.

**closure.js**

```js
function outer() {
  const x = 1;               // x lives in outer's scope

  function inner() {
    return x;                // inner can read x
  }

  return inner;
}

const fn = outer();          // outer has finished running
console.log(fn());           // 1, and x is still alive
```

`outer()` has returned. Normally its variables would be gone. But `inner` still points at `x`, so `x` stays in memory. That is the whole idea.

## 2. The only thing that makes it a closure

If a closure feels like "just a scope", you are right. It is a scope. The difference is what happens to that scope when the function returns.

**Why this matters**

**A closure is a scope that did not die**

Normally a scope is thrown away when its function returns. A closure is the case where the scope stays alive, because a function still points at it. Nothing new is created. Something old is kept.

Here are two functions. The only difference is what each one returns.

**A: returns a number**

```js
function plain() {
  let count = 0;        // a new `count` on every call
  return ++count;
}

console.log(plain());   // 1
console.log(plain());   // 1  <- it forgot
console.log(plain());   // 1  <- it forgot again
```

Every call makes a fresh `count`. When the call ends, that scope is thrown away. The next call starts from zero again.

**B: returns a function**

```js
function makeCounter() {
  let count = 0;
  return function () { return ++count; };   // this function escapes
}

const c = makeCounter();
console.log(c());       // 1
console.log(c());       // 2  <- it remembered
console.log(c());       // 3  <- it remembered again
```

Same `let count = 0`. Same scope. The difference is that `makeCounter` returned the inner function, and that function still points at `count`. So the scope cannot be thrown away. **That survival is the closure.**

|  | A: returns a number | B: returns a function |
| --- | --- | --- |
| What the call returns | `1` | a function |
| Does anything point at the scope? | No | Yes, the returned function |
| What happens to the scope | Thrown away | Kept alive |
| Second call starts from | `count = 0` | `count = 1` |
| Name for this | Just a scope | A closure |

### The proof: two functions sharing one scope

If the scope were copied, two functions could not see each other's changes. They can. That only works if they share one scope that is still alive.

**shared scope**

```js
function makeCounter() {
  let count = 0;
  return {
    next: () => ++count,     // changes count
    peek: () => count        // reads the same count
  };
}

const counter = makeCounter();
counter.next();
counter.next();

console.log("peek sees the change:", counter.peek());   // 2

// A second call to makeCounter makes a NEW scope, so a new counter
const other = makeCounter();
other.next();

console.log("first counter:", counter.peek());   // 2
console.log("second counter:", other.peek());    // 1
```

`next` and `peek` share one `count`, because both were made inside the same call. `other` has its own `count`, because it came from a different call. So a closure is not one function remembering things. It is a scope that several functions share, which stays alive as long as any of them exists.

**Tip**

**Why you cannot see a closure**

Inside a single function call, a closure looks exactly like a normal scope. Nothing is different yet. You only notice it when a second call remembers something from the first. That is why the idea feels slippery: the effect only appears after the function has already finished.

## 3. Why it works: scope

JavaScript looks up a variable name by **where the function was written**, not where it was called. This is called lexical scope.

**scope chain**

```js
function outer() {
  const x = 1;

  function middle() {
    function inner() {
      return x;              // look in inner, then middle, then outer: found
    }
    return inner;
  }
  return middle();
}
```

When `inner` asks for `x`, the engine checks three places in order: `inner`, then `middle`, then `outer`. This chain of scopes is fixed when the code is written. Renaming things at the call site does not change it.

## 4. Use 1: private state

A closure lets you keep data that outside code cannot touch. You only expose the functions you choose.

**counter.js**

```js
function createCounter(start = 0) {
  let count = start;               // only these methods can see `count`

  return {
    increment() { return ++count; },
    decrement() { return --count; },
    get value() { return count; }
  };
}

const c = createCounter(10);
c.increment();
c.increment();

console.log("value:", c.value);
console.log("can I read count directly?", c.count);   // undefined
```

`count` is not a property of the returned object. So nobody outside can read or change it. They must go through `increment` and `decrement`.

### Short example: run a function only once

This is a common interview question. The answer is one variable that remembers whether we already ran.

**once.js**

```js
function once(fn) {
  let called = false;
  let result;

  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);   // save the value for later calls
    }
    return result;
  };
}

let runs = 0;
const init = once(() => { runs++; return "ready"; });

console.log(init(), init(), init());
console.log("fn ran", runs, "time(s)");
```

The second and third calls return the saved value. They do not run `fn` again.

## 5. Closures remember the variable, not the value

This part confuses many people. A closure does not copy the number. It keeps a link to the variable. If the variable changes later, the closure sees the new value.

**same variable**

```js
function makeAdders() {
  const adders = [];

  for (var i = 0; i < 3; i++) {
    adders.push(function () { return i; });
  }
  return adders;
}

console.log(makeAdders().map(f => f()));   // [3, 3, 3]
```

All three functions were created inside the same `var i` loop. So all three read the same `i`. By the time we call them, the loop has finished and `i` is 3. The output is `[3, 3, 3]`.

### Three ways to fix it

**three fixes**

```js
// 1. `let` creates a new variable on every loop run
const a = [];
for (let i = 0; i < 3; i++) a.push(() => i);

// 2. An IIFE gives each function its own copy as a parameter
const b = [];
for (var i = 0; i < 3; i++) {
  b.push((function (j) { return function () { return j; }; })(i));
}

// 3. A separate function does the same thing more clearly
function makeGetter(j) { return function () { return j; }; }
const c = [];
for (var k = 0; k < 3; k++) c.push(makeGetter(k));

console.log(a.map(f => f()), b.map(f => f()), c.map(f => f()));
```

**Watch out**

**The same trap with setTimeout**

`for (var i = 0; i < 3; i++) setTimeout(() => console.log(i))` prints `3 3 3`. The timers run after the loop has finished. Change `var` to `let` and you get `0 1 2`.

Interviewers use this to test closures and timers at the same time.

## 6. Old values: the stale closure bug

A closure sees the live variable. So if a callback is created once and the variable changes later, the callback may read an old value. This is a real bug you will meet in React.

**stale.js**

```js
function attach() {
  let count = 0;
  const read = () => count;   // reads the live variable

  count = 42;                 // changed after the function was created
  return read;
}

console.log("read after change:", attach()());   // 42, not 0
```

In React the same thing happens with `setInterval`. The callback is created once, so it keeps printing the first `count` forever. The fix is a dependency array or a ref.

## 7. Memory: what keeps a closure alive

A closure keeps its variables in memory while anything can still call it. Usually that is good. It becomes a leak when a long-lived listener holds something large.

**leak.js**

```js
// Leak: this listener lives forever and holds `hugeModel`
window.addEventListener("resize", () => render(hugeModel));

// Fix: remove the listener when you no longer need it
function setup() {
  const handler = () => render(hugeModel);
  window.addEventListener("resize", handler);
  return () => window.removeEventListener("resize", handler);
}
```

**Tip**

**A good sentence to say**

"A closure keeps its variables alive. The leak is not the closure itself. It is a listener or timer that stays attached after we are done with it. Remove the listener and the memory is freed."

## 8. Where closures appear in questions

| Question | What the closure holds |
| --- | --- |
| Debounce / throttle | The timer id and the last arguments |
| Curry | The arguments collected so far |
| Memoize | The cache |
| Once | The "already ran" flag |
| Event emitter | The list of listeners |
| Private state | Variables the outside cannot see |

**Say this in an interview**

"A closure is a function that remembers the scope where it was created. In this debounce, the returned function remembers `timer` and `lastArgs`. So the state survives between calls, and the caller cannot see it."

## 9. Check yourself

**Check:** What does this print?

```js
function build() {
  const out = [];
  for (var i = 0; i < 2; i++) out.push(() => i);
  return out;
}
console.log(build()[0](), build()[1]());
```

`2 2`. Both functions read the same `var`, which ends at 2. Each `build()` call makes a new scope, but inside one call both functions share it.

**Check:** Why does once save the result?

Because the first call may return something useful. If later calls returned `undefined`, callers would get different types at different times. Saving the value keeps the behaviour predictable.

**Check:** Does a closure copy a variable or keep a link to it?

It keeps a link. If you change the variable later, the closure sees the new value. To get a separate copy, create a new variable. That is what `let` does on each loop run.

**Check:** How would you explain a stale closure to a friend?

"The callback was made earlier and never updated. So it keeps reading the value from when it was made. To fix it, make the callback again when the value changes, or read the value from something stable like a ref."

---

[Contents](index.md) · [The this keyword](02-this.md) →
