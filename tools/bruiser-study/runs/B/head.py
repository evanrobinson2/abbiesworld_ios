"""Arm B, chunk head: blocky bald skull, heavy brow, wedge nose, square jaw, stern mouth, ears, neck into trapezius."""
import numpy as np


def oct_ring(z, xl, xr, yf, yb, ch, chb=None):
    """Eight-point blocky ring, counter-clockwise from above; front is -y. ch = front chamfer, chb = back chamfer."""
    chb = ch if chb is None else chb
    return np.array([
        (xr - ch, yf, z), (xr, yf + ch, z), (xr, yb - chb, z), (xr - chb, yb, z),
        (xl + chb, yb, z), (xl, yb - chb, z), (xl, yf + ch, z), (xl + ch, yf, z)])


def build(k):
    S = k.SKIN
    # Skull to chin: from the picture, crown z 2.0 (cols 487-550), brow z 1.91 (cols 484-551),
    # jaw corner his left (550, 139), his right side straight down to (487, 147), chin (491-524, 164).
    rings = [
        oct_ring(1.762, -0.052, 0.018, -0.070, -0.005, 0.012),
        oct_ring(1.775, -0.060, 0.034, -0.080, 0.025, 0.014),
        oct_ring(1.800, -0.064, 0.064, -0.084, 0.050, 0.018),
        oct_ring(1.825, -0.062, 0.076, -0.086, 0.065, 0.020),
        oct_ring(1.860, -0.064, 0.073, -0.088, 0.072, 0.022),
        oct_ring(1.905, -0.066, 0.075, -0.090, 0.075, 0.020),
        oct_ring(1.945, -0.065, 0.074, -0.086, 0.074, 0.020),
        oct_ring(1.975, -0.058, 0.069, -0.074, 0.068, 0.028),
        oct_ring(1.988, -0.042, 0.056, -0.058, 0.055, 0.025),
    ]
    k.loft('skull', rings, S, cap_start=True, cap_end=True)

    # Heavy brow: a slab across the forehead, overhanging the eyes, with a dip over the nose.
    # Two slabs that dip toward the nose for the scowl.
    bf = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    for side, xo, xi in (('R', -0.060, -0.004), ('L', 0.070, 0.008)):
        a, b = (xo, xi) if xo < xi else (xi, xo)
        za = 1.906 if a == xo else 1.896; zb = 1.896 if a == xo else 1.906
        bv = [(a, -0.088, za), (b, -0.088, zb), (b, -0.106, zb + 0.010), (a, -0.106, za + 0.010),
              (a, -0.088, za + 0.030), (b, -0.088, zb + 0.030), (b, -0.098, zb + 0.028), (a, -0.098, za + 0.028)]
        k.mesh('brow_' + side, bv, bf, S)

    # Wedge nose from the brow (517, 100) down to the tip (517, 116).
    nx = 0.002
    nv = [(nx, -0.100, 1.902),                      # bridge top
          (nx - 0.016, -0.090, 1.858), (nx + 0.016, -0.090, 1.858),  # nostril wings (on face)
          (nx, -0.122, 1.866),                      # tip
          (nx - 0.010, -0.112, 1.856), (nx + 0.010, -0.112, 1.856),  # underside
          (nx - 0.007, -0.090, 1.902), (nx + 0.007, -0.090, 1.902)]  # root on face
    nf = [(0, 6, 1, 3), (0, 3, 2, 7), (3, 1, 4), (3, 5, 2), (3, 4, 5), (1, 2, 5, 4), (6, 0, 7)]
    k.mesh('nose', nv, nf, S)

    # Stern mouth: a downturned upper-lip ridge over a pushed-out chin block.
    mv = [(-0.030, -0.088, 1.826), (0.030, -0.088, 1.826), (0.020, -0.096, 1.836), (-0.020, -0.096, 1.836),
          (-0.030, -0.086, 1.840), (0.030, -0.086, 1.840)]
    mf = [(0, 1, 2, 3), (3, 2, 5, 4), (0, 3, 4), (1, 5, 2)]
    k.mesh('upper_lip', mv, mf, S)
    k.box('chin', (0.052, 0.016, 0.040), (-0.016, -0.080, 1.788), S)

    # Ears: small flat blocks on the skull sides (his left ear shows at cols 546-556, rows 90-108).
    for side, x in (('L', 0.079), ('R', -0.060)):
        e = k.box('ear_' + side, (0.010, 0.030, 0.038), (x, 0.012, 1.880), S)
        e.rotation_euler = (0, 0, 0.25 if side == 'L' else -0.25)

    # Neck into the trapezius: thick column behind the jaw sloping out to the shoulders (to x -0.184 / +0.18).
    nk = [
        oct_ring(1.655, -0.255, 0.270, -0.100, 0.115, 0.040, 0.060),
        oct_ring(1.715, -0.250, 0.290, -0.080, 0.100, 0.050, 0.060),
        oct_ring(1.745, -0.245, 0.300, -0.065, 0.090, 0.050, 0.050),
        oct_ring(1.765, -0.200, 0.265, -0.055, 0.080, 0.040, 0.040),
        oct_ring(1.790, -0.110, 0.200, -0.050, 0.070, 0.025, 0.030),
        oct_ring(1.815, -0.068, 0.130, -0.045, 0.065, 0.022, 0.028),
        oct_ring(1.845, -0.058, 0.080, -0.040, 0.060, 0.020, 0.025),
    ]
    k.loft('neck_trapezius', nk, S, cap_start=True, cap_end=True)
