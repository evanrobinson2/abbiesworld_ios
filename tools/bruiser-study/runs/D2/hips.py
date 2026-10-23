"""D2 hips: tank-top lower body and hem band, shorts with a crotch and two leg openings.
Second chunk of arm D2: meets the chest torso at row 462 (x 414..616, half depth 0.17) and hands the legs
two openings (his right at row ~620, his left at row ~632, slightly lower: three-quarter turn)."""
import math
import numpy as np

N = 24
E = 0.7  # superellipse exponent, matches the chest's slab-sided section


def _sq(a, e=E):
    c, s = math.cos(a), math.sin(a)
    return math.copysign(abs(c) ** e, c), math.copysign(abs(s) ** e, s)


def _ring(k, row, cr, cl, d, yc=0.0, n=N, e=E, front_drop=0.0, back_lift=0.0):
    """Section between reference cols cr..cl at reference row; the front can sag (hem curve) by front_drop rows."""
    out = []
    for i in range(n):
        a = -math.pi / 2 + 2 * math.pi * i / n
        sx, sy = _sq(a, e)
        c = math.cos(a); s = math.sin(a)
        r = row
        if s < 0:
            r += front_drop * (1 - abs(c)) ** 1.2
        else:
            r -= back_lift * (1 - abs(c))
        x0, z = k.px(cr, r); x1, _ = k.px(cl, r)
        cx = (x0 + x1) / 2; hw = (x1 - x0) / 2
        out.append(np.array([cx + hw * sx, yc + d * sy, z]))
    return out


def build(k):
    # tank top: continue the body down from the chest's last section into the hem band
    body = [
        _ring(k, 455, 413, 617, 0.182),
        _ring(k, 462, 412, 618, 0.183, front_drop=4),
    ]
    k.loft('tank_top_lower', body, k.TANK_TOP)

    # hem band: a slightly proud ring, lower at the front centre (the reference's smile curve)
    band = [
        _ring(k, 452, 410, 620, 0.19, front_drop=12),
        _ring(k, 458, 408, 622, 0.198, front_drop=13),
        _ring(k, 474, 408, 622, 0.198, front_drop=16),
        _ring(k, 478, 410, 620, 0.19, front_drop=16),
    ]
    k.loft('tank_hem_band', band, k.TANK_TOP, cap_start=False, cap_end=False)
    k.tube('tank_hem_edge', _ring(k, 476, 409, 621, 0.196, front_drop=16) + [_ring(k, 476, 409, 621, 0.196, front_drop=16)[0]],
           0.005, 5, k.TANK_TOP)

    # shorts: waist under the band down to the crotch, then two legs to the openings
    waist = [
        (470, 410, 620, 0.178),
        (500, 408, 621, 0.18),
        (528, 406, 620, 0.166),
        (552, 412, 614, 0.13),
    ]
    rings = [_ring(k, r, a, b, d) for r, a, b, d in waist]
    k.loft('shorts_seat', rings, k.SHORTS, cap_start=True, cap_end=True)

    # crotch: the two short legs meet in a soft V under the seat (no separate bulge piece; it read as a knob)

    # legs of the shorts: (row, his-right col, his-left col) per side, from the crotch to the opening
    legs = {
        'R': [(505, 407, 522, 0.18, 0.0), (545, 402, 520, 0.16, 0.0), (575, 399, 518, 0.145, 0.0), (600, 397, 516, 0.14, 0.0),
              (620, 398, 510, 0.135, 0.0)],
        'L': [(505, 508, 621, 0.18, 0.0), (545, 512, 625, 0.16, 0.0), (575, 516, 630, 0.145, 0.0), (605, 521, 634, 0.14, 0.0),
              (632, 527, 634, 0.135, 0.0)],
    }
    for side, secs in legs.items():
        lr = [_ring(k, r, a, b, d, yc, n=16, e=0.8) for r, a, b, d, yc in secs]
        # the opening hem: a thin turned-back lip
        r, a, b, d, yc = secs[-1]
        lip = _ring(k, r - 1, a - 1.5, b + 1.5, d + 0.007, yc, n=16, e=0.8)
        k.loft('shorts_leg_' + side, lr, k.SHORTS, cap_start=True, cap_end=True)
        k.tube('shorts_leg_opening_' + side, lip + [lip[0]], 0.005, 4, k.SHORTS)
