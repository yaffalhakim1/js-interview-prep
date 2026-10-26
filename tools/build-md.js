/**
 * Builds the markdown edition of the course from the HTML pages, so the two
 * editions can never drift apart.
 *
 * Usage:  node tools/build-md.js
 *
 * Writes:
 *   md/index.md          — contents page
 *   md/NN-topic.md       — one file per topic
 *   COURSE.md            — every topic in one file, for reading or printing
 */
const fs = require("fs");
const path = require("path");
const H = require("./html-parse");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "html");
const OUT = path.join(ROOT, "md");

/* ── course map, mirrors html/assets/nav.js ───────────────── */

const NAV = [
  {
    month: "Month 1",
    label: "Language basics",
    items: [
      ["01-closures.html", "Closures", "closures"],
      ["02-this.html", "The this keyword", "this"],
      ["03-prototypes.html", "Prototypes and classes", "prototypes"],
      ["04-types.html", "Types and conversion", "types"],
      ["05-promises.html", "Promises and async/await", "promises"],
      ["06-event-loop.html", "The event loop", "event-loop"],
      ["07-array-polyfills.html", "Array methods you write yourself", "array-polyfills"],
    ],
  },
  {
    month: "Month 2",
    label: "Coding questions",
    items: [
      ["08-debounce-throttle.html", "Debounce and throttle", "debounce"],
      ["09-promise-combinators.html", "Promise.all and friends", "combinators"],
      ["10-retry-backoff.html", "Retry with backoff", "retry"],
      ["11-curry.html", "Curry", "curry"],
      ["12-flatten.html", "Flatten", "flatten"],
      ["13-memoize.html", "Memoize", "memoize"],
      ["14-deep-clone.html", "Deep clone", "deep-clone"],
      ["15-dom.html", "The DOM and events", "dom"],
      ["16-event-emitter.html", "Event emitter", "emitter"],
      ["17-utilities.html", "classnames and JSON", "utilities"],
    ],
  },
  {
    month: "Month 3",
    label: "Doing it well",
    items: [
      ["18-interview-routine.html", "How to run the interview", "interview"],
      ["19-mock-rubric.html", "Practice and scoring", "mock"],
    ],
  },
];

const PAGES = NAV.flatMap((g) => g.items.map(([file, title, id]) => ({ file, title, id, group: g })));

/* ── block rendering ─────────────────────────────────────── */

