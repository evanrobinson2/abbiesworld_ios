"""Man 3, the toned papercraft man (Midjourney male-base-toned_3, job adc9fe3e index 3, Evan's pick 2026-10-23).
python build.py -> male-toned-3.glb and male-toned-3.json

Built the same way as male-hero round 2, with every number re-read off THIS concept (896 x 1344, front view), in
pixels: a row is (y, centre x, half-width, forward shift). Widths of the torso, arms and legs are traced row by row
from concept_mask.png; the recipe decides the parts, depth ratios, fold ridges and seams. Front faces -Y, Z up,
origin between the feet.

What this pick shows, and how it is built: a long narrow helmet head with a pointed chin; steep traps; big rounded
deltoids; a pec shelf with a sternum fold over a narrow ab column; arms hanging almost straight down with a cuff at
the elbow; a wide waistband over briefs cut high at the hip; heavy thighs; knee bands; shins that flare at the top
and taper to an ankle cuff; slim pointed slipper feet.

Round 2 (Evan, 2026-10-23 05:37Z, on the round-1 figures: "I wanted THIS character, and the modeler got lazy and
didn't bother with hands. or a real facial outline or nose"): parts first. The head is a faceted origami mask with a
nose ridge down the centre, brow and cheek planes and a jaw that closes to the pointed chin; the neck carries the V
of the two tendon planes down to the sternum notch; each hand is a palm, four three-segment fingers that curl in
toward the thigh, and a pointed thumb flap, under a folded wrist cuff; limbs twist their rings a half step along
their length so the flat planes run on the diagonal like the pick's folds; kneecaps are their own folded plates. The
torso is eight-sided plates with real dihedral breaks (centre line, pec plates with a hard lower edge, a narrow ab
column whose side planes turn back hard), under a separate waistband with a folded top lip and briefs with a V front;
the feet are folded paper shoes with a ridge along the top."""
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


def piece(name, rows, depth, n=8, mat=PAPER, mirror=False, twist=0.0):
    """One folded paper part: a loft through rows of (y, centre x, half-width[, forward shift]), capped both ends.
    twist turns the rings by up to that fraction of a step along the part, so its flat planes run on the diagonal
    (the folds of the pick's limbs) instead of straight down; mirrored parts twist the other way."""
    rings = []
    for i, r in enumerate(rows):
        y, cx, hw = r[:3]; fw = r[3] if len(r) > 3 else 0.0
        t = twist * i / max(1, len(rows) - 1) * (-1 if mirror else 1)
        hw = hw / math.cos(abs(t) * 2 * math.pi / n)   # a turned ring has a flat at the side: keep the picture's width
        rings.append(ring(y, 2 * MID - cx if mirror else cx, hw, depth, n, fw, turn=t))
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
         (258, 84, 0.5, 9), (244, 76, 0.48, 14), (230, 58, 0.5, 18)]
N = 8


def plates(y):
    """How the front of the torso folds at row y: (x of the two front corners as a fraction of the half-width, how far
    forward they stand as a fraction of the depth, how far forward the centre line stands). Eight-sided rings with a
    vertex dead ahead: that vertex is the sharp centre line from the sternum to the navel, the two front corners are
    where the front plates fold back hard into the side planes."""
    if y <= 276:
        return 0.7, 0.72, 1.0          # traps and the base of the neck
    if y <= 330:
        return 0.68, 0.92, 1.0         # collarbone shelf
    if y <= 406:
        return 0.66, 1.06, 1.04        # pec plates: flat, facing the front, standing proud
    if y <= 426:
        return 0.56, 0.78, 0.9         # the hard lower edge of the pecs: the plates fold under
    if y <= 546:
        return 0.44, 0.96, 1.0         # the ab column: a narrow flat front, the side planes turning back hard
    if y <= 606:
        return 0.48, 0.92, 0.98        # belly under the waistband
    return 0.6, 0.9, 1.0               # pelvis


def torso():
    rings = []
    for y, hw, d, fw in TORSO:
        if 406 <= y <= 606:
            hw = run_at(y, MID)[1]                             # the picture's own waist and lats
        if 446 <= y <= 606:
            d *= 0.9                                           # a toned waist is shallower than the chest
        r = ring(y, MID, hw, d, N, fw)
        cy = fw * S; rx, ry = hw * S, hw * d * S
        fx, fy, fc = plates(y)
        r[0, :2] = [0.0, cy - fc * ry]
        r[1, :2] = [fx * rx, cy - fy * ry]; r[N - 1, :2] = [-fx * rx, cy - fy * ry]
        if 330 < y <= 626:
            r[2, 1] += 0.3 * ry; r[N - 2, 1] += 0.3 * ry       # the sides sit back, so the side planes turn away hard
        rings.append(r)
    kit.loft('torso', rings, PAPER, cap_start=True, cap_end=True)
    return rings


