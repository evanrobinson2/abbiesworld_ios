"""Arm E, chunk 'armL': his left arm (image right): upper arm under the deltoid, elbow, big forearm, hand.

Builds onto runs/E/chest.py, whose deltoid_L ends at z 1.44 (cx 0.383, rx 0.072, cy 0.05, ry 0.112): the upper arm
starts inside it at z 1.49. Joints as in armR.py (elbow z 1.31, wrist z 1.02, from the MPFB DEF bones 1.33 / 1.04);
the MPFB left forearm sits at x ~0.44 at z 1.10, and the picture's left arm hangs a little further out than his right
(forearm centre x ~0.45, wrist ~0.47). Front widths from the reference silhouette rows (k.px); depths follow armR
(side turnaround) and the MPFB sections. Octagon rings have flats at +-x, so the half-width w seen in front is
rx * cos(22.5 deg): rings below are given as visible half-widths and divided through.
His left hand is turned a little more than his right: the knuckles face front-outward, so the four fingers show side by
side in front view (index inner, pinky outer) and curl back toward the palm; the thumb hangs at the inner front.
"""
import math

N = 8
C = math.cos(math.pi / N)


def oct_ring(k, z, cx, w, cy, d, n=N):
    """w, d: visible half-width (x) and half-depth (y)."""
    return k.ring(w / C, d / C, z, n, a0=math.pi / n, cx=cx, cy=cy)


# upper arm (biceps / triceps): z, cx, w, cy, d
UPPER = [
    (1.49, 0.385, 0.066, 0.045, 0.092),
    (1.43, 0.402, 0.100, 0.035, 0.100),
    (1.37, 0.398, 0.108, 0.030, 0.100),
    (1.31, 0.405, 0.095, 0.022, 0.094),
    (1.25, 0.412, 0.074, 0.018, 0.078),
    (1.20, 0.420, 0.048, 0.020, 0.055),
]

# forearm, elbow to wrist: z, cx, w, cy, d
FOREARM = [
    (1.37, 0.462, 0.028, 0.060, 0.050),
    (1.33, 0.458, 0.050, 0.060, 0.085),
    (1.27, 0.450, 0.094, 0.055, 0.106),
    (1.21, 0.453, 0.104, 0.052, 0.108),
    (1.15, 0.453, 0.097, 0.045, 0.102),
    (1.08, 0.464, 0.079, 0.022, 0.094),
    (1.02, 0.468, 0.069, -0.002, 0.083),
    (0.975, 0.468, 0.062, -0.018, 0.072),
]

# palm block, wrist to knuckles: z, cx, w (x half), cy, d (y half)
PALM = [
    (0.995, 0.468, 0.056, -0.022, 0.062),
    (0.93, 0.472, 0.062, -0.030, 0.070),
    (0.86, 0.476, 0.060, -0.035, 0.066),
    (0.82, 0.478, 0.050, -0.038, 0.056),
]

# fingers: knuckle (x, y, z), tip (x, z), radius; index at the inner front, pinky at the outer back
FINGERS = [
    ('finger_index_L', (0.440, -0.068, 0.835), (0.436, 0.700), 0.0150),
    ('finger_middle_L', (0.467, -0.056, 0.830), (0.459, 0.682), 0.0155),
    ('finger_ring_L', (0.493, -0.042, 0.835), (0.480, 0.700), 0.0150),
    ('finger_pinky_L', (0.516, -0.028, 0.845), (0.500, 0.738), 0.0130),
]


def build(k):
    k.loft('upper_arm_L', [oct_ring(k, *r) for r in UPPER], k.SKIN, cap_start=True, cap_end=True)
    k.loft('forearm_L', [oct_ring(k, *r) for r in FOREARM], k.SKIN, cap_start=True, cap_end=True)
    # elbow point (olecranon) at the back of the joint
    k.tube('elbow_L', [(0.418, 0.100, 1.36), (0.425, 0.118, 1.31), (0.432, 0.112, 1.26)],
           [0.025, 0.035, 0.025], 6, k.SKIN)
    k.loft('palm_L', [oct_ring(k, *r) for r in PALM], k.SKIN, cap_start=True, cap_end=True)

    # four fingers, slightly curled back toward the palm as they hang
    for name, (x0, y0, zk), (xt, zt), r in FINGERS:
        L = zk - zt
        pts = [(x0, y0, zk),
               (x0 + 0.3 * (xt - x0), y0 - 0.008, zk - 0.40 * L),
               (x0 + 0.7 * (xt - x0), y0 + 0.012, zk - 0.75 * L),
               (xt, y0 + 0.035, zt)]
        k.tube(name, pts, [r * 1.25, r * 1.15, r, r * 0.8], 6, k.SKIN)

    # thumb: from the base of the palm, inner front, hanging down and a little forward
    k.tube('thumb_L', [(0.415, -0.060, 0.955), (0.385, -0.085, 0.880), (0.370, -0.092, 0.810),
                       (0.374, -0.086, 0.772)], [0.026, 0.021, 0.017, 0.013], 6, k.SKIN)
