"""Extra check (not the official score): render the -X gable end (the X-door end, mj view_front) and score it
against views/gable_xdoors.png, which is the left half of mj view_front mirrored (the split cropped its right edge
into the fantasy L-barn).  usage: python gable_check.py barn-upgrade.glb r [px]"""
import sys, os, json
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..'))
import harness


def make_target():
    src = os.path.join(HERE, '..', '..', 'mj', 'barn-upgrade', 'view_front.png')
    a = np.asarray(Image.open(src).convert('RGB'))
    cx = 497                      # centre of the door pair / ridge
    left = a[:, :cx]
    out = np.concatenate([left, left[:, ::-1]], 1)
    Image.fromarray(out).save(os.path.join(HERE, 'views', 'gable_xdoors.png'))


def main(glb, out, px=384):
    import bpy
    make_target()
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), px, 8)
    cam = harness._cam(sc, lo, hi, (-1.0, 0.0, 0.0), True)
    p = os.path.join(out, 'gable_xneg.png'); sc.render.filepath = os.path.abspath(p)
    bpy.ops.render.render(write_still=True)
    mt, _ = harness.target_mask(os.path.join(HERE, 'views', 'gable_xdoors.png')); mr, _ = harness.render_mask(p)
    nt, nr = harness.norm_mask(mt), harness.norm_mask(mr)
    iou = float((nt & nr).sum() / max(1, (nt | nr).sum()))
    ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
    Image.fromarray(ov).save(os.path.join(out, 'gable_xneg_overlay.png'))
    json.dump({'gable_xneg_iou': round(iou, 3)}, open(os.path.join(out, 'gable_check.json'), 'w'))
    print('gable -X IoU', round(iou, 3))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 384)
