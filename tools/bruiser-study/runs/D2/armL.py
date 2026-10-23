"""D2 armL: his left arm (image right). Upper arm hangs from under the chest's deltoid_L (col 670, row 250); this
side reads wider (three-quarter turn). Elbow tucks in at row ~400, the heavy wedge forearm flares outward to col ~776
and tapers to the wrist at row ~560. Hand: faceted palm, four slightly curled fingers, thumb hanging in front on the
inner side, fingertips near row 666."""
import math
import numpy as np

E = 0.75  # superellipse exponent: slab-sided, faceted sections like the chest and armR


def _sec(k, row, c0, c1, d, yc=0.0, n=8, rot=0.0):
    """Horizontal section at a reference row, spanning reference cols c0..c1, half depth d."""
    x0, z = k.px(c0, row); x1, _ = k.px(c1, row)
    cx = (x0 + x1) / 2; hw = abs(x1 - x0) / 2
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
    # upper arm: tucked under the deltoid, triceps on the outside, narrowing to the elbow
    upper = [
        (282, 641, 734, 0.075, 0.01),
        (310, 642, 746, 0.082, 0.0),
        (340, 643, 755, 0.084, -0.005),
        (370, 651, 756, 0.078, 0.0),
        (398, 667, 768, 0.064, 0.01),
    ]
    o = k.loft('upper_arm_L', [_sec(k, *s, n=9, rot=0.2) for s in upper], k.SKIN, cap_start=True, cap_end=True)
    k.jitter(o, 0.006, seed=21)

    # forearm: wide wedge, flares out past the elbow and tapers to the wrist
    fore = [
        (362, 690, 754, 0.050, -0.01),
        (385, 670, 765, 0.068, -0.015),
        (410, 675, 775, 0.084, -0.02),
        (440, 676, 775, 0.088, -0.02),
        (470, 687, 770, 0.082, -0.02),
        (500, 699, 767, 0.072, -0.016),
        (530, 704, 764, 0.060, -0.012),
        (560, 700, 762, 0.048, -0.01),
    ]
    o = k.loft('forearm_L', [_sec(k, *s, n=8, rot=0.35) for s in fore], k.SKIN, cap_start=True, cap_end=True)
    k.jitter(o, 0.007, seed=22)

    # hand: blocky palm, back of the hand facing out and a little toward camera
    palm = [
        (558, 700, 762, 0.040, -0.01),
        (580, 705, 764, 0.036, -0.012),
        (600, 709, 765, 0.033, -0.012),
        (618, 713, 763, 0.030, -0.012),
    ]
    o = k.loft('palm_L', [_sec(k, *s, n=6, rot=0.0) for s in palm], k.SKIN, cap_start=True, cap_end=True)
    k.jitter(o, 0.003, seed=23)

    # four fingers, slightly curled inward toward the thigh (palm side), three segments each
    fingers = [  # name, knuckle col, tip col, tip row, radius
        ('index', 720, 719, 664, 0.0145),
        ('middle', 730, 728, 668, 0.015),
        ('ring', 740, 738, 661, 0.015),
        ('pinky', 751, 747, 650, 0.0135),
    ]
    for name, kc, tc, tr, r in fingers:
        kr = 614
        mid_row = kr + (tr - kr) * 0.55
        pts = [
            _pt(k, kc, kr - 4, -0.012),
            _pt(k, kc + (tc - kc) * 0.3, mid_row, -0.016),
            _pt(k, tc, tr - 6, -0.008),
            _pt(k, tc - 3, tr, 0.004),
        ]
        k.tube('finger_' + name + '_L', pts, [r, r * 0.95, r * 0.85, r * 0.7], 5, k.SKIN)

    # thumb: from the inner side of the palm, hanging down in front
    pts = [
        _pt(k, 706, 562, -0.015),
        _pt(k, 696, 578, -0.03),
        _pt(k, 690, 596, -0.04),
        _pt(k, 689, 610, -0.04),
        _pt(k, 690, 621, -0.035),
    ]
    k.tube('thumb_L', pts, [0.024, 0.023, 0.021, 0.019, 0.014], 5, k.SKIN)
