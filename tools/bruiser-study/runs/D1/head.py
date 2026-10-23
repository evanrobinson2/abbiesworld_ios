"""D1 head: blocky bald skull, heavy brow, wedge nose, stern mouth, square jaw and chin, ears, thick neck.

Sixth and last chunk of arm D1, built onto chest.py: the neck sinks into the top of `torso_skin` (rows 148-158,
traps) between the tank straps. The skull is a faceted, chamfered box lofted row by row from the reference
silhouette (crown plane at row ~54, chin at row ~164), built in a local head frame and turned a little toward his
right (yaw), as in the picture where the front plane sits on the image left and the side plane shows on the right.
"""
import math

import numpy as np

YAW = -0.24           # head turned toward his right (image left)
M_PX = 0.00214        # metres per reference pixel on the mid plane


def _frame(k):
    x0, _ = k.px(518, 100)
    return x0, 0.0


def _w(k, pts, x0, y0):
    """Local (u, v, z) -> world, rotating about the vertical axis through (x0, y0)."""
    c, s = math.cos(YAW), math.sin(YAW)
    pts = np.asarray(pts, float)
    u, v, z = pts[:, 0], pts[:, 1], pts[:, 2]
    return np.c_[x0 + u * c - v * s, y0 + u * s + v * c, z]


def _oct(du, w, df, db, z, ch):
    """Chamfered box section: half width w, front at -df, back at +db."""
    return [(du + w, -df + ch, z), (du + w, db - ch, z), (du + w - ch, db, z), (du - w + ch, db, z),
            (du - w, db - ch, z), (du - w, -df + ch, z), (du - w + ch, -df, z), (du + w - ch, -df, z)]


# (row, centre offset px, half width px, front depth, back depth, chamfer)
SKULL = [(55, 5, 14, 0.05, 0.06, 0.018), (59, 4, 20, 0.068, 0.078, 0.024), (67, 2, 26, 0.082, 0.09, 0.028),
         (80, 1, 29, 0.087, 0.094, 0.026), (95, 1, 29, 0.09, 0.092, 0.024), (110, 2, 27, 0.088, 0.088, 0.024),
         (125, 1, 29, 0.09, 0.07, 0.024), (138, 0, 29, 0.092, 0.045, 0.024), (152, -2, 23, 0.09, 0.01, 0.02),
         (164, -4, 17, 0.084, -0.035, 0.014)]


