/**
 * Builds a single print-ready HTML file from the 19 course pages,
 * then Chrome turns it into a PDF.
 *
 * Run:  node build-print.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;

/* ── course map (mirrors assets/nav.js) ─────────────────────── */

const NAV = [
  {
    month: "Month 1",
    label: "Language basics",
    items: [
      ["01-closures.html", "Closures"],
      ["02-this.html", "The <code>this</code> keyword"],
      ["03-prototypes.html", "Prototypes and classes"],
      ["04-types.html", "Types and conversion"],
      ["05-promises.html", "Promises and async/await"],
      ["06-event-loop.html", "The event loop"],
      ["07-array-polyfills.html", "Array methods you write yourself"],
    ],
  },
  {
    month: "Month 2",
    label: "Coding questions",
    items: [
      ["08-debounce-throttle.html", "Debounce and throttle"],
      ["09-promise-combinators.html", "Promise.all and friends"],
      ["10-retry-backoff.html", "Retry with backoff"],
      ["11-curry.html", "Curry"],
      ["12-flatten.html", "Flatten"],
      ["13-memoize.html", "Memoize"],
      ["14-deep-clone.html", "Deep clone"],
      ["15-dom.html", "The DOM and events"],
      ["16-event-emitter.html", "Event emitter"],
      ["17-utilities.html", "classnames and JSON"],
    ],
  },
  {
    month: "Month 3",
    label: "Doing it well",
    items: [
      ["18-interview-routine.html", "How to run the interview"],
      ["19-mock-rubric.html", "Practice and scoring"],
    ],
  },
];

/* ── extraction ─────────────────────────────────────────────── */

function extract(file) {
  const raw = fs.readFileSync(path.join(ROOT, file), "utf8");

  const mainMatch = raw.match(/<main id="main"[^>]*>([\s\S]*?)<\/main>/);
  if (!mainMatch) throw new Error("no <main> in " + file);
  let body = mainMatch[1];

  body = body.replace(/<div class="pagefoot"><\/div>/g, "");

  const eyebrow = (body.match(/<p class="eyebrow">([\s\S]*?)<\/p>/) || [, ""])[1].trim();
  const title = (body.match(/<h1>([\s\S]*?)<\/h1>/) || [, ""])[1].trim();
  const lead = (body.match(/<p class="lead">([\s\S]*?)<\/p>/) || [, ""])[1].trim();

  body = body
    .replace(/<p class="eyebrow">[\s\S]*?<\/p>/, "")
    .replace(/<h1>[\s\S]*?<\/h1>/, "")
    .replace(/<p class="lead">[\s\S]*?<\/p>/, "");

  // Answers visible in the PDF: a study document, not a quiz.
  body = body.replace(/<details class="(reveal|quiz)">/g, '<details class="$1" open>');

  return { eyebrow, title, lead, body };
}

/* ── print stylesheet ───────────────────────────────────────── */

