"""Silhouette IoU against the concept sheet crop from a chosen camera (the porch lamp is drawn three-quarter, so
the harness front/side cameras can't see it the way the sheet does).
usage: python view_check.py PIECE [px] [samples]        (camera from VIEW below)
       python view_check.py calibrate PIECE             (prints the best yaw/elevation over a grid)
Target: views/PIECE/sheet.png if present, else views/PIECE/view_front.png. Writes r/PIECE/sheet_check.png,
sheet_compare.jpg and sheet_check.json."""
import sys, os, json, math
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

# yaw: degrees from the front (-Y) towards +X (camera moves round to the right); elev: degrees up
VIEW = {'crook-lantern': (0, 0), 'post-lantern': (0, 0), 'porch-lamp': (45, 0), 'string-lights': (0, 0)}


def direction(yaw, elev):
    y, e = math.radians(yaw), math.radians(elev)
    return (math.sin(y) * math.cos(e), -math.cos(y) * math.cos(e), math.sin(e))


def target(piece):
    p = os.path.join(HERE, 'views', piece, 'sheet.png')
    return p if os.path.exists(p) else os.path.join(HERE, 'views', piece, 'view_front.png')


def shoot(piece, yaw, elev, px, samples, path):
    import bpy
    sc, lo, hi, tris, n = harness._scene(os.path.join(HERE, piece + '.glb'), px, samples)
    harness._cam(sc, lo, hi, direction(yaw, elev), True)
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)


def iou(nt, path):
    nr = harness.norm_mask(harness.render_mask(path)[0])
    return float((nt & nr).sum() / max(1, (nt | nr).sum())), nr


def calibrate(piece):
    nt = harness.norm_mask(harness.target_mask(target(piece))[0]); out = os.path.join(HERE, 'r', piece); os.makedirs(out, exist_ok=True)
    p = os.path.join(out, '_cal.png'); res = []
    for yaw in range(30, 75, 5):
        for elev in (0, 5, 10, 15):
            shoot(piece, yaw, elev, 160, 1, p); res.append((iou(nt, p)[0], yaw, elev))
    os.remove(p)
    for r in sorted(res, reverse=True)[:6]:
        print('cal iou %.3f yaw %d elev %d' % r)


def main(piece, px=384, samples=8):
    out = os.path.join(HERE, 'r', piece); os.makedirs(out, exist_ok=True)
    p = os.path.join(out, 'sheet_check.png'); yaw, elev = VIEW[piece]
    shoot(piece, yaw, elev, px, samples, p)
    tp = target(piece); mt, _ = harness.target_mask(tp); nt = harness.norm_mask(mt)
    v, nr = iou(nt, p)
    ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
    t = Image.open(tp).convert('RGB'); t.thumbnail((256, 256))
    r = Image.open(p).convert('RGBA'); rim = Image.new('RGB', r.size, tuple(int(c * 255) for c in harness.BG)); rim.paste(r, (0, 0), r); rim.thumbnail((256, 256))
    sheet = Image.new('RGB', (3 * 260 + 10, 270), 'white')
    for j, im in enumerate((t, rim, Image.fromarray(ov))):
        sheet.paste(im, (5 + j * 260, 5))
    sheet.save(os.path.join(out, 'sheet_compare.jpg'), quality=88)
    json.dump({'sheet_iou': round(v, 3), 'yaw': yaw, 'elev': elev}, open(os.path.join(out, 'sheet_check.json'), 'w'))
    print(piece, 'sheet IoU', round(v, 3))


if __name__ == '__main__':
    if sys.argv[1] == 'calibrate':
        calibrate(sys.argv[2])
    else:
        main(sys.argv[1], *(int(a) for a in sys.argv[2:]))
