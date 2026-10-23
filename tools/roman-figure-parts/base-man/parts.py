"""Base man, round 3: one part at a time (Evan, 2026-10-23 07:07Z).

"drew each part, finger, hand, fore arm, wrist, all of them one by one until you had all of them, then you stitch
them together and the end is somehow not frankenstein". Every piece below is its own anatomical module, built
along its bones from construction forms (AW-STUDY-0016 construction.json: offset bulges, a box wrist, a D-section
shin, a wedge foot, creases only at landmarks) and checked alone against its Midjourney sheet
(tools/midjourney/outputs/base-man-parts-0020/). The pieces are then stitched with smooth unions, so the seams
melt like skin. The trunk and head keep round 1's measured silhouettes as their base form; every limb, hand and
foot is built along its bones (never from horizontal slices: the "torture chamber" arms of round 2).

Units are reference pixels: x = offset from the centre line (+ = the side we build, mirrored for the other),
y = column in the side view (smaller = front), z = row (down). Paired pieces are written for x > 0.

python3 parts.py solo [sheet ...]  ->  parts/<sheet>.npz   one sheet's pieces alone, on a fine grid
python3 parts.py body              ->  base-man-r3.npz, base-man-r3-head.npz   all pieces stitched
"""
import json, math, os, sys
import numpy as np
from scipy.ndimage import distance_transform_edt, gaussian_filter, map_coordinates
from skimage.measure import marching_cubes

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "parts"); CACHE = os.path.join(HERE, "cache")
f32 = np.float32

# ---------------------------------------------------------------- kit
def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1); return b * (1 - h) + a * h - k * h * (1 - h)

def smax(a, b, k): return -smin(-a, -b, k)

class Bone:
    """A bone from a to b. Local coordinates: u across (outer side +), v towards `fwd` (front +), w along."""
    def __init__(s, a, b, fwd=(0, -1, 0)):
        s.a = np.asarray(a, float); d = np.asarray(b, float) - s.a; s.L = float(np.linalg.norm(d)); s.w = d / s.L
        v = np.asarray(fwd, float); v = v - (v @ s.w) * s.w; s.v = v / np.linalg.norm(v); s.u = np.cross(s.w, s.v)
    def local(s, P):
        dx, dy, dz = P[0] - s.a[0], P[1] - s.a[1], P[2] - s.a[2]
        return tuple(dx * e[0] + dy * e[1] + dz * e[2] for e in (s.u, s.v, s.w))
    def at(s, t, du=0.0, dv=0.0): return s.a + s.w * t * s.L + s.u * du + s.v * dv

def ell(P, c, r):
    q = np.sqrt(((P[0] - c[0]) / r[0]) ** 2 + ((P[1] - c[1]) / r[1]) ** 2 + ((P[2] - c[2]) / r[2]) ** 2)
    return (q - 1) * min(r)

def cone(P, a, b, ra, rb):
    a, b = np.asarray(a, float), np.asarray(b, float); d = b - a; L2 = d @ d
    t = np.clip(((P[0] - a[0]) * d[0] + (P[1] - a[1]) * d[1] + (P[2] - a[2]) * d[2]) / L2, 0, 1)
    return np.sqrt((P[0] - a[0] - t * d[0]) ** 2 + (P[1] - a[1] - t * d[1]) ** 2 + (P[2] - a[2] - t * d[2]) ** 2) - (ra + t * (rb - ra))

def limb(P, bone, prof):
    """A limb along its bone. Each cross-section has its own outer, inner, front and back radius (prof o, i, f, b
    over t = 0..1), so a bulge can peak at a different height on each edge; p > 2 squares the section (wrist box)."""
    U, V, W = bone.local(P); t = np.clip(W / bone.L, 0, 1)
    pk = lambda k: np.interp(t, prof["t"], prof[k]).astype(f32)
    ru = np.where(U > 0, pk("o"), pk("i")); rv = np.where(V > 0, pk("f"), pk("b"))
    p = pk("p") if "p" in prof else 2.0
    q = (np.abs(U / ru) ** p + np.abs(V / rv) ** p) ** (1 / p); rr = np.minimum(ru, rv)
    return (np.sqrt(q ** 2 + ((W - t * bone.L) / rr) ** 2) - 1) * rr

def gauss(P, c, s):
    return np.exp(-sum(((P[i] - c[i]) / s[i]) ** 2 for i in range(3)))