const CSS = `
@page {
  size: A4;
  margin: 18mm 16mm 20mm;
}
@page :first { margin: 0; }

* { box-sizing: border-box; }

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  margin: 0;
  font-family: Georgia, "Iowan Old Style", "Times New Roman", serif;
  font-size: 9.9pt;
  line-height: 1.5;
  color: #1e1b16;
  background: #fff;
}

/* ── cover ──────────────────────────────────────────────────── */

.cover {
  height: 297mm;
  padding: 40mm 26mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  break-after: page;
  background: #faf6ee;
}
.cover .kicker {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 8pt; letter-spacing: .18em; text-transform: uppercase;
  color: #a8491c; margin-bottom: 10mm;
}
.cover h1 {
  font-size: 34pt; line-height: 1.1; margin: 0 0 8mm;
  font-weight: 400; letter-spacing: -.02em;
}
.cover .sub {
  font-size: 12pt; line-height: 1.6; color: #4a453c;
  max-width: 120mm; margin: 0 0 14mm;
}
.cover .meta {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 8.5pt; color: #6b6357;
  border-top: 1px solid #d8d0c0; padding-top: 6mm;
  max-width: 120mm;
}
.cover .meta b { color: #1e1b16; font-weight: 600; }

/* ── table of contents ──────────────────────────────────────── */

.toc { break-after: page; }
.toc h1 {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 9pt; letter-spacing: .16em; text-transform: uppercase;
  color: #6b6357; margin: 0 0 8mm; font-weight: 600;
}
.toc h1::before { content: none; }
.toc-group { margin-bottom: 9mm; }
.toc-group h2 {
  font-size: 10pt; margin: 0 0 3mm; font-weight: 600;
  color: #a8491c;
  font-family: "Helvetica Neue", Arial, sans-serif;
  letter-spacing: .04em; text-transform: uppercase;
}
.toc-group h2::before { content: none; }
.toc ol { margin: 0; padding: 0; list-style: none; }
.toc li {
  display: flex; gap: 4mm;
  padding: 1.6mm 0;
  border-bottom: 1px dotted #ddd5c6;
  font-size: 10pt;
}
.toc li .n {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 8pt; color: #9a9184; width: 6mm; flex: none;
  padding-top: .6mm;
}
.toc li a { color: #1e1b16; text-decoration: none; flex: 1; }
.toc li a code { font-family: Consolas, monospace; font-size: 9pt; }
.toc li .pg {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 9pt; color: #6b6357;
  font-variant-numeric: tabular-nums;
  min-width: 8mm; text-align: right;
}

/* ── topic sections ─────────────────────────────────────────── */

.topic { break-before: page; }

.topic-head { margin-bottom: 6mm; padding-bottom: 5mm; border-bottom: 2px solid #1e1b16; }
.topic-head .eyebrow {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 7.6pt; letter-spacing: .16em; text-transform: uppercase;
  color: #a8491c; margin: 0 0 3mm; font-weight: 600;
}
.topic-head h1 {
  font-size: 21pt; line-height: 1.15; margin: 0 0 3mm;
  font-weight: 400; letter-spacing: -.015em;
}
.topic-head .lead {
  font-size: 10.5pt; line-height: 1.55; color: #4a453c; margin: 0;
  font-style: italic;
}

/* ── prose ──────────────────────────────────────────────────── */

h2 {
  font-size: 13.5pt; font-weight: 600; line-height: 1.25;
  margin: 6.5mm 0 2.6mm; letter-spacing: -.01em;
  break-after: avoid;
  color: #1e1b16;
}
h2::before {
  content: counter(sec) ". ";
  counter-increment: sec;
  color: #a8491c; font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 11pt;
}
.prose { counter-reset: sec; }

h3 {
  font-size: 10.6pt; font-weight: 700; margin: 5mm 0 2mm;
  break-after: avoid;
}

p { margin: 0 0 2.6mm; }
ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
li { margin: 0 0 1.4mm; }
li::marker { color: #9a9184; }
strong { font-weight: 700; }

code {
  font-family: Consolas, "Courier New", monospace;
  font-size: .88em;
  background: #f4efe4;
  padding: .3mm 1mm;
  border-radius: 1mm;
  border: .2mm solid #e4dccb;
}

a { color: #a8491c; text-decoration: none; }

hr { border: 0; border-top: .3mm solid #ddd5c6; margin: 6mm 0; }

/* ── code blocks ────────────────────────────────────────────── */

.codeblock {
  margin: 0 0 3.5mm;
  border: .3mm solid #ded6c5;
  border-radius: 2mm;
  overflow: hidden;
  background: #fbf8f1;
  /* Long blocks may split across pages; short ones stay whole via orphans/widows. */
  break-inside: auto;
}
.codeblock .bar { break-after: avoid; }
.codeblock pre { orphans: 4; widows: 4; }
.codeblock .bar {
  padding: 1.4mm 3mm;
  border-bottom: .3mm solid #ded6c5;
  background: #f4efe4;
}
.codeblock .label {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 7pt; letter-spacing: .1em; text-transform: uppercase;
  color: #8b8272;
}
.codeblock .btn-mini { display: none; }
.codeblock .out { display: none !important; }
.codeblock pre {
  margin: 0; padding: 3mm 3.5mm;
  font-family: Consolas, "Courier New", monospace;
  font-size: 8.1pt; line-height: 1.42;
  white-space: pre-wrap;
  word-break: break-word;
  color: #2a2620;
}
.codeblock pre code { background: none; border: 0; padding: 0; font-size: inherit; }

/* ── callouts ───────────────────────────────────────────────── */

.callout {
  margin: 0 0 3.5mm;
  padding: 3mm 4mm;
  border: .3mm solid #ded6c5;
  border-left: 1.2mm solid #a8491c;
  border-radius: 1.5mm;
  background: #fdfaf4;
  break-inside: avoid;
}
.callout .ic { display: none; }
.callout h4 {
  margin: 0 0 1.6mm;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 8.2pt; letter-spacing: .08em; text-transform: uppercase;
  font-weight: 700;
  color: #a8491c;
}
.callout p, .callout li { font-size: 9.6pt; }
.callout p:last-child, .callout ul:last-child, .callout ol:last-child { margin-bottom: 0; }
.callout.why { border-left-color: #a8491c; background: #fdf7f1; }
.callout.gotcha { border-left-color: #a13636; background: #fdf5f4; }
.callout.gotcha h4 { color: #a13636; }
.callout.tip { border-left-color: #3d7350; background: #f6faf4; }
.callout.tip h4 { color: #3d7350; }
.callout.say { border-left-color: #9a6c0c; background: #fdfaef; }
.callout.say h4 { color: #9a6c0c; }
.callout.say em { font-style: italic; }

/* ── tables ─────────────────────────────────────────────────── */

.tablewrap {
  margin: 0 0 3.5mm;
  border: .3mm solid #ded6c5;
  border-radius: 1.5mm;
  overflow: hidden;
  break-inside: avoid;
}
table { width: 100%; border-collapse: collapse; font-size: 8.8pt; }
th, td { padding: 1.8mm 2.4mm; text-align: left; vertical-align: top; }
thead th {
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 7.2pt; letter-spacing: .07em; text-transform: uppercase;
  color: #6b6357; font-weight: 700;
  background: #f4efe4;
  border-bottom: .3mm solid #ded6c5;
}
tbody tr + tr td { border-top: .2mm solid #e8e0d0; }
td code { font-size: .92em; }
td.num { font-variant-numeric: tabular-nums; }

/* ── details / self-check ───────────────────────────────────── */

details.reveal, details.quiz {
  margin: 0 0 2.4mm;
  border: .3mm solid #ded6c5;
  border-radius: 1.5mm;
  background: #fdfaf4;
  break-inside: avoid;
  padding: 0;
}
details.reveal > summary, details.quiz > summary {
  padding: 2.2mm 3mm;
  font-weight: 700;
  font-size: 9.4pt;
  background: #f6f1e6;
  border-bottom: .2mm solid #e8e0d0;
  list-style: none;
}
details.reveal > summary::-webkit-details-marker,
details.quiz > summary::-webkit-details-marker { display: none; }
details.reveal > summary::before { content: "Check — "; color: #a8491c; }
details.quiz > summary::before { content: "Quiz — "; color: #a8491c; }
details.reveal .body, details.quiz .body { padding: 2.4mm 3mm; font-size: 9.4pt; }
details.reveal .body p:last-child, details.quiz .body p:last-child { margin-bottom: 0; }
details.reveal .body pre {
  margin: 2mm 0; padding: 2.4mm 3mm;
  background: #f4efe4; border: .2mm solid #e4dccb; border-radius: 1mm;
  font-family: Consolas, monospace; font-size: 8pt; line-height: 1.4;
  white-space: pre-wrap; word-break: break-word;
}
.quiz .q { padding: 2.4mm 3mm 0; font-weight: 700; font-size: 9.4pt; }
.quiz .opts { padding: 1mm 3mm 2.4mm; }
.quiz .opt {
  padding: 1.4mm 2.4mm;
  border: .2mm solid #e8e0d0;
  border-radius: 1mm;
  margin-bottom: 1.2mm;
  font-size: 9pt;
  background: #fff;
}
.quiz .opt.correct { border-color: #3d7350; background: #f1f8ee; font-weight: 600; }
.quiz .opt.correct .mark::after { content: " ✓"; color: #3d7350; }
.quiz .opt .mark {
  font-family: Consolas, monospace; font-size: 8pt;
  color: #9a9184; margin-right: 1.5mm;
}

/* ── misc ───────────────────────────────────────────────────── */

.grid { display: block; margin: 0 0 3.5mm; }
.grid .card {
  border: .3mm solid #ded6c5;
  border-left: 1mm solid #cfc6b3;
  border-radius: 1.2mm;
  padding: 2.4mm 3mm;
  margin-bottom: 2mm;
  break-inside: avoid;
}
.grid .card h4 { margin: 0 0 1.2mm; font-size: 9.4pt; }
.grid .card p { margin: 0; font-size: 9.2pt; color: #4a453c; }
.grid .card .stat { display: block; font-size: 14pt; color: #a8491c; margin-bottom: 1mm; }

.skip, .pagefoot, .progressbar, .donebtn { display: none !important; }

.cover-foot {
  position: absolute; bottom: 20mm; left: 26mm; right: 26mm;
  font-family: "Helvetica Neue", Arial, sans-serif;
  font-size: 8pt; color: #8b8272;
  display: flex; justify-content: space-between;
}
`;

