"""D2 head: blocky faceted skull with a flat crown, heavy brow, wedge nose, square jaw and stern mouth, ears, and a
thick neck that sinks into the chest's trapezius top (row 163, cols 468..558). Third chunk of arm D2.
The face is turned slightly to his right (image left): the skull is built facing -Y about its own axis, then turned."""
import math
import numpy as np

TURN = math.radians(-14)   # face turns toward image left; his left ear shows
CX_COL = 521               # skull centre column in the reference
YC = -0.005                # skull centre depth

# Skull sections, crown to chin: (row, half width px, front depth y (neg), back depth y, front flat half width frac)
SKULL = [
    (53, 11, -0.040, 0.045, 0.7),
    (57, 20, -0.065, 0.068, 0.72),
    (61, 26, -0.082, 0.084, 0.76),
    (72, 30, -0.092, 0.092, 0.8),
    (88, 31, -0.096, 0.095, 0.8),    # forehead just above the brow
    (100, 31, -0.092, 0.090, 0.8),   # eye line (brow piece sits in front)
    (115, 30, -0.094, 0.080, 0.78),  # cheekbones
    (130, 29, -0.098, 0.065, 0.74),  # mouth
    (146, 25, -0.100, 0.040, 0.68),  # jaw
    (158, 18, -0.098, 0.000, 0.6),   # chin
    (164, 12, -0.085, -0.030, 0.55), # chin underside
]


def _section(k, row, hw_px, yf, yb, ff):
    """A faceted 10-point section in head-local coords (x about the skull centre)."""
    x0, z = k.px(CX_COL, row)
    hw = hw_px / 467.0
    pts = [
        (0.0, yf * 1.02), (hw * ff * 0.5, yf), (hw * ff, yf * 0.96), (hw, yf * 0.55), (hw, 0.0),
        (hw * 0.95, yb * 0.6), (hw * 0.6, yb * 0.97), (0.0, yb), (-hw * 0.6, yb * 0.97), (-hw * 0.95, yb * 0.6),
        (-hw, 0.0), (-hw, yf * 0.55), (-hw * ff, yf * 0.96), (-hw * ff * 0.5, yf),
    ]
    return [np.array([x, y + YC, z]) for x, y in pts]


def _turn(k, o):
    """Turn a head-local object about the skull's vertical axis and move it to the skull centre column."""
    x0, _ = k.px(CX_COL, 100)
    c, s = math.cos(TURN), math.sin(TURN)
    for v in o.data.vertices:
        x, y = v.co.x, v.co.y - YC
        v.co.x = x0 + x * c - y * s
        v.co.y = YC + x * s + y * c


def _z(k, row):
    return k.px(512, row)[1]


