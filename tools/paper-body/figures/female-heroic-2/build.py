"""Woman #2, the heroic papercraft woman (Midjourney female-base-heroic_2, job d9420c89 index 2, Evan's pick 2026-10-23).
python build.py -> female-heroic-2.glb and female-heroic-2.json

Same method as male-hero round 2: every number is read off concept.png (896 x 1344, front view), in pixels; a row is
(y, centre x, half-width[, forward shift]). px rows become metres; the right side mirrors the left. Front faces -Y,
Z up, origin between the feet. Depth comes from anatomy ratios, since a front view has none.

Evan's change request: "reduce the female shoulder bulbs". The picture's shoulder caps are ~52 px half-width and
reach out to x=247; here they are 34 px (about 65%) and sit inside the arm line, so the outline at the shoulders is
deliberately narrower than the pick. Everything else follows the picture."""
import os, sys, math, json, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'roman-kit'))
import kit  # noqa: E402
from PIL import Image  # noqa: E402

HEIGHT = 1.72                       # metres, crown to sole
TOP, SOLE, MID = 62, 1318, 440      # concept pixels: crown, sole, centre line
S = HEIGHT / (SOLE - TOP)           # metres per pixel
FRONT = -math.pi / 2                # ring start angle that puts a vertex (a fold ridge) dead ahead
PAPER = kit.mat('PaperBody', (230, 210, 184), 0.8)
CLOTH = kit.mat('Cloth', (214, 188, 156), 0.85)    # top and briefs: the same paper, a shade deeper, separate parts
MASK = np.asarray(Image.open(os.path.join(HERE, 'concept_mask.png')).convert('L')) > 127
SHOULDER_SCALE = 0.65               # Evan: smaller shoulder bulbs than the pick


def z(y):
    return (SOLE - y) * S


def runs(y):
    d = np.diff(np.r_[0, MASK[int(y)].astype(int), 0]); s, e = np.where(d == 1)[0], np.where(d == -1)[0]
    return [(int(a), int(b)) for a, b in zip(s, e) if b - a > 3]


def run_at(y, x):
    """The run on row y that contains (or is nearest to) pixel x, as (centre, half-width)."""
    rs = runs(y); a, b = min(rs, key=lambda r: 0 if r[0] <= x <= r[1] else min(abs(r[0] - x), abs(r[1] - x)))
    return (a + b) / 2, (b - a) / 2


def ring(y, cx, hw, depth, n, fw=0.0, turn=0.0):
    return kit.ring(hw * S, hw * depth * S, z(y), n, a0=FRONT + turn, a1=FRONT + turn + 2 * math.pi, cx=(cx - MID) * S, cy=fw * S)


def dense(rows, step=18):
    """Rows resampled every `step` px, so a fold can cross a part smoothly."""
    out = []
    for a, b in zip(rows, rows[1:]):
        a = list(a) + [0] * (4 - len(a)); b = list(b) + [0] * (4 - len(b)); k = max(1, int(round((b[0] - a[0]) / step)))
        out += [tuple(a[j] + (b[j] - a[j]) * t / k for j in range(4)) for t in range(k)]
    return out + [rows[-1]]


