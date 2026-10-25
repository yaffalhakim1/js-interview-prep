"""Rebuild the PDF outline as two clean levels: month groups, then topics.

Chrome's --generate-pdf-document-outline emits every heading level, which buries
the 19 topics under callout titles. This rewrites the outline using the known
course structure, locating each topic by its heading text on the page.

Usage:  python make-toc.py
"""
import re
import sys

import fitz

PDF = "JavaScript-Interview-Prep.pdf"

GROUPS = [
    ("Month 1 — Language basics", [
        "Closures",
        "The this keyword",
        "Prototypes and classes",
        "Types and conversion",
        "Promises and async/await",
        "The event loop",
        "Array methods you write yourself",
    ]),
    ("Month 2 — Coding questions", [
        "Debounce and throttle",
        "Promise.all and friends",
        "Retry with backoff",
        "Curry",
        "Flatten",
        "Memoize",
        "Deep clone",
        "The DOM and events",
        "Event emitter",
        "classnames and JSON",
    ]),
    ("Month 3 — Doing it well", [
        "How to run the interview",
        "Practice and scoring",
    ]),
]


def normalise(s: str) -> str:
    """Collapse whitespace and strip everything but letters/digits."""
    return re.sub(r"[^a-z0-9]", "", s.lower())


def find_topic_pages(doc):
    """Map each heading to the first page where it appears near the top."""
    # Precompute a normalised text blob per page, plus the heading's y position.
    wanted = [(g, t) for g, titles in GROUPS for t in titles]
    found = {}

    for page_no in range(doc.page_count):
        page = doc[page_no]
        if page_no < 2:  # cover + contents page reuse the same titles
            continue
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if block.get("type") != 0:
                continue
            for line in block["lines"]:
                if line["bbox"][1] > 220:  # headings sit in the top third
                    continue
                # Topic titles are set at 21pt; TOC and body text are much smaller.
                size = max((span["size"] for span in line["spans"]), default=0)
                if size < 16:
                    continue
                text = "".join(span["text"] for span in line["spans"])
                key = normalise(text)
                if len(key) < 4:
                    continue
                for group, title in wanted:
                    if title in found:
                        continue
                    if key == normalise(title):
                        found[title] = page_no + 1

    return found


def main() -> int:
    doc = fitz.open(PDF)
    pages = find_topic_pages(doc)

    missing = [t for _, titles in GROUPS for t in titles if t not in pages]
    if missing:
        print("could not locate: " + ", ".join(missing), file=sys.stderr)
        return 1

    toc = []
    for group, titles in GROUPS:
        toc.append([1, group, pages[titles[0]]])
        for title in titles:
            toc.append([2, title, pages[title]])

    doc.set_toc(toc)
    doc.set_metadata({
        "title": "JavaScript Interview Prep — a 3-month course",
        "author": "Built from the free GreatFrontEnd front-end interview playbook",
        "subject": "Front-end JavaScript interview preparation",
        "keywords": "javascript, interview, front-end, debounce, promises, closures",
    })

    tmp = PDF + ".tmp"
    doc.save(tmp, garbage=3, deflate=True)
    doc.close()

    import os
    os.replace(tmp, PDF)

    print(f"outline rebuilt: {len(toc)} entries across {len(GROUPS)} months")
    for level, title, page in toc[:5]:
        print("  " + "  " * (level - 1) + f"{title} … p{page}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