def build(k):
    parts = []
    rings = [_section(k, *s) for s in SKULL]
    parts.append(k.loft('skull', rings, k.SKIN, cap_start=True, cap_end=True))

    # heavy brow: a wedge shelf across the forehead, deepest at the centre, pinched down over the nose
    zt, zb = _z(k, 88), _z(k, 100)
    bw = 27 / 467.0
    brow_v, brow_f = [], []
    xs = [-bw, -bw * 0.55, -0.012, 0.012, bw * 0.55, bw]
    for x in xs:
        ctr = abs(x) < 0.02
        depth = -0.112 if not ctr else -0.108
        dz = -0.008 if ctr else 0.0
        brow_v += [(x, -0.088 + YC, zt), (x, depth + YC, zt - 0.006 + dz), (x, depth + 0.006 + YC, zb + dz), (x, -0.085 + YC, zb - 0.004)]
    for i in range(len(xs) - 1):
        a, b = i * 4, (i + 1) * 4
        for j in range(3):
            brow_f.append((a + j, b + j, b + j + 1, a + j + 1))
    brow_f.append((0, 1, 2, 3)); n = len(xs) - 1
    brow_f.append((n * 4 + 3, n * 4 + 2, n * 4 + 1, n * 4))
    parts.append(k.mesh('brow', brow_v, brow_f, k.SKIN))

    # nose: a long faceted wedge from between the brows to a broad tip
    zr, ztip, zbase = _z(k, 98), _z(k, 116), _z(k, 120)
    nose_v = [
        (0.0, -0.104 + YC, zr),                 # 0 bridge top
        (-0.009, -0.095 + YC, zr), (0.009, -0.095 + YC, zr),
        (0.0, -0.132 + YC, ztip),               # 3 tip
        (-0.018, -0.110 + YC, ztip + 0.004), (0.018, -0.110 + YC, ztip + 0.004),   # 4,5 alae
        (-0.016, -0.096 + YC, zbase), (0.016, -0.096 + YC, zbase),                 # 6,7 base back
        (0.0, -0.118 + YC, zbase),              # 8 under the tip
    ]
    nose_f = [(0, 3, 4, 1), (0, 2, 5, 3), (1, 4, 6), (2, 7, 5), (3, 8, 6, 4), (3, 5, 7, 8)]
    parts.append(k.mesh('nose', nose_v, nose_f, k.SKIN))

    # stern mouth: a flat upper-lip shelf and a down-turned lower lip line
    zm = _z(k, 128)
    lip_v = [
        (-0.026, -0.099 + YC, zm - 0.004), (-0.012, -0.106 + YC, zm), (0.012, -0.106 + YC, zm), (0.026, -0.099 + YC, zm - 0.004),
        (-0.026, -0.097 + YC, zm - 0.010), (-0.012, -0.103 + YC, zm - 0.008), (0.012, -0.103 + YC, zm - 0.008), (0.026, -0.097 + YC, zm - 0.010),
    ]
    lip_f = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6)]
    parts.append(k.mesh('lower_lip', lip_v, lip_f, k.SKIN))
    # nasolabial folds: small ridges from the nose wings to the mouth corners
    for side in (-1, 1):
        f = k.tube('cheek_fold_' + ('L' if side > 0 else 'R'),
                   [(side * 0.022, -0.097 + YC, _z(k, 117)), (side * 0.030, -0.099 + YC, _z(k, 125)), (side * 0.030, -0.097 + YC, _z(k, 133))],
                   0.004, 4, k.SKIN)
        parts.append(f)

    # square chin block
    zc0, zc1 = _z(k, 140), _z(k, 163)
    chin = k.box('chin', (0.05, 0.03, zc0 - zc1), loc=(0, -0.090 + YC, (zc0 + zc1) / 2), material=k.SKIN)
    parts.append(chin)

    # ears: flat faceted plates on the skull sides
    for side in (-1, 1):
        hw = 30 / 467.0
        za, zb2 = _z(k, 90), _z(k, 110)
        ev = [(side * hw, -0.005 + YC, za), (side * (hw + 0.016), 0.005 + YC, za - 0.004),
              (side * (hw + 0.016), 0.018 + YC, zb2 + 0.012), (side * hw, 0.020 + YC, zb2),
              (side * (hw - 0.004), 0.008 + YC, (za + zb2) / 2)]
        ef = [(0, 1, 4), (1, 2, 4), (2, 3, 4)] if side > 0 else [(4, 1, 0), (4, 2, 1), (4, 3, 2)]
        e = k.mesh('ear_' + ('L' if side > 0 else 'R'), ev, ef, k.SKIN)
        parts.append(e)

    for o in parts:
        if o.name != 'skull' and o.name.startswith(('chin',)):
            # box() places by location; bake it into the mesh before turning
            for v in o.data.vertices:
                v.co += o.location
            o.location = (0, 0, 0)
        _turn(k, o)

    # thick neck: from under the skull into the chest's trapezius top, widening to the traps
    neck = []
    for row, cr, cl, d, yc in ((100, 494, 548, 0.07, 0.02), (120, 490, 556, 0.075, 0.025), (132, 488, 574, 0.08, 0.03),
                               (144, 469, 599, 0.085, 0.035), (150, 455, 611, 0.085, 0.04), (156, 440, 627, 0.085, 0.04), (168, 430, 639, 0.09, 0.04),
                               (178, 408, 654, 0.09, 0.04)):
        x0, z = k.px(cr, row); x1, _ = k.px(cl, row)
        cx, hw = (x0 + x1) / 2, (x1 - x0) / 2
        ring = []
        for i in range(12):
            a = -math.pi / 2 + 2 * math.pi * i / 12
            c, s = math.cos(a), math.sin(a)
            ring.append((cx + hw * math.copysign(abs(c) ** 0.7, c), yc + d * math.copysign(abs(s) ** 0.7, s), z))
        neck.append(ring)
    k.loft('neck', neck, k.SKIN, cap_start=True, cap_end=True)
