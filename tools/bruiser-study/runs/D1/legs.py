"""D1 legs: thighs below the shorts, knees, shins, ankles, bare feet with toes.

First chunk of arm D1, so it sets the stance: feet on z = 0, legs slightly apart, his right foot turned out
(toes pointing toward image-left), his left foot pointing straight at the camera. Leg cross-sections are
measured row by row from the reference silhouette (pixel columns of each leg's outer and inner edge).
"""
import math

import numpy as np

ANKLE_Y = 0.17      # the shins lean back slightly so the feet sit on the ground line seen in the picture

# (row, his-right leg [l, r], his-left leg [l, r]) in reference pixels; the top rows sit inside the shorts.
PROFILE = [
    (585, (402, 508), (528, 630)),
    (612, (402, 506), (530, 630)),
    (640, (403, 503), (535, 630)),
    (670, (408, 496), (542, 630)),
    (700, (414, 489), (548, 629)),
    (722, (414, 494), (560, 640)),   # knee: the inner bulge (vastus) swings in, kneecap faces front
    (745, (417, 503), (572, 652)),
    (772, (421, 512), (572, 667)),   # calf, widest
    (795, (420, 514), (571, 667)),
    (822, (425, 502), (582, 661)),
    (850, (430, 487), (596, 654)),
    (880, (435, 478), (607, 648)),
    (905, (437, 475), (610, 646)),   # ankle
    (925, (436, 476), (609, 647)),
]


def leg(k, name, rows, side):
    rings = []
    n = 8
    for i, (row, (l, r)) in enumerate(rows):
        yb = ANKLE_Y * min(1.0, max(0.0, (row - 640) / (905 - 640)))
        xl, z = k.px_y(l, row, yb)
        xr, _ = k.px_y(r, row, yb)
        cx = (xl + xr) / 2
        rx = (xr - xl) / 2
        ry = rx * (0.92 if row < 720 else 0.88)
        cy = yb
        if 750 <= row <= 830:
            cy = yb + 0.015            # calf bulges behind
        if 705 <= row <= 735:
            cy = yb - 0.01            # kneecap pushes forward
        a = np.linspace(0, 2 * math.pi, n, endpoint=False) + math.pi / n
        # slight asymmetry per ring to get the faceted, planar look of the reference
        w = 1 + 0.06 * np.cos(2 * a + (0.4 if i % 2 else -0.3) * side)
        pts = np.c_[cx + rx * np.cos(a) * w, cy + ry * np.sin(a) * w, np.full(n, z)]
        rings.append(pts)
    return k.loft(name, rings, k.SKIN, cap_start=True, cap_end=True)


def foot(k, side, ankle_x, ankle_y, heading, wide=1.0):
    """A faceted foot lofted heel to toe-base along `heading` (radians from -Y toward +X), plus five toes."""
    tag = 'R' if side < 0 else 'L'
    fwd = np.array([math.sin(heading), -math.cos(heading), 0.0])
    lat = np.array([math.cos(heading), math.sin(heading), 0.0])   # toward +x when heading = 0
    base = np.array([ankle_x, ankle_y, 0.0])
    # (u along foot, half width, top height, inner arch lift) per section
    secs = [(-0.07, 0.035, 0.08), (-0.03, 0.045, 0.15), (0.03, 0.050, 0.15),
            (0.09, 0.055, 0.11), (0.15, 0.060, 0.065), (0.185, 0.058, 0.045)]
    rings = []
    for u, hw, h in secs:
        hw *= wide
        # hexagonal section: sole corners, sides, top ridge (slightly to the inner side)
        prof = [(-hw, 0.0), (hw, 0.0), (hw * 1.02, h * 0.45), (hw * 0.55, h), (-hw * 0.45, h * 0.98), (-hw * 1.02, h * 0.5)]
        ring = []
        for v, z in prof:
            v = v * -side if False else v
            p = base + fwd * u + lat * v
            ring.append((p[0], p[1], z))
        rings.append(ring)
    k.loft(f'foot_{tag}', rings, k.SKIN, cap_start=True, cap_end=True)
    # toes: big toe on the inner side (toward x = 0), then four smaller ones outward
    inner = -side      # +1 means the inner side is +lat
    toes = [(0.020, 0.030, 0.045), (0.013, 0.024, 0.038), (0.012, 0.021, 0.034), (0.011, 0.019, 0.030), (0.010, 0.016, 0.026)]
    pos = 0.058 * inner
    names = ['big', 'second', 'middle', 'fourth', 'little']
    for (hw, h, ln), nm in zip(toes, names):
        c = pos - inner * hw
        pos = c - inner * (hw + 0.002)
        u0, u1 = 0.18, 0.18 + ln
        v0, v1 = c - hw, c + hw
        corners = []
        for z in (0.0, h):
            hh = h if z else 0.0
            for (u, v) in ((u0, v0), (u1, v0), (u1, v1), (u0, v1)):
                p = base + fwd * u + lat * v
                top = hh * (0.75 if u == u1 else 1.0)
                corners.append((p[0], p[1], top))
        faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        k.mesh(f'toe_{nm}_{tag}', corners, faces, k.SKIN)


def build(k):
    right = [(row, a) for row, a, _ in PROFILE]
    left = [(row, b) for row, _, b in PROFILE]
    leg(k, 'leg_R', right, -1)
    leg(k, 'leg_L', left, +1)
    # ankles from the reference: his right ~ col 456, his left ~ col 628 at row 915
    axr, _ = k.px_y(456, 915, ANKLE_Y)
    axl, _ = k.px_y(628, 915, ANKLE_Y)
    foot(k, -1, axr - 0.025, ANKLE_Y + 0.02, math.radians(-46))   # his right foot turned out toward image-left
    foot(k, +1, axl - 0.012, ANKLE_Y + 0.04, math.radians(2), wide=1.12)            # his left foot points at the camera
