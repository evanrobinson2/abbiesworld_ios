"""Arm A, chunk legs: thighs below the shorts, knees, shins, ankles, bare feet with toes.

Stations measured from ref/crops/legs.png (silhouette edges per row, mapped to reference pixels with crops.json).
"""
import math
import numpy as np

# (ref row, outer-left col, right col, depth factor, back offset factor) per leg, top to bottom.
RIGHT = [  # his right leg, image left
    (612, 398, 516, 0.95, 0.0),
    (630, 399, 509, 0.95, 0.0),
    (650, 401, 503, 0.92, 0.0),
    (672, 407, 497, 0.90, 0.0),
    (695, 413, 491, 0.88, 0.05),   # knee
    (716, 413, 491, 0.95, 0.10),
    (738, 416, 501, 1.00, 0.15),
    (762, 421, 510, 1.00, 0.18),
    (790, 421, 516, 0.98, 0.18),   # calf widest
    (812, 422, 508, 0.98, 0.15),
    (836, 428, 495, 1.00, 0.10),
    (860, 432, 485, 1.00, 0.05),
    (884, 432, 481, 1.05, 0.0),
    (905, 434, 479, 1.10, 0.0),    # ankle
    (928, 433, 482, 1.20, 0.0),
]
LEFT = [  # his left leg, image right
    (612, 522, 634, 0.95, 0.0),
    (630, 529, 634, 0.95, 0.0),
    (650, 536, 634, 0.92, 0.0),
    (672, 542, 632, 0.90, 0.0),
    (695, 547, 631, 0.88, 0.05),   # knee
    (716, 556, 638, 0.95, 0.10),
    (738, 569, 649, 1.00, 0.15),
    (762, 573, 661, 1.00, 0.18),
    (785, 572, 669, 0.98, 0.18),   # calf widest
    (810, 576, 665, 0.98, 0.15),
    (836, 589, 659, 1.00, 0.10),
    (860, 601, 654, 1.00, 0.05),
    (884, 605, 651, 1.05, 0.0),
    (905, 608, 650, 1.10, 0.0),    # ankle
    (928, 606, 652, 1.20, 0.0),
]

N = 8


def _leg(k, name, stations, y0, twist, y_ankle=0.0):
    rings = []
    for i, (row, c0, c1, df, back) in enumerate(stations):
        x0, z = k.px(c0 - 3, row)
        x1, _ = k.px(c1 + 3, row)
        cx = 0.5 * (x0 + x1); rx = 0.5 * (x1 - x0)
        ry = rx * df
        yy = y0 + y_ankle * min(1.0, max(0.0, (row - 716) / (905 - 716)))
        ang = np.linspace(0, 2 * math.pi, N, endpoint=False) + math.pi / N + twist * (i % 2) * 0.12
        r = np.c_[cx + rx * np.cos(ang), yy + back * rx + ry * np.sin(ang), np.full(N, z)]
        rings.append(r)
    return k.loft(name, rings, k.SKIN, cap_start=True, cap_end=True)


def _foot(k, side, ankle_x, y0, yaw):
    """Foot built in local (t forward, s lateral, z up) then rotated by yaw about z and moved under the ankle."""
    # (t, width, height, top-lean) stations from heel to toe base
    st = [(-0.075, 0.075, 0.06), (-0.05, 0.10, 0.10), (0.0, 0.115, 0.13), (0.06, 0.125, 0.10),
          (0.12, 0.135, 0.065), (0.165, 0.14, 0.045)]
    rings = []
    for t, w, h in st:
        h *= 0.85
        prof = [(-w / 2, 0.0), (w / 2, 0.0), (w / 2, h * 0.55), (w * 0.22, h), (-w * 0.22, h), (-w / 2, h * 0.55)]
        rings.append([(s, t, z) for s, z in prof])
    c, s_ = math.cos(yaw), math.sin(yaw)

    def xf(p):
        s, t, z = p
        # forward is -Y; yaw rotates the forward direction toward -X (positive yaw) or +X
        lx, ly = s, -t
        return (ankle_x + lx * c - ly * s_, y0 + lx * s_ + ly * c, z)

    out = [k.loft(f'foot_{side}', [[xf(p) for p in r] for r in rings], k.SKIN, cap_start=True, cap_end=True)]
    # toes: big toe on the inner side, four smaller ones outward
    inner = 1 if side == 'R' else -1  # his right foot: inner side is +s (toward x=0)
    toes = [(0.034, 0.040, 0.075), (0.026, 0.032, 0.055), (0.024, 0.028, 0.045), (0.022, 0.025, 0.040), (0.020, 0.022, 0.033)]
    s_pos = 0.068
    for i, (tw, th, tl) in enumerate(toes):
        sc = inner * (s_pos - tw / 2)
        s_pos -= tw + 0.003
        t0, t1 = 0.16, 0.16 + tl
        ss = [sc - tw / 2, sc + tw / 2]
        v = []
        for t, hh, shrink in ((t0, th, 0.0), (t1 - 0.012, th * 0.85, 0.0), (t1, th * 0.55, 0.15)):
            a, b = ss[0] + tw * shrink, ss[1] - tw * shrink
            for sv, zv in ((a, 0.0), (b, 0.0), (b, hh), (a, hh)):
                v.append(xf((sv, t, zv)))
        f = [(0, 3, 2, 1), (8, 9, 10, 11)]
        for r in range(2):
            o = r * 4
            for j in range(4):
                jn = (j + 1) % 4
                f.append((o + j, o + jn, o + 4 + jn, o + 4 + j))
        out.append(k.mesh(f'toe{i + 1}_{side}', v, f, k.SKIN))
    return out


def build(k):
    yr, yl = 0.23, 0.20
    _leg(k, 'leg_R', RIGHT, 0.0, 1, yr)
    _leg(k, 'leg_L', LEFT, 0.0, -1, yl)
    xr, _ = k.px_y(457, 915, yr)
    xl, _ = k.px_y(629, 915, yl)
    _foot(k, 'R', xr, yr, math.radians(-62))
    _foot(k, 'L', xl, yl, math.radians(0))