/* ── build ──────────────────────────────────────────────────── */

const sections = [];
let counter = 0;
const toc = [];

for (const group of NAV) {
  const entries = [];
  for (const [file, titleHtml] of group.items) {
    counter += 1;
    const id = "t" + counter;
    const page = extract(file);

    // re-anchor heading ids so the PDF outline doesn't collide
    const body = page.body.replace(/<h2 id="([^"]+)"/g, (m, hid) => `<h2 id="${id}-${hid}"`);

    sections.push(
      `<section class="topic" id="${id}">
  <div class="topic-head">
    <p class="eyebrow">${page.eyebrow || group.month + " · " + group.label}</p>
    <h1>${page.title || titleHtml}</h1>
    ${page.lead ? `<p class="lead">${page.lead}</p>` : ""}
  </div>
  <div class="prose">${body}</div>
</section>`
    );

    // Page number is filled in by fill-toc-pages.js after the first render,
    // because only the layout engine knows where each topic lands.
    entries.push(
      `<li><span class="n">${String(counter).padStart(2, "0")}</span><a href="#${id}">${titleHtml}</a><span class="pg" data-pg="${id}"></span></li>`
    );
  }
  toc.push(
    `<div class="toc-group"><h2>${group.month} — ${group.label}</h2><ol>${entries.join("")}</ol></div>`
  );
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>JavaScript Interview Prep — a 3-month course</title>
<style>${CSS}</style>
</head>
<body>