# ---------------------------------------------------------------- measured base forms (round 1's lofted slices)
def silhouette(names, lo, hi, step=0.5):
    """Round 1's lofted cross-sections for `names`, filled solid and turned into a smooth distance field."""
    os.makedirs(CACHE, exist_ok=True); path = os.path.join(CACHE, "sil-" + "-".join(names) + ".npz")
    if not os.path.exists(path):
        import build
        from PIL import Image, ImageDraw
        ax = [np.arange(l, h, step) for l, h in zip(lo, hi)]
        occ = np.zeros([len(a) for a in ax], bool)
        for name in names:
            n = {"Head": 32, "Neck": 24, "Torso": 36}[name]
            V = np.asarray(build.PARTS[name][0]); k = (len(V) - 2) // n
            R = V[: k * n].reshape(k, n, 3)
            R = np.stack([R[..., 0] / build.S, R[..., 1] / build.S + build.P["cx_side"], build.P["ground"] - R[..., 2] / build.S], -1)
            zr = R[:, 0, 2]; o = np.argsort(zr); R, zr = R[o], zr[o]
            for iz, z in enumerate(ax[2]):
                if z < zr[0] or z > zr[-1]: continue
                j = min(np.searchsorted(zr, z), len(zr) - 1); i = max(j - 1, 0)
                t = 0 if zr[j] == zr[i] else (z - zr[i]) / (zr[j] - zr[i])
                poly = R[i] * (1 - t) + R[j] * t
                im = Image.new("1", (len(ax[1]), len(ax[0])))
                ImageDraw.Draw(im).polygon([((py - lo[1]) / step, (px - lo[0]) / step) for px, py, _ in poly], fill=1)
                occ[:, :, iz] |= np.asarray(im, bool)
        F = (distance_transform_edt(~occ) - distance_transform_edt(occ)) * step
        F = gaussian_filter(F, 1.55 / step).astype(f32)
        np.savez_compressed(path, F=F, lo=np.asarray(lo, float), step=step)
    d = np.load(path); F, lo0, st = d["F"], d["lo"], float(d["step"])
    return lambda P: map_coordinates(F, [(P[i] - lo0[i]) / st for i in range(3)], order=1, mode="constant", cval=20.0).astype(f32)

def leg_profile():
    """Outer, inner, front and back radii of the leg, measured from the front and side views around the bones."""
    import build
    hip, knee, ank = LEG
    zs = np.arange(196, 317, 4.0); rows = []
    for z in zs:
        t = (z - hip[2]) / (knee[2] - hip[2]) if z <= knee[2] else (z - knee[2]) / (ank[2] - knee[2])
        a, b = (hip, knee) if z <= knee[2] else (knee, ank)
        cx = a[0] + t * (b[0] - a[0]); cy = a[1] + t * (b[1] - a[1])
        fr = [r for r in build.runs(z, 104, 170) if r[1] - 103.5 > cx]; sd = build.runs(z, 210, 285)
        l, r = fr[0][0] - 103.5, fr[0][1] - 103.5
        rows.append((z, r - cx, cx - max(l, 1.0), cy - sd[0][0], sd[-1][1] - cy))
    R = np.asarray(rows, float)
    from scipy.ndimage import uniform_filter1d
    for c in range(1, 5): R[:, c] = uniform_filter1d(R[:, c], 3, mode="nearest")
    return R

# ---------------------------------------------------------------- skeleton (landmarks from Evan's front and side views)
SH, EL, WR = (39.5, 250.0, 76.0), (49.5, 249.5, 140.0), (55.0, 247.0, 174.0)
LEG = ((17.5, 243.0, 190.0), (17.0, 247.5, 258.0), (17.0, 252.0, 336.0))     # hip joint, knee, ankle
UPPER_ARM, FOREARM = Bone(SH, EL), Bone(EL, WR)
THIGH, SHIN = Bone(LEG[0], LEG[1]), Bone(LEG[1], LEG[2])

# ---------------------------------------------------------------- pieces
SIL = {}
def sil(key):
    if key not in SIL:
        SIL[key] = {"head": lambda: silhouette(["Head"], (-20, 219, 0), (20, 275, 56), 0.25),
                    "neck": lambda: silhouette(["Neck"], (-20, 225, 36), (20, 280, 75), 0.4),
                    "trunk": lambda: silhouette(["Torso"], (-42, 212, 52), (42, 288, 198), 0.5)}[key]()
    return SIL[key]

def front_w(P, y0=247.0, soft=2.5): return 1 / (1 + np.exp((P[1] - y0) / soft))

