> This file is generated from `html/02-this.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 1 · Language basics -->

# The this keyword

`this` is the object a function is working on. Its value is decided when you **call** the function, not when you write it. There are four rules. Learn them in order and you can answer any question about `this`.

## 1. The four rules

Check them from top to bottom. The first rule that matches wins.

| Order | Rule | How you call it | `this` becomes |
| --- | --- | --- | --- |
| 1 | `new` | `new Fn()` | the new object |
| 2 | Explicit | `fn.call(o)` | whatever you passed |
| 3 | Implicit | `obj.fn()` | `obj` |
| 4 | Default | `fn()` | `undefined` in strict mode |

**rules.js**

```js
"use strict";

function who() { return this && this.name; }

// Rule 4: plain call. No object, so `this` is undefined.
console.log("plain call:", who());

// Rule 3: called on an object. `this` is that object.
const alice = { name: "alice", say: who };
console.log("on an object:", alice.say());

// Rule 2: you choose the object yourself.
const bob = { name: "bob" };
console.log("call:", who.call(bob));
console.log("apply:", who.apply(bob));
console.log("bind:", who.bind(bob)());

// Rule 1: `new` beats even bind
function Person(name) { this.name = name; }
const BoundPerson = Person.bind({ name: "ignored" });
console.log("new wins:", new BoundPerson("grace").name);
```

The last line surprises people. `new` wins over `bind`. `new` creates a fresh object and uses that as `this`, so the bound value is ignored for that call.

## 2. The most common bug: losing this

Rule 3 depends on the object being there at the call. If you move the function into a variable, the object is gone.

**lost-this.js**

```js
"use strict";
const user = {
  name: "ada",
  greet() { return `hi, ${this.name}`; }
};

console.log("normal call:", user.greet());

const detached = user.greet;   // the object is no longer attached

try {
  detached();                  // `this` is undefined here
} catch (e) {
  console.log("detached fails:", e.message);
}

const safe = user.greet.bind(user);
console.log("after bind:", safe());
```

**Watch out**

**This is why debounce uses function, not an arrow**

The wrapper inside `debounce` must pass the caller's `this` through. It does that with `fn.apply(this, args)`. If you write the wrapper as an arrow, it captures `this` from where debounce was created, and every method that uses it breaks.

## 3. Arrow functions do not have their own this

An arrow function borrows `this` from the code around it. It also ignores `call`, `apply` and `bind`.

**arrows.js**

```js
const timer = {
  seconds: 0,

  broken() {
    setTimeout(function () {
      // a normal function gets its own `this`, so this is not `timer`
      console.log("normal fn:", this && this.seconds);
    }, 0);
  },

  works() {
    setTimeout(() => {
      // an arrow keeps the `this` from `works`
      this.seconds++;
      console.log("arrow fn:", this.seconds);
    }, 0);
  }
};

timer.broken();
timer.works();
```

Simple rule: use `function` when `this` must come from the caller. Use an arrow when you want the `this` from around it.

### Arrow functions also have no arguments

**arguments.js**

```js
function classic() {
  return arguments.length;        // normal functions get `arguments`
}

console.log("normal function:", classic(1, 2, 3));

// Use rest parameters instead. They work in both kinds of function.
const modern = (...args) => args.length;
console.log("rest parameter:", modern(1, 2, 3));
```

## 4. call, apply and bind

| Method | How you pass arguments | What it returns |
| --- | --- | --- |
| `call` | one by one | the result |
| `apply` | as an array | the result |
| `bind` | one by one | a new function |

Writing these yourself is a common follow-up. The trick is simple: put the function on the object for a moment, then call it from the object. Rule 3 then gives you the right `this`.

**myCall / myApply / myBind**

```js
Function.prototype.myCall = function (ctx, ...args) {
  ctx = ctx == null ? globalThis : Object(ctx);

  const key = Symbol("fn");    // unique key, so we do not overwrite a real property
  ctx[key] = this;

  try {
    return ctx[key](...args);  // called on ctx, so `this` is ctx
  } finally {
    delete ctx[key];           // always clean up
  }
};

Function.prototype.myApply = function (ctx, args = []) {
  return this.myCall(ctx, ...args);
};

Function.prototype.myBind = function (ctx, ...boundArgs) {
  const fn = this;

  return function bound(...laterArgs) {
    if (new.target) {
      return new fn(...boundArgs, ...laterArgs);   // keep `new` working
    }
    return fn.myCall(ctx, ...boundArgs, ...laterArgs);
  };
};

function describe(city) { return `${this.name} from ${city}`; }
const p = { name: "Jean" };

console.log(describe.myCall(p, "Paris"));
console.log(describe.myApply(p, ["Lyon"]));
console.log(describe.myBind(p)("Nice"));
```

**Tip**

**Four things to mention**

- Use a `Symbol` key so you do not overwrite a real property.
- Clean up in `finally`, so a throwing function does not leave the object changed.
- `bind` must keep working with `new`. That is what the `new.target` check does.
- A bound `this` cannot be overridden by a later `call`.

## 5. Classes and methods

Methods on a class live on the prototype, so they use rule 3. That means they also lose `this` when detached.

**class.js**

```js
class Button {
  label = "save";

  // normal method: `this` depends on how it is called
  handlePrototype() { return this.label; }

  // arrow property: `this` is always this instance
  handleArrow = () => this.label;
}

const b = new Button();
const { handlePrototype, handleArrow } = b;

console.log("arrow property:", handleArrow());

try {
  handlePrototype();
} catch (e) {
  console.log("normal method fails:", e.name);
}
```

The arrow property has a cost. It creates one function per instance instead of one shared function on the prototype. Worth mentioning if you are asked about performance.

## 6. Two edge cases

### 1. this inside a map callback

`map` and `forEach` take a second argument. That argument becomes the callback's `this`. Without it, `this` is `undefined`.

**thisArg.js**

```js
"use strict";
const ctx = { factor: 10 };

// second argument = `this` inside the callback
const out = [1, 2].map(function (n) { return n * this.factor; }, ctx);
console.log("with thisArg:", out);

try {
  [1, 2].map(function (n) { return n * this.factor; });
} catch (e) {
  console.log("without thisArg:", e.name);
}
```

### 2. this at the top of a file

In a module, top-level `this` is `undefined`. In an old script it is `window`. In Node it is `module.exports`. Same keyword, three answers. So "it depends" is the right first word in your answer.

## 7. Check yourself

**Quiz:** What is this in obj.method.call(other)?

Options:
- A. `obj`
- B. `other`, because explicit beats implicit **← correct**
- C. `undefined`

Explicit beats implicit. Only `new` beats explicit.

**Check:** Why does debounce need fn.apply(this, args)?

Because the debounced function is often a method. Passing the caller's `this` and arguments through means the delayed call behaves exactly like the original method call.

**Check:** Can you set this on an arrow function?

No. Arrow functions ignore `call`, `apply` and `bind` for `this`. `bind` still returns a new function with fixed arguments, which is why people think it worked.

**Check:** What is this inside a getter?

The object you read from. `obj.x` makes `this` equal `obj`. A static method is different: its `this` is the class itself.

---

← [Closures](01-closures.md) · [Contents](index.md) · [Prototypes and classes](03-prototypes.md) →
