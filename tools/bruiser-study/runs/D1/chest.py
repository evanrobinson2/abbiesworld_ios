"""D1 chest: tank top (body, front panels with a scoop neckline, thin straps, piping), pecs, traps, huge faceted
delts, upper back.

Third chunk of arm D1, built onto hips.py: the tank body starts at row 432 with the same span and depth as hips'
`tank_top_lower` top ring, then rises row by row along the reference silhouette. Above row 268 the tank splits into
two front panels around the U-shaped scoop (skin of the chest shows inside it) and narrows into thin straps over the
traps. The delts are separate faceted blocks measured from the picture (his left one reads a little larger).
"""
import math

import numpy as np

P = 0.7          # superellipse exponent: boxy torso with flat facets


def _xy(k, l, r, row):
    xl, z = k.px(l, row)
    xr, _ = k.px(r, row)
    return (xl + xr) / 2, (xr - xl) / 2, z


def _ring(k, l, r, row, ryf, cy=0.0, n=16, front_flat=0.85, dz_back=0.0):
    cx, rx, z = _xy(k, l, r, row)
    ry = rx * ryf
    a = np.linspace(0, 2 * math.pi, n, endpoint=False) + math.pi / n
    s, c = np.sin(a), np.cos(a)
    se = np.sign(s) * np.abs(s) ** P
    ce = np.sign(c) * np.abs(c) ** P
    y = cy + ry * se * np.where(s < 0, front_flat, 1.0)
    zz = z + dz_back * np.clip(s, 0, 1)
    return np.c_[cx + rx * ce, y, zz]


# Skin torso under the tank (row, l, r, depth fraction, cy): pecs push forward around rows 220-290.
SKIN_ROWS = [(330, 404, 628, 0.64, 0.0), (300, 398, 634, 0.66, -0.006), (280, 398, 634, 0.68, -0.016),
             (250, 400, 632, 0.68, -0.02), (220, 406, 626, 0.66, -0.014), (195, 416, 620, 0.62, -0.004),
             (183, 420, 626, 0.56, 0.01), (170, 432, 626, 0.5, 0.025), (158, 448, 618, 0.44, 0.035),
             (148, 470, 568, 0.4, 0.04)]

# Tank body rows (row, l, r, depth fraction, cy); 432 matches hips' tank_top_lower top ring.
TANK_ROWS = [(432, 417, 612, 0.62, 0.0), (400, 414, 611, 0.62, 0.0), (370, 412, 622, 0.64, 0.0),
             (340, 404, 630, 0.66, 0.0), (312, 398, 636, 0.68, 0.0), (302, 398, 637, 0.69, -0.008),
             (294, 397, 638, 0.7, -0.03), (268, 396, 638, 0.7, -0.03)]


def _interp_skin(row):
    rows = [r[0] for r in SKIN_ROWS][::-1]
    cols = np.array([r[1:] for r in SKIN_ROWS][::-1], float)
    return [np.interp(row, rows, cols[:, i]) for i in range(4)]


def front_y(k, col, row, off=0.0):
    """y of the skin torso's front surface at reference (col, row), pushed toward the camera by `off`."""
    l, r, ryf, cy = _interp_skin(row)
    cx, rx, _ = _xy(k, l, r, row)
    x, _ = k.px(col, row)
    X = min(abs(x - cx) / rx, 0.97)
    return cy - rx * ryf * 0.85 * (1 - X ** (2 / P)) ** (P / 2) - off


