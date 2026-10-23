"""D1 armR: his right upper arm, elbow, forearm, wrist and hand (four curled fingers and a thumb).

Fourth chunk of arm D1, built onto chest.py: the upper arm starts inside the bottom of `deltoid_R` (rows ~295-303,
cols 344-402) and hangs beside the torso skin. Sections are horizontal faceted rings measured row by row from the
reference silhouette: the biceps block (cols ~335-405) hangs straight, the heavy forearm (brachioradialis bulging out
to col ~278) angles out from the elbow down to a narrow wrist at row ~545, and the hand hangs with its palm turned
toward the thigh and back, fingers curled in.
"""
import math

import numpy as np

P = 0.75   # superellipse exponent: slightly boxy sections with flat facets


def _ring(k, row, l, r, ryf, cy, n=8, twist=0.0):
    xl, z = k.px(l, row)
    xr, _ = k.px(r, row)
    cx, rx = (xl + xr) / 2, (xr - xl) / 2
    ry = rx * ryf
    a = np.linspace(0, 2 * math.pi, n, endpoint=False) + math.pi / n + twist
    s, c = np.sin(a), np.cos(a)
    se = np.sign(s) * np.abs(s) ** P
    ce = np.sign(c) * np.abs(c) ** P
    return np.c_[cx + rx * ce, cy + ry * se, np.full(n, z)]


# (row, l, r, depth fraction, cy): biceps / triceps block, hanging straight from the delt.
UPPER = [(292, 336, 404, 0.95, 0.03), (320, 330, 406, 0.95, 0.03), (350, 328, 408, 0.92, 0.03),
         (380, 338, 406, 0.9, 0.032), (410, 342, 398, 0.92, 0.035), (440, 348, 392, 0.95, 0.04),
         (460, 354, 384, 0.9, 0.045)]

# Forearm: brachioradialis swells out from row ~360, then tapers to the wrist.
FORE = [(342, 330, 348, 0.9, 0.025), (358, 316, 350, 0.9, 0.02), (370, 305, 351, 0.88, 0.015),
        (382, 296, 353, 0.85, 0.012), (400, 286, 360, 0.75, 0.008),
        (425, 280, 368, 0.7, 0.008), (450, 277, 378, 0.62, 0.012), (470, 275, 368, 0.68, 0.01),
        (495, 272, 350, 0.75, 0.006), (520, 269, 332, 0.85, 0.0), (545, 268, 322, 0.85, -0.004)]

# Palm / back of the hand, hanging below the wrist.
HAND = [(548, 268, 323, 0.8, -0.004), (572, 268, 327, 0.72, -0.004), (595, 267, 326, 0.7, -0.002),
        (614, 269, 323, 0.62, 0.0)]


def build(k):
    k.loft('upper_arm_R', [_ring(k, *r, twist=0.12 * i) for i, r in enumerate(UPPER)], k.SKIN,
           cap_start=True, cap_end=True)
    k.loft('forearm_R', [_ring(k, *r, n=9, twist=-0.1 * i) for i, r in enumerate(FORE)], k.SKIN,
           cap_start=True, cap_end=True)
    k.loft('hand_R', [_ring(k, *r, n=8) for r in HAND], k.SKIN, cap_start=True, cap_end=True)

    # Fingers: lined up from the pinky (outer, back) to the index (inner, front); palm faces inward and back,
    # so the fingertips curl toward +x and +y.
    curl = np.array([0.3, 0.95, 0.0]) / math.hypot(0.3, 0.95)
    fingers = [('index', 315, -0.024, 0.0125, 1.0), ('middle', 300, -0.010, 0.013, 1.12),
               ('ring', 289, 0.004, 0.0125, 1.25), ('little', 277, 0.017, 0.011, 1.12)]
    for nm, col, dy, rad, ln in fingers:
        x0, z0 = k.px(col, 610)
        p0 = np.array([x0, dy, z0])
        p1 = p0 + np.array([-0.006, 0, -0.045 * ln])
        p2 = p1 + np.array([0, 0, -0.026 * ln]) + curl * 0.012 * ln
        p3 = p2 + np.array([0, 0, -0.012 * ln]) + curl * 0.018 * ln
        k.tube('finger_%s_R' % nm, [p0, p1, p2, p3], [rad, rad * 0.95, rad * 0.85, rad * 0.7], n=5,
               material=k.SKIN)

    # Thumb: from the front-inner side of the palm, hanging down in front of the index finger.
    x0, z0 = k.px(318, 572)
    x1, z1 = k.px(322, 600)
    x2, z2 = k.px(318, 626)
    k.tube('thumb_R', [(x0, -0.03, z0), (x1, -0.042, z1), (x2, -0.04, z2)], [0.015, 0.012, 0.009], n=5,
           material=k.SKIN)
