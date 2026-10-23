"""Arm C, chunk 3 of 6: his right arm and hand (image left): upper arm, elbow, forearm, wrist, hand.

Builds onto runs/C/head.py and chest.py: deltoid_R is a faceted cap centred at px (384, 240) reaching down to about
row 305 and out to col ~330, and the torso side sits at cols ~400-415, so the upper arm starts tucked inside the
deltoid at row 262 and its inner edge stays just outside the torso (the elbow gap at cols 405-414, rows 370-470).
Silhouette edges measured from ref/bruiser.png (row: outer col - inner col):
  upper arm 290: 326-404, 330: 331-402, 350: 325-400; forearm flare 380: 298-405, 420: 280-397, 460: 276-377,
  500: 272-348, wrist 535: 268-323; hand 550-620: 267-327; fingertips to row ~660 near col 290, thumb tip (316, 640).
The hand hangs thumb-forward, palm toward the thigh, turned so the back of the hand half faces the camera.
"""
import math

import numpy as np


def _ring(xl, xr, cy, hd, z, c=0.35, skew=0.0):
    """Chamfered faceted section (8 points): x from xl to xr, depth cy +- hd; skew pushes the front toward +x."""
    xm = (xl + xr) / 2
    hw = (xr - xl) / 2
    yf, yb = cy - hd, cy + hd
    cx_, cyy = hw * c, hd * c
    return np.array([
        (xm + skew, yf, z), (xr - cx_, yf + cyy, z), (xr, cy, z), (xr - cx_, yb - cyy, z),
        (xm - skew * 0.3, yb, z), (xl + cx_, yb - cyy, z), (xl, cy, z), (xl + cx_, yf + cyy, z)])


def build(k):
    def X(col, row=450):
        return k.px(col, row)[0]

    def Z(row):
        return k.px(300, row)[1]

    # ---- upper arm + elbow + forearm + wrist as one faceted loft (horizontal sections down the hanging arm) ----
    # (row, outer col, inner col, centre y, half depth, front skew)
    spec = [
        (262, 342, 398, 0.000, 0.060, 0.000),
        (290, 330, 403, -0.004, 0.074, 0.006),
        (320, 334, 403, -0.008, 0.078, 0.010),   # triceps dip on the outside, biceps in front
        (350, 326, 401, -0.010, 0.080, 0.010),
        (372, 308, 404, -0.012, 0.084, 0.008),   # elbow: brachioradialis flares outward
        (395, 288, 401, -0.014, 0.090, 0.004),
        (420, 280, 396, -0.016, 0.092, 0.000),
        (450, 277, 384, -0.016, 0.086, -0.004),
        (480, 274, 362, -0.014, 0.074, -0.004),
        (510, 271, 340, -0.012, 0.060, -0.002),
        (535, 269, 324, -0.010, 0.050, 0.000),   # wrist
        (548, 269, 325, -0.010, 0.050, 0.000),
    ]
    rings = [_ring(X(o, r), X(i, r), cy, hd, Z(r), skew=sk) for r, o, i, cy, hd, sk in spec]
    k.loft('arm_R', rings, k.SKIN, cap_start=True, cap_end=True)

    # ---- hand: palm block, four curled fingers, thumb ----
    # hand frame: across = pinky -> index (index toward the camera, turned in toward the body), palm normal faces
    # the thigh (+x) and a little back.
    th = math.radians(50)
    across = np.array([math.sin(th), -math.cos(th), 0.0])      # pinky -> index
    normal = np.array([math.cos(th), math.sin(th), 0.0])        # back of hand -> palm
    down = np.array([0.0, 0.0, -1.0])

    wx = X(296, 545)
    wrist = np.array([wx, -0.012, Z(545)])
    palm_len = Z(545) - Z(608)              # wrist to knuckles
    half_w, half_t = 0.060, 0.026           # half width (across) and half thickness of the palm

    def pt(c, a, n, d):
        return c + a * across + n * normal + d * down

    # palm: rings from wrist to knuckles, widening across, slightly cupped
    prings = []
    for t, w, tt in [(0.0, 0.054, 0.032), (0.35, 0.062, 0.031), (0.75, 0.062, 0.027), (1.0, 0.058, 0.022)]:
        d = t * palm_len
        prings.append(np.array([
            pt(wrist, 0.0, -tt - 0.004, d), pt(wrist, w * 0.7, -tt, d), pt(wrist, w, -tt * 0.2, d),
            pt(wrist, w * 0.8, tt, d), pt(wrist, 0.0, tt + 0.003, d), pt(wrist, -w * 0.8, tt, d),
            pt(wrist, -w, -tt * 0.2, d), pt(wrist, -w * 0.7, -tt, d)]))
    k.loft('palm_R', prings, k.SKIN, cap_start=True, cap_end=True)

    # fingers: each from its knuckle, three phalanges curling toward the palm
    fingers = [('finger_index_R', 0.040, 0.090, 0.30), ('finger_middle_R', 0.013, 0.104, 0.22),
               ('finger_ring_R', -0.014, 0.098, 0.26), ('finger_pinky_R', -0.040, 0.080, 0.36)]
    for nm, a, ln, curl in fingers:
        base = pt(wrist, a, -0.004, palm_len - 0.006)
        fd = down + np.array([-0.22, 0.0, 0.0]); fd /= np.linalg.norm(fd)   # fingers hang a little outward
        p1 = base + fd * ln * 0.50 + normal * ln * 0.04
        dir2 = fd * math.cos(curl) + normal * math.sin(curl)
        p2 = p1 + dir2 * ln * 0.38
        dir3 = fd * math.cos(curl * 2.0) + normal * math.sin(curl * 2.0)
        p3 = p2 + dir3 * ln * 0.30
        k.tube(nm, [base, p1, p2, p3], [0.0125, 0.0115, 0.0105, 0.0085], 5, k.SKIN)

    # thumb: from the base of the palm on the index side, down, forward and in toward the palm
    t0 = pt(wrist, 0.040, 0.004, palm_len * 0.30)
    t1 = t0 + across * 0.006 + normal * 0.010 + down * 0.042
    t2 = t1 + across * 0.002 + normal * 0.012 + down * 0.040
    t3 = t2 + normal * 0.012 + down * 0.030
    k.tube('thumb_R', [t0, t1, t2, t3], [0.018, 0.014, 0.012, 0.009], 5, k.SKIN)
