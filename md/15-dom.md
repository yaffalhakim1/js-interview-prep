> This file is generated from `html/15-dom.html`. Do not edit it by hand.
> Change the HTML page, then run `node tools/build-md.js`.

<!-- Month 2 · Coding questions -->

# The DOM and events

These questions only exist in front-end interviews. Interviewers look for two things. Do you know the difference between a list that updates itself and a list that does not? And can you attach one event listener instead of a thousand?

## 1. The page is a tree

The page is a tree of nodes. Elements, text and comments are all nodes, with different `nodeType` numbers. The difference that matters most in practice: **child nodes include text; children are elements only**.

| You want | Elements only | All nodes |
| --- | --- | --- |
| Children | `el.children` | `el.childNodes` |
| First child | `el.firstElementChild` | `el.firstChild` |
| How many | `el.childElementCount` | `el.childNodes.length` |
| Parent | `el.parentElement` | `el.parentNode` |
| Next sibling | `nextElementSibling` | `nextSibling` |

`childNodes` counts the whitespace between tags. That is why `firstChild` on formatted HTML often gives a text node. It causes real bugs, so mention it.

## 2. The headline question: live vs static

**live-vs-static.js**

```js
const host = document.createElement("div");
host.innerHTML = "<span class='a'>1</span><span class='a'>2</span>";

const live = host.getElementsByClassName("a");     // updates itself
const fixed = host.querySelectorAll(".a");         // a snapshot

console.log("before:", live.length, fixed.length);

const extra = document.createElement("span");
extra.className = "a";
extra.textContent = "3";
host.appendChild(extra);

console.log("after adding one:", live.length, fixed.length);
console.log("live is an HTMLCollection:", live.constructor.name);
console.log("fixed is a NodeList:", fixed.constructor.name);
```

**Watch out**

**Why this matters in a loop**

If you remove items while looping over a live list, you skip some. The list renumbers as you go. Copy it first with `[...live]` or `Array.from(live)`. `querySelectorAll` is safe to loop because it does not change. But it also will not see items added later.

## 3. Finding elements

**selectors.js**

```js
const root = document.createElement("div");
root.innerHTML = `
  <ul id="list">
    <li data-id="1">one</li>
    <li data-id="2" class="active">two</li>
  </ul>`;

console.log("by id:", root.querySelector("#list").tagName);
console.log("how many li:", root.querySelectorAll("li").length);
console.log("first match:", root.querySelector(".active").dataset.id);

// querySelector on an element searches only inside it
const list = root.querySelector("#list");
console.log("search inside the list:", list.querySelectorAll("li").length);

// closest walks UP the tree, which is what event delegation needs
console.log("closest ul:", root.querySelector(".active").closest("ul").id);

// matches asks a yes/no question without moving anywhere
console.log("matches the selector:", root.querySelector("li").matches("[data-id='1']"));
```

## 4. Creating and changing elements

**create.js**

```js
const ul = document.createElement("ul");

// 1. Build in a fragment, then attach once. One layout pass, not many.
const frag = document.createDocumentFragment();
for (let i = 1; i <= 3; i++) {
  const li = document.createElement("li");
  li.textContent = "item " + i;      // textContent escapes, innerHTML does not
  li.className = "row";
  li.dataset.index = String(i);
  frag.appendChild(li);
}
ul.appendChild(frag);
console.log("children:", ul.children.length);
console.log("fragment is now empty:", frag.childNodes.length);

// 2. Shortcut methods for inserting
const first = document.createElement("li");
first.textContent = "prepended";
ul.prepend(first);
ul.children[1].before("text before");
ul.children[1].after("text after");
console.log("text now:", ul.textContent.replace(/\s+/g, " ").trim());

// 3. textContent vs innerHTML
const box = document.createElement("div");
box.textContent = "<b>plain text</b>";   // stays as text
console.log("textContent gives:", box.innerHTML);

box.innerHTML = "<b>real bold</b>";       // becomes an element
console.log("innerHTML gives:", box.innerHTML);
```

**Watch out**

**Two things reviewers always catch**

- **`innerHTML` with user data is a security hole.** Use `textContent`, or clean the input first. Also, setting `innerHTML` destroys and rebuilds everything inside. Every listener on those elements is gone.
- **Reading and writing layout in a loop.** Reading `offsetHeight` after each write forces the browser to recalculate every time. Do all reads first, then all writes.

## 5. How events travel

An event goes down from `window` to the target, then back up. Down is the capture phase. Up is the bubble phase. Listeners run in the bubble phase unless you pass `{ capture: true }`.

**phases.js**

```js
const outer = document.createElement("div");
const inner = document.createElement("span");
outer.appendChild(inner);

const order = [];
outer.addEventListener("click", () => order.push("outer capture"), true);
inner.addEventListener("click", () => order.push("inner target"));
outer.addEventListener("click", () => order.push("outer bubble"), false);

inner.dispatchEvent(new MouseEvent("click", { bubbles: true }));
console.log(order.join(" → "));
```

