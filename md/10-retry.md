> This file is generated from `html/10-retry-backoff.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 2 · Coding questions -->

# Retry with backoff

A small helper that shows whether you have run real code. The code is short.
The judgement is in three questions. What should be retried? How long are you
willing to wait? How does the caller stop it?

## 1. Start simple

*retry-naive.js*

```js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, tries = 3, delay = 100) {
  try {
    return await fn();
  } catch (err) {
    if (tries <= 0) throw err;
    await sleep(delay);
    return retry(fn, tries - 1, delay);   // same delay every time
  }
}

let attempt = 0;
const flaky = async () => {
  attempt++;
  if (attempt < 3) throw new Error("attempt " + attempt + " failed");
  return "worked on attempt " + attempt;
};

retry(flaky, 3, 50)
  .then(console.log)
  .catch((e) => console.log("gave up:", e.message));
```

It works. What is wrong for real use: the same delay hammers a server that is
already struggling, there is no limit on total time, the caller cannot stop
it, and it retries errors that will never succeed, like a 404.

## 2. Backoff means waiting longer each time

The delay doubles: 100ms, 200ms, 400ms, 800ms. Add a maximum so the wait never
gets silly.

| Try | Delay (start 100ms, doubling) | With a 1000ms cap |
| --- | --- | --- |
| 1 | 100ms | 100ms |
| 2 | 200ms | 200ms |
| 3 | 400ms | 400ms |
| 4 | 800ms | 800ms |
| 5 | 1600ms | 1000ms |

### Why add randomness

If a thousand users fail at the same moment, they all retry at the same
moment. The server gets hit again and stays down. Adding a random amount
spreads them out. That is called jitter.

- **Full jitter:** a random time between 0 and the delay. Spreads the most.
- **Equal jitter:** half the delay plus a random part. Keeps a minimum wait.
- **Decorrelated:** a random time between the base and three times the last delay. For long-running clients.

## 3. The version to write in an interview

*retry.js*

```js
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => {
    clearTimeout(t);
    reject(new Error("aborted"));
  }, { once: true });
});

async function retry(fn, {
  tries = 3,
  baseDelay = 100,
  factor = 2,
  maxDelay = 5000,
  jitter = true,
  shouldRetry = () => true,
  onRetry = () => {},
  signal,
} = {}) {
  let attempt = 0;

  for (;;) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (signal?.aborted) throw err;
      if (attempt >= tries) throw err;
      if (!shouldRetry(err, attempt)) throw err;

      const raw = Math.min(baseDelay * factor ** attempt, maxDelay);
      const wait = jitter ? Math.random() * raw : raw;

      attempt++;
      onRetry(err, attempt, wait);
      await sleep(wait, signal);
    }
  }
}

// ── try it ──────────────────────────────────────────────
let n = 0;
const flaky = async () => {
  n++;
  if (n < 4) {
    const err = new Error("server said 503");
    err.status = 503;
    throw err;
  }
  return "worked on attempt " + n;
};

retry(flaky, {
  tries: 5,
  baseDelay: 40,
  jitter: false,
  shouldRetry: (err) => err.status >= 500,   // never retry a 404
  onRetry: (err, attempt, wait) =>
    console.log("retry " + attempt + " in " + wait + "ms after: " + err.message),
})
  .then((v) => console.log(v))
  .catch((e) => console.log("failed:", e.message));
```

> **Five things this version gets right**

- **It stops.** There is a limit on tries and on the delay.
- **It is picky.** `shouldRetry` keeps 404s and code bugs out of the loop.
- **It tells you.** `onRetry` lets the caller log or show progress.
- **It can be stopped.** The `signal` also interrupts the wait, not just the request.
- **It adds randomness**, so many clients do not retry together.

## 4. Stopping the wait matters too

Cancelling only the request is not enough. A pending `sleep` keeps the loop
alive, and the function will call `fn` again after the caller has moved on.
Passing the signal into the sleep is what makes stopping instant.

*abort.js*

```js
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal.addEventListener("abort", () => {
    clearTimeout(t);
    reject(new Error("aborted"));
  }, { once: true });
});

const controller = new AbortController();
setTimeout(() => controller.abort(), 30);

sleep(500, controller.signal)
  .then(() => console.log("waited the full time"))
  .catch((e) => console.log("wait interrupted:", e.message));
```

## 5. The judgement questions

**Check:** What must never be retried blindly?

Actions that change something: charging a card, creating an order, sending an
email. A retry after a timeout can do the action twice. The fix is a unique id
the server can recognise, not a loop in the browser.

**Check:** How do you stop the total wait getting too long?

Work out the budget first. Five tries with a 100ms start and doubling is about
3.1 seconds, plus request time. Either limit the number of tries, limit the
delay, or pass a deadline and stop when it passes. In a browser the real
deadline is the user's patience. Show a spinner and a cancel button.

**Check:** Should the browser retry, or the server?

Both, for different problems. The browser handles a brief network blip. The
server handles a failing service behind it, using a queue. A browser should
not be the safety net for a flaky backend. It should fail and let the user try
again on purpose.

**Check:** How do you test it without real waiting?

Fake timers. Check how many times it ran, the order of the delays, that
`shouldRetry` was asked, and that stopping it prevents more tries. Also test
the case where it works first time. The loop must not wait at all.

> **Say this in an interview**

"I'd use backoff that doubles, with a random part and a maximum delay. I'd
only retry failures worth retrying: network errors and 5xx. I'd accept an
AbortSignal so the wait itself can be cancelled. For actions that change data,
I'd add a unique id instead of retrying blindly."

## 6. Check yourself

**Quiz:** Why add randomness to the delay?

Options:

- A. To make the average wait shorter
- B. So many clients do not retry at the same moment **← correct**
- C. To make tests repeatable

It spreads them out. Repeatable tests are the opposite of what randomness
gives you.

**Check:** What is wrong with retry(() => fetch(url)) when the server returns
404?

`fetch` only fails on network problems. A 404 is a normal response, so the
retry never starts. And if you add a status check that throws, you will retry
a permanent 404 three times. Check the status and only retry 408, 429 and 5xx.

---

← [Promise.all and friends](09-combinators.md) · [Contents](index.md) · [Curry](11-curry.md) →
