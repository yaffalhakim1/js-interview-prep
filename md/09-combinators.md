> This file is generated from `html/09-promise-combinators.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 2 · Coding questions -->

# Promise.all and friends

There are four helpers for running several promises together. They share the same traps: keep the results in input order, handle an empty list, and accept plain values. Writing `all` takes fifteen lines. The score comes from explaining when to use the other three.

## 1. The four, side by side

| Method | Finishes with | Fails when | Use it when |
| --- | --- | --- | --- |
| `all` | all values, in input order | the first one fails | you need every result |
| `allSettled` | every outcome, success or failure | never | some may fail and that is fine |
| `any` | the first success | all of them fail | you have backups, first one wins |
| `race` | whichever finishes first | if that one failed | a timeout, or the fastest source |

**Why this matters**

**Two words that decide your answer**

`all` stops at the **first** failure. It does not wait for the rest. `any` waits for the **last** failure before giving up. Mixing those up is the most common mistake in this question.

## 2. Writing Promise.all

**promiseAll.js**

```js
function promiseAll(list) {
  return new Promise((resolve, reject) => {
    const items = Array.from(list);
    const results = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) return resolve([]);   // empty list finishes straight away

    items.forEach((item, i) => {
      Promise.resolve(item).then((value) => {
        results[i] = value;                    // use the index, so order is kept
        if (--remaining === 0) resolve(results);
      }, reject);                              // one failure and we are done
    });
  });
}

// ── try it ──────────────────────────────────────────────
const slow = (v, ms) => new Promise((r) => setTimeout(() => r(v), ms));

promiseAll([slow("a", 60), "plain value", slow("c", 10)])
  .then((v) => console.log("kept input order:", v));

promiseAll([Promise.reject(new Error("nope")), slow("ignored", 10)])
  .catch((e) => console.log("failed:", e.message));

promiseAll([]).then((v) => console.log("empty list:", v));
```

**Watch out**

**Three bugs that keep appearing**

1. **Pushing as each one finishes.** Then the order is finish order, which is wrong. Use the index.
2. **Not handling an empty list.** The promise stays pending forever. This has frozen real apps.
3. **Not using `Promise.resolve()`.** A plain value has no `.then`, so `item.then(...)` throws.

## 3. Writing allSettled

Same idea, but every failure is turned into a normal value. So the outer promise can never fail.

**allSettled.js**

```js
function allSettled(list) {
  return Promise.all(
    Array.from(list).map((item) =>
      Promise.resolve(item).then(
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason })
      )
    )
  );
}

const ok = Promise.resolve("saved");
const bad = Promise.reject(new Error("offline"));

allSettled([ok, bad, "plain value"]).then((results) => {
  console.log(results);
  const failures = results.filter((r) => r.status === "rejected");
  console.log("how many failed:", failures.length);
});
```

This is the one to use for bulk work. Upload ten files, report which ones failed, keep the ones that worked. In an interview, the phrase "some may fail and that is fine" is what shows you know when to use it.

## 4. Writing Promise.any

**promiseAny.js**

```js
function promiseAny(list) {
  return new Promise((resolve, reject) => {
    const items = Array.from(list);
    const errors = new Array(items.length);
    let remaining = items.length;

    if (remaining === 0) {
      return reject(new AggregateError([], "all of them failed"));
    }

    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (err) => {
        errors[i] = err;
        if (--remaining === 0) {
          reject(new AggregateError(errors, "all of them failed"));
        }
      });
    });
  });
}

const fail = (msg, ms) => new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms));

promiseAny([fail("a", 20), Promise.resolve("winner"), fail("c", 5)])
  .then((v) => console.log("first success:", v));

promiseAny([fail("x", 5), fail("y", 10)])
  .catch((e) => {
    console.log(e.name, "·", e.errors.map((err) => err.message).join(", "));
  });
```

`AggregateError` is a real error type with an `errors` array. Most people miss that.

## 5. Writing Promise.race

**promiseRace.js**

```js
function promiseRace(list) {
  return new Promise((resolve, reject) => {
    for (const item of Array.from(list)) {
      Promise.resolve(item).then(resolve, reject);   // first one decides
    }
    // an empty list stays pending forever, same as the real one
  });
}

const slow = (v, ms) => new Promise((r) => setTimeout(() => r(v), ms));

promiseRace([slow("slow", 40), slow("fast", 5)])
  .then((v) => console.log("winner:", v));

// The usual real use: a timeout
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("took longer than " + ms + "ms")), ms)
  );
  return promiseRace([promise, timeout]);
}

withTimeout(slow("too late", 100), 20)
  .catch((e) => console.log("timeout:", e.message));
```

**Tip**

**race does not stop the loser**

The slower promise keeps running. Its result is just ignored. If the work is a `fetch`, pass an `AbortController` signal so the request is actually cancelled. Otherwise you saved time but not bandwidth. Saying this is a strong signal.

## 6. The real follow-up: limit how many run at once

`Promise.all` on 10,000 URLs opens 10,000 requests. The practical answer is a pool that only runs a few at a time.

**mapLimit.js**

```js
async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  async function run() {
    while (next < items.length) {
      const i = next++;          // claimed immediately, so no two workers take the same one
      results[i] = await worker(items[i], i);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, run);
  await Promise.all(runners);
  return results;
}

const work = (n) => new Promise((r) => setTimeout(() => r(n * 2), 10));

mapLimit([1, 2, 3, 4, 5, 6], 2, work)
  .then((v) => console.log("results:", v));
```

Note the important part: `next++` happens immediately, so two workers can never grab the same index. That is what makes it safe.

## 7. Check yourself

**Quiz:** Promise.all([p1, p2]), where p1 fails at 10ms and p2 succeeds at 50ms. What happens?

Options:
- A. It fails at 10ms, and p2's value is thrown away **← correct**
- B. It waits for both, then fails
- C. It succeeds with a missing value

`all` stops at the first failure. `allSettled` is the one that waits for everything.

**Check:** Why does Promise.all([]) finish at once, but Promise.race([]) never finishes?

`all` knows there is nothing left to wait for, so it gives an empty array. `race` needs one promise to finish, and there are none, so it waits forever.

**Check:** Can allSettled ever fail?

Not because of its inputs, that is the whole point. It can still throw immediately if you pass something that is not a list, because the argument is checked before the promise work starts.

**Check:** How would you try three mirrors and take the first that works?

`Promise.any(mirrors.map(fetchFrom))`, then `.catch(() => fallback())` for when all three fail. If you also need a time limit, race the whole thing against a timer.

---

← [Debounce and throttle](08-debounce.md) · [Contents](index.md) · [Retry with backoff](10-retry.md) →
