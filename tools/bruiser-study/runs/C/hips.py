"""Arm C, chunk 5 of 6: hips and shorts (tank-top hem band, shorts with leg openings, crotch).

Builds onto runs/C/chest.py: tank_top_body ends at row 458 spanning cols 414-613 (front y -0.138, back 0.128), so
the hem band sits just proud of that ring and the shorts start tucked under it. The arms hang clear of the hips
(arm_R inner edge ~col 362, arm_L inner edge ~col 688 at rows 480-560).
Silhouette edges measured from ref/mask.png (row: left col - right col):
  470: 413-617, 500: 408-621, 530: 404-621, 560: 400-627, 590: 397-632 (one block down to the crotch, row ~597);
  legs 610: 397-514 | 525-634, 630: 399-507 | 529-632. Shorts bottoms: his right ~row 622, his left ~row 630.
Hem band (from the crop): top edge row ~452, bottom edge row ~476 at the sides dipping to ~490 at the front centre.
"""
import numpy as np


def _ring12(xl, xr, yf, yb, z, c, bulge=0.0, drop=0.0, butt=0.0, xm=None):
    """Chamfered hip section (12 points, same order as the chest rings): front centre can bulge forward and drop."""
    xm = (xl + xr) / 2 if xm is None else xm
    hl, hr = xm - xl, xr - xm
    return np.array([
        (xm, yf - bulge, z - drop), (xm + 0.5 * hr, yf - bulge * 0.6, z - drop * 0.6), (xr - c, yf, z - drop * 0.15),
        (xr, yf + c, z), (xr, yb - c, z), (xr - c, yb, z), (xm, yb + butt, z), (xl + c, yb, z), (xl, yb - c, z),
        (xl, yf + c, z), (xl + c, yf, z - drop * 0.15), (xm - 0.5 * hl, yf - bulge * 0.6, z - drop * 0.6)])


def _ring8(xl, xr, cy, hd, z, c=0.24):
    xm, hw = (xl + xr) / 2, (xr - xl) / 2
    yf, yb = cy - hd, cy + hd
    return np.array([
        (xm, yf, z), (xr - hw * c, yf + hd * c, z), (xr, cy, z), (xr - hw * c, yb - hd * c, z),
        (xm, yb, z), (xl + hw * c, yb - hd * c, z), (xl, cy, z), (xl + hw * c, yf + hd * c, z)])


def build(k):
    def X(col, row=540):
        return k.px(col, row)[0]

    def Z(row):
        return k.px(516, row)[1]

    xm = X(516)

    # ---- tank-top hem band: a proud band around the waist, its lower edge dipping at the front ----
    hdrop = (490 - 476) / k.stage.PX_PER_M
    hem = [
        _ring12(X(415), X(612), -0.132, 0.124, Z(450), 0.048, xm=xm),
        _ring12(X(410), X(617), -0.150, 0.136, Z(455), 0.050, 0.004, 0.0, 0.004, xm=xm),
        _ring12(X(409), X(619), -0.152, 0.138, Z(476), 0.050, 0.006, hdrop, 0.004, xm=xm),
        _ring12(X(413), X(616), -0.136, 0.128, Z(479), 0.048, 0.004, hdrop, 0.0, xm=xm),
    ]
    k.loft('tank_hem_band', hem, k.TANK_TOP, cap_start=True, cap_end=True)

    # ---- shorts: pelvis block from under the hem down to the crotch; the last ring's front centre lifts into
    # the crotch V where the two legs part ----
    # (row, left col, right col, front y, back y, chamfer, front bulge, crotch lift (px), butt)
    spec = [
        (468, 414, 615, -0.130, 0.124, 0.048, 0.000, 0, 0.000),
        (500, 408, 621, -0.136, 0.140, 0.052, 0.000, 0, 0.012),
        (530, 404, 622, -0.140, 0.150, 0.055, 0.000, 0, 0.020),
        (552, 401, 626, -0.140, 0.152, 0.056, 0.000, 0, 0.018),
        (574, 402, 627, -0.118, 0.140, 0.060, 0.000, 14, 0.006),
    ]
    rings = [_ring12(X(cl, r), X(cr, r), yf, yb, Z(r), c, bu, -lift / k.stage.PX_PER_M, bt, xm=X(519))
             for r, cl, cr, yf, yb, c, bu, lift, bt in spec]
    k.loft('shorts_pelvis', rings, k.SHORTS, cap_start=True, cap_end=True)

    # ---- shorts legs: one faceted sleeve per thigh, open at the leg opening ----
    # (row, left col, right col, centre y, half depth)
    legR = [(540, 403, 521, 0.000, 0.142), (585, 398, 519, -0.002, 0.144), (602, 397, 516, 0.004, 0.130),
            (613, 397, 513, 0.004, 0.126), (623, 399, 509, 0.004, 0.122)]
    legL = [(540, 517, 624, 0.000, 0.142), (585, 519, 631, -0.002, 0.144), (602, 522, 633, 0.004, 0.130),
            (616, 525, 634, 0.004, 0.126), (631, 529, 632, 0.004, 0.122)]
    for nm, spec_l in (('shorts_leg_R', legR), ('shorts_leg_L', legL)):
        rr = [_ring8(X(a, r), X(b, r), cy, hd, Z(r)) for r, a, b, cy, hd in spec_l]
        k.loft(nm, rr, k.SHORTS, cap_start=True, cap_end=False)
        # leg-opening hem: a thin rolled edge around the opening
        last = rr[-1]
        c = last.mean(axis=0)
        rim = c + (last - c) * 1.03
        rim = np.vstack([rim, rim[:1]])
        k.tube(nm.replace('shorts_leg', 'shorts_leg_hem'), rim, 0.004, 4, k.SHORTS, caps=False)
