"""Male #1, the toned papercraft man (Midjourney male-base-toned_0, Evan's pick 2026-10-23).
python build.py -> male-hero.glb and male-hero.json

Built straight from the front-view concept: every landmark below is a pixel in concept.png (896 x 1344), so the recipe
can be checked against the picture. px() turns a pixel into metres. Front faces -Y, Z up, origin between the feet.
Depth is not in a front view; it comes from ordinary anatomy ratios (torso depth about 0.62 of its width)."""
import os, sys, math, json, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'roman-kit'))
import kit  # noqa: E402

HEIGHT = 1.85                       # metres, crown to sole
TOP, SOLE, MID = 55, 1312, 447      # concept pixels: crown, sole, centre line
S = HEIGHT / (SOLE - TOP)           # metres per pixel
PAPER = kit.mat('PaperBody', (238, 226, 208), 0.85)
BRIEFS = kit.mat('Cloth', (232, 219, 199), 0.9)   # same paper, a shade warmer: the briefs are folded from the same sheet


def px(x, y, d=0.0):
    """Concept pixel (x, y) plus a depth in pixels (negative = toward the viewer) to metres."""
    return np.array([(x - MID) * S, d * S, (SOLE - y) * S])


def mirror(pts):
    return [(2 * MID - x, y, *rest) for x, y, *rest in pts]


# Torso rings: (y, half-width, half-depth, forward shift), pixels. Read off the concept from crotch to neck.
TORSO = [(700, 62, 50, 0), (660, 108, 66, 0), (600, 106, 64, 0), (540, 90, 58, -4), (505, 92, 60, -5), (470, 98, 60, -6), (440, 104, 64, -8),
         (410, 116, 70, -14), (350, 124, 76, -18), (300, 118, 70, -10), (262, 96, 56, 0), (240, 46, 36, 0)]
N = 12


def torso():
    rings = []
    for i, (y, hw, hd, fw) in enumerate(TORSO):
        r = kit.ring(hw * S, hd * S, (SOLE - y) * S, N, cy=fw * S)
        if y in (540, 505, 470, 440):                           # ab columns: a shallow crease down the centre line
            front = r[:, 1] < fw * S
            r[front, 1] = fw * S + (r[front, 1] - fw * S) * (1 - 0.10 * np.exp(-(r[front, 0] / (12 * S)) ** 2))
        if y in (410, 350):                                     # pectoral shelf: two lobes on the front
            front = r[:, 1] < fw * S
            amt = 0.20 if y == 350 else 0.28
            r[front, 1] = fw * S + (r[front, 1] - fw * S) * (1 + amt * np.exp(-((np.abs(r[front, 0]) - 55 * S) / (50 * S)) ** 2))
        rings.append(r)
    kit.loft('torso', rings, PAPER, cap_start=True, cap_end=True)
    # abs: the concept folds them in, so they are creases, not stuck-on blocks: pinch the belly rings at the centre line
    # and at three heights (handled by the extra rings below), keeping the silhouette clean
    return rings


def briefs(rings):
    """The briefs band: the pelvis rings a little proud, cut high at the hips and low in the middle, as in the concept."""
    sel = [r for r, t in zip(rings, TORSO) if t[0] >= 600]
    band = [np.c_[r[:, 0] * 1.04, r[:, 1] * 1.05, r[:, 2]] for r in sel]
    b0 = band[0]; rx = np.abs(b0[:, 0]).max()
    b0[:, 2] += 60 * S * (np.abs(b0[:, 0]) / rx) ** 2 - 4 * S
    kit.loft('briefs', band, BRIEFS, cap_start=True)
    kit.loft('briefs_waistband', [band[-1] * [1.01, 1.01, 1] + [0, 0, -14 * S], band[-1] * [1.01, 1.01, 1]], BRIEFS)


def head_neck():
    kit.tube('neck', [px(MID, 262, 4), px(MID, 205, 6)], 40 * S, 7, PAPER)
    # head: a faceted egg, narrow at the chin, crown at y=55, chin at y=225
    prof = [(225, 22, 34, -6), (205, 44, 56, -2), (170, 56, 66, 0), (120, 60, 70, 2), (85, 54, 64, 4), (62, 36, 44, 4), (55, 6, 8, 4)]
    rings = [kit.ring(hw * S, hd * S, (SOLE - y) * S, 8, cy=fw * S) for y, hw, hd, fw in prof]
    kit.loft('head', rings, PAPER, cap_start=True, cap_end=True)
    # the blank paper face: one flat plane folded across the front of the head, from brow to chin
    face = kit.plate('face', [(-40 * S, (SOLE - 205) * S), (40 * S, (SOLE - 205) * S), (46 * S, (SOLE - 100) * S), (-46 * S, (SOLE - 100) * S)], 4 * S, PAPER)
    face.rotation_euler = (math.radians(90), 0, 0); face.location = (0, -62 * S, 0)