def piece(name, rows, depth, n=8, mat=PAPER, mirror=False, twist=0.0, creases=(), wide=1.0):
    """One folded paper part: a loft through rows of (y, centre x, half-width[, forward shift]), capped both ends.
    twist turns the rings progressively down the part, so the fold ridges run diagonally across it. creases are
    folds pressed into the paper: lists of (y, u) with u in -1..1 across the front; the vertex under each is pushed out.
    wide scales the half-width, so a few-sided ring still spans the outline it was read from."""
    rings = []
    for i, r in enumerate(rows):
        y, cx, hw = r[:3]; fw = r[3] if len(r) > 3 else 0.0; hw *= wide
        turn = twist * i / max(1, len(rows) - 1) * (-1 if mirror else 1)
        rg = ring(y, 2 * MID - cx if mirror else cx, hw, depth, n, fw, turn); c = rg[:, :2].mean(0)
        for cr in creases:
            ys = [p[0] for p in cr]
            if ys[0] <= y <= ys[-1]:
                u = float(np.interp(y, ys, [p[1] for p in cr])) * (-1 if mirror else 1)
                front = np.where(rg[:, 1] < c[1])[0]
                j = front[np.argmin(np.abs((rg[front, 0] - c[0]) / (hw * S) - u))]
                rg[j, :2] = c + (rg[j, :2] - c) * 1.13
        rings.append(rg)
    return kit.loft(name, rings, mat, cap_start=True, cap_end=True)


# Torso, crotch to neck: (y, half-width, depth ratio, forward shift). Rows 387-527 take their width from the mask.
TORSO = [(668, 44, 0.9, 0), (645, 104, 0.62, 0), (615, 112, 0.6, 0), (585, 110, 0.6, 0), (550, 102, 0.62, -1),
         (527, 92, 0.65, -2), (507, 78, 0.7, -2), (487, 66, 0.74, -3), (467, 64, 0.74, -3), (447, 68, 0.72, -3),
         (427, 76, 0.7, -4), (407, 86, 0.68, -5), (387, 94, 0.66, -6), (360, 98, 0.62, -6), (330, 100, 0.58, -4),
         (300, 98, 0.54, -2), (275, 86, 0.54, 0), (255, 60, 0.6, 2), (240, 34, 0.85, 2)]
N = 12
BUST = {400: 0.12, 375: 0.24, 350: 0.22, 325: 0.10}     # a soft base under the folded cups
SHELF = {412: -0.12}                                    # the fold under the bust
ABS = {467: 0.05, 447: 0.05}


def torso():
    rings = []
    for y, hw, d, fw in TORSO:
        if 387 <= y <= 527:
            hw = run_at(y, MID)[1]
        r = ring(y, MID, hw, d, N, fw)
        cy = fw * S; front = r[:, 1] < cy - 1e-6
        x = np.abs(r[front, 0]) / (hw * S)
        amt = BUST.get(y, 0) * np.exp(-((x - 0.48) / 0.26) ** 2) + SHELF.get(y, 0) * np.exp(-((x - 0.48) / 0.3) ** 2) \
            + ABS.get(y, 0) * np.exp(-((x - 0.4) / 0.2) ** 2)
        r[front, 1] = cy + (r[front, 1] - cy) * (1 + amt)
        if y in BUST:
            r[np.argmin(r[:, 1]), 1] *= 0.9                 # the fold between the lobes
        rings.append(r)
    kit.loft('torso', rings, PAPER, cap_start=True, cap_end=True)
    return rings


def proud(r, k):
    c = r[:, :2].mean(0)
    return np.c_[(r[:, 0] - c[0]) * k + c[0], (r[:, 1] - c[1]) * k + c[1], r[:, 2]]


def front_point(y, x):
    """A point on the front of the torso at pixel row y and pixel offset x from the centre line, just proud of it."""
    ys = [t[0] for t in TORSO]; i = int(np.argmin([abs(v - y) for v in ys])); _, hw, d, fw = TORSO[i]
    if 387 <= ys[i] <= 527:
        hw = run_at(ys[i], MID)[1]
    u = min(abs(x) / (hw * 1.05), 0.98)
    return np.array([x * S, (fw - hw * d * 1.06 * math.sqrt(1 - u * u)) * S, z(y)])


def seam(name, pts, r=4.0, mat=None):
    """A folded edge: a thin paper ridge along a run of front points, so a part's border reads from the front."""
    kit.tube(name, pts, r * S, 5, mat or CLOTH)


