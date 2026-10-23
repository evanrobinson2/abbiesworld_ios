"""Arm A, chunk armR: his right arm and hand (image left), from ref/crops/armR.png only.

Landmarks are reference pixels (col, row) measured off the crop's silhouette, converted with k.px.
"""
import math

import numpy as np

PXM = 1.0 / 467.0   # metres per reference pixel on the mid plane


def build(k):
    def P(c, r):
        return k.px(c, r)

    n = 8
    # Upper arm -> elbow -> forearm -> wrist: (row, centre col, half width px, depth factor)
    prof = [
        (249, 378, 48, 0.95),
        (270, 376, 46, 0.95),
        (300, 373, 38, 0.95),
        (330, 372, 38, 0.95),
        (352, 368, 43, 0.9),
        (372, 359, 52, 0.85),
        (398, 345, 59, 0.75),
        (428, 338, 59, 0.72),
        (458, 329, 53, 0.75),
        (490, 315, 43, 0.8),
        (515, 304, 33, 0.9),
        (540, 297, 28, 1.0),
    ]
    rings = []
    for row, col, hw, dep in prof:
        x, z = P(col, row)
        rx = hw * PXM
        rings.append(k.ring(rx, rx * dep, z, n, a0=math.pi / n, cx=x, cy=0.0))
    k.loft('arm_R', rings, k.SKIN, cap_start=True, cap_end=False)

    # Palm: hangs with the palm toward the thigh, so it is wide in depth and narrower in x.
    palm = [(532, 299, 29, 1.05), (545, 297, 28, 1.15), (568, 297, 29, 1.25), (592, 295, 28, 1.25), (606, 292, 24, 1.2)]
    rings = []
    for row, col, hw, dep in palm:
        x, z = P(col, row)
        rx = hw * PXM
        rings.append(k.ring(rx, rx * dep, z, n, a0=math.pi / n, cx=x, cy=0.0))
    k.loft('palm_R', rings, k.SKIN, cap_start=True, cap_end=True)

    # Four fingers, slightly curled toward the palm (toward the body, +x). Index in front (-y).
    fingers = [  # (name, y offset m, polyline of (col, row), radius px)
        ('finger_index_R', -0.026, [(302, 600), (305, 618), (306, 634), (303, 644)], 6.5),
        ('finger_middle_R', -0.009, [(296, 600), (295, 622), (292, 644), (291, 660)], 6.8),
        ('finger_ring_R', 0.008, [(289, 600), (285, 620), (282, 640), (283, 656)], 6.5),
        ('finger_little_R', 0.024, [(283, 598), (279, 614), (276, 630), (278, 642)], 5.8),
    ]
    for name, yo, segs, rpx in fingers:
        pts = []
        for c, r in segs:
            x, z = P(c, r)
            pts.append((x, yo, z))
        k.tube(name, pts, [rpx * PXM, rpx * PXM * 0.95, rpx * PXM * 0.85, rpx * PXM * 0.7], 5, k.SKIN)

    # Thumb: from the front of the palm, down and slightly across, toward the camera.
    pts = []
    for (c, r), y in zip([(306, 560), (315, 584), (318, 606), (316, 628)], [-0.03, -0.042, -0.045, -0.044]):
        x, z = P(c, r)
        pts.append((x, y, z))
    k.tube('thumb_R', pts, [10 * PXM, 8.5 * PXM, 7.5 * PXM, 6 * PXM], 5, k.SKIN)
