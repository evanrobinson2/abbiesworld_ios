"""Arm C, chunk 4 of 6: his left arm and hand (image right): upper arm, elbow, forearm, wrist, hand.

Builds onto runs/C/head.py, chest.py and armR.py: deltoid_L is a faceted cap centred at px (668, 234), reaching
out to col ~737 and down to row ~305; the arm loft starts tucked inside it at row 262 and uses the same chamfered
8-point sections as arm_R, mirrored. His left arm hangs a little farther from the body than his right, with a
broad, flaring forearm.
Silhouette edges measured from ref/mask.png (row: inner col - outer col):
  arm leaves the torso at row ~355; 360: 648-755, 380: 658-764, 400: 673-773, 420-440: 678-777, 470: 688-771,
  500: 699-768, wrist 530-550: 700-764; hand 560-620: 711-765, fingertips to row ~670 near col 730;
  thumb hangs separately in front, cols 682-704, rows 585-628.
The hand hangs thumb-forward, palm toward the thigh, back of the hand half turned toward the camera.
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
        return k.px(700, row)[1]

    # ---- upper arm + elbow + forearm + wrist as one faceted loft ----
    # (row, inner col, outer col, centre y, half depth, front skew: negative pushes the front toward the body)
    spec = [
        (262, 650, 728, 0.000, 0.066, 0.000),
        (290, 637, 738, -0.004, 0.078, -0.006),
        (320, 635, 748, -0.008, 0.082, -0.010),
        (350, 638, 753, -0.010, 0.084, -0.010),
        (372, 654, 760, -0.012, 0.086, -0.008),   # elbow
        (395, 668, 771, -0.014, 0.092, -0.004),   # brachioradialis flares outward
        (420, 678, 777, -0.016, 0.094, 0.000),
        (450, 681, 774, -0.016, 0.090, 0.004),
        (480, 692, 771, -0.014, 0.080, 0.004),
        (510, 701, 768, -0.012, 0.068, 0.002),
        (535, 703, 765, -0.010, 0.058, 0.000),    # wrist
        (552, 704, 764, -0.010, 0.055, 0.000),
    ]
    rings = [_ring(X(i, r), X(o, r), cy, hd, Z(r), skew=sk) for r, i, o, cy, hd, sk in spec]
    k.loft('arm_L', rings, k.SKIN, cap_start=True, cap_end=True)

    # ---- hand: palm block, four curled fingers, thumb (mirror of hand_R's frame) ----
    th = math.radians(50)
    across = np.array([-math.sin(th), -math.cos(th), 0.0])     # pinky -> index (index toward camera and body)
    normal = np.array([-math.cos(th), math.sin(th), 0.0])      # back of hand -> palm (palm faces the thigh)
    down = np.array([0.0, 0.0, -1.0])

    wrist = np.array([X(737, 552), -0.012, Z(552)])
    palm_len = Z(552) - Z(618)              # wrist to knuckles

    def pt(c, a, n, d):
        return c + a * across + n * normal + d * down

    prings = []
    for t, w, tt in [(0.0, 0.056, 0.032), (0.35, 0.064, 0.031), (0.75, 0.064, 0.027), (1.0, 0.060, 0.022)]:
        d = t * palm_len
        prings.append(np.array([
            pt(wrist, 0.0, -tt - 0.004, d), pt(wrist, w * 0.7, -tt, d), pt(wrist, w, -tt * 0.2, d),
            pt(wrist, w * 0.8, tt, d), pt(wrist, 0.0, tt + 0.003, d), pt(wrist, -w * 0.8, tt, d),
            pt(wrist, -w, -tt * 0.2, d), pt(wrist, -w * 0.7, -tt, d)]))
    k.loft('palm_L', prings, k.SKIN, cap_start=True, cap_end=True)

    fingers = [('finger_index_L', 0.040, 0.090, 0.30), ('finger_middle_L', 0.013, 0.104, 0.22),
               ('finger_ring_L', -0.014, 0.098, 0.26), ('finger_pinky_L', -0.040, 0.080, 0.36)]
    for nm, a, ln, curl in fingers:
        base = pt(wrist, a, -0.004, palm_len - 0.006)
        fd = down + np.array([-0.06, 0.0, 0.0]); fd /= np.linalg.norm(fd)   # fingertips drift a little inward
        p1 = base + fd * ln * 0.58 + normal * ln * 0.04
        dir2 = fd * math.cos(curl) + normal * math.sin(curl)
        p2 = p1 + dir2 * ln * 0.38
        dir3 = fd * math.cos(curl * 2.0) + normal * math.sin(curl * 2.0)
        p3 = p2 + dir3 * ln * 0.30
        k.tube(nm, [base, p1, p2, p3], [0.0125, 0.0115, 0.0105, 0.0085], 5, k.SKIN)

    # thumb: hangs separately in front of the palm on the body side, tip at about px (693, 627)
    t0 = np.array([X(712, 545), -0.030, Z(545)])
    t1 = np.array([X(699, 578), -0.052, Z(578)])
    t2 = np.array([X(691, 600), -0.068, Z(600)])
    tip = np.array([X(692, 624), -0.072, Z(624)])
    k.tube('thumb_L', [t0, t1, t2, tip], [0.027, 0.026, 0.022, 0.016], 6, k.SKIN)
