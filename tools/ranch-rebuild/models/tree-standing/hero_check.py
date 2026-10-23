"""Hero silhouette check (a guide, not the official harness score): render the model from the MJ hero's own direction
(YAW degrees round from the front, -Y, toward +X, and ELEV degrees up; found by a grid search, see `search`) with the harness lens, and score its silhouette against views/hero.png (the MJ hero with its ground strip removed by make_views.py).
usage: python hero_check.py tree-standing.glb r [px] [samples] [yaw elev]
       python hero_check.py search tree-standing.glb   (grid of yaw/elev at 128 px)"""
import sys, os, json, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

YAW, ELEV = 0.0, 6.0
HERO = os.path.join(HERE, 'views', 'hero.png')


def direction(yaw, elev):
    return (math.sin(math.radians(yaw)) * math.cos(math.radians(elev)), -math.cos(math.radians(yaw)) * math.cos(math.radians(elev)),
            math.sin(math.radians(elev)))


def main(glb, out, px=384, samples=8, yaw=YAW, elev=ELEV):
    import bpy
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), px, samples)
    harness._cam(sc, lo, hi, direction(yaw, elev), False)
    p = os.path.abspath(os.path.join(out, 'hero_mj.png')); sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    mt, _ = harness.target_mask(HERO); mr, _ = harness.render_mask(p)
    nt, nr = harness.norm_mask(mt), harness.norm_mask(mr)
    iou = float((nt & nr).sum() / max(1, (nt | nr).sum()))
    ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
    tgt = Image.open(HERO).convert('RGB').resize((256, 256))
    r = Image.open(p).convert('RGBA'); rim = Image.new('RGB', r.size, tuple(int(c * 255) for c in harness.BG)); rim.paste(r, (0, 0), r)
    sheet = Image.new('RGB', (3 * 260 + 10, 270), 'white')
    for j, im in enumerate((tgt, rim.resize((256, 256)), Image.fromarray(ov))):
        sheet.paste(im, (5 + j * 260, 5))
    sheet.save(os.path.join(out, 'hero_compare.jpg'), quality=88)
    json.dump({'hero_iou': round(iou, 3), 'yaw': yaw, 'elev': elev}, open(os.path.join(out, 'hero_check.json'), 'w'))
    print('hero IoU', round(iou, 3))
    return iou


def search(glb):
    import tempfile
    best = (0, None)
    for yaw in range(-40, 41, 10):
        for elev in (0, 8, 16, 24):
            d = tempfile.mkdtemp(); i = main(glb, d, 128, 1, yaw, elev)
            print(yaw, elev, round(i, 3)); best = max(best, (i, (yaw, elev)))
    print('best', best)


if __name__ == '__main__':
    a = sys.argv
    if a[1] == 'search':
        search(a[2]); sys.exit()
    main(a[1], a[2], int(a[3]) if len(a) > 3 else 384, int(a[4]) if len(a) > 4 else 8,
         *(float(x) for x in a[5:7]) if len(a) > 6 else ())
