"""Apple tree, charming (storybook toy) twin of models/apple-tree. Replaces simulations/regional-assets-charming/GF-153.glb.
usage: python build.py      writes apple-tree-charming.glb
Z up, metres, origin at the trunk base on the ground, front -Y. One GLB, no variants (group: tree).

The same small orchard apple tree as models/apple-tree (an S-curved twisty trunk, limbs fanning from the top of it, a
wide rounded crown studded with red apples, a grass pad at the foot), pushed towards toy art as the charming hero
draws it: a chubby, soft, rope-twisted trunk with a taller S and a fat root flare; five chunky limbs; the crown broken
into plump, lumpy cloud clumps (smooth shaded) in two greens, with raised cinnamon-roll swirls on the clumps;
fewer but oversized glossy-looking apples, each with a stem and a little leaf; the crown sits a little to the right of
the trunk foot, so the whole tree leans.
The hero is seen from YAW deg off the front towards +X; clump and trunk positions are given in that view's screen
plane (u = screen right, v = depth away from the camera, z up), measured on the hero at 0.00253 m per px (1932 px view).
Materials and roles as models/apple-tree: Bark_Brown, Leaf_Dark, Leaf_Light, Fruit_Red, Grass_Green.
"""
import math, os, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
P = dict(
    seed=11,
    yaw=float(os.environ.get('YAW', 0.0)),                       # hero direction (deg off the front towards +X), same as hero_check.py
    # trunk centreline in hero screen coords (u right, v depth, z up), metres, measured on the hero
    trunk=[(0.02, 0.00, 0.00), (0.16, 0.03, 0.30), (0.26, 0.05, 0.62), (0.16, 0.02, 0.90), (0.00, -0.03, 1.12),
           (-0.15, -0.02, 1.36), (-0.17, 0.02, 1.58), (-0.09, 0.03, 1.80)],
    trunk_r=(0.24, 0.15), flare=0.22, flare_rings=3.0, trunk_sides=9, trunk_rings=12, lobes=3, lobe_amp=0.16, twist=1.3,
    roots=[(200, 0.55), (325, 0.45), (60, 0.42)],   # (azimuth deg, length) of the chubby root toes
    # limbs: (u, v, z) end points from the fork, measured on the hero, plus end radius
    limbs=[(-0.85, -0.05, 2.12, 0.07), (-0.20, -0.10, 2.55, 0.07), (0.40, 0.05, 2.70, 0.07), (0.80, -0.05, 2.20, 0.07),
           (0.05, 0.90, 2.40, 0.065)],
    limb_sides=5, limb_rings=5,
    # clumps: (u, v, z, radius, light?) measured on the hero; the depth (v) ones fill the back and front of the crown
    clumps=[(-1.10, -0.05, 1.82, 0.42, 0), (-1.00, 0.00, 2.52, 0.56, 1), (-0.52, 0.05, 3.28, 0.60, 1),
            (0.55, 0.10, 3.52, 0.64, 1), (0.30, -0.15, 2.92, 0.66, 1), (1.34, 0.00, 2.48, 0.52, 1),
            (1.36, 0.00, 1.95, 0.48, 0), (0.30, 0.00, 2.30, 0.50, 0),
            (0.10, 1.05, 2.85, 0.68, 0), (-0.65, 0.95, 2.30, 0.55, 0), (0.90, 0.90, 2.40, 0.55, 0),
            (-0.50, -1.00, 2.40, 0.55, 1), (0.80, -0.95, 2.30, 0.52, 0), (0.05, 0.30, 3.40, 0.55, 0)],
    clump_squash=0.9, clump_noise=0.05, puff2=[0, 2, 3],   # puff2: clumps that get a second, smaller puff on top
    swirls=8, swirl_r=(0.22, 0.30), swirl_turns=1.25, swirl_seg=8, swirl_w=0.075,
    apples=13, apple_r=(0.15, 0.17), apple_out=0.45, apple_seg=6, apple_rings=4,
    hanging=[(1.40, -0.25, 1.66), (1.05, -0.40, 1.72), (-0.95, -0.40, 1.62), (-1.22, -0.25, 1.66)],
    pad_r=0.62, pad_h=0.04, blades=1,
)
COL = dict(Bark_Brown=(146, 128, 62), Leaf_Dark=(86, 128, 50), Leaf_Light=(126, 168, 78), Fruit_Red=(206, 40, 34),
           Grass_Green=(110, 150, 50))
rng = random.Random(P['seed'])


def lin(c):
    return tuple(((x / 255) / 12.92) if x / 255 <= 0.04045 else (((x / 255) + 0.055) / 1.055) ** 2.4 for x in c)


def material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1); b.inputs['Roughness'].default_value = 0.7
    return m


