"""AW-STUDY-0027 Brute fight: paint, rig and animate the two Meshy brutes, then export one GLB per fighter.

python3 build.py [--only red|blue] [--tex 1024] [--sheet]

For each fighter in fighters.json:
1. Clean-up, the Bruiser way (tools/bruiser-study/scale): Meshy's hero mesh, welded, decimated to about 3,000 faces.
2. Paint: every hero face gets a role (Skin, TankTop, Shorts) from the learned rings and figure.role(); the roles'
   colours and the hero's ambient occlusion are baked from the full 30,000-face mesh onto the low one, then
   combined into a painted texture (tinted shadows, a warm top light, a little brush grain).
3. Rig: one skeleton for every brute, placed from the learned rings (joints at fixed fractions of each part).
   Weights come from the part each vertex belongs to (deform.bind) and its distance to that part's bones.
4. Moves: moves.py keys every clip on that skeleton; each becomes a glTF animation.
Writes out/<fighter>/fighter.glb, paint.png, rig.json, and with --sheet a contact sheet of every move.
"""
import argparse
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCALE = os.path.join(HERE, '..', 'bruiser-study', 'scale')
sys.path.insert(0, os.path.join(HERE, '..', 'bruiser-study')); sys.path.insert(0, SCALE); sys.path.insert(0, HERE)
import numpy as np  # noqa: E402

import deform  # noqa: E402  (bind, ring_field: read-only use of the Bruiser study's cage maths)
import figure  # noqa: E402  (role)

BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head',
         'clavicle_R', 'upperarm_R', 'forearm_R', 'hand_R', 'clavicle_L', 'upperarm_L', 'forearm_L', 'hand_L',
         'thigh_R', 'shin_R', 'foot_R', 'thigh_L', 'shin_L', 'foot_L']
PARENT = {'hips': 'root', 'spine': 'hips', 'chest': 'spine', 'neck': 'chest', 'head': 'neck',
          'clavicle_R': 'chest', 'upperarm_R': 'clavicle_R', 'forearm_R': 'upperarm_R', 'hand_R': 'forearm_R',
          'clavicle_L': 'chest', 'upperarm_L': 'clavicle_L', 'forearm_L': 'upperarm_L', 'hand_L': 'forearm_L',
          'thigh_R': 'hips', 'shin_R': 'thigh_R', 'foot_R': 'shin_R',
          'thigh_L': 'hips', 'shin_L': 'thigh_L', 'foot_L': 'shin_L'}
# which bones a vertex of each learned part may follow
ALLOWED = {'torso': ['hips', 'spine', 'chest', 'neck', 'head', 'clavicle_R', 'clavicle_L'],
           'arm': ['chest', 'clavicle', 'upperarm', 'forearm', 'hand'], 'hand': ['forearm', 'hand'],
           'leg': ['hips', 'thigh', 'shin', 'foot']}


def hexrgb(h):
    """Hex sRGB -> linear RGB (bakes and shaders work in linear)."""
    h = h.lstrip('#'); c = np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], float) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def centre(spec, name, z):
    p = next(p for p in spec['parts'] if p['name'] == name)
    cx, cy, _ = deform.ring_field(p, np.array([z]))
    return float(cx[0]), float(cy[0])


def joints(spec):
    """Joint positions (Z up, metres, facing -Y) at fixed fractions of each learned part."""
    J = {}
    t = lambda z: (lambda c: (c[0], c[1], z))(centre(spec, 'torso', z))  # noqa: E731
    J['root'] = (0, 0, 0)
    hx, hy, _ = t(1.0)
    J['hips'] = (hx, hy, 0.95); J['spine'] = t(1.15); J['chest'] = t(1.38); J['neck'] = t(1.66)
    J['head'] = t(1.77); J['head_end'] = (J['head'][0], J['head'][1] - 0.02, 1.99)
    for s in 'RL':
        a = next(p for p in spec['parts'] if p['name'] == 'arm_' + s)
        z0, z1 = a['rings'][0]['z'], a['rings'][-1]['z']; L = z1 - z0
        zs, ze, zw = z0 + 0.86 * L, z0 + 0.52 * L, z0 + 0.20 * L
        sx, sy = centre(spec, 'arm_' + s, zs)
        J['upperarm_' + s] = (sx * 0.9, sy, zs)
        J['clavicle_' + s] = (0.07 * (1 if s == 'L' else -1) + J['neck'][0], J['neck'][1] + 0.02, zs + 0.06)
        J['forearm_' + s] = (*centre(spec, 'arm_' + s, ze), ze)
        J['hand_' + s] = (*centre(spec, 'arm_' + s, zw), zw)
        J['hand_end_' + s] = (*centre(spec, 'arm_' + s, z0 + 0.02), z0)
        lx, ly = centre(spec, 'leg_' + s, 0.86)
        J['thigh_' + s] = (lx, ly, 0.93)
        J['shin_' + s] = (*centre(spec, 'leg_' + s, 0.50), 0.50)
        ax, ay = centre(spec, 'leg_' + s, 0.10)
        J['foot_' + s] = (ax, ay, 0.09); J['foot_end_' + s] = (ax * 1.05, ay - 0.16, 0.02)
    return J


