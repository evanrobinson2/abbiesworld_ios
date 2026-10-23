"""Hero silhouette score for goat-house-open (the hero is the only target: the turnaround draws a different house).

  python hero_check.py target MJ_HERO          writes views/hero.png (object keyed by hue, cast shadow and the goat out)
                                                and views/hero_with_goat.png (goat kept, for reference)
  python hero_check.py calibrate MODEL.glb r   grid of camera yaw/elevation, prints the best IoUs
  python hero_check.py MODEL.glb r [px] [samples]   render from the matched camera, score, write r/compare.png

The MJ hero looks at the front (-Y, door) on the right and the open -X side on the left, so the camera sits front-left:
direction (-sin yaw cos elev, -cos yaw cos elev, sin elev). Harness lens (50 mm) and distance (1.9 x bbox diagonal)."""
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

YAW, ELEV = 45.0, 21.0


def direction(yaw, elev):
    y, e = math.radians(yaw), math.radians(elev)
    return (-math.sin(y) * math.cos(e), -math.cos(y) * math.cos(e), math.sin(e))


def target(src):
    a = np.asarray(Image.open(src).convert('RGB')).astype(float)
    R, G, B = a[..., 0] + 1, a[..., 1] + 1, a[..., 2] + 1
    back = (G / R > 0.80) & (G / R < 0.98) & (B / G < 0.92)          # warm backdrop and its grey-olive shadow (wood is G/R < 0.78)
    shadow = (a.mean(-1) < 200) & (np.abs(G / R - 0.9) < 0.12) & (B / G > 0.75) & (B / G < 1.0) & (a.max(-1) - a.min(-1) < 45)
    m = ~back & ~shadow
    m = ndimage.binary_opening(m, iterations=3)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(s) + 1)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=4))
    full = m.copy()
    # the goat on the deck is not part of the model: its outline (hand-traced, hero display px x 1.06) is erased, and the
    # part of the roof it hides is filled back in from the roof's own outline (apex, ridge end, eave line)
    from PIL import ImageDraw as _D
    f = a.shape[1] / 1932
    goat_poly = [(900, 372), (990, 330), (1050, 380), (1110, 430), (1160, 470), (1215, 560), (1235, 640), (1225, 700),
                 (1170, 730), (1120, 770), (1060, 760), (1035, 700), (1010, 560), (990, 470), (930, 445)]
    roof_poly = [(575, 598), (1140, 405), (1215, 600), (1150, 700), (790, 870)]
    def poly(pts):
        im = Image.new('L', (a.shape[1], a.shape[0]), 0); _D.Draw(im).polygon([(x * f, y * f) for x, y in pts], fill=1)
        return np.asarray(im).astype(bool)
    G2, RQ = poly(goat_poly), poly(roof_poly)
    m = (m & ~G2) | (G2 & RQ)
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(s) + 1)
    m = ndimage.binary_fill_holes(m)
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    for mm, name in ((m, 'hero.png'), (full, 'hero_with_goat.png')):
        out = np.empty_like(a); out[:] = (246, 226, 192); out[mm] = a[mm]
        Image.fromarray(out.astype(np.uint8)).save(os.path.join(HERE, 'views', name))


def render_dir(glb, out, d, px, samples, name):
    import bpy
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), px, samples)
    harness._cam(sc, lo, hi, d, False)
    p = os.path.abspath(os.path.join(out, name)); sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    return p, tris


def iou_of(tpath, rpath):
    mt, _ = harness.target_mask(tpath); mr, _ = harness.render_mask(rpath)
    nt, nr = harness.norm_mask(mt), harness.norm_mask(mr)
    return float((nt & nr).sum() / max(1, (nt | nr).sum())), nt, nr


def calibrate(glb, out):
    best = []
    for yaw in range(38, 56, 3):
        for elev in range(14, 30, 3):
            p, _ = render_dir(glb, out, direction(yaw, elev), 160, 1, '_cal.png')
            best.append((iou_of(os.path.join(HERE, 'views', 'hero.png'), p)[0], yaw, elev))
    os.remove(p)
    for b in sorted(best, reverse=True)[:6]:
        print('cal iou %.3f yaw %d elev %d' % b)


def main(glb, out, px=512, samples=16):
    os.makedirs(out, exist_ok=True)
    p, tris = render_dir(glb, out, direction(YAW, ELEV), px, samples, 'hero_mj.png')
    iou, nt, nr = iou_of(os.path.join(HERE, 'views', 'hero.png'), p)
    iou_g = iou_of(os.path.join(HERE, 'views', 'hero_with_goat.png'), p)[0]
    S = 384
    ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
    tgt = Image.open(os.path.join(HERE, 'views', 'hero.png')).convert('RGB')
    r = Image.open(p).convert('RGBA'); rim = Image.new('RGB', r.size, tuple(int(c * 255) for c in harness.BG)); rim.paste(r, (0, 0), r)
    def fit(im, mask=None):   # crop to the object, same framing for both
        m = np.asarray(im.convert('RGB')).astype(int); bg = m[2, 2]
        ys, xs = np.where(np.abs(m - bg).sum(-1) > 30 if mask is None else mask); pad = 0.06 * max(np.ptp(xs), np.ptp(ys))
        c = ((xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2); h = max(np.ptp(xs), np.ptp(ys)) / 2 + pad
        return im.crop((int(c[0] - h), int(c[1] - h), int(c[0] + h), int(c[1] + h))).resize((S, S), Image.LANCZOS)
    mj = Image.open(os.path.join(HERE, 'views', 'hero_mj_raw.png')).convert('RGB') if os.path.exists(os.path.join(HERE, 'views', 'hero_mj_raw.png')) else tgt
    sheet = Image.new('RGB', (3 * (S + 8) + 8, S + 40), 'white'); d = ImageDraw.Draw(sheet)
    for j, im in enumerate((fit(mj, harness.target_mask(os.path.join(HERE, 'views', 'hero.png'))[0]), fit(rim), Image.fromarray(ov).resize((S, S), Image.NEAREST))):
        sheet.paste(im, (8 + j * (S + 8), 8))
    d.text((10, S + 16), 'MJ hero | render (matched camera yaw %.0f elev %.0f) | silhouette overlay: IoU %.3f (goat erased from target), %.3f with goat; %d tris'
           % (YAW, ELEV, iou, iou_g, tris), fill='black')
    sheet.save(os.path.join(out, 'compare.png'))
    json.dump({'hero_iou': round(iou, 3), 'hero_iou_with_goat': round(iou_g, 3), 'yaw': YAW, 'elev': ELEV, 'dir': direction(YAW, ELEV),
               'triangles': tris}, open(os.path.join(out, 'hero_check.json'), 'w'), indent=1)
    print('hero IoU %.3f (with goat %.3f) tris %d' % (iou, iou_g, tris))


if __name__ == '__main__':
    if sys.argv[1] == 'target':
        target(sys.argv[2])
        Image.open(sys.argv[2]).convert('RGB').save(os.path.join(HERE, 'views', 'hero_mj_raw.png'))
    elif sys.argv[1] == 'calibrate':
        calibrate(sys.argv[2], sys.argv[3])
    else:
        main(sys.argv[1], sys.argv[2], *(int(x) for x in sys.argv[3:5]))
