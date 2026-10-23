"""Arm E, chunk 'armR': his right arm (image left): upper arm under the deltoid, elbow, big forearm, hand.

Builds onto runs/E/chest.py, whose deltoid_R ends at z 1.44 (cx -0.318, rx 0.072, cy 0.05, ry 0.112): the upper arm
starts inside it at z 1.49. Joints from the MPFB rig (DEF bones, aligned frame): shoulder z 1.63, elbow z 1.33
(x -0.33, y 0.02), wrist z 1.04 (x -0.38, y -0.04). Here the elbow sits at z 1.31 (where the forearm's outer
brachioradialis bulge starts in the front picture) and the wrist at z 1.02 (picture's narrowest wrist ~0.97-1.0).
Front widths from the reference silhouette rows (k.px); depths from the side turnaround (y = (c - 498) / 467):
forearm top y -0.06 .. 0.17, wrist -0.10 .. 0.07, hand -0.11 .. 0.06, fingers to z ~0.70. The forearm and hand are
deliberately oversized beyond the anatomy body, as in the picture. The palm faces the thigh (+x), back of the hand
outward; four fingers curl inward, the thumb hangs at the front.
"""
import math

N = 8


def oct_ring(k, z, cx, rx, cy, ry, n=N):
    return k.ring(rx, ry, z, n, a0=math.pi / n, cx=cx, cy=cy)


# upper arm (biceps / triceps), top to bottom: z, cx, rx, cy, ry
UPPER = [
    (1.49, -0.316, 0.068, 0.045, 0.100),
    (1.43, -0.322, 0.080, 0.035, 0.108),
    (1.37, -0.330, 0.082, 0.030, 0.108),
    (1.31, -0.330, 0.078, 0.022, 0.102),
    (1.25, -0.325, 0.064, 0.018, 0.085),
    (1.20, -0.335, 0.045, 0.020, 0.060),
]

# forearm, elbow to wrist: z, cx, rx, cy, ry
FOREARM = [
    (1.37, -0.395, 0.030, 0.060, 0.055),
    (1.33, -0.395, 0.050, 0.060, 0.092),
    (1.27, -0.393, 0.098, 0.055, 0.115),
    (1.20, -0.386, 0.122, 0.052, 0.117),
    (1.14, -0.398, 0.120, 0.045, 0.110),
    (1.08, -0.428, 0.094, 0.022, 0.102),
    (1.02, -0.452, 0.076, -0.002, 0.090),
    (0.975, -0.472, 0.064, -0.018, 0.078),
]

# palm block, wrist to knuckles: z, cx, rx (thickness half), cy, ry (width half)
PALM = [
    (0.995, -0.472, 0.054, -0.018, 0.070),
    (0.93, -0.474, 0.058, -0.025, 0.085),
    (0.86, -0.476, 0.054, -0.028, 0.084),
    (0.82, -0.480, 0.040, -0.028, 0.074),
]

# fingers: y across the knuckles (index at the front), tip height, radius
FINGERS = [
    ('finger_index_R', -0.082, 0.722, 0.0150),
    ('finger_middle_R', -0.045, 0.712, 0.0155),
    ('finger_ring_R', -0.008, 0.720, 0.0150),
    ('finger_pinky_R', 0.027, 0.745, 0.0130),
]


def build(k):
    k.loft('upper_arm_R', [oct_ring(k, *r) for r in UPPER], k.SKIN, cap_start=True, cap_end=True)
    k.loft('forearm_R', [oct_ring(k, *r) for r in FOREARM], k.SKIN, cap_start=True, cap_end=True)
    # elbow point (olecranon) at the back of the joint
    k.tube('elbow_R', [(-0.352, 0.105, 1.36), (-0.358, 0.125, 1.31), (-0.365, 0.12, 1.26)],
           [0.025, 0.035, 0.025], 6, k.SKIN)
    k.loft('palm_R', [oct_ring(k, *r) for r in PALM], k.SKIN, cap_start=True, cap_end=True)

    # four fingers, slightly curled toward the palm side (+x, the thigh) as they hang
    for name, y, ztip, r in FINGERS:
        x0 = -0.492
        zk = 0.845
        L = zk - ztip
        curl = 0.045 if y < -0.02 else 0.030
        pts = [(x0, y, zk),
               (x0 - 0.008, y - 0.006, zk - 0.40 * L),
               (x0 + curl * 0.4, y - 0.010, zk - 0.75 * L),
               (x0 + curl, y - 0.008, ztip)]
        k.tube(name, pts, [r * 1.25, r * 1.15, r, r * 0.8], 6, k.SKIN)

    # thumb: from the base of the palm, front-inner side, hanging down and a little forward
    k.tube('thumb_R', [(-0.445, -0.065, 0.955), (-0.422, -0.092, 0.880), (-0.419, -0.100, 0.800),
                       (-0.432, -0.094, 0.748)], [0.026, 0.021, 0.017, 0.013], 6, k.SKIN)
