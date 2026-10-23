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
HEAD = os.environ.get("HEAD") == "1"       # the head gets its own fine grid so the face has enough voxels
if HEAD:
    STEP = 0.25; xs = np.arange(-20, 20, STEP); ys = np.arange(219, 272, STEP); zs = np.arange(1, 62, STEP)
else:
    STEP = 0.7; xs = np.arange(-62, 62, STEP); ys = np.arange(214, 286, STEP); zs = np.arange(0, 360, STEP)
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
NRING = {"Head": 32, "Neck": 24, "Torso": 36, "LegR": 28, "LegL": 28}      # arms are built as limbs below
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
sil = gaussian_filter(sil, 2.2 * 0.7 / STEP)                                                   # melt seams and pixel steps

# ---- anatomy on top of the silhouette, construction-style forms
skin = sil
def add(part, k): 
    global skin; skin = smin(skin, part, k)
for s in (1, -1):
    add(cone((s * 6, 255, 57), (s * 36, 250, 74), 6.5, 6.0), 5.0)               # trapezius slope into the deltoid
    add(ell((s * 13.0, 258.5, 181), (13.0, 10.5, 13.0)), 3.0)                    # glutes
    add(ell((s * 17.5, 238.5, 222), (13.0, 10.0, 24.0)), 4.0)                    # quadriceps
    add(ell((s * 16.5, 240.5, 259), (8.2, 8.6, 7.0)), 2.0)                       # knee
    add(ell((s * 16.5, 236.5, 258), (4.6, 2.2, 4.6)), 1.2)                       # kneecap
    add(ell((s * 16.8, 255.5, 281), (9.0, 9.0, 19.0)), 3.0)                      # calf
# ---- arms: one limb each along its bones (shoulder, elbow, wrist). Cross-sections have separate outer, inner,
# front and back radii so the bulges sit at different heights on each edge (construction rule: deltoid high on
# the outside, biceps mid-arm in front, triceps high behind; forearm swells just below the elbow, flat at the wrist).
UPPER = dict(z=[70, 80, 88, 100, 112, 124, 136, 140],
             o=[7.0, 10.5, 11.0, 9.5, 9.0, 9.4, 9.4, 9.4], i=[6.0, 8.0, 8.5, 8.5, 9.0, 9.4, 9.0, 9.0],
             f=[8.0, 10.0, 9.8, 9.4, 9.6, 9.4, 8.4, 8.0], b=[8.0, 10.2, 10.4, 10.2, 9.4, 8.4, 8.0, 8.0])
FORE = dict(z=[140, 146, 152, 158, 164, 170, 174],
            o=[9.4, 9.5, 8.5, 7.0, 5.5, 4.6, 4.5], i=[9.0, 8.2, 7.4, 6.2, 5.0, 4.5, 4.5],
            f=[8.0, 8.4, 8.0, 7.0, 6.2, 6.0, 5.8], b=[8.0, 8.6, 8.2, 7.2, 6.4, 6.0, 5.8])
def limb(a, b, prof, s):
    a, b = np.asarray(a, float), np.asarray(b, float); d = b - a; L2 = d @ d
    t = np.clip(((GX - a[0]) * d[0] + (GY - a[1]) * d[1] + (GZ - a[2]) * d[2]) / L2, 0, 1)
    ax_, ay, az = a[0] + t * d[0], a[1] + t * d[1], a[2] + t * d[2]
    rx, ry, rz = GX - ax_, GY - ay, GZ - az
    pick = lambda key: np.interp(az, prof["z"], prof[key])
    ru = np.where(rx * s > 0, pick("o"), pick("i")); rv = np.where(ry < 0, pick("f"), pick("b"))
    q = np.sqrt((rx / ru) ** 2 + (ry / rv) ** 2 + (rz / np.minimum(ru, rv)) ** 2)
    return (q - 1) * np.minimum(ru, rv)
for s in (1, -1):
    sh, el, wr = (s * 39.5, 250.0, 76), (s * 49.5, 249.5, 140), (s * 55.0, 247.0, 174)
    arm = smin(limb(sh, el, UPPER, s), limb(el, wr, FORE, s), 2.0)
    arm = smin(arm, ell((s * 42.0, 250.0, 90), (7.0, 9.0, 12.0)), 4.0)              # deltoid cap
    skin = smin(skin, arm, 4.0)

# surface relief: muscle masses and grooves pushed out of (or into) the skin wherever it faces front or back,
# so they sit on the real surface instead of guessed depths
FRONT = 1 / (1 + np.exp((GY - 247.0) / 2.5)); BACK = 1 - FRONT
def relief(x0, z0, sx, sz, amp, face, sym=True):
    global skin
    for s in ((1, -1) if sym and x0 else (1,)):
        skin = skin - amp * face * np.exp(-((GX - s * x0) / sx) ** 2 - ((GZ - z0) / sz) ** 2)
