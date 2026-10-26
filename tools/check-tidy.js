/**
 * Tidy check for the generated markdown.
 *
 * Catches the things that make generated markdown look machine-made:
 *   - stacked bold lines with no structure between them
 *   - paragraphs that are one very long line
 *   - code fences that lost their indentation
 *   - blank-line runs
 *   - trailing whitespace
 *   - fences whose language badge is a sentence
 *
 * Usage:  node tools/check-tidy.js
 */
const fs = require("fs");
const path = require("path");
const H = require("./html-parse");

const ROOT = path.join(__dirname, "..");
const MD = path.join(ROOT, "md");
const HTML = path.join(ROOT, "html");

const files = fs.readdirSync(MD).filter((f) => /^\d\d-.*\.md$/.test(f)).sort();

const problems = [];
const add = (file, line, msg) => problems.push(file + ":" + line + "  " + msg);

// markdown file → html source
const SRC = {
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

let codeLines = 0;
let proseLines = 0;

for (const file of files) {
  const raw = fs.readFileSync(path.join(MD, file), "utf8");
  const lines = raw.split("\n");

  let inFence = false;
  let fenceBar = "";
  let prevBlank = 0;
  let fenceStart = 0;
  const fenceContent = [];

  lines.forEach((line, i) => {
    const n = i + 1;

    // ── fences ────────────────────────────────────────────
    const fm = line.match(/^(`{3,})(.*)$/);
    if (fm) {
      if (!inFence) {
        inFence = true;
        fenceBar = fm[1];
        fenceStart = n;
        fenceContent.length = 0;

        // A language badge should be a short token, not a sentence
        const info = fm[2].trim();
        if (info && info.split(/\s+/).length > 2) {
          add(file, n, 'fence info string looks like a caption: "' + info + '"');
        }
      } else if (line.startsWith(fenceBar)) {
        inFence = false;
      }
      prevBlank = 0;
      return;
    }

    if (inFence) {
      codeLines++;
      fenceContent.push(line);
      return;
    }

    // ── blank lines ───────────────────────────────────────
    if (!line.trim()) {
      prevBlank++;
      if (prevBlank >= 2) add(file, n, "more than one blank line in a row");
      return;
    }
    prevBlank = 0;

    // ── trailing whitespace ───────────────────────────────
    if (/[ \t]+$/.test(line)) add(file, n, "trailing whitespace");

    // ── stacked bold lines ────────────────────────────────
    // "**Tip**" immediately followed by "**Title**" reads as two orphan labels.
    const isBoldOnly = /^\*\*[^*]+\*\*$/.test(line.trim());
    if (isBoldOnly) {
      const next = (lines[i + 1] || "").trim();
      const prev = (lines[i - 1] || "").trim();
      if (/^\*\*[^*]+\*\*$/.test(next)) {
        add(file, n, "two bold-only lines stacked: " + line.trim() + " / " + next);
      }
      if (!prev && /^\*\*[^*]+\*\*$/.test(prev) === false && prev === "" && next === "") {
        // isolated bold label surrounded by blanks is fine
      }
    }

    // ── overlong prose lines ──────────────────────────────
    const isStructural = /^\s*[|>#<]|^\s*[-*+]\s|^\s*\d+\.\s|^ {2,}/.test(line);
    // Nav footers and any line holding a link are deliberately not reflowed,
    // because breaking a line inside [text](url) breaks the link.
    const hasLink = /\]\(/.test(line);
    const isNav = /^\s*(←|→)/.test(line);
    if (!isStructural) {
      proseLines++;
      if (line.length > 90 && !hasLink && !isNav) {
        add(file, n, "prose line is " + line.length + " chars (wrapping missed)");
      }
    }
  });

  if (inFence) add(file, fenceStart, "code fence never closed");

  // ── code indentation survived? ──────────────────────────
  // Compare the first indented line of each HTML <pre> with the markdown.
  const htmlFile = SRC[file];
  if (htmlFile) {
    const tree = H.parse(fs.readFileSync(path.join(HTML, htmlFile), "utf8"));
    const pres = H.findAll(tree, "pre").map((p) => H.rawText(p));

    for (const code of pres) {
      const indented = code.split("\n").find((l) => /^\s{2,}\S/.test(l));
      if (!indented) continue;
      const trimmed = indented.trim();
      if (!trimmed) continue;
      // the exact indented line must appear somewhere in the markdown
      if (!raw.includes(indented)) {
        add(file, 0, 'code indentation lost: expected "' + indented.slice(0, 50) + '"');
      }
    }
  }

  // ── file shape ────────────────────────────────────────
  if (raw.endsWith("\n\n")) add(file, lines.length, "file ends with a blank line");
  if (/\n{3,}/.test(raw)) add(file, 0, "three or more blank lines somewhere");
}

/* COURSE.md and index.md */

for (const extra of ["COURSE.md", path.join("md", "index.md")]) {
  const p = path.join(ROOT, extra);
  if (!fs.existsSync(p)) {
    problems.push(extra + ": missing");
    continue;
  }
  const raw = fs.readFileSync(p, "utf8");
  if (/\n{3,}/.test(raw)) problems.push(extra + ": three or more blank lines somewhere");
  if (/[ \t]+\n/.test(raw)) problems.push(extra + ": trailing whitespace");
}

/* report */

console.log(
  "checked " + files.length + " topic files + index.md + COURSE.md " +
  "(" + proseLines + " prose lines, " + codeLines + " code lines)"
);

if (problems.length === 0) {
  console.log("tidy: no issues");
} else {
  console.log("");
  console.log(problems.length + " issue(s):");
  for (const p of problems.slice(0, 40)) console.log("  " + p);
  if (problems.length > 40) console.log("  … and " + (problems.length - 40) + " more");
  process.exitCode = 1;
}
