"""Arm B, chunk armR: his right arm (image left) and hand, measured straight off ref/bruiser.png."""
import math
import numpy as np

N = 8  # octagonal sections: faceted like the reference


def _rings(k, rows, depth=0.92, cy=0.0, rot=math.pi / 8):
    """rows: (row, left_col, right_col[, depth_ratio]) -> rings of N points on the figure's mid plane."""
    out = []
    for r in rows:
        row, l, rr = r[:3]
        d = r[3] if len(r) > 3 else depth
        xl, z = k.px(l, row); xr, _ = k.px(rr, row)
        rx = abs(xr - xl) / 2; cx = (xl + xr) / 2
        out.append(k.ring(rx, rx * d, z, N, a0=rot, a1=rot + 2 * math.pi, cx=cx, cy=cy))
    return out


def build(k):
    # Upper arm: hangs under the deltoid, biceps on the inner side, ends at the elbow crease.
    upper = [(285, 334, 402), (300, 333, 404), (330, 330, 405), (360, 330, 404), (390, 333, 401),
             (420, 342, 394), (445, 352, 386), (462, 360, 378)]
    k.loft('upper_arm_R', _rings(k, upper), k.SKIN, cap_start=True, cap_end=True)

    # Forearm: flares out at the brachioradialis near the elbow, tapers to the wrist.
    fore = [(362, 318, 346, 0.9), (372, 306, 352), (390, 288, 356), (410, 281, 362), (440, 276, 372),
            (465, 274, 376), (485, 272, 362), (505, 270, 346), (525, 268, 330), (542, 269, 322, 0.8)]
    k.loft('forearm_R', _rings(k, fore), k.SKIN, cap_start=True, cap_end=True)

    # Hand: a blocky palm (seen from the thumb side), four curled fingers, thumb in front.
    palm = [(540, 269, 322, 0.75), (555, 268, 326, 0.75), (575, 268, 327, 0.75), (595, 267, 326, 0.72),
            (612, 268, 323, 0.7)]
    k.loft('palm_R', _rings(k, palm), k.SKIN, cap_start=True, cap_end=True)

    def P(col, row, y):
        x, z = k.px(col, row)
        return (x, y, z)

    # Fingers, outer (little) to inner (index): hang below the palm and curl back toward the thigh.
    fingers = [
        ('finger_little_R', 274, 608, 0.030, [(274, 606), (276, 630), (281, 648), (287, 659)], 0.0105),
        ('finger_ring_R', 285, 610, 0.012, [(285, 608), (286, 630), (290, 646), (294, 654)], 0.0115),
        ('finger_middle_R', 298, 612, -0.006, [(298, 610), (300, 628), (304, 640), (307, 645)], 0.012),
        ('finger_index_R', 312, 610, -0.024, [(311, 608), (314, 624), (316, 636), (317, 641)], 0.0115),
    ]
    for name, _, _, y, pts, r in fingers:
        ys = [y, y + 0.004, y + 0.012, y + 0.022]
        k.tube(name, [P(c, rw, yy) for (c, rw), yy in zip(pts, ys)], [r, r * 0.95, r * 0.85, r * 0.7], 6, k.SKIN)

    # Thumb: in front of the palm, angled down toward the index fingertip.
    k.tube('thumb_R', [P(312, 560, -0.035), P(306, 585, -0.045), P(303, 608, -0.046), P(304, 626, -0.04)],
           [0.016, 0.0135, 0.012, 0.0095], 6, k.SKIN)
