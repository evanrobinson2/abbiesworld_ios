"""Arm E, chunk 'legs': thighs below the shorts, knees, calves, ankles, bare feet with toes.

Builds onto runs/E/hips.py, whose leg openings end at z 0.785 (his right, cx -0.124, rx 0.126) and z 0.763 (his left,
cx 0.134, rx 0.122), y about -0.12 .. 0.12: each thigh starts hidden inside its opening (z 0.84 / 0.82) and is a
little narrower than the hem, so the hem reads as a proud edge. Nothing between the legs: two separate lofts.
Joints from the MPFB DEF bones (knee z 0.577, ankle z 0.084, foot heel ~+0.08 to toe tip -0.21 in y): the knee ring
sits at z 0.57 and the ankle/foot joint at z ~0.09. Front widths from the reference silhouette rows (k.px plane, his
right calf bulges to the inside, his left to the outside, his left leg splays further out, as in the picture); depths
from the side turnaround (thigh ~0.21 deep, knee ~0.20, calf ~0.23 with the bulge behind, ankle ~0.10, foot ~0.30
long) checked against the MPFB sections. His right foot turns out about 43 degrees (toes at image-left), his left
about 6 degrees. Octagon rings with flats at front, back and sides, like the reference's big leg planes.
"""
import math

import numpy as np

N = 8
C = math.cos(math.pi / N)

# z, x_outer_or_left, x_right, y_front, y_back  (bottom to top). x0 < x1 always.
LEG_R = [
    (0.090, -0.160, -0.095, 0.030, 0.115),
    (0.140, -0.170, -0.088, 0.020, 0.135),
    (0.200, -0.171, -0.086, 0.018, 0.142),
    (0.270, -0.181, -0.068, 0.010, 0.168),
    (0.340, -0.193, -0.040, 0.004, 0.195),
    (0.400, -0.205, -0.010, -0.003, 0.215),
    (0.450, -0.204, -0.004, -0.009, 0.218),
    (0.510, -0.211, -0.027, -0.017, 0.195),
    (0.570, -0.219, -0.050, -0.053, 0.150),
    (0.620, -0.220, -0.057, -0.079, 0.118),
    (0.680, -0.234, -0.043, -0.098, 0.098),
    (0.740, -0.246, -0.027, -0.106, 0.102),
    (0.840, -0.236, -0.016, -0.108, 0.106),
]
LEG_L = [
    (0.090, 0.208, 0.272, 0.030, 0.115),
    (0.140, 0.202, 0.280, 0.020, 0.135),
    (0.200, 0.199, 0.278, 0.018, 0.142),
    (0.270, 0.180, 0.290, 0.010, 0.168),
    (0.340, 0.152, 0.306, 0.004, 0.195),
    (0.400, 0.121, 0.319, -0.003, 0.215),
    (0.450, 0.120, 0.326, -0.009, 0.218),
    (0.510, 0.122, 0.300, -0.017, 0.195),
    (0.570, 0.090, 0.262, -0.053, 0.150),
    (0.620, 0.066, 0.245, -0.079, 0.118),
    (0.680, 0.056, 0.246, -0.098, 0.098),
    (0.740, 0.036, 0.248, -0.106, 0.102),
    (0.820, 0.026, 0.246, -0.108, 0.106),
]




def oct_ring(z, x0, x1, yf, yb, n=N):
    a = math.pi / n + np.arange(n) * math.tau / n
    cx, hw = (x0 + x1) / 2, (x1 - x0) / 2
    c, s = np.cos(a), np.sin(a)
    x = cx + hw / C * c
    cy = (yf + yb) / 2; hd = (yb - yf) / 2
    y = cy + hd / C * s
    return np.c_[x, y, np.full(n, z)]


# foot sections along its length (u, metres from the ankle centre): u, half-width, height
FOOT = [
    (-0.088, 0.034, 0.055),
    (-0.065, 0.050, 0.105),
    (-0.015, 0.057, 0.150),
    (0.050, 0.063, 0.118),
    (0.120, 0.066, 0.070),
    (0.172, 0.063, 0.044),
]
# toes, big toe first (inner side): half-width, height, length beyond u 0.165
TOES = [(0.018, 0.038, 0.060), (0.0125, 0.030, 0.054), (0.012, 0.028, 0.048), (0.011, 0.026, 0.042),
        (0.010, 0.024, 0.036)]


def frame(theta, outward):
    """Forward and side unit vectors for a foot turned theta radians outward; side x up = forward."""
    f = np.array([outward * math.sin(theta), -math.cos(theta), 0.0])
    s = np.array([-f[1], f[0], 0.0])
    return f, s


def foot_ring(c, f, s, u, w, h, inner, arch=0.0):
    # CCW about f in the (s, z) plane; the inner side is a touch taller (the arch)
    pts2 = [(-0.9, 0.0), (0.9, 0.0), (1.0, 0.42), (0.78, 0.86), (0.2, 1.0), (-0.4, 0.97), (-0.8, 0.84), (-1.0, 0.42)]
    out = []
    for a, b in pts2:
        bb = b * h * (1 + arch * (0.25 if a * inner > 0 else 0.0)) if b > 0 else 0.0
        p = c + f * u + s * (a * w) + np.array([0, 0, bb])
        out.append(p)
    return np.array(out)


def build_foot(k, name, ankle, theta, outward, inner):
    """ankle: (x, y) of the ankle centre on the ground; inner: +1 if the side vector s points to his midline."""
    f, s = frame(theta, outward)
    c = np.array([ankle[0], ankle[1], 0.0])
    rings = [foot_ring(c, f, s, u, w, h, inner, arch=1.0 if 0 < u < 0.13 else 0.0) for u, w, h in FOOT]
    k.loft('foot_' + name, rings, k.SKIN, cap_start=True, cap_end=True)
    # toes from the inner edge outward
    total = sum(2 * t[0] for t in TOES) + 0.004 * (len(TOES) - 1)
    a = inner * (total / 2)
    for i, (tw, th, tl) in enumerate(TOES):
        a_c = a - inner * tw
        a -= inner * (2 * tw + 0.004)
        u0 = 0.150
        rings = []
        for u, sh, hh in ((u0, 1.0, 1.0), (u0 + tl * 0.7, 1.0, 0.95), (u0 + tl, 0.8, 0.6)):
            pts2 = [(-1, 0), (1, 0), (1, 0.8), (0.6, 1.0), (-0.6, 1.0), (-1, 0.8)]
            rings.append(np.array([c + f * u + s * (a_c + q * tw * sh) + np.array([0, 0, r * th * hh])
                                   for q, r in pts2]))
        k.loft(f'toe{i + 1}_{name}', rings, k.SKIN, cap_start=True, cap_end=True)


def build(k):
    k.loft('leg_R', [oct_ring(*r) for r in LEG_R], k.SKIN, cap_start=True, cap_end=True)
    k.loft('leg_L', [oct_ring(*r) for r in LEG_L], k.SKIN, cap_start=True, cap_end=True)
    # his right foot (image left) turns out ~43 deg toward -x; his left ~6 deg toward +x
    build_foot(k, 'R', (-0.128, 0.072), math.radians(43), -1, +1)
    build_foot(k, 'L', (0.240, 0.072), math.radians(6), +1, -1)
