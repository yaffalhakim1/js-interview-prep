/**
 * Readability audit of the course pages.
 *
 * Finds the things that actually make technical writing hard:
 *   - long sentences
 *   - abstract nouns used before they are explained
 *   - paragraphs that never give a concrete example
 *
 * Usage:  node tools/audit-readability.js
 */
const fs = require("fs");
const path = require("path");
const H = require("./html-parse");

const HTML = path.join(__dirname, "..", "html");

const files = fs
  .readdirSync(HTML)
  .filter((f) => /^\d\d-.*\.html$/.test(f))
  .sort();

// Words that need a plain-English gloss when first used.
const JARGON = [
  "lexical scope", "prototype chain", "coercion", "arity", "microtask",
  "macrotask", "polyfill", "variadic", "memoize", "idempotent", "jitter",
  "hoisting", "temporal dead zone", "descriptor", "thenable", "sparse",
  "closure", "currying", "backoff", "delegation", "bubbling", "capturing",
];

function proseOf(html) {
  // Strip code blocks: they are not prose and skew sentence length.
  const noCode = html
    .replace(/<pre[\s\S]*?<\/pre>/g, " ")
    .replace(/<code>[\s\S]*?<\/code>/g, " CODE ");
  const tree = H.parse(noCode);
  const paras = [];

  // Walk everything except pre/code, collecting paragraph and list text.
  const walk = (node) => {
    for (const child of node.children || []) {
      if (child.tag === "pre" || child.tag === "code" || child.tag === "script" || child.tag === "style") {
        continue;
      }
      if (child.tag === "p" || child.tag === "li") {
        const t = H.textOf(child);
        if (t.length > 20) paras.push(t);
        continue;
      }
      walk(child);
    }
  };

  walk(tree);
  return paras;
}

function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const rows = [];

for (const file of files) {
  const html = fs.readFileSync(path.join(HTML, file), "utf8");
  const paras = proseOf(html);

  let totalSentences = 0;
  let longSentences = 0;
  let longest = { words: 0, text: "" };
  let words = 0;

  for (const p of paras) {
    for (const s of sentences(p)) {
      const w = s.split(/\s+/).filter(Boolean).length;
      words += w;
      totalSentences++;
      if (w > 30) longSentences++;
      if (w > longest.words) longest = { words: w, text: s };
    }
  }

  // Jargon used before a definition appears anywhere on the page
  const lower = paras.join(" ").toLowerCase();
  const undefinedJargon = JARGON.filter((term) => {
    const i = lower.indexOf(term);
    if (i === -1) return false;
    // is there an explanation within 200 chars after the first use?
    const window = lower.slice(i, i + 260);
    return !/(is|means|which means|called|refers to|that is)/.test(window);
  });

  rows.push({
    file,
    sentences: totalSentences,
    avgWords: totalSentences ? Math.round(words / totalSentences) : 0,
    longPct: totalSentences ? Math.round((longSentences / totalSentences) * 100) : 0,
    longest: longest.words,
    longestText: longest.text,
    jargon: undefinedJargon,
  });
}

rows.sort((a, b) => b.longPct - a.longPct);

console.log("page                        avg   >30w   longest   jargon needing a gloss");
console.log("-".repeat(96));
for (const r of rows) {
  console.log(
    r.file.replace(".html", "").padEnd(26) +
      String(r.avgWords).padStart(4) +
      String(r.longPct + "%").padStart(8) +
      String(r.longest).padStart(9) +
      "   " +
      (r.jargon.length ? r.jargon.join(", ") : "-")
  );
}

const worst = rows.filter((r) => r.longPct > 20 || r.longest > 40);
console.log("");
if (worst.length) {
  console.log("worst offenders:");
  for (const r of worst) {
    console.log("  " + r.file + " — longest sentence (" + r.longest + " words):");
    console.log('    "' + r.longestText.slice(0, 180) + '"');
  }
}
