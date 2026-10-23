"""Male #1, the toned papercraft man (Midjourney male-base-toned_0, Evan's pick 2026-10-23). Round 2.
python build.py -> male-hero.glb and male-hero.json

Every number below is read off concept.png (896 x 1344, front view), in pixels: a row is (y, centre x, half-width,
forward shift). px() turns pixels into metres; the right side mirrors the left. Front faces -Y, Z up, origin between
the feet. Depth is not in a front view, so each part has a depth ratio taken from ordinary anatomy.

Round 2 answers "it's not really getting it" (Evan): round 1 was a slim mannequin of round tubes. The picture is
paper: big angular deltoids, a pec shelf with a sternum fold, a hard V-taper to a narrow waist, heavy thighs and
calves, and every limb a separate folded piece with a ridge down its front and a seam where it overlaps the next.
So: rings carry a vertex at the front (the fold ridge), limbs are separate overlapping pieces with flared cuffs,
the chest rings are shaped by a pec profile, and the girths are re-measured from the picture."""
import os, sys, math, json, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'roman-kit'))
import kit  # noqa: E402

HEIGHT = 1.85                       # metres, crown to sole
TOP, SOLE, MID = 55, 1312, 447      # concept pixels: crown, sole, centre line
S = HEIGHT / (SOLE - TOP)           # metres per pixel
FRONT = -math.pi / 2                # ring start angle that puts a vertex (a fold ridge) dead ahead
PAPER = kit.mat('PaperBody', (226, 199, 168), 0.8)
BRIEFS = kit.mat('Cloth', (222, 198, 170), 0.85)   # the same paper, a shade deeper: briefs are folded from one sheet


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
TORSO = [(705, 50, 0.9, 0), (680, 105, 0.62, 0), (650, 108, 0.6, 0), (620, 106, 0.6, 0), (590, 102, 0.62, -1),
         (560, 95, 0.65, -2), (530, 90, 0.67, -3), (500, 87, 0.68, -4), (480, 87, 0.68, -4), (460, 93, 0.67, -5),
         (440, 101, 0.66, -6), (420, 112, 0.65, -8), (400, 118, 0.66, -10), (370, 121, 0.66, -12), (340, 124, 0.62, -11),
         (310, 126, 0.56, -7), (285, 126, 0.5, -3), (265, 116, 0.5, 0), (248, 98, 0.56, 2), (234, 80, 0.66, 3), (220, 60, 0.8, 4)]
N = 12
PEC = {400: 0.42, 370: 0.46, 340: 0.36, 310: 0.16}      # how far the pec planes stand proud, per ring
ABS = {460: 0.10, 500: 0.09, 530: 0.08}                 # the ab blocks: a little proud of the folds between them
SHELF = {420: -0.08}                                    # the hard fold under the pecs


def torso():
    rings = []
    for y, hw, d, fw in TORSO:
        if 360 <= y <= 600:
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
    """The briefs: the pelvis rings a little proud, cut high at the hips and low at the crotch, with a waistband."""
    sel = [r for r, t in zip(rings, TORSO) if 590 <= t[0] <= 705]
    band = [np.c_[r[:, 0] * 1.045, (r[:, 1] - r[:, 1].mean()) * 1.06 + r[:, 1].mean(), r[:, 2]] for r in sel]
    b0 = band[0]; rx = np.abs(b0[:, 0]).max()
    b0[:, 2] += 96 * S * (np.abs(b0[:, 0]) / rx) ** 1.4 - 4 * S
    kit.loft('briefs', band, BRIEFS, cap_start=True)
    top = band[-1]
    kit.loft('briefs_waistband', [top * [1.015, 1.015, 1] + [0, 0, -16 * S], top * [1.015, 1.015, 1] + [0, 0, 2 * S]], BRIEFS)


def head_neck():
    piece('neck', [(252, MID, 70, 2), (228, MID, 60, 3), (204, MID, 46, 4)], 0.86, 8)
    # head: an egg of flat paper planes; the front ridge is the fold down the blank face, the chin comes to a point
    piece('head', [(228, MID, 26, -20), (212, MID, 44, -10), (190, MID, 49, -4), (160, MID, 52, 0), (125, MID, 59, 2), (95, MID, 55, 3), (72, MID, 44, 4), (58, MID, 22, 4), (54, MID, 6, 4)], 1.12, 8)


