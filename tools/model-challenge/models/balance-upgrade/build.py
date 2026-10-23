"""balance-upgrade (BA-0031, style A): Bronze Age portable merchant beam balance on a timber T-stand.

python build.py  ->  balance-upgrade.glb next to this file.
Z up, metres, origin at the centre of the footprint on the ground, front faces -Y.
Moving parts: `beam` rocks on a bronze pin in the post's yoke (tips one way, the other, settles);
`hanger_left` / `hanger_right` are children of the beam that counter-rotate so the pans always hang plumb.
"""
import math, os, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'balance-upgrade.glb')

P = dict(
    # base (two plank layers)
    base_w=0.50, base_d=0.44, base_h1=0.072, base_h2=0.064, base_inset=0.016,
    # post
    post_w_bot=0.088, post_w_top=0.084, post_d=0.066, post_top=0.93,
    foot_w=0.10, foot_h=0.03,
    collar_dz=(0.040, 0.057, 0.074, 0.091), collar_r=0.049, collar_t=0.0115,
    yoke_t=0.013, yoke_top=1.02,
    # braces (double as tilt stops)
    brace_x_post=0.03, brace_z_post=0.75, brace_z_post2=0.84, brace_x_in=0.10, brace_x_top=0.178, brace_z_top=0.912, brace_d=0.054,
    # beam
    pivot_z=0.98, beam_len=0.82, beam_h=0.078, beam_d=0.06, hump_len=0.34, hump_h=0.032,
    cap_len=0.08, cap_extra=0.012,
    spike_h=0.10, spike_r=0.017,
    # hangers and pans
    hang_x=0.33, knot_z=0.72, rim_z=0.40, pan_r=0.16, pan_depth=0.09, cord_r=0.0042, rope_r=0.006,
    # motion (degrees at frames)
    tilt_keys=[(1, 0.0), (16, 6.5), (36, -5.5), (53, 3.5), (68, -2.0), (81, 1.0), (92, -0.35), (102, 0.0), (120, 0.0)],
)

COL = dict(  # sRGB 0-255, sampled from mj/balance-upgrade/hero.png (lit faces)
    Timber=(140, 97, 62), TimberLight=(156, 110, 70), TimberDark=(100, 66, 40), BaseTimber=(112, 78, 48),
    TimberEdge=(98, 64, 38), DarkEdge=(70, 45, 26), BaseEdge=(78, 53, 31),
    PanBronze=(96, 60, 30), PanInnerBronze=(142, 110, 70), Rope=(158, 112, 70),
    Stone=(128, 128, 124), StoneDark=(98, 96, 92), Iron=(72, 64, 56), PinBronze=(176, 128, 60),
)


def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def make_mats():
    mats = {}
    for name, rgb in COL.items():
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*[lin(x) for x in rgb], 1)
        b.inputs['Roughness'].default_value = 0.6 if 'Bronze' in name or name == 'Iron' else 0.85
        if name in ('PinBronze', 'Iron'):
            b.inputs['Metallic'].default_value = 0.5
        mats[name] = m
    return mats


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def from_bm(name, bm, mat):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(mat)
    return link(bpy.data.objects.new(name, me))


def apply_mods(o):
    bpy.context.view_layer.objects.active = o
    for o2 in bpy.context.view_layer.objects:
        o2.select_set(o2 == o)
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def jitter(o, amp, seed):
    rnd = random.Random(seed)
    for v in o.data.vertices:
        v.co += Vector((rnd.uniform(-amp, amp), rnd.uniform(-amp, amp), rnd.uniform(-amp, amp)))


EDGE = {}


