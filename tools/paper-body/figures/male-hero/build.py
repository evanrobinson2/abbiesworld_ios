"""Male #1, the toned papercraft man (Midjourney male-base-toned_0, Evan's pick 2026-10-23). Round 2.
python build.py -> male-hero.glb and male-hero.json

Every number below is read off concept.png (896 x 1344, front view), in pixels: a row is (y, centre x, half-width,
forward shift). px() turns pixels into metres; the right side mirrors the left. Front faces -Y, Z up, origin between
the feet. Depth is not in a front view, so each part has a depth ratio taken from ordinary anatomy.

Round 2 answers "it's not really getting it" (Evan): round 1 was a slim mannequin of round tubes. The picture is
paper: big angular deltoids, a pec shelf with a sternum fold, a hard V-taper to a narrow waist, heavy thighs and
calves, and every limb a separate folded piece with a ridge down its front and a seam where it overlaps the next.
So: rings carry a vertex at the front (the fold ridge), limbs are separate overlapping pieces with flared cuffs,
the chest rings are shaped by a pec profile, and the girths are re-measured from the picture.

Round 3 answers "the modeler got lazy and didn't bother with hands. or a real facial outline or nose" (Evan, on the
paper figures): every part the pick shows is now its own piece. The head is the pick's folded mask: a crown plateau,
a forehead that overhangs a recessed face panel with a nose ridge down its middle, cheek and jaw planes to a chin.
The neck is a narrow column with a throat strip, and the traps slope from it. Each hand is a palm, four fingers of
three joints and a thumb, hanging relaxed and curled toward the thigh, under a flared wrist cuff cut into flaps.
Limbs carry a raised front keel and a slow twist, so their folds run diagonally as on the paper; the shins are
shells notched under the knee."""
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


def piece(name, rows, depth, n=8, mat=PAPER, mirror=False, keel=0.0, twist=0.0, edit=None):
    """One folded paper part: a loft through rows of (y, centre x, half-width[, forward shift]), capped both ends.
    keel pushes the front vertex out (a crisp fold ridge down the front); twist turns the rings by that many steps
    from the first row to the last, so the ridges run diagonally like the pick's folds. edit(rings) may cut notches."""
    rings = []
    for k, r in enumerate(rows):
        y, cx, hw = r[:3]; fw = r[3] if len(r) > 3 else 0.0
        t = twist * k / max(1, len(rows) - 1) * (-1 if mirror else 1)
        g = ring(y, 2 * MID - cx if mirror else cx, hw, depth, n, fw, turn=t)
        if keel:
            c = g[:, :2].mean(0); i = int(np.argmin(g[:, 1])); g[i, :2] = c + (g[i, :2] - c) * (1 + keel)
        rings.append(g)
    if edit:
        edit(rings)
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
         (310, 126, 0.56, -7), (285, 126, 0.5, -3), (265, 116, 0.46, 0), (250, 90, 0.5, 3), (236, 62, 0.62, 4), (224, 40, 0.9, 5)]
N = 12
PEC = {400: 0.55, 370: 0.6, 340: 0.46, 310: 0.2}      # how far the pec planes stand proud, per ring
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


def head_row(y, hw, fw, fd, nose, cw, cd, back, lip=6, cy=0.0):
    """One ring of the folded mask, 12 points from the nose ridge round to the back of the skull (pixels; negative depth
    is toward the viewer): the nose ridge, the face panel's edge, the lip where the panel steps out to the cheek, the
    cheek corner, the side, the back corner and the back."""
    half = [(fw, fd), (fw + 4, fd - lip), (cw, cd), (hw, 0.0), (hw * 0.72, back * 0.72)]
    pts = [(0.0, fd + nose)] + half + [(0.0, back)] + [(-x, d) for x, d in reversed(half)]
    return np.array([((x) * S, (d + cy) * S, z(y)) for x, d in pts])