def briefs(rings):
    """The briefs: the pelvis rings a little proud, cut high at the hip (y 620) down to the crotch (y 695), with a V
    front panel folded over them; above, a separate waistband (y 562 to 604) that stands clear of the belly with a
    visible top edge: an outer wall, a lip folded over the top, and an inner wall going back down."""
    sel = [r for r, t in zip(rings, TORSO) if 566 <= t[0] <= 695]
    band = [np.c_[r[:, 0] * 1.045, (r[:, 1] - r[:, 1].mean()) * 1.06 + r[:, 1].mean(), r[:, 2]] for r in sel]
    b0 = band[0]; rx = np.abs(b0[:, 0]).max()
    b0[:, 2] += 76 * S * (np.abs(b0[:, 0]) / rx) ** 1.4 - 4 * S
    kit.loft('briefs', band, BRIEFS, cap_start=True)
    # the V front: a thin folded panel from the hip points down to the crotch, proud of the briefs
    piece('briefs_front', [(610, MID, 58, -62), (636, MID, 46, -66), (664, MID, 28, -66), (692, MID, 6, -52)], 0.08, 4, mat=BRIEFS)
    base = {t[0]: r for r, t in zip(rings, TORSO)}
    def grown(r, k, dz=0.0):
        c = r[:, :2].mean(0); out = r.copy(); out[:, :2] = c + (r[:, :2] - c) * k; out[:, 2] += dz
        return out
    top, bot = base[566], base[606]
    wb = [grown(bot, 1.08, 2 * S), grown(base[586], 1.09), grown(top, 1.1, 4 * S), grown(top, 1.06, 6 * S), grown(top, 1.0, -2 * S)]
    kit.loft('briefs_waistband', wb, BRIEFS, cap_start=True, cap_end=True)


def head_neck():
    """The mask: a flat-topped crown with chamfered corners, straight sides, then a face that closes like a shield to
    the pointed chin (y 228). Rings with a vertex dead ahead: that vertex is the nose ridge, the two beside
    it are the brow and cheek planes. Read off the pick: crown y 82, widest y 140 to 170 (half-width 48), jaw from
    y 190, chin point at x 448. Six sides: the face is two flat planes meeting at the ridge, a narrow wedge, not an egg."""
    n = 6
    # (y, half-width, depth ratio, forward shift, ridge, brow/cheek): ridge pushes the front vertex out, the second
    # number moves its two neighbours (+ out = brow plane, - in = flat cheek planes either side of the nose)
    rows = [(82, 24, 1.0, 6, 0.0, 0.0), (94, 42, 1.0, 3, 0.06, 0.0), (116, 49, 1.02, 0, 0.14, 0.04),
            (150, 51, 1.04, 0, 0.26, -0.06), (184, 46, 1.02, 0, 0.3, -0.1), (204, 37, 1.0, -4, 0.3, -0.08),
            (219, 21, 1.1, -11, 0.22, -0.02), (230, 4, 1.5, -18, 0.0, 0.0)]
    rings = []
    for y, hw, d, fw, ridge, side in rows:
        r = ring(y, MID, hw, d, n, fw)
        cy = fw * S
        r[0, 1] = cy + (r[0, 1] - cy) * (1 + ridge)                     # vertex 0 is dead ahead: the nose ridge
        for k in (1, n - 1):
            r[k, :2] = [r[k, 0] * (1 - 0.5 * side), cy + (r[k, 1] - cy) * (1 + side)]
        if y >= 190:
            # the underside of the mask is one slanted plane from the chin point up to the nape: the jaw line
            back = np.clip((r[:, 1] - cy) / (hw * d * S + 1e-9), -1, 1)
            r[:, 2] += (y - 186) * S * 0.55 * (back + 1) / 2
        rings.append(r)
    kit.loft('head', rings, PAPER, cap_start=True, cap_end=True)
    # neck: a column whose front is folded in to a V groove (the two tendon planes meeting at the sternum notch)
    neck = []
    for y, hw, fw, groove in ((206, 28, 6, 0.0), (228, 31, 0, 0.2), (250, 35, -5, 0.36), (272, 42, -5, 0.4), (292, 52, -2, 0.25)):
        r = ring(y, MID, hw, 0.86, 8, fw); cy = fw * S
        r[0, 1] = cy + (r[0, 1] - cy) * (1 - groove)
        neck.append(r)
    kit.loft('neck', neck, PAPER, cap_start=True, cap_end=True)