def head(P):
    """Head: the measured skull, then the face as forms and planes (brow, sockets, eyes, nose, cheekbones, mouth,
    chin, jaw) and the ears (helix rim, bowl, lobe)."""
    f = sil("head")(P)
    f = smin(f, ell(P, (0, 228.6, 25.6), (10.6, 2.4, 2.0)), 1.5)                  # brow ridge
    f = smin(f, cone(P, (0, 227.0, 27.0), (0, 222.8, 34.8), 1.2, 2.2), 1.2)       # nose bridge to tip
    f = smin(f, ell(P, (0, 225.2, 35.6), (3.0, 1.9, 1.5)), 0.9)                   # nostril wings
    f = smin(f, ell(P, (0, 226.6, 41.6), (4.6, 1.6, 1.4)), 0.8)                   # mouth barrel
    f = smin(f, ell(P, (0, 227.9, 47.0), (5.2, 2.6, 3.2)), 1.4)                   # chin
    FACE = front_w(P) * (P[2] < 52)
    def relief(x0, z0, sx, sz, amp, wt):
        nonlocal f
        for s in ((1, -1) if x0 else (1,)):
            f = f - amp * wt * np.exp(-((P[0] - s * x0) / sx) ** 2 - ((P[2] - z0) / sz) ** 2)
    relief(5.6, 25.4, 3.8, 1.4, 0.75, FACE); relief(0, 26.5, 1.6, 1.6, 0.4, FACE)        # brows, glabella
    relief(5.4, 28.9, 2.2, 1.9, -1.5, FACE); relief(5.4, 29.1, 1.4, 1.0, 0.95, FACE)     # sockets, eyeballs
    relief(5.4, 27.7, 1.7, 0.45, 0.25, FACE); relief(5.4, 30.5, 1.8, 0.5, 0.25, FACE)    # upper and lower lids
    relief(9.0, 39.5, 2.2, 2.6, -0.5, FACE); relief(8.8, 33.2, 2.4, 2.2, 0.55, FACE)     # cheek hollows, cheekbones
    relief(4.2, 38.6, 0.9, 2.6, -0.35, FACE)                                             # smile lines
    relief(0, 41.4, 2.6, 0.7, 0.45, FACE); relief(0, 43.4, 2.2, 0.8, 0.5, FACE)          # upper, lower lip
    relief(0, 42.4, 3.0, 0.45, -0.45, FACE); relief(0, 39.6, 0.8, 1.0, -0.3, FACE)       # mouth line, philtrum
    relief(0, 46.6, 3.4, 2.2, 0.45, FACE); relief(0, 51.8, 8.0, 1.3, -1.1, front_w(P) * (P[2] < 60))   # chin, under jaw
    relief(11.5, 50.0, 2.5, 2.0, -0.9, np.exp(-((P[1] - 245.0) / 6.0) ** 2) * (P[2] < 60))              # jaw line
    for s in (1, -1):                                                                     # ears
        Q = (s * P[0], P[1], P[2])
        ear = ell(Q, (15.0, 248.8, 32.0), (1.6, 3.5, 5.9))
        ear = smax(ear, -ell(Q, (16.3, 248.4, 31.6), (1.0, 2.2, 3.6)), 0.4)           # the bowl (concha)
        ear = smin(ear, ell(Q, (15.2, 248.2, 37.2), (1.3, 1.9, 1.8)), 0.6)            # lobe
        f = smin(f, ear, 1.0)
    return f

def neck(P):
    """Neck and shoulder yoke: the neck cylinder leaning forward, the two neck straps (sternomastoids) in a V to the
    pit, collarbones out to the shoulder points, trapezius sloping from the skull to the shoulders."""
    f = smin(sil("neck")(P), cone(P, (0, 250.5, 48), (0, 252.5, 66), 10.6, 13.0), 3.0)
    for s in (1, -1):
        Q = (s * P[0], P[1], P[2])
        f = smin(f, cone(Q, (9.5, 249.5, 40), (2.0, 238.5, 64), 2.3, 2.0), 1.6)        # neck strap
        f = smin(f, cone(Q, (2.5, 239.0, 65), (33.0, 245.0, 70), 1.5, 1.7), 1.6)       # collarbone
        f = smin(f, cone(Q, (4.0, 256.0, 52), (30.0, 251.0, 70), 6.0, 5.0), 5.0)       # trapezius from the skull base
        f = smin(f, cone(Q, (6.0, 255.0, 57), (36.0, 250.0, 74), 6.5, 6.0), 5.0)       # trapezius slope to the deltoid
    return f

def trunk(P, front=True, back=True):
    """Trunk: the measured torso, then chest, abdomen and back as forms on its surface (pectorals, sternum,
    six abdominal blocks, obliques, shoulder blades, lats, spine and its erectors), and the glutes."""
    f = sil("trunk")(P); F = front_w(P); B = 1 - F
    def relief(x0, z0, sx, sz, amp, wt):
        nonlocal f
        for s in ((1, -1) if x0 else (1,)):
            f = f - amp * wt * np.exp(-((P[0] - s * x0) / sx) ** 2 - ((P[2] - z0) / sz) ** 2)
    relief(13.0, 91, 10.5, 7.5, 2.0, F); relief(13.0, 101, 10.0, 1.6, -0.9, F)          # pectorals and their lower edge
    relief(0, 96, 1.4, 11.0, -0.8, F)                                                   # sternum groove
    for zz in (122, 134, 146): relief(5.6, zz, 3.8, 4.4, 1.0, F)                        # abdominal blocks
    relief(0, 134, 1.0, 22.0, -0.6, F); relief(21.5, 160, 4.5, 10.0, 0.7, F)           # linea alba, obliques
    relief(10.5, 168, 1.6, 9.0, -0.5, F)                                                # inguinal line
    relief(15.0, 92, 8.5, 11.0, 1.1, B); relief(0, 125, 1.6, 50.0, -1.0, B)            # shoulder blades, spine groove
    relief(6.0, 155, 3.8, 17.0, 0.9, B); relief(20.0, 112, 7.0, 18.0, 1.0, B)          # erectors, lats
    relief(8.0, 70, 7.0, 8.0, 1.0, B)                                                   # upper trapezius
    for s in (1, -1):
        f = smin(f, ell((s * P[0], P[1], P[2]), (13.0, 258.5, 181), (13.0, 10.5, 13.0)), 3.0)   # glutes
    return f

