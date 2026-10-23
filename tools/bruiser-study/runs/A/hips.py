"""Arm A, chunk hips: tank-top hem band, shorts (pelvis, crotch, two legs with leg openings).

Landmarks measured on ref/crops/hips.png and mapped to reference pixels (col, row) via crops.json:
hem band top row ~447, bottom ~465 at the sides dipping to ~489 at front centre; shorts waist cols 410-612;
crotch row ~560; leg openings rows ~615 (outer) to ~630 (inner), outer cols 398 / 634, legs meet near col 516.
"""
import math

import numpy as np

N = 16


def _ring(k, row, c0, c1, ry, n=N, cy=0.0, zfn=None, sq=2.4):
    """A faceted superellipse ring spanning reference cols c0..c1 at reference row; returns (n,3)."""
    x0, z = k.px(c0, row)
    x1, _ = k.px(c1, row)
    cx = (x0 + x1) / 2; rx = abs(x1 - x0) / 2
    a = np.linspace(0, 2 * math.pi, n, endpoint=False) + math.pi / n
    c, s = np.cos(a), np.sin(a)
    e = 2.0 / sq
    xs = cx + rx * np.sign(c) * np.abs(c) ** e
    ys = cy + ry * np.sign(s) * np.abs(s) ** e
    zs = np.full(n, z)
    if zfn is not None:
        zs = np.array([zfn(x, y, z) for x, y in zip(xs, ys)])
    return np.c_[xs, ys, zs]


def build(k):
    # ---- Tank-top hem band: a thick band, its lower edge dipping toward the front (seen from slightly above).
    def dip(amount):
        def f(x, y, z):
            front = max(0.0, -y / 0.16)
            return z - amount * front ** 1.5
        return f

    hem_rings = [
        _ring(k, 433, 416, 614, 0.148, cy=0.0),
        _ring(k, 440, 415, 615, 0.152, cy=0.0),
        _ring(k, 447, 413, 615, 0.158, cy=0.0, zfn=dip(0.008)),
        _ring(k, 466, 411, 616, 0.160, cy=0.0, zfn=dip(0.042)),
        _ring(k, 468, 416, 610, 0.150, cy=0.0, zfn=dip(0.042)),
    ]
    k.loft('tank_hem_band', hem_rings, k.TANK_TOP, cap_start=True, cap_end=True)

    # ---- Shorts: pelvis block from under the hem down to the crotch.
    pelvis = [
        _ring(k, 455, 414, 610, 0.145),
        _ring(k, 475, 408, 614, 0.150),
        _ring(k, 500, 405, 619, 0.152),
        _ring(k, 525, 403, 623, 0.150),
        _ring(k, 545, 403, 626, 0.132),
        _ring(k, 560, 412, 618, 0.115),
    ]
    k.loft('shorts_seat', pelvis, k.SHORTS, cap_start=True, cap_end=True)

    # (No crotch piece: post-run fix 07:00Z, a human in plain shorts has a smooth front. Evan flagged the bulge.)

    # ---- Shorts legs with leg openings. Image-left leg is his right (negative x).
    # (row, outer col, inner col, depth) from crotch down to the hem opening.
    legR = [(505, 410, 512, 0.105), (540, 401, 519, 0.145), (565, 399, 518, 0.135), (590, 398, 516, 0.125), (612, 396, 511, 0.122)]
    legL = [(505, 520, 620, 0.105), (540, 513, 629, 0.145), (565, 514, 632, 0.135), (590, 517, 634, 0.125), (612, 522, 636, 0.122)]

    def opening(o_col, i_col, o_row, i_row):
        xo, zo = k.px(o_col, o_row); xi, zi = k.px(i_col, i_row)

        def f(x, y, z):
            t = (x - xo) / (xi - xo)
            t = min(1.0, max(0.0, t))
            return zo + (zi - zo) * t
        return f

    for name, rows, o_col, i_col, o_row, i_row in (
            ('shorts_leg_R', legR, 396, 510, 616, 630),
            ('shorts_leg_L', legL, 637, 523, 621, 631)):
        rings = []
        for row, c0, c1, ry in rows:
            rings.append(_ring(k, row, c0, c1, ry, sq=2.4 if row < 570 else 2.2))
        last = rows[-1]
        rings.append(_ring(k, last[0], last[1], last[2], last[3], sq=2.2,
                           zfn=opening(o_col, i_col, o_row, i_row)))
        k.loft(name, rings, k.SHORTS, cap_start=False, cap_end=True)
