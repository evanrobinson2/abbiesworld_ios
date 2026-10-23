"""Arm E, chunk 'chest': ribcage and upper back under a tank top, big faceted deltoids, straps and scoop neckline.

Sets the figure's mass for everyone after: torso rings (z, cx, half-width, front y, back y) measured from the front
picture (width) and the side turnaround (depth: side col c -> y = (c - 498) / 467, anchored on the neck centre of the
MPFB body at z 1.70). The torso runs from z 1.10 (under the hips chunk's hem band) to the neck base at z 1.82 (the
head chunk's neck sits on it). Deltoids end at z 1.44 where armR / armL take over the upper arm.
"""
import math

import numpy as np

P = 2.6  # superellipse exponent: boxy, muscular section

# z, cx, rx (half width), yf (front, negative), yb (back)
TORSO = [
    (1.10, 0.000, 0.222, -0.150, 0.130),
    (1.17, 0.000, 0.212, -0.160, 0.140),
    (1.26, 0.000, 0.216, -0.178, 0.152),
    (1.34, 0.005, 0.250, -0.193, 0.172),
    (1.42, 0.012, 0.275, -0.210, 0.195),
    (1.51, 0.015, 0.290, -0.220, 0.220),
    (1.60, 0.018, 0.295, -0.192, 0.235),
    (1.69, 0.020, 0.285, -0.128, 0.232),
    (1.745, 0.018, 0.225, -0.080, 0.205),
    (1.79, 0.015, 0.150, -0.050, 0.160),
    (1.82, 0.012, 0.110, -0.035, 0.125),
]
N = 16

# deltoid rings for his right (image left): z, cx, rx, cy, ry
DELT_R = [
    (1.755, -0.235, 0.050, 0.070, 0.075),
    (1.70, -0.272, 0.078, 0.065, 0.130),
    (1.64, -0.290, 0.092, 0.065, 0.155),
    (1.57, -0.300, 0.100, 0.065, 0.160),
    (1.50, -0.310, 0.095, 0.060, 0.150),
    (1.44, -0.318, 0.072, 0.050, 0.112),
]
L_SHIFT = 0.065  # the picture's left delt sits further out (slight turn toward his right)

NECK_CX, NECK_HALF, NECK_LOW, NECK_TOP = 0.015, 0.195, 1.53, 1.77
STRAP_W = 0.032


def interp(z):
    zs = [r[0] for r in TORSO]
    z = min(max(z, zs[0]), zs[-1])
    return [float(np.interp(z, zs, [r[i] for r in TORSO])) for i in range(1, 5)]


def se_ring(z):
    cx, rx, yf, yb = interp(z)
    a = np.linspace(0, math.tau, N, endpoint=False) + math.pi / N
    c, s = np.cos(a), np.sin(a)
    x = cx + rx * np.sign(c) * np.abs(c) ** (2 / P)
    y = np.where(s < 0, yf * np.abs(s) ** (2 / P), yb * np.abs(s) ** (2 / P))
    return np.c_[x, y, np.full(N, z)]


def surf_y(x, z, front=True, off=0.005):
    cx, rx, yf, yb = interp(z)
    u = min(abs(x - cx) / rx, 0.999)
    t = (1 - u ** P) ** (1 / P)
    # the mesh is polygonal, so sit the trim just proud of the true surface
    return (yf * t - off) if front else (yb * t + off)


def zneck(xr):
    return NECK_LOW + (NECK_TOP - NECK_LOW) * min(abs(xr) / NECK_HALF, 1.0) ** 2.2


def x_arm(z, side):
    """Outer edge of the strap / armhole at height z, as |x| from the neck centre."""
    v = float(np.interp(z, [1.38, 1.50, 1.65, 1.77], [0.262, 0.255, 0.240, NECK_HALF + STRAP_W]))
    return v + (0.025 if side > 0 else 0.0)


def build(k):
    import kit
    zs = [r[0] for r in TORSO]
    rings = [se_ring(z) for z in zs]
    torso = k.loft('torso_chest', rings, k.SKIN, cap_start=False, cap_end=True)

    # tank top faces: everything below the armholes, and the panels between the straps above
    torso.data.materials.append(kit._material(k.TANK_TOP))
    for p in torso.data.polygons:
        x, y, z = p.center
        xr = x - NECK_CX
        side = 1 if xr > 0 else -1
        if z < 1.38:
            cover = True
        elif abs(xr) > x_arm(z, side):
            cover = False
        elif y < 0:
            cover = z < zneck(xr) or abs(xr) > NECK_HALF
        else:
            cover = z < 1.75
        p.material_index = 1 if cover else 0

    # deltoids: big faceted octagonal caps
    for side, name in ((-1, 'deltoid_R'), (1, 'deltoid_L')):
        rr = []
        for z, cx, rx, cy, ry in DELT_R:
            cxs = cx if side < 0 else -cx + L_SHIFT
            rr.append(k.ring(rx, ry, z, 8, cx=cxs, cy=cy))
        k.loft(name, rr, k.SKIN, cap_start=True, cap_end=True)

    # pec line: the shallow groove between the pecs below the neckline, as a slim ridge of the shirt
    # (left as the torso's faceting; the reference shows it only faintly)

    # neckline trim: the scoop's edge from strap to strap
    pts = []
    for t in np.linspace(-1, 1, 13):
        xr = t * NECK_HALF
        z = zneck(xr)
        pts.append((NECK_CX + xr, surf_y(NECK_CX + xr, z, True), z))
    k.tube('tank_neckline', pts, 0.007, 4, k.TANK_TOP)

    # back neckline: high and nearly straight between the straps
    pts = []
    for t in np.linspace(-1, 1, 7):
        x = NECK_CX + t * NECK_HALF
        z = 1.75 - 0.01 * (1 - t * t)
        pts.append((x, surf_y(x, z, False), z))
    k.tube('tank_neckline_back', pts, 0.007, 4, k.TANK_TOP)

    # armholes: strap's outer edge down the front, under the arm, up the back, over the shoulder
    for side, name in ((-1, 'tank_strap_R'), (1, 'tank_strap_L')):
        pts = []
        zt = 1.765
        for z in np.linspace(zt, 1.40, 8):
            x = NECK_CX + side * x_arm(z, side)
            pts.append((x, surf_y(x, z, True), z))
        cx, rx, yf, yb = interp(1.37)
        for a in np.linspace(-0.45, 0.45, 5):
            x = cx + side * (rx + 0.004) * math.cos(a) ** (2 / P)
            yy = (yf if a < 0 else yb) * abs(math.sin(a)) ** (2 / P)
            pts.append((x, yy, 1.37))
        for z in np.linspace(1.40, zt, 8):
            x = NECK_CX + side * x_arm(z, side)
            pts.append((x, surf_y(x, z, False), z))
        # over the shoulder, back to front
        x = NECK_CX + side * x_arm(zt, side)
        yb_, yf_ = surf_y(x, zt, False), surf_y(x, zt, True)
        for f in (0.3, 0.6):
            pts.append((x, yb_ + (yf_ - yb_) * f, zt + 0.02))
        pts.append(pts[0])
        k.tube(name, pts, 0.007, 4, k.TANK_TOP, caps=False)