def deltoid(P):
    """Shoulder: the deltoid as a wedge over the shoulder joint, its point driven into the outer arm halfway down."""
    U, V, W = UPPER_ARM.local(P); Q = (U, V, W)
    f = ell(Q, (2.4, 0.0, 9.5), (8.2, 10.0, 13.0))
    f = smin(f, cone(Q, (3.0, 0.0, 14.0), (6.4, 0.3, 31.0), 5.2, 1.6), 3.0)
    f = smin(f, ell(Q, (1.0, 4.0, 8.0), (6.0, 6.0, 10.0)), 2.0)                       # front head
    return f

UPPER = dict(t=[0, 0.06, 0.19, 0.375, 0.56, 0.75, 0.94, 1],
             o=[7.0, 8.4, 8.8, 9.0, 9.0, 9.2, 9.4, 9.4], i=[6.0, 8.0, 8.5, 8.5, 9.0, 9.4, 9.0, 9.0],
             f=[8.0, 9.0, 9.2, 9.6, 10.0, 9.6, 8.4, 8.0], b=[8.0, 10.0, 10.4, 10.2, 9.4, 8.4, 8.0, 8.0])
def upper_arm(P):
    """Upper arm: a cylinder flattened side to side, biceps peaking mid-arm in front, triceps high behind."""
    f = limb(P, UPPER_ARM, UPPER)
    Q = UPPER_ARM.local(P)
    f = smin(f, ell(Q, (0.0, 3.2, 38.0), (5.6, 5.4, 14.0)), 2.5)                       # biceps belly
    f = smin(f, ell(Q, (-1.0, -3.6, 26.0), (6.4, 5.6, 17.0)), 2.5)                     # triceps
    return f

def elbow(P):
    """Elbow: the point of the ulna behind, the inner knob (epicondyle) and the outer forearm muscles' start."""
    Q = UPPER_ARM.local(P); L = UPPER_ARM.L
    f = ell(Q, (0.3, -6.2, L - 0.5), (2.6, 2.2, 3.4))                                  # olecranon
    f = smin(f, ell(Q, (-7.6, -1.0, L - 2.5), (2.0, 2.4, 2.4)), 1.2)                   # inner epicondyle
    return f

FORE = dict(t=[0, 0.18, 0.35, 0.53, 0.71, 0.88, 1],
            o=[8.6, 8.4, 7.6, 6.6, 5.4, 4.6, 4.5], i=[8.6, 8.0, 7.2, 6.0, 5.0, 4.5, 4.5],
            f=[8.0, 8.4, 8.0, 7.0, 6.2, 6.0, 5.8], b=[8.0, 8.6, 8.2, 7.2, 6.4, 6.0, 5.8],
            p=[2.0, 2.0, 2.1, 2.3, 2.6, 2.9, 3.0])
def forearm(P):
    """Forearm: round and full under the elbow (brachioradialis outside, flexors inside), tapering to a flat box
    at the wrist; the bellies sit in the top half and the bottom half is tendon."""
    f = limb(P, FOREARM, FORE); Q = FOREARM.local(P)
    f = smin(f, ell(Q, (3.6, 2.6, 7.0), (4.4, 4.6, 10.0)), 2.0)                        # brachioradialis
    f = smin(f, ell(Q, (-3.4, 0.8, 9.0), (4.6, 4.6, 10.0)), 2.0)                       # flexor mass
    f = smin(f, ell(Q, (1.0, -3.2, 8.0), (4.2, 4.0, 9.0)), 2.0)                        # extensors behind
    return f

def wrist(P):
    """Wrist: the box between forearm and hand, with the head of the ulna on the little-finger side."""
    Q = FOREARM.local(P); L = FOREARM.L
    return ell(Q, (-1.0, -4.0, L - 1.5), (1.9, 1.8, 2.0))

# hand frame: origin at the wrist, u towards the thumb (front), v out of the palm (towards the thigh), w to the fingers
HAND = Bone(WR, (54.0, 245.5, 205.0), fwd=(-0.97, 0.22, 0))
FINGERS = {  # base across the knuckles (u), phalanx lengths, width and depth at the base, splay and curl (degrees)
    "index":  dict(u=5.1, w=15.6, L=(6.8, 4.2, 3.3), r=(1.68, 1.5), splay=6, curl=(6, 12, 8)),
    "middle": dict(u=1.7, w=16.1, L=(7.4, 4.7, 3.5), r=(1.76, 1.55), splay=1, curl=(7, 14, 9)),
    "ring":   dict(u=-1.7, w=15.8, L=(7.0, 4.5, 3.4), r=(1.64, 1.45), splay=-4, curl=(9, 17, 10)),
    "little": dict(u=-4.9, w=14.8, L=(5.4, 3.6, 3.0), r=(1.42, 1.28), splay=-10, curl=(12, 20, 12))}

