"""Hero overlap check (the score for this asset): render the model from the harness hero direction (+X/-Y,
which matches the charming MJ hero: front face on the left, door side on the right) and score its silhouette against views/hero.png
(mj hero with its cast shadow removed, see make_views.py). Override the direction with HERO_DIR=x,y,z.
The default direction (0.62, -0.78, 0.40) is the harness hero azimuth at the charming MJ hero's elevation (about 22
degrees, measured from the basin's top-face depth against its width); the harness's own hero camera is at about 23.
usage: python hero_check.py water-point-charming.glb r [px] [samples]"""
import sys, os, json
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

DIR = tuple(float(x) for x in os.environ.get('HERO_DIR', '0.62,-0.78,0.40').split(','))


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
    json.dump({'hero_iou': round(iou, 3)}, open(os.path.join(out, 'hero_check.json'), 'w'))
    print('hero IoU', round(iou, 3))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 384, int(sys.argv[4]) if len(sys.argv) > 4 else 8)
