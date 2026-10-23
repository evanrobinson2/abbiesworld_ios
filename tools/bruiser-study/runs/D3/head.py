"""D3 step 6: head and neck, the final detail pass. Sits on the chest's upper torso (which ends at row 160).

Landmarks (reference pixels, from the full image and head crop): flat crown at row ~54 (cols 500-540); skull block
cols ~485-552 rows 62-95; heavy brow ledge at row ~94; eyes in shadow at row ~100; nose bridge (515, 98) to tip
(508, 117); stern mouth at row ~128 (cols 497-524); jaw corner (553, 134) to a square chin cols 492-527 ending at
row ~164; ear (his left, image right) cols 549-557 rows 90-110. Neck flares into the trapezius: row 134 cols 484-579,
row 146 cols 465-604, row 158 cols 440-629.
"""
import numpy as np


def _ring(k, row, c0, c1, yf, yb, n=10, flat=0.3, rot=0.0):
    """A faceted ring spanning cols c0..c1 at a reference row; front (toward -Y) reaches yf, back reaches yb."""
    (x0, z), (x1, _) = k.px(c0, row), k.px(c1, row)
    cx, rx = (x0 + x1) / 2, (x1 - x0) / 2
    a = np.linspace(0, 2 * np.pi, n, endpoint=False) + np.pi / n + rot
    c, s = np.cos(a), np.sin(a)
    c = np.sign(c) * np.abs(c) ** (1 - flat)
    s = np.sign(s) * np.abs(s) ** (1 - flat)
    y = np.where(s < 0, s * yf, s * yb)
    return np.c_[cx + rx * c, y, np.full(n, z)]


def _pt(k, col, row, y):
    x, z = k.px_y(col, row, y)
    return (x, y, z)


def build(k):
    import bpy

    # Neck and trapezius: wide flare into the shoulders, set back so the chin stays proud of it.
    neck = [
        (170, 430, 642, -0.10, 0.13),
        (158, 442, 628, -0.075, 0.12),
        (146, 467, 603, -0.05, 0.11),
        (134, 485, 578, -0.035, 0.095),
        (118, 492, 550, -0.03, 0.08),
    ]
    k.loft('neck_trapezius', [_ring(k, r, a, b, -yf, yb, n=12, flat=0.25) for r, a, b, yf, yb in neck], k.SKIN,
           cap_end=True)

    # Skull and face block: (row, col_left, col_right, front depth, back depth). Front is the face plane.
    head = [
        (54, 502, 539, 0.035, 0.045),
        (58, 494, 546, 0.060, 0.070),
        (66, 487, 550, 0.072, 0.082),
        (82, 485, 552, 0.078, 0.086),
        (94, 484, 553, 0.088, 0.084),   # brow line
        (100, 487, 552, 0.074, 0.080),  # eye sockets, set back under the brow
        (116, 488, 553, 0.078, 0.074),  # cheekbones
        (130, 487, 554, 0.080, 0.064),  # mouth
        (136, 487, 552, 0.080, 0.056),  # jaw corner
        (150, 489, 540, 0.078, 0.040),
        (160, 492, 528, 0.072, 0.020),  # square chin
        (164, 497, 523, 0.060, 0.008),
    ]
    k.loft('skull_face', [_ring(k, r, a, b, yf, yb, n=10, flat=0.35) for r, a, b, yf, yb in head], k.SKIN,
           cap_start=True, cap_end=True)

    # Heavy brow: a faceted ledge across the forehead, deepest over the nose.
    brow = [
        _pt(k, 487, 89, -0.074), _pt(k, 517, 88, -0.084), _pt(k, 551, 89, -0.074),
        _pt(k, 487, 98, -0.080), _pt(k, 517, 97, -0.092), _pt(k, 551, 98, -0.080),
        _pt(k, 489, 101, -0.060), _pt(k, 517, 101, -0.070), _pt(k, 549, 101, -0.060),
    ]
    k.mesh('brow', brow, [(0, 1, 4, 3), (1, 2, 5, 4), (3, 4, 7, 6), (4, 5, 8, 7),
                          (0, 3, 6), (2, 8, 5), (0, 6, 7, 1), (1, 7, 8, 2)], k.SKIN)

    # Nose: a wedge from the bridge between the brows down to a blunt tip over the mouth.
    nose = [
        _pt(k, 512, 98, -0.090), _pt(k, 520, 98, -0.090),               # bridge
        _pt(k, 507, 116, -0.112), _pt(k, 517, 116, -0.112),             # tip front
        _pt(k, 499, 118, -0.082), _pt(k, 525, 118, -0.082),             # nostrils / wings
        _pt(k, 512, 119, -0.092),                                       # under the tip
        _pt(k, 508, 102, -0.074), _pt(k, 524, 102, -0.074),             # root against the face
    ]
    k.mesh('nose', nose, [(0, 2, 3, 1), (0, 7, 4, 2), (1, 3, 5, 8), (2, 4, 6), (3, 6, 5), (2, 6, 3),
                          (7, 0, 1, 8)], k.SKIN)

    # Stern mouth: a flat upper lip plane, a recessed slit and a slightly proud lower lip.
    k.mesh('upper_lip', [_pt(k, 497, 121, -0.083), _pt(k, 525, 121, -0.083),
                         _pt(k, 523, 127, -0.088), _pt(k, 499, 127, -0.088),
                         _pt(k, 498, 127, -0.075), _pt(k, 524, 127, -0.075)],
           [(0, 1, 2, 3), (3, 2, 5, 4)], k.SKIN)
    k.mesh('lower_lip', [_pt(k, 500, 129, -0.078), _pt(k, 522, 129, -0.078),
                         _pt(k, 520, 133, -0.088), _pt(k, 502, 133, -0.088),
                         _pt(k, 503, 138, -0.082), _pt(k, 519, 138, -0.082)],
           [(0, 1, 2, 3), (3, 2, 5, 4)], k.SKIN)
    # Square chin pad.
    k.mesh('chin', [_pt(k, 495, 145, -0.080), _pt(k, 526, 145, -0.080),
                    _pt(k, 525, 158, -0.082), _pt(k, 497, 158, -0.082),
                    _pt(k, 499, 163, -0.064), _pt(k, 523, 163, -0.064)],
           [(0, 1, 2, 3), (3, 2, 5, 4)], k.SKIN)

    # Ears: small faceted slabs on the sides of the skull at brow-to-nose height.
    (xe, ze_top), (_, ze_bot) = k.px(554, 91), k.px(554, 110)
    xi, _ = k.px(549, 100)
    ear = [
        (xi, -0.010, ze_top), (xe + 0.004, -0.004, ze_top - 0.004), (xe + 0.006, 0.012, ze_top - 0.012),
        (xi, 0.022, ze_top - 0.006),
        (xi, -0.012, ze_bot), (xe, -0.006, ze_bot + 0.006), (xe + 0.002, 0.010, ze_bot + 0.004),
        (xi, 0.018, ze_bot),
    ]
    faces = [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (0, 4, 7, 3), (0, 3, 2, 1), (4, 5, 6, 7)]
    ear_L = k.mesh('ear_L', ear, faces, k.SKIN)
    # His right ear: mirror about the head's centre line.
    xc, _ = k.px(518.5, 100)
    ear_R = k.mirror_x(ear_L, 'ear_R')
    ear_R.location.x += 2 * xc
    bpy.context.view_layer.update()
