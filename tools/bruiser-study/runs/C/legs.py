"""Arm C, chunk 6 of 6: legs and feet (thighs below the shorts, knees, shins, calves, ankles, bare feet with toes).

Builds onto runs/C/hips.py: the shorts leg openings end at row ~623 (his right, cols 399-509) and ~631 (his left,
cols 529-632), centre y ~0.004, half depth ~0.122, so each thigh starts inside the shorts a little slimmer.
Silhouette edges measured from ref/mask.png (row: left col - right col):
  his right: 640 400-504, 680 410-494, 700 414-489 (knee), 740 416-501, 780 421-514 (calf), 830 427-497,
             870 433-481, 905 437-474 (ankle); foot turns out to the toes at col ~375, row ~975.
  his left:  640 533-632, 680 544-630, 700 548-630 (knee), 740 572-650, 780 572-670 (calf), 820 582-661,
             860 600-652, 905 610-646 (ankle); foot points forward, toes cols ~594-667.
"""
import math

import numpy as np


def _ring8(xl, xr, yf, yb, z, c=0.26, back=0.0, bside=0.0):
    """Faceted octagonal leg section. back pushes the rear centre out (calf), bside shifts it sideways."""
    xm, hw = (xl + xr) / 2, (xr - xl) / 2
    hd = (yb - yf) / 2
    return np.array([
        (xm, yf, z), (xr - hw * c, yf + hd * c, z), (xr, (yf + yb) / 2, z), (xr - hw * c, yb - hd * c, z),
        (xm + bside, yb + back, z), (xl + hw * c, yb - hd * c, z), (xl, (yf + yb) / 2, z), (xl + hw * c, yf + hd * c, z)])


def _cuboid(k, name, centre, f, l, length, width, height, mat, tip=0.75, droop=0.0):
    """A toe: a block along forward f, a bit narrower and lower at its tip, the tip drooping."""
    c = np.asarray(centre, float)
    f3 = np.array([f[0], f[1], 0.0]); l3 = np.array([l[0], l[1], 0.0]); u3 = np.array([0, 0, 1.0])
    v = []
    for s, sc, dz in ((-0.5, 1.0, 0.0), (0.5, tip, -droop)):
        for a, b in ((-1, 0), (1, 0), (1, 1), (-1, 1)):
            v.append(c + f3 * length * s + l3 * width / 2 * a * sc + u3 * (height * b * sc + dz))
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return k.mesh(name, v, faces, mat)


def _foot(k, side, ankle, ang, scale_w=1.0, toe_lift=0.0, zlift=0.0, heel=1.0, reach=1.0):
    """Bare foot built along its own axis from the heel to the toes, then five toes.
    ankle: (x, y) of the ankle centre; ang: outward turn in degrees (0 = straight ahead, -Y)."""
    a = math.radians(ang)
    sgn = -1.0 if side == 'R' else 1.0          # his right foot turns toward -x, his left toward +x
    f = np.array([sgn * math.sin(a), -math.cos(a)])
    l = np.array([-f[1], f[0]])                 # his left of the foot direction
    medial = 1.0 if side == 'R' else -1.0       # big toe on the inner side (toward x = 0)
    A = np.array(ankle, float)
    # (u along the foot from the ankle, half width, top height, sole z, medial shift of the centre)
    st = [(-0.075, 0.030, 0.055, 0.004, 0.000),
          (-0.055, 0.040, 0.092, 0.000, 0.000),
          (-0.015, 0.046, 0.118, 0.000, 0.002),
          (0.035, 0.052, 0.098, 0.000, 0.006),
          (0.085, 0.058, 0.068, 0.002, 0.008),
          (0.125, 0.062, 0.046, 0.003 + toe_lift * 0.5, 0.008),
          (0.140, 0.062, 0.040, 0.004 + toe_lift * 0.6, 0.008)]
    rings = []
    st = [(u * (heel if u < 0 else reach), w, h, s + zlift, ms) for u, w, h, s, ms in st]
    for u, w, h, s, ms in st:
        w *= scale_w
        h *= 1.15
        c = A + f * u + l * ms * medial
        pts = []
        # sole outer, sole inner, side up inner, top inner, top outer, side up outer (outer = -medial side)
        for vv, zz in ((-w, s), (w, s), (w * 0.98, s + h * 0.45), (w * 0.5, s + h), (-w * 0.45, s + h * 0.92),
                       (-w * 0.98, s + h * 0.4)):
            vv = vv * medial
            p = c + l * vv
            pts.append((p[0], p[1], zz))
        rings.append(np.array(pts))
    # keep winding outward regardless of side
    if medial < 0:
        rings = [r[::-1] for r in rings]
    k.loft('foot_' + side, rings, k.SKIN, cap_start=True, cap_end=True)
    # five toes across the front edge: big toe medial and longest
    u0 = st[-1][0]
    w0 = st[-1][1] * scale_w
    sole = st[-1][3]
    toes = [  # (lateral position as a fraction of half width from medial, length, width, height)
        (0.70, 0.050, 0.036, 0.034),
        (0.22, 0.044, 0.022, 0.026),
        (-0.18, 0.040, 0.020, 0.024),
        (-0.52, 0.035, 0.019, 0.022),
        (-0.82, 0.030, 0.017, 0.020)]
    names = ['big', 'second', 'middle', 'fourth', 'little']
    for (fr, ln, wd, ht), nm in zip(toes, names):
        lat = fr * w0 * medial + st[-1][4] * medial
        back = 0.012 if nm != 'big' else 0.006
        c = A + f * (u0 + ln / 2 - back - (0.006 if nm in ('fourth', 'little') else 0.0)) + l * lat
        _cuboid(k, 'toe_%s_%s' % (nm, side), (c[0], c[1], sole), f, l, ln, wd * scale_w, ht, k.SKIN,
                tip=0.8, droop=0.004)


