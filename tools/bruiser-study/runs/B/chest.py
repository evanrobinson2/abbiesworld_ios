"""Bruiser chest and shoulders (arm B): tank-top torso with traps, pecs and lats, huge faceted delts,
thin straps, scoop neckline and armhole edges. Placed from reference pixels with k.px / k.px_y."""
import math
import numpy as np

CX = 516          # figure centre column in the reference
S = 5.177254342136569 / 2417.777777777778  # metres per pixel on the mid plane


def _section(k, row, hw_l, hw_r, hy_f, hy_b, n=16, groove=0.0, cx_px=CX):
    """A boxy, faceted torso cross-section at reference row: half-widths left/right (px), front/back depth (m)."""
    _, z = k.px(cx_px, row)
    cx = (cx_px - CX) * S
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n - math.pi / 2       # i=0 is the front centre (-Y)
        c, s = math.cos(a), math.sin(a)
        e = 0.7                                      # superellipse exponent (<1: boxy)
        x = math.copysign(abs(c) ** e, c)
        y = math.copysign(abs(s) ** e, s)
        hw = (hw_r if x > 0 else hw_l) * S
        hy = hy_f if y < 0 else hy_b
        py = y * hy
        if i == 0:
            py += groove                             # sternum groove between the pecs
        pts.append((cx + x * hw, py, z))
    return np.array(pts)


def _blob(k, name, col, row, hx, hz, hy, mat, n=8, tilt=0.0, y0=0.0, top=1.0):
    """A faceted delt: an octagonal-ish lofted lump centred on a reference pixel."""
    x0, z0 = k.px(col, row)
    rings = []
    prof = [(-1.0, 0.62), (-0.55, 0.95), (0.15, 1.0), (0.7, 0.78), (1.0, 0.32)]
    for t, r in prof:
        z = z0 + t * hz * (top if t > 0 else 1.0)
        rings.append(k.ring(hx * r, hy * r, z, n, cx=x0 + tilt * t * hz, cy=y0))
    o = k.loft(name, rings, mat, cap_start=True, cap_end=True)
    return o


def build(k):
    TT, SK = k.TANK_TOP, k.SKIN

    # --- torso (tank top body + bare upper chest / traps), lofted top to bottom ---
    spec = [
        # row, hw_l, hw_r, front depth, back depth, groove
        (148, 62, 62, 0.07, 0.07, 0.0),
        (165, 92, 98, 0.10, 0.10, 0.0),
        (185, 120, 128, 0.13, 0.13, 0.0),
        (210, 128, 134, 0.165, 0.15, 0.012),
        (250, 126, 132, 0.185, 0.16, 0.018),
        (300, 117, 123, 0.19, 0.16, 0.012),
        (314, 112, 120, 0.158, 0.155, 0.0),
        (330, 110, 118, 0.165, 0.155, 0.0),
        (360, 104, 112, 0.15, 0.15, 0.0),
        (400, 100, 98, 0.145, 0.145, 0.0),
        (440, 101, 96, 0.145, 0.145, 0.0),
        (472, 104, 102, 0.15, 0.15, 0.0),
    ]
    rings = [_section(k, r, hl, hr, f, b, groove=g) for r, hl, hr, f, b, g in spec]
    k.loft('torso_tank', rings, TT, cap_start=True, cap_end=True)

    # --- delts: huge faceted shoulder caps ---
    _blob(k, 'deltoid_R', 382, 250, 0.11, 0.138, 0.125, SK, n=7, tilt=0.12)
    _blob(k, 'deltoid_L', 672, 246, 0.138, 0.14, 0.125, SK, n=7, tilt=-0.12)

    # --- neckline, straps and armhole edges: thin bound tubes on the front surface ---
    def front(pts, inset=0.0):
        out = []
        for col, row, y in pts:
            x, z = k.px_y(col, row, y)
            out.append((x, y, z))
        return out

    neck = front([(441, 162, -0.09), (441, 190, -0.13), (452, 235, -0.175), (475, 265, -0.195),
                  (508, 274, -0.185), (545, 266, -0.195), (572, 238, -0.18), (590, 195, -0.14), (608, 162, -0.10)])
    k.tube('tank_neckline', neck, 0.006, 6, TT)
    arm_r = front([(430, 165, -0.09), (420, 200, -0.11), (405, 250, -0.15), (392, 300, -0.13)])
    k.tube('tank_strap_R', arm_r, 0.007, 6, TT)
    arm_l = front([(618, 165, -0.10), (600, 200, -0.12), (588, 250, -0.15), (594, 305, -0.14),
                   (612, 333, -0.12), (638, 352, -0.08)])
    k.tube('tank_strap_L', arm_l, 0.007, 6, TT)
