> This file is generated from `html/06-event-loop.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 1 · Language basics -->

# The event loop

JavaScript runs one function at a time. Everything else waits in a queue for its turn. Almost every "what is the output order" question can be answered with one rule, applied carefully.

## 1. The four pieces

**Call stack** Where normal code runs. One function at a time. When it is empty, JavaScript is free.

**The browser (or Node)** Timers, network requests and click events wait here, outside JavaScript. When they finish, they put a callback in a queue.

**Task queue** `setTimeout`, `setInterval`, network callbacks, click events.

**Microtask queue** Promise callbacks and `queueMicrotask`. This queue always goes first.

## 2. The rule

**Why this matters**

**Learn these three lines**

1. Run all the normal code until the stack is empty.
2. Then run **every** microtask, including any new ones they add.
3. Then take **one** task from the task queue. After it, go back to step 2.

Drawing happens between tasks, not in the middle of one.

**the classic question**

```js
console.log("1");

setTimeout(() => console.log("2"), 0);

Promise.resolve().then(() => console.log("3"));

queueMicrotask(() => console.log("4"));

console.log("5");
```

**Check:** Work it out

Normal code first: `1`, `5`. Then microtasks in the order they were added: `3`, `4`. Then the timer: `2`. So the answer is **1 5 3 4 2**.

## 3. Microtasks can add more microtasks

The microtask queue is emptied completely. So a microtask that adds another microtask runs before any timer, even if the timer was set first.

**nested.js**

```js
setTimeout(() => console.log("timer 1"), 0);

Promise.resolve()
  .then(() => {
    console.log("micro 1");
    Promise.resolve().then(() => console.log("micro 2 (added inside)"));
  })
  .then(() => console.log("micro 3"));

setTimeout(() => console.log("timer 2"), 0);
```

**Check:** Show the order

`micro 1, micro 3, micro 2 (added inside), timer 1, timer 2`

Why `micro 3` comes before `micro 2`: when the queue starts, both the first `then` and the chained `then` are already in it. The nested one is added at the end, so it waits. The timers only start when the queue is empty.

## 4. How await fits in

`await v` works like `Promise.resolve(v).then(rest)`. Everything after the `await` becomes a microtask. That one sentence explains every ordering question with async functions.

**async-order.js**

```js
async function one() {
  console.log("one: start");
  await null;                 // pause here
  console.log("one: after await");
}

async function two() {
  console.log("two: start");
  await null;
  console.log("two: after await");
}

console.log("sync start");
one();
two();
Promise.resolve().then(() => console.log("plain then"));
console.log("sync end");
```

**Check:** Show the order

`sync start, one: start, two: start, sync end, one: after await, two: after await, plain then`

Each async function runs normally until its first `await`, then adds the rest to the microtask queue. The plain `then` was added after both of them, so it runs last.

## 5. Timers are not exact

**delay.js**

```js
const start = Date.now();

setTimeout(() => {
  console.log("timer ran after", Date.now() - start, "ms (asked for 0)");
}, 0);

// A long block of normal code delays every queued callback
const end = Date.now() + 120;
while (Date.now() < end) { /* busy for 120ms */ }

console.log("blocking work finished");
```

`setTimeout(fn, 0)` means "run this soon", not "run this now". It does not guarantee 0 milliseconds. If you need to measure work, use `performance.now()`, not timers.

## 6. Where drawing fits in

The browser can only draw when JavaScript is not running. Within one frame: `requestAnimationFrame` callbacks run, then styles and layout, then the screen updates.

- **Visual changes** go in `requestAnimationFrame`.
- **Low-priority work** goes in `setTimeout(0)`, or better, `requestIdleCallback`.
- **Work that must happen before drawing** goes in a microtask.

**Watch out**

**A microtask loop freezes the page**

If a microtask keeps adding another microtask, the queue never empties. The browser never gets to draw or run timers. The tab freezes. That is why "wait a moment" code uses `setTimeout` and not a promise loop.

## 7. How to work out any order question

1. Write down every line of normal code in order. Cross them off as you go.
2. Every callback you *register* goes into a waiting list. Keep two lists: microtasks and tasks.
3. When normal code ends, read the microtask list left to right. If one adds another, put it on the right.
4. Then take one task. After it, empty the microtasks again. Repeat.
5. `await` means "the rest is a microtask". `setTimeout` is a task.

**mixed.js, try it before you look**

```js
async function main() {
  console.log("main start");
  await Promise.resolve();
  console.log("main continued");
}

console.log("script start");
setTimeout(() => console.log("timeout"), 0);
main();

new Promise((res) => {
  console.log("inside the executor");
  res();
}).then(() => console.log("then A"));

console.log("script end");
```

**Check:** Show the full order

`script start, main start, inside the executor, script end, main continued, then A, timeout`

`main start` and the executor both run immediately. Two microtasks were added: `main`'s continuation first (the `await` happened before the `.then`), then `then A`.

## 8. Node works the same way

Node has the same two queues with the same priority. It just groups the task queue into stages. `process.nextTick` has its own queue that runs before promise callbacks. You do not need the stage details for a front-end interview. "nextTick runs before promises, and both run before timers" is enough.

## 9. Check yourself

**Quiz:** Which runs first: a setTimeout(…, 0) set before a promise's .then?

Options:
- A. The `.then`, because microtasks always go first **← correct**
- B. The timer, because it was set first
- C. It is random

The queue matters more than the order you wrote them. Order only matters inside the same queue.

**Check:** Why does a 5-second loop freeze the whole page?

The stack never becomes empty. So the event loop never reaches the point where it can run callbacks, animation frames or drawing. The page stops responding.

**Check:** Does setTimeout(fn, 0) always run before a click handler?

No. Both are tasks. Whichever was queued first runs first, and that depends on real timing. Never build logic on that assumption.

---

← [Promises and async/await](05-promises.md) · [Contents](index.md) · [Array methods you write yourself](07-array-polyfills.md) →
