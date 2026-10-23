"""views/hero.png: the MJ hero with its cast shadow removed (backdrop flattened), so the harness's target mask is the
object only. The basin is filled from its outline polygon (its pale stones otherwise leak into the mask's holes);
above the coping the harness's own colour-difference mask is kept. The turnaround sheet is not used (three designs)."""
import sys, os
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness
SRC = os.path.join(HERE, '..', '..', 'mj', 'water-point', 'hero.png')
S = 2048 / 1932
BASIN = [(350, 1130), (940, 942), (1550, 1118), (1552, 1165), (1528, 1548), (970, 1748), (372, 1592), (352, 1180)]
m, a = harness.target_mask(SRC)
H, W = m.shape
poly = Image.new('L', (W, H), 0); ImageDraw.Draw(poly).polygon([(x * S, y * S) for x, y in BASIN], fill=255)
poly = np.asarray(poly) > 0
ys = np.arange(H)[:, None] * np.ones((1, W))
m = (m & (ys < 1135 * S)) | poly
# keep the outer-rim pixels above the basin top edge line (left coping corner to the back corner)
img = np.asarray(Image.open(SRC).convert('RGB')).copy()
bg = np.array([252, 236, 204], np.uint8)
img[~m] = bg
os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
Image.fromarray(img).save(os.path.join(HERE, 'views', 'hero.png'))
m2, _ = harness.target_mask(os.path.join(HERE, 'views', 'hero.png'))
Image.fromarray((m2 * 255).astype(np.uint8)).resize((512, 512)).save(os.path.join(HERE, 'views', '_mask_hero.png'))
print('views/hero.png written, mask px', int(m2.sum()))
