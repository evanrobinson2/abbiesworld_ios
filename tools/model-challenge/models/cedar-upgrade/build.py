"""cedar-upgrade (R-03 Old cedar, style A): an ancient western red cedar.

python build.py  ->  cedar-upgrade.glb next to this file.
Z up, metres, origin at the centre of the trunk footprint on the ground, front faces -Y.

Build: a fluted, tapering red trunk with lobed flared roots; foliage as tiers of drooping spray clumps. Each
clump is 3 stacked fan-shaped shells (dark under, light on top), arched across and drooping toward the tip,
with a ragged hanging fringe along the rim, on a short wooden limb. A few bare dead branches with forks.
Motion: every clump nods on its own limb pivot (offset phases), and the crown (upper trunk + upper tiers)
rocks gently on a pivot above the lowest tier. Frames 1-120 @ 24 fps, seamless loop.
"""
import math, os, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'cedar-upgrade.glb')

P = dict(
    height=14.3,              # top of trunk leader (hidden in the crown cluster)
    trunk_sides=24, trunk_rings=18,
    r_base=1.15, r_top=0.30, taper_pow=0.75,
    flute_amp=0.11, flute_n=11,
    flare=1.15, flare_decay=1.6, lobes=7, lobe_sharp=1.0,
    lean=(-0.45, 0.10),        # top offset of trunk (x, y) in metres
    crown_pivot_z=8.4,        # above this the trunk + clumps belong to the swaying crown
    streak_cols={0, 3, 7, 10, 14, 17, 21},
    # fronds
    frond_nu=4, frond_w=0.44,  # segments along a frond, base width as a fraction of its length
    layers=[  # (length scale, lift m, spread scale, count scale, material)
        (1.00, 0.00, 1.00, 1.00, 'FoliageDark'),
        (0.86, 0.32, 0.86, 0.85, 'FoliageDark'),
        (0.70, 0.62, 0.72, 0.70, 'FoliageMid'),
        (0.52, 0.88, 0.55, 0.50, 'FoliageLight'),
    ],
    # clumps: (name, azimuth deg from +X ccw, z of attach, reach m, half-spread deg, rise m, droop m, fronds in bottom layer)
    # hero gesture: big flat-topped sprays alternating sides with sky between, and a dense lopsided crown cluster
    clumps=[
        ('low_W',   195, 6.2, 5.6, 42, 0.8, 2.3, 9),
        ('low_E',   -12, 7.9, 5.8, 42, 0.8, 2.4, 9),
        ('mid_W',   165, 10.0, 4.7, 38, 0.7, 2.0, 8),
        ('back_N',   95, 8.8, 3.4, 34, 0.6, 1.6, 6),
        ('mid_E',    20, 11.4, 4.1, 38, 0.7, 1.8, 8),
        ('crown_W', 180, 12.3, 3.2, 50, 0.7, 1.6, 7),
        ('crown_S', -70, 12.7, 2.7, 50, 0.7, 1.4, 6),
        ('crown_N', 105, 13.1, 2.6, 50, 0.7, 1.4, 6),
        ('crown_E',  15, 13.5, 2.4, 50, 0.7, 1.3, 6),
        ('crown_SW', 230, 13.9, 2.4, 50, 0.8, 1.2, 6),
        ('tip',     150, 14.3, 1.9, 180, 1.0, 1.1, 9),
    ],
    # dead branches: (name, azimuth, z, reach, rise)  thin and crooked, between the tiers
    dead=[
        ('dead_E',   10, 9.3, 3.2, 1.4),
        ('dead_E2',  40, 10.4, 2.4, 1.0),
        ('dead_W',  205, 7.8, 2.6, 0.9),
        ('dead_W2', 190, 8.9, 2.0, 0.4),
        ('dead_S',  -80, 9.9, 2.2, 1.0),
        ('dead_low', 220, 3.4, 2.0, 1.1),
        ('dead_top', 140, 12.6, 1.6, 0.8),
    ],
    sway_deg=3.0, crown_deg=0.9,
    seed=7,
)