def top(rings):
    """Halter sports top, a separate part: cups over the bust rings with an under-band, and two straps up to a collar."""
    sel = [r for r, t in zip(rings, TORSO) if 300 <= t[0] <= 407]
    lo = rings[[t[0] for t in TORSO].index(407)]
    edge = proud(lo, 1.06); edge[:, 2] = z(416)
    kit.loft('sports_top', [edge] + [proud(r, 1.045) for r in sel], CLOTH)
    seam('top_underband', [front_point(412, x) for x in np.linspace(-96, 96, 9)], 5)
    for sx, tag in ((-1, 'l'), (1, 'r')):
        seam(f'top_cup_edge_{tag}', [front_point(y, sx * x) for y, x in ((404, 4), (360, 10), (318, 26), (300, 44))], 4)
        seam(f'top_strap_{tag}', [front_point(y, sx * x) for y, x in ((306, 46), (280, 34), (258, 24), (244, 20))], 4.5)


def briefs(rings):
    """Boy-short briefs: the pelvis rings a little proud, cut high at the hips and low at the crotch, with a waistband."""
    sel = [r for r, t in zip(rings, TORSO) if 527 <= t[0] <= 668]
    band = [proud(r, 1.05) for r in sel]
    # leg holes: no part of the briefs hangs below a cut line that runs from the crotch (y=668) up to the hip (y=560)
    rx = max(np.abs(r[:, 0]).max() for r in band)
    for r in band:
        cut = z(668) + 108 * S * (np.abs(r[:, 0]) / rx) ** 1.3 - 3 * S
        r[:, 2] = np.maximum(r[:, 2], cut)
    kit.loft('briefs', band, CLOTH, cap_start=True)
    for sx, tag in ((-1, 'l'), (1, 'r')):        # the leg-hole edges, a folded ridge from the hip down to the crotch
        seam(f'briefs_leg_edge_{tag}', [front_point(668 - 104 * u ** 1.3, sx * u * 106) for u in np.linspace(0.02, 1, 7)], 4.5)
    t = proud(band[-1], 1.015)
    kit.loft('briefs_waistband', [t + [0, 0, -14 * S], t + [0, 0, 2 * S]], CLOTH)


def P(x, y, fw=0.0, m=False):
    """Pixel point (x, y) with a forward shift fw (px, negative is toward the camera) to metres; m mirrors left to right."""
    return np.array([((2 * MID - x) if m else x) - MID, fw, 0.0]) * S + [0, 0, z(y)]


def tri_mesh(name, verts, faces, mat):
    return kit.mesh(name, verts, faces, mat)


def head_neck():
    """Head: one faceted paper egg, as in the pick. Eight sides, so the faces are big folded planes. A sharp ridge runs
    dead ahead from the crown down the forehead into the nose and on to a pointed chin; the two large face planes either
    side are set back from it, and the cheek facets narrow into the jaw."""
    piece('neck', [(266, MID, 25, 4), (222, MID, 21, 6)], 0.95, 8)
    # (y, half-width, depth ratio, forward shift, ridge px ahead of the egg, set-back of the face planes)
    rows = [(62, 6, 1.0, 3, 0, 0), (74, 30, 1.05, 2, 4, 0.08), (98, 47, 1.1, 0, 8, 0.26), (132, 51, 1.1, -1, 10, 0.38),
            (160, 49, 1.08, -2, 12, 0.42), (186, 40, 1.02, -5, 11, 0.38), (210, 27, 0.98, -9, 9, 0.3), (228, 12, 0.95, -14, 6, 0.14),
            (235, 3, 0.9, -16, 2, 0)]
    n = 8; rings = []
    for y, hw, d, fw, ridge, back in rows:
        r = ring(y, MID, hw, d, n, fw); cy = fw * S
        r[0, 1] -= ridge * S                                   # the ridge: crown, forehead, nose, chin
        for i in (1, n - 1):                                   # the face planes, set back from the ridge
            r[i, 1] = cy + (r[i, 1] - cy) * (1 - back); r[i, 0] *= 1 - back * 0.35
        for i in (2, n - 2):                                   # cheek facets narrowing into the jaw
            r[i, 0] *= 1 - back * 0.15
        rings.append(r)
    kit.loft('head', rings, PAPER, cap_start=True, cap_end=True)


