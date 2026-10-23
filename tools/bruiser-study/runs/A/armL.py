"""Arm A, chunk armL: his left arm and hand (image right), from ref/crops/armL.png only."""
import math
import numpy as np

S = 1.6732


def uv(k, u, v):
    """Crop pixel (u, v) -> world (x, z)."""
    return k.px(593 + u / S, 248 + v / S)


def build(k):
    # (v, inner u, outer u, depth factor, facet tweak) from the crop silhouette
    prof = [
        (70, 66, 236, 0.95),   # under the deltoid
        (130, 82, 258, 0.90),  # biceps / triceps
        (200, 108, 284, 0.85),
        (250, 130, 300, 0.85), # elbow
        (300, 145, 310, 0.80), # forearm bulge
        (380, 168, 308, 0.78),
        (460, 178, 290, 0.75),
        (540, 182, 278, 0.70),
        (585, 190, 276, 0.62), # wrist
    ]
    n = 8
    rings = []
    for i, (v, ui, uo, df) in enumerate(prof):
        x0, z = uv(k, ui, v); x1, _ = uv(k, uo, v)
        cx = (x0 + x1) / 2; rx = (x1 - x0) / 2; ry = rx * df
        a = np.linspace(0, 2 * math.pi, n, endpoint=False) + (0.2 if i % 2 else 0.0)
        # faceted, slightly squared section; a touch flatter at the front
        rr = 1.0 + 0.06 * np.cos(4 * a)
        pts = np.c_[cx + rx * rr * np.cos(a) / 1.03, 0.01 + ry * rr * np.sin(a), np.full(n, z)]
        rings.append(pts)
    k.loft('arm_L', rings, k.SKIN, cap_start=True, cap_end=False)

    # hand: back of hand faces forward/out, palm toward the thigh
    xw0, zw = uv(k, 196, 585); xw1, _ = uv(k, 280, 585)
    xk0, zk = uv(k, 206, 640); xk1, _ = uv(k, 276, 640)
    hr = []
    for (a0, a1, z, d) in [(xw0, xw1, zw, 0.030), (xw0 - 0.002, xw1 + 0.003, zw - 0.02, 0.032), (xk0, xk1, zk, 0.026)]:
        cx = (a0 + a1) / 2; rx = (a1 - a0) / 2
        hr.append(k.ring(rx, d, z, 8, cx=cx, cy=0.012))
    k.loft('palm_L', hr, k.SKIN, cap_start=True, cap_end=True)

    # four fingers, slightly curled back toward the palm side (+y)
    fus = [(210, 700), (228, 706), (246, 703), (263, 692)]
    for j, (u, vt) in enumerate(fus):
        x, zt = uv(k, u + 2, vt); xb, zb = uv(k, u, 638)
        r = 0.0105 if j < 3 else 0.0095
        L = zb - zt
        pts = [(xb, 0.004, zb), (xb, 0.0, zb - L * 0.45), (x, 0.010, zb - L * 0.82), (x, 0.024, zt)]
        k.tube('finger%d_L' % (j + 1), pts, [r, r, r * 0.92, r * 0.75], 5, k.SKIN)

    # thumb on the inner side, hanging forward of the palm
    pts = [uv(k, 194, 535), uv(k, 172, 578), uv(k, 160, 622)]
    tp = [(pts[0][0], -0.006, pts[0][1]), (pts[1][0], -0.016, pts[1][1]), (pts[2][0], -0.018, pts[2][1])]
    k.tube('thumb_L', tp, [0.017, 0.015, 0.012], 5, k.SKIN)
