"""Arm F (refined from arm E), chunk 'hips': tank-top hem band, pelvis under plain shorts, two leg openings.

Builds onto runs/F/chest.py: its torso ends open at z 1.10 (cx 0, half-width 0.222, y -0.150 .. 0.130, section
exponent 2.1, 16 sides, a vertex on the front centre line); the shorts' pelvis loft starts boxier below (P 2.6, the
seat) and eases into that exact ring (plus a hidden overlap upward), and the hem band wraps the seam. Depths are E's
(side turnaround, side col c -> y = (c - 498) / 467: shorts front ~ -0.14, buttocks back ~ +0.175), checked against
the MPFB sections (pelvis y -0.10 .. 0.15, crotch near z 0.92). Widths and heights from the front picture (k.px):
waist cols 412..615 at row 470, hips cols 402..625 at row 520, the crotch at row 557.
Arm F sharpens the front: the hem is a thin band (rows 450..467 at the sides, dipping to row 490 at the front
centre) that sits barely proud of the shirt with a soft rolled lower edge, instead of E's belt-like lip; the leg
openings are measured edge by edge (his right: cols 400..517, hem slanting from row 617 outside to 627 inside; his
left: cols 530..632, rows 620..632), so the inner thighs of the shorts meet at the plain inner seam the way the
picture's do. Plain flat front, no bulge: the crotch is only the flat underside between the leg tubes.
"""
import math

import numpy as np

N = 16

# z, cx, rx, yf, yb, P (bottom to top); the 1.10 / 1.135 rows equal the chest torso's section there
PELVIS = [
    (0.922, 0.004, 0.040, -0.118, 0.110, 2.6),   # crotch: front stays flat to the inner seam's V
    (0.955, -0.003, 0.243, -0.135, 0.165, 2.6),
    (1.010, -0.004, 0.241, -0.143, 0.178, 2.5),
    (1.060, -0.003, 0.229, -0.148, 0.160, 2.3),
    (1.100, 0.000, 0.222, -0.150, 0.130, 2.1),
    (1.135, 0.000, 0.209, -0.147, 0.127, 2.1),   # hidden overlap, tucked just inside the chest (no z-fighting)
]
# the surface the hem band wraps: the pelvis, then the chest torso above it
SURF = PELVIS[:-1] + [(1.135, 0.000, 0.217, -0.155, 0.135, 2.1), (1.17, 0.000, 0.212, -0.160, 0.140, 2.1)]

# shorts legs: z (centre of the ring), x outer edge, x inner edge, yf, yb (bottom to top)
LEG_R = [
    (0.781, -0.252, 0.000, -0.122, 0.118),
    (0.850, -0.253, 0.002, -0.127, 0.135),
    (0.930, -0.249, 0.004, -0.119, 0.158),
    (1.000, -0.240, 0.000, -0.124, 0.150),
    (1.040, -0.215, -0.020, -0.105, 0.125),   # sunk inside the pelvis: no box edge at the hip
]
LEG_L = [
    (0.773, 0.249, 0.028, -0.122, 0.118),
    (0.850, 0.248, 0.014, -0.127, 0.135),
    (0.930, 0.243, 0.006, -0.119, 0.158),
    (1.000, 0.232, 0.004, -0.124, 0.150),
    (1.040, 0.208, 0.024, -0.105, 0.125),
]
# hem slant (dz per metre of x) on the opening ring: his right's outside is higher, his left's outside too
SLANT = {'R': -0.072, 'L': 0.12}


def se(cx, rx, yf, yb, z, n=N, p=2.6, rot=0.0):
    a = np.linspace(0, math.tau, n, endpoint=False) + rot
    c, s = np.cos(a), np.sin(a)
    x = cx + rx * np.sign(c) * np.abs(c) ** (2 / p)
    y = np.where(s < 0, yf * np.abs(s) ** (2 / p), yb * np.abs(s) ** (2 / p))
    zz = z if np.ndim(z) else np.full(n, z)
    return np.c_[x, y, zz]


def leg_ring(z, xo, xi, yf, yb, slant=0.0, n=8, p=2.4):
    """An octagon leg section with its own outer and inner reach: a flat front plane and flat side planes, turned
    half a step so the faces (not vertices) sit on the extremes; the reach is scaled out to compensate."""
    f = math.cos(math.pi / n) ** (2 / p)
    cx = (xo + xi) / 2
    rx = abs(xo - xi) / 2 / f
    r = se(cx, rx, yf / f, yb / f, z, n=n, p=p, rot=math.pi / n)
    r[:, 2] += slant * (r[:, 0] - cx)
    return r


def sect(z):
    zs = [r[0] for r in SURF]
    z = min(max(z, zs[0]), zs[-1])
    return [float(np.interp(z, zs, [r[i] for r in SURF])) for i in range(1, 6)]


def band_ring(zfun, grow, n=24):
    """A ring around the waist, `grow` off the surface, whose height varies with angle (lower at the front centre)."""
    a = np.linspace(0, math.tau, n, endpoint=False)
    pts = []
    for ang in a:
        c, s = math.cos(ang), math.sin(ang)
        front = max(0.0, -s) ** 1.6
        z = zfun(front)
        cx, rx, yf, yb, p = sect(z)
        x = cx + (rx + grow) * math.copysign(abs(c) ** (2 / p), c)
        y = (yf - grow) * abs(s) ** (2 / p) if s < 0 else (yb + grow) * abs(s) ** (2 / p)
        pts.append((x, y, z))
    return np.array(pts)


def build(k):
    # pelvis under the shorts, capped below (the flat crotch between the leg openings)
    rings = [se(cx, rx, yf, yb, z, p=p) for z, cx, rx, yf, yb, p in PELVIS]
    # the seat's lower edge rises toward the hips, so the legs' fronts meet the pelvis in the picture's soft V that
    # runs down to the crotch, not a level brief-like line
    r = rings[1]
    r[:, 2] += 0.055 * (np.abs(r[:, 0] - PELVIS[1][1]) / PELVIS[1][2]) ** 1.6
    k.loft('shorts_pelvis', rings, k.SHORTS, cap_start=True, cap_end=False)

    # leg openings: 8-sided tubes measured edge by edge, the hem ring slanted like the picture's, a turned-in edge
    for side, table in (('R', LEG_R), ('L', LEG_L)):
        rr = []
        for i, (z, xo, xi, yf, yb) in enumerate(table):
            rr.append(leg_ring(z, xo, xi, yf, yb, slant=SLANT[side] * (1.0 if i == 0 else 0.4 if i == 1 else 0.0)))
        hem = rr[0]
        c = hem.mean(axis=0)
        inner = c + (hem - c) * np.array([0.9, 0.9, 1.0])
        inner[:, 2] += 0.012
        k.loft('shorts_leg_' + side, [inner] + rr, k.SHORTS, cap_start=True, cap_end=False)

    # tank-top hem: a thin band barely proud of the shirt, its lower edge softly rolled, dipping at the front centre
    def zb(front):
        return 1.112 - 0.048 * front

    h = 0.037
    rings = [band_ring(zb, -0.008),
             band_ring(zb, 0.004),
             band_ring(lambda f: zb(f) + 0.005, 0.0065),
             band_ring(lambda f: zb(f) + 0.013, 0.005),
             band_ring(lambda f: zb(f) + h, 0.0035),
             band_ring(lambda f: zb(f) + h + 0.008, -0.006)]   # top edge slopes into the shirt, no shelf
    k.loft('tank_hem_band', rings, k.TANK_TOP)
