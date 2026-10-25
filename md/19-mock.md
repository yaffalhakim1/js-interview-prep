> This file is generated from `html/19-mock-rubric.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 3 · Doing it well -->

# Practice and scoring

Month 3 is not more reading. It is timed practice and reading real code. This page gives you a scoring sheet, six mock interviews, and the questions to ask while reading lodash.

## 1. The scoring sheet

Give yourself 1 to 4 on each line after every mock. Anything below 3 becomes next week's topic.

| Skill | 1 (weak) | 3 (good) | 4 (strong) |
| --- | --- | --- | --- |
| **Understanding** | Starts coding before understanding the input | Says the problem back, names a plan | Names the plan and the one it rejected |
| **Correctness** | Fails the normal case | Normal case plus obvious edges | Empty input, empty slots, self-references, `this` |
| **Craft** | Global state, unclear names | A pure function with a clear signature | Pure, states its limits, states the complexity |
| **Domain knowledge** | No mention of how the browser behaves | Knows the APIs used | Mentions speed, memory, and where the boundary is |
| **Communication** | Silent coding | Says what they are doing | Says it, checks in, invites correction |
| **Testing** | No tests | Walks through a few cases | Writes a table, runs it, fixes what fails out loud |

**Tip**

**18 out of 24 is the target**

A steady 3 everywhere beats 4s on correctness and 1s on communication. Interviewers are looking for a colleague, not a compiler.

## 2. Six mocks, six weeks

| # | Question | What it practises | Time |
| --- | --- | --- | --- |
| 1 | Debounce with leading, trailing and cancel | Closures, `this`, API design | 35 min |
| 2 | `Promise.all` and `allSettled` from scratch | Keeping order, empty input | 35 min |
| 3 | Deep clone with self-references, Map and Set | WeakMap, prototypes, type branches | 35 min |
| 4 | Event emitter with `once` and unsubscribe | Object design, changing a list while looping | 35 min |
| 5 | Curry with unknown arguments, and flatten without recursion | Recursion, argument counts, stack limits | 35 min |
| 6 | Your weakest question, cold | Remembering under pressure | 35 min |

### How to do a mock on your own

1. Pick the question. Do not read your notes first.
2. Start a 35-minute timer. Record audio if you can. You will hear yourself hedge.
3. Talk the whole time, including the question phase. Pretend to be the interviewer too.
4. Write the test table before running anything.
5. Stop at 35 minutes even if you are not finished. Note where the time went.
6. Score the six lines. Compare with the solution. Write one sentence per line.
7. Do the same question again three days later. Target: under 20 minutes, no notes.

## 3. Ten-minute drills

Short practice for days without a full block. One function, one edge case, one explanation.

**Closures** Write `once`, `memoize`, a private counter, and the loop fix three ways.

**this** Write `myCall`, `myApply`, `myBind`. Then predict five mixed call shapes.

**Event loop** Write a snippet with a timer, a promise and an async function. Work out the order before you run it.

**Array methods** `map`, `filter`, `reduce`, `find`. Then say the spec details from memory.

**Async** Write a mapper with a concurrency limit, and a timeout wrapper. Both without looking.

**DOM** A delegated click handler for a changing list, a walk for `getElementsByClassName`, and click-outside-to-close.

## 4. Reading real source code

The strongest signal in this whole plan is being able to say "I read how lodash does it, and here is why they need 200 lines." Read with these questions in hand.

### lodash debounce

- Where do `lastArgs`, `lastThis` and `lastCallTime` live? All in the closure.
- How does `maxWait` work with the normal timer? It forces a run when the time since the last real call is too long.
- Why does `cancel` also reset the last run time? So the next call counts as a fresh start.
- What does `flush` return, and why save `result`? So the caller can read the last value straight away.
- Notice: one function does both debounce and throttle through options. That is the design lesson.

### clsx

- It is under 300 bytes when compressed. How does it avoid recursion? A `while` loop over the arguments.
- How does it treat numbers and `0`?
- Why return `""` instead of `undefined`?

### eventemitter3

- How does it avoid making an array per event? One flat array of names and handlers.
- What happens if a listener is removed while `emit` runs?
- Why does it treat one, two and three listeners as special cases? A fast path before the general loop.

**Why this matters**

**A line to use in an interview**

"I've read lodash's debounce. It is long because it supports `maxWait`, leading, trailing, cancel, flush and returning the last value, all in one function. The core is the same closure over a timer. The rest is option handling."

## 5. The last week

- **Stop learning new topics.** Go over what you already have.
- **Redo your six mocks** from memory, under 20 minutes each.
- **Write three stories**: a bug you found, a speed-up you made, and a design choice you argued for. Ninety seconds each.
- **Sleep.** A rested person scoring 3 beats a tired person scoring 4. That is not a cliché.

## 6. Check yourself

**Check:** You scored 2 on Testing twice in a row. What do you change?

Make the test table a hard rule before running anything. Literally type "case / expected / actual" in the editor first. The habit has to be automatic, because under pressure you skip anything optional.

**Check:** Why redo the same question instead of a new one?

Because you are practising recall speed. A second pass removes the design uncertainty, so you can practise the part that is actually scored: talking through it, testing it, and naming tradeoffs. A new question practises discovery, which you have already done.

---

← [How to run the interview](18-interview.md) · [Contents](index.md)
