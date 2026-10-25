"""Fill the printed page numbers into the PDF's contents page.

Two-pass process:
  1. build-print.js emits the contents page with empty page-number slots.
  2. This script locates each topic's real page in the rendered PDF, then
     re-renders with those numbers baked in.

Usage:  python fill-toc-pages.js   (see build-all.ps1 for the full pipeline)
"""
import json
import re
import sys

import fitz

PDF = "JavaScript-Interview-Prep.pdf"

GROUPS = [
    ["Closures", "The this keyword", "Prototypes and classes",
     "Types and conversion", "Promises and async/await", "The event loop",
     "Array methods you write yourself"],
    ["Debounce and throttle", "Promise.all and friends",
     "Retry with backoff", "Curry", "Flatten", "Memoize",
     "Deep clone", "The DOM and events", "Event emitter",
     "classnames and JSON"],
    ["How to run the interview", "Practice and scoring"],
]
TITLES = [t for g in GROUPS for t in g]


def normalise(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", s.lower())


def find_pages(doc):
    """Topic headings are set at ~21pt in the top third of a page."""
    found = {}
    for page_no in range(2, doc.page_count):  # skip cover + contents
        page = doc[page_no]
        for block in page.get_text("dict")["blocks"]:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                if line["bbox"][1] > 220:
                    continue
                size = max((s["size"] for s in line["spans"]), default=0)
                if size < 16:
                    continue
                key = normalise("".join(s["text"] for s in line["spans"]))
                for title in TITLES:
                    if title not in found and key == normalise(title):
                        found[title] = page_no + 1
    return found


def main() -> int:
    doc = fitz.open(PDF)
    pages = find_pages(doc)
    doc.close()

    missing = [t for t in TITLES if t not in pages]
    if missing:
        print("could not locate: " + ", ".join(missing), file=sys.stderr)
        return 1

    # keyed by section id t1..t19, in course order
    mapping = {f"t{i + 1}": pages[t] for i, t in enumerate(TITLES)}
    with open("toc-pages.json", "w", encoding="utf-8") as fh:
        json.dump(mapping, fh, indent=2)

    print(f"resolved {len(mapping)} topic pages")
    print("  " + ", ".join(f"{k}=p{v}" for k, v in list(mapping.items())[:5]) + " …")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
