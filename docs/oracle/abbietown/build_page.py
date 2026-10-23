"""Build the AW-STUDY-0042 pages from abbietown.template.html with the town modules and the land inlined, so each
page runs the same code as the game. Run from the repo root: python3 docs/oracle/abbietown/build_page.py
 - prototypes/ranch-atelier/dist/studies/abbietown/index.html  (the live study page; three.js from /vendor)
 - docs/oracle/abbietown/abbietown-artifact.html               (the claude.ai preview; three.js from jsDelivr)
The context engineering card on the right comes from studies/context.json (tools/context-card/snippet.mjs)."""
import pathlib, re, json, subprocess

here = pathlib.Path(__file__).parent
root = here.parents[2]
sim = root / 'prototypes/ranch-atelier/dist/simulations/abbietown'
parts = []
for name in ['town.mjs', 'regions.mjs', 'manifest.mjs', 'entrances.mjs']:
    code = (sim / name).read_text()
    code = re.sub(r'^import .*?;\n', '', code, flags=re.M)
    code = re.sub(r'^export ', '', code, flags=re.M)
    parts.append(f'// ---- simulations/abbietown/{name} ----\n' + code)
# the watercolour distance pass (AW-STUDY-0050) lives in the shared kit, one folder up
code = (sim.parent / 'watercolour-distance.mjs').read_text()
code = re.sub(r'^import .*?;\n', '', code, flags=re.M)
code = re.sub(r'^export ', '', code, flags=re.M)
parts.append('// ---- simulations/watercolour-distance.mjs ----\n' + code)
modules = '\n'.join(parts)
land = json.dumps(json.loads((sim / 'land.json').read_text()), separators=(',', ':')).replace('</', '<\\/')
history = json.dumps(json.loads((sim / 'history.json').read_text()), separators=(',', ':'))
import base64
overlay = 'data:image/png;base64,' + base64.b64encode((sim / 'overlay.png').read_bytes()).decode()
context = subprocess.run(['node', str(root / 'tools/context-card/snippet.mjs'), 'abbietown'], capture_output=True, text=True, check=True).stdout
template = (here / 'abbietown.template.html').read_text().replace('/*DIORAMAS*/', (here / 'dioramas.block.js').read_text())
def page(three, orbit):
    imap = json.dumps({'imports': {'three': three, 'three/addons/controls/OrbitControls.js': orbit}})
    return template.replace('/*IMPORTMAP*/', imap).replace('/*MODULES*/', modules).replace('/*LAND*/', land).replace('/*CONTEXT*/', context).replace('/*HISTORY*/', history).replace('/*OVERLAY*/', overlay)
art = page('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js', 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js')
btns = '<div class="chips"><button class="btn" id="csv">Download the manifest (CSV)</button><button class="chip" id="json">JSON</button></div>'
assert btns in art
# the preview cannot hand out files: point to the live page for the CSV and JSON
art = art.replace(btns, '<p class="muted">The CSV and JSON downloads are on the live study page, /studies/abbietown/.</p><span hidden><button id="csv"></button><button id="json"></button></span>')
art = art.replace("const CELL_GAME = '/studies/cell/play.html';", "const CELL_GAME = 'https://app.abbies.world/studies/cell/play.html';")
(here / 'abbietown-artifact.html').write_text(art)
live = page('/vendor/three.module.js', '/vendor/OrbitControls.js')
head_end = live.index('</style>') + len('</style>')
live = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        + live[:head_end] + '\n</head>\n<body>\n' + live[head_end:] + '\n</body>\n</html>\n')
out = root / 'prototypes/ranch-atelier/dist/studies/abbietown/index.html'
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(live)
print('wrote', out, len(live), 'and', here / 'abbietown-artifact.html', len(art))
