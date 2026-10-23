"""Arm C, chunk 2 of 6: chest and shoulders (tank top body, neckline, straps, pecs, deltoids, upper back).

Builds onto runs/C/head.py: its neck_trapezius ends at row 200 spanning cols 402-656 (front y -0.118, back 0.125),
so the torso starts at row 196 just inside that ring. Landmarks from ref/bruiser.png:
  torso sides: cols 400-640 at the pecs (rows 220-300), 415-612 at the waist (rows 380-450); the hem (hips) starts ~row 455.
  pec shelf (lower pec line) row ~300; scoop neckline U from (440,152) down to its bottom (490,275) up to (622,158).
  deltoids: his right (image left) cols 330-435 rows 175-305; his left cols 598-737 rows 160-305 (body turned a little).
"""
import math

import numpy as np


def _ring12(k, cl, cr, yf, yb, z, c, pec, groove, xm):
    """Torso section: chamfered box with two pec bulges and a sternum groove (12 points, same order every ring)."""
    xl, xr = k.px(cl, 300)[0], k.px(cr, 300)[0]
    pl = xm + (xl - xm) * 0.48
    pr = xm + (xr - xm) * 0.48
    return np.array([
        (xm, yf + groove, z), (pr, yf - pec, z), (xr - c, yf + 0.25 * c, z), (xr, yf + c * 1.3, z),
        (xr, yb - c, z), (xr - c, yb, z), (xm, yb + 0.006, z), (xl + c, yb, z), (xl, yb - c, z),
        (xl, yf + c * 1.3, z), (xl + c, yf + 0.25 * c, z), (pl, yf - pec, z)])


def _blob(k, name, cx, cy, cz, rx, ry, rz, mat, n=8, m=6, tilt=0.0, squash_top=0.75, seed=0):
    """A faceted ellipsoid (low-res, flat planes), optionally rolled about Y by tilt radians."""
    rng = np.random.default_rng(seed)
    rings = []
    for i in range(1, m):
        t = math.pi * i / m
        z = -math.cos(t)
        r = math.sin(t)
        if z > 0:
            z *= squash_top
        a = np.linspace(0, 2 * math.pi, n, endpoint=False) + (math.pi / n) * (i % 2)
        pts = np.c_[r * np.cos(a) * rx, r * np.sin(a) * ry, np.full(n, z * rz)]
        pts *= 1.0 + rng.uniform(-0.08, 0.08, (n, 1))
        rings.append(pts)
    verts = np.concatenate(rings + [np.array([[0, 0, -rz]]), np.array([[0, 0, rz * squash_top]])])
    nr = len(rings)
    faces = []
    for i in range(nr - 1):
        for j in range(n):
            a, b = i * n + j, i * n + (j + 1) % n
            c, d = (i + 1) * n + (j + 1) % n, (i + 1) * n + j
            faces.append((a, b, c, d))
    bot, top = nr * n, nr * n + 1
    for j in range(n):
        faces.append((bot, (j + 1) % n, j))
        faces.append((top, (nr - 1) * n + j, (nr - 1) * n + (j + 1) % n))
    ct, st = math.cos(tilt), math.sin(tilt)
    x, z = verts[:, 0].copy(), verts[:, 2].copy()
    verts[:, 0] = ct * x - st * z
    verts[:, 2] = st * x + ct * z
    verts += [cx, cy, cz]
    return k.mesh(name, verts, faces, mat)


