"""Build a figure from a learned spec (spec.json) at any fidelity, then shoot it.

python3 figure.py [--spec spec] [--sides 8] [--step 2] [--tag v1] [--shots]

--sides  points per ring (the low-poly dial: 6 to 8 is the reference's chunky look, 16+ is smooth)
--step   keep every Nth ring of the spec (spec rings are every 2 cm; step 3 = a ring every 6 cm)
Writes out/<tag>/model.glb and, with --shots, out/<tag>/shots.png: hero mesh | ours, front, three-quarter, side,
back, plus the study camera beside his picture. Materials are named by role (Skin, TankTop, Shorts) from height bands
read off the picture: shorts from the leg openings (z 0.78) to the tank hem (z 1.12), tank top above, skin on the
arms, deltoids, neck and head.
"""
import argparse
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STUDY = os.path.dirname(HERE)
sys.path.insert(0, STUDY)
import numpy as np  # noqa: E402

SHORTS_Z = (0.78, 1.12)
NECK_Z = 1.53          # lowest point of the scoop neckline, at the front
TANK_TOP_Z = 1.74      # top of the straps at the back


def resample(r, sides):
    """A ring of len(r) radii at even angles, resampled to `sides` points (angle 0 = +x)."""
    n = len(r); a = np.arange(sides) * n / sides
    rr = np.r_[r, r[0]]
    return np.interp(a, np.arange(n + 1), rr)


def smooth(pts, k=1):
    """Average each ring with its neighbours (k each side) so cut noise doesn't show as horizontal bands."""
    P = np.array(pts); out = P.copy()
    for i in range(len(P)):
        lo, hi = max(0, i - k), min(len(P), i + k + 1)
        out[i, :, :2] = P[lo:hi, :, :2].mean(0)
    return list(out)


def simplify(pts, tol):
    """Keep only the rings a straight loft can't stand in for (within tol metres): fewer, bigger planes."""
    P = np.array(pts)
    keep = {0, len(P) - 1}
    def rec(i, j):
        if j <= i + 1:
            return
        t = (P[i + 1:j, 0, 2] - P[i, 0, 2]) / max(P[j, 0, 2] - P[i, 0, 2], 1e-9)
        interp = P[i][None] + t[:, None, None] * (P[j] - P[i])[None]
        err = np.linalg.norm((P[i + 1:j] - interp)[..., :2], axis=2).max(1)
        m = int(err.argmax())
        if err[m] > tol:
            keep.add(i + 1 + m); rec(i, i + 1 + m); rec(i + 1 + m, j)
    rec(0, len(P) - 1)
    return [P[i] for i in sorted(keep)]


def role(part, z, x, y, cy):
    if part.startswith(('arm', 'hand', 'piece')):
        return 'Skin'
    if part.startswith('leg'):
        return 'Shorts' if z > SHORTS_Z[0] else 'Skin'
    if z < SHORTS_Z[1]:
        return 'Shorts'
    if z > TANK_TOP_Z or abs(x) > 0.33 or (z > NECK_Z and y < cy - 0.02 and abs(x) < 0.16):
        return 'Skin'
    return 'TankTop'


def build(spec, sides, step, torso_mult=3, tol=0.0):
    import bpy
    import bkit as k
    import kit
    mats = {'Skin': k.SKIN, 'TankTop': k.TANK_TOP, 'Shorts': k.SHORTS}
    objs = []
    for p in spec['parts']:
        rings = p['rings'][::step]
        if p['rings'][-1] is not rings[-1]:
            rings = rings + [p['rings'][-1]]
        if len(rings) < 2:
            continue
        # the torso carries chest, deltoids, neck and head in one stack, so it gets more points per ring
        n = sides * torso_mult if p['name'] == 'torso' else sides
        a = np.arange(n) * 2 * math.pi / n
        pts = []
        for r in rings:
            rr = resample(np.array(r['r']), n)
            pts.append(np.c_[r['cx'] + rr * np.cos(a), r['cy'] + rr * np.sin(a), np.full(n, r['z'])])
        pts = smooth(pts)
        if tol > 0:
            pts = simplify(pts, tol)
        # bury the ends where a part merges into another (arm into torso, leg into hips) so no gap shows
        # (a part that just tapers out, like a deltoid top or the crown, needs no burying)
        end_r = max(rings[-1]['r']); big_r = max(max(r['r']) for r in rings)
        if p['name'] != 'torso' and end_r > 0.4 * big_r:
            pts.append(pts[-1] + [0, 0, 2 * spec['dz']])
        o = k.loft(p['name'], pts, None, cap_start=True, cap_end=True)
        me = o.data
        order = ['Skin', 'TankTop', 'Shorts']
        for m in order:
            me.materials.append(kit._material(mats[m]))
        cy = float(np.mean([r['cy'] for r in rings]))
        for f in me.polygons:
            c = f.center
            f.material_index = order.index(role(p['name'], c.z, c.x, c.y, cy))
        objs.append(o)
    return objs


VIEWS = [('front', 0), ('three-quarter', 45), ('side', -90), ('back', 180)]


