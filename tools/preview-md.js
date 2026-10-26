/**
 * Renders markdown to HTML and screenshots it, so the result can be eyeballed.
 *
 * Usage:  node tools/preview-md.js <md-file> <out-png> <node_modules>
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const mdFile = process.argv[2];
const outPng = process.argv[3];
const modules = process.argv[4];

const { marked } = require(path.join(modules, "marked"));

const md = fs.readFileSync(mdFile, "utf8");
const body = marked.parse(md);

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>
  body { font: 14.5px/1.62 Georgia, serif; max-width: 700px; margin: 28px auto;
         padding: 0 22px; color: #1e1b16; background: #fffdf8; }
  h1 { font-size: 27px; border-bottom: 2px solid #1e1b16; padding-bottom: 8px; margin-bottom: 20px; }
  h2 { font-size: 19px; margin-top: 30px; }
  h3 { font-size: 15.5px; margin-top: 22px; }
  code { font-family: Consolas, monospace; font-size: .89em; background: #f1ece1;
         padding: 1px 4px; border-radius: 3px; }
  pre { background: #f6f1e6; border: 1px solid #ded6c5; border-radius: 6px;
        padding: 13px; overflow-x: auto; font-size: 12.5px; line-height: 1.5; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin: 14px 0; }
  th, td { border: 1px solid #ded6c5; padding: 7px 10px; text-align: left; vertical-align: top; }
  th { background: #f1ece1; }
  blockquote { margin: 14px 0; padding: 6px 0 6px 13px; border-left: 3px solid #a8491c;
               color: #6b4a2f; font-size: 13.5px; }
  blockquote p { margin: 0; }
  em { color: #5a524c; }
  ol, ul { padding-left: 22px; }
  li { margin-bottom: 5px; }
  hr { border: 0; border-top: 1px solid #ded6c5; margin: 24px 0; }
</style></head><body>${body}</body></html>`;

const tmp = path.join(os.tmpdir(), "md-preview-" + Date.now() + ".html");
fs.writeFileSync(tmp, html, "utf8");

const chrome = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));

execFileSync(chrome, [
  "--headless=new", "--disable-gpu", "--no-sandbox",
  `--user-data-dir=${path.join(os.tmpdir(), "mdprev-" + Date.now())}`,
  "--window-size=760,1900",
  "--virtual-time-budget=4000",
  `--screenshot=${outPng}`,
  "file:///" + tmp.replace(/\\/g, "/"),
], { stdio: "ignore" });

fs.unlinkSync(tmp);
console.log("wrote " + outPng);
