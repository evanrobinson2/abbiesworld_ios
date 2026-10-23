"""Dress any learned body in gear that fits it: one kit, every body.

python3 accessorize.py --spec spec --body out/cage_identity_r0.1_welded/model.glb --accent orange --tag brute1
python3 accessorize.py --spec spec2 --body out/brute2_cage_r0.1/model.glb --accent purple --tag brute2

Gear is not modelled per character. Each piece is a recipe written against body landmarks that learn.py's rings
already give us (neck, top of head, wrist, shoulder top, crotch, ankle), so the same recipe makes a helmet that fits a
2 m brute or a 4.5-head kid. A piece is a low-poly loft around the part's own rings, pushed out by a clearance, cut
to an angle window where it should only cover one side (shoulder pads, visor, cheek guards), and capped where it
closes. Then it gets a material by role: Armor, Light (the hero's accent colour), Glass.

Writes out/<tag>_gear/: model.glb (body + gear, gear pieces named by what they are), gear.glb (gear only), kit.json
(every piece's landmarks and settings in numbers), shots.png (front, three-quarter, side, back: bare and dressed).
"""
import argparse
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
STUDY = os.path.dirname(HERE)
sys.path.insert(0, STUDY); sys.path.insert(0, HERE)
import numpy as np  # noqa: E402

from deform import ring_field, radius_at  # noqa: E402

ACCENTS = {'orange': (1.0, 0.42, 0.08), 'pink': (1.0, 0.25, 0.62), 'purple': (0.55, 0.25, 1.0), 'cyan': (0.15, 0.85, 0.95)}
FRONT = -math.pi / 2   # bodies face -Y

# The kit, in body words. Heights are fractions along a span between two landmarks; angles are windows around a
# direction (front, back, outside); clearance is how far off the skin, in metres.
KIT = [
    dict(name='Helmet', part='torso', span=('chin', 'crown'), at=(0.58, 1.0), sides=10, clear=0.03, cap='top', role='Armor'),
    dict(name='Helmet_CheekGuard', part='torso', span=('chin', 'crown'), at=(0.12, 0.6), sides=10, clear=0.03,
         window=('front', 250, 'skip'), role='Armor'),
    dict(name='Helmet_Visor', part='torso', span=('chin', 'crown'), at=(0.3, 0.62), sides=12, clear=0.045,
         window=('front', 130), role='Glass'),
    dict(name='Helmet_Light', part='torso', span=('chin', 'crown'), at=(0.58, 0.63), sides=10, clear=0.034,
         window=('front', 200, 'skip'), role='Light'),
    dict(name='Belt', part='torso', span=('crotch', 'neck'), at=(0.12, 0.2), sides=12, clear=0.02, role='Armor'),
    dict(name='Belt_Buckle', part='torso', span=('crotch', 'neck'), at=(0.135, 0.185), sides=12, clear=0.03,
         window=('front', 40), role='Light'),
    dict(name='ShoulderPad', part='arm', span=('wrist', 'shoulder'), at=(0.68, 1.0), sides=10, clear=0.035,
         window=('outside', 220), cap='top', role='Armor', both=True),
    dict(name='ShoulderPad_Light', part='arm', span=('wrist', 'shoulder'), at=(0.74, 0.77), sides=10, clear=0.04,
         window=('outside', 180), role='Light', both=True),
    dict(name='Bracer', part='arm', span=('wrist', 'shoulder'), at=(0.02, 0.32), sides=8, clear=0.018, role='Armor', both=True),
    dict(name='Bracer_Light', part='arm', span=('wrist', 'shoulder'), at=(0.27, 0.3), sides=8, clear=0.022, role='Light', both=True),
    dict(name='Boot', part='leg', span=('sole', 'crotch'), at=(0.0, 0.2), sides=10, clear=0.016, cap='bottom', role='Armor', both=True),
    dict(name='Boot_Light', part='leg', span=('sole', 'crotch'), at=(0.17, 0.195), sides=10, clear=0.02, role='Light', both=True),
    dict(name='Backpack', part='torso', span=('crotch', 'neck'), at=(0.5, 0.92), kind='pack', role='Armor'),
]


def chain(spec, base, side=None):
    """The part (and its hand pieces) as one stack of rings, bottom to top."""
    out = []
    for p in spec['parts']:
        n = p['name']
        if base == 'torso' and n == 'torso':
            out += p['rings']
        elif base != 'torso' and n.startswith(base + '_') and n.split('_')[1] == side:
            out += p['rings']
    return sorted(out, key=lambda r: r['z'])


