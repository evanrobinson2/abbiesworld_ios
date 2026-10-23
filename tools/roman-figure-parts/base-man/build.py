"""Base man for AW-STUDY-0020, built part by part from Evan's front / side / back reference (concept.png).

Each part is lofted from the reference silhouettes: widths from the front view, depths from the side view,
so the front and side outlines match the picture. Parts: head, nose, ears, neck, torso, arms, hands
(palm, four fingers, thumb), legs, feet, briefs. Z up, metres, front faces -Y, origin between the feet.

python build.py  ->  base-man.glb and r/ (front, side, back renders and the compare sheet)
"""
import json, math, os, sys
import numpy as np
from PIL import Image
from scipy.ndimage import binary_fill_holes, uniform_filter1d

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "concept.png")
P = dict(height=1.80, top=4, ground=357, cx_front=103.5, cx_side=248.0, cx_back=375.5)
S = P["height"] / (P["ground"] - P["top"])          # metres per reference pixel

M = binary_fill_holes(np.asarray(Image.open(REF).convert("L")) < 235)

def X(px): return (px - P["cx_front"]) * S
def Y(px): return (px - P["cx_side"]) * S
def Z(py): return (P["ground"] - py) * S

def run_at(y, x, x0, x1):
    """The silhouette run on row y that contains column x (searching x0..x1); (left, right) or None."""
    row = M[int(y)]
    if not row[int(x)]:
        return None
    l = int(x)
    while l > x0 and row[l - 1]: l -= 1
    r = int(x)
    while r < x1 and row[r + 1]: r += 1
    return l, r

def runs(y, x0, x1):
    row = M[int(y)]; out = []; on = False
    for x in range(x0, x1 + 1):
        if row[x] and not on: s = x; on = True
        if not row[x] and on: out.append((s, x - 1)); on = False
    if on: out.append((s, x1))
    return out

def sm(a, k=9):
    return uniform_filter1d(np.asarray(a, float), k, mode="nearest")

# ---------------------------------------------------------------- loft
def ring(cx, cy, cz, a, rf, rb, n=24, p=2.0, front_pinch=0.0):
    """Horizontal ring: half-width a, front radius rf (towards -Y), back radius rb; superellipse exponent p."""
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        c, s = math.cos(t), math.sin(t)
        cc = math.copysign(abs(c) ** (2 / p), c)
        ss = math.copysign(abs(s) ** (2 / p), s)
        r = rf if s < 0 else rb
        x = a * cc * (1 - front_pinch * max(0.0, -s))
        pts.append((cx + x, cy + r * ss, cz))
    return pts

def loft(rings, cap0=True, cap1=True):
    n = len(rings[0]); V = [v for r in rings for v in r]; F = []
    for k in range(len(rings) - 1):
        for i in range(n):
            a, b = k * n + i, k * n + (i + 1) % n
            F.append((a, b, b + n, a + n))
    if cap0:
        c = len(V); V.append(tuple(np.mean(rings[0], 0)))
        F += [(c, (i + 1) % n, i) for i in range(n)]
    if cap1:
        c = len(V); V.append(tuple(np.mean(rings[-1], 0))); o = (len(rings) - 1) * n
        F += [(c, o + i, o + (i + 1) % n) for i in range(n)]
    return V, F

def mirror(part):
    V, F = part
    return [(-x, y, z) for x, y, z in V], [tuple(reversed(f)) for f in F]

def tube(path, radii, n=10):
    """A round tube along a 3D polyline (fingers, thumb)."""
    path = np.asarray(path, float); rings = []
    for i, (p, r) in enumerate(zip(path, radii)):
        d = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]; d /= np.linalg.norm(d)
        u = np.cross(d, [1, 0, 0]);
        if np.linalg.norm(u) < 1e-3: u = np.cross(d, [0, 1, 0])
        u /= np.linalg.norm(u); v = np.cross(d, u)
        rings.append([tuple(p + r * (math.cos(t) * u + math.sin(t) * v)) for t in np.linspace(0, 2 * math.pi, n, endpoint=False)])
    return loft(rings)

PARTS = {}

