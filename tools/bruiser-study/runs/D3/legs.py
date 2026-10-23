"""D3 step 3: legs and feet. Builds under the hips' shorts legs (hems at rows ~622-628).

Landmarks (reference pixels, from the silhouette): thighs leave the shorts at row ~625 (his right cols 399-507, his
left 529-632); knees narrowest at row ~700 (414-489 / 548-630); calves widest at row ~785 (421-515 / 572-670);
ankles at row ~905 (437-475 / 610-646). His right foot turns out ~28 deg, toes reaching col ~375 at row ~980; his
left foot points almost straight at the camera, toes spanning cols ~594-666 at row ~982. The study camera puts
z = 0 at row ~987 on the mid plane, so the legs lean slightly back (ankles at y ~ +0.09) to keep the feet on it.
"""
import numpy as np


def _ring(k, row, c0, c1, ry, n, cy=0.0, flat=0.2, rot=0.0):
    (x0, z), (x1, _) = k.px_y(c0, row, cy), k.px_y(c1, row, cy)
    cx, rx = (x0 + x1) / 2, (x1 - x0) / 2
    a = np.linspace(0, 2 * np.pi, n, endpoint=False) + np.pi / n + rot
    c, s = np.cos(a), np.sin(a)
    if flat:
        c = np.sign(c) * np.abs(c) ** (1 - flat)
        s = np.sign(s) * np.abs(s) ** (1 - flat)
    return np.c_[cx + rx * c, cy + ry * s, np.full(n, z)]


def _depth(row):
    """Leg centre depth: on the mid plane at the shorts, leaning back to the ankle."""
    t = np.clip((row - 620) / (905 - 620), 0, 1)
    return 0.005 + 0.085 * t


def _foot(k, side, ax, ay, ang, length, ball_w):
    """A faceted bare foot with five toes. (ax, ay) is the ankle centre on the ground; ang turns the toes outward
    (radians, positive toward +x). The foot runs along d = (sin ang, -cos ang)."""
    d = np.array([np.sin(ang), -np.cos(ang)])
    lat = np.array([d[1] * -1, d[0]])  # +lat points to the figure's left (+x) for a forward foot
    lat = np.array([np.cos(ang), np.sin(ang)])
    heel = np.array([ax, ay]) - d * 0.075 * length / 0.27
    # (station along foot, width, height, sole lift)
    L = length / 0.27
    st = [(0.000, 0.060, 0.040, 0.012), (0.025, 0.085, 0.085, 0.0), (0.075, 0.095, 0.130, 0.0),
          (0.130, 0.115, 0.100, 0.0), (0.185, ball_w, 0.070, 0.0), (0.215, ball_w * 1.02, 0.048, 0.0)]
    st = [(a * L, b, c, e) for a, b, c, e in st]
    inner = -1 if side == 'L' else 1  # big toe on the inner side (toward x = 0)
    rings = []
    for s, w, h, lift in st:
        c = heel + d * s
        # hexagonal section, arch slightly higher on the inner side
        prof = [(-w / 2, lift), (w / 2, lift), (w / 2, h * 0.55), (w * 0.22, h), (-w * 0.22, h), (-w / 2, h * 0.55)]
        pts = []
        for l, z in prof:
            if l * inner > 0 and 0.03 < s < 0.17 and z == lift:
                z += 0.01  # arch
            p = c + lat * l
            pts.append((p[0], p[1], z))
        rings.append(np.array(pts))
    k.loft(f'foot_{side}', rings, k.SKIN, cap_start=True, cap_end=True)

    # Toes: five short faceted blocks, the big toe on the inner side, each a little curled down at the tip.
    s0 = st[-1][0] - 0.01
    w = ball_w
    specs = [(0.30, 0.034, 0.060, 0.034), (0.10, 0.024, 0.050, 0.026), (-0.08, 0.022, 0.044, 0.024),
             (-0.24, 0.020, 0.038, 0.022), (-0.39, 0.019, 0.030, 0.020)]  # (lat frac toward inner, width, len, h)
    names = ['big', 'second', 'middle', 'fourth', 'little']
    for (f, tw, tl, th), nm in zip(specs, names):
        base = heel + d * s0 + lat * (f * w * inner)
        rr = []
        for t, sc, zl in ((0.0, 1.0, 0.0), (0.6, 0.95, 0.0), (1.0, 0.8, 0.0)):
            c = base + d * (tl * t)
            hh = th * (1.0 if t < 0.7 else 0.7)
            pr = [(-tw / 2 * sc, zl), (tw / 2 * sc, zl), (tw / 2 * sc, hh), (-tw / 2 * sc, hh)]
            rr.append(np.array([(c[0] + lat[0] * l, c[1] + lat[1] * l, z) for l, z in pr]))
        k.loft(f'toe_{nm}_{side}', rr, k.SKIN, cap_start=True, cap_end=True)


def build(k):
    n = 10
    # (row, col_out, col_in) per leg; half-depth ~ 0.45 x width.  His right is the image's left.
    leg_R = [(612, 400, 506), (640, 401, 504), (670, 407, 496), (700, 414, 489), (730, 415, 497), (760, 421, 508),
             (785, 421, 515), (815, 424, 505), (850, 430, 487), (880, 435, 478), (905, 437, 475), (935, 440, 474)]
    leg_L = [(612, 527, 633), (640, 533, 632), (670, 542, 631), (700, 548, 630), (730, 566, 645), (760, 573, 661),
             (785, 572, 669), (815, 579, 662), (850, 596, 654), (880, 607, 648), (905, 610, 646), (935, 607, 650)]
    for side, rows in (('R', leg_R), ('L', leg_L)):
        rings = []
        for row, a, b in rows:
            (x0, _), (x1, _) = k.px(a, row), k.px(b, row)
            half_d = abs(x1 - x0) * 0.47
            if 690 <= row <= 710:
                half_d *= 1.1  # kneecap pushes forward
            rings.append(_ring(k, row, a, b, half_d, n, cy=_depth(row)))
        k.loft(f'leg_{side}', rings, k.SKIN, cap_end=True)

    # Kneecaps: low faceted lumps on the front of each knee.
    for side, (c, r) in (('R', (452, 700)), ('L', (590, 705))):
        x, z = k.px(c, r)
        cy = _depth(r) - 0.075
        rs = [k.ring(0.035 * f, 0.022 * f, z + 0.045 * t, 6, cx=x, cy=cy) for t, f in
              ((-0.9, 0.45), (-0.4, 0.95), (0.3, 1.0), (0.9, 0.5))]
        k.loft(f'kneecap_{side}', rs, k.SKIN, cap_start=True, cap_end=True)

    # Feet: ankle centres on the ground under the shins.
    ay = _depth(905) + 0.06
    xr, _ = k.px_y(452, 905, ay)
    xl, _ = k.px_y(628, 905, ay)
    _foot(k, 'R', xr, ay, np.radians(-48), 0.31, 0.125)
    _foot(k, 'L', xl, ay + 0.04, np.radians(4), 0.24, 0.140)
