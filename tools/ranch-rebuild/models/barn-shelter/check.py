"""Scores the model against views/ (made by make_views.py). Not the official harness score, which assumes an
orthographic side-on side view; this sheet's middle view is a 3/4 from the front right, and the MJ hero sees the
front gable on the right and the -X long side on the left (the harness hero camera sits at +X/-Y).
  front, back : the harness renders r/front.png, r/back.png (orthographic), scored with the harness IoU.
  side        : rendered orthographic from SIDE_YAW off the front towards +X, SIDE_ELEV up -> r/side34.png
  hero        : rendered with the harness lens and distance from HERO_YAW off the front towards -X -> r/hero_mj.png
mean_iou is the mean of front, side and back; hero_iou is reported beside it.
usage: python check.py barn-shelter.glb r [px] [samples]      python check.py --grid barn-shelter.glb   (calibrate angles)
"""
import sys, os, json, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

SIDE_YAW, SIDE_ELEV = 28.0, 8.0
HERO_YAW, HERO_ELEV = 38.0, 2.0


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
    out = '/tmp/_bs_grid.png'
    for name, tgt, sgn, ortho, yaws, elevs in (('side', 'view_side.png', 1, True, range(26, 54, 4), (0, 4, 8)),
                                               ('hero', 'hero.png', -1, False, range(22, 46, 4), (2, 6, 10, 14))):
        best = []
        for y in yaws:
            for e in elevs:
                shot(sc, lo, hi, d(y, e, sgn), ortho, out)
                best.append((iou(os.path.join(HERE, 'views', tgt), out)[0], y, e))
        best.sort(reverse=True); print(name, [(round(a, 3), b, c) for a, b, c in best[:5]])


def main(glb, out, px=384, samples=8):
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), px, samples)
    shot(sc, lo, hi, d(SIDE_YAW, SIDE_ELEV, 1), True, os.path.abspath(os.path.join(out, 'side34.png')))
    shot(sc, lo, hi, d(HERO_YAW, HERO_ELEV, -1), False, os.path.abspath(os.path.join(out, 'hero_mj.png')))
    res, rows = {}, []
    for v, rname, tname in (('front', 'front.png', 'view_front.png'), ('side', 'side34.png', 'view_side.png'),
                            ('back', 'back.png', 'view_back.png'), ('hero', 'hero_mj.png', 'hero.png')):
        tp, rp = os.path.join(HERE, 'views', tname), os.path.join(out, rname)
        i, nt, nr = iou(tp, rp); res[v] = round(i, 3)
        ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
        t = Image.open(tp).convert('RGB'); t.thumbnail((256, 256))
        r = Image.open(rp).convert('RGBA'); rim = Image.new('RGB', r.size, (237, 230, 214)); rim.paste(r, (0, 0), r); rim.thumbnail((256, 256))
        rows.append((t, rim, Image.fromarray(ov)))
    res['mean_iou'] = round((res['front'] + res['side'] + res['back']) / 3, 3); res['hero_iou'] = res.pop('hero')
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