<section class="cover">
  <p class="kicker">Front-end interview preparation</p>
  <h1>JavaScript interviews,<br>from the basics up.</h1>
  <p class="sub">
    A 19-part course. It covers the language ideas interviewers ask about, the
    small helpers they ask you to write, and how to run a 35-minute interview well.
    Every topic has the idea first, the code, the edge cases worth mentioning, and
    questions to check yourself.
  </p>
  <div class="meta">
    <b>Months 1–3</b> · 19 topics · ${sections.length} chapters<br>
    Built from the free GreatFrontEnd front-end interview playbook.<br>
    Read it in order, or jump to whatever you were asked last.
  </div>
  <div class="cover-foot">
    <span>JavaScript Interview Prep</span>
    <span>Printable edition</span>
  </div>
</section>

<section class="toc">
  <h1>Contents</h1>
  ${toc.join("\n  ")}
</section>

${sections.join("\n\n")}

</body>
</html>`;

const out = path.join(ROOT, "print", "js-interview-prep.html");
fs.mkdirSync(path.dirname(out), { recursive: true });

// Second pass: if a previous run resolved real page numbers, bake them into
// the contents page so the printed TOC is navigable.
const pageMapPath = path.join(ROOT, "..", "toc-pages.json");
let withPages = html;
if (fs.existsSync(pageMapPath)) {
  const map = JSON.parse(fs.readFileSync(pageMapPath, "utf8"));
  withPages = html.replace(/<span class="pg" data-pg="(t\d+)"><\/span>/g,
    (m, id) => `<span class="pg">${map[id] ?? ""}</span>`);
  console.log("baked page numbers into the contents page");
}

fs.writeFileSync(out, withPages, "utf8");

console.log("wrote " + out);
console.log("sections: " + sections.length + " · size: " + (withPages.length / 1024).toFixed(0) + " KB");
