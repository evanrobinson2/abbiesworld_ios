"""Builds the study page for AW-STUDY-0031 from catalogue.json, each asset's stats.json, docstring and renders.
Writes prototypes/ranch-atelier/dist/studies/moon-base-kit/ (index.html, img/, m/<slug>.wasm). GLBs are published
with a .wasm name because the Artifact preview refuses .glb (docs/oracle/brute-fight/BRUTE_FIGHT_STUDY.md).

python3 build_page.py [out_dir]
"""
import ast
import html
import json
import os
import shutil
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'prototypes/ranch-atelier/dist/studies/moon-base-kit')
cat = json.load(open(os.path.join(HERE, 'catalogue.json')))
os.makedirs(os.path.join(OUT, 'img'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'm'), exist_ok=True)
esc = html.escape


def jpg(src, dst, w):
    if not os.path.exists(src) and src.endswith('.png'):
        src = src[:-4] + '.jpg'
    im = Image.open(src).convert('RGB')
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    im.save(dst, quality=84, optimize=True)


assets = []
for slug in sorted(os.listdir(os.path.join(HERE, 'assets'))):
    d = os.path.join(HERE, 'assets', slug)
    if not os.path.exists(os.path.join(d, 'stats.json')):
        continue
    st = json.load(open(os.path.join(d, 'stats.json')))
    doc = ast.get_docstring(ast.parse(open(os.path.join(d, 'build.py')).read())) or ''
    title, _, body = doc.partition('. ')
    jpg(os.path.join(d, 'r/hero.png'), os.path.join(OUT, 'img', f'{slug}.jpg'), 900)
    if any(os.path.exists(os.path.join(d, 'r/fps.' + e)) for e in ('png', 'jpg')):
        jpg(os.path.join(d, 'r/fps.png'), os.path.join(OUT, 'img', f'{slug}-fps.jpg'), 900)
    shutil.copy(os.path.join(d, f'{slug}.glb'), os.path.join(OUT, 'm', f'{slug}.wasm'))
    # Round 2 rebuilds against the Midjourney pick; round 1 stays beside it as history.
    r2 = 'Round 2' in doc
    pick = os.path.exists(os.path.join(d, 'concept.jpg'))
    if pick:
        jpg(os.path.join(d, 'concept.jpg'), os.path.join(OUT, 'img', f'{slug}-pick.jpg'), 900)
    r1 = r2 and os.path.exists(os.path.join(d, 'round1', 'hero.jpg'))
    if r1:
        jpg(os.path.join(d, 'round1', 'hero.jpg'), os.path.join(OUT, 'img', f'{slug}-r1.jpg'), 600)
    body = body.replace('Round 2, matched to the pick: ', '').strip()
    body = body[:1].upper() + body[1:]
    assets.append(dict(slug=slug, body=' '.join(body.split()), r2=r2, pick=pick, r1=r1, **st))
order = [i['id'] for i in cat['items']]
assets.sort(key=lambda a: order.index(a['id']))
for src, dst in (('moonbase.png', 'pack-moonbase.jpg'), ('abbie at the base.png', 'pack-abbie-base.jpg')):
    p = os.path.join('/tmp/claude-0/trek/trek/outputs/images', src)
    if os.path.exists(p):
        jpg(p, os.path.join(OUT, 'img', dst), 900)
if assets:
    jpg(os.path.join(HERE, 'assets', assets[0]['slug'], 'r/hero.png'), os.path.join(OUT, 'img', 'thumb.jpg'), 320)


def chip(m):
    return f'<span class="chip">{esc(m.replace("_", " "))}</span>'


cards = []
for a in assets:
    mats = ''.join(chip(m) for m in a['materials'])
    sz = ' × '.join(f'{v:g}' for v in a['size_m'])
    n = esc(a["name"])
    spin = (f'<figure class="spin" data-src="m/{a["slug"]}.wasm" data-alt="{n}"><img src="img/{a["slug"]}.jpg" alt="{n}, '
            f'three-quarter view" loading="lazy"><button type="button">Spin it</button><figcaption>{"Round 2" if a["r2"] else "Round 1"}'
            f', the model</figcaption></figure>')
    first = (f'<figure><img class="sq" src="img/{a["slug"]}-pick.jpg" alt="Midjourney concept for {n}" loading="lazy">'
             f'<figcaption>The Midjourney pick</figcaption></figure>' if a['pick'] else
             '<figure class="wait"><div class="sq">Midjourney picture coming.</div>'
             '<figcaption>The Midjourney pick</figcaption></figure>')
    fps = (f'<figure><img class="sq" src="img/{a["slug"]}-fps.jpg" alt="{n} from Abbie\'s eye height" loading="lazy">'
           f'<figcaption>Abbie\'s eye, 1.1 m</figcaption></figure>')
    old = (f'<figure><img src="img/{a["slug"]}-r1.jpg" alt="{n}, round 1" loading="lazy">'
           f'<figcaption>Round 1, before the pick</figcaption></figure>' if a['r1'] else '')
    cards.append(f'''<article class="card" id="{a["slug"]}">
 <header><span class="id">{a["id"]}</span><h3>{n}</h3></header>
 <div class="views">{first}{spin}{fps}{old}</div>
 <p>{esc(a["body"])}</p>
 <dl><div><dt>Triangles</dt><dd>{a["triangles"]:,}</dd></div><div><dt>Parts</dt><dd>{a["parts"]}</dd></div>
 <div><dt>Mass</dt><dd>{a["mass_kg"]:,} kg</dd></div><div><dt>Moon weight</dt><dd>{a["moon_weight_kg"]:,} kg</dd></div>
 <div><dt>Size m</dt><dd>{sz}</dd></div></dl>
 <div class="chips">{mats}</div>
</article>''')