def finger(Q, d):
    """One finger: three phalanges, each a slightly squared tapered section (wider than deep); the joints a little
    fuller on the back, a pad under each phalanx and a nail on the last."""
    p = np.array([d["u"], 0.0, d["w"]]); a_s = math.radians(d["splay"]); bend = 0.0; (rw, rd) = d["r"]; f = None
    taper = (0.88, 0.84, 0.80)
    for k, (L, c) in enumerate(zip(d["L"], d["curl"])):
        bend += math.radians(c)
        dirn = np.array([math.sin(a_s) * math.cos(bend), math.sin(bend), math.cos(a_s) * math.cos(bend)])
        q = p + dirn * L; b = Bone(p, q, fwd=(0, 1, 0)); w1, d1 = rw * taper[k], rd * taper[k]
        prof = dict(t=[0, 1], o=[rw, w1], i=[rw, w1], f=[rd, d1 * (0.9 if k == 2 else 1)], b=[rd * 0.92, d1 * 0.85], p=[2.4, 2.4 if k < 2 else 2.1])
        seg = limb(Q, b, prof)
        lq = b.local(Q)
        seg = smin(seg, ell(lq, (0, 0.5 * rd, 0.5 * L), (w1 * 0.86, d1 * 0.62, L * 0.42)), 0.35)    # pad
        if k > 0: seg = smin(seg, ell(lq, (0, -0.3 * rd, 0.0), (rw * 0.92, rd * 0.62, 1.0)), 0.5)  # joint, fuller on the back
        if k == 2:
            seg = smin(seg, ell(lq, (0, -0.86 * d1, 0.62 * L), (w1 * 0.74, 0.3, L * 0.36)), 0.12)  # nail
        f = seg if f is None else smin(f, seg, 0.55)
        p = q; rw, rd = w1, d1
    return f

def thumb(Q):
    """Thumb: its metacarpal buried in the ball of the thumb, then two phalanges, hanging forward beside the index,
    turned so its nail faces forward."""
    J = [np.array(j) for j in ((4.2, 1.2, 1.5), (7.6, 3.4, 9.0), (8.6, 4.8, 14.6), (8.9, 5.3, 19.4))]
    f = None; R = ((2.6, 2.2), (2.15, 1.85), (1.9, 1.6))
    for k in range(3):
        b = Bone(J[k], J[k + 1], fwd=(0.7, -0.7, 0)); (r0, r1) = R[k]
        seg = limb(Q, b, dict(t=[0, 1], o=[r0, r1 * 0.95], i=[r0, r1 * 0.95], f=[r0 * 0.88, r1 * 0.82], b=[r0 * 0.9, r1 * 0.86], p=[2.3, 2.2]))
        if k == 2:
            lq = b.local(Q); seg = smin(seg, ell(lq, (0, 0.82 * r1, 0.6 * b.L), (r1 * 0.75, 0.3, b.L * 0.34)), 0.12)   # nail
        f = seg if f is None else smin(f, seg, 0.6)
    return f

PALM = dict(t=[0, 0.25, 0.6, 0.85, 1], o=[4.6, 6.2, 6.9, 7.0, 6.6], i=[4.4, 5.8, 6.5, 6.6, 6.2],
            f=[2.7, 2.8, 2.5, 2.3, 2.2], b=[2.9, 2.6, 2.4, 2.4, 2.3], p=[2.4, 2.3, 2.3, 2.3, 2.3])
PALM_BONE = Bone((0, 0, 0), (0.0, 0.0, 14.0), fwd=(0, 1, 0))
def palm(Q):
    """Palm: a flat wedge from the box wrist, widening to the knuckles; the ball of the thumb and the heel of the
    little finger on the palm side, the knuckle heads on the back."""
    f = limb(Q, PALM_BONE, PALM)
    f = smin(f, ell(Q, (3.6, 1.6, 6.0), (3.2, 2.4, 5.6)), 1.4)                         # ball of the thumb
    f = smin(f, ell(Q, (-4.2, 1.2, 8.5), (2.2, 1.8, 6.0)), 1.4)                        # heel of the little finger
    for d in FINGERS.values():
        f = smin(f, ell(Q, (d["u"], -1.3, d["w"] - 0.4), (d["r"][0] * 0.85, 1.1, 1.3)), 0.6)   # knuckle heads
    return f

def hand(P, only=None):
    Q = HAND.local(P)
    if only == "finger": return finger(Q, FINGERS["middle"])
    if only == "thumb": return thumb(Q)
    fs = None
    for d in FINGERS.values():                                                         # fingers touch but stay separate
        g = finger(Q, d); fs = g if fs is None else np.minimum(fs, g)
    f = smin(palm(Q), fs, 0.35)
    return smin(f, thumb(Q), 1.2)

THIGH_P = SHIN_P = None
def leg_profiles():
    global THIGH_P, SHIN_P
    if THIGH_P is None:
        R = leg_profile(); hip, knee, ank = LEG
        up, dn = R[R[:, 0] <= knee[2]], R[R[:, 0] >= knee[2]]
        mk = lambda A, a, b, scale: dict(t=list(np.clip((A[:, 0] - a) / (b - a), 0, 1)), o=list(A[:, 1] * scale), i=list(A[:, 2] * scale),
                                         f=list(A[:, 3] * scale), b=list(A[:, 4] * scale))
        THIGH_P = mk(up, hip[2], knee[2], 0.96); SHIN_P = mk(dn, knee[2], ank[2], 0.96)
        THIGH_P["t"][0] = 0.0; SHIN_P["t"][-1] = 1.0
    return THIGH_P, SHIN_P