def collar():
    """The tall stand-up collar: an open paper band from the shoulders up to the jaw, open at the front in a V."""
    rows = [(284, 74, 0.28), (266, 58, 0.42), (246, 44, 0.66), (226, 38, 0.9), (210, 40, 1.08)]
    rings = []
    for y, hw, half in rows:
        rings.append(kit.ring(hw * S, hw * 0.85 * S, z(y), 12, a0=FRONT + half, a1=FRONT + 2 * math.pi - half, cy=6 * S, endpoint=True))
    o = kit.loft('collar', rings, CLOTH, closed=False); kit.solidify(o, 3 * S)


def cups():
    """Two folded cups over the bust: low pyramids set on the top, each with a fold to its apex, and a centre gore."""
    for sx, tag in ((-1, 'l'), (1, 'r')):
        base = [front_point(y, sx * x) for y, x in ((408, 8), (406, 48), (398, 86), (372, 98), (338, 88), (310, 60), (318, 30), (360, 10))]
        base = [p + [0, -6 * S, 0] for p in base]
        apex = front_point(362, sx * 50) + [0, -24 * S, 0]
        v = base + [apex]; k = len(base)
        f = [(i, (i + 1) % k, k) if sx < 0 else ((i + 1) % k, i, k) for i in range(k)]
        tri_mesh(f'top_cup_{tag}', v, f, CLOTH)
    seam('top_gore', [front_point(y, 0) + [0, -4 * S, 0] for y in (408, 380, 350)], 3.5)
    seam('ab_ridge', [front_point(y, 0) + [0.0, 0.5 * S, 0] for y in (424, 460, 500, 540)], 2.0, PAPER)


def hand(tag, m, wx, wy):
    """A real hand, hanging relaxed: palm, four fingers of three segments each, curling forward, and a thumb toward
    the body. Built in pixels about the wrist (wx, wy); u is across the palm (+ toward the body), fw is depth."""
    turn = math.radians(50)                     # palm toward the thigh, turned a little to the camera, as in the pick

    def Q(u, y, fw):
        return P(wx + u * math.cos(turn) - fw * math.sin(turn), y, u * math.sin(turn) + fw * math.cos(turn), m)
    palm = []
    for y, cu, hu, dd in ((wy, 0, 16, 9), (wy + 24, 4, 23, 10), (wy + 52, 7, 25, 8), (wy + 63, 7, 22, 6)):
        a = np.linspace(0, 2 * math.pi, 8, endpoint=False)
        palm.append(np.array([Q(cu + hu * math.cos(t), y, -2 + dd * math.sin(t)) for t in a]))
    kit.loft(f'palm_{tag}', palm, PAPER, cap_start=True, cap_end=True)
    # knuckle row at wy+56: pinky (outer) to index (toward the body); length in px, fan and curl
    for name, u0, length, fan in (('pinky', -17, 54, -0.12), ('ring', -6, 68, -0.04), ('middle', 5, 75, 0.03), ('index', 16, 68, 0.1)):
        pts = [np.array([u0, wy + 59, -2.0])]; ang = 0.15
        for seg, frac in enumerate((0.45, 0.32, 0.23)):
            ang += (0.22, 0.42, 0.5)[seg]
            d = np.array([fan, math.cos(ang), -math.sin(ang)]); d /= np.linalg.norm(d)
            pts.append(pts[-1] + d * length * frac)
        kit.tube(f'finger_{name}_{tag}', [Q(*p) for p in pts], np.array([6.2, 5.6, 4.4, 1.6]) * S, 4, PAPER)
    th = [(20, wy + 16, -6), (28, wy + 36, -12), (34, wy + 58, -14), (36, wy + 82, -12)]
    kit.tube(f'thumb_{tag}', [Q(*p) for p in th], np.array([8, 7, 5, 1.6]) * S, 4, PAPER)


