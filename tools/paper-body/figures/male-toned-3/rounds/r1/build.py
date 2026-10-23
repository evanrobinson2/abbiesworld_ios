"""Man 3, the toned papercraft man (Midjourney male-base-toned_3, job adc9fe3e index 3, Evan's pick 2026-10-23).
python build.py -> male-toned-3.glb and male-toned-3.json

Built the same way as male-hero round 2, with every number re-read off THIS concept (896 x 1344, front view), in
pixels: a row is (y, centre x, half-width, forward shift). Widths of the torso, arms and legs are traced row by row
from concept_mask.png; the recipe decides the parts, depth ratios, fold ridges and seams. Front faces -Y, Z up,
origin between the feet.

What this pick shows, and how it is built: a long narrow helmet head with a pointed chin; steep traps; big rounded
deltoids; a pec shelf with a sternum fold over a narrow ab column; arms hanging almost straight down with a cuff at
the elbow; a wide waistband over briefs cut high at the hip; heavy thighs; knee bands; shins that flare at the top
and taper to an ankle cuff; slim pointed slipper feet."""
import os, sys, math, json, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'roman-kit'))
import kit  # noqa: E402

HEIGHT = 1.85                       # metres, crown to sole
TOP, SOLE, MID = 81, 1292, 448      # concept pixels: crown, sole, centre line
S = HEIGHT / (SOLE - TOP)           # metres per pixel
FRONT = -math.pi / 2                # ring start angle that puts a vertex (a fold ridge) dead ahead
PAPER = kit.mat('PaperBody', (226, 211, 186), 0.8)   # this pick's paper is a paler ivory than man #1's
BRIEFS = kit.mat('Cloth', (222, 206, 180), 0.85)   # the same paper, a shade deeper: briefs are folded from one sheet


def z(y):
    return (SOLE - y) * S


def ring(y, cx, hw, depth, n, fw=0.0, turn=0.0):
    """A horizontal ring in pixels: centre x, half-width, depth ratio, forward shift (negative = toward the viewer).
    turn rotates the ring by that fraction of a step."""
    a0 = FRONT + turn * 2 * math.pi / n
    return kit.ring(hw * S, hw * depth * S, z(y), n, a0=a0, a1=a0 + 2 * math.pi, cx=(cx - MID) * S, cy=fw * S)


def piece(name, rows, depth, n=8, mat=PAPER, mirror=False):
    """One folded paper part: a loft through rows of (y, centre x, half-width[, forward shift]), capped both ends."""
    rings = []
    for r in rows:
        y, cx, hw = r[:3]; fw = r[3] if len(r) > 3 else 0.0
        rings.append(ring(y, 2 * MID - cx if mirror else cx, hw, depth, n, fw))
    return kit.loft(name, rings, mat, cap_start=True, cap_end=True)


# The outline comes from Evan's pick itself: concept_mask.png (rembg cut-out of concept.png) gives, row by row, where
# the figure's paper starts and stops. The recipe decides which rows, which part each run belongs to, the depth, the
# fold ridges and the seams; the picture decides the widths.
from PIL import Image  # noqa: E402
MASK = np.asarray(Image.open(os.path.join(HERE, 'concept_mask.png')).convert('L')) > 127


def runs(y):
    d = np.diff(np.r_[0, MASK[int(y)].astype(int), 0]); s, e = np.where(d == 1)[0], np.where(d == -1)[0]
    return [(int(a), int(b)) for a, b in zip(s, e) if b - a > 3]


def run_at(y, x):
    """The run on row y that contains (or is nearest to) pixel x, as (centre, half-width)."""
    rs = runs(y); a, b = min(rs, key=lambda r: 0 if r[0] <= x <= r[1] else min(abs(r[0] - x), abs(r[1] - x)))
    return (a + b) / 2, (b - a) / 2


def traced(ys, x_of_y, fw=0.0, shrink=1.0):
    """Rows for piece(): each row's centre and half-width read from the mask run around x_of_y(y)."""
    out = []
    for y in ys:
        c, hw = run_at(y, x_of_y(y)); out.append((y, c, hw * shrink, fw if not callable(fw) else fw(y)))
    return out


# Torso, crotch to neck: (y, half-width, depth ratio, forward shift). Read off the picture's outline.
TORSO = [(695, 50, 0.9, 0), (680, 110, 0.62, 0), (650, 108, 0.6, 0), (626, 104, 0.6, 0), (606, 96, 0.62, -1),
         (586, 93, 0.64, -1), (566, 88, 0.66, -2), (546, 86, 0.67, -3), (526, 87, 0.68, -3), (506, 88, 0.68, -4),
         (486, 90, 0.68, -4), (466, 95, 0.67, -5), (446, 105, 0.66, -6), (426, 116, 0.65, -8), (406, 120, 0.66, -10),
         (380, 122, 0.66, -12), (350, 122, 0.62, -11), (320, 114, 0.56, -7), (296, 102, 0.52, -3), (276, 92, 0.52, 0),
         (258, 84, 0.58, 2), (244, 76, 0.66, 3), (230, 58, 0.8, 4)]