def landmarks(spec):
    """Named heights read off the rings: the same words for every body."""
    T = chain(spec, 'torso')
    z = np.array([r['z'] for r in T]); m = np.array([np.mean(r['r']) for r in T])
    crown = float(z.max()); crotch = float(z.min())
    # the neck: the narrowest torso ring between the shoulders and the head (the head itself narrows to the crown,
    # so the window stops well below the top)
    span = crown - crotch
    up = (z > crown - 0.30 * span) & (z < crown - 0.12 * span)
    neck = float(z[up][np.argmin(m[up])])
    L = {'crown': crown, 'crotch': crotch, 'neck': neck, 'chin': neck + 0.12 * (crown - neck)}
    for side in ('R', 'L'):
        A = chain(spec, 'arm', side)
        if A:
            za = np.array([r['z'] for r in A]); ma = np.array([np.mean(r['r']) for r in A])
            lo, hi = za.min(), za.max(); band = (za > lo + 0.12 * (hi - lo)) & (za < lo + 0.45 * (hi - lo))
            L[f'wrist_{side}'] = float(za[band][np.argmin(ma[band])]) if band.any() else float(lo + 0.2 * (hi - lo))
            L[f'shoulder_{side}'] = float(hi)
        G = chain(spec, 'leg', side)
        if G:
            L[f'sole_{side}'] = float(min(r['z'] for r in G))
    return {k: round(v, 4) for k, v in L.items()}


def ang_of(word, side):
    if word == 'front':
        return FRONT
    if word == 'back':
        return -FRONT
    return math.pi if side == 'R' else 0.0   # outside: away from the body (right arm sits at -x)


def loft(spec, piece, L, side):
    """Rings of a piece: list of lists of (x, y, z) points, bottom to top."""
    base = piece['part']
    rings = chain(spec, base, side)
    a, b = piece['span']
    za = L[a if a in L else f'{a}_{side}']; zb = L[b if b in L else f'{b}_{side}']
    z0 = za + piece['at'][0] * (zb - za); z1 = za + piece['at'][1] * (zb - za)
    zr = np.array([r['z'] for r in rings])
    zs = sorted(set([z0, z1] + [float(z) for z in zr if z0 < z < z1]))
    # keep it low poly: at most one ring every 4 cm
    keep = [zs[0]]
    for z in zs[1:-1]:
        if z - keep[-1] >= 0.04:
            keep.append(z)
    keep.append(zs[-1])
    part = dict(rings=rings)
    n = piece.get('sides', 10)
    angs = np.arange(n) * 2 * math.pi / n
    win = piece.get('window')
    if win:
        c = ang_of(win[0], side); half = math.radians(win[1]) / 2
        if len(win) > 2:   # skip: everything except this window (cheek guards go round the back, not the face)
            c, half = c + math.pi, math.pi - half
        angs = c + np.linspace(-half, half, max(3, int(n * half / math.pi) + 1))
    out = []
    for z in keep:
        cx, cy, rad = ring_field(part, np.array([z]))
        r = radius_at(np.repeat(rad, len(angs), 0), angs) + piece['clear']
        out.append([(float(cx[0] + ri * math.cos(t)), float(cy[0] + ri * math.sin(t)), float(z)) for ri, t in zip(r, angs)])
    return out, bool(win), (round(z0, 4), round(z1, 4))