def shoot(roots, turn, res, samples, study=False):
    """Render each root alone at `turn` degrees from the study camera; returns RGB arrays on the backdrop."""
    import bpy
    from PIL import Image
    import stage
    sc = bpy.context.scene
    out = []
    for root in roots:
        for r in roots:
            for o in r.children:
                o.hide_render = r is not root
        root.rotation_euler = (0, 0, math.radians(turn))
        p = os.path.join(STUDY, '.tmp', f'fig_{os.getpid()}.png'); sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        a = np.asarray(Image.open(p).convert('RGBA')) / 255.0
        bg = stage.backdrop(res)
        out.append(a[..., :3] * a[..., 3:] + bg * (1 - a[..., 3:]))
        MASKS.append(a[..., 3] > 0.5)
    return out


MASKS = []
SCORES = {}


def sheet(tag, objs, hero_path, hero_turn, res=512, samples=24, picture='ref/bruiser.png'):
    """shots.png: row 1 the hero mesh, row 2 ours, at front / three-quarter / side / back; then the study camera."""
    import bpy
    from PIL import Image, ImageDraw
    import stage
    def rooted(name, members):
        r = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(r)
        for o in members:
            o.parent = r
        return r
    ours = rooted('ours', objs)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=hero_path)
    hero = rooted('hero', [o for o in set(bpy.data.objects) - before if o.type == 'MESH'])
    clay = bpy.data.materials.new('HeroClay'); clay.use_nodes = True
    clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.33, 0.33, 0.32, 1)
    for o in hero.children:
        o.data.materials.clear(); o.data.materials.append(clay)
    stage.setup(res, samples)
    tiles = [[], []]
    scores = {}
    for v, t in VIEWS:
        MASKS.clear()
        h, o = shoot([hero, ours], t, res, samples)
        tiles[0].append(h); tiles[1].append(o)
        # the shadow catcher puts some alpha on the floor; judge the figure above the floor only
        mh, mo = MASKS[0].copy(), MASKS[1].copy()
        scores[v] = round(float((mh & mo).sum() / max((mh | mo).sum(), 1)), 4)
    SCORES.update(scores)
    # the study camera: his picture beside ours, turned the way the hero mesh had to turn to match it
    ref = np.asarray(Image.open(os.path.join(STUDY, picture)).convert('RGB').resize((res, res))) / 255.0
    _, o = shoot([hero, ours], hero_turn, res, samples)
    tiles[0].append(ref); tiles[1].append(o)
    img = np.concatenate([np.concatenate(r, 1) for r in tiles], 0)
    im = Image.fromarray((img * 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    for i, lab in enumerate([v for v, _ in VIEWS] + ['his picture / study camera']):
        d.text((i * res + 8, 8), lab, fill=(20, 20, 20))
    d.text((8, res + 8), 'ours: ' + tag, fill=(20, 20, 20)); d.text((8, 24), 'hero (Meshy)', fill=(20, 20, 20))
    return im


def main():
    import bpy
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', default='spec')
    ap.add_argument('--sides', type=int, default=8)
    ap.add_argument('--step', type=int, default=2)
    ap.add_argument('--tag', default=None)
    ap.add_argument('--shots', action='store_true')
    ap.add_argument('--torso-mult', type=int, default=3)
    ap.add_argument('--tol', type=float, default=0.0, help='simplify: drop rings a straight loft matches within this many metres')
    ap.add_argument('--res', type=int, default=512)
    a = ap.parse_args()
    spec = json.load(open(os.path.join(HERE, a.spec, 'spec.json')))
    tag = a.tag or f'{a.spec}_s{a.sides}_k{a.step}_t{a.torso_mult}' + (f'_tol{a.tol * 100:g}cm' if a.tol else '')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = build(spec, a.sides, a.step, a.torso_mult, a.tol)
    out = os.path.join(HERE, 'out', tag); os.makedirs(out, exist_ok=True)
    os.makedirs(os.path.join(STUDY, '.tmp'), exist_ok=True)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'model.glb'), export_format='GLB', use_selection=True)
    faces = sum(len(o.data.polygons) for o in objs)
    info = dict(tag=tag, spec=a.spec, sides=a.sides, step=a.step, torso_mult=a.torso_mult, tol=a.tol, faces=faces, parts=[o.name for o in objs])
    if a.shots:
        hero = os.path.join(STUDY, spec['source'].replace('../', '', 1)) if spec['source'].startswith('../') else spec['source']
        hero_turn = spec.get('picture_turn', 0.0)
        im = sheet(tag, objs, os.path.join(HERE, spec['source']), hero_turn, a.res, picture=spec.get('picture', 'ref/bruiser.png'))
        info['iou_vs_hero'] = dict(SCORES); info['iou_mean'] = round(float(np.mean(list(SCORES.values()))), 4)
        from PIL import ImageDraw
        ImageDraw.Draw(im).text((8, a.res + 24), 'IoU vs hero ' + ' '.join(f'{k} {v:.3f}' for k, v in SCORES.items()), fill=(20, 20, 20))
        im.save(os.path.join(out, 'shots.png'))
        shots = os.path.join(HERE, 'shots'); os.makedirs(shots, exist_ok=True)
        n = len([f for f in os.listdir(shots) if f.endswith('.png')])
        im.save(os.path.join(shots, f'{n:03d}_{tag}.png'))
        info['shot'] = f'shots/{n:03d}_{tag}.png'
    json.dump(info, open(os.path.join(out, 'info.json'), 'w'), indent=1)
    print(json.dumps(info))


if __name__ == '__main__':
    main()
