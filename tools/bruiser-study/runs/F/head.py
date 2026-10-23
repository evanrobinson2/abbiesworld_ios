"""Arm E, chunk 'head': blocky bald skull, heavy brow shelf, wedge nose, square jaw and chin, stern mouth, ears,
and a short thick neck that sits forward and runs out into the trapezius slopes.

Builds onto runs/E/chest.py, whose torso ends open at the neck base (z 1.82: cx 0.012, half-width 0.110,
y -0.035 .. 0.125; z 1.79: half-width 0.150, back 0.160). The neck loft starts inside the chest at z 1.74 and
widens at the back into the traps, so it meets the chest's neckline and trapezius without a gap.
Front widths and heights from the front picture (ref/mask.png rows 56..164: head x -0.066 .. 0.077, crown z 2.0,
brow z 1.915, nose tip z 1.87, mouth z 1.845, chin bottom z 1.765). Depths from the side turnaround
(side col c -> y = (c - 498) / 467, row r -> z = 2 - (r - 53) / 467): brow and nose front y -0.122, chin -0.118,
skull back +0.054 (z 1.90 .. 1.96), ear at y ~ -0.01, neck front -0.075, trapezius back line from (y 0.047, z 1.89)
to (y 0.154, z 1.79). The face is yawed a few degrees toward his right, as in the picture.
"""
import math

import numpy as np

P = 3.0      # boxy skull section
N = 12
YAW = math.radians(-7)   # face turned slightly toward his right (image left)
PIV = (0.005, -0.01)     # yaw pivot (x, y), roughly the neck axis

# skull loft: z, cx, rx (half width), yf (front, negative), yb (back)  bottom (chin) to crown
SKULL = [
    (1.765, 0.000, 0.036, -0.112, -0.080),   # chin underside
    (1.785, 0.002, 0.052, -0.119, -0.050),   # chin block
    (1.815, 0.004, 0.063, -0.117, -0.020),   # jaw, square
    (1.845, 0.005, 0.068, -0.110, 0.008),    # mouth line
    (1.870, 0.005, 0.069, -0.106, 0.030),    # cheekbones (nose sits on this)
    (1.895, 0.005, 0.068, -0.103, 0.050),    # eye sockets, under the brow shelf
    (1.915, 0.005, 0.071, -0.107, 0.054),    # brow line (shelf added separately)
    (1.945, 0.005, 0.073, -0.110, 0.055),    # forehead, flat
    (1.968, 0.005, 0.066, -0.104, 0.050),
    (1.988, 0.005, 0.050, -0.090, 0.036),    # crown bevel
    (2.000, 0.005, 0.030, -0.068, 0.012),    # crown top plane
]

# neck + trapezius: z, x right edge (image left, negative), x left edge, front y, front half-width, back y
NECK = [
    (1.740, -0.190, 0.250, -0.070, 0.075, 0.165),
    (1.790, -0.135, 0.190, -0.076, 0.072, 0.150),
    (1.815, -0.092, 0.150, -0.062, 0.064, 0.118),
    (1.840, -0.072, 0.110, -0.046, 0.060, 0.094),
    (1.865, -0.062, 0.078, -0.032, 0.056, 0.072),
    (1.890, -0.055, 0.064, -0.020, 0.050, 0.048),
    (1.915, -0.048, 0.056, -0.010, 0.045, 0.030),
]


def yaw(pts):
    pts = np.array(pts, float)
    c, s = math.cos(YAW), math.sin(YAW)
    x, y = pts[:, 0] - PIV[0], pts[:, 1] - PIV[1]
    pts[:, 0] = PIV[0] + c * x - s * y
    pts[:, 1] = PIV[1] + s * x + c * y
    return pts


def se(cx, rx, yf, yb, z, n=N, p=P):
    a = np.linspace(0, math.tau, n, endpoint=False) + math.pi / n
    c, s = np.cos(a), np.sin(a)
    ym = 0.5 * (yf + yb)
    x = cx + rx * np.sign(c) * np.abs(c) ** (2 / p)
    y = ym + np.where(s < 0, (yf - ym), (yb - ym)) * np.abs(s) ** (2 / p)
    return np.c_[x, y, np.full(n, z)]


def neck_ring(z, xr, xl, yf, fw, yb):
    """A trapezoid-ish 10-gon: narrow flat throat in front, wide trapezius behind (CCW seen from above)."""
    cx = 0.5 * (xr + xl)
    pts = [
        (xl, 0.035), (xl - 0.25 * (xl - cx), yb), (cx, yb + 0.012), (xr + 0.25 * (cx - xr), yb), (xr, 0.035),
        (cx - fw - 0.35 * (cx - fw - xr), yf * 0.55), (cx - fw, yf), (cx, yf - 0.004), (cx + fw, yf),
        (cx + fw + 0.35 * (xl - cx - fw), yf * 0.55),
    ]
    # order CCW from +x: start at left edge (xl), go round the back, the right edge, then the front
    return np.array([(x, y, z) for x, y in pts])