# ---------------------------------------------------------------- head (shell without nose and ears)
ys = list(range(5, 52)); hw, hf, hb = [], [], []
for y in ys:
    l, r = run_at(y, 103, 40, 170)
    w = (r - l + 1) / 2
    if 26 <= y <= 39: w = min(w, 15.2)                    # ears are their own part
    fl, fr = run_at(y, 248, 205, 285)
    if 28 <= y <= 37: fl = max(fl, 226)                    # the nose is its own part
    hw.append(w); hf.append(fl); hb.append(fr)
hw, hf, hb = sm(hw, 5), sm(hf, 5), sm(hb, 5)
mid = (hf + hb) / 2
i0 = ys.index(17); W0, F0, B0 = hw[i0], hf[i0], hb[i0]; M0 = (F0 + B0) / 2
for i, y in enumerate(ys):
    if y < 17:
        k = math.sqrt(max(0.0, 1 - ((17 - y) / 13.2) ** 2))
        hw[i] = W0 * k; hf[i] = M0 - (M0 - F0) * k; hb[i] = M0 + (B0 - M0) * k; mid[i] = M0
rings = []
for y, w, f, b, m in zip(ys, hw, hf, hb, mid):
    rings.append(ring(0, Y(m), Z(y), w * S, (m - f) * S, (b - m) * S, n=32, p=2.0, front_pinch=0.22))
# round the crown
w0, f0, b0, m0 = hw[0], hf[0], hb[0], mid[0]
dome = [ring(0, Y(m0), Z(3.85), 0.3 * S, 0.3 * S, 0.3 * S, n=32)]
PARTS["Head"] = loft(dome + rings)

# nose: a wedge on the face, bridge between the eyes to the tip and nostrils
face = lambda y: Y(226.0)
nose = []
for y, out, half in [(26.5, 0.0, 1.2), (29, 0.8, 1.4), (31, 1.6, 1.8), (33, 2.6, 2.4), (35, 3.2, 3.0), (36.4, 2.2, 3.1), (37.2, 0.4, 2.6)]:
    nose.append([(0, face(y) - out * S, Z(y)), (half * S, face(y) + 1.6 * S, Z(y)), (0, face(y) + 2.4 * S, Z(y)), (-half * S, face(y) + 1.6 * S, Z(y))])
PARTS["Nose"] = loft(nose)

# brow ridge and chin give the facial outline its planes
brow = [ring(0, Y(227.2), Z(y), 11.5 * S, 1.2 * S, 1.0 * S, n=16, p=2.2) for y in (24.5, 25.5, 26.5)]

chin = [ring(0, Y(228.4), Z(y), w * S, 1.3 * S, 2.0 * S, n=16) for y, w in ((44, 4.5), (46, 5.5), (48, 5.0), (49.5, 3.5))]


# ears
ear = []
for y, h in [(26.5, 0.8), (27.5, 2.2), (29.5, 3.0), (32, 3.1), (34.5, 2.6), (36.8, 1.8), (38.6, 0.8)]:
    ear.append(ring(X(103.5 + 14.6 + 0.9), Y(248.5), Z(y), 1.0 * S, h * S, h * 0.85 * S, n=14))
PARTS["EarL"] = loft(ear); PARTS["EarR"] = mirror(PARTS["EarL"])

# ---------------------------------------------------------------- neck
neck = []
for y in range(42, 70, 2):
    l, r = 92, 115
    f, b = 237 + max(0, 44 - y) * 0.0, 263 + max(0, y - 58) * 0.8
    if y < 52: f = 235
    neck.append(ring(0, Y((f + b) / 2 - 0.5), Z(y), np.interp(y, [42, 58, 68], [11.5, 12.0, 15.0]) * S,
                     ((b - f) / 2 + 0.8) * S, ((b - f) / 2 + 0.8) * S, n=24))
PARTS["Neck"] = loft(neck)

