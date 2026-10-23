"""D1 armL: his left upper arm, elbow, forearm, wrist and hand (four curled fingers and a thumb).

Fifth chunk of arm D1, built onto chest.py and mirroring armR.py's construction: the upper arm starts inside the
bottom of `deltoid_L` (row ~305, cols 640-722) and hangs beside the torso. Sections are horizontal faceted rings
measured row by row from the reference silhouette (his left side, image right): the biceps block hangs down to the
elbow at row ~440, the heavy forearm block overlaps it in front from row ~360 and bulges out to col ~777, tapering
to the wrist at row ~560. The hand hangs with the palm toward the thigh, thumb in front at cols ~682-705, fingers
curled in at rows ~612-672.
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


# (row, l, r, depth fraction, cy): biceps / triceps block, hanging from the delt to the elbow.
UPPER = [(294, 636, 740, 0.95, 0.03), (320, 630, 751, 0.95, 0.03), (350, 636, 755, 0.92, 0.03),
         (380, 658, 746, 0.9, 0.032), (410, 674, 738, 0.92, 0.035), (440, 680, 728, 0.95, 0.04),
         (462, 686, 720, 0.9, 0.045)]

# Forearm: a heavy faceted block in front of the elbow, widest at row ~425, tapering to the wrist.
FORE = [(358, 724, 754, 0.9, 0.02), (372, 714, 760, 0.88, 0.015), (390, 704, 768, 0.85, 0.012),
        (410, 692, 775, 0.75, 0.008), (430, 680, 777, 0.7, 0.008), (455, 682, 773, 0.66, 0.01),
        (480, 690, 770, 0.68, 0.01), (505, 699, 768, 0.75, 0.006), (530, 703, 765, 0.82, 0.0),
        (556, 700, 763, 0.85, -0.004)]

# Palm / back of the hand, hanging below the wrist (thumb is a separate tube on the inner front).
HAND = [(556, 696, 764, 0.8, -0.004), (575, 692, 764, 0.74, -0.004), (598, 706, 766, 0.7, -0.002),
        (616, 714, 765, 0.62, 0.0)]


def build(k):
    k.loft('upper_arm_L', [_ring(k, *r, twist=-0.12 * i) for i, r in enumerate(UPPER)], k.SKIN,
           cap_start=True, cap_end=True)
    k.loft('forearm_L', [_ring(k, *r, n=9, twist=0.1 * i) for i, r in enumerate(FORE)], k.SKIN,
           cap_start=True, cap_end=True)
    k.loft('hand_L', [_ring(k, *r, n=8) for r in HAND], k.SKIN, cap_start=True, cap_end=True)

    # Fingers: index (inner, front) to little (outer, back); palm faces inward and back, so the tips curl
    # toward -x (the thigh) and +y.
    curl = np.array([-0.5, 0.85, 0.0]) / math.hypot(0.5, 0.85)
    fingers = [('index', 723, -0.024, 0.0135, 1.25), ('middle', 735, -0.010, 0.014, 1.4),
               ('ring', 747, 0.004, 0.0135, 1.3), ('little', 757, 0.017, 0.012, 1.05)]
    for nm, col, dy, rad, ln in fingers:
        x0, z0 = k.px(col, 612)
        p0 = np.array([x0, dy, z0])
        p1 = p0 + np.array([-0.004, 0, -0.045 * ln])
        p2 = p1 + np.array([0, 0, -0.026 * ln]) + curl * 0.012 * ln
        p3 = p2 + np.array([0, 0, -0.012 * ln]) + curl * 0.018 * ln
        k.tube('finger_%s_L' % nm, [p0, p1, p2, p3], [rad, rad * 0.95, rad * 0.85, rad * 0.7], n=5,
               material=k.SKIN)

    # Thumb: from the front-inner side of the palm, hanging down in front of the index finger.
    x0, z0 = k.px(698, 560)
    x1, z1 = k.px(693, 592)
    x2, z2 = k.px(691, 622)
    k.tube('thumb_L', [(x0, -0.03, z0), (x1, -0.042, z1), (x2, -0.04, z2)], [0.022, 0.022, 0.018], n=5,
           material=k.SKIN)