def build(k):
    xm = k.px(516, 300)[0]

    def z(row):
        return k.px(516, row)[1]

    # ---- torso: the tank-top body from the trapezius ring down to the hem line ----
    # (row, left col, right col, front y, back y, chamfer, pec proud, sternum groove)
    spec = [
        (197, 410, 636, -0.124, 0.120, 0.050, 0.000, 0.000),
        (215, 402, 640, -0.146, 0.135, 0.055, 0.008, 0.004),
        (245, 396, 641, -0.158, 0.142, 0.060, 0.018, 0.006),
        (280, 396, 641, -0.162, 0.145, 0.060, 0.020, 0.004),
        (302, 400, 640, -0.150, 0.145, 0.060, 0.010, 0.000),
        (318, 404, 638, -0.138, 0.142, 0.060, 0.000, 0.000),
        (350, 410, 630, -0.140, 0.138, 0.058, 0.000, 0.000),
        (390, 415, 614, -0.142, 0.132, 0.055, 0.000, 0.000),
        (430, 416, 607, -0.140, 0.128, 0.052, 0.000, 0.000),
        (458, 414, 613, -0.138, 0.128, 0.050, 0.000, 0.000),
    ]
    rings = [_ring12(k, cl, cr, yf, yb, z(row), c, pec, gr, xm) for row, cl, cr, yf, yb, c, pec, gr in spec]
    k.loft('tank_top_body', rings, k.TANK_TOP, cap_start=True, cap_end=True)

    rows_s = np.array([sp[0] for sp in spec], float)

    def front_y(row, col):
        """Depth of the built front surface at a ref pixel (torso below row 198, head's trapezius above)."""
        x = k.px(col, row)[0]
        if row < 198:
            return float(np.interp(row, [140, 152, 166, 182, 198], [-0.048, -0.060, -0.080, -0.100, -0.120])) - 0.004
        prm = [np.interp(row, rows_s, [sp[i] for sp in spec]) for i in range(1, 8)]
        r = _ring12(k, *prm[:4], 0.0, prm[4], prm[5], prm[6], xm)
        fr = r[[9, 10, 11, 0, 1, 2, 3]]
        return float(np.interp(x, fr[:, 0], fr[:, 1]))

    # ---- scoop neckline trim: a raised band along the U, over the shoulders toward the back ----
    U = [(441, 166), (438, 190), (440, 225), (452, 252), (470, 268), (492, 276), (515, 274), (540, 266),
         (563, 249), (582, 226), (600, 198), (614, 174), (622, 160)]
    trim = [(k.px(c, r)[0], front_y(r, c) - 0.004, k.px(c, r)[1]) for c, r in U]
    xl0, zl0 = k.px(445, 160); xr0, zr0 = k.px(626, 154)
    trim = [(xl0, 0.030, zl0), (xl0, -0.035, zl0)] + trim + [(xr0, -0.030, zr0), (xr0, 0.030, zr0)]
    k.tube('tank_neckline_trim', trim, 0.0055, 5, k.TANK_TOP)

    # ---- straps' outer (armhole) edges: over the shoulder, down beside the delts to the armpit ----
    armR = [(456, 166, 0.030), (456, 166, -0.060), (432, 180, -0.110), (416, 215, -0.135), (405, 260, -0.140),
            (402, 300, -0.120), (412, 330, -0.090)]
    armL = [(606, 160, 0.030), (606, 160, -0.070), (598, 200, -0.135), (592, 250, -0.150), (591, 300, -0.142),
            (604, 330, -0.128), (632, 344, -0.105)]
    for nm, pts in (('tank_strap_R', armR), ('tank_strap_L', armL)):
        p = [(k.px(c, r)[0], y, k.px(c, r)[1]) for c, r, y in pts]
        k.tube(nm, p, 0.0055, 5, k.TANK_TOP)

    # ---- deltoids: huge faceted caps on each shoulder ----
    # his right (image left): cols 330-435, rows 175-305
    x, zz = k.px(384, 240)
    _blob(k, 'deltoid_R', x, -0.005, zz, 0.115, 0.130, 0.140, k.SKIN, n=8, m=6, tilt=math.radians(-14), squash_top=0.8, seed=11)
    # his left (image right): cols 598-737, rows 160-305
    x, zz = k.px(668, 234)
    _blob(k, 'deltoid_L', x, -0.005, zz, 0.150, 0.140, 0.155, k.SKIN, n=8, m=6, tilt=math.radians(12), squash_top=0.8, seed=12)

    # ---- upper back: trapezius-to-lats wedge behind the shoulder blades ----
    back = []
    for row, cl, cr, yb in [(198, 430, 620, 0.120), (240, 410, 635, 0.150), (300, 412, 632, 0.150), (340, 420, 625, 0.140)]:
        xl, xr = k.px(cl, row)[0], k.px(cr, row)[0]
        zz = z(row)
        back.append([(xl, 0.06, zz), (xl + 0.04, yb, zz), (xm, yb + 0.010, zz), (xr - 0.04, yb, zz), (xr, 0.06, zz)])
    k.loft('upper_back', back, k.SKIN, closed=False)
