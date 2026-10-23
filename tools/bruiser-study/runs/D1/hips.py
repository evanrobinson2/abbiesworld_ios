"""D1 hips: tank-top hem band, shorts with two leg openings, crotch.

Second chunk of arm D1, built onto legs.py: the shorts' leg tubes sit just outside the thigh rings that legs.py
lofts from row 585 down, so the openings overlap the thighs. Widths are measured row by row from the reference
silhouette; the hem band is tilted (higher at image-right) and dips at the front, as in the picture.
"""
import math

import numpy as np

N = 12


def _ring(k, l, r, row, ry_frac, cy=0.0, front_flat=0.85, dz_front=0.0, n=N, p=0.7):
    """A faceted elliptical ring spanning pixel columns l..r at `row`; front (-y) side slightly flattened.
    dz_front lowers the front of the ring (metres), for the dipping hem and leg openings."""
    xl, z = k.px(l, row)
    xr, _ = k.px(r, row)
    cx = (xl + xr) / 2
    rx = (xr - xl) / 2
    ry = rx * ry_frac
    a = np.linspace(0, 2 * math.pi, n, endpoint=False) + math.pi / n
    s = np.sin(a)
    c = np.cos(a)
    se = np.sign(s) * np.abs(s) ** p          # superellipse: boxy hips with flat facets, not a round tube
    ce = np.sign(c) * np.abs(c) ** p
    y = cy + ry * se * np.where(s < 0, front_flat, 1.0)
    zz = z - dz_front * np.clip(-s, 0, 1)
    return np.c_[cx + rx * ce, y, zz]


def build(k):
    # --- shorts waist and seat: one loft from under the hem to just below the crotch -------------------------
    # (row, l, r, depth fraction): the seat tapers in depth toward the crotch so its bottom tucks inside the
    # leg tubes and the front reads as one surface flowing into the legs, not a skirt edge.
    waist = [(476, 410, 619, 0.64), (496, 408, 620, 0.64), (520, 406, 621, 0.6), (544, 410, 618, 0.5),
             (562, 425, 605, 0.42)]
    rings = [_ring(k, l, r, row, f, cy=0.015) for row, l, r, f in waist]
    # crotch: the seat's lower ring pulls up at the front centre into a soft V between the leg tubes
    last = rings[-1]
    cx0 = last[:, 0].mean()
    front = (last[:, 1] < 0) & (np.abs(last[:, 0] - cx0) < 0.08)
    last[front, 2] += 0.02
    k.loft('shorts_seat', rings, k.SHORTS, cap_start=True, cap_end=True)

    # --- leg tubes: from the crotch down to the openings (his right hangs to ~row 620, his left to ~632) ------
    right = [(505, 420, 512), (548, 401, 517), (575, 398, 517), (600, 397, 515), (621, 398, 512)]
    left = [(505, 518, 610), (548, 516, 626), (575, 519, 630), (605, 523, 634), (633, 527, 633)]
    for name, rows in (('shorts_leg_R', right), ('shorts_leg_L', left)):
        rr = [_ring(k, l, r, row, 0.86 if row > 520 else 0.6, cy=0.0, front_flat=1.0, n=10) for row, l, r in rows]
        k.loft(name, rr, k.SHORTS, cap_start=False, cap_end=False)
        # leg opening hem: a slightly proud band at the bottom edge
        row, l, r = rows[-1]
        hem = [_ring(k, l - 2, r + 2, row - 6, 0.84, front_flat=1.0, n=10),
               _ring(k, l - 2, r + 2, row, 0.84, front_flat=1.0, n=10)]
        k.loft(name + '_hem', hem, k.SHORTS, cap_start=False, cap_end=False)

    # --- tank top lower body and hem band ---------------------------------------------------------------------
    # The band is tilted: top edge rows 452 (image-left) .. 445 (image-right), bottom 471 .. 463, and it dips
    # about 18 px at the front centre. Build it from rings whose front is lowered.
    dip = 18 * 0.00214
    body = [_ring(k, 417, 612, 432, 0.62, cy=0.0), _ring(k, 414, 614, 450, 0.63, cy=0.0, dz_front=dip * 0.8)]
    k.loft('tank_top_lower', body, k.TANK_TOP, cap_start=False, cap_end=False)
    band = [_ring(k, 412, 617, 452, 0.66, cy=0.0, dz_front=dip),
            _ring(k, 410, 619, 461, 0.68, cy=0.0, dz_front=dip),
            _ring(k, 411, 618, 470, 0.66, cy=0.0, dz_front=dip)]
    hem = k.loft('tank_hem_band', band, k.TANK_TOP, cap_start=False, cap_end=True)
    # tilt the hem: image-right side rides higher than image-left (~7 px across the body)
    import bpy  # noqa: F401
    for o in (hem,):
        for v in o.data.vertices:
            v.co.z += (v.co.x) * (7 * 0.00214 / 0.44)
