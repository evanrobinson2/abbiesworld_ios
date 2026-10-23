"""D3 step 2: hips and shorts. Builds under the chest's tank-top torso (which ends at row 490, cols 424-606).

Landmarks (reference pixels): tank-top hem band rows ~448-472 at the sides, dipping to ~490 at the front centre,
cols ~414-613; shorts waist cols ~410-614 at row 475, widening to ~398-632 at the leg openings; crotch at
(col ~505, row ~560); his right leg opening cols 397-505 rows 615-628, his left 531-635 rows 621-632.
"""
import numpy as np


def _ring_px(k, row, c0, c1, ry, n, cy=0.0, flat=0.0, front_drop=0.0):
    """A faceted ring spanning cols c0..c1 at a reference row; flat squares it; front_drop lowers the front (m)."""
    (x0, z), (x1, _) = k.px(c0, row), k.px(c1, row)
    cx, rx = (x0 + x1) / 2, (x1 - x0) / 2
    a = np.linspace(0, 2 * np.pi, n, endpoint=False) + np.pi / n
    c, s = np.cos(a), np.sin(a)
    if flat:
        c = np.sign(c) * np.abs(c) ** (1 - flat)
        s = np.sign(s) * np.abs(s) ** (1 - flat)
    zz = np.full(n, z) - front_drop * np.clip(-s, 0, None) ** 2
    return np.c_[cx + rx * c, cy + ry * s, zz]


def _dz(k, rows):
    return k.px(0, 0)[1] - k.px(0, rows)[1]


def build(k):
    n = 12
    drop = _dz(k, 16)
    # Tank-top hem band: a slightly proud ring with a lip, the front dipping lower like the reference.
    hem = [
        (446, 418, 610, 0.150, 0.0),
        (449, 413, 614, 0.163, drop),
        (468, 412, 615, 0.164, drop),
        (472, 416, 611, 0.152, drop),
    ]
    k.loft('tank_hem_band', [_ring_px(k, r, a, b, d, n, flat=0.25, front_drop=f) for r, a, b, d, f in hem],
           k.TANK_TOP)

    # Shorts: waist and seat down to the crotch.
    seat = [
        (462, 414, 612, 0.148),
        (500, 406, 621, 0.152),
        (535, 401, 627, 0.155),
        (558, 399, 631, 0.150),
    ]
    k.loft('shorts_seat', [_ring_px(k, *r, n, flat=0.25) for r in seat], k.SHORTS, cap_start=True, cap_end=True)

    # Crotch: a shallow wedge closing the seat between the legs.
    k.loft('shorts_crotch', [_ring_px(k, 558, 470, 545, 0.120, 8, flat=0.2),
                             _ring_px(k, 572, 490, 525, 0.095, 8, flat=0.2),
                             _ring_px(k, 586, 500, 515, 0.050, 8, flat=0.2)], k.SHORTS, cap_end=True)

    # Shorts legs with open hems: (row, col_out/col_in, half-depth).  His right is the image's left.
    leg_R = [(545, 400, 514, 0.120), (590, 396, 509, 0.118), (622, 393, 505, 0.115)]
    leg_L = [(545, 514, 631, 0.120), (590, 522, 636, 0.118), (626, 530, 639, 0.115)]
    for name, rows in (('shorts_leg_R', leg_R), ('shorts_leg_L', leg_L)):
        rings = [_ring_px(k, r, a, b, d, 10, cy=0.005, flat=0.2) for r, a, b, d in rows]
        # Leg opening slightly thickened: an inner lip ring just inside the hem so the opening reads as cloth.
        last = rings[-1]
        cx = last[:, 0].mean()
        lip = last.copy()
        lip[:, 0] = cx + (lip[:, 0] - cx) * 0.9
        lip[:, 1] = 0.005 + (lip[:, 1] - 0.005) * 0.9
        rings.append(lip)
        k.loft(name, rings, k.SHORTS)