COL = dict(  # sRGB, sampled from mj/cedar-upgrade/hero.png
    CedarBark=(138, 74, 53), BarkStreak=(178, 108, 76), CedarBarkDark=(110, 48, 34), DeadWood=(112, 80, 58),
    FoliageDark=(44, 64, 26), FoliageMid=(68, 90, 36), FoliageLight=(96, 116, 50),
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
        b.inputs['Roughness'].default_value = 0.85
        m.use_backface_culling = False
        mats[name] = m
    return mats


def mesh_obj(name, verts, faces, mat_idx, mats, mat_names, parent=None, origin=(0, 0, 0)):
    o = Vector(origin)
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(Vector(v) - o) for v in verts], [], faces)
    for n in mat_names:
        me.materials.append(mats[n])
    for p, mi in zip(me.polygons, mat_idx):
        p.material_index = mi
    me.update()
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    ob.location = o
    if parent is not None:
        bpy.context.view_layer.update()
        ob.parent = parent; ob.matrix_parent_inverse = parent.matrix_world.inverted()
    return ob


# ---------------------------------------------------------------- trunk
def trunk_axis(z):
    t = z / P['height']
    return Vector((P['lean'][0] * t * t, P['lean'][1] * t * t, 0))


def trunk_radius(z, th=0.0):
    t = min(1.0, z / P['height'])
    r = P['r_top'] + (P['r_base'] - P['r_top']) * (1 - t) ** P['taper_pow']
    lobe = max(0.0, math.cos(P['lobes'] * th + 0.4 * math.sin(3 * th))) ** P['lobe_sharp']
    flare = P['flare'] * math.exp(-z / P['flare_decay']) * (0.25 + 1.1 * lobe)
    flute = 1 + P['flute_amp'] * math.cos(P['flute_n'] * th + 0.6 * z) * (1 - 0.6 * t)
    return r * flute + flare


def trunk_mesh(z0, z1, rings, cap_top, rng):
    n = P['trunk_sides']; verts = []; faces = []; fm = []
    zs = [z0 + (z1 - z0) * (i / (rings - 1)) ** 1.25 for i in range(rings)] if z0 == 0 else \
         [z0 + (z1 - z0) * i / (rings - 1) for i in range(rings)]
    for z in zs:
        c = trunk_axis(z)
        for j in range(n):
            th = 2 * math.pi * j / n
            r = trunk_radius(z, th)
            if z == 0:
                r *= 1.0
            verts.append((c.x + r * math.cos(th), c.y + r * math.sin(th), z))
    for i in range(rings - 1):
        for j in range(n):
            a = i * n + j; b = i * n + (j + 1) % n
            faces.append((a, b, b + n, a + n)); fm.append(1 if j in P['streak_cols'] else 0)
    if cap_top:
        c = trunk_axis(z1); tip = len(verts); verts.append((c.x, c.y, z1 + 0.6))
        base = (rings - 1) * n
        for j in range(n):
            faces.append((base + j, base + (j + 1) % n, tip)); fm.append(0)
    return verts, faces, fm


# ---------------------------------------------------------------- spray clump
def frond(origin, az, L, wb, rise, droop, rng, verts, faces, fmat, mi, dangle=False):
    """One feathery frond: a flattened, tapered leaf blade (wide at the base, pointed drooping tip), arched along a
    raised midrib, with a jagged serrated edge (one backward-pointing tooth per segment and side)."""
    nu = P['frond_nu']
    d = Vector((math.cos(az), math.sin(az), 0)); s = Vector((-math.sin(az), math.cos(az), 0)); up = Vector((0, 0, 1))
    rows = []
    for i in range(nu + 1):
        u = i / nu
        w = wb / 2 * (1 - u) ** 0.85 * (0.75 + 0.25 * math.sin(math.pi * min(1, u * 1.6)))
        z = rise * u - droop * u ** 2.2
        c = origin + d * (u * L) + up * z + s * rng.uniform(-0.04, 0.04) * L
        if i == nu:
            rows.append([len(verts)]); verts.append(tuple(c)); continue
        rib = c + up * (0.18 * w)                               # arched across: midrib raised
        l = c + s * w - up * (0.10 * w); r = c - s * w - up * (0.10 * w)
        rows.append([len(verts), len(verts) + 1, len(verts) + 2]); verts.extend([tuple(l), tuple(rib), tuple(r)])
    for i in range(nu):
        A, B = rows[i], rows[i + 1]
        if len(B) == 1:
            faces.append((A[0], B[0], A[1])); faces.append((A[1], B[0], A[2])); fmat += [mi, mi]
        else:
            faces.append((A[0], B[0], B[1], A[1])); faces.append((A[1], B[1], B[2], A[2])); fmat += [mi, mi]
        # serration teeth on both edges, pointing out, forward and a little down
        for side, k in ((1, 0), (-1, 2)):
            e0 = Vector(verts[A[k]]); e1 = Vector(verts[B[0] if len(B) == 1 else B[k]])
            w_here = (e0 - Vector(verts[A[1]])).length
            t = e0.lerp(e1, 0.85) + s * side * w_here * rng.uniform(0.45, 0.8) - up * rng.uniform(0.05, 0.2) * L / nu
            ti = len(verts); verts.append(tuple(t))
            faces.append((A[k], ti, B[0] if len(B) == 1 else B[k]) if side == 1 else (A[k], B[0] if len(B) == 1 else B[k], ti)); fmat.append(mi)
    if dangle:  # a few short strands under the tip
        tip = Vector(verts[rows[nu][0]]); p = Vector(verts[rows[nu - 1][1]])
        hi = len(verts); verts.append(tuple((tip + p) / 2 - up * L * rng.uniform(0.12, 0.22)))
        faces.append((rows[nu - 1][0], rows[nu - 1][2], hi)); fmat.append(mi)