def obj_from_bm(name, bm, mat, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = smooth            # soft toy look: smooth shading everywhere
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    o.data.materials.append(material(mat))
    return o


def hero_to_world(u, v, z):
    y = math.radians(P['yaw'])
    return Vector((u * math.cos(y) - v * math.sin(y), u * math.sin(y) + v * math.cos(y), z))


def catmull(pts, n):
    pts = [Vector(p) for p in pts]; out = []
    seg = len(pts) - 1
    for i in range(n):
        t = i / (n - 1) * seg; k = min(int(t), seg - 1); f = t - k
        p0 = pts[max(k - 1, 0)]; p1 = pts[k]; p2 = pts[k + 1]; p3 = pts[min(k + 2, seg)]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f ** 3))
    return out


def tube(bm, path, radii, sides, lobes=0, amp=0.0, twist=0.0, cap_top=True, tip=False):
    rings = []; prev_n = Vector((1, 0, 0)) if abs((path[-1] - path[0]).normalized().x) < 0.9 else Vector((0, 1, 0))
    for i, c in enumerate(path):
        t = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        n = (prev_n - t * prev_n.dot(t)).normalized(); b = t.cross(n); prev_n = n
        ring = []
        for s in range(sides):
            a = 2 * math.pi * s / sides
            r = radii[i] * (1 + amp * math.cos(lobes * (a - twist * i / len(path) * 2 * math.pi)))
            ring.append(bm.verts.new(c + (n * math.cos(a) + b * math.sin(a)) * r))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for s in range(sides):
            bm.faces.new((r0[s], r0[(s + 1) % sides], r1[(s + 1) % sides], r1[s]))
    if tip:                              # rounded end: a single apex vertex
        d = (path[-1] - path[-2]).normalized(); apex = bm.verts.new(path[-1] + d * radii[-1])
        for s in range(sides):
            bm.faces.new((rings[-1][s], rings[-1][(s + 1) % sides], apex))
    elif cap_top:
        bm.faces.new(rings[-1])
    return path


def build_bark():
    bm = bmesh.new()
    tp = catmull([hero_to_world(*p) for p in P['trunk']], P['trunk_rings'])
    n = len(tp); r0, r1 = P['trunk_r']
    radii = [r0 + (r1 - r0) * (i / (n - 1)) + P['flare'] * max(0, 1 - i / P['flare_rings']) ** 2 for i in range(n)]
    radii[-1] *= 1.25                     # the fork swells a little where the limbs leave
    tp[0] = tp[0] - Vector((0, 0, 0.02))
    tube(bm, tp, radii, P['trunk_sides'], P['lobes'], P['lobe_amp'], P['twist'])
    # chubby root toes sprawling on the pad
    for (az, L) in P['roots']:
        a = math.radians(az + P['yaw']); d = Vector((math.cos(a), math.sin(a), 0))
        s = tp[0] + d * 0.1 + Vector((0, 0, 0.22)); e = tp[0] + d * (0.12 + L) + Vector((0, 0, 0.03))
        path = catmull([s, s.lerp(e, 0.5) + Vector((0, 0, -0.04)), e], 4)
        tube(bm, path, [0.12, 0.09, 0.065, 0.045], 6, tip=True)
    for v in bm.verts:
        v.co.z = max(v.co.z, 0.0)
    fork = tp[-1]
    for (u, v, z, lr) in P['limbs']:
        e = hero_to_world(u, v, z)
        mid = fork.lerp(e, 0.45) + Vector((0, 0, 0.12 if e.z - fork.z < 0.5 else -0.05))
        path = catmull([fork - Vector((0, 0, 0.12)), mid, e], P['limb_rings'])
        k = len(path)
        tube(bm, path, [0.12 + (lr - 0.12) * i / (k - 1) for i in range(k)], P['limb_sides'], 2, 0.1, 0.4, tip=True)
    return obj_from_bm('trunk', bm, 'Bark_Brown')


def puff(bm, c, rad, squash, noise):
    """A soft cloud puff: a smooth-shaded icosphere, squashed a little, flatter underneath, gently wobbled."""
    g = bmesh.new(); bmesh.ops.create_icosphere(g, subdivisions=2, radius=rad)
    rot = Euler((0, 0, rng.uniform(0, 6.3))).to_matrix()
    for v in g.verts:
        v.co = rot @ v.co; v.co *= 1 + rng.uniform(-noise, noise)
        v.co.z *= squash if v.co.z > 0 else squash * 0.8
        v.co += c
    me = bpy.data.meshes.new('tmp'); g.to_mesh(me); g.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)


def clump_points():
    return [(hero_to_world(u, v, z), r, li) for (u, v, z, r, li) in P['clumps']]