def build(k):
    P = k.stage.PX_PER_M

    def X(col, row=700):
        return k.px(col, row)[0]

    def Z(row):
        return k.px(516, row)[1]

    # ---- legs: one faceted loft per leg from inside the shorts down to the ankle ----
    # (row, left col, right col, front y, back y, chamfer, calf push back, calf sideways shift (m))
    legR = [
        (596, 402, 514, -0.112, 0.118, 0.28, 0.000, 0.00),
        (630, 400, 507, -0.110, 0.112, 0.28, 0.000, 0.00),
        (665, 405, 497, -0.100, 0.100, 0.27, 0.000, 0.00),
        (695, 413, 490, -0.092, 0.084, 0.26, 0.000, 0.00),   # knee
        (718, 414, 492, -0.090, 0.082, 0.30, 0.010, 0.00),   # below the knee, calf starts
        (750, 418, 504, -0.084, 0.092, 0.30, 0.024, -0.01),
        (785, 421, 515, -0.074, 0.100, 0.30, 0.030, -0.01),  # calf belly (his outer calf on the image left? inner)
        (820, 425, 503, -0.064, 0.090, 0.30, 0.020, 0.00),
        (860, 431, 486, -0.040, 0.082, 0.28, 0.008, 0.00),
        (900, 437, 475, -0.020, 0.090, 0.28, 0.000, 0.00),
        (935, 436, 476, -0.018, 0.096, 0.28, 0.000, 0.00),   # into the foot
    ]
    legL = [
        (604, 522, 633, -0.112, 0.118, 0.28, 0.000, 0.00),
        (636, 532, 632, -0.110, 0.112, 0.28, 0.000, 0.00),
        (665, 540, 631, -0.100, 0.100, 0.27, 0.000, 0.00),
        (695, 547, 630, -0.092, 0.084, 0.26, 0.000, 0.00),   # knee
        (720, 559, 639, -0.090, 0.082, 0.30, 0.010, 0.00),
        (750, 572, 655, -0.084, 0.092, 0.30, 0.024, 0.01),
        (782, 572, 669, -0.074, 0.100, 0.30, 0.030, 0.01),   # calf belly flares outward
        (815, 579, 662, -0.064, 0.090, 0.30, 0.020, 0.00),
        (855, 598, 653, -0.040, 0.082, 0.28, 0.008, 0.00),
        (900, 610, 646, -0.020, 0.090, 0.28, 0.000, 0.00),
        (935, 610, 647, -0.018, 0.096, 0.28, 0.000, 0.00),
    ]
    for side, spec in (('R', legR), ('L', legL)):
        rings = [_ring8(X(a, r), X(b, r), yf, yb, Z(r), c, bk, bs) for r, a, b, yf, yb, c, bk, bs in spec]
        k.loft('leg_' + side, rings, k.SKIN, cap_start=True, cap_end=True)

    # ---- kneecaps: a low faceted plate on the front of each knee ----
    for side, row, cl, cr in (('R', 700, 424, 482), ('L', 700, 558, 618)):
        xm = (X(cl, row) + X(cr, row)) / 2
        hw = (X(cr, row) - X(cl, row)) / 2 * 0.62
        zc = Z(row)
        cap = []
        for dz, s in ((0.036, 0.6), (0.016, 1.0), (-0.016, 0.95), (-0.04, 0.5)):
            cap.append(_ring8(xm - hw * 1.1 * s, xm + hw * 1.1 * s, -0.097 - 0.005 * s, -0.04, zc + dz, 0.42))
        k.loft('kneecap_' + side, cap, k.SKIN, cap_start=True, cap_end=True)

    # ---- vastus medialis: the teardrop of thigh muscle bulging on the inner side just above each knee ----
    for side, cin, sgn in (('R', 486, -1.0), ('L', 552, 1.0)):
        xc = X(cin, 675) + sgn * 0.018
        vm = []
        for row, hw, hd, yc in ((640, 0.016, 0.030, -0.050), (668, 0.030, 0.040, -0.052), (690, 0.026, 0.032, -0.056),
                                (705, 0.012, 0.016, -0.060)):
            vm.append(_ring8(xc - hw, xc + hw, yc - hd, yc + hd, Z(row), 0.3))
        k.loft('vastus_medialis_' + side, vm, k.SKIN, cap_start=True, cap_end=True)

    # ---- shin ridge: the tibia's front edge, a slim faceted strip down each shin ----
    for side, pts in (('R', [(452, 725), (455, 800), (456, 880)]), ('L', [(598, 725), (608, 800), (626, 880)])):
        p3 = [(X(c, r), -0.074 + 0.036 * i / 2, Z(r)) for i, (c, r) in enumerate(pts)]
        k.tube('shin_ridge_' + side, p3, [0.012, 0.011, 0.009], 4, k.SKIN, caps=True)

    # ---- feet: his right foot turns out hard toward the image left, his left points nearly ahead ----
    _foot(k, 'R', (X(450, 920), 0.075), 62.0, scale_w=1.0, zlift=0.014, heel=0.55, reach=1.12)
    _foot(k, 'L', (X(628, 920), 0.085), 8.0, scale_w=1.12, zlift=0.014)
