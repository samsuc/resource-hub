#!/usr/bin/env python3
"""Sync inlined @font-face blocks in HTML from css/fonts.css.

Pages inline the font rules so the first paint does not wait on a second
render-blocking stylesheet. After editing css/fonts.css, run:

  python3 scripts/sync-inline-fonts.py

Does not add a framework or change Inter preload behavior.
"""
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
CSS_PATH = ROOT / "css" / "fonts.css"
STYLE_RE = re.compile(r"<style>\s*/\*[\s\S]*?@font-face[\s\S]*?</style>", re.MULTILINE)

BANNER = """/* Latin variable subsets of Inter and Space Grotesk.
   SIL Open Font License 1.1. See media/fonts/OFL-Inter.txt and OFL-SpaceGrotesk.txt.
   Inter: Copyright 2016 The Inter Project Authors.
   Space Grotesk: Copyright 2020 The Space Grotesk Project Authors. */
"""


def page_prefix(html_path: pathlib.Path) -> str:
    rel = html_path.relative_to(ROOT)
    depth = len(rel.parts) - 1
    return "../" * depth


def extract_font_faces(css: str) -> str:
    faces = re.findall(r"@font-face\s*\{[^}]*\}", css)
    if len(faces) < 2:
        raise SystemExit("css/fonts.css is missing expected @font-face rules")
    return "\n".join(faces) + "\n"


def build_style(prefix: str, faces: str) -> str:
    body = faces.replace('url("../media/fonts/', f'url("{prefix}media/fonts/')
    body = body.replace("url('../media/fonts/", f"url('{prefix}media/fonts/")
    # Keep metric fallback as-is (local() only).
    return f"<style>\n{BANNER}{body}</style>"


def main() -> int:
    css = CSS_PATH.read_text(encoding="utf-8")
    faces = extract_font_faces(css)
    html_files = sorted(ROOT.rglob("*.html"))
    updated = 0
    for html_path in html_files:
        if "node_modules" in html_path.parts:
            continue
        text = html_path.read_text(encoding="utf-8")
        if "@font-face" not in text:
            continue
        prefix = page_prefix(html_path)
        new_style = build_style(prefix, faces)
        new_text, n = STYLE_RE.subn(new_style, text, count=1)
        if n == 0:
            print(f"skip (no matching style block): {html_path.relative_to(ROOT)}")
            continue
        if new_text != text:
            html_path.write_text(new_text, encoding="utf-8")
            updated += 1
            print(f"synced {html_path.relative_to(ROOT)}")
    print(f"updated {updated} files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
