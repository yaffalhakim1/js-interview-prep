/* JS Interview Prep — shared shell, progress, runnable snippets. */
(function () {
  "use strict";

  var PAGES = window.JS_PREP_PAGES || [];
  var NAV = window.JS_PREP_NAV || [];
  var STORE_KEY = "jsprep.complete.v1";
  var THEME_KEY = "jsprep.theme.v1";

  var pageId = document.body.getAttribute("data-page") || "";
  var index = PAGES.findIndex(function (p) { return p.id === pageId; });
  var page = index >= 0 ? PAGES[index] : null;

  /* ── storage (file:// safe) ─────────────────────────────── */

  function loadDone() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveDone(set) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(set)));
    } catch (e) { /* private mode — progress just won't persist */ }
  }

  var done = loadDone();

  /* ── theme ──────────────────────────────────────────────── */

  function applyTheme(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    var btn = document.querySelector("[data-theme-toggle]");
    if (btn) {
      btn.textContent = mode === "dark" ? "☀" : "☾";
      btn.setAttribute("aria-label", mode === "dark" ? "Switch to light theme" : "Switch to dark theme");
    }
  }

  (function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved || (prefersDark ? "dark" : "light"));
  })();

  /* ── top bar ────────────────────────────────────────────── */

  function buildTopbar() {
    var bar = document.createElement("header");
    bar.className = "topbar";
    bar.innerHTML =
      '<a class="brand" href="index.html"><span class="mark">JS</span>Interview Prep</a>' +
      '<span class="crumb">' + (page ? page.month + " · " + page.title : "Course home") + "</span>" +
      '<span class="spacer"></span>' +
      '<span class="chip" data-progress-chip><span class="lbl">Progress</span> <b>0/0</b></span>' +
      '<button class="iconbtn" type="button" data-theme-toggle aria-label="Toggle theme">☾</button>' +
      '<button class="iconbtn" type="button" data-menu aria-label="Toggle contents">☰</button>';
    document.body.insertBefore(bar, document.body.firstChild);

    bar.querySelector("[data-theme-toggle]").addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });

    bar.querySelector("[data-menu]").addEventListener("click", function () {
      var sb = document.getElementById("sidebar");
      if (sb) sb.classList.toggle("open");
    });
  }

  function refreshProgress() {
    var chip = document.querySelector("[data-progress-chip] b");
    if (chip) chip.textContent = done.size + "/" + PAGES.length;
    var fill = document.querySelector("[data-progress-fill]");
    if (fill) fill.style.width = (PAGES.length ? (done.size / PAGES.length) * 100 : 0) + "%";
    var label = document.querySelector("[data-progress-label]");
    if (label) {
      label.textContent = done.size + " of " + PAGES.length + " topics complete";
    }
    Array.prototype.forEach.call(document.querySelectorAll("[data-topic-id]"), function (el) {
      var id = el.getAttribute("data-topic-id");
      var badge = el.querySelector(".m");
      if (badge) {
        badge.className = "m" + (done.has(id) ? " done" : "");
        badge.textContent = done.has(id) ? "done" : (badge.getAttribute("data-minutes") || "") + " min";
      }
    });
  }

  /* ── sidebar ────────────────────────────────────────────── */

  function buildSidebar() {
    var host = document.getElementById("sidebar");
    if (!host) return;
    var html = "";
    NAV.forEach(function (group) {
      html += '<div class="navgroup"><h3>' + group.month + " — " + group.label + '</h3><ul class="navlist">';
      group.items.forEach(function (item) {
        var isCurrent = item.id === pageId;
        html += '<li><a href="' + item.file + '"' +
          (isCurrent ? ' aria-current="page"' : "") +
          (done.has(item.id) ? ' class="done"' : "") +
          ">" + item.title + "</a></li>";
      });
      html += "</ul></div>";
    });

    var extras = window.JS_PREP_EXTRA || [];
    if (extras.length) {
      html += '<div class="navgroup"><h3>Also</h3><ul class="navlist">';
      extras.forEach(function (item) {
        var isCurrent = item.id === pageId;
        html += '<li><a href="' + item.file + '"' +
          (isCurrent ? ' aria-current="page"' : "") +
          ">" + item.title + "</a></li>";
      });
      html += "</ul></div>";
    }

    host.innerHTML = html;
  }

  /* ── right rail: on this page ───────────────────────────── */

  function buildRail() {
    var rail = document.getElementById("rail");
    if (!rail) return;
    var heads = Array.prototype.filter.call(
      document.querySelectorAll("#main h2[id]"),
      function (h) { return h.id; }
    );
    if (heads.length < 2) { rail.style.display = "none"; return; }

    var html = "<h4>On this page</h4><ol>";
    heads.forEach(function (h) {
      html += '<li><a href="#' + h.id + '">' + h.textContent.replace(/^\d+\.\s*/, "") + "</a></li>";
    });
    html += "</ol>";
    rail.innerHTML = html;

    var links = Array.prototype.slice.call(rail.querySelectorAll("a"));
    if (!("IntersectionObserver" in window)) return;
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) {
          l.classList.toggle("active", l.getAttribute("href") === "#" + entry.target.id);
        });
      });
    }, { rootMargin: "-96px 0px -70% 0px" });
    heads.forEach(function (h) { obs.observe(h); });
  }

  /* ── page footer: mark complete + pager ─────────────────── */

  function buildFooter() {
    var host = document.querySelector(".pagefoot");
    if (!host) return;
    var prev = index > 0 ? PAGES[index - 1] : null;
    var next = index >= 0 && index < PAGES.length - 1 ? PAGES[index + 1] : null;

    var html = "";
    if (page) {
      html += '<button class="donebtn' + (done.has(pageId) ? " is-done" : "") + '" type="button" data-done-btn>' +
        (done.has(pageId) ? "✓ Marked complete" : "Mark this topic complete") + "</button>";
    }
    html += '<div class="pager">';
    html += prev
      ? '<a class="prev" href="' + prev.file + '"><span>Previous</span><b>' + prev.title + "</b></a>"
      : '<a class="prev" href="index.html"><span>Back to</span><b>Course home</b></a>';
    html += next
      ? '<a class="next" href="' + next.file + '"><span>Next</span><b>' + next.title + "</b></a>"
      : '<a class="next" href="index.html"><span>Finish</span><b>Back to course home</b></a>';
    html += "</div>";
    host.innerHTML = html;

    var btn = host.querySelector("[data-done-btn]");
    if (btn) {
      btn.addEventListener("click", function () {
        if (done.has(pageId)) {
          done.delete(pageId);
          btn.classList.remove("is-done");
          btn.textContent = "Mark this topic complete";
        } else {
          done.add(pageId);
          btn.classList.add("is-done");
          btn.textContent = "✓ Marked complete";
        }
        saveDone(done);
        buildSidebar();
        refreshProgress();
      });
    }
  }

  /* ── runnable code blocks ───────────────────────────────── */

  function runSnippet(block, code) {
    var rec = [];
    var done = false;
    var started = performance.now();
    var out = block.querySelector(".out");
    if (!out) {
      out = document.createElement("div");
      out.className = "out";
      block.appendChild(out);
    }

    var fmt = function (v) {
      if (typeof v === "string") return v;
      if (v instanceof Error) return v.name + ": " + v.message;
      if (typeof v === "function") return "ƒ " + (v.name || "anonymous");
      if (v && typeof v === "object") {
        try { return JSON.stringify(v, null, 2); } catch (e) { return String(v); }
      }
      return String(v);
    };

    function render() {
      var ms = (performance.now() - started).toFixed(0);
      out.innerHTML = rec.length
        ? rec.map(function (line) { return escapeHtml(line); }).join("\n") +
          '\n<span style="color:var(--muted)">— ' + ms + "ms" + (done ? "" : ", still running…") + "</span>"
        : '<span style="color:var(--muted)">(no console output' + (done ? "" : ", still running…") + ")</span>";
    }

    var capture = function () {
      rec.push(Array.prototype.map.call(arguments, fmt).join(" "));
      render();
    };

    out.classList.add("show");
    out.textContent = "";
    render();
    try {
      var fn = new Function("console", '"use strict";\n' + code);
      fn({ log: capture, info: capture, warn: capture, error: capture });
    } catch (err) {
      rec.push(err.name + ": " + err.message);
    }
    done = true;
    render();
    // Late logs (timers, promise callbacks) keep streaming into the panel.
    setTimeout(render, 500);
    setTimeout(render, 1500);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }

  function enhanceCode() {
    Array.prototype.forEach.call(document.querySelectorAll(".codeblock"), function (block) {
      var pre = block.querySelector("pre");
      if (!pre) return;
      var bar = block.querySelector(".bar");
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "bar";
        bar.innerHTML = '<span class="label">js</span><span class="spacer"></span>';
        block.insertBefore(bar, pre);
      }
      var spacer = bar.querySelector(".spacer") || bar.appendChild(document.createElement("span"));

      if (pre.hasAttribute("data-run")) {
        var runBtn = document.createElement("button");
        runBtn.type = "button";
        runBtn.className = "btn-mini";
        runBtn.textContent = "Run";
        runBtn.addEventListener("click", function () {
          runSnippet(block, pre.textContent);
          runBtn.textContent = "Run again";
        });
        bar.appendChild(runBtn);
      }

      var copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "btn-mini";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", function () {
        var text = pre.textContent;
        var okCopy = function () {
          copyBtn.textContent = "Copied";
          setTimeout(function () { copyBtn.textContent = "Copy"; }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(okCopy, fallback);
        } else {
          fallback();
        }
        function fallback() {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand("copy"); okCopy(); } catch (e) { copyBtn.textContent = "Select manually"; }
          document.body.removeChild(ta);
        }
      });
      bar.appendChild(copyBtn);
    });
  }

  /* ── keyboard nav ───────────────────────────────────────── */

  function keyboardNav() {
    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft" && index > 0) window.location.href = PAGES[index - 1].file;
      if (e.key === "ArrowRight" && index >= 0 && index < PAGES.length - 1) window.location.href = PAGES[index + 1].file;
    });
  }

  /* ── sideways-scrolling tables: tell the reader ─────────── */

  function markScrollableTables() {
    Array.prototype.forEach.call(document.querySelectorAll(".tablewrap"), function (wrap) {
      if (wrap.scrollWidth <= wrap.clientWidth + 1) return;
      if (wrap.nextElementSibling && wrap.nextElementSibling.classList.contains("swipe-hint")) return;
      var hint = document.createElement("p");
      hint.className = "swipe-hint";
      hint.textContent = "swipe the table sideways →";
      wrap.parentNode.insertBefore(hint, wrap.nextSibling);
    });
  }

  /* ── index page: topic cards + progress ─────────────────── */
  function buildIndex() {
    var list = document.querySelector("[data-topic-list]");
    if (!list) return;
    var html = "";
    PAGES.forEach(function (p, i) {
      var n = String(i + 1).padStart(2, "0");
      var isDone = done.has(p.id);
      html += '<a class="topic" href="' + p.file + '" data-topic-id="' + p.id + '">' +
        '<span class="n">' + n + "</span>" +
        '<span class="t">' + p.title + "<small>" + p.blurb + "</small></span>" +
        '<span class="m" data-minutes="' + p.minutes + '">' + (isDone ? "done" : p.minutes + " min") + "</span>" +
        "</a>";
    });
    list.innerHTML = html;
  }

  /* ── boot ───────────────────────────────────────────────── */

  buildTopbar();
  buildSidebar();
  buildRail();
  buildFooter();
  enhanceCode();
  keyboardNav();
  buildIndex();
  markScrollableTables();
  refreshProgress();
  applyTheme(document.documentElement.getAttribute("data-theme") || "light");

  // Rotating the phone changes which tables overflow.
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(markScrollableTables, 150);
  });

  // Rotating the phone changes which tables overflow.
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(markScrollableTables, 200);
  });
})();