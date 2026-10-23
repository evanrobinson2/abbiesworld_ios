"""Base man, round 2: round 1's silhouettes melted into one skin, with the anatomy built on top as forms.

Round 1 (build.py) lofted cross-sections straight from the silhouettes; it matched the outline but read as
stacked tubes with shoulder pads. Here every anatomical mass is its own simple form (cranium, jaw, nose,
rib cage, pecs, abdomen, pelvis, glutes, deltoids, upper arms, forearms, hands and fingers, thighs, knees,
calves, feet), placed on landmarks measured from Evan's front and side views, and the forms are blended
with a smooth union so joints flow like skin. Units below are reference pixels: x = offset from the centre
line (+ = the figure's left), y = column in the side view (smaller = front), z = row (down).

Writes base-man-r2.npz (vertices, faces of Skin and Briefs) for make.py.
"""
import math, os
import numpy as np
from skimage.measure import marching_cubes

HERE = os.path.dirname(os.path.abspath(__file__))
STEP = 0.7
xs = np.arange(-62, 62, STEP); ys = np.arange(214, 286, STEP); zs = np.arange(0, 360, STEP)
GX, GY, GZ = np.meshgrid(xs, ys, zs, indexing="ij")

def ell(c, r, rot=0.0):
    x, y = GX - c[0], GY - c[1]
    if rot:
        cr, sr = math.cos(rot), math.sin(rot); x, y = x * cr + y * sr, -x * sr + y * cr
    q = np.sqrt((x / r[0]) ** 2 + (y / r[1]) ** 2 + ((GZ - c[2]) / r[2]) ** 2)
    return (q - 1) * min(r)

def cone(a, b, ra, rb):
    a, b = np.asarray(a, float), np.asarray(b, float); d = b - a; L2 = d @ d
    t = np.clip(((GX - a[0]) * d[0] + (GY - a[1]) * d[1] + (GZ - a[2]) * d[2]) / L2, 0, 1)
    px, py, pz = a[0] + t * d[0], a[1] + t * d[1], a[2] + t * d[2]
    return np.sqrt((GX - px) ** 2 + (GY - py) ** 2 + (GZ - pz) ** 2) - (ra + t * (rb - ra))

def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h)

def smax(a, b, k):
    return -smin(-a, -b, k)

def both(fn):
    """Build a form on the figure's left and mirror it to the right."""
    return lambda sdf, k: smin(smin(sdf, fn(+1), k), fn(-1), k)

def U(sdf, part, k): return part if sdf is None else smin(sdf, part, k)

# ---- the silhouette body: round 1's lofted cross-sections, filled as solid slices and blended into one skin
import build
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt, gaussian_filter
NRING = {"Head": 32, "Neck": 24, "Torso": 36, "ArmR": 20, "ArmL": 20, "LegR": 28, "LegL": 28}
occ = np.zeros(GX.shape, bool)
for name, n in NRING.items():
    V = np.asarray(build.PARTS[name][0]); k = (len(V) - 2) // n
    R = V[: k * n].reshape(k, n, 3)
    R = np.stack([R[..., 0] / build.S, R[..., 1] / build.S + build.P["cx_side"], build.P["ground"] - R[..., 2] / build.S], -1)
    zr = R[:, 0, 2]; order = np.argsort(zr); R, zr = R[order], zr[order]
    for iz, z in enumerate(zs):
        if z < zr[0] or z > zr[-1]: continue
        j = min(np.searchsorted(zr, z), len(zr) - 1); i = max(j - 1, 0)
        t = 0 if zr[j] == zr[i] else (z - zr[i]) / (zr[j] - zr[i])
        poly = R[i] * (1 - t) + R[j] * t
        im = Image.new("1", (len(ys), len(xs)))
        ImageDraw.Draw(im).polygon([((py - ys[0]) / STEP, (px - xs[0]) / STEP) for px, py, _ in poly], fill=1)
        occ[:, :, iz] |= np.asarray(im, bool)
sil = (distance_transform_edt(~occ) - distance_transform_edt(occ)) * STEP
sil = gaussian_filter(sil, 1.6)                                                   # melt seams and pixel steps

# ---- anatomy on top of the silhouette, construction-style forms
skin = sil
def add(part, k): 
    global skin; skin = smin(skin, part, k)