# The head, chin to crown, read off the pick: (y, side half-width, face half-width, face depth, nose, cheek half-width,
# cheek depth, back). The forehead row (96) stands out over the face panel; the panel is recessed by the lip.
HEAD = [(238, 30, 12, -34, 0, 24, -24, 38, 2), (228, 34, 22, -57, -2, 32, -30, 44, 9), (206, 46, 25, -62, -5, 44, -30, 58, 10),
        (172, 50, 25, -56, -10, 48, -28, 66, 11), (140, 57, 25, -49, -7, 55, -26, 70, 13), (106, 58, 25, -41, -3, 55, -28, 70, 18),
        (96, 56, 28, -70, -2, 52, -46, 68, 1), (78, 47, 25, -62, -2, 42, -40, 61, 1), (63, 31, 17, -40, 0, 27, -28, 42, 1),
        (55, 16, 9, -20, 0, 13, -14, 22, 0)]


def head_neck():
    # the neck is a narrow column (the pick's throat strip and the folds beside it); the traps slope out from it
    piece('neck', [(258, MID, 40, 3), (236, MID, 34, 3), (212, MID, 30, 4)], 0.95, 8)
    kit.loft('throat', [np.array([(-13 * S, d * S, z(y)) for d in (-37, -31)] + [(13 * S, d * S, z(y)) for d in (-31, -37)]) for y in (262, 222)],
             PAPER, cap_start=True, cap_end=True)
    for sx in (-1, 1):   # the two neck cords, from behind the jaw down to the notch at the top of the sternum
        kit.tube(f'neck_cord_{"l" if sx < 0 else "r"}', [(sx * 34 * S, -14 * S, z(204)), (sx * 24 * S, -32 * S, z(236)), (sx * 11 * S, -44 * S, z(270))],
                 np.array([6, 6, 4.5]) * S, 4, PAPER)
    rings = [head_row(y, hw, fw, fd, nose, cw, cd, back, lip, cy=-4) for y, hw, fw, fd, nose, cw, cd, back, lip in HEAD]
    kit.loft('head', rings, PAPER, cap_start=True, cap_end=True)


def hand(tag, m, wrist, a=40):
    """A hand hanging from the wrist: palm, four fingers of three joints and a thumb, curled a little toward the
    thigh. Local frame: u is the palm normal (toward the body), v runs across the knuckles (index at the front), w is
    down. a turns the palm so its back shows to the front, as in the pick."""
    sx = -1 if m else 1
    th = math.radians(a)
    U = np.array([sx * math.cos(th), math.sin(th), 0.0]); V = np.array([sx * math.sin(th), -math.cos(th), 0.0]); W = np.array([0, 0, -1.0])
    o = np.array([(wrist[0] - MID) * S, 0.0, z(wrist[1])])
    P = lambda u, v, w: o + (u * U + v * V + w * W) * S
    sec = lambda w, t, b, du=0.0: np.array([P(du, -b, w), P(du + t, -b * 0.5, w), P(du + t, b * 0.5, w), P(du, b, w), P(du - t, b * 0.5, w), P(du - t, -b * 0.5, w)])
    kit.loft(f'palm_{tag}', [sec(0, 9, 18), sec(18, 10, 24), sec(36, 10, 26), sec(50, 8, 25, 2)], PAPER, cap_start=True, cap_end=True)
    for name, v, L, r, curl in (('index', -18, 60, 5.8, 0.8), ('middle', -6, 68, 6.0, 0.9), ('ring', 6, 63, 5.7, 1.0), ('little', 17, 51, 5.0, 1.1)):
        pts = [P(2, v, 48)]; d = np.array([0.0, 0.0, 1.0]); ang = 0.0; p = np.array([2.0, v, 48.0])
        for seg, bend in ((0.46, 14), (0.31, 26), (0.23, 24)):
            ang += math.radians(bend * curl)
            d = np.array([math.sin(ang), -0.12, math.cos(ang)]); p = p + d * L * seg
            pts.append(P(*p))
        kit.tube(f'finger_{name}_{tag}', pts, np.linspace(r, r * 0.72, len(pts)) * S, 5, PAPER)
    kit.tube(f'thumb_{tag}', [P(4, -20, 10), P(9, -30, 22), P(12, -35, 36), P(14, -35, 48)], np.array([7, 6.2, 5.2, 4.2]) * S, 5, PAPER)