def thigh(P):
    """Thigh: angles in from the hip to the knee, outer quad high, the teardrop (vastus medialis) low inside,
    the front a long curve, the sartorius groove crossing it."""
    tp, _ = leg_profiles(); f = limb(P, THIGH, tp); Q = THIGH.local(P); L = THIGH.L
    f = smin(f, ell(Q, (5.6, 1.0, 0.30 * L), (8.0, 8.0, 20.0)), 3.0)                   # vastus lateralis
    f = smin(f, ell(Q, (-5.2, 3.2, 0.80 * L), (5.2, 4.8, 8.0)), 2.5)                   # teardrop
    f = smin(f, ell(Q, (0.5, 5.0, 0.45 * L), (7.0, 6.0, 20.0)), 3.0)                   # rectus femoris
    f = smin(f, ell(Q, (0.0, -5.0, 0.42 * L), (8.0, 7.0, 21.0)), 3.0)                  # hamstrings
    g = np.exp(-((Q[0] - (5.5 - 13.0 * Q[2] / L)) / 1.2) ** 2) * np.exp(-((Q[2] - 0.5 * L) / (0.35 * L)) ** 2)
    return f + 0.45 * g * (Q[1] > 0)                                                    # sartorius groove

def knee(P):
    """Knee: a beveled box between the two cylinders, the kneecap on its front and the ligament below it."""
    Q = SHIN.local(P)
    f = ell(Q, (0.2, 7.2, -1.2), (4.2, 2.3, 4.4))                                       # kneecap
    f = smin(f, cone(Q, (0.2, 6.6, 3.0), (0.2, 5.6, 9.0), 1.7, 1.6), 0.8)               # patellar ligament
    f = smin(f, ell(Q, (0.4, 5.4, 10.5), (2.4, 1.6, 2.0)), 0.8)                         # tibial tuberosity
    for u in (-3.8, 4.0): f = smin(f, ell(Q, (u, 4.8, 3.5), (2.2, 2.0, 3.0)), 0.8)     # fat pads beside the ligament
    return f

def lower_leg(P):
    """Lower leg: a D section, flat shin bone in front, round calf behind; the inner calf head lower than the outer."""
    _, sp = leg_profiles(); f = limb(P, SHIN, sp); Q = SHIN.local(P); L = SHIN.L
    f = smin(f, ell(Q, (-3.4, -4.0, 0.30 * L), (5.8, 6.0, 13.0)), 2.6)                 # inner gastrocnemius
    f = smin(f, ell(Q, (3.6, -3.6, 0.24 * L), (5.2, 5.6, 11.0)), 2.6)                  # outer gastrocnemius
    return f

# foot frame: along (towards the toes), up, lateral (outer +); the foot turns out like the reference's
FOOT_O = np.array([17.0, 254.0, 357.0]); _a = math.radians(22)
FOOT_F = np.array([math.sin(_a), -math.cos(_a), 0.0]); FOOT_L = np.array([math.cos(_a), math.sin(_a), 0.0])
def foot_local(P):
    dx, dy, dz = P[0] - FOOT_O[0], P[1] - FOOT_O[1], P[2] - FOOT_O[2]
    return ((dx * FOOT_F[0] + dy * FOOT_F[1]) / 1.13, -dz, dx * FOOT_L[0] + dy * FOOT_L[1])     # 1.13: the reference's long foot

def ankle(P):
    """Ankle: the inner ankle bone high and forward, the outer one lower and further back, the Achilles tendon."""
    Q = foot_local(P)
    f = ell(Q, (0.6, 12.6, -4.6), (1.9, 2.2, 1.6))                                      # inner malleolus
    f = smin(f, ell(Q, (-1.0, 10.8, 4.4), (1.9, 2.4, 1.6)), 0.8)                        # outer malleolus
    f = smin(f, cone(Q, (-6.6, 6.0, 0.0), (-5.0, 24.0, 0.0), 1.9, 2.4), 1.4)            # Achilles tendon
    return f

