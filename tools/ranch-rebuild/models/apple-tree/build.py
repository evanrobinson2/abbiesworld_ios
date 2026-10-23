"""Apple tree (orchard tree) for the Ranch tile.  usage: python build.py
Z up, metres, origin at the trunk base on the ground, front -Y. One GLB, no variants (group: tree).
The hero is seen from YAW deg off the front towards +X; the trunk's S-curve is laid out in that view's screen plane
(u = screen right, v = depth away from the camera) so it reads in the hero, and given a depth spiral so it twists.
"""
import math, os, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler

HERE = os.path.dirname(os.path.abspath(__file__))
P = dict(
    seed=7,
    yaw=float(os.environ.get('YAW', 0.0)),                       # hero direction (deg off the front towards +X), same as hero_check.py
    # trunk centreline in hero screen coords (u right, v depth, z up), metres, measured on the hero
    trunk=[(0.02, 0.00, 0.00), (-0.14, 0.10, 0.20), (-0.15, 0.14, 0.42), (0.08, 0.08, 0.62), (0.32, -0.04, 0.80),
           (0.46, -0.08, 0.96), (0.40, 0.00, 1.10), (0.25, 0.07, 1.25), (0.07, 0.05, 1.38), (0.00, 0.00, 1.50)],
    trunk_r=(0.17, 0.12), flare=0.10, trunk_sides=9, trunk_rings=13, lobes=3, lobe_amp=0.22, twist=1.6,
    # limbs: (start index along trunk 0..1, azimuth deg, end radius, end z, end radius m, bend)
    limbs=[(0.93, 195, 1.05, 1.95, 0.085), (0.97, 320, 0.95, 2.10, 0.08), (1.0, 95, 0.90, 2.15, 0.08),
           (0.80, 25, 1.15, 1.80, 0.075)],
    limb_sides=6, limb_rings=7,
    # crown outline (r, z) from top to underside, measured on the hero mask minus the leaf-tip fringe
    outline=[(0.0, 3.86), (0.75, 3.60), (1.12, 3.30), (1.32, 3.00), (1.48, 2.70), (1.62, 2.36), (1.66, 2.05),
             (1.55, 1.80), (1.32, 1.62), (0.95, 1.58), (0.45, 1.66)],
    blobs=32, blob_r=(0.36, 0.46), blob_in=1.0, blob_noise=0.12, blob_light=0.35, blob_sub=1,
    inner_blobs=[(0, 0, 2.65, 1.15), (0.0, 0.0, 2.25, 1.0)],
    leaves=330, leaf_len=(0.26, 0.34), leaf_w=0.15, leaf_out=0.07, leaf_light=0.6,
    apples=46, apple_r=(0.13, 0.16), apple_out=0.0,
    hanging=[(38, 1.38, 1.02), (26, 1.30, 1.14), (52, 1.42, 1.16), (40, 1.20, 1.22), (14, 1.40, 1.28), (205, 1.40, 1.40)],
    pad_r=0.40, pad_h=0.04, blades=12,
)
COL = dict(Bark_Brown=(150, 106, 55), Leaf_Dark=(58, 90, 26), Leaf_Light=(96, 132, 42), Fruit_Red=(196, 52, 30),
           Grass_Green=(95, 128, 40))
rng = random.Random(P['seed'])


def lin(c):
    return tuple(((x / 255) / 12.92) if x / 255 <= 0.04045 else (((x / 255) + 0.055) / 1.055) ** 2.4 for x in c)


def material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1); b.inputs['Roughness'].default_value = 0.8
    return m


def obj_from_bm(name, bm, mat):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = False
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


def tube(bm, path, radii, sides, lobes=0, amp=0.0, twist=0.0, cap_top=True):
    rings = []; prev_n = Vector((1, 0, 0))
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
    if cap_top:
        bm.faces.new(rings[-1])
    return path