relief(13.0, 91, 10.5, 7.5, 2.0, FRONT)                                           # pectorals
relief(13.0, 101, 10.0, 1.6, -0.9, FRONT)                                         # their lower edge
relief(0, 96, 1.4, 11.0, -0.8, FRONT)                                             # sternum groove
for zz in (122, 134, 146):
    relief(5.6, zz, 3.8, 4.4, 1.0, FRONT)                                         # abdominal blocks
relief(0, 134, 1.0, 22.0, -0.6, FRONT)                                            # linea alba
relief(21.5, 160, 4.5, 10.0, 0.7, FRONT)                                          # obliques
relief(15.0, 92, 8.5, 11.0, 1.1, BACK)                                            # shoulder blades
relief(0, 125, 1.6, 50.0, -1.0, BACK)                                             # spine groove
relief(6.0, 155, 3.8, 17.0, 0.9, BACK)                                            # spinal erectors
# face
add(ell((0, 228.6, 25.6), (10.6, 2.4, 2.0)), 1.5)                                  # brow ridge
add(cone((0, 227.0, 27.0), (0, 222.8, 34.8), 1.2, 2.2), 1.2)                      # nose
add(ell((0, 225.2, 35.6), (3.0, 1.9, 1.5)), 0.9)                                  # nostrils
add(ell((0, 226.6, 41.6), (4.6, 1.6, 1.4)), 0.8)                                  # lips
add(ell((0, 227.9, 47.0), (5.2, 2.6, 3.2)), 1.4)                                  # chin
for s in (1, -1):
    add(ell((s * 15.2, 248.6, 32.0), (1.5, 3.4, 5.8)), 1.0)                       # ears
add(cone((0, 250.5, 48), (0, 252.5, 66), 10.6, 13.0), 3.0)                         # neck, full width
for s in (1, -1):
    add(cone((s * 4, 256, 52), (s * 30, 251, 70), 6.0, 5.0), 5.0)                 # trapezius from the skull base
# face as relief on the head's front: brow, eye sockets, eyeballs, cheekbones, mouth, chin
FACE = FRONT * (GZ < 52)
relief(5.6, 25.4, 3.8, 1.4, 0.75, FACE)                                           # brows, one over each eye
relief(0, 26.5, 1.6, 1.6, 0.4, FACE)                                              # glabella
relief(5.4, 28.9, 2.2, 1.9, -1.5, FACE)                                           # eye sockets
relief(5.4, 29.1, 1.4, 1.0, 0.95, FACE)                                           # eyeballs
relief(9.0, 39.5, 2.2, 2.6, -0.5, FACE)                                           # cheek hollows
relief(0, 41.4, 2.6, 0.7, 0.45, FACE)                                             # upper lip
relief(0, 43.4, 2.2, 0.8, 0.5, FACE)                                              # lower lip
relief(5.4, 30.5, 1.8, 0.5, 0.25, FACE)                                           # lower lids
relief(8.8, 33.2, 2.4, 2.2, 0.55, FACE)                                           # cheekbones
relief(4.2, 38.6, 0.9, 2.6, -0.35, FACE)                                          # smile lines
relief(0, 42.4, 3.0, 0.45, -0.45, FACE)                                           # mouth line
relief(0, 46.6, 3.4, 2.2, 0.45, FACE)                                             # chin
relief(0, 51.8, 8.0, 1.3, -1.1, FRONT * (GZ < 60))                                # under the jaw
JAWSIDE = np.exp(-((GY - 245.0) / 6.0) ** 2) * (GZ < 60)
relief(11.5, 50.0, 2.5, 2.0, -0.9, JAWSIDE)                                       # jaw line, sides
relief(20.0, 112, 7.0, 18.0, 1.0, BACK)                                           # lats
relief(8.0, 70, 7.0, 8.0, 1.0, BACK)                                              # upper trapezius
# feet: heel, instep, ball and toes, on a flat sole
for s in (1, -1):
    foot = ell((s * 16.2, 257.0, 349), (5.6, 6.2, 7.0))
    foot = smin(foot, cone((s * 16.5, 251, 343), (s * 25.5, 227, 353), 6.4, 3.8), 3.0)
    foot = smin(foot, ell((s * 26.0, 223.5, 353.5), (8.2, 5.4, 3.1)), 2.0)
    add(foot, 3.0)
skin = smax(skin, GZ - 357.0, 0.6)

# ---- hands: palm turned 40 degrees, four fingers and a thumb, joined to the wrist
TURN = math.radians(58)
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
if HEAD:
    vs, fs = mesh(smax(skin + 0.5 * np.clip((GZ - 52.5) / 3.0, 0, 1), GZ - 60.0, 0.5))   # tucks inside the body below the jaw
    np.savez_compressed(os.path.join(HERE, "base-man-r2-head.npz"), vs=vs, fs=fs)
else:
    vs, fs = mesh(smax(skin, 51.5 - GZ, 0.5)); vb, fb = mesh(briefs)
    np.savez_compressed(os.path.join(HERE, "base-man-r2.npz"), vs=vs, fs=fs, vb=vb, fb=fb)
print(len(vs), len(fs), len(vb), len(fb))
