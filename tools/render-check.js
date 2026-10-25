/**
 * Renders each markdown page with a real markdown parser and checks that the
 * output has the structure we expect: headings, code blocks, tables, lists.
 * A parser is the only honest way to know the file displays correctly.
 *
 * Usage:  node render-check.js <path-to-markdown-dir> <path-to-node_modules>
 */
const fs = require("fs");
const path = require("path");

const MD_DIR = process.argv[2];
const MODULES = process.argv[3];

const HTML_DIR = path.join(MD_DIR, "..", "html");

// markdown file → html source file
const SRC_BY_MD = {
  "01-closures.md": "01-closures.html",
  "02-this.md": "02-this.html",
  "03-prototypes.md": "03-prototypes.html",
  "04-types.md": "04-types.html",
  "05-promises.md": "05-promises.html",
  "06-event-loop.md": "06-event-loop.html",
  "07-array-polyfills.md": "07-array-polyfills.html",
  "08-debounce.md": "08-debounce-throttle.html",
  "09-combinators.md": "09-promise-combinators.html",
  "10-retry.md": "10-retry-backoff.html",
  "11-curry.md": "11-curry.html",
  "12-flatten.md": "12-flatten.html",
  "13-memoize.md": "13-memoize.html",
  "14-deep-clone.md": "14-deep-clone.html",
  "15-dom.md": "15-dom.html",
  "16-emitter.md": "16-event-emitter.html",
  "17-utilities.md": "17-utilities.html",
  "18-interview.md": "18-interview-routine.html",
  "19-mock.md": "19-mock-rubric.html",
};

const { marked } = require(path.join(MODULES, "marked"));

const files = fs.readdirSync(MD_DIR).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();
const problems = [];

for (const file of files) {
  const md = fs.readFileSync(path.join(MD_DIR, file), "utf8");
  const html = marked.parse(md);

  const count = (re) => (html.match(re) || []).length;

  const h1 = count(/<h1[^>]*>/g);
  const h2 = count(/<h2[^>]*>/g);
  const h3 = count(/<h3[^>]*>/g);
  const pre = count(/<pre[^>]*>/g);
  const tables = count(/<table[^>]*>/g);
  const lists = count(/<[uo]l[^>]*>/g);
  const links = count(/<a [^>]*href=/g);

  if (h1 !== 1) problems.push(file + ": " + h1 + " h1 (expected 1)");
  if (h2 < 3) problems.push(file + ": only " + h2 + " h2 sections");

  // Compare code-block count against the HTML source rather than a fixed
  // number: some pages are advice, not code.
  const htmlFile = SRC_BY_MD[file];
  if (htmlFile) {
    const src = fs.readFileSync(path.join(HTML_DIR, htmlFile), "utf8");
    const expected = (src.match(/<pre\b/g) || []).length;
    if (pre !== expected) {
      problems.push(file + ": " + pre + " code blocks, HTML has " + expected);
    }
  }

  // Unclosed fences show up as literal backticks in the output
  if (/```/.test(html)) problems.push(file + ": literal ``` survived rendering");

  // Raw HTML that should have become markdown
  if (/<span|<div/.test(html)) problems.push(file + ": raw span/div in output");

  // A table row leaking as plain text means a broken table
  if (/^\|/m.test(html.replace(/<[^>]+>/g, ""))) {
    problems.push(file + ": table pipe leaked as text");
  }

  console.log(
    file.padEnd(26) +
      "h2=" + String(h2).padStart(2) +
      "  h3=" + String(h3).padStart(2) +
      "  code=" + String(pre).padStart(2) +
      "  tables=" + tables +
      "  lists=" + lists +
      "  links=" + links
  );
}

console.log("");
if (problems.length === 0) {
  console.log("render check: all " + files.length + " pages parse cleanly");
} else {
  console.log("render check found " + problems.length + " problem(s):");
  for (const p of problems) console.log("  " + p);
  process.exitCode = 1;
}