for s in (1, -1):
    add(ell((s * 13.5, 232.5, 93), (12.0, 4.6, 8.6)), 3.0)                       # pectorals
    add(ell((s * 40.5, 249.5, 85), (8.4, 10.5, 12.0)), 3.0)                      # deltoids
    add(cone((s * 6, 255, 57), (s * 33, 251, 70), 6.5, 4.5), 4.0)               # trapezius slope
    add(ell((s * 45.0, 245.5, 114), (7.6, 8.0, 15.0)), 3.0)                      # biceps
    add(ell((s * 50.0, 247.5, 147), (7.2, 7.6, 12.0)), 3.0)                      # forearm bulk
    add(ell((s * 13.0, 258.5, 181), (13.0, 10.5, 13.0)), 3.0)                    # glutes
    add(ell((s * 17.5, 238.5, 222), (13.0, 10.0, 24.0)), 4.0)                    # quadriceps
    add(ell((s * 16.5, 240.5, 259), (8.2, 8.6, 7.0)), 2.0)                       # knee
    add(ell((s * 16.5, 236.5, 258), (4.6, 2.2, 4.6)), 1.2)                       # kneecap
    add(ell((s * 16.8, 255.5, 281), (9.0, 9.0, 19.0)), 3.0)                      # calf
    add(ell((s * 6.5, 228.0, 136), (5.0, 2.4, 20.0)), 2.0)                       # rectus columns
# face
add(ell((0, 228.6, 25.6), (10.6, 2.4, 2.0)), 1.5)                                  # brow ridge
add(cone((0, 227.0, 27.0), (0, 223.2, 34.6), 1.1, 1.9), 1.2)                      # nose
add(ell((0, 225.2, 35.6), (3.0, 1.9, 1.5)), 0.9)                                  # nostrils
add(ell((0, 226.6, 41.6), (4.6, 1.6, 1.4)), 0.8)                                  # lips
add(ell((0, 227.9, 47.0), (5.2, 2.6, 3.2)), 1.4)                                  # chin
for s in (1, -1):
    add(ell((s * 8.0, 232.0, 33.5), (3.8, 3.4, 3.0)), 1.6)                        # cheekbones
    add(ell((s * 15.2, 248.6, 32.0), (1.5, 3.4, 5.8)), 1.0)                       # ears
    skin = smax(skin, -ell((s * 5.4, 226.0, 28.6), (2.6, 1.6, 1.7)), 1.4)          # eye sockets
    add(ell((s * 5.4, 227.0, 28.8), (2.0, 1.3, 1.3)), 0.7)                        # eyes under the lids
# feet: heel, instep, ball and toes, on a flat sole
for s in (1, -1):
    foot = ell((s * 16.2, 257.0, 349), (5.6, 6.2, 7.0))
    foot = smin(foot, cone((s * 16.5, 251, 343), (s * 25.5, 227, 353), 6.4, 3.8), 3.0)
    foot = smin(foot, ell((s * 26.0, 223.5, 353.5), (8.2, 5.4, 3.1)), 2.0)
    add(foot, 3.0)
skin = smax(skin, GZ - 357.0, 0.6)

# ---- hands: palm turned 40 degrees, four fingers and a thumb, joined to the wrist
TURN = math.radians(40)
for s in (1, -1):
    c = (s * 54.0, 246.0, 184.0)
    hand = ell(c, (3.4, 7.6, 9.0), rot=s * TURN)
    for dy, L in ((-5.6, 13.0), (-1.9, 14.5), (1.9, 13.5), (5.4, 10.5)):        # index .. little
        ox, oy = -math.sin(s * TURN) * dy, math.cos(s * TURN) * dy
        a = (c[0] + ox, c[1] + oy, 191.0); m = (c[0] + ox * 1.02, c[1] + oy - 0.6, 191 + L * 0.55)
        b = (c[0] + ox * 1.05, c[1] + oy - 1.6, 191 + L)
        hand = smin(hand, smin(cone(a, m, 1.65, 1.4), cone(m, b, 1.4, 1.05), 0.3), 0.5)
    hand = smin(hand, cone((c[0] + s * 1.5, c[1] - 5.5, 180), (c[0] + s * 2.5, c[1] - 10.5, 191.5), 2.1, 1.3), 0.8)
    skin = smin(skin, hand, 1.6)

# ---- briefs: a thin cloth shell over the hips, waistband to leg openings
cloth = skin - 0.9
band = np.maximum(174.0 - GZ, GZ - (204.5 - 0.72 * np.abs(GX)))
briefs = np.maximum(cloth, band)

def mesh(f):
    v, F, _, _ = marching_cubes(f, 0.0, spacing=(STEP, STEP, STEP))
    v += [xs[0], ys[0], zs[0]]
    return v, F[:, ::-1]
vs, fs = mesh(skin); vb, fb = mesh(briefs)
np.savez_compressed(os.path.join(HERE, "base-man-r2.npz"), vs=vs, fs=fs, vb=vb, fb=fb)
print(len(vs), len(fs), len(vb), len(fb))