def build_crown():
    dark, light = bmesh.new(), bmesh.new()
    for i, (c, r, li) in enumerate(clump_points()):
        bm = light if li else dark
        puff(bm, c, r, P['clump_squash'], P['clump_noise'])
        if i in P['puff2']:                  # a smaller puff riding on top-outside, so the big clumps are lumpy
            out = Vector((c.x, c.y, 0)).normalized() if c.xy.length > 0.1 else Vector((0, -1, 0))
            puff(bm, c + out * r * 0.45 + Vector((0, -0.25 * r, r * 0.45)), r * 0.6, P['clump_squash'], P['clump_noise'])
    return [obj_from_bm('crown_dark', dark, 'Leaf_Dark'), obj_from_bm('crown_light', light, 'Leaf_Light')]


def surface_spots(n, salt, zlo=-0.6):
    """n points on the outer (visible) side of the clumps: (point, outward normal, clump colour)."""
    cl = clump_points(); centre = sum((c for c, r, l in cl), Vector()) / len(cl)
    out = []; tries = 0
    while len(out) < n and tries < n * 200:
        tries += 1
        c, r, li = cl[rng.randrange(len(cl))]
        d = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(zlo, 1))).normalized()
        p = c + d * r * 0.95
        if (p - centre).normalized().dot(d) < 0.15:     # skip spots facing into the crown
            continue
        if any((p - c2).length < r2 * 0.92 for c2, r2, l2 in cl if (c2 - c).length > 1e-6):   # buried under a neighbour
            continue
        if any((p - o[0]).length < 0.36 for o in out):
            continue
        out.append((p, d, li, c, r))
    return out


def swirl(bm, p, nrm, R, cc, cr):
    """A raised cinnamon-roll swirl hugging the clump surface (projected onto its sphere): a spiral ridge."""
    t1 = nrm.cross(Vector((0, 0, 1)) if abs(nrm.z) < 0.9 else Vector((1, 0, 0))).normalized(); t2 = nrm.cross(t1)
    m = P['swirl_seg']; w = P['swirl_w']; a0 = rng.uniform(0, 6.3)
    prev = None
    for i in range(m + 1):
        f = i / m; a = a0 + f * P['swirl_turns'] * 2 * math.pi; rr = R * (0.15 + 0.85 * f)
        ctr = p + (t1 * math.cos(a) + t2 * math.sin(a)) * rr
        nl = (ctr - cc).normalized(); ctr = cc + nl * cr * 0.97; nrm = nl
        rad = (t1 * math.cos(a) + t2 * math.sin(a))
        ww = w * (0.5 + 0.5 * f)
        h = 0.09 * (0.4 + 0.6 * f)
        vs = (bm.verts.new(ctr - rad * ww - nrm * 0.02), bm.verts.new(ctr + nrm * h), bm.verts.new(ctr + rad * ww - nrm * 0.02))
        if prev:
            bm.faces.new((prev[0], vs[0], vs[1], prev[1])); bm.faces.new((prev[1], vs[1], vs[2], prev[2]))
        prev = vs


def build_swirls():
    dark, light = bmesh.new(), bmesh.new()
    for (p, d, li, c, r) in surface_spots(P['swirls'], 1, 0.25):
        swirl(dark if li else light, p, d, rng.uniform(*P['swirl_r']), c, r * P['clump_squash'] ** 0.5)      # contrasting green on each clump
    return [obj_from_bm('swirls_dark', dark, 'Leaf_Dark'), obj_from_bm('swirls_light', light, 'Leaf_Light')]