def limb(p0, p1, r0, r1, verts, faces, fmat, mi, sides=6, segs=2, bend=0.0):
    axis = (p1 - p0); L = axis.length; ax = axis.normalized()
    ref = Vector((0, 0, 1)) if abs(ax.z) < 0.9 else Vector((1, 0, 0))
    e1 = ax.cross(ref).normalized(); e2 = ax.cross(e1).normalized()
    base = len(verts)
    for i in range(segs + 1):
        t = i / segs
        c = p0 + axis * t + Vector((0, 0, bend * math.sin(math.pi * t)))
        r = r0 + (r1 - r0) * t
        for j in range(sides):
            a = 2 * math.pi * j / sides
            verts.append(tuple(c + (e1 * math.cos(a) + e2 * math.sin(a)) * r))
    for i in range(segs):
        for j in range(sides):
            a = base + i * sides + j; b = base + i * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides)); fmat.append(mi)
    tip = len(verts); verts.append(tuple(p1 + ax * r1 * 2))
    last = base + segs * sides
    for j in range(sides):
        faces.append((last + j, last + (j + 1) % sides, tip)); fmat.append(mi)


def build_clump(c, mats, rng, parent):
    """A spray: fronds splayed outward like fingers from the end of a short limb, in 3 layers (dark, mid, light)."""
    name, azd, z, reach, spread, rise, droop, nf = c
    az = math.radians(azd)
    d = Vector((math.cos(az), math.sin(az), 0))
    ax = trunk_axis(z); r_t = trunk_radius(z, az)
    root = Vector((ax.x, ax.y, z)) + d * r_t * 0.6
    L = reach - r_t * 0.3
    verts, faces, fmat = [], [], []
    limb(root - Vector((0, 0, 0.25)), root + d * L * 0.4 + Vector((0, 0, rise * 0.3 - 0.2)), 0.22, 0.07, verts, faces, fmat, 0)
    names = [l[4] for l in P['layers']]
    for li, (ls, lift, ss, ns, mname) in enumerate(P['layers']):
        n = max(2, round(nf * ns)); sp = math.radians(spread * ss)
        o = root + Vector((0, 0, lift))
        for k in range(n):
            f = (k / (n - 1)) * 2 - 1 if n > 1 else 0
            a = az + sp * f + rng.uniform(-0.1, 0.1) * (sp / max(1, n - 1) + 0.1)
            fl = L * ls * rng.uniform(0.82, 1.05) * (1 - 0.15 * abs(f))
            wb = fl * P['frond_w'] * rng.uniform(0.85, 1.15)
            o2 = o + Vector((math.cos(a), math.sin(a), 0)) * 0.15 * L * (1 - ls)
            frond(o2, a, fl, wb, rise * ls, droop * ls * rng.uniform(0.8, 1.2), rng, verts, faces, fmat, 1 + li,
                  dangle=(li <= 1 and k % 2 == 0))
    return mesh_obj('spray_' + name, verts, faces, fmat, mats, ['CedarBarkDark'] + names, parent, origin=root)