def hand(tag, m, wx, wy):
    """A hand hanging from the wrist at concept pixel (wx, wy): a palm slab, four fingers of three segments each that
    curl in toward the thigh, and a pointed thumb flap on the front edge, as in the pick (fingertips at y about 780,
    the thumb tip inward at y about 716). Built in the hand's own frame (lx toward the palm side, ly across the
    knuckles, lz up), turned 58 degrees so the back of the hand faces out and forward, then placed."""
    phi = math.radians(58); c, s_ = math.cos(phi), math.sin(phi)
    ox, oy, oz = (wx - MID) * S, -2 * S, z(wy)

    def world(p):
        lx, ly, lz = p
        x, y = c * lx - s_ * ly, s_ * lx + c * ly
        return (-(ox + x) if m else ox + x, y + oy, oz + lz)        # mirrored about the centre line

    def part(name, rings_local):
        rings = [np.array([world(p) for p in rl]) for rl in rings_local]
        if m:
            rings = [r[::-1] for r in rings]      # a mirrored ring keeps its faces pointing out
        kit.loft(name, rings, PAPER, cap_start=True, cap_end=True)

    def rect(cx, cz, ax, az, hw_across, ht, ly0=0.0):
        """A finger or palm section: centre (lx, lz)=(cx, cz), its thickness axis (ax, az) in the lx-lz plane."""
        return [(cx + ax * ht * a, ly0 + hw_across * b, cz + az * ht * a) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]

    P = S
    L = 60 * P                                            # wrist to knuckles
    part(f'palm_{tag}', [rect(0, 4 * P, 1, 0, 17 * P, 8 * P), rect(1 * P, -L * 0.5, 1, 0, 21 * P, 9 * P),
                         rect(2 * P, -L, 1, 0, 22 * P, 7.5 * P)])
    # fingers, index (front edge, ly < 0) to little; lengths of proximal, middle, distal segments in pixels
    for i, (ly, segs, curl) in enumerate(((-15, (30, 23, 16), (-10, 22, 38)), (-5, (34, 26, 18), (-8, 26, 44)),
                                          (5, (32, 25, 17), (-5, 30, 48)), (15, (26, 19, 14), (-2, 34, 52)))):
        x, zz, a = 2 * P, -L + 2 * P, 0.0
        secs = [rect(x, zz, 1, 0, 3.9 * P, 5.2 * P, ly * P)]
        for k, (sl, cv) in enumerate(zip(segs, curl)):
            a += math.radians(cv)
            x += math.sin(a) * sl * P; zz -= math.cos(a) * sl * P
            w = (3.7 - 0.5 * k) * P; t = (5.0 - 1.0 * k) * P
            secs.append(rect(x, zz, math.cos(a), math.sin(a), w, t, ly * P))
        part(f'finger{i + 1}_{tag}', secs)
    # thumb: a flat flap from the front edge, pointing down and in, closing to a point
    th = [rect(4 * P, -12 * P, 1, 0, 9 * P, 6 * P, -17 * P), rect(15 * P, -28 * P, 0.8, 0.6, 8 * P, 3.5 * P, -20 * P),
          rect(25 * P, -40 * P, 0.8, 0.6, 4 * P, 2 * P, -21 * P), rect(30 * P, -47 * P, 0.8, 0.6, 0.6 * P, 0.6 * P, -21 * P)]
    part(f'thumb_{tag}', th)


def arm(tag, m):
    # deltoid: a round cap whose outer edge is the picture's shoulder line; its own girth profile sets how far it reaches in
    dl = [(y, runs(y)[0][0] + hw, hw, fw) for y, hw, fw in ((268, 20, 0), (284, 40, 0), (300, 52, -2), (320, 56, -3), (345, 52, -3),
                                                           (370, 44, -2), (392, 30, 0), (408, 14, 0))]
    piece(f'deltoid_{tag}', dl, 0.92, 8, mirror=m)
    piece(f'arm_upper_{tag}', [(394, 284, 38, -3)] + traced([406, 426, 446, 466, 486], lambda y: 281 - (y - 406) * 0.25, lambda y: -3 if y < 446 else 0), 0.9, 8, mirror=m, twist=0.5)
    # forearm: flared cuff over the elbow, then a long straight taper to the wrist
    lower = traced([496, 506, 526, 546, 566, 586, 606, 626, 642], lambda y: 255 - (y - 496) * 0.22, lambda y: -3 if y < 566 else 0)
    lower[0] = (480, lower[0][1] + 2, lower[0][2] * 1.06, 0)
    piece(f'arm_lower_{tag}', lower, 0.82, 8, mirror=m, twist=0.5)
    # the folded wrist cuff the pick shows where forearm meets hand, then the hand itself
    piece(f'wrist_cuff_{tag}', [(630, 227, 19, 0), (640, 226, 21, -1), (650, 226, 19, -1)], 0.95, 8, mirror=m)
    hand(tag, m, 224, 646)
    sh = 2 * MID - 300 if m else 300
    return [round(v, 3) for v in ((sh - MID) * S, 0.0, z(320))], [round(v, 3) for v in (((2 * MID - 225 if m else 225) - MID) * S, 0.0, z(700))]


