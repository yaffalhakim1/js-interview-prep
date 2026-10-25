# JavaScript Interview Prep — course materials

A 19-topic course covering the 3-month front-end JavaScript interview plan.
No subscription, no build step to read it, no internet needed.

## Three editions of the same material

All three are generated from one source, so they never disagree.

| Edition | Open this | Good for |
|---|---|---|
| **PDF** | `JavaScript-Interview-Prep.pdf` | Reading before sleep, printing, phone offline |
| **HTML** | `html/index.html` | Running the code, dark mode, progress tracking |
| **Markdown** | `COURSE.md` or `md/index.md` | Reading in an editor, searching, copying code |

## The 19 topics

**Month 1 — Language basics**
01. Closures
02. The `this` keyword
03. Prototypes and classes
04. Types and conversion
05. Promises and async/await
06. The event loop
07. Array methods you write yourself

**Month 2 — Coding questions**
08. Debounce and throttle
09. Promise.all and friends
10. Retry with backoff
11. Curry
12. Flatten
13. Memoize
14. Deep clone
15. The DOM and events
16. Event emitter
17. classnames and JSON

**Month 3 — Doing it well**
18. How to run the interview
19. Practice and scoring

Every topic has: the idea first, runnable code, the edge cases to say out loud,
a script to say in an interview, and questions to check yourself.

## Folder layout

```
.
├─ JavaScript-Interview-Prep.pdf   the printable edition
├─ COURSE.md                        every topic in one markdown file
├─ html/                            the source. Edit here.
│  ├─ index.html
│  ├─ 01-closures.html … 19-mock-rubric.html
│  ├─ assets/  style.css · app.js · nav.js
│  └─ print/   generated single-file HTML for the PDF
├─ md/                              generated from html/
│  ├─ index.md
│  └─ 01-closures.md … 19-mock.md
├─ planning/                        the original short notes (not the course)
└─ tools/                           the build and check scripts
```

**The HTML pages are the source of truth.** Markdown and PDF are built from them.
Editing `md/` or `COURSE.md` by hand gets overwritten on the next build.

## Build

Requires Node, Python with PyMuPDF, and Chrome or Edge.

```powershell
# markdown only (fast)
node tools/build-md.js
node tools/check-md.js

# everything: markdown, then the PDF with page numbers and bookmarks
pwsh -File build-all.ps1
```

`build-all.ps1` runs the PDF in three passes, because the page numbers in the
contents page can only be known after the document has been laid out.

## Checks

Run these after editing any page.

```powershell
node html/smoke-test.js     # runs all 87 code snippets, flags missing output panels
node html/mobile-audit.js   # checks all 20 pages at a 384px phone viewport
node tools/check-md.js      # confirms markdown matches the HTML source
```

## Reading on your phone

```powershell
pwsh -File serve.ps1
```

Open the printed `http://192.168.x.x:8000/` address on the phone, same Wi-Fi.
Serving over HTTP matters: Android Chrome blocks `localStorage` for `file://`,
so progress tracking would silently not save if you opened the file directly.

The HTML edition is tested at 384 × 854 (Samsung A55 portrait) and 854 × 384
(landscape). Wide tables scroll inside their card with a swipe hint, tap targets
are at least 44px, and no text is smaller than 12px.

## Adding a topic

1. Copy an existing `html/NN-*.html`, change the `data-page` attribute, the
   `<title>` and the content.
2. Add it to `html/assets/nav.js` (sidebar, index page, prev/next).
3. Add it to the `NAV` array in `html/build-print.js` (PDF).
4. Add its title to `GROUPS` in `fill-toc-pages.py` and `make-toc.py`.
5. Add it to `NAV` and `PAGES` in `tools/build-md.js` and `tools/check-md.js`.
6. Rebuild.

## Where the material comes from

Built from GreatFrontEnd's free front-end interview playbook
(https://www.greatfrontend.com/front-end-interview-playbook/javascript) and their
free question repository
(https://github.com/greatfrontend/top-javascript-interview-questions).

The paid GFE plan adds a guided question sequence and automated test runners. The
study order and the solutions here are written from scratch around the same
topics, so you can cover the same ground without a subscription.