def build_bark():
    bm = bmesh.new()
    tp = catmull([hero_to_world(*p) for p in P['trunk']], P['trunk_rings'])
    n = len(tp); r0, r1 = P['trunk_r']
    radii = [r0 + (r1 - r0) * (i / (n - 1)) + P['flare'] * max(0, 1 - i / 2.5) for i in range(n)]
    tp[0] = tp[0] - Vector((0, 0, 0.02))
    tube(bm, tp, radii, P['trunk_sides'], P['lobes'], P['lobe_amp'], P['twist'])
    for v in bm.verts:
        v.co.z = max(v.co.z, 0.0)
    for (f, az, rr, z, lr) in P['limbs']:
        s = tp[min(n - 1, int(f * (n - 1)))].copy()
        a = math.radians(az + P['yaw'] - 40)       # limb and hanging azimuths are given for yaw 40
        e = Vector((rr * math.cos(a), rr * math.sin(a), z))
        mid = s.lerp(e, 0.5) + Vector((0, 0, -0.12)) + Vector((-math.sin(a), math.cos(a), 0)) * 0.12
        path = catmull([s - Vector((0, 0, 0.08)), mid, e], P['limb_rings'])
        k = len(path)
        tube(bm, path, [lr * (1 - 0.5 * i / (k - 1)) for i in range(k)], P['limb_sides'], 2, 0.12, 0.5)
    return obj_from_bm('trunk', bm, 'Bark_Brown')


def outline_samples(n):
    """Points spread evenly by area over the crown's surface of revolution: (r, z, outward normal 2D)."""
    ol = P['outline']; segs = []
    for (r0, z0), (r1, z1) in zip(ol, ol[1:]):
        L = math.hypot(r1 - r0, z1 - z0); segs.append((r0, z0, r1, z1, L, L * (r0 + r1) / 2))
    tot = sum(s[5] for s in segs); out = []
    for i in range(n):
        target = (i + 0.5) / n * tot
        for (r0, z0, r1, z1, L, A) in segs:
            if target <= A:
                f = target / A; r = r0 + (r1 - r0) * f; z = z0 + (z1 - z0) * f
                nr, nz = (z0 - z1), (r1 - r0)          # outward normal of the outline (clockwise from the top)
                l = math.hypot(nr, nz); out.append((r, z, nr / l, nz / l)); break
            target -= A
        else:
            out.append((ol[-1][0], ol[-1][1], 0, -1))
    return out


GOLD = math.pi * (3 - math.sqrt(5))


def surface_point(s, i, jitter=0.0):
    r, z, nr, nz = s; a = i * GOLD + rng.uniform(-jitter, jitter)
    p = Vector((r * math.cos(a), r * math.sin(a), z)); nrm = Vector((nr * math.cos(a), nr * math.sin(a), nz)).normalized()
    return p, nrm


def blob(bm, c, rad, noise, sub=2):
    g = bmesh.new(); bmesh.ops.create_icosphere(g, subdivisions=sub, radius=rad)
    for v in g.verts:
        v.co *= 1 + rng.uniform(-noise, noise)
        v.co.z *= 0.85
        v.co += c
    me = bpy.data.meshes.new('tmp'); g.to_mesh(me); g.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)


def build_crown():
    dark, light = bmesh.new(), bmesh.new()
    for i, s in enumerate(outline_samples(P['blobs'])):
        rad = rng.uniform(*P['blob_r']); p, n = surface_point(s, i, 0.3)
        blob(light if rng.random() < P['blob_light'] else dark, p - n * rad * P['blob_in'], rad, P['blob_noise'], P['blob_sub'])
    for (x, y, z, r) in P['inner_blobs']:
        blob(dark, Vector((x, y, z)), r, 0.08, 1)
    return [obj_from_bm('crown_dark', dark, 'Leaf_Dark'), obj_from_bm('crown_light', light, 'Leaf_Light')]


