"""Build, render and score an arm's chunks from the study camera.

python3 build.py --arm B                      all chunk recipes in runs/B, full frame
python3 build.py --arm C --chunks head,chest  only these chunks (what exists so far)
python3 build.py --arm A --chunks head --focus head --crop-only
                                              arm A: the compare sheet and score cover only the head crop
python3 build.py --arm B --glb --res 1024     final: also export runs/B/out/model.glb

Writes runs/<arm>/out/<tag>/: render.png (composited on the reference backdrop), mask.png, compare.png
(reference | render | overlay: red = reference only, cyan = model only, grey = both) and score.json.
Every call appends a line to runs/<arm>/log.jsonl (time, chunks, scores), which the study uses for time per arm.
"""
import argparse
import importlib.util
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'paper-warrior'))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import stage  # noqa: E402

CHUNKS = json.load(open(os.path.join(HERE, 'chunks.json')))['chunks']
ORDER = [c['id'] for c in CHUNKS]
BOX = {c['id']: c['box'] for c in CHUNKS}


def build_scene(arm_dir, chunk_ids):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    import bkit
    for cid in chunk_ids:
        path = os.path.join(arm_dir, cid + '.py')
        before = set(bpy.data.objects)
        spec = importlib.util.spec_from_file_location(f'chunk_{cid}', path)
        mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
        mod.build(bkit)
        coll = bpy.data.collections.new(cid); bpy.context.scene.collection.children.link(coll)
        for o in set(bpy.data.objects) - before:
            for c in list(o.users_collection):
                c.objects.unlink(o)
            coll.objects.link(o)
            if not o.name.startswith(cid + ':'):
                o.name = f'{cid}:{o.name}'


def render(res, samples):
    import bpy
    _, floor = stage.setup(res, samples)
    sc = bpy.context.scene
    tmp = os.path.join(HERE, '.tmp'); os.makedirs(tmp, exist_ok=True)
    tag = f'{os.getpid()}'
    shaded = os.path.join(tmp, f'shaded_{tag}.png'); maskp = os.path.join(tmp, f'mask_{tag}.png')
    sc.render.filepath = shaded; bpy.ops.render.render(write_still=True)
    floor.hide_render = True; sc.cycles.samples = 4
    sc.render.filepath = maskp; bpy.ops.render.render(write_still=True)
    rgba = np.asarray(Image.open(shaded).convert('RGBA')).astype(float) / 255.0
    a_fig = np.asarray(Image.open(maskp).convert('RGBA'))[..., 3] > 127
    os.remove(shaded); os.remove(maskp)
    bg = stage.backdrop(res)
    out = rgba[..., :3] + bg * (1 - rgba[..., 3:4])          # premultiplied figure and floor shadow over the backdrop
    return np.clip(out, 0, 1), a_fig


def crop(a, box, res, margin=0.08):
    x0, y0, x1, y1 = [v * res / stage.IMG for v in box]
    m = margin * max(x1 - x0, y1 - y0)
    x0, y0, x1, y1 = [int(round(v)) for v in (max(0, x0 - m), max(0, y0 - m), min(res, x1 + m), min(res, y1 + m))]
    return a[y0:y1, x0:x1]