def build(k):
    # neck and traps (not yawed: it grows out of the chest)
    k.loft('neck', [neck_ring(*r) for r in NECK], k.SKIN, cap_start=False, cap_end=True)

    # skull, jaw and chin as one faceted block
    rings = [yaw(se(cx, rx, yf, yb, z)) for z, cx, rx, yf, yb in SKULL]
    k.loft('skull', rings, k.SKIN, cap_start=True, cap_end=True)

    # brow: one heavy shelf across the forehead, deepest over the nose, with a frown notch
    xs = [-0.062, -0.040, -0.012, 0.0, 0.012, 0.040, 0.062]
    proud = [-0.096, -0.116, -0.124, -0.122, -0.124, -0.116, -0.096]   # front edge y, receding at the temples
    zt, zb = 1.928, 1.900
    v, f = [], []
    for x, yfront in zip(xs, proud):
        dz = 0.008 * (abs(x) / 0.062) ** 2   # the shelf droops toward the temples
        v += [(x, -0.095, zt + 0.006 - dz), (x, yfront, zt - dz), (x, yfront + 0.006, zb - dz), (x, -0.088, zb - 0.004 - dz)]
    for i in range(len(xs) - 1):
        a, b = 4 * i, 4 * (i + 1)
        for j in range(3):
            f.append((a + j, b + j, b + j + 1, a + j + 1))
    f.append((0, 1, 2, 3)); n = 4 * (len(xs) - 1); f.append((n + 3, n + 2, n + 1, n))
    k.mesh('brow', yaw(v), f, k.SKIN)

    # nose: a wedge from the bridge under the brow to a blunt tip, flat underside with nostril wings
    nv = [
        (0.0, -0.112, 1.904),                  # 0 bridge
        (-0.009, -0.108, 1.900), (0.009, -0.108, 1.900),   # 1, 2 bridge sides
        (-0.010, -0.124, 1.872), (0.010, -0.124, 1.872),   # 3, 4 tip corners
        (-0.020, -0.106, 1.864), (0.020, -0.106, 1.864),   # 5, 6 wings
        (-0.008, -0.118, 1.862), (0.008, -0.118, 1.862),   # 7, 8 underside front
    ]
    nf = [(0, 1, 3, 4, 2), (1, 5, 7, 3), (2, 4, 8, 6), (3, 7, 8, 4), (5, 6, 8, 7), (0, 2, 6, 5, 1)]
    k.mesh('nose', yaw(nv), nf, k.SKIN)

    # stern mouth: a flat downturned upper-lip ridge over a shallow lower-lip plane
    lip = [(-0.034, -0.106, 1.838), (-0.018, -0.111, 1.846), (0.0, -0.1125, 1.847), (0.018, -0.111, 1.846),
           (0.034, -0.106, 1.838)]
    k.tube('mouth_upper_lip', yaw(lip), 0.0045, 4, k.SKIN)
    lo = k.box('mouth_lower_lip', (0.040, 0.008, 0.010), tuple(yaw([(0.0, -0.110, 1.828)])[0]), k.SKIN)
    lo.rotation_euler[2] = YAW
    k.place(k.mesh('chin_plane', yaw([(-0.040, -0.116, 1.818), (0.040, -0.116, 1.818),
                                       (0.034, -0.121, 1.788), (-0.034, -0.121, 1.788),
                                       (-0.040, -0.100, 1.818), (0.040, -0.100, 1.818),
                                       (0.034, -0.100, 1.788), (-0.034, -0.100, 1.788)]),
                    [(0, 1, 2, 3), (4, 7, 6, 5), (0, 3, 7, 4), (1, 5, 6, 2), (0, 4, 5, 1), (3, 2, 6, 7)], k.SKIN))

    # cheek / nasolabial planes: two slim wedges from the nose wings down past the mouth corners
    for side, name in ((-1, 'cheek_fold_R'), (1, 'cheek_fold_L')):
        pts = [(side * 0.024, -0.106, 1.866), (side * 0.036, -0.107, 1.846), (side * 0.042, -0.104, 1.826)]
        k.tube(name, yaw(pts), 0.004, 4, k.SKIN)

    # ears: small faceted plates on the sides, rim forward, between brow and nose height
    for side, name in ((-1, 'ear_R'), (1, 'ear_L')):
        x0 = 0.005 + side * 0.068
        x1 = x0 + side * 0.016
        ov = [(x0, -0.022, 1.925), (x0, 0.010, 1.928), (x0, 0.012, 1.880), (x0, -0.012, 1.870),
              (x1, -0.020, 1.920), (x1, 0.008, 1.925), (x1, 0.006, 1.884), (x1, -0.010, 1.876)]
        of = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        if side > 0:
            of = [tuple(reversed(q)) for q in of]
        k.mesh(name, yaw(ov), of, k.SKIN)