def leaf(bm, base, d, side, L, W):
    up = d.cross(side).normalized()
    tip = base + d * L; mid = base + d * (L * 0.45)
    vs = [bm.verts.new(base), bm.verts.new(mid + side * W / 2 - up * 0.02), bm.verts.new(tip), bm.verts.new(mid - side * W / 2 - up * 0.02)]
    bm.faces.new((vs[0], vs[1], vs[2])); bm.faces.new((vs[0], vs[2], vs[3]))


def build_leaves():
    dark, light = bmesh.new(), bmesh.new()
    for i, s in enumerate(outline_samples(P['leaves'])):
        p, n = surface_point(s, i + 3, 0.6)
        t = n.cross(Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))).normalized()
        d = (n * 0.75 + t + Vector((0, 0, 0.25))).normalized()        # leaning out of the surface, a little upward
        side = d.cross(n).normalized() if abs(d.dot(n)) < 0.99 else d.cross(Vector((0, 0, 1))).normalized()
        leaf(light if rng.random() < P['leaf_light'] else dark, p - n * P['leaf_out'], d, side, rng.uniform(*P['leaf_len']), P['leaf_w'])
    return [obj_from_bm('leaves_dark', dark, 'Leaf_Dark'), obj_from_bm('leaves_light', light, 'Leaf_Light')]


def apple(bm, c, r):
    g = bmesh.new(); bmesh.ops.create_icosphere(g, subdivisions=1, radius=r)
    rot = Euler((rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3))).to_matrix()
    for v in g.verts:
        v.co = rot @ v.co; v.co.z *= 0.9; v.co += c
    me = bpy.data.meshes.new('tmp'); g.to_mesh(me); g.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)


def build_apples():
    bm = bmesh.new(); stems = bmesh.new()
    for i, s in enumerate(outline_samples(P['apples'])):
        p, n = surface_point(s, i + 11, 0.4)
        r = rng.uniform(*P['apple_r']); apple(bm, p + n * (P['apple_out'] - r * 0.3), r)
    for (az, rr, z) in P['hanging']:
        a = math.radians(az + P['yaw'] - 40); c = Vector((rr * math.cos(a), rr * math.sin(a), z)); r = 0.13
        apple(bm, c, r)
        top = c + Vector((0, 0, r * 0.8)); hang = top + Vector((0, 0, 0.22))
        tube(stems, [top, hang], [0.018, 0.018], 3, cap_top=False)
    return [obj_from_bm('apples', bm, 'Fruit_Red'), obj_from_bm('apple_stems', stems, 'Bark_Brown')]


def build_grass():
    bm = bmesh.new(); k = 9; R = P['pad_r']
    top = [bm.verts.new((R * (0.85 + 0.25 * rng.random()) * math.cos(2 * math.pi * i / k),
                         R * (0.85 + 0.25 * rng.random()) * math.sin(2 * math.pi * i / k), P['pad_h'])) for i in range(k)]
    bot = [bm.verts.new((v.co.x * 1.1, v.co.y * 1.1, 0)) for v in top]
    bm.faces.new(top)
    for i in range(k):
        bm.faces.new((bot[i], bot[(i + 1) % k], top[(i + 1) % k], top[i]))
    for i in range(P['blades']):
        a = rng.uniform(0, 6.3); r = rng.uniform(0.15, R); c = Vector((r * math.cos(a), r * math.sin(a), P['pad_h']))
        t = Vector((rng.uniform(-.05, .05), rng.uniform(-.05, .05), rng.uniform(0.08, 0.14)))
        s = Vector((math.cos(a + 1.6), math.sin(a + 1.6), 0)) * 0.035
        bm.faces.new((bm.verts.new(c - s), bm.verts.new(c + s), bm.verts.new(c + t)))
    return obj_from_bm('grass', bm, 'Grass_Green')


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    objs = [build_bark(), *build_crown(), *build_leaves(), *build_apples(), build_grass()]
    tris = 0
    for o in objs:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    print('triangles', tris)
    out = os.path.join(HERE, 'apple-tree.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False, export_apply=True)


if __name__ == '__main__':
    main()
