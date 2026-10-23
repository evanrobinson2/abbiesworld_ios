"""Cuts the kitchen-garden concept sheet into one target per piece and keys each silhouette.
usage: python make_views.py      (reads views/sheet.png, the 2912x1632 Midjourney sheet from mj/kitchen-garden/sheet.png)
writes views/<piece>.png (the crop) and views/<piece>_mask.png (the keyed silhouette, cast shadows removed).
Boxes are in sheet pixels. The sheet's backdrop is a flat cream; the cast shadows are the cream darkened towards olive,
so every pixel near the segment shadow -> backdrop colour is dropped (TOL 0.075 in RGB)."""
import os, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
K = 1.456
BOXES = {  # piece: (x0, y0, x1, y1) in the 2000 px preview, scaled by K to sheet pixels
    'bed': (70, 575, 792, 975), 'stake': (782, 185, 892, 790), 'watering-can': (832, 595, 1072, 820),
    'crop-sprout': (1092, 665, 1192, 790), 'crop-growing': (1203, 450, 1390, 795), 'crop-ripe': (1393, 295, 1610, 805),
    'crop-thirsty': (1620, 290, 1850, 810),
}


SHADOW = np.array([176, 158, 108]) / 255   # the sheet's cast shadow (olive-darkened cream)

CAN_GROUND = [(832, 595), (1072, 595), (1072, 790), (1048, 812), (930, 806), (832, 752)]


def key(a, bg, largest=False, fill=0.004, plain_above=0):
    # backdrop and cast shadow both lie on the segment shadow -> backdrop (soft shadow edges blend along it):
    # anything farther than TOL from that segment is the object
    v = bg - SHADOW; t = np.clip(((a - SHADOW) @ v) / (v @ v), -0.15, 1.0)
    d = np.linalg.norm(a - (SHADOW + t[..., None] * v), axis=-1)
    m = d > 0.075
    if plain_above:   # the can's pale grey faces sit near that segment: key it on plain distance from the backdrop,
        # above its ground line (CAN_GROUND, sheet px of the 2000 px preview), below which the cast shadow lies
        x0, y0 = BOXES['watering-can'][:2]
        poly = Image.new('L', (a.shape[1], a.shape[0]), 0)
        ImageDraw.Draw(poly).polygon([((x - x0) * K, (y - y0) * K) for x, y in CAN_GROUND], fill=255)
        m = (np.linalg.norm(a - bg, axis=-1) > 0.06) & (np.asarray(poly) > 0)
    m = ndimage.binary_opening(m, iterations=1)
    lab, k = ndimage.label(ndimage.binary_closing(m, iterations=6) if largest else m)
    if k:
        s = ndimage.sum(m, lab, range(1, k + 1)); m &= np.isin(lab, np.where(s >= (s.max() if largest else 0.03 * s.max()))[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < fill * m.size)[0] + 1)
    return m


def main():
    sheet = np.asarray(Image.open(os.path.join(HERE, 'views', 'sheet.png')).convert('RGB')).astype(float) / 255
    bg = np.median(sheet[:40].reshape(-1, 3), 0)
    for name, b in BOXES.items():
        x0, y0, x1, y1 = [int(round(v * K)) for v in b]
        a = sheet[y0:y1, x0:x1]
        m = key(a, bg, largest=name in ('stake', 'watering-can'), fill=0.0004 if name == 'watering-can' else 0.004, plain_above=int(125 * K) if name == 'watering-can' else 0)
        Image.fromarray((a * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', f'{name}.png'))
        Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', f'{name}_mask.png'))
    print('views written')


if __name__ == '__main__':
    main()
