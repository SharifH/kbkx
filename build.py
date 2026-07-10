#!/usr/bin/env python3
"""
KBKx static assembler.

Two jobs, both for maintainability (the site still ships as plain static files):

  1. Copy the shared header/footer from partials/ into every page, so you edit
     those two files once instead of every page.
  2. Compile root-absolute authoring paths (href="/styles.css", href="/hotels/")
     into depth-correct RELATIVE paths for each page's location
     (e.g. "../styles.css", "../hotels/" for pages one folder deep).

Job 2 is what lets the site work under ANY mount point — a domain root, a GitHub
Pages project subpath (https://user.github.io/repo/), or a local server — without
per-host configuration. Authors write easy root-absolute paths; build.py makes
them portable. (script.js resolves its fetches from its own URL for the same
reason — see BASE in script.js.)

Usage:
    python3 build.py

Safe to run repeatedly (idempotent).
"""
import os
import re
import glob

ROOT = os.path.dirname(os.path.abspath(__file__))

# Rewrites href="/x" / src="/x" (root-absolute) to a path relative to `prefix`.
LINK_RE = re.compile(r'(href|src)="(/[^"]*)"')


def relativize(content, prefix):
    def repl(m):
        attr, url = m.group(1), m.group(2)
        if url.startswith("//"):
            return m.group(0)          # protocol-relative — leave alone
        rest = url[1:]                  # drop leading "/"
        if url == "/":
            new = prefix or "./"
        elif url.startswith("/#"):
            new = (prefix or "./") + rest   # "/#ecosystem" -> "./#ecosystem" / "../#ecosystem"
        else:
            new = (prefix + rest) or "./"
        return '%s="%s"' % (attr, new)
    return LINK_RE.sub(repl, content)


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

    # Root pages (index.html, 404.html) + folder pages (hotels/index.html, …).
    # partials/*.html are excluded on purpose — they are the source, not pages.
    pages = sorted(set(
        glob.glob(os.path.join(ROOT, "*.html")) +
        glob.glob(os.path.join(ROOT, "*", "index.html"))
    ))
    pages = [p for p in pages if os.path.basename(os.path.dirname(p)) != "partials"]
    changed = 0
    for path in pages:
        original = open(path, encoding="utf-8").read()
        updated = original
        # lambda replacements avoid re interpreting backslashes in the markup
        if header_re.search(updated):
            updated = header_re.sub(lambda m: header, updated, count=1)
        if footer_re.search(updated):
            updated = footer_re.sub(lambda m: footer, updated, count=1)

        # Depth of this page below the site root → relative prefix.
        rel_dir = os.path.relpath(os.path.dirname(path), ROOT)
        depth = 0 if rel_dir == "." else (rel_dir.count(os.sep) + 1)
        updated = relativize(updated, "../" * depth)

        if updated != original:
            open(path, "w", encoding="utf-8").write(updated)
            changed += 1
            print("  updated", os.path.basename(path))

    print("Done. %d of %d page(s) updated." % (changed, len(pages)))


if __name__ == "__main__":
    main()
