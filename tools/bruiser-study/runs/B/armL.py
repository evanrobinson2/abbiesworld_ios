"""Arm B, chunk armL: his left arm and hand (image right). Faceted lofts placed from reference pixels."""
import math
import numpy as np


def build(k):
    x0, z0 = k.px(0, 0); x1, z1 = k.px(100, 100)
    S = (x1 - x0) / 100.0  # metres per reference pixel on the mid plane

    def P(col, row, y=0.0):
        x, z = k.px(col, row)
        return np.array([x, y, z])

    def fring(col, row, hw, hd, n=8, cy=0.0, rot=0.0, squash=None):
        """A faceted ring at a reference row: half-width hw and half-depth hd in pixels."""
        c = P(col, row)
        a = np.linspace(0, 2 * math.pi, n, endpoint=False) + math.pi / n + rot
        pts = []
        for i, t in enumerate(a):
            rx = hw * S; ry = hd * S
            if squash is not None:
                rx *= squash[i % len(squash)]
            pts.append([c[0] + rx * math.cos(t), cy + ry * math.sin(t), c[2]])
        return np.array(pts)

    # Upper arm: from under the deltoid down to the elbow; flat-sided, slightly forward-tilted biceps.
    ua = [
        (695, 282, 41, 40, 0.00),
        (697, 320, 51, 46, -0.005),
        (702, 355, 55, 46, -0.01),
        (709, 392, 51, 42, -0.005),
        (720, 412, 38, 38, 0.0),
    ]
    k.loft('upper_arm_L', [fring(c, r, w, d, 8, cy=y * 1.0) for c, r, w, d, y in ua], k.SKIN, cap_start=True, cap_end=True)

    # Forearm: heavy, wedge-shaped, widest just below the elbow, tapering to the wrist.
    fa = [
        (742, 362, 18, 22, 0.0),
        (723, 385, 42, 40, -0.01),
        (725, 420, 52, 44, -0.012),
        (729, 465, 46, 40, -0.01),
        (735, 515, 34, 32, -0.005),
        (729, 552, 33, 26, 0.0),
    ]
    k.loft('forearm_L', [fring(c, r, w, d, 7, cy=y, rot=0.2) for c, r, w, d, y in fa], k.SKIN, cap_start=True, cap_end=True)

    # Hand: a flat-ish palm block, back of the hand turned partly toward the camera.
    pal = [
        (730, 550, 29, 22),
        (726, 578, 39, 20),
        (735, 602, 31, 17),
        (739, 622, 26, 14),
    ]
    k.loft('palm_L', [fring(c, r, w, d, 6, cy=0.0) for c, r, w, d in pal], k.SKIN, cap_start=True, cap_end=True)

    # Four fingers, slightly curled toward the thigh and back.
    fingers = [  # (knuckle col, tip col, tip row, radius px)
        ('finger_index_L', 721, 723, 666, 6.5),
        ('finger_middle_L', 732, 732, 671, 6.5),
        ('finger_ring_L', 743, 741, 668, 6.2),
        ('finger_little_L', 754, 750, 656, 5.5),
    ]
    for name, kc, tc, tr, r in fingers:
        kr = 618
        mid_r = (kr + tr) / 2
        pts = [P(kc, kr, -0.0), P((kc + tc) / 2 + 1, mid_r, -0.012), P(tc - 2, tr, 0.004)]
        k.tube(name, pts, [r * S, r * 0.95 * S, r * 0.8 * S], 5, k.SKIN)

    # Thumb: hangs inward and forward from the inner palm.
    th = [P(712, 566, -0.01), P(698, 588, -0.025), P(692, 608, -0.03), P(691, 624, -0.028)]
    k.tube('thumb_L', th, [13 * S, 11 * S, 9.5 * S, 7.5 * S], 5, k.SKIN)
