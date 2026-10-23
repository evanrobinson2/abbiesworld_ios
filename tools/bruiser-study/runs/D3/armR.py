"""D3 step 4: his right arm and hand (image left). Builds out of deltoid_R (bottom at row ~312) and hangs beside the torso.

Landmarks (reference pixels, from the silhouette): arm leaves the deltoid at row ~312 (cols ~335-405, merged with the
torso until row ~375); forearm bulge widest rows 400-440 (cols ~279-397, the elbow sits at row ~420); arm tapers to
the wrist at row ~540 (cols 267-322); back of hand rows 545-615 (cols 267-326); fingers hang and curl to row ~665
(the middle finger lowest, near col 290); thumb in front on the inner side, cols ~312-325, rows 585-640.
"""
import numpy as np


def _ring(k, row, c, hw, ry, n=8, cy=0.02, flat=0.15, rot=0.0):
    (x0, z), (x1, _) = k.px_y(c - hw, row, cy), k.px_y(c + hw, row, cy)
    cx, rx = (x0 + x1) / 2, (x1 - x0) / 2
    a = np.linspace(0, 2 * np.pi, n, endpoint=False) + np.pi / n + rot
    co, si = np.cos(a), np.sin(a)
    if flat:
        co = np.sign(co) * np.abs(co) ** (1 - flat)
        si = np.sign(si) * np.abs(si) ** (1 - flat)
    return np.c_[cx + rx * co, cy + ry * si, np.full(n, z)]


def _pt(k, col, row, y):
    x, z = k.px_y(col, row, y)
    return (x, y, z)


def build(k):
    m = abs(k.px(1, 500)[0] - k.px(0, 500)[0])  # metres per pixel

    # Upper arm (biceps / triceps): out of the deltoid, inner side against the torso, ending at the elbow crease.
    # (row, centre col, half-width px, depth factor, centre y)
    upper = [
        (300, 371, 35, 1.00, 0.012),
        (330, 368, 37, 1.00, 0.010),
        (360, 367, 38, 1.00, 0.008),
        (390, 368, 34, 1.05, 0.004),
        (415, 368, 32, 1.05, 0.004),
        (440, 364, 25, 1.00, 0.010),
    ]
    k.loft('upper_arm_R', [_ring(k, r, c, hw, hw * m * d, cy=y) for r, c, hw, d, y in upper], k.SKIN,
           cap_start=True, cap_end=True)

    # Forearm: the brachioradialis mass rises on the outer side past the elbow, flares, then tapers to the wrist.
    fore = [
        (350, 333, 16, 0.9, 0.030),
        (370, 322, 22, 1.0, 0.030),
        (395, 320, 34, 0.95, 0.028),
        (420, 327, 46, 0.85, 0.026),
        (445, 329, 50, 0.78, 0.024),
        (465, 324, 48, 0.78, 0.022),
        (485, 317, 43, 0.80, 0.020),
        (505, 308, 36, 0.85, 0.018),
        (525, 298, 30, 0.88, 0.016),
        (542, 294, 27, 0.88, 0.016),
    ]
    k.loft('forearm_R', [_ring(k, r, c, hw, hw * m * d, cy=y) for r, c, hw, d, y in fore], k.SKIN,
           cap_start=True, cap_end=False)

    # Back of hand / palm block: wide across, thin in depth, faceted.
    hand = [
        (542, 294, 27, 0.048, 0.016),
        (560, 297, 29, 0.044, 0.012),
        (585, 297, 30, 0.040, 0.008),
        (605, 296, 28, 0.040, 0.006),
        (618, 296, 24, 0.034, 0.006),
    ]
    k.loft('hand_R', [_ring(k, r, c, hw, ry, n=8, cy=y, flat=0.3) for r, c, hw, ry, y in hand], k.SKIN,
           cap_start=False, cap_end=True)

    # Four fingers hanging from the knuckle row, slightly curled toward the palm (+x, toward the thigh).
    # (name, base col, base y, [(col, row) mid joints...], radius px)
    fingers = [
        ('finger_index_R', 314, -0.022, [(314, 612), (315, 628), (313, 640), (309, 646)], 5.0),
        ('finger_middle_R', 302, -0.006, [(301, 614), (298, 638), (294, 656), (290, 664)], 5.2),
        ('finger_ring_R', 289, 0.010, [(288, 614), (285, 636), (283, 652), (285, 658)], 5.0),
        ('finger_pinky_R', 278, 0.024, [(275, 610), (273, 628), (275, 643), (279, 650)], 4.2),
    ]
    for name, _, y, pts, r in fingers:
        ys = [y, y - 0.004, y - 0.010, y - 0.018]
        p = [_pt(k, c, row, yy) for (c, row), yy in zip(pts, ys)]
        rr = [r * m, r * m * 0.95, r * m * 0.85, r * m * 0.7]
        k.tube(name, p, rr, 6, k.SKIN)

    # Thumb: in front on the inner side, angling down and slightly forward.
    thumb = [(312, 575, -0.010), (318, 597, -0.032), (320, 616, -0.042), (316, 632, -0.040)]
    k.tube('thumb_R', [_pt(k, c, row, y) for c, row, y in thumb],
           [7.0 * m, 6.0 * m, 5.2 * m, 4.2 * m], 6, k.SKIN)
