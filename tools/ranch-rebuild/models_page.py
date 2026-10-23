"""Publish the Ranch rebuild models to the app's /models pages.

For every model with an asset.json and a Midjourney hero, this copies the GLB and a
768 px reference JPEG into prototypes/ranch-atelier/dist/models/ranch-<name>/ and writes
its entry into dist/models/manifest.json (replacing earlier ranch-* entries). The model
store sync then uploads the files to R2 and the catalogue to /api/models.

    python tools/ranch-rebuild/models_page.py
"""
import json, os, shutil
from glob import glob
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
SITE = os.path.join(REPO, 'prototypes', 'ranch-atelier', 'dist', 'models')

def title(name):
    return name.replace('-charming', '').replace('-', ' ').capitalize()

def entry(asset, mdir):
    n = asset['name']; charming = n.endswith('-charming'); mid = 'ranch-' + n
    out = os.path.join(SITE, mid); os.makedirs(out, exist_ok=True)
    shutil.copyfile(os.path.join(mdir, n + '.glb'), os.path.join(out, 'model.glb'))
    im = Image.open(os.path.join(HERE, 'mj', n, 'hero.png')).convert('RGB'); im.thumbnail((768, 768))
    im.save(os.path.join(out, 'ref.jpg'), quality=84)
    v, geo, con = asset.get('validation', {}), asset.get('geometry', {}), asset.get('construction', {})
    notes = {}
    try: notes = json.load(open(os.path.join(mdir, 'notes.json')))
    except Exception: pass
    lst = lambda x: x if isinstance(x, list) else ([x] if x else [])
    rounds = [r for r in (con.get('rounds') or notes.get('rounds') or []) if isinstance(r, dict)]
    iou = v.get('hero_iou') if v.get('hero_iou') is not None else v.get('outline_iou')
    dims = geo.get('dimensions_m') or []
    details = [['Style', 'Charming' if charming else 'Normal'], ['Role in the ranch', asset['purpose'].get('role_in_scene', '')]]
    if geo.get('triangles'): details.append(['Triangles', f"{geo['triangles']:,}"])
    if dims: details.append(['Size', ' × '.join(f'{d:.2f}' for d in dims) + ' m'])
    if len(asset.get('states', [])) > 1: details.append(['States', ', '.join(asset['states'])])
    if notes.get('creative_additions'): details.append(['Little extras', notes['creative_additions']])
    return {
        'id': mid, 'name': title(n), 'style': 'charming' if charming else 'normal', 'base': n.replace('-charming', ''),
        'group': 'Ranch tile · ' + ('charming' if charming else 'normal'),
        'subject': asset['purpose'].get('role_in_scene', ''),
        'ask': asset['brief']['prompt'],
        'outline': round(float(iou), 3) if iou is not None else 0,
        'orbit': [-30, 72], 'date': asset.get('updated') or asset.get('created'),
        'urls': {'ref': f'/models/{mid}/ref.jpg', 'glb': f'/models/{mid}/model.glb'},
        'scores': [{'label': 'Outline match', 'value': round(float(iou), 3), 'help': 'Share of the concept silhouette and the model silhouette that coincide'}] if iou is not None else [],
        'good': lst(v.get('good') or notes.get('good')), 'off': lst(v.get('off') or notes.get('off')),
        'steps': [[f"Round {r.get('round', i + 1)}.", r.get('change', '')] for i, r in enumerate(rounds)],
        'details': details,
    }

def main():
    path = os.path.join(SITE, 'manifest.json'); man = json.load(open(path))
    keep = [m for m in man['models'] if not m['id'].startswith('ranch-')]
    ranch = []
    for a in sorted(glob(os.path.join(HERE, 'models', '*', 'asset.json'))):
        asset = json.load(open(a)); mdir = os.path.dirname(a); n = asset['name']
        if os.path.exists(os.path.join(mdir, n + '.glb')) and os.path.exists(os.path.join(HERE, 'mj', n, 'hero.png')):
            ranch.append(entry(asset, mdir))
    ranch.sort(key=lambda m: (m['base'], m['style'] != 'normal'))
    man['models'] = ranch + keep
    json.dump(man, open(path, 'w'), indent=1, ensure_ascii=False); open(path, 'a').write('\n')
    print(f'{len(ranch)} Ranch models on /models ({sum(m["style"] == "charming" for m in ranch)} charming)')

if __name__ == '__main__':
    main()