def build_dead(c, mats, rng, parent):
    """Thin crooked bare branch: 3 kinked segments from the trunk, with 2-3 short twigs."""
    name, azd, z, reach, rise = c
    az = math.radians(azd)
    d = Vector((math.cos(az), math.sin(az), 0)); s = Vector((-math.sin(az), math.cos(az), 0))
    ax = trunk_axis(z); root = Vector((ax.x, ax.y, z)) + d * trunk_radius(z, az) * 0.7
    verts, faces, fmat = [], [], []
    pts = [root]; radii = [0.16, 0.10, 0.06, 0.022]
    for k in range(3):
        step = d * reach / 3 + s * rng.uniform(-0.45, 0.45) + Vector((0, 0, rise / 3 + rng.uniform(-0.35, 0.35)))
        pts.append(pts[-1] + step)
    for k in range(3):
        limb(pts[k], pts[k + 1], radii[k], radii[k + 1], verts, faces, fmat, 0, sides=5 if k == 0 else 4, segs=1)
    for k in range(1, 3):
        side = 1 if (k + int(azd)) % 2 else -1
        e = pts[k] + d * reach * 0.18 + s * side * reach * rng.uniform(0.15, 0.3) + Vector((0, 0, rng.uniform(-0.2, 0.7)))
        limb(pts[k], e, 0.04, 0.012, verts, faces, fmat, 0, sides=4, segs=1)
        f2 = e + d * reach * 0.12 + s * -side * 0.25 + Vector((0, 0, rng.uniform(0.1, 0.4)))
        limb(e, f2, 0.015, 0.008, verts, faces, fmat, 0, sides=3, segs=1)
    return mesh_obj(name, verts, faces, fmat, mats, ['DeadWood'], parent, origin=root)


def keyframe_sway(ob, amp_deg, phase, cycles=1, axis_mix=(1.0, 0.6)):
    base = ob.rotation_euler.copy()
    for f in range(1, 122, 10):
        t = (f - 1) / 120.0
        a = math.radians(amp_deg) * math.sin(2 * math.pi * cycles * t + phase)
        b = math.radians(amp_deg) * math.sin(2 * math.pi * cycles * t + phase + 1.3)
        ob.rotation_euler = (base.x + a * axis_mix[0], base.y + b * axis_mix[1], base.z)
        ob.keyframe_insert('rotation_euler', frame=f)
    ob.rotation_euler = base


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.fps = 24; sc.frame_start = 1; sc.frame_end = 120
    rng = random.Random(P['seed'])
    mats = make_mats()
    zc = P['crown_pivot_z']
    # trunk_lower: ground to crown pivot (static)
    v, f, fm = trunk_mesh(0.0, zc, 12, False, rng)
    trunk = mesh_obj('trunk', v, f, fm, mats, ['CedarBark', 'BarkStreak'])
    crown = bpy.data.objects.new('crown_pivot', None); sc.collection.objects.link(crown)
    crown.location = (*trunk_axis(zc).xy, zc)
    v, f, fm = trunk_mesh(zc, P['height'], 8, True, rng)
    mesh_obj('trunk_crown', v, f, fm, mats, ['CedarBark', 'BarkStreak'], crown, origin=(*trunk_axis(zc).xy, zc))
    sprays = []
    for c in P['clumps']:
        par = crown if c[2] > zc else None
        sprays.append(build_clump(c, mats, rng, par))
    for c in P['dead']:
        build_dead(c, mats, rng, crown if c[2] > zc else None)
    # smooth-ish shading on trunk only, flat on foliage
    for ob in sc.objects:
        if ob.type == 'MESH' and ob.name.startswith('trunk'):
            for p in ob.data.polygons:
                p.use_smooth = True
    # animation
    keyframe_sway(crown, P['crown_deg'], 0.0)
    for i, ob in enumerate(sprays):
        keyframe_sway(ob, P['sway_deg'], 0.9 * i, cycles=1 + (i % 2))
    tris = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for ob in sc.objects:
        if ob.type == 'MESH':
            m = ob.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles); ob.evaluated_get(dg).to_mesh_clear()
    print('triangles', tris)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                              export_animation_mode='SCENE', export_anim_scene_split_object=False, export_apply=True)


if __name__ == '__main__':
    main()
