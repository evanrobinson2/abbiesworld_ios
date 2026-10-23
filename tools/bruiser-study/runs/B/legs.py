"""Arm B, chunk "legs": thighs below the shorts, knees, shins, ankles, bare feet with toes.

Each leg is an 8-sided faceted loft whose left/right edges are measured row by row from the reference
(pixel columns at each row), with depth judged as roughly round, a forward knee cap and a sharp shin ridge,
and a calf that bulges back. Feet are faceted lofts (heel to ball) with five blocky toes, yawed outward
like the picture (his right foot turns out strongly, his left only a little).
"""
import math
import numpy as np

# (row, left col, right col) silhouette of each leg in the reference
LEG_R = [(608, 401, 509), (630, 399, 507), (650, 402, 501), (670, 407, 496), (690, 412, 491), (705, 414, 489),
         (720, 414, 493), (740, 416, 501), (760, 422, 508), (780, 421, 514), (795, 421, 515), (810, 423, 507),
         (830, 427, 497), (850, 430, 487), (870, 433, 481), (890, 436, 476), (905, 437, 474), (925, 440, 474)]
LEG_L = [(608, 526, 632), (630, 529, 632), (650, 536, 632), (670, 542, 631), (690, 545, 630), (705, 550, 631),
         (720, 560, 639), (740, 572, 650), (755, 574, 655), (770, 572, 666), (785, 572, 670), (800, 572, 665),
         (820, 582, 661), (840, 592, 656), (860, 600, 652), (880, 607, 648), (900, 610, 646), (915, 611, 646),
         (935, 611, 645)]


def leg_rings(k, prof):
    rings = []
    n = 8
    for row, l, r in prof:
        xl, z = k.px(l, row)
        xr, _ = k.px(r, row)
        cx = (xl + xr) / 2; rx = (xr - xl) / 2 * 1.035
        # where along the leg are we (0 = top of thigh, 1 = ankle)
        t = (row - prof[0][0]) / (prof[-1][0] - prof[0][0])
        ry = rx * (0.92 if t < 0.35 else 1.0)
        cy = 0.14 * max(0.0, (t - 0.3) / 0.7)  # the shins rake back to feet set behind the mid plane
        ang = -math.pi / 2 + np.arange(n) * math.tau / n  # vertex 0 is the front (toward camera, -y)
        pts = np.c_[cx + rx * np.cos(ang), cy + ry * np.sin(ang), np.full(n, z)]
        # knee cap: push the front forward around the knee
        if 0.27 < t < 0.45:
            pts[0, 1] -= rx * 0.18
            pts[1, 1] -= rx * 0.08; pts[7, 1] -= rx * 0.08
        # shin: a sharp front ridge with flatter sides
        if 0.45 <= t < 0.9:
            pts[0, 1] -= rx * 0.12
        # calf bulges behind the shin
        if 0.42 < t < 0.75:
            pts[3:6, 1] += rx * 0.22
        rings.append(pts)
    return rings


def foot(k, name, ankle_x, ankle_y, yaw, length=0.27, width=0.12, side=1):
    """Build a foot in a local frame (forward = -y), then yaw and place it. side=+1 his left, -1 his right."""
    # stations along the foot: (y forward offset, half width, top height, inner/outer arch)
    st = [(0.055, 0.042, 0.080), (0.025, 0.060, 0.150), (-0.03, 0.060, 0.115), (-0.09, 0.060, 0.070),
          (-0.15, 0.064, 0.045), (-0.175, 0.064, 0.036)]
    rings = []
    for y, hw, h in st:
        # hexagonal section: flat sole, bevelled sides, ridge on top (big-toe side higher)
        sec = [(-hw, 0.0), (hw, 0.0), (hw * 1.05, h * 0.45), (hw * 0.55, h * 0.9), (-hw * 0.35, h), (-hw * 1.02, h * 0.55)]
        rings.append([(sx * side, y, sz) for sx, sz in sec])  # big toe on the inner side
    objs = [k.loft(name, [np.array(r) for r in rings], k.SKIN, cap_start=True, cap_end=True)]
    # five toes, big toe inner
    toes = [(-0.046, 0.024, 0.042, 0.032), (-0.017, 0.019, 0.034, 0.026), (0.006, 0.018, 0.030, 0.023),
            (0.027, 0.017, 0.027, 0.021), (0.046, 0.016, 0.023, 0.019)]
    names = ['big_toe', 'toe_2', 'toe_3', 'toe_4', 'little_toe']
    for (tx, tw, tl, th), tn in zip(toes, names):
        x = tx * side
        y0 = -0.168; y1 = y0 - tl
        v = [(x - tw / 2, y0, 0), (x + tw / 2, y0, 0), (x + tw / 2, y1, 0), (x - tw / 2, y1, 0),
             (x - tw / 2, y0, th), (x + tw / 2, y0, th), (x + tw / 2, y1 + 0.006, th * 0.75), (x - tw / 2, y1 + 0.006, th * 0.75)]
        f = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        objs.append(k.mesh(f'{tn}_{name[-1]}', v, f, k.SKIN))
    for o in objs:
        k.place(o, (ankle_x, ankle_y, 0.0), (0, 0, yaw), (1.04, 0.88, 1.0))  # degrees
    return objs


def build(k):
    k.loft('leg_R', leg_rings(k, LEG_R), k.SKIN, cap_start=True, cap_end=True)
    k.loft('leg_L', leg_rings(k, LEG_L), k.SKIN, cap_start=True, cap_end=True)
    # his right foot (image left): turned strongly outward, toes toward -x
    xr, _ = k.px(456, 915)
    foot(k, 'foot_R', xr - 0.018, 0.15, -72, side=-1)
    # his left foot (image right): nearly straight forward, slightly out
    xl, _ = k.px(628, 935)
    foot(k, 'foot_L', xl + 0.014, 0.16, 6, side=1)
