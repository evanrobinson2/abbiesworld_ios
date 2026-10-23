"""D2 legs: thighs from inside the hips chunk's shorts openings (his right at row ~620, his left at row ~632), faceted
knees, calves bulging outward, slim ankles, bare feet with five toes. Last chunk of arm D2. His right foot turns out
toward the image left; his left foot points forward and slightly out (three-quarter turn)."""
import math
import numpy as np

E = 0.8   # superellipse exponent: slab-sided faceted sections, as in the hips' leg openings

# (row, outer/inner reference cols from the silhouette, half depth m, y centre)
LEG_R = [
    (605, 401, 509, 0.12, 0.0),
    (640, 400, 504, 0.118, 0.0),
    (670, 407, 496, 0.105, 0.0),
    (700, 414, 489, 0.095, -0.005),   # above the knee
    (725, 414, 495, 0.092, -0.012),   # knee cap
    (750, 419, 504, 0.085, -0.005),
    (780, 421, 514, 0.088, 0.008),    # calf bulge (outward on the image right of this leg)
    (800, 420, 512, 0.085, 0.01),
    (830, 427, 497, 0.07, 0.008),
    (860, 432, 484, 0.055, 0.005),
    (895, 437, 476, 0.045, 0.0),
    (922, 436, 475, 0.046, 0.04),      # ankle
    (948, 432, 480, 0.056, 0.11),
]
LEG_L = [
    (615, 524, 634, 0.12, 0.0),
    (650, 536, 632, 0.115, 0.0),
    (680, 544, 630, 0.105, 0.0),
    (705, 549, 631, 0.097, -0.005),
    (730, 566, 645, 0.093, -0.012),   # knee
    (755, 573, 661, 0.088, -0.005),
    (780, 572, 673, 0.09, 0.008),     # calf
    (800, 572, 668, 0.087, 0.01),
    (830, 586, 661, 0.072, 0.008),
    (860, 600, 652, 0.058, 0.005),
    (895, 609, 646, 0.047, 0.0),
    (920, 610, 647, 0.047, 0.04),      # ankle
    (948, 602, 652, 0.056, 0.11),
]


def _sec(k, row, c0, c1, d, yc, n=10, rot=0.15):
    x0, z = k.px(c0, row); x1, _ = k.px(c1, row)
    cx = (x0 + x1) / 2; hw = (x1 - x0) / 2
    pts = []
    for i in range(n):
        a = rot + 2 * math.pi * i / n
        c, s = math.cos(a), math.sin(a)
        sx = math.copysign(abs(c) ** E, c); sy = math.copysign(abs(s) ** E, s)
        pts.append(np.array([cx + hw * sx, yc + d * sy, z]))
    return pts


def _foot(k, side, heel, ang, length, width, height, toe_cols):
    """Foot lofted from heel to toe along direction ang (radians, 0 = toward camera -Y, + = toward +X).
    width(t), height(t) are profiles along the foot; sections are faceted wedges with a flat sole."""
    hx, hy = heel
    dx, dy = math.sin(ang), -math.cos(ang)       # forward
    px_, py_ = -dy, dx                            # sideways (to the foot's left)
    prof = [(0.0, 0.8, 0.55), (0.12, 1.0, 0.95), (0.35, 1.0, 1.0), (0.6, 1.05, 0.7), (0.82, 1.1, 0.42), (1.0, 1.05, 0.3)]
    rings = []
    for t, wf, hf in prof:
        cx = hx + dx * length * t; cy = hy + dy * length * t
        w = width * wf; h = height * hf
        # arch side (inner) a touch higher than the outer edge
        sec = [(-1.0, 0.0), (1.0, 0.0), (1.0, 0.45), (0.55, 1.0), (-0.45, 1.0), (-1.0, 0.55)]
        ring = [np.array([cx + px_ * w * u, cy + py_ * w * u, 0.002 + h * v]) for u, v in sec]
        rings.append(ring)
    o = k.loft('foot_' + side, rings, k.SKIN, cap_start=True, cap_end=True)
    k.jitter(o, 0.004, seed=21 if side == 'R' else 22)
    # five toes at the front, big toe on the inner side, slight gaps, little blocky stubs
    tip_x = hx + dx * length; tip_y = hy + dy * length
    w = width * 1.05
    inner = 1 if side == 'R' else -1      # his right foot: inner side is toward +X
    specs = [(-0.78, 0.30, 0.040, 0.030), (-0.40, 0.33, 0.036, 0.028), (-0.04, 0.33, 0.034, 0.026),
             (0.32, 0.30, 0.032, 0.024), (0.68, 0.26, 0.028, 0.022)]  # (pos across, w frac, len, h); -1 = inner
    names = ('big', 'second', 'middle', 'fourth', 'little')
    for (u, wf, ln, ht), nm in zip(specs, names):
        uu = -u * inner
        cx = tip_x + px_ * w * uu - dx * 0.012; cy = tip_y + py_ * w * uu - dy * 0.012
        hwid = width * wf * 0.5
        base = []
        for s_ in (0.0, 1.0):
            fx = cx + dx * ln * s_; fy = cy + dy * ln * s_
            hh = ht * (1.0 - 0.35 * s_)
            for a_, b_ in ((-1, 0), (1, 0), (1, 1), (-1, 1)):
                base.append((fx + px_ * hwid * a_ * 0.92, fy + py_ * hwid * a_ * 0.92, 0.002 + hh * b_))
        faces = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        k.mesh('toe_%s_%s' % (nm, side), base, faces, k.SKIN)
    return o


def build(k):
    for side, secs, seed in (('R', LEG_R, 31), ('L', LEG_L, 32)):
        rings = [_sec(k, *s) for s in secs]
        o = k.loft('leg_' + side, rings, k.SKIN, cap_start=True, cap_end=True)
        # knee cap comes from the forward-shifted knee sections; jitter breaks the planes into facets
        k.jitter(o, 0.006, seed=seed)

    # ankles sit at the bottom of the legs; feet from the heel forward
    xr, _ = k.px(456, 922); xl, _ = k.px(628, 920)
    _foot(k, 'R', (xr + 0.012, 0.23), math.radians(-40), 0.26, 0.052, 0.12, None)
    _foot(k, 'L', (xl - 0.01, 0.23), math.radians(8), 0.24, 0.052, 0.12, None)
