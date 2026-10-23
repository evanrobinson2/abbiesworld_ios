"""Arm C, chunk 1 of 6: head and neck of the bruiser. Sets the figure's scale (2.0 m, crown at z = 2.0).

Landmarks measured from ref/bruiser.png (pixel rows/cols, via k.px):
  crown row 53, skull cols 484-555 (centre col 519), brow ridge rows 89-100, nose tip row 117,
  mouth row 128, chin bottom row 165, ears cols 546-556 rows 90-110. The head is turned about 12 degrees
  toward his right (nose at col 506), so the head parts are yawed; the neck and trapezius are not.
Neck and traps widen from cols 490-560 at row 130 to 400-650 at row 200 where the chest chunk takes over.
"""
import math

import numpy as np

YAW = math.radians(-12.0)    # head turned toward his right (image left)
HEAD_COL = 522.0


def _z(k, row):
    return k.px(HEAD_COL, row)[1]


def _x(k, col):
    return k.px(col, 100)[0]


def _ring10(xl, xr, yf, yb, z, c, bulge_f=0.0, bulge_b=0.0, xm=None):
    """A chamfered box section with a centre point front and back (10 points, same order every ring)."""
    xm = (xl + xr) / 2 if xm is None else xm
    return np.array([
        (xm, yf - bulge_f, z), (xr - c, yf, z), (xr, yf + c, z), (xr, yb - c, z), (xr - c, yb, z),
        (xm, yb + bulge_b, z), (xl + c, yb, z), (xl, yb - c, z), (xl, yf + c, z), (xl + c, yf, z)])


def _yaw(pts, x0):
    pts = np.asarray(pts, float).copy()
    c, s = math.cos(YAW), math.sin(YAW)
    x = pts[..., 0] - x0; y = pts[..., 1].copy()
    pts[..., 0] = x0 + c * x - s * y
    pts[..., 1] = s * x + c * y
    return pts


