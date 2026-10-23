"""D2 armR: his right arm (image left). Upper arm hangs from under the chest's deltoid_R (col 374, row 248),
elbow tucks in at row ~400, then the huge Popeye forearm flares outward and tapers to the wrist at row ~545.
Hand: faceted palm, four slightly curled fingers and a thumb in front, fingertips near row 655."""
import math
import numpy as np

E = 0.75  # superellipse exponent: slab-sided, faceted sections like the chest


def _sec(k, row, c_out, c_in, d, yc=0.0, n=8, rot=0.0):
    """Horizontal section at a reference row, spanning reference cols c_out..c_in, half depth d."""
    x0, z = k.px(c_out, row); x1, _ = k.px(c_in, row)
    cx = (x0 + x1) / 2; hw = (x1 - x0) / 2
    pts = []
    for i in range(n):
        a = rot + 2 * math.pi * i / n
        c, s = math.cos(a), math.sin(a)
        sx = math.copysign(abs(c) ** E, c); sy = math.copysign(abs(s) ** E, s)
        pts.append(np.array([cx + hw * sx, yc + d * sy, z]))
    return pts


def _pt(k, col, row, y):
    x, z = k.px(col, row)
    return (x, y, z)


def build(k):
    # upper arm: tucked under the deltoid, biceps bulge on the inside, narrows to the elbow
    upper = [
        (282, 340, 400, 0.072, 0.01),
        (310, 334, 404, 0.080, 0.0),
        (345, 333, 406, 0.082, -0.005),
        (378, 337, 405, 0.075, 0.0),
        (405, 348, 398, 0.062, 0.01),
    ]
    o = k.loft('upper_arm_R', [_sec(k, *s, n=9, rot=0.2) for s in upper], k.SKIN, cap_start=True, cap_end=True)
    k.jitter(o, 0.006, seed=11)

    # forearm: wide and wedge-like, flares out past the elbow and tapers to the wrist
    fore = [
        (350, 332, 372, 0.050, 0.0),
        (366, 310, 378, 0.065, -0.005),
        (384, 294, 392, 0.080, -0.01),
        (420, 280, 399, 0.090, -0.015),
        (445, 277, 392, 0.087, -0.015),
        (465, 275, 375, 0.080, -0.015),
        (488, 273, 358, 0.070, -0.012),
        (518, 269, 336, 0.056, -0.01),
        (545, 268, 322, 0.046, -0.008),
    ]
    o = k.loft('forearm_R', [_sec(k, *s, n=8, rot=0.35) for s in fore], k.SKIN, cap_start=True, cap_end=True)
    k.jitter(o, 0.007, seed=12)

    # hand: blocky palm (back of the hand faces out and a little toward camera)
    palm = [
        (543, 269, 321, 0.040, -0.008),
        (565, 267, 327, 0.036, -0.01),
        (592, 266, 330, 0.033, -0.012),
        (612, 269, 325, 0.030, -0.012),
    ]
    o = k.loft('palm_R', [_sec(k, *s, n=6, rot=0.0) for s in palm], k.SKIN, cap_start=True, cap_end=True)
    k.jitter(o, 0.003, seed=13)

    # four fingers, slightly curled inward toward the thigh (palm side), three segments each
    fingers = [  # name, knuckle col, tip col, tip row, radius
        ('pinky', 275, 281, 648, 0.012),
        ('ring', 285, 290, 658, 0.0135),
        ('middle', 295, 298, 660, 0.0135),
        ('index', 306, 314, 650, 0.013),
    ]
    for name, kc, tc, tr, r in fingers:
        kr = 609
        mid_row = kr + (tr - kr) * 0.55
        pts = [
            _pt(k, kc, kr - 4, -0.012),
            _pt(k, kc + (tc - kc) * 0.3, mid_row, -0.016),
            _pt(k, tc, tr - 6, -0.008),
            _pt(k, tc + 3, tr, 0.004),
        ]
        k.tube('finger_' + name + '_R', pts, [r, r * 0.95, r * 0.85, r * 0.7], 5, k.SKIN)

    # thumb: from the inner side of the palm, hanging down in front of the index finger
    pts = [
        _pt(k, 318, 572, -0.02),
        _pt(k, 322, 592, -0.035),
        _pt(k, 321, 612, -0.04),
        _pt(k, 318, 626, -0.035),
    ]
    k.tube('thumb_R', pts, [0.016, 0.013, 0.011, 0.008], 5, k.SKIN)