def arm(tag, flip):
    f = (lambda p: mirror(p)) if flip else (lambda p: p)
    # deltoid cap, upper arm, elbow, forearm (bulging near the elbow), wrist, hand with a little thumb
    dl = f([(292, 300), (262, 352), (248, 400)])
    kit.tube(f'deltoid_{tag}', [px(x, y) for x, y in dl], [48 * S, 46 * S, 30 * S], 7, PAPER)
    ua = f([(268, 320), (246, 420), (230, 486)])
    kit.tube(f'arm_upper_{tag}', [px(x, y) for x, y in ua], [38 * S, 40 * S, 30 * S], 7, PAPER)
    fa = f([(232, 478), (220, 540), (200, 620), (184, 690)])
    kit.tube(f'arm_lower_{tag}', [px(x, y) for x, y in fa], [32 * S, 38 * S, 28 * S, 22 * S], 7, PAPER)
    hd = f([(185, 676), (180, 740), (176, 790)])
    kit.tube(f'hand_{tag}', [px(x, y) for x, y in hd], [22 * S, 20 * S, 10 * S], 6, PAPER).scale = (1, 1, 1)
    th = f([(196, 700), (204, 740)])
    kit.tube(f'thumb_{tag}', [px(x, y, -10) for x, y in th], [7 * S, 5 * S], 5, PAPER)
    return [round(v, 3) for v in px(*ua[0])], [round(v, 3) for v in px(*hd[1])]


def leg(tag, flip):
    f = (lambda p: mirror(p)) if flip else (lambda p: p)
    th = f([(398, 640), (370, 760), (330, 900), (322, 956)])
    kit.tube(f'leg_upper_{tag}', [px(x, y) for x, y in th], [62 * S, 58 * S, 46 * S, 42 * S], 7, PAPER)
    cuff = f([(398, 645), (392, 690)])
    kit.tube(f'briefs_leg_{tag}', [px(x, y) for x, y in cuff], [66 * S, 63 * S], 7, BRIEFS)
    kn = f([(323, 930), (305, 1040), (290, 1150), (280, 1262)])
    kit.tube(f'leg_lower_{tag}', [px(x, y) for x, y in kn], [44 * S, 48 * S, 34 * S, 27 * S], 7, PAPER)
    # blocky paper foot, pointing forward (-Y), as wide as the concept's foot from the front
    hx, _ = f([(272, 0)])[0]; x0 = (hx - MID) * S
    heel = kit.ring(28 * S, 30 * S, 0, 6, cx=x0, cy=10 * S); ank = kit.ring(26 * S, 28 * S, 78 * S, 6, cx=x0, cy=6 * S)
    kit.loft(f'foot_{tag}', [heel, ank], PAPER, cap_start=True, cap_end=True)
    toe = kit.ring(36 * S, 60 * S, 0, 6, cx=x0, cy=-70 * S); toe_t = kit.ring(26 * S, 50 * S, 32 * S, 6, cx=x0, cy=-60 * S)
    kit.loft(f'foot_front_{tag}', [toe, toe_t], PAPER, cap_start=True, cap_end=True)
    return [round(v, 3) for v in px(*th[0])], [round(x0, 3), round(-40 * S, 3), 0.0]


def build(export):
    kit.reset()
    rings = torso(); briefs(rings); head_neck()
    sock = {}
    for tag, flip in (('l', False), ('r', True)):
        sock[f'shoulder_{tag}'], sock[f'hand_{tag}'] = arm(tag, flip)
        sock[f'hip_{tag}'], sock[f'foot_{tag}'] = leg(tag, flip)
    for o in kit.bpy.context.scene.objects:
        if o.type == 'MESH':
            kit.facet(o, 0.0025, 0.03, levels=0, seed=zlib.crc32(o.name.encode()) % 97)
    kit.ground(); kit.export(export + '.glb')
    info = dict(figure='male-hero', concept='male-base-toned_0', height_m=HEIGHT, triangles=kit.triangles(), sockets=sock)
    json.dump(info, open(export + '.json', 'w'), indent=2)
    return info


if __name__ == '__main__':
    print(build(os.path.join(HERE, 'male-hero')))
