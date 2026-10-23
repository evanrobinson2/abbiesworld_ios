"""Hero silhouette check (not the official harness score): render the model from the MJ hero's own direction and
score its silhouette against views/hero.png. The MJ hero sees the hen's left side (+X) with the head on the left of
the picture and the breast turned a little toward us, so the camera sits at +X/-Y (YAW degrees off the front toward
+X, ELEV up), harness lens and distance.
usage: python hero_check.py MODEL.glb OUTDIR [px] [samples] [yaw] [elev]
       python hero_check.py calibrate MODEL.glb OUTDIR      (IoU over a yaw/elevation grid)"""
import sys, os, json, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

YAW, ELEV = 68.0, 8.0     # calibrated on the round-3 charming model (best 70/6, 60/0); the hero sees the near flank, a little of the breast, from slightly above


def direction(yaw, elev):
    return (math.sin(math.radians(yaw)) * math.cos(math.radians(elev)), -math.cos(math.radians(yaw)) * math.cos(math.radians(elev)),
            math.sin(math.radians(elev)))


def main(glb, out, px=384, samples=8, yaw=YAW, elev=ELEV, name='hero_mj.png', score=True, sheet=True):
    import bpy
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), px, samples)
    harness._cam(sc, lo, hi, direction(yaw, elev), False)
    p = os.path.abspath(os.path.join(out, name)); sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    if not score:
        return
    mt, _ = harness.target_mask(os.path.join(HERE, 'views', 'hero.png')); mr, _ = harness.render_mask(p)
    nt, nr = harness.norm_mask(mt), harness.norm_mask(mr)
    iou = float((nt & nr).sum() / max(1, (nt | nr).sum()))
    if not sheet:
        return iou
    ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
    tgt = Image.open(os.path.join(HERE, '..', '..', 'mj', 'chicken-charming', 'hero.png')).convert('RGB').resize((256, 256))
    r = Image.open(p).convert('RGBA'); rim = Image.new('RGB', r.size, tuple(int(c * 255) for c in harness.BG)); rim.paste(r, (0, 0), r)
    sh = Image.new('RGB', (3 * 260 + 10, 270), 'white')
    for j, im in enumerate((tgt, rim.resize((256, 256)), Image.fromarray(ov))):
        sh.paste(im, (5 + j * 260, 5))
    sh.save(os.path.join(out, 'hero_compare.jpg'), quality=88)
    json.dump({'hero_iou': round(iou, 3), 'yaw': yaw, 'elev': elev}, open(os.path.join(out, 'hero_check.json'), 'w'))
    print('hero IoU', round(iou, 3))
    return iou


if __name__ == '__main__':
    a = sys.argv
    if a[1] == 'calibrate':
        res = []
        for yaw in (40, 50, 60, 70, 80, 90):
            for elev in (0, 6, 12, 18):
                res.append((main(a[2], a[3], 160, 1, yaw, elev, '_cal.png', True, False), yaw, elev))
        os.remove(os.path.join(a[3], '_cal.png'))
        for r in sorted(res, reverse=True)[:6]:
            print('cal iou %.3f yaw %d elev %d' % r)
    else:
        main(a[1], a[2], int(a[3]) if len(a) > 3 else 384, int(a[4]) if len(a) > 4 else 8,
             float(a[5]) if len(a) > 5 else YAW, float(a[6]) if len(a) > 6 else ELEV)
