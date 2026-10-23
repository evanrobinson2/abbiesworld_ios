"""Hero silhouette check (not the official harness score): render the model from the MJ hero's own direction and
score its silhouette against views/hero.png. The harness hero camera sits at +X/-Y; the MJ hero sees the front gable
on the right and the -X long side on the left, so this uses the hero's direction (estimated from its wall
foreshortening: ~36 deg yaw off the front, ~2 deg up; calibrated on the round-2 model over a yaw 26-40 x elevation 0-18 grid) with the harness lens and distance.
usage: python hero_check.py horse-shelter-charming.glb r [px] [samples]"""
import sys, os, json, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

YAW, ELEV = 36.0, 2.0
DIR = (-math.sin(math.radians(YAW)) * math.cos(math.radians(ELEV)), -math.cos(math.radians(YAW)) * math.cos(math.radians(ELEV)),
       math.sin(math.radians(ELEV)))


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


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 384, int(sys.argv[4]) if len(sys.argv) > 4 else 8)