def pyramid(name, base, apex, mat=PAPER):
    """A folded paper plate: a closed fan from a base outline (points in metres) to an apex standing off it."""
    v = list(base) + [apex]; k = len(base)
    return tri_mesh(name, v, [(i, (i + 1) % k, k) for i in range(k)] + [tuple(range(k))[::-1]], mat)


def arm(tag, m):
    k = SHOULDER_SCALE
    # shoulder cap: a puffed paper cap of a few large fold planes (five sides, four rows, turned), at 65% of the pick's
    # size and tucked in over the arm, as Evan asked
    piece(f'shoulder_cap_{tag}', [(256, 312, 16), (276, 300, 40, -2), (312, 295, 52 * k + 13, -5), (352, 296, 26)], 1.0, 5,
          mirror=m, twist=0.9)
    piece(f'arm_upper_{tag}', [(320, 296, 32), (370, 293, 35), (410, 289, 36, -2), (450, 282, 33), (482, 276, 31)], 0.9, 8, mirror=m)
    # pleated elbow strap: banded folds, like the cuff in the pick
    piece(f'elbow_strap_{tag}', [(470, 274, 32), (475, 272, 37), (481, 270, 33), (487, 268, 38), (493, 266, 34), (499, 264, 38), (505, 263, 33)],
          0.9, 10, CLOTH, mirror=m)
    # forearm guard: a six-sided core, and a flat flap plate down its outer face whose outer edge follows the pick's
    # outline, flaring out toward the wrist (x 236 at the elbow to 195 at the wrist)
    piece(f'bracer_{tag}', [(500, 262, 30), (540, 254, 32, -2), (590, 245, 32, -3), (630, 236, 29, -3), (662, 228, 25, -2)], 0.85, 6, mirror=m, wide=1.08)
    edge = [(488, 246), (560, 211), (610, 201), (650, 196), (666, 193)]
    outer = [P(x - 2 - 8 * (y - 488) / 178, y, -14, m) for y, x in edge]
    inner = [P(x + (10 if y < 500 else 34), y, -46, m) for y, x in edge[::-1]]
    flap = outer + inner; kf = len(edge)
    faces = [(i, i + 1, 2 * kf - 2 - i, 2 * kf - 1 - i) for i in range(kf - 1)]
    o = tri_mesh(f'bracer_flap_{tag}', flap, faces, PAPER); kit.solidify(o, 4 * S)
    piece(f'wrist_cuff_{tag}', [(660, 220, 24), (666, 219, 27), (672, 219, 22)], 0.85, 8, CLOTH, mirror=m)
    hand(tag, m, 219, 668)
    sh = 2 * MID - 297 if m else 297; hd = 2 * MID - 226 if m else 226
    return [round((sh - MID) * S, 3), 0.0, round(z(300), 3)], [round((hd - MID) * S, 3), 0.0, round(z(727), 3)]


def limb_front(rows, depth, y, u, m):
    """A point on the front of a limb loft at row y, u in -1..1 across its width (- is the low-x side before mirroring)."""
    ys = [r[0] for r in rows]; i = max(0, min(len(rows) - 2, int(np.searchsorted(ys, y)) - 1)); a, b = rows[i], rows[i + 1]
    t = (y - a[0]) / (b[0] - a[0]); cx = a[1] + t * (b[1] - a[1]); hw = a[2] + t * (b[2] - a[2])
    fw = (a[3] if len(a) > 3 else 0) * (1 - t) + (b[3] if len(b) > 3 else 0) * t
    return P(cx + u * hw, y, fw - hw * depth * math.sqrt(max(0.0, 1 - u * u)) * 1.04, m)


