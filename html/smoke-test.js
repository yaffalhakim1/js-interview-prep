/** Runs every data-run snippet from the course pages and reports failures. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const files = fs.readdirSync(__dirname).filter((f) => /^\d\d-.*\.html$/.test(f));
let total = 0;
const failures = [];
const missingOut = [];

for (const file of files) {
  const raw = fs.readFileSync(path.join(__dirname, file), "utf8");
  const blocks = [...raw.matchAll(/<pre data-run><code>([\s\S]*?)<\/code><\/pre>/g)];

  // every runnable block must own an output panel, or Run has nowhere to print
  const runs = (raw.match(/data-run/g) || []).length;
  const outs = (raw.match(/class="out"/g) || []).length;
  if (runs > outs) missingOut.push({ file, runs, outs });

  blocks.forEach((m, i) => {
    total++;
    const code = m[1]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const logs = [];
    // Only inject what a browser provides; let the vm context own its
    // intrinsics (Array, Object, Promise...) so prototypes match literals.
    const sandbox = {
      console: {
        log: (...a) => logs.push(a),
        info: (...a) => logs.push(a),
        warn: (...a) => logs.push(a),
        error: (...a) => logs.push(a),
      },
      setTimeout,
      setInterval,
      clearTimeout,
      clearInterval,
      queueMicrotask,
      structuredClone,
      AbortController,
      performance,
    };
    sandbox.globalThis = sandbox;

    try {
      vm.createContext(sandbox);
      // Strict mode matches how the browser runner wraps snippets, so a
      // sloppy-mode-only behaviour can't pass here and fail in the page.
      vm.runInContext('"use strict";\n' + code, sandbox, { timeout: 4000 });
    } catch (err) {
      failures.push({ file, index: i + 1, err: err.name + ": " + err.message });
    }
  });
}

const isDomPage = (f) => f.startsWith("15-");const domFailures = failures.filter((f) => isDomPage(f.file));
const realFailures = failures.filter((f) => !isDomPage(f.file));

console.log(`checked ${total} snippets across ${files.length} pages`);
console.log(`${domFailures.length} skipped (DOM pages need a browser)`);

if (missingOut.length) {
  console.log(`\n${missingOut.length} page(s) with a runnable block missing its .out panel:`);
  for (const m of missingOut) console.log(`  ${m.file} → ${m.runs} run blocks, ${m.outs} out panels`);
}

if (realFailures.length === 0) {
  console.log("all non-DOM snippets ran without throwing");
} else {
  console.log(`\n${realFailures.length} snippet(s) threw:`);
  for (const f of realFailures) console.log(`  ${f.file} block#${f.index} → ${f.err}`);
}

setTimeout(() => process.exit(0), 2500);
