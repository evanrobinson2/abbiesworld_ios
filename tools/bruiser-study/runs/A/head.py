"""Arm A, chunk head: bald blocky skull, heavy brow, nose, square jaw, ear, neck to the trapezius.

Landmarks measured from ref/crops/head.png (ref_col = 416 + u/3.879, ref_row = 31 + v/3.879). The head is turned a
little to his right, so the front plane sits left of the skull centre and his left side plane and ear show on the right.
"""


def build(k):
    def P(col, row, y):
        x, z = k.px_y(col, row, y)
        return (x, y, z)

    def oct_ring(row, L, Fr, R, yF, yB, ch=0.25):
        """Eight-sided faceted ring: wide flat front (L..Fr), a side plane on his left (Fr -> R), chamfered back."""
        d = yB - yF
        return [
            P(L + 1.5, row, yF), P(Fr, row, yF), P(R, row, yF + d * 0.35), P(R, row, yF + d * 0.7),
            P(R - (R - L) * ch, row, yB), P(L + (R - L) * ch, row, yB), P(L, row, yF + d * 0.7), P(L, row, yF + d * 0.15),
        ]

    # skull, face planes and jaw (row, L, front-right, R, yFront, yBack)
    head = [
        (54, 504, 529, 538, -0.045, 0.050),
        (60, 494, 532, 547, -0.075, 0.080),
        (69, 487, 532, 551.5, -0.102, 0.088),
        (76, 485.5, 532, 552.5, -0.104, 0.090),
        (89, 484, 532, 552, -0.105, 0.090),
        (100, 487, 534, 551, -0.100, 0.085),
        (112, 488, 536, 551, -0.100, 0.070),
        (124, 488, 536, 550, -0.100, 0.050),
        (137, 488, 535, 551, -0.100, 0.030),
        (151, 489, 528, 538, -0.100, -0.010),
        (165, 490, 520, 524, -0.095, -0.050),
    ]
    k.loft('skull_jaw', [oct_ring(*h) for h in head], k.SKIN, cap_start=True, cap_end=True)

    # heavy brow ridge: a faceted shelf across the front, overhanging the eyes
    bv = [P(484, 87, -0.104), P(531, 87, -0.104), P(533, 95, -0.108), P(484, 95, -0.108),
          P(485, 88, -0.122), P(530, 88, -0.120), P(531, 96, -0.124), P(486, 96, -0.124)]
    k.mesh('brow', bv, [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], k.SKIN)

    # nose: wedge from the bridge between the brows to a blunt tip
    nv = [P(503, 93, -0.112), P(511, 93, -0.112),           # bridge
          P(497, 119, -0.106), P(516, 119, -0.106),         # nostril wings at the face
          P(500, 117, -0.140), P(513, 117, -0.140),         # tip front
          P(506, 121, -0.128)]                              # under tip
    k.mesh('nose', nv, [(0, 1, 5, 4), (0, 4, 2), (1, 3, 5), (4, 5, 6), (2, 4, 6), (3, 6, 5), (2, 6, 3)], k.SKIN)

    # stern mouth: a thin upper-lip shelf and a chin pad below
    # downturned lower lip: a thin ledge whose corners drop, casting the stern mouth line
    k.mesh('lower_lip', [P(495, 131, -0.103), P(511, 128.5, -0.103), P(527, 131, -0.103),
                         P(527, 132.5, -0.108), P(511, 130, -0.110), P(495, 132.5, -0.108),
                         P(496, 135, -0.103), P(511, 133, -0.103), P(526, 135, -0.103)],
           [(0, 1, 4, 5), (1, 2, 3, 4), (5, 4, 7, 6), (4, 3, 8, 7)], k.SKIN)
    k.mesh('chin', [P(491, 140, -0.102), P(526, 140, -0.102), P(524, 160, -0.110), P(493, 160, -0.110),
                    P(494, 164, -0.098), P(521, 164, -0.098)],
           [(0, 1, 2, 3), (3, 2, 5, 4)], k.SKIN)

    # nasolabial planes: cheek facets running from the nose wings down past the mouth corners
    for nm, a, b, c, d in (('cheek_fold_R', 488.5, 497, 493, 488.5), ('cheek_fold_L', 533, 516, 529, 534)):
        k.mesh(nm, [P(a, 104, -0.101), P(b, 119, -0.104), P(c, 133, -0.103), P(d, 136, -0.101),
                    P((a + b) / 2 + (2 if a < b else -2), 120, -0.109)],
               [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)], k.SKIN)

    # his left ear (image right), a cupped flap on the side plane
    ev = [P(551, 90, -0.005), P(557, 92, 0.005), P(557, 104, 0.010), P(552, 108, 0.005),
          P(550, 92, 0.030), P(555, 94, 0.030), P(555, 103, 0.032), P(550, 106, 0.028)]
    k.mesh('ear_L', ev, [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)], k.SKIN)
    # his right ear is hidden behind the turned skull; keep a small one for the 3D figure
    ev2 = [P(486, 92, 0.020), P(482, 94, 0.030), P(482, 104, 0.032), P(486, 107, 0.025),
           P(487, 92, 0.045), P(484, 94, 0.050), P(484, 103, 0.050), P(487, 106, 0.045)]
    k.mesh('ear_R', ev2, [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], k.SKIN)

    # neck and trapezius slopes, widening to the shoulders (row, L, R, yFront, yBack)
    neck = [
        (108, 486, 550, -0.030, 0.070),
        (124, 480, 562, -0.050, 0.080),
        (131, 478, 575, -0.060, 0.090),
        (139, 476, 589, -0.055, 0.100),
        (147, 464, 606, -0.060, 0.110),
        (155, 446, 620, -0.070, 0.120),
        (165, 432, 632, -0.085, 0.120),
        (178, 412, 642, -0.110, 0.120),
        (200, 400, 650, -0.120, 0.120),
        (216, 400, 650, -0.120, 0.120),
    ]

    def neck_ring(row, L, R, yF, yB):
        d = yB - yF; w = R - L
        return [P(L + w * 0.2, row, yF), P(R - w * 0.2, row, yF), P(R, row, yF + d * 0.3), P(R, row, yF + d * 0.7),
                P(R - w * 0.2, row, yB), P(L + w * 0.2, row, yB), P(L, row, yF + d * 0.7), P(L, row, yF + d * 0.3)]
    k.loft('neck_trapezius', [neck_ring(*n) for n in neck], k.SKIN, cap_start=True, cap_end=True)