def apple(bm, stems, leaves, c, r, up=Vector((0, 0, 1)), leafy=True):
    """A plump toy apple: squat UV sphere with a dimpled top, a stubby stem and (some) a little leaf."""
    seg, rings = P['apple_seg'], P['apple_rings']
    rot = up.to_track_quat('Z', 'Y').to_matrix() @ Matrix.Rotation(rng.uniform(0, 6.3), 3, 'Z')
    top = bm.verts.new(c + rot @ Vector((0, 0, r * 0.62))); bot = bm.verts.new(c + rot @ Vector((0, 0, -r * 0.82)))
    rs = []
    for j in range(1, rings):
        th = math.pi * j / rings; ring = []
        for s in range(seg):
            a = 2 * math.pi * s / seg
            rr = r * math.sin(th) * (1.08 if j == 1 else 1.0) * (0.92 if j == rings - 1 else 1.0)
            ring.append(bm.verts.new(c + rot @ Vector((rr * math.cos(a), rr * math.sin(a), r * math.cos(th) * 0.92))))
        rs.append(ring)
    for s in range(seg):
        bm.faces.new((top, rs[0][s], rs[0][(s + 1) % seg])); bm.faces.new((bot, rs[-1][(s + 1) % seg], rs[-1][s]))
    for r0, r1 in zip(rs, rs[1:]):
        for s in range(seg):
            bm.faces.new((r0[s], r1[s], r1[(s + 1) % seg], r0[(s + 1) % seg]))
    s0 = c + rot @ Vector((0, 0, r * 0.55)); s1 = c + rot @ Vector((0.03, 0, r * 1.05))
    tube(stems, [s0, s1], [0.018, 0.014], 3, cap_top=False)
    if leafy:
        b = s1 - rot @ Vector((0, 0, 0.02)); d = (rot @ Vector((1, 0.3, 0.35))).normalized(); side = d.cross(rot @ Vector((0, 0, 1))).normalized()
        L, W = r * 0.95, r * 0.5
        vs = [leaves.verts.new(b), leaves.verts.new(b + d * L * 0.45 + side * W / 2), leaves.verts.new(b + d * L),
              leaves.verts.new(b + d * L * 0.45 - side * W / 2), leaves.verts.new(b + d * L * 0.5 + rot @ Vector((0, 0, 0.025)))]
        for f in ((0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)):
            leaves.faces.new([vs[i] for i in f])


def build_apples():
    bm = bmesh.new(); stems = bmesh.new(); leaves = bmesh.new()
    for i, (p, d, li, c, cr) in enumerate(surface_spots(P['apples'], 2)):
        r = rng.uniform(*P['apple_r']); apple(bm, stems, leaves, p + d * r * P['apple_out'], r, (d * 0.3 + Vector((0, 0, 1))).normalized(), i % 3 == 0)
    for (u, v, z) in P['hanging']:
        c = hero_to_world(u, v, z); r = 0.15
        apple(bm, stems, leaves, c, r, Vector((0, 0, 1)), True)
        tube(stems, [c + Vector((0, 0, r)), c + Vector((0, 0, r + 0.2))], [0.02, 0.02], 3, cap_top=False)
    return [obj_from_bm('apples', bm, 'Fruit_Red'), obj_from_bm('apple_stems', stems, 'Bark_Brown', False),
            obj_from_bm('apple_leaves', leaves, 'Leaf_Dark', False)]


def build_grass():
    bm = bmesh.new(); k = 12; R = P['pad_r']
    top = [bm.verts.new((R * (0.95 + 0.1 * rng.random()) * math.cos(2 * math.pi * i / k),
                         R * (0.95 + 0.1 * rng.random()) * math.sin(2 * math.pi * i / k), P['pad_h'])) for i in range(k)]
    bot = [bm.verts.new((v.co.x * 1.06, v.co.y * 1.06, 0)) for v in top]
    bm.faces.new(top)
    for i in range(k):
        bm.faces.new((bot[i], bot[(i + 1) % k], top[(i + 1) % k], top[i]))
    # a fat little two-leaf sprout at the foot (the hero's friendly detail), plus a few blades
    base = hero_to_world(0.42, -0.25, P['pad_h'])
    for ang, tilt in ((0.4, 0.9), (2.3, 0.7)):
        d = Vector((math.cos(ang) * tilt, math.sin(ang) * tilt, 1)).normalized(); side = d.cross(Vector((0, 0, 1))).normalized()
        L, W = 0.2, 0.11
        vs = [bm.verts.new(base), bm.verts.new(base + d * L * 0.5 + side * W / 2), bm.verts.new(base + d * L),
              bm.verts.new(base + d * L * 0.5 - side * W / 2)]
        bm.faces.new((vs[0], vs[1], vs[2])); bm.faces.new((vs[0], vs[2], vs[3]))
    for i in range(P['blades']):
        a = rng.uniform(0, 6.3); r = rng.uniform(0.35, R * 0.95); c = Vector((r * math.cos(a), r * math.sin(a), P['pad_h']))
        t = Vector((rng.uniform(-.04, .04), rng.uniform(-.04, .04), rng.uniform(0.07, 0.12)))
        s = Vector((math.cos(a + 1.6), math.sin(a + 1.6), 0)) * 0.03
        bm.faces.new((bm.verts.new(c - s), bm.verts.new(c + s), bm.verts.new(c + t)))
    return obj_from_bm('grass', bm, 'Grass_Green', False)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = [build_bark(), *build_crown(), *build_swirls(), *build_apples(), build_grass()]
    tris = 0
    for o in objs:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
        print('  ', o.name, len(o.data.loop_triangles))
    print('triangles', tris)
    out = os.path.join(HERE, 'apple-tree-charming.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False, export_apply=True)


if __name__ == '__main__':
    main()
