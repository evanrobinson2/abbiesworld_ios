"""Stitch: score every finished model the same way and publish it to Ranch Atelier's /models.

usage: python final.py NAME [NAME ...]        (or `all`)

For each model:
  1. Render it with harness.render at 768 px, with the hero camera lowered to roughly the Midjourney hero's eye height.
  2. Score it with the same shadow-aware masks against the views the modeler worked from (models/<name>/views if they
     made cleaned or relabelled ones, else mj/<name>), and also against the hero (a loose check: camera not matched).
  3. Copy ref.jpg (Midjourney hero), render.jpg, overlay.png and model.glb into
     prototypes/ranch-atelier/dist/models/mc-<name>/ and add or replace its entry in models/manifest.json.
Writes final/<name>.json with everything the report needs.
"""
import sys, os, json, shutil, datetime
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import harness

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SITE = os.path.join(ROOT, 'prototypes', 'ranch-atelier', 'dist', 'models')
FINAL = os.path.join(HERE, 'final')
ASSET = {'barn': ('Barn', 'R-02', 'complexity'), 'cedar': ('Old cedar', 'R-03', 'organic form'),
         'balance': ('Portable beam balance', 'BA-0031', 'mechatronics'), 'seller': ('Ranch produce seller', 'BA-0081', 'character'),
         'hamper': ('Lidded reed hamper', 'BA-0023', 'craft and material')}
STYLE = {'upgrade': 'Upgrade', 'whimsical': 'Whimsical'}
# models whose turnaround sheet drew a different design, so the art director had the modeler follow the hero only;
# their headline outline is the hero overlap, not the (meaningless) sheet overlap
HERO_ONLY = {'balance-whimsical'}
HERO = (0.60, -0.76, 0.24)            # lower than the harness default, closer to Midjourney's product-shot eye height
# orbit for the page's viewer: three.js has Y up and the model's front (-Y in Blender) toward +Z
ORBIT = [round(float(np.degrees(np.arctan2(HERO[0], -HERO[1])))), round(float(np.degrees(np.arccos(HERO[2] / np.linalg.norm(HERO)))))]


def hero_overlay(ref_path, render_path, out_path):
    mt, _ = harness.target_mask(ref_path); mr, _ = harness.render_mask(render_path)
    nt, nr = harness.norm_mask(mt, 512), harness.norm_mask(mr, 512)
    # the page's legend: white both, blue yours (the reference) only, red mine (the model) only
    ov = np.full((512, 512, 3), (238, 233, 222), np.uint8); ov[nt & nr] = (255, 255, 255); ov[nt & ~nr] = (60, 120, 215); ov[nr & ~nt] = (215, 70, 60)
    Image.fromarray(ov).save(out_path)
    return float((nt & nr).sum() / max(1, (nt | nr).sum()))


def run(name):
    asset, style = name.split('-')
    md = os.path.join(HERE, 'models', name); glb = os.path.join(md, f'{name}.glb')
    out = os.path.join(FINAL, name); os.makedirs(out, exist_ok=True)
    harness.HERO_DIR = HERO; harness.LIGHT = (2.4, 0.6)   # softer than the harness default, closer to the game's look
    stats = harness.render(glb, out, 768, 48)
    views = os.path.join(md, 'views') if os.path.isdir(os.path.join(md, 'views')) else os.path.join(HERE, 'mj', name)
    vs = [v for v in harness.VIEWS if os.path.exists(os.path.join(views, f'view_{v}.png'))]
    sc = harness.score(out, views)
    ref = os.path.join(HERE, 'mj', name, 'hero.png')
    site = os.path.join(SITE, f'mc-{name}'); os.makedirs(site, exist_ok=True)
    hero_iou = hero_overlay(ref, os.path.join(out, 'hero.png'), os.path.join(site, 'overlay.png'))
    im = Image.open(ref).convert('RGB'); im.thumbnail((1024, 1024)); im.save(os.path.join(site, 'ref.jpg'), quality=86)
    r = Image.open(os.path.join(out, 'hero.png')).convert('RGBA'); bg = Image.new('RGBA', r.size, (237, 229, 214, 255)); bg.alpha_composite(r)
    x0, y0, x1, y1 = r.getbbox(); m = int(0.08 * max(x1 - x0, y1 - y0)); side = max(x1 - x0, y1 - y0) + 2 * m
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2; sq = Image.new('RGB', (side, side), (237, 229, 214))
    sq.paste(bg.convert('RGB').crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)), (0, 0))
    sq.resize((768, 768), Image.LANCZOS).save(os.path.join(site, 'render.jpg'), quality=86)
    shutil.copy(glb, os.path.join(site, 'model.glb'))
    notes = json.load(open(os.path.join(md, 'notes.json'))) if os.path.exists(os.path.join(md, 'notes.json')) else {}
    res = dict(name=name, asset=asset, style=style, stats=stats, views_used=os.path.relpath(views, HERE), views=vs,
               score=sc, hero_iou=round(hero_iou, 3), notes=notes, glb_bytes=os.path.getsize(glb))
    json.dump(res, open(os.path.join(FINAL, f'{name}.json'), 'w'), indent=1)
    return res


