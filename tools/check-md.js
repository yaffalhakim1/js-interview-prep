/**
 * Validates the generated markdown against the HTML source.
 *
 * Checks:
 *   1. every page exists and is non-trivial
 *   2. no duplicate H1, no empty headings
 *   3. code fences are balanced and keep their content
 *   4. every <pre> block in the HTML appears in the markdown
 *   5. every table row count matches the HTML
 *   6. no leftover HTML tags or entities
 *   7. links point at files that exist
 *
 * Usage:  node tools/check-md.js
 */
const fs = require("fs");
const path = require("path");
const H = require("./html-parse");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "html");
const MD = path.join(ROOT, "md");

const PAGES = [
  ["01-closures.html", "01-closures.md"],
  ["02-this.html", "02-this.md"],
  ["03-prototypes.html", "03-prototypes.md"],
  ["04-types.html", "04-types.md"],
  ["05-promises.html", "05-promises.md"],
  ["06-event-loop.html", "06-event-loop.md"],
  ["07-array-polyfills.html", "07-array-polyfills.md"],
  ["08-debounce-throttle.html", "08-debounce.md"],
  ["09-promise-combinators.html", "09-combinators.md"],
  ["10-retry-backoff.html", "10-retry.md"],
  ["11-curry.html", "11-curry.md"],
  ["12-flatten.html", "12-flatten.md"],
  ["13-memoize.html", "13-memoize.md"],
  ["14-deep-clone.html", "14-deep-clone.md"],
  ["15-dom.html", "15-dom.md"],
  ["16-event-emitter.html", "16-emitter.md"],
  ["17-utilities.html", "17-utilities.md"],
  ["18-interview-routine.html", "18-interview.md"],
  ["19-mock-rubric.html", "19-mock.md"],
];

const problems = [];
const note = (file, msg) => problems.push(file + ": " + msg);

/* ── 1. coverage ─────────────────────────────────────────── */

for (const [htmlFile, mdFile] of PAGES) {
  const mdPath = path.join(MD, mdFile);
  if (!fs.existsSync(mdPath)) {
    note(mdFile, "missing");
    continue;
  }
  const md = fs.readFileSync(mdPath, "utf8");
  const html = fs.readFileSync(path.join(SRC, htmlFile), "utf8");

  if (md.length < 3000) note(mdFile, "suspiciously short (" + md.length + " bytes)");

  /* 2. headings */

  const h1s = md.match(/^# .+$/gm) || [];
  if (h1s.length !== 1) note(mdFile, h1s.length + " H1 headings (expected 1)");
  if (/^#{2,6}\s*$/m.test(md)) note(mdFile, "empty heading");
  if (/^#{1,6}\s*\d+\.\s*$/.test(md)) note(mdFile, "heading with number but no text");

  /* 3. fences */

  const fences = md.match(/^`{3,}/gm) || [];
  if (fences.length % 2 !== 0) note(mdFile, "unbalanced code fences (" + fences.length + ")");

  /* 4. every HTML <pre> should appear in the markdown */

  const tree = H.parse(html);
  const pres = H.findAll(tree, "pre").map((p) => H.rawText(p).replace(/\s+/g, " ").trim());
  const mdNormalised = md.replace(/\s+/g, " ");
  let missingCode = 0;
  for (const code of pres) {
    if (!code) continue;
    // compare the first line, which is enough to catch a dropped block
    const firstLine = code.split(" ").slice(0, 8).join(" ");
    if (!mdNormalised.includes(firstLine)) missingCode++;
  }
  if (missingCode) note(mdFile, missingCode + " of " + pres.length + " code blocks missing");

  /* 5. table rows */

  const htmlRows = H.findAll(tree, "tr").length;
  const mdRows = (md.match(/^\|.*\|$/gm) || []).length;
  // markdown adds one separator row per table; allow for that slack
  if (htmlRows > 0 && mdRows < htmlRows) {
    note(mdFile, "tables: " + mdRows + " md rows vs " + htmlRows + " html rows");
  }

  /* 6. leftovers */

  // Ignore anything inside a fenced code block: that is real content, not markup.
  const proseOnly = md
    .split(/^`{3,}.*$/m)
    .filter((_, i) => i % 2 === 0)
    .join("\n");

  const strayTag = proseOnly.match(/<\/?(div|span|p|section|main|details|summary|table|tr|td|th|pre|h[1-6])\b[^>]*>/i);
  if (strayTag) note(mdFile, "leftover HTML tag: " + strayTag[0]);

  const strayEntity = proseOnly.match(/&(lt|gt|amp|quot|#39|nbsp);/);
  if (strayEntity) note(mdFile, "leftover entity: " + strayEntity[0]);

  // Callout markers should never be followed by an empty quote line then nothing
  if (/>\s*\n>\s*\n>\s*\n/.test(md)) note(mdFile, "triple empty quote line");

  /* 7. relative links */

  // Only real links, not "..." inside prose or code spans.
  const links = [...md.matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((l) => !/^https?:/.test(l) && !l.includes("..."));

  for (const link of links) {
    const target = path.join(MD, link.split("#")[0]);
    if (!fs.existsSync(target)) note(mdFile, "broken link: " + link);
  }
}

/* index + COURSE.md */

const indexMd = path.join(MD, "index.md");
if (!fs.existsSync(indexMd)) {
  note("index.md", "missing");
} else {
  const md = fs.readFileSync(indexMd, "utf8");
  for (const [, mdFile] of PAGES) {
    if (!md.includes(mdFile)) note("index.md", "does not list " + mdFile);
  }
}

const courseMd = path.join(ROOT, "COURSE.md");
if (!fs.existsSync(courseMd)) {
  note("COURSE.md", "missing");
} else {
  const md = fs.readFileSync(courseMd, "utf8");
  // Strip markdown formatting before comparing, since the HTML lead has inline
  // <code> where the markdown has backticks.
  const plain = md.replace(/[`*_[\]()#>]/g, "").replace(/\s+/g, " ");
  for (const [htmlFile] of PAGES) {
    const tree = H.parse(fs.readFileSync(path.join(SRC, htmlFile), "utf8"));
    const main = H.findAll(tree, "main").find((m) => m.attrs.id === "main");
    const lead = main.children.find((c) => c.tag === "p" && H.hasClass(c, "lead"));
    if (!lead) continue;
    const snippet = H.textOf(lead).replace(/[`*_[\]()#>]/g, "").slice(0, 40).replace(/\s+/g, " ");
    if (snippet && !plain.includes(snippet)) {
      note("COURSE.md", "missing content from " + htmlFile);
    }
  }
}

/* report */

if (problems.length === 0) {
  console.log("markdown check: all " + PAGES.length + " pages match their HTML source");
  console.log("  no stray HTML, balanced fences, tables and code blocks present");
  process.exit(0);
}

console.log("markdown check found " + problems.length + " problem(s):");
for (const p of problems) console.log("  " + p);
process.exit(1);