def build(k):
    # --- skin torso: chest showing in the scoop, traps sloping to the neck, upper back -------------------------
    rings = [_ring(k, l, r, row, f, cy) for row, l, r, f, cy in SKIN_ROWS]
    k.loft('torso_skin', rings, k.SKIN, cap_start=True, cap_end=True)

    # --- tank body: closed rings up to the bottom of the scoop; its back rides up to the shoulder blades ---------
    tr = []
    for i, (row, l, r, f, cy) in enumerate(TANK_ROWS):
        dz = 0.0 if row > 300 else 0.13 * (300 - row) / 32
        tr.append(_ring(k, l, r, row, f, cy, dz_back=dz))
    k.loft('tank_top_body', tr, k.TANK_TOP, cap_start=False, cap_end=False)

    # --- front panels: from row 268 up to the straps, inner edge = the scoop, outer edge = the armhole -------------
    # (row, his-right inner, his-right outer, his-left inner, his-left outer)
    PANEL = [(268, 478, 398, 548, 636), (255, 462, 400, 560, 632), (235, 450, 404, 572, 626),
             (210, 442, 410, 583, 618), (190, 438, 422, 594, 612), (178, 437, 428, 604, 618),
             (166, 438, 431, 614, 624)]
    for tag, ii, oo in (('R', 1, 2), ('L', 3, 4)):
        verts, faces = [], []
        m = 4
        for j, rec in enumerate(PANEL):
            row = rec[0]
            for t in np.linspace(0, 1, m):
                col = rec[ii] * (1 - t) + rec[oo] * t
                x, z = k.px(col, row)
                verts.append((x, front_y(k, col, row, 0.012 + 0.006 * (1 - t)), z))
        for j in range(len(PANEL) - 1):
            for i in range(m - 1):
                a = j * m + i
                faces.append((a, a + 1, a + m + 1, a + m))
        o = k.mesh('tank_front_panel_' + tag, verts, faces, k.TANK_TOP)
        k.solidify(o, 0.008)

    # --- straps over the traps to the back, and neckline / armhole piping -------------------------------------------
    for tag, col in (('R', 436), ('L', 621)):
        x0, z0 = k.px(col, 168)
        y0 = front_y(k, col, 168, 0.012)
        _, z1 = k.px(col, 161)
        _, z2 = k.px(col, 159)
        _, z3 = k.px(col, 168)
        _, z4 = k.px(col, 200)
        pts = [(x0, y0, z0), (x0 * 0.99, y0 * 0.5, z1), (x0 * 0.98, 0.03, z2), (x0 * 0.98, 0.11, z3),
               (x0, 0.16, z4)]
        k.tube('tank_strap_' + tag, pts, 0.013, n=5, material=k.TANK_TOP)
    neck = [(437, 170), (438, 190), (443, 215), (452, 240), (466, 260), (490, 272), (515, 274), (538, 270),
            (556, 258), (572, 238), (584, 214), (596, 190), (608, 172), (616, 166)]
    pts = []
    for col, row in neck:
        x, z = k.px(col, row)
        pts.append((x, front_y(k, col, row, 0.024), z))
    k.tube('tank_neckline_piping', pts, 0.008, n=5, material=k.TANK_TOP)
    arm = [(622, 168), (612, 200), (606, 240), (608, 280), (616, 315), (628, 340), (640, 352)]
    pts = []
    for col, row in arm:
        x, z = k.px(col, row)
        pts.append((x, front_y(k, min(col, 630), min(row, 330), 0.016), z))
    k.tube('tank_armhole_piping_L', pts, 0.006, n=5, material=k.TANK_TOP)

    # --- delts: big faceted blocks, lofted top to bottom along the silhouette ---------------------------------------
    # (row, outer, inner) in reference pixels
    DELT_R = [(183, 396, 428), (194, 364, 430), (215, 339, 432), (245, 330, 430), (278, 329, 424), (303, 344, 402)]
    DELT_L = [(181, 642, 668), (193, 614, 702), (214, 608, 724), (245, 608, 737), (278, 614, 737), (305, 640, 722)]
    DEPTH = [0.7, 0.85, 0.98, 1.0, 0.95, 0.8]
    for tag, rows, sgn in (('R', DELT_R, -1), ('L', DELT_L, 1)):
        rr = []
        n = 7
        for i, (row, a, b) in enumerate(rows):
            l, r = min(a, b), max(a, b)
            cx, rx, z = _xy(k, l, r, row)
            ry = rx * DEPTH[i]
            ang = np.linspace(0, 2 * math.pi, n, endpoint=False) + math.pi / n + sgn * i * math.pi / 14
            w = 1 + 0.04 * np.cos(2 * ang + 0.5 * sgn)
            rr.append(np.c_[cx + rx * np.cos(ang) * w, 0.035 + ry * np.sin(ang) * w, np.full(n, z)])
        k.loft('deltoid_' + tag, rr, k.SKIN, cap_start=True, cap_end=True)