# ---------------------------------------------------------------- torso
ys = list(range(60, 189, 2)); tw, tc, tf, tb = [], [], [], []
for y in ys:
    rr = run_at(y, 103, 40, 170)
    if y < 112:                                            # arms merge with the torso up here
        off = np.interp(y, [60, 66, 72, 80, 90, 104, 112], [0, 5, 13, 16, 17, 21, 24])
        l, r = rr[0] + off, rr[1] - off
        if y < 76:                                         # trapezius: slope from the neck to the acromion
            h = np.interp(y, [58, 62, 66, 70, 76], [12, 16, 22, 28, 32]); l, r = 103.5 - h, 103.5 + h
    else:
        l, r = rr
    f, b = run_at(y, 250, 205, 285)
    tw.append((r - l + 1) / 2); tf.append(f); tb.append(b)
tw, tf, tb = sm(tw, 13), sm(tf, 13), sm(tb, 13)
rings = [ring(0, Y((f + b) / 2), Z(y), w * S, (b - f) / 2 * S * (0.8 if y < 68 else 1.0), (b - f) / 2 * S * (0.8 if y < 68 else 1.0), n=36, p=2.15)
         for y, w, f, b in zip(ys, tw, tf, tb)]
PARTS["Torso"] = loft(rings)

# ---------------------------------------------------------------- arm (left of the picture = figure's right), then mirror
ys = list(range(72, 177, 2)); aw, ac = [], []
for y in ys:
    if y < 112:
        l = run_at(y, 103, 40, 170)[0]
        w = np.interp(y, [72, 78, 86, 96, 112], [9, 15, 18.5, 19.5, 18.5])
        aw.append(w / 2); ac.append(l + w / 2)
    else:
        l, r = runs(y, 40, 72)[0]
        aw.append((r - l + 1) / 2); ac.append((l + r) / 2)
aw, ac = sm(aw), sm(ac)
dr = lambda y: np.interp(y, [66, 112, 140, 160, 176], [1.0, 1.0, 1.0, 1.04, 1.12])   # depth / width
yc = lambda y: np.interp(y, [66, 176], [250.0, 246.0])
rings = [ring(X(c), Y(yc(y)), Z(y), w * S, w * dr(y) * S, w * dr(y) * S, n=20, p=2.0)
         for y, w, c in zip(ys, aw, ac)]
cap = ring(X(ac[0] + 1.5), Y(250), Z(69.0), 2.5 * S, 2.5 * S, 2.5 * S, n=20)
PARTS["ArmR"] = loft([cap] + rings); PARTS["ArmL"] = mirror(PARTS["ArmR"])

# ---------------------------------------------------------------- hand: palm, four fingers, thumb (palm faces the thigh)
hx = X(51.0); hy = Y(246.0)
palm = []
for y, t, d in [(174, 3.0, 5.0), (178, 3.4, 7.0), (184, 3.6, 8.4), (189, 3.4, 8.6), (192, 3.0, 8.2)]:
    palm.append(ring(hx, hy, Z(y), t * S, d * S, d * S, n=16, p=2.6))
PARTS["PalmR"] = loft(palm)
HAND_TURN = math.radians(40)
fingers = []
for k, (dy, L) in enumerate([(-6.0, 13.0), (-2.0, 14.5), (2.0, 13.5), (5.8, 10.5)]):  # index .. little, front to back
    y0 = 191.5; path, radii = [], []
    for j in range(6):
        u = j / 5; curl = 1.8 * u * u
        path.append((hx + 0.6 * S, hy + (dy * S) - curl * S * 0.6, Z(y0 + u * L) + curl * S * 0.3))
        radii.append((1.55 - 0.45 * u) * S)
    fingers.append(tube(path, radii))
thumb_path = [(hx + 1.0 * S, hy - 6.5 * S, Z(180)), (hx + 1.6 * S, hy - 9.0 * S, Z(184)),
              (hx + 1.8 * S, hy - 10.0 * S, Z(188)), (hx + 1.7 * S, hy - 10.4 * S, Z(191.5))]
fingers.append(tube(thumb_path, [2.0 * S, 1.8 * S, 1.6 * S, 1.3 * S]))
def turn(part, ang, cx, cy):
    V, F = part; c, s_ = math.cos(ang), math.sin(ang)
    return [(cx + (x - cx) * c - (y - cy) * s_, cy + (x - cx) * s_ + (y - cy) * c, z) for x, y, z in V], F