N = 12
PEC = {406: 0.36, 380: 0.44, 350: 0.40, 320: 0.18}      # how far the pec planes stand proud, per ring
ABS = {466: 0.10, 506: 0.09, 546: 0.08}                 # the ab blocks: a little proud of the folds between them
SHELF = {426: -0.08}                                    # the hard fold under the pecs


def torso():
    rings = []
    for y, hw, d, fw in TORSO:
        if 406 <= y <= 606:
            hw = run_at(y, MID)[1]                             # the picture's own waist and lats
        r = ring(y, MID, hw, d, N, fw)
        cy = fw * S
        front = r[:, 1] < cy - 1e-6
        x = np.abs(r[front, 0]) / (hw * S)                      # 0 at the sternum, 1 at the side
        amt = PEC.get(y, 0) * np.exp(-((x - 0.5) / 0.28) ** 2) + ABS.get(y, 0) * np.exp(-((x - 0.45) / 0.2) ** 2) \
            + SHELF.get(y, 0) * np.exp(-((x - 0.5) / 0.3) ** 2)
        r[front, 1] = cy + (r[front, 1] - cy) * (1 + amt)
        r[np.argmin(r[:, 1]), 1] *= 0.94 if y in PEC or y in ABS else 1.0   # sternum and linea alba sit in a fold
        rings.append(r)
    kit.loft('torso', rings, PAPER, cap_start=True, cap_end=True)
    return rings


def briefs(rings):
    """The briefs: the pelvis rings a little proud, cut high at the hip (y 620) down to the crotch (y 695), under a
    wide waistband (y 566 to 600) that stands proud of the belly like a separate folded strip."""
    sel = [r for r, t in zip(rings, TORSO) if 566 <= t[0] <= 695]
    band = [np.c_[r[:, 0] * 1.045, (r[:, 1] - r[:, 1].mean()) * 1.06 + r[:, 1].mean(), r[:, 2]] for r in sel]
    b0 = band[0]; rx = np.abs(b0[:, 0]).max()
    b0[:, 2] += 76 * S * (np.abs(b0[:, 0]) / rx) ** 1.4 - 4 * S
    kit.loft('briefs', band, BRIEFS, cap_start=True)
    lo = [r for r, t in zip(rings, TORSO) if t[0] in (606, 586, 566)]
    wb = [np.c_[r[:, 0] * 1.07, (r[:, 1] - r[:, 1].mean()) * 1.1 + r[:, 1].mean(), r[:, 2]] for r in lo]
    kit.loft('briefs_waistband', wb, BRIEFS, cap_start=True, cap_end=True)


def head_neck():
    piece('neck', [(262, MID, 60, 2), (236, MID, 48, 3), (214, MID, 40, 4)], 0.86, 8)
    # head: a long narrow helmet of flat planes; the front ridge is the fold down the blank face, the chin a point
    piece('head', [(232, MID, 12, -22), (214, MID, 34, -10), (190, MID, 42, -4), (160, MID, 48, 0), (130, MID, 47, 2),
                   (106, MID, 43, 3), (90, MID, 32, 4), (82, MID, 10, 4)], 1.15, 8)


def arm(tag, m):
    # deltoid: a round cap whose outer edge is the picture's shoulder line; its own girth profile sets how far it reaches in
    dl = [(y, runs(y)[0][0] + hw, hw, fw) for y, hw, fw in ((268, 20, 0), (284, 40, 0), (300, 52, -2), (320, 56, -3), (345, 52, -3),
                                                           (370, 44, -2), (392, 30, 0), (408, 14, 0))]
    piece(f'deltoid_{tag}', dl, 0.92, 8, mirror=m)
    piece(f'arm_upper_{tag}', [(394, 284, 38, -3)] + traced([406, 426, 446, 466, 486], lambda y: 281 - (y - 406) * 0.25, lambda y: -3 if y < 446 else 0), 0.9, 8, mirror=m)
    # forearm: flared cuff over the elbow, then a long straight taper to the wrist
    lower = traced([496, 506, 526, 546, 566, 586, 606, 626, 642], lambda y: 255 - (y - 496) * 0.22, lambda y: -3 if y < 566 else 0)
    lower[0] = (480, lower[0][1] + 2, lower[0][2] * 1.06, 0)
    piece(f'arm_lower_{tag}', lower, 0.82, 8, mirror=m)
    piece(f'hand_{tag}', traced([640, 656, 676, 696, 716, 736], lambda y: 225) + [(764, 236, 8)], 0.5, 6, mirror=m)
    piece(f'thumb_{tag}', [(676, 246, 8, -8), (700, 258, 6, -10), (722, 264, 4, -10)], 1.0, 5, mirror=m)
    sh = 2 * MID - 300 if m else 300
    return [round(v, 3) for v in ((sh - MID) * S, 0.0, z(320))], [round(v, 3) for v in (((2 * MID - 225 if m else 225) - MID) * S, 0.0, z(700))]


