"""Hero silhouette check (not the official harness score): render the model from the MJ hero's own direction and
score its silhouette against views/hero.png. The charming hero sees the front gable on the left and the +X long side
(windows and platform) on the right, from low down (YAW deg off the front towards +X, ELEV deg up; calibrated on the
round-1 model over a grid, see `calibrate`) with the harness lens and distance.
usage: python hero_check.py calibrate goat-shelter-charming.glb r   (prints the IoU over a yaw/elevation grid)
usage: python hero_check.py goat-shelter-charming.glb r [px] [samples]"""
import sys, os, json, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

YAW, ELEV = 55.0, 4.0


def direction(yaw, elev):
    return (math.sin(math.radians(yaw)) * math.cos(math.radians(elev)), -math.cos(math.radians(yaw)) * math.cos(math.radians(elev)),
            math.sin(math.radians(elev)))


DIR = direction(YAW, ELEV)


def calibrate(glb, out):
    import bpy
    mt, _ = harness.target_mask(os.path.join(HERE, 'views', 'hero.png')); nt = harness.norm_mask(mt)
    best = []
    for yaw in (35, 40, 45, 50, 55, 60, 65):
        for elev in (0, 4, 8, 12, 16, 20):
            sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), 160, 1)
            harness._cam(sc, lo, hi, direction(yaw, elev), False)
            pth = os.path.abspath(os.path.join(out, '_cal.png')); sc.render.filepath = pth
            bpy.ops.render.render(write_still=True)
            nr = harness.norm_mask(harness.render_mask(pth)[0])
            best.append((float((nt & nr).sum() / max(1, (nt | nr).sum())), yaw, elev))
    os.remove(pth)
    for b in sorted(best, reverse=True)[:6]:
        print('cal iou %.3f yaw %d elev %d' % b)


def main(glb, out, px=384, samples=8):
    import bpy
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), px, samples)
    harness._cam(sc, lo, hi, DIR, False)
    p = os.path.abspath(os.path.join(out, 'hero_mj.png')); sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    mt, _ = harness.target_mask(os.path.join(HERE, 'views', 'hero.png')); mr, _ = harness.render_mask(p)
    nt, nr = harness.norm_mask(mt), harness.norm_mask(mr)
    iou = float((nt & nr).sum() / max(1, (nt | nr).sum()))
    ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
    tgt = Image.open(os.path.join(HERE, 'views', 'hero.png')).convert('RGB').resize((256, 256))
    r = Image.open(p).convert('RGBA'); rim = Image.new('RGB', r.size, tuple(int(c * 255) for c in harness.BG)); rim.paste(r, (0, 0), r)
    sheet = Image.new('RGB', (3 * 260 + 10, 270), 'white')
    for j, im in enumerate((tgt, rim.resize((256, 256)), Image.fromarray(ov))):
        sheet.paste(im, (5 + j * 260, 5))
    sheet.save(os.path.join(out, 'hero_compare.jpg'), quality=88)
    json.dump({'hero_iou': round(iou, 3), 'dir': DIR}, open(os.path.join(out, 'hero_check.json'), 'w'))
    print('hero IoU', round(iou, 3))


if __name__ == '__main__' and sys.argv[1] == 'calibrate':
    calibrate(sys.argv[2], sys.argv[3])
elif __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 384, int(sys.argv[4]) if len(sys.argv) > 4 else 8)