PARTS["PalmR"] = turn(PARTS["PalmR"], HAND_TURN, hx, hy)
fingers = [turn(f, HAND_TURN, hx, hy) for f in fingers]
for k, f in enumerate(fingers):
    name = ["IndexR", "MiddleR", "RingR", "LittleR", "ThumbR"][k]
    PARTS[name] = f; PARTS[name[:-1] + "L"] = mirror(f)
PARTS["PalmL"] = mirror(PARTS["PalmR"])

# ---------------------------------------------------------------- leg (left of picture), mirrored
ys = list(range(184, 345, 2)); lw, lc, lf, lb = [], [], [], []
for y in ys:
    rs = [q for q in runs(y, 60, 103) if q[1] - q[0] > 6]
    if y < 190 or not rs:
        l, r = 72, 102.5
    else:
        l, r = rs[0]; r = min(r, 102.5)
    f, b = run_at(y, 245, 205, 285) or (225, 259)
    if y < 204: f, b = 225, 259
    if y > 322:                                          # below the ankle the silhouette is the foot
        l, r = 81.5, 94.5; f, b = 246, 260
    lw.append((r - l + 1) / 2); lc.append((l + r) / 2); lf.append(f); lb.append(b)
lw, lc, lf, lb = sm(lw), sm(lc), sm(lf), sm(lb)
rings = [ring(X(c), Y((f + b) / 2), Z(y), w * S, (b - f) / 2 * S, (b - f) / 2 * S, n=28, p=2.0)
         for y, w, c, f, b in zip(ys, lw, lc, lf, lb)]
PARTS["LegR"] = loft(rings); PARTS["LegL"] = mirror(PARTS["LegR"])

# ---------------------------------------------------------------- foot: lofted heel to toe along -Y
cols = list(range(262, 216, -2)); rings = []
for xs in cols:  # heel at 262, toes at 217 in the side view
    u = (262 - xs) / 45
    h = np.interp(u, [0, 0.08, 0.25, 0.45, 0.7, 0.85, 1.0], [5, 9, 13, 9, 5, 3.6, 2.4])
    half = np.interp(u, [0, 0.15, 0.55, 0.8, 1.0], [5.5, 6.5, 9.5, 10.5, 7.0])
    cx = np.interp(u, [0, 1], [87.0, 77.0])
    pts = []
    for i in range(20):
        t = math.pi * i / 19
        pts.append((X(cx) + half * S * math.cos(t), Y(xs), Z(356.5) + h * S * math.sin(t) ** 0.6))
    rings.append(pts)
PARTS["FootR"] = loft(rings); PARTS["FootL"] = mirror(PARTS["FootR"])

# ---------------------------------------------------------------- briefs: a cloth layer over the hips
ys = [176, 180, 184, 188]; rings = []
for y in ys:
    i = int((y - 60) / 2); w, f, b = tw[min(i, len(tw) - 1)], tf[min(i, len(tf) - 1)], tb[min(i, len(tb) - 1)]
    rings.append(ring(0, Y((f + b) / 2), Z(y), w * S * 1.035, (b - f) / 2 * S * 1.05, (b - f) / 2 * S * 1.04, n=36, p=2.35))
PARTS["Briefs"] = loft(rings)
cuff = []
for y in (186, 192, 198):
    i = int((y - 184) / 2); w, c, f, b = lw[i], lc[i], lf[i], lb[i]
    cuff.append(ring(X(c), Y((f + b) / 2), Z(y), w * S * 1.045, (b - f) / 2 * S * 1.05, (b - f) / 2 * S * 1.05, n=28))
PARTS["BriefsCuffR"] = loft(cuff); PARTS["BriefsCuffL"] = mirror(PARTS["BriefsCuffR"])

if __name__ == "__main__":
    json.dump({k: [v[0], v[1]] for k, v in PARTS.items()}, open(os.path.join(HERE, "r", "parts.json") if os.path.isdir(os.path.join(HERE, "r")) else os.devnull, "w"))