def leg(tag, m):
    def inner(y):   # above the crotch the mask joins both legs: the thigh runs from the outer edge to the centre line
        a = run_at(y, 360)[0] - run_at(y, 360)[1]; return (y, (a + MID - 6) / 2, (MID - 6 - a) / 2, -4)
    thigh = [(612, 395, 60)] + [inner(y) for y in (646, 686)] + traced([726, 766, 806, 846, 886, 916], lambda y: 368 - (y - 726) * 0.11, -4) + [(936, 342, 40, -2)]
    piece(f'leg_upper_{tag}', thigh, 0.88, 8, mirror=m)
    # knee: its own wrapped band, then the shin piece flares over its lower edge
    piece(f'knee_{tag}', [(928, 344, 42, -2), (956, 336, 46, -5), (988, 330, 47, -3)], 0.9, 8, mirror=m)
    piece(f'leg_lower_{tag}', [(972, 330, 47, -2)] + traced([1006, 1026, 1066, 1106, 1146, 1186, 1206], lambda y: 323 - (y - 1006) * 0.1, -2), 0.95, 8, mirror=m)
    piece(f'ankle_{tag}', [(1200, 304, 26, -1), (1226, 303, 29, -2), (1244, 301, 30, -2)], 0.95, 8, mirror=m)
    # foot: a slim pointed paper slipper, heel under the ankle, toe straight ahead
    cx = (2 * MID - 296 if m else 296); x0 = (cx - MID) * S; out = (1 if m else -1) * math.radians(4)
    heel = kit.ring(28 * S, 32 * S, 0, 8, a0=FRONT, a1=FRONT + 2 * math.pi, cx=0, cy=12 * S)
    ank = kit.ring(26 * S, 30 * S, 56 * S, 8, a0=FRONT, a1=FRONT + 2 * math.pi, cx=0, cy=6 * S)
    kit.loft(f'heel_{tag}', [heel, ank], PAPER, cap_start=True, cap_end=True).location = (x0, 0, 0)
    toe = kit.plate(f'foot_{tag}', [(-32 * S, 30 * S), (32 * S, 30 * S), (34 * S, -100 * S), (12 * S, -160 * S), (-12 * S, -160 * S), (-34 * S, -100 * S)], 30 * S, PAPER)
    toe.location = (x0, 0, 0); toe.rotation_euler = (0, 0, out)
    instep = kit.loft(f'instep_{tag}', [kit.ring(28 * S, 44 * S, 30 * S, 6, cx=0, cy=-50 * S), kit.ring(18 * S, 22 * S, 56 * S, 6, cx=0, cy=-6 * S)], PAPER, cap_start=True, cap_end=True)
    instep.location = (x0, 0, 0); instep.rotation_euler = (0, 0, out)
    hip = 2 * MID - 395 if m else 395
    return [round(v, 3) for v in ((hip - MID) * S, 0.0, z(630))], [round(x0, 3), round(-60 * S, 3), 0.0]


def build(export):
    kit.reset()
    rings = torso(); briefs(rings); head_neck()
    sock = {}
    for tag, m in (('l', False), ('r', True)):
        sock[f'shoulder_{tag}'], sock[f'hand_{tag}'] = arm(tag, m)
        sock[f'hip_{tag}'], sock[f'foot_{tag}'] = leg(tag, m)
    for o in kit.bpy.context.scene.objects:
        if o.type == 'MESH':
            kit.facet(o, 0.0012, 0.03, levels=0, seed=zlib.crc32(o.name.encode()) % 97)
    kit.ground(); kit.export(export + '.glb')
    info = dict(figure='male-toned-3', round=1, concept='male-base-toned_3', height_m=HEIGHT, triangles=kit.triangles(), sockets=sock)
    json.dump(info, open(export + '.json', 'w'), indent=2)
    return info


if __name__ == '__main__':
    print(build(os.path.join(HERE, 'male-toned-3')))