def box(name, size, loc, mat, bevel=0.006, taper_top=None, jit=0.0, seed=0, rot=None):
    """Box sized (x, y, z) centred at loc; taper_top=(sx, sy) scales the top face."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
        if taper_top and v.co.z > 0:
            v.co.x *= taper_top[0]; v.co.y *= taper_top[1]
    o = from_bm(name, bm, mat)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 1; b.limit_method = 'ANGLE'
        if mat.name in EDGE:  # darker chamfers: a cheap two-tone that makes edges read
            o.data.materials.append(EDGE[mat.name]); b.material = 1
        apply_mods(o)
    if jit:
        jitter(o, jit, seed)
    if rot:
        o.rotation_euler = rot
    o.location = loc
    return o


def cyl(name, p1, p2, r, mat, n=5, r2=None):
    p1, p2 = Vector(p1), Vector(p2); d = p2 - p1
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=n, radius1=r, radius2=r if r2 is None else r2, depth=d.length)
    o = from_bm(name, bm, mat)
    o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.location = (p1 + p2) / 2
    return o


def ring(name, loc, R, r, mat, axis='Z', seg=10, mseg=4, scale=(1, 1, 1)):
    bm = bmesh.new()
    verts = []
    for i in range(seg):
        a = 2 * math.pi * i / seg; row = []
        for j in range(mseg):
            b = 2 * math.pi * j / mseg + math.pi / mseg
            rr = R + r * math.cos(b)
            row.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), r * math.sin(b))))
        verts.append(row)
    for i in range(seg):
        for j in range(mseg):
            bm.faces.new((verts[i][j], verts[(i + 1) % seg][j], verts[(i + 1) % seg][(j + 1) % mseg], verts[i][(j + 1) % mseg]))
    o = from_bm(name, bm, mat)
    o.scale = scale
    o.rotation_euler = {'Z': (0, 0, 0), 'X': (0, math.pi / 2, 0), 'Y': (math.pi / 2, 0, 0)}[axis]
    o.location = loc
    return o


def lathe(name, prof, mat, seg=12, mat_index_fn=None, mats=()):
    """prof: list of (r, z); r == 0 points become a single pole vertex."""
    bm = bmesh.new(); rings = []
    for r, z in prof:
        if r == 0:
            rings.append([bm.verts.new((0, 0, z))] * seg)
        else:
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), z)) for i in range(seg)])
    for k in range(len(rings) - 1):
        a, b = rings[k], rings[k + 1]
        for i in range(seg):
            q = [a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]]
            u = []
            for v in q:
                if v not in u:
                    u.append(v)
            if len(u) >= 3:
                f = bm.faces.new(u)
                if mat_index_fn:
                    f.material_index = mat_index_fn(k)
    o = from_bm(name, bm, mat)
    for m in mats:
        o.data.materials.append(m)
    return o


def stone(name, loc, scale, mat, seed):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    o = from_bm(name, bm, mat); jitter(o, 0.16, seed)
    for v in o.data.vertices:
        v.co.z = max(v.co.z, -0.55)  # flat bottom so it sits
    o.scale = scale; o.location = loc
    return o


def join(name, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object; o.name = name; o.data.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o


def set_origin(o, pt):
    pt = Vector(pt)
    o.data.transform(Matrix.Translation(o.location - pt)); o.location = pt


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M = make_mats(); p = P
    EDGE.update({'Timber': M['TimberEdge'], 'TimberLight': M['TimberEdge'], 'BaseTimber': M['BaseEdge'], 'TimberDark': M['DarkEdge']})
    sc = bpy.context.scene; sc.render.fps = 24; sc.frame_start = 1; sc.frame_end = 120

    # ---------------- stand (static) ----------------
    st = []
    h1, h2 = p['base_h1'], p['base_h2']
    # lower layer: two long planks running front-to-back
    for i, sx in enumerate((-1, 1)):
        st.append(box(f'plank_lo{i}', (p['base_w'] / 2 - 0.004, p['base_d'], h1), (sx * p['base_w'] / 4, 0, h1 / 2), M['BaseTimber'], 0.008, jit=0.003, seed=10 + i))
    # upper layer: three planks running side-to-side, inset
    pd = (p['base_d'] - 2 * p['base_inset']) / 3
    for i in range(3):
        st.append(box(f'plank_up{i}', (p['base_w'] - 2 * p['base_inset'], pd - 0.004, h2), (0, (i - 1) * pd, h1 + h2 / 2), M['TimberLight' if i == 1 else 'Timber'], 0.008, jit=0.003, seed=20 + i))
    bt = h1 + h2
    st.append(box('post_foot', (p['foot_w'], p['foot_w'] * 0.85, p['foot_h']), (0, 0, bt + p['foot_h'] / 2), M['TimberDark'], 0.006, taper_top=(0.85, 0.85)))
    ph = p['post_top'] - bt
    st.append(box('post', (p['post_w_bot'], p['post_d'], ph), (0, 0, bt + ph / 2), M['Timber'], 0.007,
                  taper_top=(p['post_w_top'] / p['post_w_bot'], 0.95), jit=0.002, seed=3))
    # yoke cheeks either side of the beam, carved pointed tops, bronze pivot pin
    yt = p['yoke_top']; yb = p['post_top'] - 0.05
    for i, sy in enumerate((-1, 1)):
        yy = sy * (p['beam_d'] / 2 + p['yoke_t'] / 2 + 0.002)
        st.append(box(f'yoke{i}', (p['post_w_top'] * 0.95, p['yoke_t'], yt - yb), (0, yy, (yt + yb) / 2), M['Timber'], 0.004, taper_top=(0.75, 1)))
        st.append(box(f'yoke_cap{i}', (0.05, p['yoke_t'] + 0.006, 0.02), (0, yy, yt + 0.006), M['TimberDark'], 0.004, taper_top=(0.3, 0.6)))
    pin = cyl('pin', (0, -p['beam_d'] / 2 - 0.025, p['pivot_z']), (0, p['beam_d'] / 2 + 0.025, p['pivot_z']), 0.009, M['PinBronze'], n=6)
    st.append(pin)
    # braces: knee braces flaring up toward the beam, stopping just under it (they are the tilt stops)
    for i, sx in enumerate((-1, 1)):
        xz = [(p['brace_x_post'], p['brace_z_post']), (p['brace_x_top'], p['brace_z_top']),
              (p['brace_x_in'], p['brace_z_top']), (p['brace_x_post'], p['brace_z_post2'])]
        bm = bmesh.new(); hd = p['brace_d'] / 2
        fr = [bm.verts.new((sx * x, -hd, z)) for x, z in xz]; bk = [bm.verts.new((sx * x, hd, z)) for x, z in xz]
        bm.faces.new(fr if sx < 0 else fr[::-1]); bm.faces.new(bk[::-1] if sx < 0 else bk)
        for k in range(4):
            q = [fr[k], fr[(k + 1) % 4], bk[(k + 1) % 4], bk[k]]
            bm.faces.new(q[::-1] if sx < 0 else q)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        o = from_bm(f'brace{i}', bm, M['TimberDark'])
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = 0.005; b.segments = 1; b.limit_method = 'ANGLE'; apply_mods(o)
        jitter(o, 0.002, 40 + i); st.append(o)
        # flat stop pad on top of the brace
        st.append(box(f'stop{i}', (p['brace_x_top'] - p['brace_x_in'] + 0.01, p['brace_d'] * 1.06, 0.012),
                      (sx * (p['brace_x_top'] + p['brace_x_in']) / 2, 0, p['brace_z_top'] + 0.002), M['Timber'], 0.003))
    # rope collar binding the post foot
    for i, dz in enumerate(p['collar_dz']):
        st.append(ring(f'collar{i}', (0, 0, bt + dz), p['collar_r'], p['collar_t'], M['Rope'], seg=10, mseg=4, scale=(1, 0.85, 1)))
    # loose rope tail from collar down to the base (hero detail)
    st.append(cyl('rope_tail', (0.047, -0.02, bt + p['collar_dz'][0]), (0.10, -0.07, bt + 0.006), 0.007, M['Rope'], n=5))
    st.append(ring('rope_coil', (0.115, -0.08, bt + 0.006), 0.022, 0.007, M['Rope'], seg=8, mseg=4))
    stand = join('stand', st)

    # stones: a weight on the base (hero) and a stack of flat weights in front of the base
    s1 = stone('stone_big', (-0.135, -0.07, bt + 0.045), (0.095, 0.08, 0.078), M['Stone'], 7)
    s2 = stone('weight_a', (0.08, 0.27, 0.022), (0.07, 0.05, 0.038), M['StoneDark'], 8)
    s3 = stone('weight_b', (0.075, 0.27, 0.055), (0.045, 0.035, 0.026), M['Stone'], 9)
    s4 = stone('weight_c', (-0.01, 0.26, 0.016), (0.04, 0.035, 0.028), M['StoneDark'], 11)
    stones = join('stone_weights', [s1, s2, s3, s4])

    # ---------------- beam (rocks on the pin) ----------------
    pz = p['pivot_z']; L = p['beam_len']; bh = p['beam_h']; bd = p['beam_d']
    bz = pz  # beam centred on pivot
    bp = [box('beam_bar', (L - 2 * p['cap_len'] + 0.01, bd, bh), (0, 0, bz), M['Timber'], 0.007, jit=0.0025, seed=50)]
    for i, sx in enumerate((-1, 1)):
        bp.append(box(f'beam_cap{i}', (p['cap_len'], bd + 0.006, bh + p['cap_extra']), (sx * (L / 2 - p['cap_len'] / 2), 0, bz + 0.002), M['Timber'], 0.008, jit=0.003, seed=60 + i))
        # lashing where the hanger ties on
        for k in range(3):
            bp.append(ring(f'lash{i}{k}', (sx * (p['hang_x'] + (k - 1) * 0.017), 0, bz), 0.043, 0.0085, M['Rope'], axis='X', seg=8, mseg=4, scale=(1, 0.8, 1.15)))
        bp.append(ring(f'lash_knot{i}', (sx * p['hang_x'], -bd / 2 - 0.008, bz + 0.02), 0.008, 0.008, M['Rope'], axis='Y', seg=6, mseg=4))
        # end lashing binding the cap onto the bar
        for k in range(2):
            bp.append(ring(f'endlash{i}{k}', (sx * (L / 2 - p['cap_len'] - 0.004 + k * 0.016), 0, bz), 0.046, 0.008, M['Rope'], axis='X', seg=8, mseg=4, scale=(1, 0.78, 1.12)))
    bp.append(box('beam_hump', (p['hump_len'], bd - 0.004, p['hump_h'] + 0.01), (0, 0, bz + bh / 2 + p['hump_h'] / 2 - 0.005), M['Timber'], 0.008, taper_top=(0.8, 0.9), jit=0.002, seed=70))
    top = bz + bh / 2 + p['hump_h']
    # centre lashing around the hump
    bp.append(ring('lash_mid', (0, 0, bz + 0.012), 0.05, 0.008, M['Rope'], axis='X', seg=8, mseg=4, scale=(1, 0.75, 1.2)))
    # pointer needle (rides with the beam, so its lean reads the tilt) on a small collar
    bp.append(cyl('needle_collar', (0, 0, top - 0.004), (0, 0, top + 0.012), 0.013, M['Iron'], n=6))
    nb = top + 0.012
    bp.append(cyl('needle_shaft', (0, 0, nb), (0, 0, nb + 0.03), 0.004, M['Iron'], n=4))
    bp.append(cyl('needle_head', (0, 0, nb + 0.03), (0, 0, nb + p['spike_h']), p['spike_r'], M['Iron'], n=4, r2=0.0))
    beam = join('beam', bp)
    set_origin(beam, (0, 0, pz))

    # ---------------- hangers + pans ----------------
    hangers = []
    for i, (side, sx) in enumerate((('left', -1), ('right', 1))):
        hx = sx * p['hang_x']; top_z = bz - bh / 2 + 0.004
        hp = [cyl('hang_rope', (hx, 0, top_z), (hx, 0, p['knot_z']), p['rope_r'], M['Rope'], n=5)]
        hp.append(ring('knot', (hx, 0, p['knot_z'] + 0.008), 0.008, 0.007, M['Rope'], seg=6, mseg=4, scale=(1, 1, 1.6)))
        hp.append(ring('knot2', (hx, 0, p['knot_z'] + 0.03), 0.006, 0.006, M['Rope'], seg=6, mseg=4))
        R = p['pan_r']; rz = p['rim_z']
        for k in range(3):
            a = math.radians(90 + 120 * k + (0 if sx < 0 else 180))
            rim_pt = (hx + 0.92 * R * math.cos(a), 0.92 * R * math.sin(a), rz + 0.004)
            hp.append(cyl(f'cord{k}', (hx, 0, p['knot_z']), rim_pt, p['cord_r'], M['Rope'], n=4))
            # little binding knot on each cord near the rim
            t = 0.18
            kp = Vector((hx, 0, p['knot_z'])).lerp(Vector(rim_pt), 1 - t)
            hp.append(cyl(f'cknot{k}', kp - Vector((0, 0, 0.008)), kp + Vector((0, 0, 0.008)), 0.008, M['Rope'], n=5))
        D = p['pan_depth']
        prof = [(0, rz - D + 0.012), (R * 0.55, rz - D + 0.018), (R * 0.88, rz - 0.022), (R - 0.01, rz - 0.002),   # inner bowl (bronze)
                (R, rz + 0.004), (R + 0.006, rz - 0.004),                                                         # rolled rim
                (R * 0.93, rz - 0.03), (R * 0.62, rz - D + 0.006), (R * 0.3, rz - D), (0, rz - D)]               # outer shell
        pan = lathe(f'pan_{side}', prof, M['PanInnerBronze'], seg=12, mat_index_fn=lambda k: 0 if k < 3 else 1, mats=[M['PanBronze']])
        pan.location = (hx, 0, 0)
        h = join(f'pan_{side}', [pan] + hp)
        set_origin(h, (hx, 0, top_z))
        h.name = f'hanger_{side}'
        h.parent = beam
        h.matrix_parent_inverse = beam.matrix_world.inverted()
        hangers.append(h)

    # ---------------- animation: tip, tip back, settle; pans counter-rotate ----------------
    # one action with a slot per object, so the GLB carries a single clip ("balance_tip")
    act = bpy.data.actions.new('balance_tip')
    for o in [beam] + hangers:
        o.rotation_mode = 'XYZ'; o.animation_data_create(); o.animation_data.action = act
    for f, deg in p['tilt_keys']:
        beam.rotation_euler = (0, math.radians(deg), 0); beam.keyframe_insert('rotation_euler', index=1, frame=f)
        for h in hangers:
            h.rotation_euler = (0, -math.radians(deg), 0); h.keyframe_insert('rotation_euler', index=1, frame=f)
    sc.frame_set(1)
    return beam, hangers


def export():
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                              export_animation_mode='SCENE', export_apply=True,
                              export_anim_scene_split_object=False)  # one clip for the whole scene


if __name__ == '__main__':
    build(); export()
    tris = 0; dg = bpy.context.evaluated_depsgraph_get()
    for o in bpy.context.scene.objects:
        if o.type == 'MESH':
            m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    print('wrote', OUT, 'tris', tris)
