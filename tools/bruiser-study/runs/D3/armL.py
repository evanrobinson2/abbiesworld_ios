"""D3 step 5: his left arm and hand (image right). Builds out of deltoid_L (bottom at row ~314, cols 650-718).

Landmarks (reference pixels, from the silhouette): upper arm cols ~648-735 under the deltoid, merged with the torso
until row ~355; the forearm's outer mass rises from row ~360 and is widest rows 410-440 (cols 678-777, elbow at
row ~410 on the inner side); tapers to the wrist at row ~540 (cols 700-764); back of hand rows 545-615 (cols
~700-765); thumb in front on the inner side, cols 680-704, rows 575-625; four fingers hang to row ~670 (middle
finger lowest near col 728), curled slightly toward the thigh.
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

    # Upper arm (biceps / triceps): out of the deltoid, inner side against the torso, ending at the elbow.
    # (row, centre col, half-width px, depth factor, centre y)
    upper = [
        (300, 690, 46, 0.90, 0.012),
        (325, 694, 53, 0.85, 0.010),
        (352, 699, 50, 0.85, 0.008),
        (380, 705, 42, 0.95, 0.006),
        (405, 708, 32, 1.05, 0.006),
        (435, 708, 24, 1.00, 0.010),
    ]
    k.loft('upper_arm_L', [_ring(k, r, c, hw, hw * m * d, cy=y) for r, c, hw, d, y in upper], k.SKIN,
           cap_start=True, cap_end=True)

    # Forearm: the brachioradialis mass rises on the outer side above the elbow, flares, then tapers to the wrist.
    fore = [
        (335, 744, 10, 0.9, 0.030),
        (352, 743, 16, 0.9, 0.030),
        (370, 738, 22, 1.0, 0.030),
        (395, 730, 40, 0.95, 0.028),
        (420, 728, 49, 0.85, 0.026),
        (445, 727, 48, 0.80, 0.024),
        (470, 729, 42, 0.80, 0.022),
        (495, 733, 35, 0.85, 0.020),
        (520, 734, 31, 0.88, 0.018),
        (542, 732, 31, 0.88, 0.016),
    ]
    k.loft('forearm_L', [_ring(k, r, c, hw, hw * m * d, cy=y) for r, c, hw, d, y in fore], k.SKIN,
           cap_start=True, cap_end=False)

    # Back of hand / palm block: wide across, thin in depth, faceted.
    hand = [
        (542, 732, 31, 0.050, 0.016),
        (562, 727, 35, 0.046, 0.012),
        (585, 731, 33, 0.042, 0.008),
        (602, 738, 27, 0.040, 0.006),
        (618, 739, 24, 0.034, 0.006),
    ]
    k.loft('hand_L', [_ring(k, r, c, hw, ry, n=8, cy=y, flat=0.3) for r, c, hw, ry, y in hand], k.SKIN,
           cap_start=False, cap_end=True)

    # Four fingers hanging from the knuckle row, slightly curled toward the palm (-x, toward the thigh).
    fingers = [
        ('finger_index_L', -0.022, [(722, 610), (720, 630), (720, 648), (724, 660)], 5.8),
        ('finger_middle_L', -0.006, [(733, 612), (732, 638), (731, 658), (732, 669)], 6.0),
        ('finger_ring_L', 0.010, [(745, 612), (744, 636), (742, 654), (739, 664)], 5.8),
        ('finger_pinky_L', 0.024, [(756, 608), (756, 626), (753, 642), (749, 650)], 5.0),
    ]
    for name, y, pts, r in fingers:
        ys = [y, y - 0.004, y - 0.010, y - 0.018]
        p = [_pt(k, c, row, yy) for (c, row), yy in zip(pts, ys)]
        rr = [r * m, r * m * 0.95, r * m * 0.85, r * m * 0.7]
        k.tube(name, p, rr, 6, k.SKIN)

    # Thumb: in front on the inner side, angling down and slightly forward.
    thumb = [(706, 562, -0.010), (692, 584, -0.032), (689, 604, -0.042), (690, 620, -0.040)]
    k.tube('thumb_L', [_pt(k, c, row, y) for c, row, y in thumb],
           [9.0 * m, 8.5 * m, 7.5 * m, 6.0 * m], 6, k.SKIN)
