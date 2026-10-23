"""Builds views/ (the scoring targets) from mj/cow-charming.  usage: python make_views.py [debug]

The cow is cream on a cream backdrop, so the harness's 0.10 colour threshold punches big holes in the head and body
and keeps the warm cast shadow under the hooves. Here each image is keyed again:
  * above the belly line (BELLY): a low threshold (0.035 from the per-row backdrop) with a big closing and every
    hole filled, because the body, head and ears are one lump;
  * below it: a stricter mask that keeps the gaps between the legs (threshold 0.06 plus hoof/udder colour), with the
    floor shadow cut off below the lowest hoof row (GROUND) and thin ground streaks opened away.
The mask is written back as a dark silhouette on the backdrop so the harness reads exactly that mask.
  hero.png: the MJ hero (scored by hero_check.py, it wins).
  view_front.png, view_back.png: the sheet's front and back (scored by the harness, full weight).
  side/view_side.png: the sheet's side; it is drawn three-quarter with the head turned toward us (nose pointing at
                      the viewer), so it is scored separately as a proportion guide only.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'cow-charming')

# per image: belly line row, ground row (shadow cut), extra closing iterations for the upper lump
CFG = {'hero': dict(belly=1330, ground=1670), 'view_front': dict(belly=1180, ground=None),
       'view_back': dict(belly=1180, ground=None), 'view_side': dict(belly=1180, ground=None)}

# hero: below CUT only these hand-traced boxes around the legs and udder count (2048 px hero coordinates)
CUT = 1440
POLYS = {'hero': [[(715, 1440), (935, 1440), (910, 1640), (770, 1640)],      # near front leg
                  [(918, 1440), (1125, 1440), (1125, 1670), (960, 1670)],    # far front leg (closest to camera)
                  [(1125, 1440), (1295, 1440), (1295, 1562), (1125, 1562)],  # udder and far hind leg
                  [(1265, 1440), (1470, 1440), (1452, 1545), (1452, 1640), (1290, 1640)]]} # near hind leg


def backdrop(a):
    edge = np.concatenate([a[:, :8], a[:, -8:]], 1)
    return ndimage.median_filter(np.median(edge, 1), size=(25, 1))[:, None, :]


def hoof_line(a, top):
    """lowest row with hoof colour (tan-brown, clearly darker and more saturated than the floor shadow)"""
    sat = a.max(-1) - a.min(-1)
    hoof = (sat > 0.30) & (a.mean(-1) < 0.62)
    hoof[:top] = False
    ys = np.where(hoof.sum(1) > 4)[0]
    return ys.max() + 3


def key(name):
    a = np.asarray(Image.open(os.path.join(MJ, name + '.png')).convert('RGB')).astype(float) / 255
    bg = backdrop(a)
    d = np.linalg.norm(a - bg, axis=-1)
    c = CFG[name]; b = c['belly']
    g = c['ground'] or hoof_line(a, b)
    up = d > 0.035
    up[b + 60:] = False
    up = ndimage.binary_opening(up, iterations=2)
    up = ndimage.binary_closing(up, iterations=12) | up
    up = ndimage.binary_fill_holes(up)
    lo = (d > 0.04) | (a[..., 2] - bg[..., 2] > 0.02)        # lit cream is a touch bluer than the backdrop
    sat = a.max(-1) - a.min(-1); bsat = (bg.max(-1) - bg.min(-1))
    shadow = (a.mean(-1) < bg.mean(-1) - 0.02) & (np.abs(sat - bsat) < 0.06) & (d < 0.16)
    gr = a[..., 1] / np.maximum(a[..., 0], 1e-3); br = a[..., 2] / np.maximum(a[..., 0], 1e-3)
    shadow |= (gr > 0.85) & (br > 0.66) & (br < 0.79) & (a.mean(-1) < bg.mean(-1) - 0.03)
    if name in POLYS:                    # the hero's floor shadow is as dark as the shaded legs: below CUT keep only the legs
        from PIL import ImageDraw
        pm = Image.new('L', (a.shape[1], a.shape[0]), 0); dr = ImageDraw.Draw(pm)
        for p in POLYS[name]:
            dr.polygon(p, fill=255)
        allow = np.asarray(pm) > 0; allow[:CUT] = True
        lo &= allow
    shadow[:g - 70] = False              # shaded leg colour matches the floor shadow: only test right above the floor
    lo &= ~shadow
    lo[g:] = False
    lo = ndimage.binary_opening(lo, iterations=2)
    lo = ndimage.binary_closing(lo, iterations=3)
    lo = ndimage.binary_opening(lo, structure=np.ones((25, 1)))
    m = np.zeros_like(up); m[:b] = up[:b]; m[b:] = lo[b:] | (up[b:] & ndimage.binary_dilation(lo[b:], iterations=4))
    m[g:] = False
    ref = ndimage.binary_dilation(m[g - 50], iterations=6)      # the floor shadow fans out sideways from the hooves:
    m[g - 45:g] &= ref[None, :]                                  # keep only columns the hooves already occupy
    if name in POLYS:
        m[CUT:] &= allow[CUT:]
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 0.002 * m.size)[0] + 1)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.01 * s.max())[0] + 1)
    return m, a, g


def write(m, a, path):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    out = np.repeat(np.repeat(bg[None, None], a.shape[0], 0), a.shape[1], 1).copy()
    out[m] = (0.35, 0.25, 0.2)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(path)


if __name__ == '__main__':
    dbg = len(sys.argv) > 1
    for v in ['hero', 'view_front', 'view_back', 'view_side']:
        m, a, g = key(v)
        sub = ['side'] if v == 'view_side' else []
        write(m, a, os.path.join(HERE, 'views', *sub, v + '.png'))
        if dbg:
            o = (a * 255).astype(np.uint8).copy(); o[m] = (o[m] * 0.5 + np.array([0, 0, 255]) * 0.5).astype(np.uint8)
            o[g - 1:g + 1] = (255, 0, 0); o[CFG[v]['belly']] = (0, 160, 0)
            Image.fromarray(o).save(os.path.join(HERE, 'views', f'dbg_{v}.png'))
        print(v, 'ground', g)
    print('views written')