def build(k):
    x0, y0 = _frame(k)
    z = lambda row: k.px(518, row)[1]
    W = lambda p: _w(k, p, x0, y0)

    rings = [W(_oct(du * M_PX, w * M_PX, df, db, z(row), ch)) for row, du, w, df, db, ch in SKULL]
    k.loft('skull', rings, k.SKIN, cap_start=True, cap_end=True)

    # --- heavy brow ridge: a wedge shelf across the forehead, dipping into a frown at the centre ---------------
    fz = 0.09
    us = np.array([-0.058, -0.03, -0.006, 0.006, 0.03, 0.056])
    dip = np.array([0, 0.002, 0.006, 0.006, 0.002, 0])
    top = [(u, -fz + 0.004, z(86) - d) for u, d in zip(us, dip)]
    lip = [(u, -fz - 0.011, z(96) - d) for u, d in zip(us, dip)]
    bot = [(u, -fz + 0.006, z(99) - d) for u, d in zip(us, dip)]
    verts = list(W(top + lip + bot))
    n = len(us)
    faces = []
    for r in range(2):
        for i in range(n - 1):
            a = r * n + i
            faces.append((a, a + 1, a + n + 1, a + n))
    faces.append(tuple([0, n, 2 * n]))
    faces.append(tuple([n - 1, 3 * n - 1, 2 * n - 1]))
    k.mesh('brow', verts, faces, k.SKIN)

    # --- wedge nose: bridge from the brow down to a blunt tip, with flared base ------------------------------
    nu = -0.022
    nv = [(nu, -fz + 0.002, z(92)),                       # 0 bridge top
          (nu - 0.008, -fz + 0.002, z(100)), (nu + 0.008, -fz + 0.002, z(100)),
          (nu, -fz - 0.03, z(116)),                       # 3 tip
          (nu - 0.019, -fz - 0.004, z(120)), (nu + 0.019, -fz - 0.004, z(120)),   # 4,5 nostril wings
          (nu, -fz - 0.012, z(122)),                      # 6 under the tip
          (nu - 0.012, -fz + 0.004, z(123)), (nu + 0.012, -fz + 0.004, z(123))]   # 7,8 base
    nf = [(0, 2, 3), (0, 3, 1), (1, 3, 4), (2, 5, 3), (3, 5, 6), (3, 6, 4), (4, 6, 7), (5, 8, 6), (6, 8, 7),
          (1, 4, 7), (2, 8, 5)]
    k.mesh('nose', list(W(nv)), nf, k.SKIN)

    # --- stern mouth: a straight upper lip and a pushed-out lower lip with a crease between ----------------------
    mu = -0.024
    k.mesh('upper_lip', list(W([(mu - 0.03, -fz - 0.002, z(124)), (mu + 0.03, -fz - 0.002, z(124)),
                                 (mu + 0.026, -fz - 0.006, z(128)), (mu - 0.026, -fz - 0.006, z(128)),
                                 (mu, -fz - 0.004, z(124))])),
           [(0, 4, 3), (4, 1, 2), (4, 2, 3)], k.SKIN)
    lv = [(mu - 0.028, -fz - 0.001, z(130)), (mu + 0.028, -fz - 0.001, z(130)),
          (mu + 0.024, -fz - 0.009, z(132)), (mu - 0.024, -fz - 0.009, z(132)),
          (mu + 0.02, -fz - 0.002, z(140)), (mu - 0.02, -fz - 0.002, z(140))]
    k.mesh('lower_lip', list(W(lv)), [(0, 3, 2, 1), (3, 5, 4, 2), (0, 5, 3), (1, 2, 4)], k.SKIN)

    # --- square chin block on the front of the jaw -----------------------------------------------------------
    cu = -0.026
    k.mesh('chin', list(W([(cu - 0.032, -fz + 0.004, z(144)), (cu + 0.032, -fz + 0.004, z(144)),
                           (cu + 0.03, -fz - 0.008, z(152)), (cu - 0.03, -fz - 0.008, z(152)),
                           (cu + 0.026, -fz - 0.004, z(163)), (cu - 0.026, -fz - 0.004, z(163)),
                           (cu + 0.02, -fz + 0.02, z(166)), (cu - 0.02, -fz + 0.02, z(166))])),
           [(0, 3, 2, 1), (3, 5, 4, 2), (5, 7, 6, 4), (0, 5, 3), (0, 7, 5), (1, 2, 4), (1, 4, 6)], k.SKIN)

    # --- ears: small faceted wedges on the sides, at brow-to-nose height --------------------------------------
    for tag, sgn in (('R', -1), ('L', 1)):
        ue = sgn * (0.062 if sgn > 0 else 0.056)
        ev = [(ue, 0.0, z(88)), (ue, 0.03, z(90)), (ue, 0.032, z(106)), (ue, 0.008, z(110)),
              (ue + sgn * 0.014, 0.008, z(91)), (ue + sgn * 0.016, 0.03, z(94)), (ue + sgn * 0.012, 0.026, z(105)),
              (ue + sgn * 0.008, 0.012, z(108))]
        ef = [(0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
        if sgn < 0:
            ef = [tuple(reversed(f)) for f in ef]
        k.mesh('ear_' + tag, list(W(ev)), ef, k.SKIN)

    # --- neck: thick column from under the skull, flaring into the traps of torso_skin -------------------------
    NECK = [(118, 495, 552, 0.85, 0.02), (125, 490, 566, 0.82, 0.02), (135, 484, 582, 0.72, 0.025),
            (145, 466, 602, 0.6, 0.03), (155, 446, 626, 0.48, 0.035), (165, 433, 640, 0.38, 0.04),
            (176, 417, 652, 0.32, 0.045)]
    nr = []
    for row, l, r, f, cy in NECK:
        xl, zz = k.px(l, row)
        xr, _ = k.px(r, row)
        a = np.linspace(0, 2 * math.pi, 10, endpoint=False) + math.pi / 10
        rx = (xr - xl) / 2
        nr.append(np.c_[(xl + xr) / 2 + rx * np.cos(a), cy + rx * f * np.sin(a), np.full(10, zz)])
    k.loft('neck', nr, k.SKIN, cap_start=True, cap_end=True)
