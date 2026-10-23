"""Build the AW-STUDY-0048 pages from worlds.template.html with the region and world modules and the context card
inlined, so the page runs the same code as the game. Run from the repo root: python3 docs/oracle/changing-worlds/build_page.py
 - prototypes/ranch-atelier/dist/studies/worlds/index.html  (the live study page)
 - docs/oracle/changing-worlds/worlds-artifact.html          (the claude.ai preview)"""
import pathlib, re, subprocess

here = pathlib.Path(__file__).parent
root = here.parents[2]
sim = root / 'prototypes/ranch-atelier/dist/simulations'
parts = []
for rel in ['abbietown/regions.mjs', 'worlds/worlds.mjs']:
    code = (sim / rel).read_text()
    code = re.sub(r'^import .*?;\n', '', code, flags=re.M)
    code = re.sub(r'^export ', '', code, flags=re.M)
    parts.append(f'// ---- simulations/{rel} ----\n' + code)
context = subprocess.run(['node', str(root / 'tools/context-card/snippet.mjs'), 'worlds'], capture_output=True, text=True, check=True).stdout
page = (here / 'worlds.template.html').read_text().replace('/*MODULES*/', '\n'.join(parts)).replace('/*CONTEXT*/', context)
head_end = page.index('</style>') + len('</style>')
shell = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
         + page[:head_end] + '\n</head>\n<body>\n' + page[head_end:] + '\n</body>\n</html>\n')
(here / 'worlds-artifact.html').write_text(page)  # the artifact tool adds the document skeleton itself
out = root / 'prototypes/ranch-atelier/dist/studies/worlds/index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(shell)
