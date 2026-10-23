"""Build the AW-STUDY-0044 claude.ai artifact from the study page: one self-contained HTML file.
Inlines simulations/suit-hud.mjs and its CSS, swaps three.js to the CDN build of the same revision (r170),
embeds the pictures and pastes the context card. Usage: python3 tools/suit-hud/build_artifact.py OUT.html"""
import base64, pathlib, re, subprocess, sys
root = pathlib.Path(__file__).resolve().parents[2]
dist = root / 'prototypes/ranch-atelier/dist'
page = (dist / 'studies/suit-hud/index.html').read_text()
mod = (dist / 'simulations/suit-hud.mjs').read_text()
css = (dist / 'simulations/suit-hud.css').read_text()
mod = re.sub(r'^export (const|function) ', r'\1 ', mod, flags=re.M)
mod = re.sub(r"\n if \(!document\.querySelector\('link\[data-suit-hud\]'\)\).*\n.*setAttribute\('data-suit-hud', ''\);", '', mod)
page = page.replace('{"imports":{"three":"/simulations/vendor/three.module.js"}}', '{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"}}')
page = page.replace("import {installSuitHud, BIOMES, VARIANTS} from '/simulations/suit-hud.mjs?v=1';", mod)
page = page.replace('</style>', css + '\n</style>', 1)
for img in sorted(set(re.findall(r'src="(img/[^"]+\.jpg)"', page))):
    data = base64.b64encode((dist / 'studies/suit-hud' / img).read_bytes()).decode()
    page = page.replace(f'src="{img}"', f'src="data:image/jpeg;base64,{data}"')
card = subprocess.run(['node', str(root / 'tools/context-card/snippet.mjs'), 'suit-hud'], capture_output=True, text=True, check=True).stdout
page = page.replace('<script type="module" src="/look/context-card.mjs" data-context-study="suit-hud"></script>', '')
page = page.replace('</main>', '<h2>Context engineering</h2>\n' + card + '\n</main>', 1)
pathlib.Path(sys.argv[1]).write_text(page)
print(sys.argv[1], len(page) // 1024, 'KB')
