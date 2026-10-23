"""Gather every arm's assembled score into the study page.

Reads runs/<arm>/out/all/score.json (from `build.py --arm X --tag all --glb --res 1024`), runs/usage.jsonl (tokens and
wall-clock per job, from the job reports) and runs/<arm>/log.jsonl, and writes the page's results.json plus a render
(JPEG) and the model (GLB renamed .wasm so artifacts accept it) per arm into prototypes/ranch-atelier/dist/studies/bruiser/arms/.

Time per arm: parallel arms take the slowest job; sequential arms add their jobs up. Cost uses list price per token
for the jobs' model (Opus-class, blended input+output at $15 per million tokens; a rough guide, same for every arm).
"""
import json
import os
import shutil
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, '..', '..', 'prototypes', 'ranch-atelier', 'dist', 'studies', 'bruiser')
USD_PER_TOKEN = 15 / 1e6


def main(status=None):
    res_path = os.path.join(SITE, 'results.json')
    res = json.load(open(res_path))
    usage = [json.loads(l) for l in open(os.path.join(HERE, 'runs', 'usage.jsonl'))]
    for a in res['arms']:
        arm = a['id']
        jobs = [u for u in usage if u['arm'] == arm]
        sc_path = os.path.join(HERE, 'runs', arm, 'out', 'all', 'score.json')
        a['jobs_done'] = len(jobs)
        if jobs:
            ms = [u['ms'] for u in jobs]
            a['seconds'] = round((max(ms) if a.get('order') == 'parallel' else sum(ms)) / 1000)
            a['tokens'] = sum(u['tokens'] for u in jobs)
            a['cost_usd'] = round(a['tokens'] * USD_PER_TOKEN, 2)
        if os.path.exists(sc_path) and (len(jobs) >= 6 or a.get('kind') == 'import'):
            sc = json.load(open(sc_path))
            vj = os.path.join(HERE, 'runs', arm, 'out', 'all', 'views.json')
            if os.path.exists(vj):
                v = json.load(open(vj)); a.update(side=round(v['side'], 4), back=round(v['back'], 4))
                Image.open(os.path.join(HERE, 'runs', arm, 'out', 'all', 'views.png')).convert('RGB').save(os.path.join(SITE, 'arms', arm, 'views.jpg'), quality=85) if os.path.isdir(os.path.join(SITE, 'arms', arm)) else None
            a.update(iou=round(sc['iou'], 4), loss=round(sc['loss'], 4), parts={k: round(v, 3) for k, v in sc['parts'].items()}, status='done')
            out = os.path.join(SITE, 'arms', arm); os.makedirs(out, exist_ok=True)
            Image.open(os.path.join(HERE, 'runs', arm, 'out', 'all', 'render.png')).convert('RGB').save(os.path.join(out, 'render.jpg'), quality=88)
            Image.open(os.path.join(HERE, 'runs', arm, 'out', 'all', 'compare.png')).convert('RGB').save(os.path.join(out, 'compare.jpg'), quality=85)
            shutil.copy(os.path.join(HERE, 'runs', arm, 'out', 'all', 'model.glb'), os.path.join(out, 'model.wasm'))
            a['render'] = f'arms/{arm}/render.jpg'; a['glb'] = f'arms/{arm}/model.wasm'; a['compare'] = f'arms/{arm}/compare.jpg'
        elif jobs:
            a['status'] = f'running ({len(jobs)} of 6 jobs done)'
    if status:
        res['status'] = status
    json.dump(res, open(res_path, 'w'), indent=1)
    print(json.dumps([{k: a.get(k) for k in ('id', 'status', 'iou', 'loss', 'seconds', 'cost_usd')} for a in res['arms']], indent=0))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else None)
