> This file is generated from `html/18-interview-routine.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 3 · Doing it well -->

# How to run the interview

Two people write the same correct debounce. One gets the job. The difference
is almost never the code. It is whether the interviewer could follow the
thinking, and whether the person knew the limits of what they wrote.

## 1. Before the call

- **Find out the platform.** Is it a shared editor, an online judge, or a real repo? Can you run the code? Can you install packages? Ask in the first minute, not at minute 30.
- **Have paper.** Sketch the shape first. Drawing the timer and the variables prevents most bugs.
- **Set up your editor** if you use your own: bigger font, notifications off, terminal open.
- **Prepare your introduction.** Forty-five seconds, ending with what you want next. Do not read out your CV.

## 2. Ask a few questions, then start

Three or four questions is enough. Asking forever looks like stalling. These
are the ones that change the code:

| Question | Why it changes the answer |
| --- | --- |
| "Can I use modern syntax?" | Decides if `structuredClone` and optional chaining are allowed |
| "Browser or Node?" | DOM APIs or Node APIs |
| "Any old browsers to support?" | Whether you can skip polyfills and use `AbortSignal` |
| "Leading, trailing, or both?" (debounce) | Changes the whole structure |
| "Is there a depth limit?" (flatten) | One small change, or a different signature |
| "Should bad input throw or be ignored?" | Changes the error handling and the tests |
| "Can the input contain itself?" | Decides whether you need a `WeakMap` |

> **Say your assumption out loud**

"I'll assume modern browsers and that the callback should keep the caller's
`this`. Tell me if either is wrong." That turns a vague situation into a
written decision. Senior engineers do the same thing in code review.

## 3. The 35 minutes

| Minutes | What you do | What comes out |
| --- | --- | --- |
| 0–2 | Introduce yourself, check the platform | You know you can run code |
| 2–6 | Ask questions | A short list of assumptions |
| 6–9 | Say your plan and the tradeoff | "A closure over a timer, O(1) per call" |
| 9–25 | Write it while talking | Working code |
| 25–31 | Read it again, then test | One normal case and three edges |
| 31–35 | Say what is missing | "I did not handle X because…" |

### Talk like this

- "I'll keep the timer in the closure so it survives between calls."
- "The wrapper has to be a normal function. An arrow would freeze `this`."
- "I'm using the index instead of pushing, so the order matches the input."
- "I'm skipping empty slots with an `in` check, because that is what the spec does."

Each sentence tells the interviewer what to score. Silence makes them guess,
and people guess low.

## 4. Testing is scored

Do not say "I think that's right". Write a small table. It takes 90 seconds
and is worth more than adding another feature.

*the table you draw in the interview*

```js
debounce(fn, 100)

case                     expected
─────────────────────────────────────────────
one call                 runs after 100ms
5 calls in 50ms          runs once, with the last arguments
leading: true            one now, one at the end
cancel() then wait       runs zero times
this preserved           the method's own `this`
arguments passed on      [a, b], not the arguments object
wait = 0                 runs almost immediately
```

Then actually run the interesting ones. If the platform cannot run code, walk
through them out loud. That still shows the habit.

> **Read your code again before saying "done"**

Thirty seconds of re-reading catches most real failures: a missing `return`,
`=` instead of `===`, `this` inside an arrow, a variable used before it is
set, and off-by-one loop limits.

## 5. Talking about tradeoffs

Every question has a "which way did you go" moment. Name the choice, pick a
side, and say what you gave up.

| Choice | What to say |
| --- | --- |
| Map or object for the cache | "Map, because keys can be any type and `size` is real. An object turns keys into strings." |
| WeakMap or Map | "WeakMap, so saved objects can be freed. The cost is I cannot loop over it, so no LRU." |
| Recursion or a loop | "Recursion is easier to read. The loop survives very deep input." |
| Deep or shallow copy | "Shallow. In React I replace the part that changed, not the whole tree." |
| One at a time or all at once | "All at once, unless there is a rate limit or an order that matters." |
| Debounce or throttle | "Debounce for search. Throttle for scroll, because I want updates during the scroll." |

## 6. When you get stuck

1. **Say the goal again** in one sentence. Half of all stalls are a misread question.
2. **Write the signature and the simplest case.** Working code beats a perfect plan.
3. **Say what you are unsure about.** "I don't remember if Map keeps insertion order. I'll assume it does and note it."
4. **Offer the slow version and the upgrade.** "This is O(n²). With a hash map it becomes O(n). I'll start with correctness."
5. **Ask for a hint.** That costs less than four silent minutes.

## 7. When they ask a follow-up

A follow-up is good news. It means the first answer was acceptable. The shape
of the answer is always: what changes, and what stays.

*how a follow-up answer sounds*

```js
"Add cancel to debounce"
→ "The timer is already in the closure, so it is a method on the
   returned function: clearTimeout, then set it to null. One detail:
   I also clear the saved arguments, so flush cannot run old ones."

"Now make it retry when it fails"
→ "That belongs in a different layer. I'd wrap the call site in a
   retry helper rather than build it into debounce, otherwise the
   timing rules get tangled."
```

## 8. Mistakes to watch for

**Coding in silence** Two minutes of typing with no words looks like guessing.
Say what you are doing and why.

**Optimising too early** Building an LRU when a Map would do. Get it correct,
then offer the improvement.

**Claiming too much** "This handles everything" invites a counterexample. Say
what it does not handle first.

**Ignoring a hint** If they ask "what about empty input?", answer it now. Do
not keep going and come back later.

**Fighting the editor** Ask how to run code early. Struggling with shortcuts
under time pressure looks like inexperience.

**No tests** Finishing with "done" and no checks is the most common reason a
correct answer scores mid.

## 9. Words you can reuse

> **Opening**

"Before I code: I'll assume modern browsers, that the function should keep the
caller's `this` and arguments, and that trailing is the default. I'll use a
closure over the timer, then test the quick-calls case and the cancel case.
Anything you want me to do first?"

> **Closing**

"What I did not add: a `maxWait`, so a user who never stops typing never
triggers a save. If that mattered, I would track the last real run and force
one. I also did not test `this` inside a class method. I would use fake timers
for all of these."

## 10. Check yourself

**Check:** You finish in 20 minutes. What now?

Test more edge cases, then improve one thing: add `cancel`, handle the empty
input, or talk about complexity. Do not add features nobody asked for without
saying so. Ask first: "would it help if I…"

**Check:** At minute 25 you realise your approach is wrong. What do you do?

Say it straight away. State the right approach in one sentence, then ask
whether to rewrite or patch. Hiding it and quietly patching is worse.
Interviewers score honesty and recovery, and a clean 8-minute rewrite often
reads better than a messy patch.

---

← [classnames and JSON](17-utilities.md) · [Contents](index.md) · [Practice and scoring](19-mock.md) →