def foot(P):
    """Foot: a wedge, high at the instep and low at the toes; heel, outer edge on the ground, inner arch lifted,
    the ball, then five toes stepping down from the big toe."""
    Q = foot_local(P); A, H, Lt = Q
    f = ell(Q, (-3.0, 4.8, 0.0), (5.6, 5.0, 4.8))                                       # heel
    f = smin(f, cone(Q, (-0.5, 12.0, 0.0), (-0.5, 22.0, 0.0), 5.2, 5.6), 3.0)           # ankle column
    f = smin(f, cone(Q, (2.0, 8.2, -0.3), (21.0, 3.0, -0.6), 5.0, 2.8), 3.0)            # instep
    f = smin(f, ell(Q, (12.0, 3.0, 2.8), (12.0, 3.0, 4.0)), 2.5)                        # outer edge
    f = smin(f, ell(Q, (22.0, 2.7, -0.6), (4.6, 2.7, 7.6)), 2.0)                        # ball
    for l, tip, r in ((-4.8, 33.5, 2.05), (-1.3, 32.2, 1.35), (1.6, 30.9, 1.25), (4.2, 29.4, 1.15), (6.4, 27.6, 1.05)):
        base = (24.0 - 0.2 * l * l / 4, 2.2, l * 0.95)
        t = cone(Q, base, (tip, 1.3, l), r * 1.05, r)
        f = smin(f, t, 0.5)
        f = smin(f, ell(Q, (tip - 1.0, 1.05 * r + 0.5, l), (1.0 * r, 0.28, r * 0.7)), 0.15)   # nail
    f = smax(f, -ell(Q, (9.0, -0.6, -6.4), (9.0, 2.6, 3.4)), 1.0)                       # inner arch, lifted
    return smax(f, -H, 0.5)                                                              # flat sole

def briefs_cut(P):
    """Where the briefs cover: waistband to the leg openings."""
    return np.maximum(174.0 - P[2], P[2] - (204.5 - 0.72 * np.abs(P[0])))

# piece: (function, bounding box low/high for the x > 0 copy, paired, blend into the body with k)
PIECES = {
    "head":      (head, (-20, 219, 1), (20, 275, 62), False, 1.0),
    "neck":      (neck, (-40, 226, 34), (40, 268, 84), False, 3.0),
    "trunk":     (trunk, (-42, 212, 52), (42, 288, 198), False, 3.0),
    "deltoid":   (deltoid, (26, 236, 64), (56, 266, 120), True, 4.5),
    "upper_arm": (upper_arm, (30, 236, 64), (62, 264, 146), True, 4.0),
    "elbow":     (elbow, (38, 238, 128), (60, 262, 150), True, 1.6),
    "forearm":   (forearm, (38, 234, 134), (66, 262, 180), True, 2.0),
    "wrist":     (wrist, (48, 240, 164), (62, 256, 180), True, 1.2),
    "hand":      (hand, (40, 230, 168), (66, 262, 212), True, 1.6),
    "thigh":     (thigh, (-2, 218, 178), (40, 270, 270), True, 3.0),
    "knee":      (knee, (6, 230, 244), (30, 260, 276), True, 1.2),
    "lower_leg": (lower_leg, (2, 230, 248), (34, 274, 342), True, 2.5),
    "ankle":     (ankle, (6, 238, 324), (30, 268, 352), True, 1.0),
    "foot":      (foot, (2, 206, 326), (48, 270, 358), True, 2.5),
}

# sheet -> pieces modeled for it, the box to show it in (x > 0 side), the camera (azimuth from the front, degrees,
# + turns towards the figure's x > 0 side; elevation) and its grid step
SHEETS = {
    "head":            (["head", "neck"], (-20, 219, 0), (20, 275, 70), (35, 5), 0.25),
    "ear":             (["head"], (-20, 219, 0), (20, 275, 60), (90, 0), 0.2),
    "eyes-nose-mouth": (["head"], (-20, 219, 0), (20, 275, 56), (20, 0), 0.2),
    "neck-shoulders":  (["head", "neck", "trunk", "deltoid", "upper_arm"], (-56, 214, 0), (56, 290, 100), (25, 5), 0.4),
    "torso-front":     (["neck", "trunk", "deltoid", "upper_arm"], (-56, 212, 50), (56, 290, 196), (20, 0), 0.45),
    "torso-back":      (["neck", "trunk", "deltoid", "upper_arm"], (-56, 212, 50), (56, 290, 196), (160, 0), 0.45),
    "shoulder":        (["deltoid", "upper_arm", "neck", "trunk"], (12, 220, 56), (60, 284, 126), (60, 5), 0.3),
    "upper-arm":       (["deltoid", "upper_arm", "elbow", "forearm"], (26, 232, 60), (66, 268, 150), (70, 0), 0.3),
    "elbow":           (["upper_arm", "elbow", "forearm"], (34, 232, 112), (64, 268, 166), (140, 0), 0.25),
    "forearm":         (["elbow", "forearm", "wrist", "hand"], (34, 228, 128), (66, 266, 212), (70, 0), 0.3),
    "wrist":           (["forearm", "wrist", "hand"], (40, 228, 150), (66, 262, 200), (60, 0), 0.22),
    "hand-back":       (["hand"], (40, 228, 168), (66, 264, 212), (90, 0, 180), 0.2),
    "hand-palm":       (["hand"], (40, 228, 168), (66, 264, 212), (-90, 0, 180), 0.2),
    "finger":          (["hand:finger"], (44, 232, 188), (62, 256, 212), (90, 0, 180), 0.12),
    "thumb":           (["hand:thumb"], (44, 228, 170), (66, 256, 200), (30, 0, 180), 0.15),
    "hips":            (["trunk", "thigh"], (-42, 212, 150), (42, 288, 236), (30, 0), 0.4),
    "thigh":           (["thigh", "knee", "lower_leg"], (-2, 214, 180), (40, 272, 290), (35, 0), 0.35),
    "knee":            (["thigh", "knee", "lower_leg"], (2, 222, 226), (36, 272, 292), (30, 0), 0.25),
    "lower-leg":       (["knee", "lower_leg", "ankle", "foot"], (0, 214, 244), (46, 276, 358), (35, 0), 0.3),
    "ankle":           (["lower_leg", "ankle", "foot"], (2, 212, 300), (46, 274, 358), (60, 0), 0.25),
    "foot":            (["foot", "ankle", "lower_leg"], (0, 208, 318), (48, 272, 358), (55, 10), 0.22),
}

