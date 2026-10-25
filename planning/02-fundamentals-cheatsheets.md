# Fundamentals Cheat Sheets

## Closures

A closure = function + the lexical environment it was created in. Inner functions
keep access to outer variables even after the outer function returns.

```js
function counter() {
  let count = 0;            // private state via closure
  return () => ++count;
}
const c = counter(); c(); c(); // 2
```

**The classic trap:**
```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i)); // 3, 3, 3
```
Why: `var` is function-scoped, so all three callbacks share ONE `i`, which is 3
by the time timers run. Fix: `let` (new binding per iteration) or an IIFE.

## `this` — 4 binding rules (in priority order)

1. **`new` binding** → the fresh object
2. **Explicit** → `call` / `apply` / `bind` (arrow functions ignore these!)
3. **Implicit** → `obj.fn()` → `this === obj` (but `const f = obj.fn; f()` loses it)
4. **Default** → `undefined` in strict mode, `globalThis` otherwise

Arrow functions have NO own `this` — they capture it lexically. That's why
`setTimeout(() => this.x)` works inside a method, and why `debounce` must use a
regular function for its wrapper.

```js
const obj = { name: 'a', hello: () => console.log(this.name) }; // undefined — arrow
const obj2 = { name: 'a', hello() { console.log(this.name) } }; // 'a'
```

## Prototypes

- Every object has a hidden `[[Prototype]]` link; property lookup walks the chain.
- `class` is syntax sugar over prototype + constructor functions.
- Classes are hoisted but stay in the **temporal dead zone** until evaluated.
- `obj.__proto__` / `Object.getPrototypeOf` / `Object.create(proto)`.

## Promises & event loop

- A promise: pending → fulfilled | settled (one-way). `.then` returns a NEW promise.
- Errors propagate down the chain until a rejection handler.
- **Event loop:** one call stack. After the stack empties: run ALL microtasks
  (promise callbacks, `queueMicrotask`, `MutationObserver`) before the next
  macrotask (`setTimeout`, `setInterval`, I/O, UI events).

```js
console.log(1);
setTimeout(() => console.log(2));          // macrotask
Promise.resolve().then(() => console.log(3)); // microtask
console.log(4);
// Output: 1, 4, 3, 2
```

`async/await` = sugar over promises; `await` yields to the microtask queue.

## Promise combinators (know all four)

| Combinator | Resolves when | Rejects when |
|---|---|---|
| `all` | all fulfill | first rejection (fail-fast) |
| `allSettled` | all settle (never rejects) | never |
| `any` | first fulfillment | all reject (`AggregateError`) |
| `race` | first settle of any kind | first settle of any kind |

## DOM: traversal, creation, events

```js
// Traversal
node.parentNode / parentElement;
node.children          // elements only (HTMLCollection, live)
node.childNodes        // includes text nodes (NodeList)
node.firstElementChild, node.nextElementSibling

// Creation
const el = document.createElement('div');
el.textContent = 'hi';       // safe; innerHTML parses HTML
parent.appendChild(el);      // or parent.append(el, 'text')

// Event delegation — one listener on a stable ancestor
document.getElementById('list').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn) console.log(btn.dataset.id);
});
```

Key distinctions:
- **Live** HTMLCollection (`getElementsByTagName`, `.children`) auto-updates on DOM change;
  **static** NodeList (`querySelectorAll`) does not.
- Listeners attached to replaced elements die — `innerHTML = ...` destroys old
  nodes and their listeners. Delegation survives.

## Type checking quick reference

```js
typeof null === 'object'            // historical bug
typeof [] === 'object'              // use Array.isArray
typeof function(){} === 'function'
typeof NaN === 'number'             // NaN !== NaN; use Number.isNaN
value instanceof Date
Object.prototype.toString.call(x)   // '[object Map]' etc — most precise
```
