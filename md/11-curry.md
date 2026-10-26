> This file is generated from `html/11-curry.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 2 · Coding questions -->

# Curry

Currying turns `f(a, b, c)` into `f(a)(b)(c)`. The code is ten lines. The
interview is about knowing when it stops, and about what `fn.length` counts
and what it misses.

## 1. Three words people mix up

| Word | Meaning | Example |
| --- | --- | --- |
| Curry | turn a function with 2 arguments into two functions with 1 argument | `add(1)(2)` |
| Partial application | fix some arguments now, pass the rest later | `addOne = add(1)` |
| Uncurry | turn a curried function back into a normal one | `uncurry(add)(1, 2)` |

In interviews, "curry" usually means "keep taking arguments until you have
enough, then run". That is a mix of the first two. Build that, then say which
strict definition you bent.

## 2. The main version

`fn.length` is the number of parameters the function declares, counting stops
at the first default or rest parameter. Curry collects arguments until it
reaches that number, then runs the function.

*curry.js*

```js
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);        // enough arguments, run it
    }
    return function next(...more) {
      return curried.apply(this, [...args, ...more]);
    };
  };
}

function add3(a, b, c) { return a + b + c; }
const curried = curry(add3);

console.log(curried(1)(2)(3));      // 6, one at a time
console.log(curried(1, 2)(3));      // 6, mixed
console.log(curried(1)(2, 3));      // 6
console.log(curried(1, 2, 3));      // 6, all at once
console.log(curried()(1)(2)(3));    // 6, empty call is harmless
```

> **fn.length gives the wrong number in three cases**

- **Default values:** `(a, b = 1) => …` has length 1. Curry would run after one argument.
- **Rest parameters:** `(...args) => …` has length 0. Curry would run immediately, every time.
- **Bound functions:** `fn.bind(x)` has a shorter length, because some arguments are already filled in.

Say this out loud. It shows you know how it works, not just the trick.

### When the number of arguments is unknown

For `sum(1)(2)(3)` with no fixed count, there is no natural place to stop. Two
common conventions exist.

*variadic.js*

```js
// Convention 1: an empty call means "finish"
function curryVariadic(fn) {
  return function curried(...args) {
    if (args.length === 0) return fn();
    return (...more) =>
      more.length === 0 ? fn(...args) : curried(...args, ...more);
  };
}

const sum = curryVariadic((...ns) => ns.reduce((a, b) => a + b, 0));
console.log(sum(1)(2)(3)());
console.log(sum(1, 2)(3, 4)());

// Convention 2: make the result act like a number when used in maths
function infiniteSum(a) {
  const next = (b) => infiniteSum(a + b);
  next.valueOf = () => a;          // used by +, *, and comparisons
  next.toString = () => String(a);
  return next;
}

console.log("used as a number:", infiniteSum(1)(2)(3)(4)(5) * 1);
console.log("used as a string:", `${infiniteSum(1)(2)(3)}`);
```

The `valueOf` version is a popular puzzle: "make `sum(1)(2)(3) == 6` true". It
works because the object is turned into a number when compared. But it fails
with `===` and prints strangely. Mention that limit if you use it.

## 3. Leaving gaps to fill later

Real curry helpers let you skip an argument and fill it later. You need to
count how many real arguments you have, separately from the total.

*curry-placeholder.js*

```js
const _ = Symbol("gap");

function curryWithGaps(fn) {
  const arity = fn.length;

  return function curried(...args) {
    const filled = args.filter((a) => a !== _).length;

    if (filled >= arity && !args.includes(_)) {
      return fn.apply(this, args);
    }

    return function next(...more) {
      // put the new arguments into the gaps, left to right
      const merged = args.slice();
      let m = 0;
      for (let i = 0; i < merged.length && m < more.length; i++) {
        if (merged[i] === _) merged[i] = more[m++];
      }
      while (m < more.length) merged.push(more[m++]);
      return curried.apply(this, merged);
    };
  };
}

const greet = curryWithGaps((greeting, name, punct) => `${greeting}, ${name}${punct}`);

console.log(greet("Hello")("Ada")("!"));     // normal
console.log(greet(_, "Ada")("Hi")("?"));     // gap filled later
console.log(greet("Hey", _, "!")("Lin"));
```

## 4. Why anyone uses curry

**Reuse without wrappers** `const isAdmin = hasRole("admin")` reads better
than an inline arrow, and the name shows in stack traces.

**Building pipelines** `pipe(trim, toLower, validate)` needs functions with
one argument. Curry adapts functions with more.

**Settings first** Fix the context once, then vary the data many times:
`log("checkout")`.

**Event handlers** `onClick(id)` returns a handler. Same idea, usually written
as a closure.

> **An honest note worth saying**

In normal app code, a plain arrow is usually clearer: `const isAdmin = (u) =>
hasRole("admin", u)`. Curry earns its place in pipelines and library code.
Interviewers like hearing that you would not curry everything.

## 5. Follow-up questions

**Check:** Write curryRight.

Same code, but put new arguments at the front: `curried.apply(this, [...more,
...args])`. Used for building pipelines from right to left.

**Check:** What happens if you curry a function with no parameters?

`fn.length` is 0, so the first call already has enough and runs it. You cannot
delay it. That is why the unknown-argument version needs a rule of its own
instead of using the count.

**Check:** Does curry keep this?

Only if you pass it on, as above with `fn.apply(this, args)` and
`curried.apply(this, …)`. The `this` of the final call is the one used. With
arrows you would lose it without noticing.

**Check:** How do you test a curried function?

Test the full call, and one partial path. Then test the edges: extra
arguments, an empty call, and a function with default values, which shows the
`fn.length` behaviour.

## 6. Check yourself

**Quiz:** What is ((a, b = 2) => a + b).length?

Options:

- A. 1 **← correct**
- B. 2
- C. 0

Counting stops at the first default value. So curry would run after one
argument.

**Check:** Why does each partial call need its own copy of the arguments?

So earlier calls do not affect later ones. Each call returns a new function
holding its own list. Otherwise `const f = curried(1); f(2); f(3)` would
interfere with each other.

---

← [Retry with backoff](10-retry.md) · [Contents](index.md) · [Flatten](12-flatten.md) →