### One listener for a list that keeps changing

**delegate.js**

```js
const list = document.createElement("ul");
list.innerHTML = `
  <li><button data-id="a">A</button></li>
  <li><button data-id="b">B</button></li>`;

const clicked = [];

list.addEventListener("click", (event) => {
  const btn = event.target.closest("button");   // walk up from the real target
  if (!btn || !list.contains(btn)) return;      // ignore unrelated clicks
  clicked.push(btn.dataset.id);
});

list.querySelectorAll("button").forEach((b) => b.click());

// A button added later still works, because the listener is on the list
const li = document.createElement("li");
li.innerHTML = "<button data-id='c'>C</button>";
list.appendChild(li);
li.querySelector("button").click();

console.log("handled:", clicked, "· with 1 listener, not 3");
```

**Tip**

**Why delegation is better**

One listener instead of many. It survives re-rendering, because new children are covered. It uses less memory. The cost: you must find the real target with `closest()`, and you cannot use a separate closure per item. Read the id from `dataset` instead. For long lists, this is the default choice.

### Removing listeners, and once

**cleanup.js**

```js
const el = document.createElement("button");
let hits = 0;

const handler = () => { hits++; };
el.addEventListener("click", handler);
el.click();

el.removeEventListener("click", handler);
el.click();
console.log("after removing:", hits);

// `once` removes it for you after the first call
let onceHits = 0;
el.addEventListener("click", () => { onceHits++; }, { once: true });
el.click();
el.click();
console.log("with once:", onceHits);
```

`removeEventListener` needs the exact same function and the same capture flag. That is why named handlers exist, and why you can never remove an inline arrow. In single-page apps that is a common leak.

## 6. Writing getElementsByClassName

The expected answer is a depth-first walk that collects matching elements. Two details: the real method accepts several classes separated by spaces, and it returns a live list.

**byClassName.js**

```js
function getElementsByClassName(root, classNames) {
  const wanted = classNames.trim().split(/\s+/);
  const result = [];

  (function walk(node) {
    for (const child of node.children) {
      if (wanted.every((c) => child.classList.contains(c))) result.push(child);
      walk(child);
    }
  })(root);

  return result;
}

function getElementsByTagName(root, tag) {
  const result = [];
  (function walk(node) {
    for (const child of node.children) {
      if (child.tagName === tag.toUpperCase()) result.push(child);
      walk(child);
    }
  })(root);
  return result;
}

const doc = document.createElement("div");
doc.innerHTML = `
  <section class="card wide"><p>one</p></section>
  <div class="card"><span class="card wide">two</span></div>`;

console.log("one class:", getElementsByClassName(doc, "card").length);
console.log("both classes:", getElementsByClassName(doc, "card wide").length);
console.log("by tag:", getElementsByTagName(doc, "p").length);
```

**Say this in an interview**

"A depth-first walk over `children`, not `childNodes`, so I skip text nodes. I'd mention that the real method returns a live `HTMLCollection` and mine does not. And that you must not change a live list while looping over it."

## 7. Performance notes worth dropping

- **Save lookups in a variable.** Calling `querySelectorAll` inside a loop walks the tree again every time.
- **Build with a fragment.** One append of a fragment beats a hundred appends.
- **Avoid layout thrashing.** Mixing reads like `getBoundingClientRect` with writes forces a recalculation each time.
- **Use `classList`** instead of editing `className` as a string.
- **Use `IntersectionObserver`** instead of scroll listeners for "is it visible". It is cheaper and needs no throttling.
- **Add `{ passive: true }`** to scroll and touch listeners, so the browser can scroll without waiting for your code.

## 8. Check yourself

**Quiz:** You attach listeners to 500 rows, then rebuild the table with innerHTML. What breaks?

Options:
- A. Nothing, listeners are re-attached
- B. The old elements are destroyed, so every listener is gone **← correct**
- C. Only the last row keeps its listener

Setting `innerHTML` replaces everything inside. Delegation on the table avoids the whole problem.

**Check:** Why does el.firstChild sometimes give a text node?

Because the space between tags is a real text node. Use `firstElementChild` when you mean an element. This causes a lot of "why is my child undefined" bugs.

**Check:** What is the difference between stopPropagation and preventDefault?

`stopPropagation` stops the event reaching other listeners. `preventDefault` stops the browser's own action, like following a link or submitting a form. They are unrelated. A link's action can be stopped while the event still bubbles.

**Check:** How would you close a menu when the user clicks outside it?

Listen on `document` and check `menu.contains(event.target)`. If it is false, close. Remove the document listener when the menu disappears. Listening in the capture phase lets you close before other handlers act.

---

← [Deep clone](14-deep-clone.md) · [Contents](index.md) · [Event emitter](16-emitter.md) →
