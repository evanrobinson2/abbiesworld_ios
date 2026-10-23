"""Arm B, chunk hips: tank-top hem band, shorts (waist, seat, crotch, two legs with openings)."""
import math
import numpy as np


def Z(k, row):
    return k.px(516, row)[1]


def X(k, col):
    return k.px(col, 500)[0]


def build(k):
    N = 12
    a = np.linspace(0, 2 * math.pi, N, endpoint=False) + math.pi / N

    def ell(cx, hw, cy, hd, z, front_push=0.0, zfun=None):
        pts = []
        for t in a:
            x = cx + hw * math.cos(t)
            y = cy + hd * math.sin(t)
            if math.sin(t) < 0:          # front half (toward camera, -Y)
                y -= front_push * (-math.sin(t)) ** 2
            zz = z if zfun is None else zfun(x, y)
            pts.append((x, y, zz))
        return np.array(pts)

    # ---- shorts: pelvis from under the hem down to the crotch ----
    # (row, left col, right col, depth half, front push)
    prof = [(458, 415, 615, 0.150, 0.00),
            (480, 409, 621, 0.155, 0.01),
            (510, 404, 624, 0.160, 0.02),
            (540, 401, 624, 0.165, 0.03),
            (565, 398, 630, 0.155, 0.02),
            (585, 396, 633, 0.142, 0.0)]
    rings = []
    for row, c0, c1, hd, fp in prof:
        cx = (X(k, c0) + X(k, c1)) / 2; hw = (X(k, c1) - X(k, c0)) / 2
        rings.append(ell(cx, hw, 0.0, hd, Z(k, row), fp))
    k.loft('shorts_seat', rings, k.SHORTS, cap_start=True, cap_end=True)

    # (No crotch piece: post-run fix 07:00Z, a human in plain shorts has a smooth front. Evan flagged the bulge.)

    # ---- shorts legs: each from inside the seat to a slanted leg opening ----
    # (side, rows [(row, c0, c1)], opening (outer row, inner row))
    legs = {
        'R': [(568, 402, 512), (600, 395, 516), (612, 396, 513)],
        'L': [(568, 521, 628), (600, 522, 636), (618, 527, 637)],
    }
    openings = {'R': (618, 628, 396, 512), 'L': (622, 632, 636, 529)}
    for side, prof_l in legs.items():
        rings = []
        for i, (row, c0, c1) in enumerate(prof_l):
            cx = (X(k, c0) + X(k, c1)) / 2; hw = (X(k, c1) - X(k, c0)) / 2
            rings.append(ell(cx, hw, 0.0, 0.12 if i == 0 else 0.138, Z(k, row), 0.0))
        ro, ri, co, ci = openings[side]
        xo, xi = X(k, co), X(k, ci); zo, zi = Z(k, ro), Z(k, ri)
        cx = (xo + xi) / 2; hw = abs(xi - xo) / 2

        def zf(x, y, xo=xo, xi=xi, zo=zo, zi=zi):
            t = (x - xo) / (xi - xo)
            return zo + (zi - zo) * min(max(t, 0.0), 1.0)
        rings.append(ell(cx, hw, 0.0, 0.13, 0, 0.005, zf))
        # a thin turned-in lip so the opening reads as cloth with thickness
        inner = rings[-1].copy(); inner[:, 0] = cx + (inner[:, 0] - cx) * 0.9; inner[:, 1] *= 0.9
        inner[:, 2] += 0.005
        rings.append(inner)
        k.loft('shorts_leg_' + side, rings, k.SHORTS)

    # ---- tank-top hem band: wraps the waist, dips lower at the front ----
    def band_ring(row_side, row_front, c0, c1, hd, out):
        cx = (X(k, c0) + X(k, c1)) / 2; hw = (X(k, c1) - X(k, c0)) / 2 + out
        zs, zfr = Z(k, row_side), Z(k, row_front)
        M = 16
        b = np.linspace(0, 2 * math.pi, M, endpoint=False)
        pts = []
        for t in b:
            f = max(0.0, -math.sin(t))            # 1 at front centre
            pts.append((cx + hw * math.cos(t), (hd + out) * math.sin(t), zs + (zfr - zs) * f ** 1.5))
        return np.array(pts)
    top = band_ring(449, 470, 415, 613, 0.165, 0.002)
    bot = band_ring(466, 490, 412, 617, 0.165, 0.010)
    top_in = band_ring(449, 470, 415, 613, 0.160, -0.002)
    bot_in = band_ring(466, 490, 412, 617, 0.155, -0.002)
    k.loft('tank_hem_band', [top_in, top, bot, bot_in], k.TANK_TOP, closed=True)
