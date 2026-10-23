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


def ring(y, cx, hw, depth, n, fw=0.0):
    return kit.ring(hw * S, hw * depth * S, z(y), n, a0=FRONT, a1=FRONT + 2 * math.pi, cx=(cx - MID) * S, cy=fw * S)


def piece(name, rows, depth, n=8, mat=PAPER, mirror=False):
    """One folded paper part: a loft through rows of (y, centre x, half-width[, forward shift]), capped both ends."""
    rings = []
    for r in rows:
        y, cx, hw = r[:3]; fw = r[3] if len(r) > 3 else 0.0
        rings.append(ring(y, 2 * MID - cx if mirror else cx, hw, depth, n, fw))
    return kit.loft(name, rings, mat, cap_start=True, cap_end=True)


# Torso, crotch to neck: (y, half-width, depth ratio, forward shift). Rows 387-527 take their width from the mask.
TORSO = [(668, 44, 0.9, 0), (645, 104, 0.62, 0), (615, 112, 0.6, 0), (585, 110, 0.6, 0), (550, 102, 0.62, -1),
         (527, 92, 0.65, -2), (507, 78, 0.7, -2), (487, 66, 0.74, -3), (467, 64, 0.74, -3), (447, 68, 0.72, -3),
         (427, 76, 0.7, -4), (407, 86, 0.68, -5), (387, 94, 0.66, -6), (360, 98, 0.62, -6), (330, 100, 0.58, -4),
         (300, 98, 0.54, -2), (275, 86, 0.54, 0), (255, 60, 0.6, 2), (240, 34, 0.85, 2)]
N = 12
BUST = {400: 0.30, 375: 0.58, 350: 0.52, 325: 0.24}     # two folded lobes under the top, modest
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
        seam(f'top_strap_{tag}', [front_point(y, sx * x) for y, x in ((306, 46), (280, 34), (258, 24), (244, 20))], 7)
    piece('collar', [(262, MID, 40, 2), (244, MID, 33, 2), (232, MID, 29, 3)], 0.85, 8, CLOTH)


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


def head_neck():
    piece('neck', [(256, MID, 30, 2), (226, MID, 27, 3)], 0.9, 8)
    piece('head', [(238, MID, 12, -18), (222, MID, 30, -12), (200, MID, 40, -6), (170, MID, 47, -2), (130, MID, 51, 0),
                   (100, MID, 48, 2), (80, MID, 38, 3), (66, MID, 18, 3), (62, MID, 4, 3)], 1.15, 8)


def arm(tag, m):
    k = SHOULDER_SCALE
    # shoulder cap: the pick's is ~52 px; this one is 65% of it and tucked in over the arm
    # sized so its bulge past the arm and above the shoulder is k of the pick's: the pick's cap reaches x=247, y=235
    piece(f'shoulder_cap_{tag}', [(258, 312, 18), (272, 302, 38), (292, 297, 52 * k + 12, -3), (318, 296, 52 * k + 12, -3),
                                  (342, 296, 40), (364, 296, 22)], 1.0, 8, mirror=m)
    piece(f'arm_upper_{tag}', [(320, 296, 32), (370, 293, 35), (410, 289, 36, -2), (450, 282, 33), (482, 276, 31)], 0.9, 8, mirror=m)
    piece(f'elbow_strap_{tag}', [(474, 273, 34), (488, 268, 36), (502, 264, 35)], 0.9, 8, CLOTH, mirror=m)
    # forearm: a folded bracer that flares to the elbow side, then tapers to the wrist
    piece(f'arm_lower_{tag}', [(494, 263, 33), (527, 252, 36), (567, 250, 42, -2), (607, 236, 35), (647, 223, 27), (672, 217, 22)], 0.82, 8, mirror=m)
    piece(f'hand_{tag}', [(668, 218, 22), (695, 222, 26), (727, 227, 27), (760, 226, 14), (790, 228, 5)], 0.5, 6, mirror=m)
    piece(f'thumb_{tag}', [(688, 236, 6, -10), (714, 244, 5, -14), (734, 246, 3, -14)], 1.0, 5, mirror=m)
    sh = 2 * MID - 297 if m else 297; hd = 2 * MID - 227 if m else 227
    return [round((sh - MID) * S, 3), 0.0, round(z(300), 3)], [round((hd - MID) * S, 3), 0.0, round(z(727), 3)]


