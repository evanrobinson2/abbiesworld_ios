"""D2 chest: torso from trapezius to just above the tank-top hem, huge faceted deltoids, tank top with thin straps
and a scoop neckline. First chunk of arm D2: it sets the figure's mass and scale (crown at z = 2.0)."""
import math
import numpy as np

# Torso cross-sections from the reference: (row, col of his right side, col of his left side, half depth m, y centre)
PROFILE = [
    (163, 468, 558, 0.075, 0.03),   # neck base / trapezius top (head chunk sits on this)
    (178, 430, 598, 0.13, 0.03),    # trapezius slope
    (200, 398, 632, 0.17, 0.02),    # shoulder line under the delts
    (240, 392, 640, 0.195, 0.01),   # upper pecs
    (290, 394, 642, 0.21, 0.0),     # pecs
    (335, 404, 636, 0.19, 0.0),     # armpits / lats
    (400, 419, 620, 0.175, 0.0),    # waist
    (462, 414, 616, 0.17, 0.0),     # just above the hem band (hips chunk owns the hem)
]
N = 24


def _rows_to_z(k, row):
    return k.px(512, row)[1]


def _section(k, z):
    """Interpolated torso section at height z: (xR, xL, half depth, y centre)."""
    zs = [_rows_to_z(k, p[0]) for p in PROFILE]  # descending
    xr = [k.px(p[1], p[0])[0] for p in PROFILE]
    xl = [k.px(p[2], p[0])[0] for p in PROFILE]
    d = [p[3] for p in PROFILE]; yc = [p[4] for p in PROFILE]
    zz = zs[::-1]
    f = lambda arr: float(np.interp(z, zz, arr[::-1]))
    return f(xr), f(xl), f(d), f(yc)


def _pt(k, a, z, grow=0.0):
    xr, xl, d, yc = _section(k, z)
    cx = (xr + xl) / 2; hw = (xl - xr) / 2
    c, s = math.cos(a), math.sin(a)
    # superellipse for the blocky, slab-sided torso
    e = 0.7
    sx = math.copysign(abs(c) ** e, c); sy = math.copysign(abs(s) ** e, s)
    y = yc + (d + grow) * sy
    if s < 0:  # pec plane flattening at the front, slight sternum groove
        y -= 0.012 * (1 - abs(c)) * (1 if abs(c) > 0.15 else 0.4)
    return np.array([cx + (hw + grow) * sx, y, z])


def build(k):
    z_top = _rows_to_z(k, PROFILE[0][0]); z_bot = _rows_to_z(k, PROFILE[-1][0])
    angs = [-math.pi / 2 + 2 * math.pi * i / N for i in range(N)]

    # skin torso (visible above the neckline, under the straps and at the armholes)
    rings = []
    for p in PROFILE:
        z = _rows_to_z(k, p[0])
        rings.append([_pt(k, a, z) for a in angs])
    k.loft('torso', rings, k.SKIN, cap_start=True, cap_end=True)

    # tank top body: top edge follows the scoop neckline at the front, the armholes at the sides, high at the back
    def top_row(a):
        c, s = math.cos(a), math.sin(a)
        if abs(c) > 0.86:
            return 330.0                       # armhole down to the armpit
        if s < 0:                               # front
            u = abs(c) / 0.62
            return 272.0 - 75.0 * min(u, 1.0) ** 2 if u <= 1 else 197.0
        return 210.0                            # back
    levels = 9
    shell = []
    for t in np.linspace(0, 1, levels):
        ring = []
        for a in angs:
            zt = _rows_to_z(k, top_row(a))
            z = zt + (z_bot - 0.01 - zt) * t
            ring.append(_pt(k, a, z, grow=0.012))
        shell.append(ring)
    k.loft('tank_top_body', shell, k.TANK_TOP)

    # neckline binding along the scoop
    front = [a for a in angs if math.sin(a) < 0 and abs(math.cos(a)) <= 0.62]
    front.sort(key=lambda a: math.cos(a))
    rim = [_pt(k, a, _rows_to_z(k, top_row(a)), grow=0.016) for a in front]
    k.tube('tank_neckline', rim, 0.006, 5, k.TANK_TOP)

    # straps: from the neckline corners up over the trapezius to the back
    for side, col_f in (('R', 437), ('L', 627)):
        sgn = -1 if side == 'R' else 1
        x0, _ = k.px(col_f, 197)
        pts = []
        for row, yy in ((205, None), (180, None), (166, 0.0), (180, 'b'), (215, 'b')):
            x, z = k.px(col_f + sgn * (0 if row > 175 else 6), row)
            xr, xl, d, yc = _section(k, z)
            if yy is None:
                y = yc - d - 0.016
            elif yy == 'b':
                y = yc + d + 0.016
            else:
                y = yc
            pts.append((x, y, z))
        k.tube('tank_strap_' + side, pts, 0.012, 5, k.TANK_TOP)

    # deltoids: big faceted caps, his left reads wider (three-quarter turn)
    for side, col, row, rx, rz, ry in (('R', 374, 248, 0.12, 0.15, 0.15), ('L', 670, 250, 0.155, 0.15, 0.16)):
        cx, cz = k.px(col, row)
        prof = [(-1.0, 0.25), (-0.6, 0.85), (0.05, 1.0), (0.6, 0.82), (1.0, 0.2)]
        drings = []
        for fz, fr in prof:
            r = max(fr, 0.08)
            drings.append(k.ring(rx * r, ry * r, cz + rz * fz, 6, cx=cx, cy=0.0))
        o = k.loft('deltoid_' + side, drings, k.SKIN, cap_start=True, cap_end=True)
        # lean the cap: top tucks in toward the neck
        for v in o.data.vertices:
            h = (v.co.z - cz) / rz
            v.co.x += (-1 if side == 'L' else 1) * 0.03 * max(h, 0)
        k.jitter(o, 0.011, seed=3 if side == 'R' else 4)
