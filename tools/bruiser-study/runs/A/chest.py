"""Arm A, chunk chest: tank top torso, pecs, huge faceted deltoids, upper back, straps, scoop neckline, hem band.

Landmarks measured on ref/crops/chest.png and mapped to full-frame pixels (ref = 286 + u / 1.574, 116 + v / 1.574).
"""
import math

import numpy as np

CX = 515.0  # figure centre column in the reference


def _xz(col, row):
    import bkit
    return bkit.px(col, row)


def _aring(k, col_l, col_r, row, depth, cy=0.0, n=12, front_flat=0.85):
    """An asymmetric faceted ring: left/right edges from reference columns, half depth in metres."""
    xl, z = _xz(col_l, row)
    xr, _ = _xz(col_r, row)
    cx = (xl + xr) / 2; hw = (xr - xl) / 2
    a = np.linspace(0, 2 * math.pi, n, endpoint=False)
    s = np.sin(a)
    ry = np.where(s < 0, depth * front_flat, depth)
    return np.c_[cx + hw * np.cos(a), cy + ry * s, np.full(n, z)]


def _blob(k, name, col, row, hw_px, hh_px, depth, mat, tilt=0.0, n=10, m=7):
    """A faceted ellipsoid (deltoid), centred on a reference pixel."""
    cx, cz = _xz(col, row)
    x0, _ = _xz(col - hw_px, row); rx = cx - x0
    _, z0 = _xz(col, row + hh_px); rz = cz - z0
    rings = []
    for i in range(1, m):
        t = math.pi * i / m
        zr = -math.cos(t); s = math.sin(t)
        a = np.linspace(0, 2 * math.pi, n, endpoint=False)
        pts = np.c_[rx * s * np.cos(a), depth * s * np.sin(a), np.full(n, rz * zr)]
        rings.append(pts)
    v = np.concatenate(rings + [np.array([[0, 0, -rz]]), np.array([[0, 0, rz]])])
    faces = []
    for r in range(m - 2):
        for i in range(n):
            j = (i + 1) % n
            faces.append((r * n + i, r * n + j, (r + 1) * n + j, (r + 1) * n + i))
    bot = len(v) - 2; top = len(v) - 1
    for i in range(n):
        j = (i + 1) % n
        faces.append((bot, j, i))
        faces.append((top, (m - 2) * n + i, (m - 2) * n + j))
    ct, st = math.cos(tilt), math.sin(tilt)
    v = np.c_[v[:, 0] * ct - v[:, 2] * st, v[:, 1], v[:, 0] * st + v[:, 2] * ct]
    v = v + np.array([cx, 0.0, cz])
    return k.mesh(name, v, faces, mat)


def build(k):
    # --- torso: lower part in the tank top, upper part (shoulders / traps) skin.  (row, col_l, col_r, half depth)
    lower = [
        (470, 418, 614, 0.14),
        (434, 416, 612, 0.15),
        (390, 416, 614, 0.16),
        (351, 404, 626, 0.165),
        (310, 392, 632, 0.17),
        (275, 390, 628, 0.175),
    ]
    k.loft('tank_top_body', [_aring(k, l, r, row, d) for row, l, r, d in lower], k.TANK_TOP, cap_start=True)
    upper = [
        (275, 390, 628, 0.175),
        (240, 388, 630, 0.17),
        (205, 400, 625, 0.15),
        (188, 408, 622, 0.13),
        (174, 425, 620, 0.11),
        (162, 466, 588, 0.085),
        (156, 492, 542, 0.07),
    ]
    k.loft('upper_back_traps', [_aring(k, l, r, row, d) for row, l, r, d in upper], k.SKIN, cap_end=True)

    # --- pecs: two flattened slabs under the scoop neckline
    for side, col in (('R', 480), ('L', 553)):
        _blob(k, f'pec_{side}', col, 268, 38, 30, 0.05, k.SKIN, n=8, m=5).location.y -= 0.10

    # --- huge faceted deltoids (his right is image left)
    _blob(k, 'deltoid_R', 379, 254, 57, 74, 0.13, k.SKIN, tilt=math.radians(-25), n=8, m=4)
    _blob(k, 'deltoid_L', 670, 250, 70, 74, 0.14, k.SKIN, tilt=math.radians(25), n=8, m=4)

    # --- scoop neckline trim (front of chest)
    neck = [(447, 190), (440, 210), (452, 245), (480, 268), (515, 272), (550, 265), (575, 240), (585, 210), (590, 190)]
    pts = [(x, -0.135 - 0.03 * math.sin(math.pi * i / (len(neck) - 1)), z)
           for i, (x, z) in enumerate(_xz(c, r) for c, r in neck)]
    k.tube('tank_neckline', pts, 0.008, 5, k.TANK_TOP, caps=True)

    # --- thin straps over the shoulders, down the back
    for side, c_front, c_top in (('R', 447, 452), ('L', 590, 585)):
        xf, zf = _xz(c_front, 190); xt, zt = _xz(c_top, 182)
        k.tube(f'tank_strap_{side}', [(xf, -0.115, zf), (xt, -0.05, zt - 0.01), (xt, 0.05, zt - 0.015), (xt, 0.12, zf - 0.08)],
               0.012, 5, k.TANK_TOP)

    # --- armhole trims down the sides of the vest
    for side, path in (('R', [(452, 175), (432, 230), (410, 290), (398, 330)]),
                       ('L', [(588, 175), (598, 240), (615, 300), (632, 340)])):
        k.tube(f'tank_armhole_{side}', [(x, -0.13, z) for x, z in (_xz(c, r) for c, r in path)], 0.008, 5, k.TANK_TOP)

    # --- hem band
    hem = [_aring(k, 414, 618, 472, 0.155, n=14), _aring(k, 412, 620, 459, 0.16, n=14)]
    k.loft('tank_hem_band', hem, k.TANK_TOP)
