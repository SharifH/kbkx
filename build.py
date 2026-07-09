#!/usr/bin/env python3
"""
KBKx static assembler — the ONLY optional tooling in this project.

The site runs with no build step. This script exists purely for maintainability:
it copies the shared header and footer from partials/ into every top-level
*.html page, so you edit those two files once instead of editing every page.

Usage:
    python3 build.py

It's safe to run repeatedly (idempotent). The active nav link is set at runtime
by script.js (markActiveNav), so the header markup is identical on every page.
"""
import os
import re
import glob

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(rel_path):
    with open(os.path.join(ROOT, rel_path), encoding="utf-8") as f:
        return f.read()


def main():
    header = read("partials/header.html").rstrip("\n")
    footer = read("partials/footer.html").rstrip("\n")

    # Leading [ \t]* is consumed so the partial controls its own indentation
    # (otherwise the page's existing indent would stack on top of the partial's).
    header_re = re.compile(r'[ \t]*<header class="site-header">.*?</header>', re.S)
    footer_re = re.compile(r'[ \t]*<footer class="site-footer">.*?</footer>', re.S)

    pages = sorted(glob.glob(os.path.join(ROOT, "*.html")))
    changed = 0
    for path in pages:
        original = open(path, encoding="utf-8").read()
        updated = original
        # lambda replacements avoid re interpreting backslashes in the markup
        if header_re.search(updated):
            updated = header_re.sub(lambda m: header, updated, count=1)
        if footer_re.search(updated):
            updated = footer_re.sub(lambda m: footer, updated, count=1)
        if updated != original:
            open(path, "w", encoding="utf-8").write(updated)
            changed += 1
            print("  updated", os.path.basename(path))

    print("Done. %d of %d page(s) updated." % (changed, len(pages)))


if __name__ == "__main__":
    main()
