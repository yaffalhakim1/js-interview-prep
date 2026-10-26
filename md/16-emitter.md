> This file is generated from `html/16-event-emitter.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 2 · Coding questions -->

# Event emitter

An event emitter lets one part of your code announce that something happened,
and other parts listen. It is about forty lines, and it is a good test of
object design. How do you store listeners? How do you remove one? What if a
listener removes itself while you are calling the others?

## 1. The idea

Keep a map from event name to a list of functions. `on` adds one. `off`
removes one. `emit` calls them all. Everything else is a variation on that.

> **Why interviewers use this question**

There is no algorithm to hide behind. What is left is design. Does `on` return
a way to unsubscribe? What does `emit` return? What if a listener throws? Each
choice is a sentence you have to defend.

## 2. The code

*EventEmitter.js*

```js
class EventEmitter {
  #listeners = new Map();             // event name → Set of functions

  on(event, handler) {
    if (typeof handler !== "function") {
      throw new TypeError("handler must be a function");
    }
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(handler);

    return () => this.off(event, handler);   // hand back a way to unsubscribe
  }

  once(event, handler) {
    const wrapper = (...args) => {
      this.off(event, wrapper);              // remove before calling
      handler.apply(this, args);
    };
    wrapper.original = handler;              // so off(event, handler) still works
    return this.on(event, wrapper);
  }

  off(event, handler) {
    const set = this.#listeners.get(event);
    if (!set) return this;

    if (!handler) {
      this.#listeners.delete(event);         // remove all for this event
      return this;
    }

    if (!set.delete(handler)) {
      // maybe it was wrapped by `once`
      for (const fn of set) {
        if (fn.original === handler) { set.delete(fn); break; }
      }
    }

    if (set.size === 0) this.#listeners.delete(event);
    return this;
  }

  emit(event, ...args) {
    const set = this.#listeners.get(event);
    if (!set || set.size === 0) return false;    // nobody listening

    // Copy first, because a listener may add or remove others
    for (const handler of [...set]) handler.apply(this, args);
    return true;
  }

  count(event) {
    return this.#listeners.get(event)?.size ?? 0;
  }
}

// ── try it ──────────────────────────────────────────────
const bus = new EventEmitter();
const seen = [];

const unsubscribe = bus.on("save", (p) => seen.push("A:" + p.id));
bus.on("save", (p) => seen.push("B:" + p.id));
bus.once("save", (p) => seen.push("once:" + p.id));

bus.emit("save", { id: 1 });
bus.emit("save", { id: 2 });

unsubscribe();                          // A is gone
bus.emit("save", { id: 3 });

console.log(seen);
console.log("listeners left:", bus.count("save"));
```

## 3. The choices, and why

| Choice | What I did | Why |
| --- | --- | --- |
| How to store them | `Map` of `Set` | Fast add and remove, no duplicates, keeps order |
| What `on` returns | a function that unsubscribes | You cannot forget to call `off` with the right reference |
| What `emit` returns | true if anyone was listening | Lets the caller notice an event nobody handled |
| How to loop | over a copy | A listener that unsubscribes does not skip the next one |
| Empty event | removed from the map | Stops the map growing with empty entries |
| `off` with no handler | removes all for that event | Matches Node, and it is the usual cleanup call |

> **The bug that bites: changing the list while looping**

If you loop over the live `Set` and a listener removes itself, the loop skips
the next listener. It silently never runs. Copying with `[...set]` prevents
it. It is the same class of bug as removing items from a live
`HTMLCollection`.

## 4. What if a listener throws?

In the code above, the error reaches whoever called `emit` and the remaining
listeners are skipped. Node's emitter does the same. Whether that is right
depends on what you are building.

*isolate.js*

```js
class SafeEmitter {
  #listeners = new Map();

  on(event, handler) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(handler);
    return () => this.#listeners.get(event)?.delete(handler);
  }

  emit(event, ...args) {
    const set = this.#listeners.get(event);
    if (!set) return;

    for (const handler of [...set]) {
      try {
        handler(...args);
      } catch (err) {
        // one bad listener must not break the others
        console.log('a listener for "' + event + '" threw: ' + err.message);
      }
    }
  }
}

const bus = new SafeEmitter();
bus.on("tick", () => { throw new Error("boom"); });
bus.on("tick", () => console.log("the second listener still ran"));
bus.emit("tick");
```

Catching each error is usually right for UI events like logging and analytics.
It is usually wrong for data pipelines, where a failure should stop
everything. Say which one you are building.

## 5. Memory leaks: the real-world failure

*leak.js*

```js
// A component listens when it mounts…
function mount(bus) {
  const state = { heavy: new Array(10_000).fill("x") };
  bus.on("resize", () => console.log("saw", state.heavy.length));
  // …and never unsubscribes. The closure keeps `state` alive forever.
}

// The fix: keep the handle and return it from cleanup
function mountFixed(bus) {
  const state = { heavy: [] };
  const off = bus.on("resize", () => console.log("fixed:", state.heavy.length));
  return () => off();       // in React, return this from useEffect
}

console.log("see the four leak patterns below");
```

Four ways this leaks in real code:

1. You forget to unsubscribe when the component is removed.
2. You never clean up listener sets that became empty.
3. You use one global bus for everything, including per-request listeners.
4. You add a `once` listener for an event that never happens.

> **One sentence that explains it**

"An emitter leak is a listener that lives longer than its owner. The closure
keeps everything it touched alive, so it is not a few bytes. It is the whole
state. Always return an unsubscribe and call it on cleanup."

## 6. Variations they might ask for

**Check:** Wildcard events, like bus.on("user:*", fn).

Keep a second map of patterns, or check every registered name against the
event being sent. Checking every pattern on each emit is slow if you have
thousands. Fine for a handful. Also decide the order: exact matches first,
then patterns, or strictly by the order they were added.

**Check:** Should emit be synchronous?

Node's is. Making it async, with `queueMicrotask` per listener, means a
listener that throws cannot break the sender. But it changes the order things
happen and makes debugging harder. Synchronous by default, and let the caller
decide if they want to delay.

**Check:** How do you test an emitter?

Check how many times each event ran, that arguments were passed through, that
`once` ran exactly once, that unsubscribing really stops delivery, and that
`off` works with a wrapped handler. Also test the remove-while-emitting case.
That is the one most people forget.

**Check:** How is this different from addEventListener?

The DOM gives you capture and bubble phases, `preventDefault`, and control
over propagation. An emitter is a flat list with no tree. If you need a tree,
use the DOM. If you need modules that do not know about each other, use an
emitter.

## 7. Check yourself

**Quiz:** Why loop over a copy of the listener list in emit?

Options:

- A. So a listener that unsubscribes does not skip the next one **← correct**
- B. For speed
- C. To run them in reverse

Changing a list while looping is the bug. Copying is the fix. It costs one
small allocation per emit.

**Check:** How could you build once without a wrapper?

Store objects like `{ handler, once: true }` and have `emit` delete them after
calling. That avoids the "the wrapper is not the same function" problem in
`off`, at the cost of a slightly more complex `emit`. Both are fine. Pick one
and say why.

---

← [The DOM and events](15-dom.md) · [Contents](index.md) · [classnames and JSON](17-utilities.md) →