def entry(res):
    a, (label, sid, skill) = res['asset'], ASSET[res['asset']]
    sc, st, n = res['score'], res['stats'], res['notes']
    outline = res['hero_iou'] if res['name'] in HERO_ONLY else sc.get('mean_iou', res['hero_iou'])
    scores = [{'label': f'{v.capitalize()} outline', 'value': sc[v]['iou'], 'help': f'Silhouette overlap with the Midjourney {v} view'} for v in res['views']]
    scores.append({'label': 'Hero outline', 'value': res['hero_iou'], 'help': 'Overlap with the 3/4 illustration (camera not matched, so a loose check)'})
    rounds = n.get('rounds', [])
    d = st['dimensions_m']
    details = [['Triangles', f"{st['triangles']:,}"], ['Size', f'{d[0]:.2f} × {d[1]:.2f} × {d[2]:.2f} m'],
               ['Moving parts', n.get('moving_parts', 'see notes')], ['Set piece', f'{sid} {label}'],
               ['Tests', skill], ['Source', f"tools/model-challenge/models/{res['name']}/build.py in abbiesworld_ios"],
               ['Made with', 'Blender 5.2 (bpy), built from Python by the modeler, directed by the art director']]
    if n.get('creative_additions'):
        details.append(['Added beyond the picture', n['creative_additions'] if isinstance(n['creative_additions'], str) else '; '.join(n['creative_additions'])])
    return {
        'id': f"mc-{res['name']}", 'name': f"{label} · {STYLE[res['style']]}",
        'group': f"Model challenge · {STYLE[res['style']]}", 'subject': f"{label} ({sid}), {STYLE[res['style']].lower()} style",
        'outline': round(outline, 3), 'orbit': ORBIT, 'date': datetime.date.today().isoformat(),
        'urls': {k: f"/models/mc-{res['name']}/{f}" for k, f in (('ref', 'ref.jpg'), ('render', 'render.jpg'), ('overlay', 'overlay.png'), ('glb', 'model.glb'))},
        'scores': scores,
        'loss': {'before': rounds[0].get('mean_iou'), 'after': rounds[-1].get('mean_iou'), 'note': f'outline overlap over {len(rounds)} rounds (higher is better)'} if len(rounds) > 1 else None,
        'good': n.get('good', []), 'off': n.get('off', []),
        'steps': [[h, t] for h, t in n.get('what_i_did', [])],
        'details': details,
    }


def publish(results):
    mf = os.path.join(SITE, 'manifest.json'); man = json.load(open(mf))
    ids = {f"mc-{r['name']}" for r in results}
    man['models'] = [m for m in man['models'] if m['id'] not in ids] + [{k: v for k, v in entry(r).items() if v is not None} for r in results]
    man['updated'] = datetime.date.today().isoformat()
    json.dump(man, open(mf, 'w'), indent=1, ensure_ascii=False)


if __name__ == '__main__':
    names = sys.argv[1:]
    if names == ['all']:
        names = sorted(d for d in os.listdir(os.path.join(HERE, 'models')) if os.path.exists(os.path.join(HERE, 'models', d, f'{d}.glb')))
    results = [run(n) for n in names]
    for r in results:
        print(r['name'], r['score'].get('mean_iou'), r['hero_iou'], r['stats']['triangles'])
    allres = [json.load(open(os.path.join(FINAL, f))) for f in sorted(os.listdir(FINAL)) if f.endswith('.json')]
    publish(allres)
