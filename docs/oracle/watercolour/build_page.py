"""Build AW-STUDY-0050 Watercolour distance from watercolour.template.html. Run from the repo root:
python3 docs/oracle/watercolour/build_page.py
 - prototypes/ranch-atelier/dist/studies/watercolour/index.html  (live; imports /simulations/watercolour-distance.mjs)
 - docs/oracle/watercolour/watercolour-artifact.html            (claude.ai preview; module inlined, three from jsDelivr, screenshots inline)"""
import pathlib, re, json, subprocess, base64, html
here = pathlib.Path(__file__).parent; root = here.parents[2]
dist = root / 'prototypes/ranch-atelier/dist'
src = (dist / 'simulations/watercolour-distance.mjs').read_text()
inline = re.sub(r'^export ', '', src, flags=re.M)
names = re.findall(r'^export (?:const|function) (\w+)', src, flags=re.M)
context = subprocess.run(['node', str(root / 'tools/context-card/snippet.mjs'), 'watercolour'], capture_output=True, text=True, check=True).stdout
shots = [('town-trio', 'The three regions, pulled back: each tile keeps its own light and wash.'), ('z-downtown', 'Downtown: brick and brass dissolving to rose.'), ('z-anis-side', "Ani's side: cool, wide and wet."), ('z-abbie-daddy-side', "Abbie and Daddy's side: rose and violet pooling.")]
def shotsHtml(embed):
    out = ''
    for n, cap in shots:
        f = dist / f'studies/watercolour/img/{n}.jpg'
        if not f.exists(): continue
        s = 'data:image/jpeg;base64,' + base64.b64encode(f.read_bytes()).decode() if embed else f'img/{n}.jpg'
        out += f'<figure><img src="{s}" alt="{cap}" loading="lazy"><figcaption>{cap}</figcaption></figure>'
    return out
def page(three, orbit, embed):
    imap = json.dumps({'imports': {'three': three, 'three/addons/controls/OrbitControls.js': orbit}})
    mod = inline if embed else f"import {{{', '.join(names)}}} from '/simulations/watercolour-distance.mjs';"
    t = (here / 'watercolour.template.html').read_text()
    for k, v in {'/*IMPORTMAP*/': imap, '/*MODULE*/': mod, '<!--CONTEXT-->': context, '<!--SHOTS-->': shotsHtml(embed), '<!--NUM-->': '0050'}.items(): t = t.replace(k, v)
    return t.replace('/*SOURCE*/', html.escape(src))
(here / 'watercolour-artifact.html').write_text(page('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js', 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js', True))
out = dist / 'studies/watercolour/index.html'; out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(page('/vendor/three.module.js', '/vendor/OrbitControls.js', False))
print('wrote', out)
