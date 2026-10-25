# JavaScript Interview Prep — 3-Month Plan (GFE-style, free)

Based on GreatFrontEnd's free "Front End Interview Playbook — JavaScript" guide
(https://www.greatfrontend.com/front-end-interview-playbook/javascript) + their
free GitHub repo of 190+ questions:
https://github.com/greatfrontend/top-javascript-interview-questions

Target audience: juniors / career switchers. Budget: ~1–2 h/day.

---

## Month 1 — JavaScript language fundamentals

Goal: understand closures, `this`, prototypes, promises, and the event loop.
Do the free GFE Quiz questions as you go.

### Week 1: Scope, closures, `this`
- [ ] Closures + lexical scope (2–3 h) — classic `for` + `var` + `setTimeout` → `3, 3, 3` trap
- [ ] `this` binding rules: default / implicit / explicit (`call`, `apply`, `bind`) / `new` (2 h)
- [ ] Arrow functions vs normal functions (no own `this`, no `arguments`)
- [ ] Practice: closure counters, private state, loop-closure problems

### Week 2: Types, prototypes, OOP
- [ ] Data types, `typeof` quirks, type coercion (`==` vs `===`)
- [ ] Prototypes, prototype chain, `class` sugar (classes ARE hoisted, but stay in TDZ)
- [ ] Function invocation: `fn()`, `obj.fn()`, `new fn()`, `fn.call/apply/bind`

### Week 3: Promises & async
- [ ] `Promise` internals: states, chaining, error propagation (3–4 h)
- [ ] `async/await`, error handling
- [ ] Event loop: microtasks vs macrotasks ordering (2–3 h)
- [ ] Practice: implement `Promise.all`, `allSettled`, `any`, `race`

### Week 4: Array polyfills + consolidation
- [ ] Implement `Array.prototype.map`, `filter`, `reduce` (2 h)
  - remember: callback gets `(element, index, array)`, optional `thisArg`
  - `map` preserves holes in sparse arrays: `[1,2,,4].map(x=>x*x) === [1,4,,16]`
- [ ] Redo every problem from weeks 1–3 from scratch, timed

---

## Month 2 — Full pass through JS coding questions

Goal: 2–3 problems/day from the free GFE GitHub repo.
Method: attempt WITHOUT looking at the solution → compare → note gaps.

### Week 5: Debounce & throttle family (2 h)
- [ ] Debounce (with `leading`/`trailing` options, `this` + args preserved, cancel)
- [ ] Throttle
- [ ] Promise retry with exponential backoff

### Week 6: Async & promises (2 h)
- [ ] `Promise.all`, `Promise.allSettled`, `Promise.any`, `Promise.race`
- [ ] Promisify a callback function
- [ ] Async helper: `promiseSequential`, concurrency limiter

### Week 7: Functions & utilities
- [ ] Curry (fixed + variadic arity, 1–2 h)
- [ ] Flatten (recursive, iterative, generator; 1–2 h)
- [ ] Memoize with custom cache-key resolver (2 h)
- [ ] Deep clone with circular refs via `WeakMap`, `Date`/`Map`/`Set` (2 h)

### Week 8: DOM & misc
- [ ] `getElementsByClassName`, `getElementsByTagName` (live HTMLCollection vs static NodeList!) (2 h)
- [ ] Event delegation, event emitter / pub-sub (2 h)
- [ ] `classnames`/`clsx` implementation (1 h)
- [ ] `JSON.stringify` edge cases (1 h)

---

## Month 3 — Weak areas, mocks, production patterns

- [ ] Revisit your weakest topics from the checklist below
- [ ] ≥ 6 timed mock interviews (35 min each): solve without looking anything up,
      explain your approach out loud
- [ ] Read real library source: lodash's `debounce`, `clsx`, `eventemitter3`
- [ ] Practice stating tradeoffs out loud: "I'm not handling X, here's how I would"

---

## Study checklist (core topics, with GFE time estimates)

| Topic | Time |
|---|---|
| Closures + lexical scope | 2–3 h |
| `this` binding rules (+ call/apply/bind) | 2 h |
| `Promise` internals + async/await | 3–4 h |
| `Array.prototype.map`/`filter`/`reduce` | 2 h |
| Debounce and Throttle | 2 h |
| `Promise.all` (+ allSettled, any, race) | 2 h |
| Deep clone + circular references | 2 h |
| Event delegation + DOM traversal | 2 h |

### Senior/FAANG extras
| Topic | Time |
|---|---|
| Curry (fixed + variadic) | 1–2 h |
| Flatten (recursive, iterative, generator) | 1–2 h |
| EventEmitter / pub-sub | 2 h |
| classnames/clsx implementation | 1 h |
| Promise retry with exponential backoff | 1–2 h |
| Memoization with custom cache keys | 2 h |
| Event loop ordering (micro vs macro) | 2–3 h |
| JSON stringify/parse edge cases | 1 h |

---

## Common pitfalls to avoid (memorize these)

### Debounce / Throttle
- Arrow function as timer callback loses `this`
- Not clearing the previous timeout (that makes a throttle, not a debounce)
- Forgetting rest/spread of args
- Not asking about `leading`/`trailing` edge

### Promise.all & friends
- Pushing results as they resolve → wrong output order (use index-based assignment)
- Empty input must resolve with `[]`, not hang
- `Promise.all` = fail-fast; `allSettled` = never rejects
- Normalize non-promise values with `Promise.resolve(value)`

### Deep clone
- `JSON.parse(JSON.stringify())` caveats: Date→string, undefined dropped, NaN→null, throws on cycles
- Circular refs need a `WeakMap` visited set
- Preserve prototype chain / class identity
- Map/Set values may themselves be Map/Set — recurse

### Closures & this
- `var` in a loop + `setTimeout` → `3, 3, 3` (explain the fix: `let` or IIFE)
- `this` inside `map`/`forEach` callbacks is not the outer context
- Classes ARE hoisted, but sit in the temporal dead zone

### DOM
- `querySelectorAll` inside a loop instead of caching the NodeList
- Re-attaching listeners after `innerHTML` mutation without explaining why they died
- Live `HTMLCollection` (getElementsByTagName) vs static NodeList (querySelectorAll)

---

## During the interview — the routine

1. Check the platform: shortcuts, can you run code, dependencies allowed?
2. Self-intro under 1 minute.
3. Clarify: modern syntax OK? browser or Node? browser support (affects APIs)?
4. Propose the solution, then code while explaining.
5. Re-read your code for typos before "finishing".
6. Write & run edge-case tests; debug failures.
7. State time/space complexity if relevant.
8. State tradeoffs, unhandled cases, how you'd improve it.
9. Expect follow-ups.

## Useful tips
- "Wishful thinking": ask to assume queue/heap/binary search exist.
- Write pure functions when possible.
- Pick data structures wisely; avoid O(n²) when a hash map gives O(n).
- If a callback param exists, ask how `this` should behave.
- For recursion: ask input size (stack overflow) and cyclic structures — raising it = points.

## Evaluation axes
Problem solving • Software engineering foundation • Domain expertise (DOM/HTML/CSS/JS) • Communication • Verification (tests/edge cases)
