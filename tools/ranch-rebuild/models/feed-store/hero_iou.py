"""Hero silhouette IoU: r/hero.png (harness hero camera) vs mj hero.png, same masking/normalising as harness.score."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'model-challenge'))
import numpy as np
from PIL import Image
import harness as H
out, mj = sys.argv[1], sys.argv[2]
mt, _ = H.target_mask(os.path.join(mj, 'hero.png')); mr, _ = H.render_mask(os.path.join(out, 'hero.png'))
nt, nr = H.norm_mask(mt), H.norm_mask(mr)
iou = float((nt & nr).sum() / max(1, (nt | nr).sum()))
ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
Image.fromarray(ov).save(os.path.join(out, 'hero_overlay.png'))
s = json.load(open(os.path.join(out, 'score.json'))); s['hero_iou'] = round(iou, 3); json.dump(s, open(os.path.join(out, 'score.json'), 'w'), indent=1)
print('hero IoU', round(iou, 3))