def build(k):
    x0 = _x(k, HEAD_COL)

    # ---- skull block: crown to chin, faceted ----
    # (row, half width px, front y, back y, chamfer m, front bulge)
    spec = [
        (55, 18, -0.050, 0.052, 0.010, 0.000),
        (59, 25, -0.074, 0.076, 0.016, 0.002),
        (67, 30, -0.084, 0.086, 0.020, 0.004),
        (80, 32, -0.089, 0.089, 0.020, 0.006),
        (95, 33, -0.090, 0.086, 0.018, 0.006),
        (108, 31, -0.086, 0.076, 0.018, 0.006),
        (122, 32, -0.088, 0.062, 0.018, 0.008),
        (138, 31, -0.090, 0.040, 0.016, 0.008),
        (155, 22, -0.090, 0.004, 0.012, 0.006),
        (165, 15, -0.082, -0.022, 0.008, 0.004),
    ]
    rings = []
    for row, hw, yf, yb, c, bf in spec:
        w = hw / k.stage.PX_PER_M
        rings.append(_yaw(_ring10(x0 - w, x0 + w, yf, yb, _z(k, row), c, bf, 0.006), x0))
    k.loft('skull', rings, k.SKIN, cap_start=True, cap_end=True)

    def part(name, verts, faces):
        v = np.asarray(verts, float); v[:, 0] += x0
        return k.mesh(name, _yaw(v, x0), faces, k.SKIN)

    def loft_local(name, rngs, cap_s=True, cap_e=True):
        out = []
        for r in rngs:
            r = np.asarray(r, float).copy(); r[:, 0] += x0
            out.append(_yaw(r, x0))
        return k.loft(name, out, k.SKIN, cap_start=cap_s, cap_end=cap_e)

    # ---- heavy brow ridge: triangular section swept across the forehead, notched at the centre ----
    zt, zb = _z(k, 88), _z(k, 100)
    brow = []
    for x, proud, drop in [(-0.062, 0.000, 0.004), (-0.050, 0.024, 0.0), (-0.024, 0.030, 0.0), (-0.007, 0.020, 0.002),
                           (0.007, 0.020, 0.002), (0.024, 0.030, 0.0), (0.050, 0.024, 0.0), (0.062, 0.000, 0.004)]:
        brow.append([(x, -0.084, zt), (x, -0.090 - proud, zb + 0.004 - drop), (x, -0.084, zb - 0.004 - drop)])
    loft_local('brow', brow)

    # ---- eye slits: small lids tucked under the brow ----
    ze = _z(k, 101)
    for side, nm in ((-1, 'eyelid_R'), (1, 'eyelid_L')):
        xs = [side * 0.012, side * 0.024, side * 0.040, side * 0.052]
        v = [(xs[0], -0.091, ze + 0.002), (xs[1], -0.095, ze + 0.003), (xs[2], -0.094, ze + 0.003), (xs[3], -0.088, ze + 0.001),
             (xs[0], -0.088, ze - 0.004), (xs[1], -0.091, ze - 0.004), (xs[2], -0.090, ze - 0.004), (xs[3], -0.085, ze - 0.003)]
        f = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6)]
        if side > 0:
            f = [tuple(reversed(q)) for q in f]
        part(nm, v, f)

    # ---- nose: a faceted wedge from the brow notch to the tip ----
    def nring(w, yf, yb, z):
        return [(-w, yb, z), (-w * 0.55, yf, z), (0, yf - 0.003, z), (w * 0.55, yf, z), (w, yb, z)]
    loft_local('nose', [nring(0.007, -0.098, -0.088, _z(k, 97)), nring(0.010, -0.108, -0.089, _z(k, 104)),
                        nring(0.016, -0.128, -0.090, _z(k, 113)), nring(0.020, -0.128, -0.091, _z(k, 118)),
                        nring(0.020, -0.104, -0.092, _z(k, 121))])

    # ---- cheek planes and the boxy muzzle (nose to chin) ----
    zm0, zm1 = _z(k, 118), _z(k, 160)
    muzzle = []
    for z, w, yf in [(zm0, 0.038, -0.090), (_z(k, 127), 0.040, -0.097), (_z(k, 140), 0.038, -0.099),
                     (_z(k, 152), 0.034, -0.098), (zm1, 0.026, -0.090)]:
        muzzle.append([(-w, -0.080, z), (-w + 0.008, yf, z), (0, yf - 0.002, z), (w - 0.008, yf, z), (w, -0.080, z)])
    loft_local('muzzle', muzzle)

    # ---- stern mouth: a downturned upper lip ridge and a lower lip shelf ----
    zmo = _z(k, 128)
    lip = [(-0.030, -0.096, zmo - 0.006), (-0.017, -0.101, zmo), (0.0, -0.102, zmo + 0.001),
           (0.017, -0.101, zmo), (0.030, -0.096, zmo - 0.006)]
    k.tube('upper_lip', _yaw(np.asarray(lip) + [x0, -0.002, 0], x0), 0.0045, 5, k.SKIN)
    low = [(-0.020, -0.100, zmo - 0.010), (0.0, -0.103, zmo - 0.009), (0.020, -0.100, zmo - 0.010)]
    k.tube('lower_lip', _yaw(np.asarray(low) + [x0, 0, 0], x0), 0.003, 5, k.SKIN)

    # ---- square chin block ----
    zc0, zc1 = _z(k, 145), _z(k, 166)
    v = [(-0.030, -0.088, zc0), (0.030, -0.088, zc0), (0.030, -0.104, zc0 - 0.004), (-0.030, -0.104, zc0 - 0.004),
         (-0.026, -0.080, zc1), (0.026, -0.080, zc1), (0.026, -0.098, zc1 + 0.004), (-0.026, -0.098, zc1 + 0.004)]
    f = [(0, 1, 2, 3), (3, 2, 6, 7), (7, 6, 5, 4), (0, 3, 7, 4), (1, 5, 6, 2), (0, 4, 5, 1)]
    part('chin', v, f)

    # ---- ears: flat faceted plates on the sides of the skull ----
    ze0, ze1 = _z(k, 89), _z(k, 111)
    for side, nm in ((-1, 'ear_R'), (1, 'ear_L')):
        xa, xb = side * 0.072, side * 0.082
        v = [(xa, -0.010, ze0), (xb, 0.000, ze0 - 0.002), (xb, 0.016, ze0 - 0.006), (xa, 0.020, ze0 - 0.004),
             (xa, -0.006, ze1), (xb, 0.000, ze1 + 0.004), (xb, 0.010, ze1 + 0.006), (xa, 0.012, ze1 + 0.004)]
        f = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        part(nm, v, f)

    # ---- neck and trapezius: from under the jaw out to the shoulder line (chest chunk takes over at row 200) ----
    # (row, left col, right col, front y, back y, chamfer, front bulge)
    nspec = [
        (125, 494, 548, -0.040, 0.050, 0.014, 0.000),
        (140, 478, 586, -0.048, 0.070, 0.020, 0.004),
        (152, 455, 608, -0.060, 0.085, 0.028, 0.008),
        (166, 432, 636, -0.080, 0.100, 0.036, 0.010),
        (182, 410, 652, -0.100, 0.115, 0.045, 0.012),
        (200, 402, 656, -0.118, 0.125, 0.050, 0.012),
    ]
    nr = []
    for row, cl, cr, yf, yb, c, bf in nspec:
        z = _z(k, row)
        nr.append(_ring10(_x(k, cl), _x(k, cr), yf, yb, z, c, bf, 0.008, xm=x0))
    k.loft('neck_trapezius', nr, k.SKIN, cap_start=True, cap_end=True)

    # ---- sternomastoid cords: from behind the ears down to the notch, the V in the front of the neck ----
    for side, nm in ((-1, 'sternomastoid_R'), (1, 'sternomastoid_L')):
        pts = [(x0 + side * 0.052, -0.005, _z(k, 128)), (x0 + side * 0.034, -0.050, _z(k, 150)),
               (x0 + side * 0.014, -0.085, _z(k, 172))]
        k.tube(nm, pts, [0.016, 0.014, 0.010], 6, k.SKIN)