def leg(tag, m):
    def inner(y):   # above the crotch the mask joins both legs: the thigh runs from the outer edge to the centre line
        a = run_at(y, 360)[0] - run_at(y, 360)[1]; return (y, (a + MID - 6) / 2, (MID - 6 - a) / 2, -4)
    thigh = [(612, 395, 60)] + [inner(y) for y in (646, 686)] + traced([726, 766, 806, 846, 886, 916], lambda y: 368 - (y - 726) * 0.11, -4) + [(936, 342, 40, -2)]
    piece(f'leg_upper_{tag}', thigh, 0.88, 8, mirror=m, twist=0.5)
    # knee: its own wrapped band, then the shin piece flares over its lower edge
    piece(f'knee_{tag}', [(928, 344, 42, -2), (956, 336, 46, -5), (988, 330, 47, -3)], 0.9, 8, mirror=m)
    # kneecap: its own folded diamond plate standing proud of the knee band (a bone near the surface is a fold)
    kc = 2 * MID - 337 if m else 337
    piece(f'kneecap_{tag}', [(942, kc, 3, -40), (958, kc, 14, -42), (974, kc, 15, -41), (990, kc, 3, -38)], 0.3, 4, mirror=False)
    piece(f'leg_lower_{tag}', [(972, 330, 47, -2)] + traced([1006, 1026, 1066, 1106, 1146, 1186, 1206], lambda y: 323 - (y - 1006) * 0.1, -2), 0.95, 8, mirror=m, twist=-0.5)
    piece(f'ankle_{tag}', [(1200, 304, 26, -1), (1226, 303, 29, -2), (1244, 301, 30, -2)], 0.95, 8, mirror=m)
    # foot: a folded paper shoe. Sections across the foot from the heel to the pointed toe, each a pentagon with a
    # ridge on top, so the top of the shoe is two planes meeting along a crisp fold and the toe closes to a point.
    cx = (2 * MID - 296 if m else 296); x0 = (cx - MID) * S; out = (1 if m else -1) * math.radians(4)

    def section(yf, hw, h, ridge):
        """Pentagon across the foot at forward distance yf (pixels, - is forward): sole corners, side tops, ridge."""
        return np.array([(-hw * S, yf * S, 0.0), (hw * S, yf * S, 0.0), (hw * 0.9 * S, yf * S, h * 0.62 * S),
                         (0.0, yf * S, ridge * S), (-hw * 0.9 * S, yf * S, h * 0.62 * S)])[::-1]
    shoe = [section(34, 24, 54, 60), section(10, 30, 60, 66), section(-40, 31, 38, 46), section(-100, 27, 20, 26),
            section(-140, 16, 10, 13), section(-166, 3, 3, 4)]
    o = kit.loft(f'foot_{tag}', shoe, PAPER, cap_start=True, cap_end=True)
    o.location = (x0, 0, 0); o.rotation_euler = (0, 0, out)
    # the cuff: a folded band round the ankle where the shoe meets the shin
    cuff = kit.loft(f'heel_{tag}', [kit.ring(27 * S, 31 * S, 44 * S, 6, a0=FRONT, a1=FRONT + 2 * math.pi, cx=0, cy=8 * S),
                                    kit.ring(29 * S, 33 * S, 60 * S, 6, a0=FRONT, a1=FRONT + 2 * math.pi, cx=0, cy=6 * S),
                                    kit.ring(25 * S, 29 * S, 76 * S, 6, a0=FRONT, a1=FRONT + 2 * math.pi, cx=0, cy=4 * S)],
                    PAPER, cap_start=True, cap_end=True)
    cuff.location = (x0, 0, 0)
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
    info = dict(figure='male-toned-3', round=2, concept='male-base-toned_3', height_m=HEIGHT, triangles=kit.triangles(), sockets=sock)
    json.dump(info, open(export + '.json', 'w'), indent=2)
    return info


if __name__ == '__main__':
    print(build(os.path.join(HERE, 'male-toned-3')))