def cuff(tag, m, top, bot):
    """The flared paper cuff over the wrist, open below and cut into flaps (every other point hangs lower)."""
    rows = []
    for (y, cx, hw), drop in ((top, 0), (bot, 1)):
        g = ring(y, 2 * MID - cx if m else cx, hw, 0.95, 10, -2)
        if drop:
            g[::2, 2] -= 12 * S
        rows.append(g)
    kit.loft(f'cuff_{tag}', rows, PAPER)


def arm(tag, m):
    # deltoid: a round cap whose outer edge is the picture's shoulder line; its own girth profile sets how far it reaches in
    dl = [(y, runs(y)[0][0] + hw, hw, fw) for y, hw, fw in ((262, 24, 0), (280, 42, 0), (300, 50, -2), (320, 52, -3), (345, 48, -3), (372, 38, -2), (398, 20, 0))]
    piece(f'deltoid_{tag}', dl, 0.92, 8, mirror=m, keel=0.12, twist=0.5)
    piece(f'arm_upper_{tag}', traced([360, 380, 400, 420, 440, 460, 484], lambda y: 280 - (y - 360) * 0.33, lambda y: -3 if y < 440 else 0), 0.9, 8, mirror=m, keel=0.08, twist=0.5)
    # forearm: flared cuff over the elbow, a big bulge just below it, tapering to the wrist
    lower = traced([480, 500, 520, 540, 560, 580, 600, 620, 640, 660, 676], lambda y: 237 - (y - 480) * 0.28, lambda y: -3 if y < 560 else 0)
    lower[0] = (466, lower[0][1] + 2, lower[0][2] * 1.04, 0)          # flared cuff over the elbow
    piece(f'arm_lower_{tag}', lower, 0.82, 8, mirror=m, keel=0.1, twist=-0.5)
    cuff(tag, m, (664, 188, 25), (728, 182, 31))
    hand(tag, m, (2 * MID - 183 if m else 183, 700))
    sh = 2 * MID - 286 if m else 286
    return [round(v, 3) for v in ((sh - MID) * S, 0.0, z(300))], [round(v, 3) for v in (((2 * MID - 177 if m else 177) - MID) * S, 0.0, z(740))]


def notch(rings):
    """The shin shell is cut in a V under the knee: its top front points drop."""
    g = rings[0]; i = int(np.argmin(g[:, 1])); n = len(g)
    g[i, 2] -= 48 * S; g[(i + 1) % n, 2] -= 24 * S; g[(i - 1) % n, 2] -= 24 * S


def leg(tag, m):
    thigh = [(615, 390, 62)] + [(y, (run_at(y, 360)[0] - run_at(y, 360)[1] + MID - 6) / 2, (MID - 6 - (run_at(y, 360)[0] - run_at(y, 360)[1])) / 2, -4) for y in (650, 690)] \
        + traced([720, 760, 800, 840, 880, 910], lambda y: 365 - (y - 720) * 0.2, -4) + [(932, 322, 41, -2)]
    piece(f'leg_upper_{tag}', thigh, 0.88, 8, mirror=m, keel=0.18, twist=0.75)
    # knee: its own wrapped band, then the shin piece flares over its lower edge
    piece(f'knee_{tag}', [(918, 322, 40, -2), (948, 312, 42, -5), (975, 307, 39, -3)], 0.9, 8, mirror=m, keel=0.3)
    piece(f'leg_lower_{tag}', [(960, 307, 45, -2)] + traced([990, 1020, 1060, 1100, 1140, 1180, 1220, 1250], lambda y: 305 - (y - 990) * 0.17, -2), 0.95, 8, mirror=m, keel=0.16, edit=notch)
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
    info = dict(figure='male-hero', round=3, concept='male-base-toned_0', height_m=HEIGHT, triangles=kit.triangles(), sockets=sock)
    json.dump(info, open(export + '.json', 'w'), indent=2)
    return info


if __name__ == '__main__':
    print(build(os.path.join(HERE, 'male-hero')))