def iou(a, b):
    u = (a | b).sum()
    return float((a & b).sum() / u) if u else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--arm', required=True)
    ap.add_argument('--chunks', default='')
    ap.add_argument('--focus', default='')
    ap.add_argument('--crop-only', action='store_true')
    ap.add_argument('--res', type=int, default=512)
    ap.add_argument('--samples', type=int, default=16)
    ap.add_argument('--glb', action='store_true')
    ap.add_argument('--tag', default='')
    ap.add_argument('--who', default='')
    a = ap.parse_args()
    arm_dir = os.path.join(HERE, 'runs', a.arm)
    chunk_ids = [c for c in (a.chunks.split(',') if a.chunks else ORDER) if c and os.path.exists(os.path.join(arm_dir, c + '.py'))]
    if not chunk_ids:
        sys.exit(f'no chunk recipes found in {arm_dir}')
    t0 = time.time()
    build_scene(arm_dir, chunk_ids)
    out_dir = os.path.join(arm_dir, 'out', a.tag or ('all' if not a.chunks else '+'.join(chunk_ids)))
    os.makedirs(out_dir, exist_ok=True)
    if a.glb:
        import bpy
        bpy.ops.export_scene.gltf(filepath=os.path.join(out_dir, 'model.glb'), export_format='GLB', export_apply=True)
    rgb, m = render(a.res, a.samples)
    R = a.res
    ref = np.asarray(Image.open(stage.REF).convert('RGB').resize((R, R), Image.LANCZOS)).astype(float) / 255.0
    ref_m = np.asarray(Image.open(stage.REF_MASK).convert('L').resize((R, R), Image.BILINEAR)) > 127

    import loss
    n = 256
    small = lambda x: np.asarray(Image.fromarray((x * 255).astype(np.uint8)).resize((n, n), Image.LANCZOS)) / 255.0
    smallm = lambda x: np.asarray(Image.fromarray((x * 255).astype(np.uint8)).resize((n, n), Image.BILINEAR)) > 127
    score = {}
    if a.crop_only and a.focus:
        b = BOX[a.focus]
        c_ref, c_rgb, c_rm, c_m = crop(ref, b, R), crop(rgb, b, R), crop(ref_m, b, R), crop(m, b, R)
        sq = lambda x, mode: np.asarray(Image.fromarray((x * 255).astype(np.uint8)).resize((n, n), mode))
        t = loss.score(sq(c_m, Image.NEAREST) > 127, sq(c_rm, Image.NEAREST) > 127, sq(c_rgb, Image.LANCZOS) / 255.0, sq(c_ref, Image.LANCZOS) / 255.0)
        score = dict(scope='crop:' + a.focus, iou=1 - t['sil'], loss=t['total'], terms=t)
    else:
        t = loss.score(smallm(m), smallm(ref_m), small(rgb), small(ref))
        score = dict(scope='full', iou=1 - t['sil'], loss=t['total'], terms=t)
    if not a.crop_only:
        score['parts'] = {cid: iou(crop(m, BOX[cid], R, 0), crop(ref_m, BOX[cid], R, 0)) for cid in ORDER}
    score['chunks'] = chunk_ids
    score['seconds'] = round(time.time() - t0, 1)

    over = np.full(rgb.shape, 0.92)
    over[ref_m & ~m] = (0.86, 0.22, 0.18); over[m & ~ref_m] = (0.15, 0.75, 0.85); over[m & ref_m] = (0.55, 0.56, 0.58)
    panels = [ref, rgb, over]
    if a.focus:
        panels = [crop(p, BOX[a.focus], R) for p in panels]
    sheet = np.concatenate([np.pad(p, ((4, 4), (4, 4), (0, 0)), constant_values=1) for p in panels], 1)
    Image.fromarray((sheet * 255).astype(np.uint8)).save(os.path.join(out_dir, 'compare.png'))
    Image.fromarray((rgb * 255).astype(np.uint8)).save(os.path.join(out_dir, 'render.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(out_dir, 'mask.png'))
    json.dump(score, open(os.path.join(out_dir, 'score.json'), 'w'), indent=1)
    with open(os.path.join(arm_dir, 'log.jsonl'), 'a') as f:
        f.write(json.dumps(dict(t=round(time.time(), 1), who=a.who, chunks=chunk_ids, focus=a.focus, iou=score['iou'], loss=score['loss'])) + '\n')
    print(json.dumps({k: v for k, v in score.items() if k != 'terms'}, indent=1))
    print('compare sheet:', os.path.join(out_dir, 'compare.png'))


if __name__ == '__main__':
    main()