def tail(J, b):
    nxt = {'root': (0, 0.0, 0.2), 'hips': 'spine', 'spine': 'chest', 'chest': 'neck', 'neck': 'head', 'head': 'head_end'}
    for s in 'RL':
        nxt.update({'clavicle_' + s: 'upperarm_' + s, 'upperarm_' + s: 'forearm_' + s, 'forearm_' + s: 'hand_' + s,
                    'hand_' + s: 'hand_end_' + s, 'thigh_' + s: 'shin_' + s, 'shin_' + s: 'foot_' + s,
                    'foot_' + s: 'foot_end_' + s})
    n = nxt[b]
    return n if isinstance(n, tuple) else J[n]


def seg_dist(P, a, b):
    a = np.array(a); b = np.array(b); ab = b - a
    t = np.clip(((P - a) @ ab) / max(ab @ ab, 1e-9), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


def weights(spec, J, V):
    who, _, _ = deform.bind(spec, V, spec['dz'])
    names = [p['name'] for p in spec['parts']]
    D = {b: seg_dist(V, J[b], tail(J, b)) for b in BONES if b != 'root'}
    W = np.zeros((len(V), len(BONES)))
    for i, v in enumerate(V):
        pn = names[who[i]] if who[i] >= 0 else None
        near = min(D, key=lambda b: D[b][i])
        if pn is not None and not pn.startswith(('arm', 'hand')) and near.startswith(('hand', 'forearm')) and D[near][i] < 0.12:
            pn = 'arm_' + near[-1]   # fists that hang by the hips belong to the arm, not the hip or thigh
        if pn is None:   # unbound: nearest bone of any part
            allowed = [b for b in BONES if b != 'root']
        elif pn == 'torso':
            allowed = ALLOWED['torso']
        else:
            kind, side = pn.split('_')[0], pn.split('_')[1]
            allowed = [b if b in ('chest', 'hips') else f'{b}_{side}' for b in ALLOWED[kind]]
        d = np.array([D[b][i] for b in allowed]) + 0.015
        w = d ** -6; w /= w.sum()
        top = np.argsort(-w)[:3]; ww = w[top] / w[top].sum()
        for k, j in zip(top, ww):
            W[i, BONES.index(allowed[k])] += j
    return W, who


def bake(hero, low, kind, size, samples=8):
    import bpy
    img = bpy.data.images.new(f'bake_{kind}', size, size, alpha=False)
    for m in low.data.materials:
        m.use_nodes = True
        nt = m.node_tree
        n = nt.nodes.get('bake_target') or nt.nodes.new('ShaderNodeTexImage'); n.name = 'bake_target'; n.image = img
        nt.nodes.active = n
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.render.bake.use_selected_to_active = True; sc.render.bake.cage_extrusion = 0.04
    sc.render.bake.max_ray_distance = 0.08; sc.render.bake.margin = 6
    bpy.ops.object.select_all(action='DESELECT'); hero.select_set(True); low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.bake(type=kind)
    a = np.array(img.pixels[:]).reshape(size, size, 4)[..., :3].copy()
    return a


def fighter(key, cfg, tex, sheet):
    import bpy
    import bmesh
    from mathutils import Matrix, Vector
    f = cfg['fighters'][key]
    spec = json.load(open(os.path.join(HERE, f['spec'])))
    out = os.path.join(HERE, 'out', key); os.makedirs(out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, f['hero']))
    hero = next(x for x in bpy.context.scene.objects if x.type == 'MESH')
    hero.data.transform(hero.matrix_world); hero.parent = None; hero.matrix_world = Matrix.Identity(4)
    for x in [x for x in bpy.context.scene.objects if x is not hero]:
        bpy.data.objects.remove(x)
    bm = bmesh.new(); bm.from_mesh(hero.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(hero.data); bm.free()
    hero.name = 'hero'

    # --- roles on the hero, from the learned rings (the same rule the Bruiser pipeline uses) ---
    HV = np.array([v.co[:] for v in hero.data.vertices])
    who, _, _ = deform.bind(spec, HV, spec['dz'])
    names = [p['name'] for p in spec['parts']]
    order = ['Skin', 'TankTop', 'Shorts', 'Brow']
    paint = {k: hexrgb(v) for k, v in f['paint'].items()}
    hero.data.materials.clear()
    for nm in order:
        m = bpy.data.materials.new('hero_' + nm); m.use_nodes = True
        nt = m.node_tree; nt.nodes.clear()
        e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*paint.get(nm, paint['brow']), 1)
        o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0])
        hero.data.materials.append(m)
    head_y = centre(spec, 'torso', 1.86)[1]
    for p in hero.data.polygons:
        c = p.center
        vs = [who[v] for v in p.vertices]; k = max(set(vs), key=vs.count)
        pn = names[k] if k >= 0 else 'torso'
        r = figure.role(pn, c.z, c.x, c.y, 0.0) if (pn != 'torso' or c.z > 0.6) else 'Skin'   # unbound toes are skin
        # brows: the front of the head between eye line and brow ridge, a painted cartoon stroke
        if pn == 'torso' and 1.865 < c.z < 1.895 and abs(c.x - centre(spec, 'torso', c.z)[0]) < 0.075 and c.y < head_y - 0.06 and p.normal.y < -0.35:
            r = 'Brow'
        p.material_index = order.index(r)

    # --- the low-poly fighter: the Bruiser cleanup (weld + decimate), fresh UVs for paint ---
    low = hero.copy(); low.data = hero.data.copy(); bpy.context.scene.collection.objects.link(low); low.name = 'brute'
    m = low.modifiers.new('decimate', 'DECIMATE'); m.ratio = cfg['ratio']
    bpy.context.view_layer.objects.active = low; bpy.ops.object.select_all(action='DESELECT'); low.select_set(True)
    bpy.ops.object.modifier_apply(modifier=m.name)
    while low.data.uv_layers:
        low.data.uv_layers.remove(low.data.uv_layers[0])
    low.data.uv_layers.new(name='paint')
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.006)
    bpy.ops.object.mode_set(mode='OBJECT')
    for p in low.data.polygons:
        p.use_smooth = False
    idx = [p.material_index for p in low.data.polygons]
    low.data.materials.clear()
    for p, i in zip(low.data.polygons, idx):
        p.material_index = i
    for nm in order[:3]:
        mm = bpy.data.materials.new(nm); mm.use_nodes = True; low.data.materials.append(mm)
    for p in low.data.polygons:   # role materials follow the paint (Brow strokes are Skin)
        p.material_index = min(p.material_index, 2) if p.material_index < 3 else 0

    col = bake(hero, low, 'EMIT', tex, 1)
    for mm in hero.data.materials:   # AO wants a lit, diffuse hero
        nt = mm.node_tree; nt.nodes.clear()
        d = nt.nodes.new('ShaderNodeBsdfDiffuse'); o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(d.outputs[0], o.inputs[0])
    bpy.context.scene.world = bpy.data.worlds.new('w')
    bpy.context.scene.world.light_settings.distance = 0.35
    ao = bake(hero, low, 'AO', tex, 24)[..., 0]

    # --- combine into paint: tinted shadows, warm top light per texel height, grain ---
    # height of each texel: bake the hero's z as emission
    for mm in hero.data.materials:
        nt = mm.node_tree; nt.nodes.clear()
        g = nt.nodes.new('ShaderNodeNewGeometry'); sp = nt.nodes.new('ShaderNodeSeparateXYZ')
        dv = nt.nodes.new('ShaderNodeMath'); dv.operation = 'DIVIDE'; dv.inputs[1].default_value = 2.0
        e = nt.nodes.new('ShaderNodeEmission'); o = nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(g.outputs['Position'], sp.inputs[0]); nt.links.new(sp.outputs['Z'], dv.inputs[0])
        nt.links.new(dv.outputs[0], e.inputs['Color']); nt.links.new(e.outputs[0], o.inputs[0])
    hz = bake(hero, low, 'EMIT', tex, 1)[..., 0]
    rng = np.random.default_rng(27 + len(key))
    grain = rng.normal(0, 1, (tex // 8, tex // 8))
    grain = np.kron(grain, np.ones((8, 8)))[:tex, :tex]
    a = np.clip(ao, 0, 1) ** 0.9
    shade = a[..., None] * 1.0 + (1 - a[..., None]) * paint['shadow'] * 1.6
    shade = shade ** 1.25   # deeper, painted shadows
    light = 0.86 + 0.22 * np.clip(hz, 0, 1)[..., None]
    paint_img = np.clip(col * shade * light * (1 + 0.035 * grain[..., None]), 0, 1)
    # linear -> sRGB for the PNG (bake buffers are linear)
    srgb = np.where(paint_img <= 0.0031308, paint_img * 12.92, 1.055 * paint_img ** (1 / 2.4) - 0.055)
    from PIL import Image
    Image.fromarray((np.flipud(srgb) * 255).astype(np.uint8)).save(os.path.join(out, 'paint.png'))
    bpy.data.objects.remove(hero)

    img = bpy.data.images.load(os.path.join(out, 'paint.png')); img.name = f'{key}_paint'
    for mm in low.data.materials:
        nt = mm.node_tree; nt.nodes.clear()
        b = nt.nodes.new('ShaderNodeBsdfPrincipled'); t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
        o = nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(t.outputs['Color'], b.inputs['Base Color']); nt.links.new(b.outputs[0], o.inputs[0])
        b.inputs['Roughness'].default_value = 0.8 if mm.name != 'Skin' else 0.62

    # --- rig ---
    J = joints(spec)
    arm = bpy.data.armatures.new('rig'); rig = bpy.data.objects.new('rig', arm); bpy.context.scene.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig; bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for b in BONES:
        eb = arm.edit_bones.new(b); eb.head = Vector(J[b]); eb.tail = Vector(tail(J, b))
        eb.align_roll(Vector((0, -1, 0)) if abs((eb.tail - eb.head).normalized().y) < 0.9 else Vector((0, 0, 1)))
    for b, p in PARENT.items():
        arm.edit_bones[b].parent = arm.edit_bones[p]
        arm.edit_bones[b].use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    V = np.array([v.co[:] for v in low.data.vertices])
    W, _ = weights(spec, J, V)
    groups = {b: low.vertex_groups.new(name=b) for b in BONES if b != 'root'}
    for i in range(len(V)):
        for j in np.nonzero(W[i] > 0.01)[0]:
            groups[BONES[j]].add([i], float(W[i, j]), 'REPLACE')
    low.parent = rig
    mod = low.modifiers.new('rig', 'ARMATURE'); mod.object = rig
    json.dump(dict(fighter=key, joints={k: [round(x, 4) for x in v] for k, v in J.items()}, bones=BONES, parent=PARENT,
                   faces=len(low.data.polygons), vertices=len(V)), open(os.path.join(out, 'rig.json'), 'w'), indent=1)

    # --- moves ---
    import moves
    clips = moves.author(rig)
    rig.animation_data_create()
    for name, act in clips.items():
        tr = rig.animation_data.nla_tracks.new(); tr.name = name
        tr.strips.new(name, int(act.frame_range[0]), act); tr.mute = True
    rig.animation_data.action = None
    if sheet:
        moves.sheet(rig, low, clips, os.path.join(out, 'moves.jpg'), paint)
    bpy.ops.object.select_all(action='DESELECT'); rig.select_set(True); low.select_set(True)
    rig.name = f'brute_{key}'
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'fighter.glb'), export_format='GLB', use_selection=True,
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                              export_image_format='JPEG', export_image_quality=88, export_yup=True)
    print(key, 'faces', len(low.data.polygons), 'clips', len(clips))


def write_moves(path):
    import moves
    # peak: the clip's first key after rest. A reaction is shown from its peak during hit-stop, so the flinch reads
    # in the freeze frame and blends on into the hurt motion after it (Sakurai, Famitsu column 490)
    clips = {k: dict(loop=loop, length=round(keys[-1][0], 3), peak=round(keys[1][0], 3)) for k, (loop, keys) in moves.CLIPS.items()}
    json.dump(dict(fps=moves.FPS, clips=clips, moves=moves.MOVES), open(path, 'w'), indent=1)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--only'); ap.add_argument('--tex', type=int)
    ap.add_argument('--sheet', action='store_true')
    a = ap.parse_args()
    cfg = json.load(open(os.path.join(HERE, 'fighters.json')))
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True); write_moves(os.path.join(HERE, 'out', 'moves.json'))
    for key in cfg['fighters']:
        if a.only and key != a.only:
            continue
        fighter(key, cfg, a.tex or cfg['texture'], a.sheet)


if __name__ == '__main__':
    main()