def leg(tag, m):
    piece(f'leg_upper_{tag}', [(600, 382, 62), (640, 368, 70), (687, 355, 69, -3), (727, 347, 71, -4), (767, 341, 64, -4),
                               (807, 338, 56, -3), (847, 333, 49, -2), (887, 331, 42), (918, 322, 36)], 0.88, 8, mirror=m)
    piece(f'knee_{tag}', [(905, 323, 39, -2), (935, 313, 38, -4), (962, 306, 37, -2)], 0.92, 8, mirror=m)
    piece(f'leg_lower_{tag}', [(955, 305, 37), (1007, 293, 45, -2), (1047, 289, 46, -2), (1087, 281, 39), (1127, 269, 29),
                               (1167, 257, 21), (1207, 254, 20), (1252, 249, 21)], 0.95, 8, mirror=m)
    # foot: a pointed folded wedge, heel under the ankle, toes forward and turned out, as in the pick
    cx = 2 * MID - 246 if m else 246; x0 = (cx - MID) * S; out = (1 if m else -1) * math.radians(20)
    heel = kit.ring(24 * S, 28 * S, 0, 8, a0=FRONT, a1=FRONT + 2 * math.pi, cy=10 * S)
    ank = kit.ring(21 * S, 24 * S, 72 * S, 8, a0=FRONT, a1=FRONT + 2 * math.pi, cy=6 * S)
    kit.loft(f'heel_{tag}', [heel, ank], PAPER, cap_start=True, cap_end=True).location = (x0, 0, 0)
    toe = kit.plate(f'foot_{tag}', [(-30 * S, 26 * S), (30 * S, 26 * S), (34 * S, -100 * S), (6 * S, -150 * S), (-6 * S, -150 * S), (-34 * S, -100 * S)], 26 * S, PAPER)
    toe.location = (x0, 0, 0); toe.rotation_euler = (0, 0, out)
    instep = kit.loft(f'instep_{tag}', [kit.ring(26 * S, 36 * S, 26 * S, 6, cy=-50 * S), kit.ring(16 * S, 18 * S, 62 * S, 6, cy=-8 * S)], PAPER, cap_start=True, cap_end=True)
    instep.location = (x0, 0, 0); instep.rotation_euler = (0, 0, out)
    hip = 2 * MID - 382 if m else 382
    return [round((hip - MID) * S, 3), 0.0, round(z(600), 3)], [round(x0, 3), round(-60 * S, 3), 0.0]


def build(export):
    kit.reset()
    rings = torso(); top(rings); briefs(rings); head_neck()
    sock = {}
    for tag, m in (('l', False), ('r', True)):
        sock[f'shoulder_{tag}'], sock[f'hand_{tag}'] = arm(tag, m)
        sock[f'hip_{tag}'], sock[f'foot_{tag}'] = leg(tag, m)
    for o in kit.bpy.context.scene.objects:
        if o.type == 'MESH':
            kit.facet(o, 0.0012, 0.03, levels=0, seed=zlib.crc32(o.name.encode()) % 97)
    kit.ground(); kit.export(export + '.glb')
    info = dict(figure='female-heroic-2', round=1, concept='female-base-heroic_2', height_m=HEIGHT,
                shoulder_scale=SHOULDER_SCALE, triangles=kit.triangles(), sockets=sock)
    json.dump(info, open(export + '.json', 'w'), indent=2)
    return info


if __name__ == '__main__':
    print(build(os.path.join(HERE, 'female-heroic-2')))
