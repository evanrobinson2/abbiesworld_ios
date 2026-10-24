#!/usr/bin/env python3
"""index.template.html -> preview/diorama-swipe/index.html, with the Context engineering card pasted in (tools/context-card)."""
import pathlib, subprocess
root = pathlib.Path(__file__).resolve().parents[2]
ctx = subprocess.run(['node', 'tools/context-card/snippet.mjs', 'diorama-swipe'], cwd=root, capture_output=True, text=True, check=True).stdout
t = (root / 'tools/diorama-swipe/index.template.html').read_text()
(root / 'preview/diorama-swipe/index.html').write_text(t.replace('<!--CONTEXT-->', ctx))