groups = []
for key, g in cat['groups'].items():
    items = [i for i in cat['items'] if i['group'] == key]
    lis = ''.join(f'<li class="{"drawn" if i["drawn"] else ""}"><span>{i["id"]}</span>{esc(i["name"])}'
                  + (f' <a href="#{next((a["slug"] for a in assets if a["id"] == i["id"]), "")}">built</a>' if i['drawn'] else '')
                  + '</li>' for i in items)
    groups.append(f'<section class="group"><h3>{esc(g["title"])} <small>{len(items)}</small></h3>'
                  f'<p class="muted">{esc(g["note"])}</p><ol>{lis}</ol></section>')

tri = sum(a['triangles'] for a in assets)
page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Moon Base Kit</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Source+Sans+3:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap">
<style>
/* AW-STUDY-0031 Moon Base Kit. A study page with its own look: lunar night ground, the Faceted Hero palette. */
:root{{--bg:#0d1017;--paper:#161b25;--raised:#1e2532;--ink:#e8ebf1;--muted:#9ba4b4;--line:#2a3242;--suit:#ff9a3c;--green:#59e08a;
--display:"Barlow Condensed",system-ui,sans-serif;--body:"Source Sans 3",system-ui,sans-serif;--mono:"JetBrains Mono",ui-monospace,monospace;color-scheme:dark}}
@media (prefers-color-scheme:light){{:root:not([data-theme="dark"]){{--bg:#eef0f3;--paper:#fff;--raised:#f4f6f9;--ink:#1d2129;--muted:#5a6170;--line:#d3d8e0;--suit:#d9701f;--green:#1f9a52;color-scheme:light}}}}
:root[data-theme="light"]{{--bg:#eef0f3;--paper:#fff;--raised:#f4f6f9;--ink:#1d2129;--muted:#5a6170;--line:#d3d8e0;--suit:#d9701f;--green:#1f9a52;color-scheme:light}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 var(--body);padding:28px max(16px,env(safe-area-inset-right)) 64px max(16px,env(safe-area-inset-left))}}
main{{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:22px}}
main>*{{min-width:0}}
.eyebrow{{font:500 12px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--suit)}}
h1{{font:700 clamp(38px,7vw,64px)/1 var(--display);margin:0}}
h2{{font:700 32px/1.1 var(--display);margin:22px 0 0}}
h3{{font:700 22px/1.1 var(--display);margin:0}}
p{{margin:0;max-width:74ch}}.lede{{font-size:19px}}.muted{{color:var(--muted)}}
img{{display:block;width:100%;height:auto;border-radius:10px}}
.pack{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}}
.pack figure{{margin:0;display:grid;gap:6px}}
figcaption{{font:500 12px/1.4 var(--mono);color:var(--muted)}}
.cards{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,520px),1fr));gap:16px}}
.card{{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:14px;display:grid;gap:10px;align-content:start}}
.card header{{display:flex;gap:10px;align-items:baseline}}
.id{{font:500 12px/1 var(--mono);color:var(--suit)}}
.views{{display:grid;grid-template-columns:1fr 1fr;gap:8px;align-items:start}}
.sq{{aspect-ratio:1;object-fit:contain;background:#0b0e14}}
.wait .sq{{display:grid;place-items:center;padding:18px;text-align:center;border-radius:10px;border:1px dashed var(--line);color:var(--muted);font-size:14px}}
.views figure{{margin:0;position:relative;display:grid;gap:4px}}
.spin{{aspect-ratio:auto}}
.spin img,.spin model-viewer{{width:100%;aspect-ratio:1;height:auto;object-fit:contain;border-radius:10px;background:#0b0e14}}
.spin button{{position:absolute;right:8px;bottom:28px;border:0;border-radius:999px;padding:7px 13px;font:600 13px var(--body);color:#111;background:rgba(255,255,255,.82);cursor:pointer}}
.spin.on button{{display:none}}
dl{{display:flex;flex-wrap:wrap;gap:6px 16px;margin:0}}
dl div{{display:grid}}dt{{font:500 10px/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}}dd{{margin:0;font-weight:600;font-variant-numeric:tabular-nums}}
.chips{{display:flex;flex-wrap:wrap;gap:5px}}
.chip{{font:500 11px/1 var(--mono);padding:5px 7px;border-radius:7px;background:var(--raised);border:1px solid var(--line);color:var(--muted)}}
.groups{{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:14px}}
.group{{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:14px;display:grid;gap:8px;align-content:start}}
.group small{{font:500 12px var(--mono);color:var(--muted)}}
.group ol{{list-style:none;margin:0;padding:0;display:grid;gap:3px;font-size:14.5px}}
.group li span{{font:500 11px var(--mono);color:var(--muted);margin-right:8px}}
.group li.drawn{{color:var(--suit);font-weight:600}}.group li a{{color:var(--green);font:500 11px var(--mono)}}
.rules{{display:grid;gap:9px;padding-left:22px;margin:0;max-width:80ch}}.rules li::marker{{color:var(--suit);font-weight:700}}

</style></head><body><main>
<header style="display:grid;gap:10px">
 <span class="eyebrow">AW-STUDY-0031 · Moon Base Kit · round 2</span>
 <h1>The Moon base, built to walk through</h1>
 <p class="lede">200 low-poly pieces proposed for the low-gravity Moon shooter, and the first {len(assets)} built: {tri:,} triangles in all. Each one is made of named parts with real materials. Panel seams, brushed metal and rock pits are baked into colour, roughness and normal maps, so they still look solid up close in first person. Every part also knows its own mass, so low gravity can throw it honestly.</p>
 <p class="muted">The look follows the Moon Heroes "Faceted Hero" direction: flat planes, gunmetal and off-white hull, orange for people and warm windows, green, amber and red lamps for state. Cyan is kept for the Star Child and crystals, and gold for Daddy's memory coins. The heroes, buggy and lander belong to the Moon Heroes study.</p>
</header>
<section class="pack">
 <figure><img src="img/pack-moonbase.jpg" alt="Moon Mission pack painting of the moon base"><figcaption>Inspiration: the Moon Mission pack's base</figcaption></figure>
 <figure><img src="img/pack-abbie-base.jpg" alt="Abbie looking at the moon base"><figcaption>Abbie at the base: the scale we build for</figcaption></figure>
</section>
<h2>The {len(assets)}, built</h2>
<p class="muted">Round 2 rebuilds each piece against its Midjourney pick: chunky off-white modules held by dark bumper frames, with warm orange windows. Top left is the pick, top right the model (tap "Spin it" to turn it), bottom left what Abbie sees from her own eye height, and bottom right round 1, drawn before the picks existed.</p>
<div class="cards">{''.join(cards)}</div>
<h2>All 200</h2>
<p class="muted">Orange ones are built. The groups are what a whole base needs, from the outside in.</p>
<div class="groups">{''.join(groups)}</div>
<h2>How each piece is made</h2>
<ol class="rules">
 <li><b>Parts that build the system.</b> Every piece is assembled from named parts (Hatch, LockWheel, StateRing), so you can ask for a change in words, and the game can animate a single part.</li>
 <li><b>Low poly, hero up close.</b> Most pieces are 300 to 3,000 triangles with crisp chamfers. The detail lives in baked maps: base colour, roughness and normal, at 512 or 1024 px.</li>
 <li><b>Material is meaning.</b> Material names are game roles (Metal_Hull, Glass_Window, OrangeBand, Lamp_Green), and each role has a real density. So every part carries its mass in the model file.</li>
 <li><b>The world tells you.</b> Gauges, lamp posts, door light rings, charge bars and frost lines carry air, power and safety. The shooter can run without a HUD bar.</li>
 <li><b>Built for Abbie's size.</b> Everything is checked from 1.1 m eye height. Consoles have a kid step, and the lower bunk and the lettuce tier sit at her height.</li>
</ol>
<h2>Next</h2>
<p>The dome and the tower are the first two of the five base buildings the Moon Heroes study handed over. The habitat and hangar, the airlock door and the supply crate follow as soon as Midjourney can draw their pictures. Then the kit goes onto the Moon tile for the shooter.</p>
</main>
<script>
let mv;
function loadMV(){{return mv ||= new Promise((ok,no)=>{{const s=document.createElement('script');s.type='module';s.src='https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)}})}}
document.addEventListener('click',async e=>{{
 const f=e.target.closest('.spin');if(!f||f.classList.contains('on'))return;
 f.classList.add('on');await loadMV();
 const m=document.createElement('model-viewer');m.src=f.dataset.src;m.alt=f.dataset.alt;
 for(const [k,v] of Object.entries({{'camera-controls':'','touch-action':'pan-y','auto-rotate':'','interaction-prompt':'none','shadow-intensity':'0.8','exposure':'1.05','environment-image':'neutral','camera-orbit':'35deg 70deg auto'}}))m.setAttribute(k,v);
 f.querySelector('img').replaceWith(m);
}});
</script>
</body></html>'''
open(os.path.join(OUT, 'index.html'), 'w').write(page)
print('page', OUT, len(assets), 'assets')
