"""Hero silhouette score (the only target for this job): render the model from the MJ hero's own direction and
score its silhouette against views/hero_mask.png (built by make_views.py; the harness mask can't separate the hero's
wood-coloured cast shadow and fills the open gaps under the shelf). Same lens and distance as the harness. The hero
looks along the row from low and in front, with the near end on the left: YAW deg off the front towards -X (negative
yaw puts the camera towards -X), ELEV deg up, DIST x the bbox diagonal from the centre (short = strong perspective),
calibrated over a grid (see `calibrate`) and then held fixed.
usage: python hero_check.py calibrate stone-edging.glb r YAWS ELEVS [DISTS]   (comma lists)
usage: python hero_check.py stone-edging.glb r [px] [samples]"""
import sys, os, json, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

YAW, ELEV, DIST = -16.0, 8.0, 1.0


def direction(yaw, elev):
    return (math.sin(math.radians(yaw)) * math.cos(math.radians(elev)), -math.cos(math.radians(yaw)) * math.cos(math.radians(elev)),
            math.sin(math.radians(elev)))


def target():
    return harness.norm_mask(np.asarray(Image.open(os.path.join(HERE, 'views', 'hero_mask.png'))) > 127)


def shot(glb, out, d, px, samples, name, dist=None):
    import bpy, mathutils
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), px, samples)
    cam = harness._cam(sc, lo, hi, d, False)
    c = (lo + hi) / 2; size = float(np.linalg.norm(hi - lo))   # harness lens; distance DIST x the bbox diagonal
    dist = DIST if dist is None else dist
    cam.location = mathutils.Vector(c) + mathutils.Vector(d).normalized() * size * dist
    cam.data.lens = 50 * dist / 1.9   # harness framing at any distance: a shorter distance only adds perspective
    p = os.path.abspath(os.path.join(out, name)); sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    return p, tris


def calibrate(glb, out, yaws, elevs, dists=(1.9,)):
    os.makedirs(out, exist_ok=True)
    nt = target(); best = []
    for yaw in yaws:
        for elev in elevs:
            for dist in dists:
                p, _ = shot(glb, out, direction(yaw, elev), 160, 1, '_cal.png', dist)
                nr = harness.norm_mask(harness.render_mask(p)[0])
                best.append((float((nt & nr).sum() / max(1, (nt | nr).sum())), yaw, elev, dist))
    os.remove(p)
    for b in sorted(best, reverse=True)[:8]:
        print('cal iou %.3f yaw %d elev %d dist %.1f' % b)


def main(glb, out, px=384, samples=8):
    p, tris = shot(glb, out, direction(YAW, ELEV), px, samples, 'hero_mj.png')
    nt = target(); nr = harness.norm_mask(harness.render_mask(p)[0])
    iou = float((nt & nr).sum() / max(1, (nt | nr).sum()))
    ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
    tgt = Image.open(os.path.join(HERE, '..', '..', 'mj', 'stone-edging', 'hero.png')).convert('RGB').resize((256, 256))
    r = Image.open(p).convert('RGBA'); rim = Image.new('RGB', r.size, tuple(int(c * 255) for c in harness.BG)); rim.paste(r, (0, 0), r)
    sheet = Image.new('RGB', (3 * 260 + 10, 270), 'white')
    for j, im in enumerate((tgt, rim.resize((256, 256)), Image.fromarray(ov))):
        sheet.paste(im, (5 + j * 260, 5))
    sheet.save(os.path.join(out, 'hero_compare.jpg'), quality=88)
    json.dump({'hero_iou': round(iou, 3), 'yaw': YAW, 'elev': ELEV, 'dist': DIST, 'dir': direction(YAW, ELEV), 'triangles': tris},
              open(os.path.join(out, 'hero_check.json'), 'w'))
    print('hero IoU', round(iou, 3), 'tris', tris)


if __name__ == '__main__' and sys.argv[1] == 'calibrate':
    calibrate(sys.argv[2], sys.argv[3], [int(v) for v in sys.argv[4].split(',')], [int(v) for v in sys.argv[5].split(',')],
              [float(v) for v in sys.argv[6].split(',')] if len(sys.argv) > 6 else (DIST,))
elif __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 384, int(sys.argv[4]) if len(sys.argv) > 4 else 8)
