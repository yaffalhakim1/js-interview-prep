> This file is generated from `html/02-this.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 1 · Language basics -->

# The this keyword

`this` answers one question: **which object is this function working on?** The function does not decide the answer. The code that *calls* it decides. Once that clicks, the four rules are just the four ways to call a function.

## 1. What this actually is

Start with a problem. You have a function that prints a greeting. You want it to work for many people, not just one.

You could pass the person in as an argument:

**without this**

```js
function greet(person) {
  return "Hello, " + person.name;
}

const alice = { name: "Alice" };
const bob = { name: "Bob" };

console.log(greet(alice));   // Hello, Alice
console.log(greet(bob));     // Hello, Bob
```

That works. But now watch what happens when you put the function *on* the object instead:

**with this**

```js
const alice = {
  name: "Alice",
  greet() { return "Hello, " + this.name; }   // `this` = whoever is before the dot
};

const bob = {
  name: "Bob",
  greet() { return "Hello, " + this.name; }
};

console.log(alice.greet());   // Hello, Alice
console.log(bob.greet());     // Hello, Bob
```

Same function body. Two different answers. Nothing was passed in. `this` was filled in by the call itself.

**Why this matters**

**The whole idea in one line**

**`this` is the object written before the dot.** `alice.greet()` makes `this` equal `alice`. `bob.greet()` makes it `bob`. One function, reused, no argument needed.

### Why not just pass the object in?

Because it lets many objects share one function. Look at the memory cost:

**shared vs copied**

```js
function greet() { return "Hello, " + this.name; }

// Each object points at the SAME function
const alice = { name: "Alice", greet };
const bob = { name: "Bob", greet };

console.log("same function?", alice.greet === bob.greet);   // true
console.log("different results:", alice.greet(), "·", bob.greet());
```

One function on the prototype, a thousand objects using it, and `this` tells it which object it is serving right now. That is the reason `this` exists.

**Tip**

**Why this feels slippery**

You cannot read `this` off the function. You have to look at the line that *calls* it. The function is the same in both objects above. Only the call site differs. That is why the rules below are about *calling*, not about writing.

## 2. The four ways to call a function

Every call is one of four shapes. The shape decides `this`. Check them from top to bottom. The first one that matches wins.

| Order | Name | You wrote | So `this` is | Plain English |
| --- | --- | --- | --- | --- |
| 1 | `new` | `new Person()` | the brand new object | "Make a fresh object and use it." |
| 2 | You choose | `fn.call(alice)` | what you passed in | "Use this object, I'm telling you which." |
| 3 | The dot | `alice.fn()` | `alice` | "Use the thing before the dot." |
| 4 | Nothing | `fn()` | `undefined` | "No object given. There is nothing to use." |

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

## 3. The most common bug: losing this

Rule 3 says `this` is the thing before the dot. So what happens when there is no dot? The object is gone.

This bites in one very common situation: you take a method out of an object to use it somewhere else.

**lost-this.js**

```js
"use strict";
const user = {
  name: "ada",
  greet() { return `hi, ${this.name}`; }
};

// With the dot: `this` is user
console.log("normal call:", user.greet());

// Without the dot: the object is gone
const detached = user.greet;
try {
  detached();
} catch (e) {
  console.log("detached fails:", e.message);
}

// Fix it: glue the object back on
const safe = user.greet.bind(user);
console.log("after bind:", safe());
```

`detached()` has no object before the dot. So `this` is `undefined`, and `this.name` throws. The function did not change. Only the call changed.

**Watch out**

**This is why debounce uses function, not an arrow**

The wrapper inside `debounce` must pass the caller's `this` through. It does that with `fn.apply(this, args)`. If you write the wrapper as an arrow, it captures `this` from where debounce was created, and every method that uses it breaks.

## 4. Arrow functions ignore all of this

An arrow function has no `this` of its own. It borrows the `this` from the code around it, permanently. It also ignores `call`, `apply` and `bind`.

That is either exactly what you want, or a bug. Here is the same timer written both ways:

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

So: use `function` when `this` must come from whoever calls it. Use an arrow when you want the `this` from the code around it. Inside a method, that almost always means an arrow.

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

## 5. call, apply and bind

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

## 6. Classes and methods

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

## 7. Two edge cases

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

## 8. Putting it together

Before you answer any `this` question, do three things in order.

**1. Find the call** Not the function. Scroll to the line that actually runs it. That line holds the answer.

**2. Look just before the bracket** Is there a dot? Then `this` is what is before it. No dot? Nothing to use.

**3. Check for a trap** Is it an arrow? Then ignore steps 1 and 2, and look at where it was written instead.

Work through four calls to the same function. All four give a different answer, and you can predict each one before running it.

**predict, then run**

```js
"use strict";
function whoAmI() { return this === undefined ? "nobody" : this.name; }

const alice = { name: "Alice", whoAmI };
const bob = { name: "Bob" };

// 1. There is a dot. `this` is alice.
console.log("alice.whoAmI()      →", alice.whoAmI());

// 2. No dot. `this` is undefined.
console.log("whoAmI()            →", whoAmI());

// 3. You chose bob yourself.
console.log("whoAmI.call(bob)    →", whoAmI.call(bob));

// 4. `new` beats everything, including the dot.
const fresh = new alice.whoAmI();
console.log("new alice.whoAmI()  →", fresh.name === undefined ? "the new object" : fresh.name);
```

**Tip**

**The one-sentence version**

**`this` is the object before the dot at the call site.** Everything else in this page is a special case of that sentence. `new` puts a fresh object before the dot. `call` and `bind` let you write the object yourself. An arrow has no dot of its own, so it borrows the one from around it.

## 9. Check yourself

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