def mesh_from(name, rings, open_ring, cap):
    import bpy
    import bmesh
    bm = bmesh.new()
    vs = [[bm.verts.new(p) for p in r] for r in rings]
    n = len(rings[0])
    for a, b in zip(vs, vs[1:]):
        for i in range(n - (1 if open_ring else 0)):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    if cap == 'top':
        top = rings[-1]; c = np.mean(top, 0); h = 0.25 * np.mean([math.dist(p[:2], c[:2]) for p in top])
        apex = bm.verts.new((c[0], c[1], c[2] + h))
        for i in range(n - (1 if open_ring else 0)):
            bm.faces.new((vs[-1][i], vs[-1][(i + 1) % n], apex))
    if cap == 'bottom' and not open_ring:
        bm.faces.new(list(reversed(vs[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if open_ring:   # a shell, not a solid: give it thickness so it reads as a plate
        s = o.modifiers.new('plate', 'SOLIDIFY'); s.thickness = 0.012; s.offset = 1
    return o


def pack(spec, piece, L):
    """A backpack: a bevelled box sized to the chest it sits on."""
    import bpy
    T = dict(rings=chain(spec, 'torso'))
    za, zb = L['crotch'], L['neck']
    z0 = za + piece['at'][0] * (zb - za); z1 = za + piece['at'][1] * (zb - za)
    zs = np.linspace(z0, z1, 6)
    cx, cy, rad = ring_field(T, zs)
    back = max(float(cy[i] + radius_at(rad[i:i + 1], np.array([-FRONT]))[0]) for i in range(len(zs)))
    width = 0.55 * float(np.mean([radius_at(rad[i:i + 1], np.array([0.0]))[0] + radius_at(rad[i:i + 1], np.array([math.pi]))[0]
                                  for i in range(len(zs))]))
    depth = 0.3 * width
    bpy.ops.mesh.primitive_cube_add(size=1, location=(float(np.mean(cx)), back + 0.015 + depth / 2, (z0 + z1) / 2))
    o = bpy.context.object; o.name = piece['name']; o.scale = (width, depth, z1 - z0)
    bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new('bevel', 'BEVEL'); b.width = 0.025; b.segments = 1
    return o, dict(width=round(width, 3), depth=round(depth, 3), z=(round(z0, 3), round(z1, 3)))


def materials(accent):
    import bpy
    def mat(name, color, metal=0.0, rough=0.5, emit=0.0, glass=False):
        m = bpy.data.materials.new(name); m.use_nodes = True
        p = m.node_tree.nodes['Principled BSDF']
        p.inputs['Base Color'].default_value = (*color, 1); p.inputs['Metallic'].default_value = metal
        p.inputs['Roughness'].default_value = rough
        if emit:
            p.inputs['Emission Color'].default_value = (*color, 1); p.inputs['Emission Strength'].default_value = emit
        if glass:
            p.inputs['Transmission Weight'].default_value = 0.85; p.inputs['IOR'].default_value = 1.45
        return m
    return {'Armor': mat('Armor', (0.11, 0.12, 0.14), 0.55, 0.42), 'Light': mat('Light', ACCENTS[accent], 0, 0.3, 6.0),
            'Glass': mat('Glass', (0.55, 0.75, 0.85), 0, 0.05, glass=True),
            'Body': mat('BodyClay', (0.62, 0.62, 0.6), 0, 0.6)}


def main():
    import bpy
    from PIL import Image, ImageDraw
    import figure
    import stage
    ap = argparse.ArgumentParser()
    ap.add_argument('--spec', default='spec'); ap.add_argument('--body', default='out/cage_identity_r0.1_welded/model.glb')
    ap.add_argument('--accent', default='orange', choices=sorted(ACCENTS)); ap.add_argument('--tag', default=None)
    ap.add_argument('--res', type=int, default=384); ap.add_argument('--samples', type=int, default=24)
    a = ap.parse_args()
    spec = json.load(open(os.path.join(HERE, a.spec, 'spec.json')))
    tag = a.tag or a.spec
    L = landmarks(spec)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = materials(a.accent)
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, a.body))
    body = [o for o in set(bpy.data.objects) - before if o.type == 'MESH']
    for o in body:
        o.data.materials.clear(); o.data.materials.append(M['Body'])
        for f in o.data.polygons:
            f.use_smooth = False
    gear, record = [], []
    for piece in KIT:
        for side in (('R', 'L') if piece.get('both') else (None,)):
            name = piece['name'] + (f'_{side}' if side else '')
            if piece.get('kind') == 'pack':
                o, info = pack(spec, piece, L)
            else:
                rings, open_ring, zz = loft(spec, piece, L, side)
                o = mesh_from(name, rings, open_ring, piece.get('cap'))
                info = dict(z=zz, sides=len(rings[0]), rings=len(rings))
            o.name = name; o.data.materials.clear(); o.data.materials.append(M[piece['role']])
            for f in o.data.polygons:
                f.use_smooth = False
            gear.append(o)
            record.append(dict(name=name, role=piece['role'], span=piece.get('span'), at=piece.get('at'),
                               clear=piece.get('clear'), window=piece.get('window'), **info))
    out = os.path.join(HERE, 'out', f'{tag}_gear'); os.makedirs(out, exist_ok=True)
    # apply modifiers so the GLBs carry the plates' thickness
    for o in gear:
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    faces = sum(len(o.data.polygons) for o in gear)
    bpy.ops.object.select_all(action='DESELECT')
    for o in gear:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'gear.glb'), export_format='GLB', use_selection=True)
    for o in body:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'model.glb'), export_format='GLB', use_selection=True)
    json.dump(dict(spec=a.spec, body=a.body, accent=a.accent, landmarks=L, gear_faces=faces, pieces=record),
              open(os.path.join(out, 'kit.json'), 'w'), indent=1)
    # shots: bare body on top, dressed below, four views
    def rooted(name, members):
        r = bpy.data.objects.new(name, None); bpy.context.scene.collection.objects.link(r)
        for o in members:
            o.parent = r
        return r
    dressed = rooted('dressed', body + gear)
    stage.setup(a.res, a.samples)
    rows = [[], []]
    for v, t in figure.VIEWS:
        dressed.rotation_euler = (0, 0, math.radians(t))
        for row, show in ((0, False), (1, True)):
            for g in gear:
                g.hide_render = not show
            p = os.path.join(STUDY, '.tmp', f'gear_{os.getpid()}.png'); bpy.context.scene.render.filepath = p
            bpy.ops.render.render(write_still=True)
            im = np.asarray(Image.open(p).convert('RGBA')) / 255.0; bg = stage.backdrop(a.res)
            rows[row].append(im[..., :3] * im[..., 3:] + bg * (1 - im[..., 3:]))
    img = np.concatenate([np.concatenate(r, 1) for r in rows], 0)
    im = Image.fromarray((img * 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    for i, (v, _) in enumerate(figure.VIEWS):
        d.text((i * a.res + 8, 8), v, fill=(20, 20, 20))
    d.text((8, a.res + 8), f'{tag}: same kit, {len(gear)} pieces, {faces} faces, accent {a.accent}', fill=(20, 20, 20))
    im.save(os.path.join(out, 'shots.png'))
    print(json.dumps(dict(tag=tag, landmarks=L, pieces=len(gear), gear_faces=faces)))


if __name__ == '__main__':
    main()
