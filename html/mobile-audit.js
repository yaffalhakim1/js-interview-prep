/**
 * Mobile layout audit: loads every page in a 384px-wide frame (Samsung A55
 * portrait) and reports horizontal overflow, undersized tap targets and
 * sideways-scrolling containers.
 *
 * Run:  node mobile-audit.js
 * Needs Chrome or Edge. Opens a report page in headless Chrome and prints
 * the results to the terminal.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = __dirname;
const PAGES = fs
  .readdirSync(ROOT)
  .filter((f) => /^(\d\d-.*|index)\.html$/.test(f))
  .sort();

const harness = `<!doctype html>
<html><head><meta charset="utf-8"><title>audit</title>
<style>
  html,body{margin:0;background:#fff}
  #report{font:12px/1.5 Consolas,monospace;white-space:pre-wrap;padding:10px;margin:0}
  iframe{position:absolute;left:-2200px;top:0;border:0}
</style></head><body>
<pre id="report">running…</pre>
<iframe id="f" width="384" height="854"></iframe>
<script>
var PAGES = ${JSON.stringify(PAGES)};
var frame = document.getElementById("f");
var out = [], i = 0;

function audit(doc, win) {
  var vw = win.innerWidth;
  var lines = [];
  var overflow = [];

  doc.querySelectorAll("body *").forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (r.right <= vw + 1) return;
    // ignore anything already clipped by a scroll container
    var n = el.parentElement, clipped = false;
    while (n && n !== doc.body) {
      var cs = win.getComputedStyle(n);
      if ((cs.overflowX === "auto" || cs.overflowX === "scroll" || cs.overflowX === "hidden")
          && n.scrollWidth > n.clientWidth + 1) { clipped = true; break; }
      n = n.parentElement;
    }
    if (clipped) return;
    var cls = String(el.className || "").trim().split(/\\s+/).slice(0,2).join(".");
    overflow.push(el.tagName.toLowerCase() + (cls ? "." + cls : "") +
      " right=" + Math.round(r.right));
  });

  var small = [];
  doc.querySelectorAll("button, summary, .iconbtn, .btn-mini, .donebtn").forEach(function (el) {
    var r = el.getBoundingClientRect();
    if (r.width === 0) return;
    if (r.height < 43 || r.width < 43) {
      small.push((el.textContent || el.tagName).trim().slice(0, 12) +
        " " + Math.round(r.width) + "x" + Math.round(r.height));
    }
  });

  var minText = 99;
  doc.querySelectorAll("p, li, td, .lead, summary, .codeblock pre").forEach(function (el) {
    if (!el.textContent.trim()) return;
    var fs = parseFloat(win.getComputedStyle(el).fontSize);
    if (fs < minText) minText = fs;
  });

  var hints = doc.querySelectorAll(".swipe-hint").length;
  var pageScrolls = doc.documentElement.scrollWidth > vw + 1;

  if (overflow.length) lines.push("  OVERFLOW " + overflow.slice(0, 5).join(" | "));
  if (small.length) lines.push("  small taps: " + small.slice(0, 5).join(" | "));
  if (minText < 12) lines.push("  text under 12px: " + minText + "px");
  if (pageScrolls) lines.push("  PAGE SCROLLS SIDEWAYS");
  if (!lines.length) lines.push("  ✓ clean · min text " + minText + "px · swipe hints " + hints);
  return lines;
}

function next() {
  if (i >= PAGES.length) {
    document.getElementById("report").textContent = out.join("\\n");
    document.title = "DONE";
    return;
  }
  var page = PAGES[i++];
  frame.onload = function () {
    setTimeout(function () {
      out.push(page);
      try {
        out = out.concat(audit(frame.contentDocument, frame.contentWindow));
      } catch (e) {
        out.push("  ERROR " + e.message);
      }
      next();
    }, 240);
  };
  frame.src = page;
}
next();
</script></body></html>`;

const tmpDir = path.join(os.tmpdir(), "jsprep-mobile-audit");
fs.mkdirSync(tmpDir, { recursive: true });
const harnessPath = path.join(ROOT, "_audit-run.html");
fs.writeFileSync(harnessPath, harness, "utf8");

const candidates = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const chrome = candidates.find((p) => fs.existsSync(p));
if (!chrome) {
  console.error("Chrome or Edge not found.");
  process.exit(1);
}

const shot = path.join(tmpDir, "report.png");
execFileSync(chrome, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  "--allow-file-access-from-files",
  `--user-data-dir=${path.join(tmpDir, "profile")}`,
  "--window-size=1000,2000",
  "--virtual-time-budget=45000",
  `--screenshot=${shot}`,
  "file:///" + harnessPath.replace(/\\/g, "/"),
], { stdio: "ignore" });

fs.unlinkSync(harnessPath);

console.log("Report image: " + shot);
console.log("Open it to read the per-page results.");
console.log(`Pages audited: ${PAGES.length} at 384px wide (Samsung A55 portrait).`);
