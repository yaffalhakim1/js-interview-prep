> This file is generated from `html/08-debounce-throttle.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 2 · Coding questions -->

# Debounce and throttle

These two are asked more than any other pair. They test closures, `this`, timers and API design in about thirty lines. The difference is one sentence. Debounce waits for the user to stop. Throttle allows one call every so often.

## 1. The difference

|  | Debounce | Throttle |
| --- | --- | --- |
| Runs when | the calls have stopped for `wait` ms | at most once per `wait` ms |
| 10 quick calls | runs once, at the end | runs about once per interval during the burst |
| How it works | cancel the old timer on every call | remember the last time it ran |
| Used for | search box, form checking, autosave | scroll, resize, drag, mouse move |
| Always runs? | only if the calls stop | yes, if you turn on the trailing call |

**Why this matters**

**The tell in an interview**

If your code does not cancel the old timer, you wrote a throttle. If it cancels and only runs on the first call, you wrote a debounce with `leading` on. The requirements really are unclear, so ask which one they want before you type.

## 2. Debounce, full version

This version has options, passes `this` and the arguments through, and adds `cancel` and `flush`. Those two methods are what separate a good answer from a great one.

**debounce.js**

```js
function debounce(fn, wait, { leading = false, trailing = true } = {}) {
  let timer = null;
  let lastArgs = null;
  let lastThis = null;
  let result;

  function run() {
    result = fn.apply(lastThis, lastArgs);
    lastArgs = lastThis = null;
    return result;
  }

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;                // keep the caller's `this`

    const isFirstCall = timer === null;
    clearTimeout(timer);            // this line makes it a debounce

    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs) run();
    }, wait);

    if (leading && isFirstCall) run();
    return result;
  }

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
    lastArgs = lastThis = null;
  };

  debounced.flush = () => {
    if (timer !== null && lastArgs) {
      clearTimeout(timer);
      timer = null;
      return run();
    }
    return result;
  };

  return debounced;
}

// ── try it ──────────────────────────────────────────────
let calls = 0;
const search = debounce((q) => { calls++; console.log("searching for", q); }, 100);

search("a");
search("ab");
search("abc");
search("abcd");
console.log("four quick calls done, nothing has run yet");

setTimeout(() => console.log("after 250ms, calls =", calls), 250);
```

**Watch out**

**Why not use an arrow for the wrapper**

Because the debounced function is usually a method: `this.handleInput = debounce(this.handleInput, 300)`. With an arrow, `this` is fixed when debounce is created, so every method call gets the wrong object. Use a normal `function` and pass `this` on with `fn.apply(this, args)`.

### Short version, if you run out of time

**debounce-min.js**

```js
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

const log = debounce((msg) => console.log("ran with:", msg), 50);
log("first");
log("second");
log("third");
console.log("three calls queued, only the last one should run");
```

That is a fair interview answer. It handles `this` and the arguments. It does not have `leading`, `trailing` or `cancel`. Say what is missing and you keep the credit.

## 3. Throttle, full version

There are two ways to build this. This one checks the clock, and can also run once at the end so the last event is not lost.

**throttle.js**

```js
function throttle(fn, wait, { leading = true, trailing = true } = {}) {
  let lastTime = 0;
  let timer = null;
  let lastArgs = null;
  let lastThis = null;

  function run() {
    lastTime = Date.now();
    const args = lastArgs;
    const ctx = lastThis;
    lastArgs = lastThis = null;
    fn.apply(ctx, args);
  }

  function throttled(...args) {
    const now = Date.now();
    if (!lastTime && !leading) lastTime = now;      // skip the first call

    const remaining = wait - (now - lastTime);

    if (remaining <= 0) {
      clearTimeout(timer);
      timer = null;
      lastArgs = args;
      lastThis = this;
      run();
      return;
    }

    if (!timer && trailing) {
      lastArgs = args;
      lastThis = this;
      timer = setTimeout(() => {
        timer = null;
        run();
      }, remaining);
    }
  }

  throttled.cancel = () => {
    clearTimeout(timer);
    timer = null;
    lastTime = 0;
  };

  return throttled;
}

// ── try it: 20 calls in about 60ms, limit 50ms ──────────
let runs = 0;
const onScroll = throttle(() => { runs++; }, 50);

let n = 0;
const burst = setInterval(() => {
  onScroll();
  if (++n === 20) {
    clearInterval(burst);
    setTimeout(() => console.log("ran", runs, "times from 20 quick calls"), 150);
  }
}, 3);
```

**Tip**

**The trailing call is the part people forget**

Without it, the last event of a burst is dropped. For scroll position or window size, that last value is the one the user cares about. If you only build the leading call, say so.

## 4. What each option does

| Option | Debounce | Throttle |
| --- | --- | --- |
| `leading: true` | runs on the first call of a burst, then again after the calls stop | runs straight away, then limits the rest |
| `trailing: true` | runs after the calls stop. This is the default. | runs once more at the end of the window |
| both true | up to two runs per burst: start and end | one straight away, plus one at the end |
| both false | never runs. Valid, but useless. | never runs. Same. |

## 5. Which one to use where

**Debounce** Search as you type, autosave, recalculating layout after a resize ends, checking a field once the user stops typing.

**Throttle** Scroll progress bars, drag handles, tracking mouse movement, checking for infinite scroll, limiting a like button.

Both only limit work in the browser. They are not protection for your server. Saying that shows you know where the line is.

## 6. Likely follow-up questions

**Check:** "Add maxWait so it runs at least every N ms."

Save the time of the last real run. On each call, if `now - lastRunTime >= maxWait`, run straight away. That is lodash's `maxWait`: a debounce that becomes a throttle when the input never stops. Autosave needs this. You do not want a user typing for two minutes and never getting a save.

**Check:** "How do you test it?"

With fake timers: `vi.useFakeTimers()` or `jest.useFakeTimers()`. Call the function, move the fake clock, then check how many times it ran. Check three things: the count, the arguments of the last run, and that `this` was the right object. Never test with real waiting.

**Check:** "How do you cancel a pending call when the component unmounts?"

Use the `cancel` method in the cleanup function: `useEffect(() => { const d = debounce(save, 500); return d.cancel; }, [])`. Without it, a timer can fire after the component is gone and write to state that no longer exists.

**Check:** "Can you await a debounced function?"

Not really. It returns whatever the last run returned, which is usually `undefined` on the first call. Callers cannot wait for a pending call unless you wrap it in a promise yourself. That is a real limitation of the API, and worth saying.

**Say this in an interview**

"Debounce waits until the calls stop. Throttle caps how often it can run. I'll keep the timer in a closure, pass `this` and the arguments through with `apply`, and add `cancel` and `flush` so the caller can clean up. Do you want leading, trailing, or both?"

## 7. Check yourself

**Quiz:** A debounced function is called 5 times with 100ms gaps, and wait is 200. How many times does it run?

Options:
- A. Once. Each call resets the timer, and the gap is too short. **← correct**
- B. Five times, once per call
- C. Twice, at the start and the end

With `leading: true` it would be twice.

**Check:** Why is clearTimeout safe on a timer that already ran?

Because it does nothing for an unknown or finished id. So you can call it without checking first. You should still set your variable to `null`, because the code uses `timer === null` to detect the first call.

**Check:** Can you build throttle out of debounce?

Partly. `debounce(fn, wait, { leading: true, trailing: true, maxWait: wait })` behaves like a throttle. That is exactly how lodash does it: one function with options, not two separate algorithms.

---

← [Array methods you write yourself](07-array-polyfills.md) · [Contents](index.md) · [Promise.all and friends](09-combinators.md) →
