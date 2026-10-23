"""Build the AW-STUDY-0033 pages from hexcity.template.html with the simulation modules inlined, so each page runs
the same code as the game. Run from the repo root: python3 docs/oracle/hexcity/build_page.py
 - prototypes/ranch-atelier/dist/studies/hexcity/index.html  (the live study page; three.js from /vendor)
 - docs/oracle/hexcity/hexcity-artifact.html                 (the claude.ai preview; three.js from jsDelivr)"""
import pathlib, re, json

here = pathlib.Path(__file__).parent
root = here.parents[2]
sim = root / 'prototypes/ranch-atelier/dist/simulations/hexcity'
parts = []
for name in ['headland.mjs', 'hexcity.mjs', 'advisor.mjs']:
    code = (sim / name).read_text()
    code = re.sub(r'^import .*?;\n', '', code, flags=re.M)
    code = re.sub(r'^export ', '', code, flags=re.M)
    parts.append(f'// ---- simulations/hexcity/{name} ----\n' + code)
modules = '\n'.join(parts).replace('// ---- simulations/hexcity/hexcity.mjs ----\n', '// ---- simulations/hexcity/hexcity.mjs ----\nconst LA = ASSUMPTIONS;\n')
template = (here / 'hexcity.template.html').read_text()
def page(three, orbit):
    imap = json.dumps({'imports': {'three': three, 'three/addons/controls/OrbitControls.js': orbit}})
    return template.replace('/*IMPORTMAP*/', imap).replace('/*MODULES*/', modules)
art = page('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js', 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js')
(here / 'hexcity-artifact.html').write_text(art)
live = page('/vendor/three.module.js', '/vendor/OrbitControls.js')
head_end = live.index('</style>') + len('</style>')
live = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        + live[:head_end] + '\n</head>\n<body>\n' + live[head_end:] + '\n</body>\n</html>\n')
out = root / 'prototypes/ranch-atelier/dist/studies/hexcity/index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(live)
print('wrote', out, len(live), 'and', here / 'hexcity-artifact.html', len(art))