# legs as angular segments, rows read off the mask; six sides with a flat inner face, so the inner plane of the thigh
# is one long diagonal from the crotch to the knee
THIGH = [(600, 380, 62), (690, 354, 70, -3), (780, 341, 61, -6), (870, 332, 46, -8), (905, 327, 37, -9)]
SHIN = [(945, 312, 34, -6), (1015, 294, 47, -2), (1080, 283, 41), (1150, 262, 24), (1228, 252, 20), (1268, 246, 20)]


def leg(tag, m):
    piece(f'leg_upper_{tag}', THIGH, 0.86, 6, mirror=m, twist=0.35, wide=1.14)
    piece(f'knee_{tag}', [(898, 328, 36, -9), (925, 319, 38, -12), (952, 311, 34, -7)], 0.95, 6, mirror=m, twist=0.5, wide=1.1)
    # the knee fold plate: a diamond standing proud on the front of the knee, its point forward, the hard kink of the leg
    kp = [P(326, 884, -40, m), P(352, 918, -44, m), P(312, 960, -38, m), P(292, 920, -42, m)]
    pyramid(f'knee_plate_{tag}', kp if not m else kp[::-1], P(322, 916, -58, m))
    piece(f'leg_lower_{tag}', SHIN, 0.92, 6, mirror=m, twist=-0.5, wide=1.12)
    # foot: a low, sharp folded paper wedge, its point forward and turned out, a ridge running from the ankle to the toe
    out = math.radians(40) * (1 if m else -1); ax = (2 * MID - 246 if m else 246 - MID) if False else ((2 * MID - 246) if m else 246) - MID
    def F(u, v, h):
        c, s_ = math.cos(out), math.sin(out)
        return np.array([ax + u * c - v * s_, u * s_ + v * c, h]) * S
    sole = [F(-22, 26, 0), F(22, 26, 0), F(26, -30, 0), F(0, -92, 0), F(-26, -30, 0)]
    top = [F(-18, 20, 62), F(18, 20, 62), F(0, -36, 38), F(0, -92, 4)]
    v = sole + top
    faces = [(4, 3, 2, 1, 0), (0, 1, 6, 5), (1, 2, 7, 6), (2, 3, 8, 7), (3, 4, 7, 8), (4, 0, 5, 7), (5, 6, 7)]
    tri_mesh(f'foot_{tag}', v, faces, PAPER)
    piece(f'ankle_{tag}', [(1262, 246, 21, 2), (1300, 246, 17, 4)], 0.95, 6, mirror=m)
    hip = 2 * MID - 382 if m else 382; fx = ((2 * MID - 246) if m else 246) - MID
    return [round((hip - MID) * S, 3), 0.0, round(z(600), 3)], [round(fx * S, 3), round(-60 * S, 3), 0.0]


def build(export):
    kit.reset()
    rings = torso(); top(rings); cups(); briefs(rings); head_neck(); collar()
    sock = {}
    for tag, m in (('l', False), ('r', True)):
        sock[f'shoulder_{tag}'], sock[f'hand_{tag}'] = arm(tag, m)
        sock[f'hip_{tag}'], sock[f'foot_{tag}'] = leg(tag, m)
    for o in kit.bpy.context.scene.objects:
        if o.type == 'MESH':
            kit.facet(o, 0.0012, 0.03, levels=0, seed=zlib.crc32(o.name.encode()) % 97)
    kit.ground(); kit.export(export + '.glb')
    info = dict(figure='female-heroic-2', round=2, concept='female-base-heroic_2', height_m=HEIGHT,
                shoulder_scale=SHOULDER_SCALE, triangles=kit.triangles(), sockets=sock)
    json.dump(info, open(export + '.json', 'w'), indent=2)
    return info


if __name__ == '__main__':
    print(build(os.path.join(HERE, 'female-heroic-2')))