def evaluate(names, lo, hi, step, both_sides=True, init=40.0):
    ax = [np.arange(l, h, step, dtype=f32) for l, h in zip(lo, hi)]
    F = np.full([len(a) for a in ax], init, f32)
    for name in names:
        name, _, only = name.partition(":")
        fn, plo, phi, paired, k = PIECES[name]
        for s in ((1, -1) if paired and both_sides else (1,)):
            blo = (min(s * plo[0], s * phi[0]), plo[1], plo[2]); bhi = (max(s * plo[0], s * phi[0]), phi[1], phi[2])
            idx = tuple(slice(np.searchsorted(a, max(l, a[0])), np.searchsorted(a, min(h, a[-1] + step)))
                        for a, l, h in zip(ax, blo, bhi))
            if any(i.stop - i.start < 2 for i in idx): continue
            X, Y, Z = np.meshgrid(*[a[i] for a, i in zip(ax, idx)], indexing="ij")
            P = (s * X, Y, Z)
            v = (fn(P, only=only) if only else fn(P)).astype(f32)
            F[idx] = smin(F[idx], v, k)
        print("  ", name, flush=True)
    return F, ax

def mesh(F, ax, step):
    v, fc, _, _ = marching_cubes(F, 0.0, spacing=(step, step, step))
    return (v + [ax[0][0], ax[1][0], ax[2][0]]).astype(f32), fc[:, ::-1]

def solo(sheets):
    os.makedirs(OUT, exist_ok=True)
    for sh in sheets:
        names, lo, hi, cam, step = SHEETS[sh]; print(sh, flush=True)
        F, ax = evaluate(names, lo, hi, step, both_sides=lo[0] < 0)
        if sh == "hips":
            X, Y, Z = np.meshgrid(*ax, indexing="ij"); B = np.maximum(F - 0.9, briefs_cut((X, Y, Z)))
            vb, fb = mesh(B, ax, step)
        else:
            vb, fb = np.zeros((0, 3), f32), np.zeros((0, 3), int)
        if sh == "foot" or sh == "ankle" or sh == "lower-leg":
            X, Y, Z = np.meshgrid(*ax, indexing="ij"); F = smax(F, Z - 357.0, 0.4)
        F[..., 0] = F[..., -1] = 1; F[0] = F[-1] = 1; F[:, 0] = F[:, -1] = 1          # close the cut edges
        vs, fs = mesh(F, ax, step)
        np.savez_compressed(os.path.join(OUT, sh + ".npz"), vs=vs, fs=fs, vb=vb, fb=fb, cam=np.asarray(cam, float))

def body():
    names = [n for n in PIECES if n != "head"]
    step = 0.45; lo, hi = (-64, 208, 30), (64, 290, 360)
    F, ax = evaluate(names, lo, hi, step)
    X, Y, Z = np.meshgrid(*ax, indexing="ij")
    H, hax = evaluate(["head"], (-20, 219, 30), (20, 275, 62), step)
    i0 = np.searchsorted(ax[0], hax[0][0]); j0 = np.searchsorted(ax[1], hax[1][0])
    sl = (slice(i0, i0 + H.shape[0]), slice(j0, j0 + H.shape[1]), slice(0, H.shape[2]))
    F[sl] = smin(F[sl], H, 1.0)                                                         # head into the neck seam
    F = smax(F, Z - 357.0, 0.5)
    B = np.maximum(F - 0.9, briefs_cut((X, Y, Z)))
    vs, fs = mesh(smax(F, 51.5 - Z, 0.5), ax, step); vb, fb = mesh(B, ax, step)
    np.savez_compressed(os.path.join(HERE, "base-man-r3.npz"), vs=vs, fs=fs, vb=vb, fb=fb)
    hs = 0.25; H, hax = evaluate(["head", "neck"], (-20, 219, 1), (20, 275, 62), hs)
    Zh = np.meshgrid(*hax, indexing="ij")[2]
    H = smax(H + 0.5 * np.clip((Zh - 52.5) / 3.0, 0, 1), Zh - 60.0, 0.5)              # tucks inside the body below the jaw
    hv, hf = mesh(H, hax, hs)
    np.savez_compressed(os.path.join(HERE, "base-man-r3-head.npz"), vs=hv, fs=hf)
    print(len(vs), len(hv))

if __name__ == "__main__":
    if sys.argv[1] == "solo": solo(sys.argv[2:] or list(SHEETS))
    else: body()
