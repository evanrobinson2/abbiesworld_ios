"""Scores the model against views/ (made by make_views.py). Not the official harness score: the MJ hero sees the
front gable on the right and the -X long side (with the doorway) on the left, while the harness hero camera sits at +X/-Y;
and only one sheet view (the middle gable elevation) matches the hero.
  hero  : rendered with the harness lens and distance from HERO_YAW off the front towards -X -> r/hero_mj.png
  gable : the harness's orthographic back view r/back.png against views/view_gable.png (sheet middle view)
usage: python check.py barn-shelter-charming.glb r [px] [samples]   python check.py --grid barn-shelter-charming.glb
"""
import sys, os, json, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

HERO_YAW, HERO_ELEV = 64.0, 0.0


def d(yaw, elev, sgn):
    return (sgn * math.sin(math.radians(yaw)) * math.cos(math.radians(elev)), -math.cos(math.radians(yaw)) * math.cos(math.radians(elev)),
            math.sin(math.radians(elev)))


def shot(sc, lo, hi, direction, ortho, path):
    import bpy
    cam = harness._cam(sc, lo, hi, direction, ortho); sc.render.filepath = path
    bpy.ops.render.render(write_still=True); bpy.data.objects.remove(cam)


def iou(target, render):
    mt, _ = harness.target_mask(target); mr, _ = harness.render_mask(render)
    nt, nr = harness.norm_mask(mt), harness.norm_mask(mr)
    return float((nt & nr).sum() / max(1, (nt | nr).sum())), nt, nr


def grid(glb):
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), 160, 1)
    out = os.path.join(HERE, 'r', '_grid.png')
    for name, tgt, sgn, ortho, yaws, elevs in (('hero', 'hero.png', -1, False, range(44, 76, 4), (0, 4, 8, 12)),):
        best = []
        for y in yaws:
            for e in elevs:
                shot(sc, lo, hi, d(y, e, sgn), ortho, out)
                best.append((iou(os.path.join(HERE, 'views', tgt), out)[0], y, e))
        best.sort(reverse=True); print(name, [(round(a, 3), b, c) for a, b, c in best[:5]])


def main(glb, out, px=384, samples=8):
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), px, samples)
    shot(sc, lo, hi, (0, 1, 0), True, os.path.abspath(os.path.join(out, 'back.png')))
    shot(sc, lo, hi, d(HERO_YAW, HERO_ELEV, -1), False, os.path.abspath(os.path.join(out, 'hero_mj.png')))
    res, rows = {}, []
    for v, rname, tname in (('hero', 'hero_mj.png', 'hero.png'), ('gable', 'back.png', 'view_gable.png')):
        tp, rp = os.path.join(HERE, 'views', tname), os.path.join(out, rname)
        i, nt, nr = iou(tp, rp); res[v] = round(i, 3)
        ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
        t = Image.open(tp).convert('RGB'); t.thumbnail((256, 256))
        r = Image.open(rp).convert('RGBA'); rim = Image.new('RGB', r.size, (237, 230, 214)); rim.paste(r, (0, 0), r); rim.thumbnail((256, 256))
        rows.append((t, rim, Image.fromarray(ov)))
    res['hero_iou'] = res.pop('hero'); res['sheet_gable_iou'] = res.pop('gable')
    res['triangles'] = tris
    sheet = Image.new('RGB', (3 * 260 + 10, len(rows) * 262 + 10), 'white')
    for i, row in enumerate(rows):
        for j, im in enumerate(row):
            sheet.paste(im, (5 + j * 260, 5 + i * 262))
    sheet.save(os.path.join(out, 'check_compare.jpg'), quality=88)
    json.dump(res, open(os.path.join(out, 'check.json'), 'w'), indent=1)
    print(json.dumps(res))


if __name__ == '__main__':
    if sys.argv[1] == '--grid':
        grid(sys.argv[2])
    else:
        main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 384, int(sys.argv[4]) if len(sys.argv) > 4 else 8)
