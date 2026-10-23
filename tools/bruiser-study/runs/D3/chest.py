"""D3 step 1: chest and shoulders, big masses only. Sets the figure's scale for the rest of arm D3.

Landmarks (reference pixels): neck base row ~158, trapezius slope to the shoulders at row ~195, deltoid caps rows
185-305 (his right outer col 328, his left outer col 738), armpits row ~335, torso cols ~395-640 at the chest
tapering to ~418-612 at row 490 where the hips chunk takes over. Body centre col ~515.
"""
import numpy as np

CX_COL = 515


def _ring_px(k, row, c0, c1, ry, n, cy=0.0, flat=0.0):
    """A faceted ring whose silhouette spans cols c0..c1 at a reference row; flat squares the front/back."""
    (x0, z), (x1, _) = k.px(c0, row), k.px(c1, row)
    cx, rx = (x0 + x1) / 2, (x1 - x0) / 2
    a = np.linspace(0, 2 * np.pi, n, endpoint=False) + np.pi / n
    c, s = np.cos(a), np.sin(a)
    if flat:
        c = np.sign(c) * np.abs(c) ** (1 - flat)
        s = np.sign(s) * np.abs(s) ** (1 - flat)
    return np.c_[cx + rx * c, cy + ry * s, np.full(n, z)]


def _blob(k, name, ccol, crow, rx, ry, rz, mat, n=8, rings=6, tilt=0.0):
    """A low-poly ellipsoid (faceted deltoid cap)."""
    cx, cz = k.px(ccol, crow)
    rs = []
    for t in np.linspace(-0.92, 0.92, rings):
        f = np.sqrt(1 - t * t)
        r = k.ring(rx * f, ry * f, cz + rz * t, n, cx=cx + tilt * t * rx)
        rs.append(r)
    return k.loft(name, rs, mat, cap_start=True, cap_end=True)


def build(k):
    # Torso: tank-top lower body (row 490 up to the armpits), then bare upper chest / traps to the neck base.
    # (row, col_left, col_right, half-depth)
    lower = [
        (490, 424, 606, 0.150),
        (450, 420, 610, 0.155),
        (400, 414, 620, 0.165),
        (340, 400, 640, 0.180),
        (290, 390, 645, 0.185),
    ]
    upper = [
        (290, 390, 645, 0.185),
        (235, 392, 640, 0.175),
        (200, 398, 636, 0.150),
        (178, 428, 604, 0.120),
        (160, 456, 576, 0.095),
    ]
    n = 12
    k.loft('torso_tank', [_ring_px(k, *r, n, flat=0.25) for r in lower], k.TANK_TOP)
    k.loft('chest_upper', [_ring_px(k, *r, n, flat=0.25) for r in upper], k.SKIN, cap_end=True)

    # Huge faceted deltoids. His right is on the image's left.
    # Faceted caps traced from the silhouette: (row, col_in/out pair, half-depth).
    delt_R = [(183, 365, 425, 0.07), (205, 346, 432, 0.12), (250, 328, 428, 0.14),
              (290, 332, 418, 0.13), (312, 352, 405, 0.08)]
    delt_L = [(183, 600, 688, 0.07), (205, 598, 716, 0.12), (250, 608, 738, 0.14),
              (290, 618, 735, 0.13), (314, 650, 718, 0.08)]
    for name, rows in (('deltoid_R', delt_R), ('deltoid_L', delt_L)):
        k.loft(name, [_ring_px(k, r, a, b, d, 8, cy=0.01, flat=0.2) for r, a, b, d in rows], k.SKIN,
               cap_start=True, cap_end=True)

    # Pecs: shallow faceted slabs under the tank top front.
    for side, c in (('R', 465), ('L', 568)):
        _blob(k, f'pec_{side}', c, 268, 0.11, 0.05, 0.065, k.TANK_TOP, n=8, rings=4)
    import bpy
    for side in ('R', 'L'):
        p = bpy.data.objects[f'pec_{side}']
        p.location.y -= 0.125