def arm(tag, m):
    # deltoid: a round cap whose outer edge is the picture's shoulder line; its own girth profile sets how far it reaches in
    dl = [(y, runs(y)[0][0] + hw, hw, fw) for y, hw, fw in ((262, 24, 0), (280, 42, 0), (300, 50, -2), (320, 52, -3), (345, 48, -3), (372, 38, -2), (398, 20, 0))]
    piece(f'deltoid_{tag}', dl, 0.92, 8, mirror=m)
    piece(f'arm_upper_{tag}', traced([360, 380, 400, 420, 440, 460, 484], lambda y: 280 - (y - 360) * 0.33, lambda y: -3 if y < 440 else 0), 0.9, 8, mirror=m)
    # forearm: flared cuff over the elbow, a big bulge just below it, tapering to the wrist
    lower = traced([480, 500, 520, 540, 560, 580, 600, 620, 640, 660, 676], lambda y: 237 - (y - 480) * 0.28, lambda y: -3 if y < 560 else 0)
    lower[0] = (466, lower[0][1] + 2, lower[0][2] * 1.04, 0)          # flared cuff over the elbow
    piece(f'arm_lower_{tag}', lower, 0.82, 8, mirror=m)
    piece(f'hand_{tag}', traced([672, 690, 710, 730, 750], lambda y: 184 - (y - 672) * 0.3) + [(790, 168, 9)], 0.5, 6, mirror=m)
    piece(f'thumb_{tag}', [(690, 198, 7, -10), (720, 204, 6, -14), (744, 206, 4, -14)], 1.0, 5, mirror=m)
    sh = 2 * MID - 286 if m else 286
    return [round(v, 3) for v in ((sh - MID) * S, 0.0, z(300))], [round(v, 3) for v in (((2 * MID - 177 if m else 177) - MID) * S, 0.0, z(740))]


def leg(tag, m):
    thigh = [(615, 390, 62)] + [(y, (run_at(y, 360)[0] - run_at(y, 360)[1] + MID - 6) / 2, (MID - 6 - (run_at(y, 360)[0] - run_at(y, 360)[1])) / 2, -4) for y in (650, 690)] \
        + traced([720, 760, 800, 840, 880, 910], lambda y: 365 - (y - 720) * 0.2, -4) + [(932, 322, 41, -2)]
    piece(f'leg_upper_{tag}', thigh, 0.88, 8, mirror=m)
    # knee: its own wrapped band, then the shin piece flares over its lower edge
    piece(f'knee_{tag}', [(918, 322, 45, -2), (948, 312, 47, -5), (975, 307, 44, -3)], 0.9, 8, mirror=m)
    piece(f'leg_lower_{tag}', [(960, 307, 45, -2)] + traced([990, 1020, 1060, 1100, 1140, 1180, 1220, 1250], lambda y: 305 - (y - 990) * 0.17, -2), 0.95, 8, mirror=m)
    # foot: a folded wedge, heel under the ankle, toes forward and a little out
    cx = (2 * MID - 250 if m else 250); x0 = (cx - MID) * S; out = (1 if m else -1) * math.radians(9)
    heel = kit.ring(30 * S, 34 * S, 0, 8, a0=FRONT, a1=FRONT + 2 * math.pi, cx=0, cy=12 * S)
    ank = kit.ring(26 * S, 30 * S, 84 * S, 8, a0=FRONT, a1=FRONT + 2 * math.pi, cx=0, cy=6 * S)
    kit.loft(f'heel_{tag}', [heel, ank], PAPER, cap_start=True, cap_end=True).location = (x0, 0, 0)
    toe = kit.plate(f'foot_{tag}', [(-38 * S, 30 * S), (38 * S, 30 * S), (44 * S, -110 * S), (30 * S, -150 * S), (-30 * S, -150 * S), (-42 * S, -110 * S)], 34 * S, PAPER)
    toe.location = (x0, 0, 0); toe.rotation_euler = (0, 0, out)
    instep = kit.loft(f'instep_{tag}', [kit.ring(30 * S, 40 * S, 34 * S, 6, cx=0, cy=-50 * S), kit.ring(20 * S, 22 * S, 72 * S, 6, cx=0, cy=-10 * S)], PAPER, cap_start=True, cap_end=True)
    instep.location = (x0, 0, 0); instep.rotation_euler = (0, 0, out)
    hip = 2 * MID - 392 if m else 392
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
    info = dict(figure='male-hero', round=2, concept='male-base-toned_0', height_m=HEIGHT, triangles=kit.triangles(), sockets=sock)
    json.dump(info, open(export + '.json', 'w'), indent=2)
    return info


if __name__ == '__main__':
    print(build(os.path.join(HERE, 'male-hero')))
