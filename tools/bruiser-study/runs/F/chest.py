"""Arm F (refined from arm E), chunk 'chest': ribcage and upper back under a tank top, big faceted deltoids, straps and scoop neckline.

Sets the figure's mass for everyone after: torso rings (z, cx, half-width, front y, back y) measured from the front
picture (width) and the side turnaround (depth: side col c -> y = (c - 498) / 467, anchored on the neck centre of the
MPFB body at z 1.70). Arm F keeps E's depths and sharpens the front: per-ring section exponent (boxy pecs, rounder
ribcage below them so the tank top wraps a cage), a sternum crease between two flat pec planes, a sharp under-pec
crease at the picture's row 308, a deeper, narrower scoop neckline (row 287), and faceted deltoids cut from offset
hexagon rings. The torso runs from z 1.10 (under the hips chunk's hem band) to the neck base at z 1.82 (the
head chunk's neck sits on it). Deltoids end at z 1.44 where armR / armL take over the upper arm.
"""
import math

import numpy as np

# z, cx, rx (half width), yf (front, negative), yb (back), P (section exponent: boxy pecs, rounder ribcage),
# g (sternum crease depth between the pec planes)
TORSO = [
    (1.10, 0.000, 0.222, -0.150, 0.130, 2.10, 0.000),
    (1.17, 0.000, 0.212, -0.160, 0.140, 2.10, 0.000),
    (1.26, 0.000, 0.216, -0.176, 0.152, 2.15, 0.000),
    (1.34, 0.005, 0.250, -0.189, 0.172, 2.25, 0.000),
    (1.435, 0.012, 0.276, -0.196, 0.198, 2.35, 0.004),
    (1.455, 0.013, 0.280, -0.230, 0.204, 2.80, 0.012),   # under-pec crease (row 308)
    (1.51, 0.015, 0.290, -0.228, 0.220, 2.80, 0.016),
    (1.60, 0.018, 0.295, -0.198, 0.235, 2.70, 0.014),
    (1.69, 0.020, 0.285, -0.130, 0.232, 2.50, 0.004),
    (1.745, 0.018, 0.225, -0.080, 0.205, 2.30, 0.000),
    (1.79, 0.015, 0.150, -0.050, 0.160, 2.20, 0.000),
    (1.82, 0.012, 0.110, -0.035, 0.125, 2.20, 0.000),
]
N = 16

# deltoid rings for his right (image left): z, cx, rx, cy, ry
DELT_R = [
    (1.735, -0.228, 0.048, 0.062, 0.072),   # top, tucked in against the trapezius
    (1.67, -0.272, 0.090, 0.058, 0.145),
    (1.575, -0.304, 0.110, 0.062, 0.166),   # widest: the big outer plane
    (1.49, -0.316, 0.102, 0.056, 0.150),
    (1.43, -0.318, 0.068, 0.048, 0.104),    # armR / armL take over the upper arm here
]
L_SHIFT = 0.078  # the picture's left delt sits further out (slight turn toward his right)

NECK_CX, NECK_HALF, NECK_LOW, NECK_TOP = 0.025, 0.170, 1.50, 1.745
STRAP_W = 0.030
STRAP_TOP = 1.75


def interp(z, all_=False):
    zs = [r[0] for r in TORSO]
    z = min(max(z, zs[0]), zs[-1])
    v = [float(np.interp(z, zs, [r[i] for r in TORSO])) for i in range(1, 7)]
    return v if all_ else v[:4]


def se_ring(z):
    cx, rx, yf, yb, p, g = interp(z, True)
    # a vertex on the front centre line (index 12) so the sternum crease splits two flat pec planes
    a = np.linspace(0, math.tau, N, endpoint=False)
    c, s = np.cos(a), np.sin(a)
    x = cx + rx * np.sign(c) * np.abs(c) ** (2 / p)
    y = np.where(s < 0, yf * np.abs(s) ** (2 / p), yb * np.abs(s) ** (2 / p))
    y = y + np.where((s < -0.99), g, 0.0)
    return np.c_[x, y, np.full(N, z)]


def surf_y(x, z, front=True, off=0.005):
    cx, rx, yf, yb, P, g = interp(z, True)
    u = min(abs(x - cx) / rx, 0.999)
    t = (1 - u ** P) ** (1 / P)
    # the mesh is polygonal, so sit the trim just proud of the true surface
    return (yf * t - off) if front else (yb * t + off)


def zneck(xr):
    return NECK_LOW + (NECK_TOP - NECK_LOW) * min(abs(xr) / NECK_HALF, 1.0) ** 2.6


def x_arm(z, side):
    """Outer edge of the strap / armhole at height z, as |x| from the neck centre."""
    # the armhole cuts in over the pec's outer edge (the picture's left side, rows 230 to 347), leaving the
    # pec-to-deltoid junction bare
    v = float(np.interp(z, [1.37, 1.45, 1.55, 1.66, STRAP_TOP], [0.250, 0.218, 0.198, 0.192, NECK_HALF + STRAP_W]))
    return v + (0.008 if side > 0 else 0.0)


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
            cover = z < STRAP_TOP
        p.material_index = 1 if cover else 0

    # deltoids: big faceted caps. Hexagon rings, each turned half a step from the last, so the quads fold into the
    # sharp diamond planes of the reference instead of a rounded can; the top leans in to the trapezius.
    for side, name in ((-1, 'deltoid_R'), (1, 'deltoid_L')):
        rr = []
        for i, (z, cx, rx, cy, ry) in enumerate(DELT_R):
            cxs = cx if side < 0 else -cx + L_SHIFT
            a0 = (math.pi / 6) * (i % 2) + math.pi / 6
            rr.append(k.ring(rx, ry, z, 6, a0=a0, a1=a0 + math.tau, cx=cxs, cy=cy))
        o = k.loft(name, rr, k.SKIN, cap_start=True, cap_end=True)
        k.jitter(o, 0.003, seed=11 if side < 0 else 12)

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
        z = STRAP_TOP - 0.01 * (1 - t * t)
        pts.append((x, surf_y(x, z, False), z))
    k.tube('tank_neckline_back', pts, 0.007, 4, k.TANK_TOP)

    # armholes: strap's outer edge down the front, under the arm, up the back, over the shoulder
    for side, name in ((-1, 'tank_strap_R'), (1, 'tank_strap_L')):
        pts = []
        zt = STRAP_TOP
        for z in np.linspace(zt, 1.40, 8):
            x = NECK_CX + side * x_arm(z, side)
            pts.append((x, surf_y(x, z, True), z))
        cx, rx, yf, yb, P, _g = interp(1.37, True)
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
            pts.append((x, yb_ + (yf_ - yb_) * f, zt + 0.012))
        pts.append(pts[0])
        k.tube(name, pts, 0.007, 4, k.TANK_TOP, caps=False)