function fence(lang, code) {
  // Use a longer fence if the code itself contains backticks runs
  const longest = (code.match(/`+/g) || []).reduce((a, b) => Math.max(a, b.length), 0);
  const bar = "`".repeat(Math.max(3, longest + 1));
  return bar + (lang || "") + "\n" + code.replace(/\s+$/, "") + "\n" + bar;
}

/**
 * Wrap prose at a comfortable width. Hard-wrapping makes diffs readable and
 * stops every paragraph from being one 200-character line.
 *
 * Fenced code, tables, lists, blockquotes and headings pass through untouched:
 * reflowing code would destroy its indentation and comment alignment.
 */
function wrap(text, width = 78) {
  const out = [];
  let inFence = false;
  let fenceBar = "";

  for (const para of text.split("\n")) {
    // Track fenced blocks so nothing inside them is touched.
    const fenceMatch = para.match(/^(`{3,})/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceBar = fenceMatch[1];
      } else if (para.startsWith(fenceBar)) {
        inFence = false;
      }
      out.push(para);
      continue;
    }
    if (inFence) {
      out.push(para);
      continue;
    }

    if (!para.trim()) {
      out.push("");
      continue;
    }

    // Never reflow lines that are structural, or that contain a link: breaking
    // a line inside [text](url) produces a broken link.
    if (/^\s*[|>#<]|^\s*[-*+]\s|^\s*\d+\.\s|^ {2,}|`{3,}/.test(para)) {
      out.push(para);
      continue;
    }
    if (/\]\(/.test(para) || /^\s*(←|→)/.test(para)) {
      out.push(para);
      continue;
    }

    let line = "";
    for (const word of para.split(/\s+/)) {
      if (!line) {
        line = word;
      } else if ((line + " " + word).length <= width) {
        line += " " + word;
      } else {
        out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out.join("\n");
}

function renderCodeBlock(block) {
  const bar = H.find(block, "div");
  let label = "";
  if (bar) {
    const span = bar.children.find((c) => H.hasClass(c, "label"));
    if (span) label = H.textOf(span);
  }

  const pre = H.find(block, "pre");
  const code = pre ? H.rawText(pre) : "";

  // Guess the language for the fence from the label, defaulting to js
  let lang = "js";
  if (/^(bash|sh|powershell|pwsh)$/i.test(label.split(/[.\s]/)[0] || "")) lang = "bash";
  if (/^(json)$/i.test(label)) lang = "json";

  // A caption line reads better than stuffing the label into the info string,
  // which most renderers show as a language badge.
  const caption = label ? "*" + label + "*\n\n" : "";
  return caption + fence(lang, code);
}

function renderCallout(block) {
  const kind = ["why", "gotcha", "tip", "say"].find((k) => H.hasClass(block, k));
  const marker = {
    why: "Why this matters",
    gotcha: "Watch out",
    tip: "Tip",
    say: "Say this in an interview",
  }[kind] || "Note";

  // The icon column and the content column are siblings
  const cols = block.children.filter((c) => c.tag === "div");
  const content = cols[cols.length - 1];
  if (!content) return "";

  const h4 = (content.children || []).find((c) => c.tag === "h4");
  const heading = h4 ? H.textOf(h4) : "";

  const children = (content.children || []).filter((c) => c.tag !== "h4");
  const body = renderBlocks({ children }, { inCallout: true });

  // One blockquote line marks the callout. The body stays plain text so that
  // code inside it can be copied without stripping "> " from every line.
  const label = heading && heading.toLowerCase() !== marker.toLowerCase()
    ? "> **" + heading + "**"
    : "> **" + marker + "**";

  return body ? label + "\n\n" + body : label;
}

function renderTable(wrap) {
  const table = H.find(wrap, "table");
  if (!table) return "";

  const rows = H.findAll(table, "tr");
  if (!rows.length) return "";

  const cells = (tr) =>
    tr.children
      .filter((c) => c.tag === "th" || c.tag === "td")
      .map((c) => H.inlineBlock(c).replace(/\|/g, "\\|").replace(/\n/g, " "));

  const head = cells(rows[0]);
  const body = rows.slice(1).map(cells);

  const width = Math.max(head.length, ...body.map((r) => r.length), 1);
  const pad = (r) => {
    const out = r.slice();
    while (out.length < width) out.push("");
    return out;
  };

  const lines = [];
  lines.push("| " + pad(head).join(" | ") + " |");
  lines.push("| " + pad(head).map(() => "---").join(" | ") + " |");
  for (const r of body) lines.push("| " + pad(r).join(" | ") + " |");
  return lines.join("\n");
}

function renderDetails(det) {
  const isQuiz = H.hasClass(det, "quiz");
  const summary = det.children.find((c) => c.tag === "summary");
  const heading = summary ? H.textOf(summary) : "Details";

  const parts = [];
  if (isQuiz) {
    const opts = H.findAll(det, "div").filter((d) => H.hasClass(d, "opt"));
    if (opts.length) {
      // A blank line is required before a list, or the parser treats it as
      // part of the preceding paragraph.
      parts.push("Options:\n");
      for (const opt of opts) {
        const correct = H.hasClass(opt, "correct");
        parts.push("- " + H.inlineBlock(opt) + (correct ? " **← correct**" : ""));
      }
      parts.push("");
    }
  }

  const body = det.children.find((c) => c.tag === "div" && H.hasClass(c, "body"));
  if (body) parts.push(renderBlocks(body));

  const label = (isQuiz ? "**Quiz:** " : "**Check:** ") + heading;
  const answer = parts.join("\n").trim();
  if (!answer) return label;

  // Plain block, not a blockquote, so code inside stays copy-pasteable.
  return label + "\n\n" + answer;
}

function renderList(node, ordered) {
  const items = node.children.filter((c) => c.tag === "li");
  return items
    .map((li, i) => {
      const bullet = ordered ? i + 1 + ". " : "- ";
      // Render nested blocks, then indent continuation lines
      const inner = renderBlocks(li).trim();
      const lines = inner.split("\n");
      const first = lines[0] || "";
      const rest = lines.slice(1).map((l) => (l.trim() ? "   " + l : l));
      return bullet + first + (rest.length ? "\n" + rest.join("\n") : "");
    })
    .join("\n");
}

const INLINE_TAGS = new Set([
  "code", "strong", "b", "em", "i", "a", "span", "br", "small", "sub", "sup",
]);

function isInlineNode(node) {
  return node.tag === "#text" || INLINE_TAGS.has(node.tag);
}

function renderBlocks(node, opts = {}) {
  const out = [];
  let counter = 0;
  let inlineRun = [];

  // Consecutive inline nodes form one paragraph. Without this, a sentence
  // containing <code> would be split into three separate blocks.
  const flush = () => {
    if (!inlineRun.length) return;
    const t = inlineRun
      .map(H.inline)
      .join("")
      .replace(/[ \t]+/g, " ")
      .trim();
    inlineRun = [];
    if (t) out.push(t);
  };

  for (const child of node.children || []) {
    const tag = child.tag;

    if (isInlineNode(child)) {
      inlineRun.push(child);
      continue;
    }
    flush();

    if (tag === "#text") {
      const t = H.decode(child.text).replace(/\s+/g, " ").trim();
      if (t) out.push(t);
      continue;
    }

    switch (tag) {
      case "p": {
        if (H.hasClass(child, "eyebrow") || H.hasClass(child, "lead")) break;
        const t = H.inlineBlock(child);
        if (t) out.push(t);
        break;
      }
      case "h1":
        // The page title is added by the assembler, so skip the in-page copy.
        break;
      case "h2": {
        counter++;
        out.push("## " + counter + ". " + H.textOf(child));
        break;
      }
      case "h3":
        out.push("### " + H.textOf(child));
        break;
      case "h4": {
        const t = H.textOf(child);
        if (t) out.push(opts.inCallout ? "**" + t + "**" : "#### " + t);
        break;
      }
      case "pre":
        out.push(fence("js", H.rawText(child)));
        break;
      case "ul":
        out.push(renderList(child, false));
        break;
      case "ol":
        out.push(renderList(child, true));
        break;
      case "blockquote": {
        const t = H.inlineBlock(child);
        if (t) out.push(t.split("\n").map((l) => "> " + l).join("\n"));
        break;
      }
      case "hr":
        out.push("---");
        break;
      case "details":
        out.push(renderDetails(child));
        break;
      case "div": {
        if (H.hasClass(child, "codeblock")) {
          out.push(renderCodeBlock(child));
        } else if (H.hasClass(child, "tablewrap")) {
          out.push(renderTable(child));
        } else if (H.hasClass(child, "callout")) {
          out.push(renderCallout(child));
        } else if (H.hasClass(child, "grid")) {
          const cards = H.findAll(child, "div").filter((d) => H.hasClass(d, "card"));
          for (const card of cards) {
            const h4 = card.children.find((c) => c.tag === "h4");
            const title = h4 ? H.textOf(h4) : "";
            const body = card.children
              .filter((c) => c.tag === "p")
              .map((p) => H.inlineBlock(p))
              .join(" ");
            out.push("**" + title + "**" + (body ? " " + body : ""));
          }
        } else if (H.hasClass(child, "card")) {
          const h4 = child.children.find((c) => c.tag === "h4");
          const title = h4 ? H.textOf(h4) : "";
          const body = child.children
            .filter((c) => c.tag === "p")
            .map((p) => H.inlineBlock(p))
            .join(" ");
          if (title || body) out.push("**" + title + "**" + (body ? " " + body : ""));
        } else if (H.hasClass(child, "pagefoot")) {
          break;
        } else {
          // Unknown wrapper: recurse so nothing is lost
          const inner = renderBlocks(child, opts).trim();
          if (inner) out.push(inner);
        }
        break;
      }
      case "section":
      case "main":
      case "nav":
      case "aside":
      case "script":
      case "style":
        break;
      default: {
        const t = H.inlineBlock(child);
        if (t) out.push(t);
      }
    }
  }

  flush();
  return out.filter(Boolean).join("\n\n");
}

/* ── page extraction ─────────────────────────────────────── */

function extractPage(file) {
  const raw = fs.readFileSync(path.join(SRC, file), "utf8");
  const tree = H.parse(raw);

  const main = H.findAll(tree, "main").find((m) => m.attrs.id === "main");
  if (!main) throw new Error("no <main id=\"main\"> in " + file);

  const eyebrowNode = main.children.find((c) => c.tag === "p" && H.hasClass(c, "eyebrow"));
  const leadNode = main.children.find((c) => c.tag === "p" && H.hasClass(c, "lead"));

  const eyebrow = eyebrowNode ? H.textOf(eyebrowNode) : "";
  const lead = leadNode ? H.inlineBlock(leadNode) : "";

  const body = renderBlocks(main);
  return { eyebrow, lead, body };
}

/* ── assembly ────────────────────────────────────────────── */

const BANNER = (name) =>
  "> This file is generated from `html/" +
  name +
  "`. Do not edit it by hand.\n" +
  "> Change the HTML page, then run `node tools/build-md.js`.";

const files = [];
let counter = 0;

fs.mkdirSync(OUT, { recursive: true });

// Precompute every page's markdown filename so prev/next links can be built
// before the pages are written.
const MD_NAME = new Map();
PAGES.forEach((p, i) => {
  MD_NAME.set(p.id, String(i + 1).padStart(2, "0") + "-" + p.id + ".md");
});

for (const group of NAV) {
  for (const [file, title, id] of group.items) {
    counter++;
    const num = String(counter).padStart(2, "0");
    const page = extractPage(file);

    const idx = PAGES.findIndex((p) => p.file === file);
    const prev = idx > 0 ? PAGES[idx - 1] : null;
    const next = idx < PAGES.length - 1 ? PAGES[idx + 1] : null;

    const nav = [];
    if (prev) nav.push("← [" + prev.title + "](" + MD_NAME.get(prev.id) + ")");
    nav.push("[Contents](index.md)");
    if (next) nav.push("[" + next.title + "](" + MD_NAME.get(next.id) + ") →");

    const doc = [
      BANNER(file),
      "",
      "<!-- " + page.eyebrow + " -->",
      "",
      "# " + title,
      "",
      page.lead,
      "",
      page.body,
      "",
      "---",
      "",
      nav.join(" · "),
      "",
    ].join("\n");

    // Reflow prose to a readable width, leaving code, tables and lists alone.
    const tidy = wrap(doc, 78)
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+$/gm, "")
      .trimEnd() + "\n";

    const outFile = path.join(OUT, num + "-" + id + ".md");
    fs.writeFileSync(outFile, tidy, "utf8");
    files.push({ num, id, title, file: num + "-" + id + ".md", group });
  }
}

/* index.md */

const tocLines = [];
for (const group of NAV) {
  tocLines.push("### " + group.month + " — " + group.label);
  tocLines.push("");
  for (const [, title, id] of group.items) {
    const entry = files.find((f) => f.id === id);
    // Not an ordered list: markdown would renumber 01..19 to 1..19.
    tocLines.push("- **" + entry.num + "** · [" + title + "](" + entry.file + ")");
  }
  tocLines.push("");
}

const indexDoc = [
  BANNER("index.html"),
  "",
  "# JavaScript interviews, from the basics up",
  "",
  "A 19-part course. It covers the language ideas interviewers ask about, the small",
  "helpers they ask you to write, and how to run a 35-minute interview well.",
  "",
  "Every topic has the idea first, runnable code, the edge cases worth mentioning, a",
  "script to say out loud, and questions to check yourself.",
  "",
  "There is also a single-file edition: [COURSE.md](../COURSE.md).",
  "",
  "## Contents",
  "",
  ...tocLines,
].join("\n");

fs.writeFileSync(
  path.join(OUT, "index.md"),
  wrap(indexDoc, 78).replace(/\n{3,}/g, "\n\n").trimEnd() + "\n",
  "utf8"
);

/* COURSE.md — everything in one file */

const courseParts = [
  "# JavaScript Interview Prep",
  "",
  "A 19-part course, in one file. Generated from the HTML pages in `html/`.",
  "",
  "## Contents",
  "",
  ...files.map((f) => "- [" + f.title + "](#" + f.num + "-" + f.id + ")"),
  "",
  "---",
  "",
];

for (const f of files) {
  const body = fs.readFileSync(path.join(OUT, f.file), "utf8");
  // drop the per-file banner and the prev/next footer
  const cleaned = body
    .replace(/^> This file is generated[\s\S]*?build-md\.js`\.\n\n/, "")
    .replace(/\n---\n\n(?:← )?\[[\s\S]*?\)\n$/, "")
    .trim();
  courseParts.push('<a id="' + f.num + "-" + f.id + '"></a>', "", cleaned, "", "---", "");
}

fs.writeFileSync(path.join(ROOT, "COURSE.md"), courseParts.join("\n"), "utf8");

/* report */

const stats = files.map((f) => {
  const body = fs.readFileSync(path.join(OUT, f.file), "utf8");
  return { file: f.file, kb: (body.length / 1024).toFixed(1) };
});

console.log("wrote " + files.length + " topic files + index.md to md/");
console.log("wrote COURSE.md (" + (fs.statSync(path.join(ROOT, "COURSE.md")).size / 1024).toFixed(0) + " KB)");
const smallest = stats.reduce((a, b) => (parseFloat(a.kb) < parseFloat(b.kb) ? a : b));
console.log("smallest page: " + smallest.file + " (" + smallest.kb + " KB)");
