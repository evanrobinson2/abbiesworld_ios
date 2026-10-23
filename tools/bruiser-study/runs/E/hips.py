"""Arm E, chunk 'hips': tank-top hem band, pelvis under plain shorts, two leg openings.

Builds onto runs/E/chest.py: its torso ends open at z 1.10 (cx 0, half-width 0.222, y -0.150 .. 0.130, superellipse
P 2.6, 16 sides); the shorts' pelvis loft starts with that exact ring (plus a hidden overlap upward) and the hem band
wraps the seam. Widths and heights from the front picture (k.px); depths from the side turnaround
(side col c -> y = (c - 498) / 467: shorts front ~ -0.14, buttocks back ~ +0.175, hem -0.12 .. +0.12), checked
against the MPFB sections (pelvis y -0.10 .. 0.15, crotch near z 0.87). Plain flat front, no bulge: the crotch is
only the flat underside between the leg tubes (the inner seam). Leg openings end at the hem, z ~0.78 / 0.76,
where the legs chunk takes over the thighs.
"""
import math

import numpy as np

P = 2.6
N = 16

# z, cx, rx, yf, yb  (bottom to top); 1.10 row equals the chest torso's bottom ring
PELVIS = [
    (0.925, 0.008, 0.110, -0.060, 0.090),
    (0.955, 0.007, 0.245, -0.135, 0.165),
    (1.010, 0.005, 0.244, -0.143, 0.178),
    (1.060, 0.002, 0.232, -0.148, 0.160),
    (1.100, 0.000, 0.222, -0.150, 0.130),
    (1.135, 0.000, 0.217, -0.155, 0.135),
]

# leg openings: z, cx, rx, yf, yb (bottom to top); his right is image-left (negative x)
LEG_R = [
    (0.785, -0.124, 0.126, -0.122, 0.118),
    (0.850, -0.123, 0.128, -0.130, 0.135),
    (0.930, -0.118, 0.134, -0.136, 0.160),
    (1.000, -0.114, 0.130, -0.138, 0.165),
]
LEG_L_CX = 0.134   # the picture's left leg sits a touch further out (same slight turn as the chest)
LEG_L_DZ = -0.022  # and its hem reads a little lower
LEG_L_RX = 0.122


def se(cx, rx, yf, yb, z, n=N, p=P, rot=None):
    a = np.linspace(0, math.tau, n, endpoint=False) + (math.pi / n if rot is None else rot)
    c, s = np.cos(a), np.sin(a)
    x = cx + rx * np.sign(c) * np.abs(c) ** (2 / p)
    y = np.where(s < 0, yf * np.abs(s) ** (2 / p), yb * np.abs(s) ** (2 / p))
    zz = z if np.ndim(z) else np.full(n, z)
    return np.c_[x, y, zz]


def sect(z):
    zs = [r[0] for r in PELVIS]
    z = min(max(z, zs[0]), zs[-1])
    return [float(np.interp(z, zs, [r[i] for r in PELVIS])) for i in range(1, 5)]


def band_ring(zfun, grow):
    """A ring around the waist whose height varies with angle (lower at the front centre)."""
    a = np.linspace(0, math.tau, N, endpoint=False) + math.pi / N
    pts = []
    for ang in a:
        c, s = math.cos(ang), math.sin(ang)
        front = max(0.0, -s) ** 1.5
        z = zfun(front)
        cx, rx, yf, yb = sect(z)
        x = cx + (rx + grow) * math.copysign(abs(c) ** (2 / P), c)
        y = (yf - grow) * abs(s) ** (2 / P) if s < 0 else (yb + grow) * abs(s) ** (2 / P)
        pts.append((x, y, z))
    return np.array(pts)


def build(k):
    # pelvis under the shorts, capped below (the flat crotch between the leg openings)
    rings = [se(cx, rx, yf, yb, z) for z, cx, rx, yf, yb in PELVIS]
    k.loft('shorts_pelvis', rings, k.SHORTS, cap_start=True, cap_end=False)

    # leg openings: 8-sided boxy tubes with a turned-in hem edge
    for name, side in (('shorts_leg_R', -1), ('shorts_leg_L', 1)):
        rr = []
        for z, cx, rx, yf, yb in LEG_R:
            if side > 0:
                cx, rx = LEG_L_CX, LEG_L_RX + (rx - LEG_R[0][2])
                z = z + LEG_L_DZ * (1 - (z - LEG_R[0][0]) / (LEG_R[-1][0] - LEG_R[0][0]))
            rr.append(se(cx, rx, yf, yb, z, n=8, p=2.4))
        hem = rr[0]
        c = hem.mean(axis=0)
        inner = c + (hem - c) * np.array([0.9, 0.9, 1.0])
        inner[:, 2] += 0.012
        k.loft(name, [inner] + rr, k.SHORTS, cap_start=True, cap_end=False)

    # tank-top hem band: a proud lip around the waist, dipping at the front centre
    def zb(front):
        return 1.105 - 0.048 * front

    def zt(front):
        return zb(front) + 0.044

    rings = [band_ring(zb, -0.012), band_ring(zb, 0.013), band_ring(lambda f: zb(f) + 0.004, 0.017),
             band_ring(lambda f: zt(f) - 0.004, 0.015), band_ring(zt, 0.009), band_ring(zt, -0.012)]
    k.loft('tank_hem_band', rings, k.TANK_TOP)
