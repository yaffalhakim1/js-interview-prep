/* Course map. Add a page here and it appears in the sidebar, index and pager. */
window.JS_PREP_NAV = [
  {
    month: "Month 1",
    label: "Language basics",
    items: [
      { id: "closures", file: "01-closures.html", title: "Closures", minutes: 25, blurb: "A function that remembers variables from where it was made." },
      { id: "this", file: "02-this.html", title: "The `this` keyword", minutes: 25, blurb: "Four rules that decide which object a function works on." },
      { id: "prototypes", file: "03-prototypes.html", title: "Prototypes and classes", minutes: 25, blurb: "How property lookup works, and what `new` actually does." },
      { id: "types", file: "04-types.html", title: "Types and conversion", minutes: 25, blurb: "typeof quirks, == vs ===, and which values count as false." },
      { id: "promises", file: "05-promises.html", title: "Promises and async/await", minutes: 35, blurb: "States, chaining, how errors travel, and what await really does." },
      { id: "event-loop", file: "06-event-loop.html", title: "The event loop", minutes: 30, blurb: "Two queues, one rule, and how to work out any output order." },
      { id: "array-polyfills", file: "07-array-polyfills.html", title: "Array methods you write yourself", minutes: 30, blurb: "map, filter and reduce, written to the spec." }
    ]
  },
  {
    month: "Month 2",
    label: "Coding questions",
    items: [
      { id: "debounce", file: "08-debounce-throttle.html", title: "Debounce and throttle", minutes: 30, blurb: "The most-asked pair. Leading, trailing, cancel, and this." },
      { id: "combinators", file: "09-promise-combinators.html", title: "Promise.all and friends", minutes: 30, blurb: "all, allSettled, any and race, written out and compared." },
      { id: "retry", file: "10-retry-backoff.html", title: "Retry with backoff", minutes: 25, blurb: "Waiting longer each time, adding randomness, and cancelling." },
      { id: "curry", file: "11-curry.html", title: "Curry", minutes: 25, blurb: "Collecting arguments until there are enough, then running." },
      { id: "flatten", file: "12-flatten.html", title: "Flatten", minutes: 25, blurb: "Three versions: recursive, without recursion, and a generator." },
      { id: "memoize", file: "13-memoize.html", title: "Memoize", minutes: 25, blurb: "Cache keys, WeakMap, a size limit, and not repeating requests." },
      { id: "deep-clone", file: "14-deep-clone.html", title: "Deep clone", minutes: 30, blurb: "Self-references, prototypes, Map and Set, and why JSON fails." },
      { id: "dom", file: "15-dom.html", title: "The DOM and events", minutes: 30, blurb: "Live vs static lists, event delegation, and finding elements." },
      { id: "emitter", file: "16-event-emitter.html", title: "Event emitter", minutes: 25, blurb: "on, once, off and emit, plus the leaks that come with them." },
      { id: "utilities", file: "17-utilities.html", title: "classnames and JSON", minutes: 25, blurb: "Building a class string, and the rules of JSON.stringify." }
    ]
  },
  {
    month: "Month 3",
    label: "Doing it well",
    items: [
      { id: "interview", file: "18-interview-routine.html", title: "How to run the interview", minutes: 30, blurb: "Ask, plan, code, test, and name the tradeoffs in 35 minutes." },
      { id: "mock", file: "19-mock-rubric.html", title: "Practice and scoring", minutes: 25, blurb: "Score yourself, six mocks, and a reading list for real source." }
    ]
  }
];

window.JS_PREP_PAGES = window.JS_PREP_NAV.flatMap(function (group) {
  return group.items.map(function (item) {
    return Object.assign({ month: group.month, groupLabel: group.label }, item);
  });
});

// Pages that are not topics: reachable from the sidebar footer but excluded
// from the 19-topic count and the progress bar.
window.JS_PREP_EXTRA = [
  { id: "download", file: "download.html", title: "Download the course" }
];