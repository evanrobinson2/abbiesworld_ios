"""Watering pot (Ranch garden prop, replaces garden-assets/GF-074.glb).
A lathe-turned, nearly spherical glazed terracotta pot on a stepped foot ring, a short neck with a thick rolled lip
around an open top, a long tapering spout leaving the lower front and rising to a small flared rose, and a big round
loop handle from the rim arching high over the back into the back of the body.
Z up, metres, origin at the centre of the base on the ground, spout pointing -Y.  usage: python build.py"""
import os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'watering-pot.glb')

P = dict(
    seg=16,                      # lathe segments round the pot
    body_r=0.114, body_z=0.128,  # the near-spherical belly: radius and centre height
    body_squash=0.96,            # vertical radius / horizontal radius
    foot=[(0.069, 0.000), (0.073, 0.004), (0.073, 0.013), (0.068, 0.018),     # lower foot step (r, z)
          (0.062, 0.020), (0.063, 0.028), (0.059, 0.034)],                   # upper step, then into the belly
    neck_r=0.064, neck_z=0.212,  # where the belly meets the neck
    lip=[(0.072, 0.214), (0.079, 0.224), (0.074, 0.235),                      # rolled lip, outside to inside
         (0.064, 0.236), (0.059, 0.229)],
    inner=[(0.057, 0.215), (0.0, 0.205)],                                     # the inside wall down to a floor
    jitter=0.0012,               # hand-made wobble on the vertices (faceted glaze look)
    # spout: centreline (y, z, radius) from inside the belly to the rose, Catmull-Rom smoothed; measured off the hero
    spout=[(-0.072, 0.082, 0.04), (-0.1, 0.093, 0.036), (-0.139, 0.137, 0.026), (-0.172, 0.176, 0.019), (-0.215, 0.206, 0.013), (-0.255, 0.237, 0.011)],
    spout_sides=8, spout_steps=9,
    rose_len=0.012, rose_r=0.016,
    # handle: a thick round tube through these (y, z) points (x = 0), Catmull-Rom smoothed
    handle=[(-0.043, 0.205), (-0.045, 0.24), (-0.04, 0.274), (-0.016, 0.311), (0.007, 0.34), (0.037, 0.353), (0.076, 0.346), (0.113, 0.311), (0.133, 0.251), (0.124, 0.198), (0.108, 0.16), (0.095, 0.129)],
    handle_r=0.0125, handle_sides=8, handle_steps=16,
    colour=(178, 80, 24),        # sRGB, sampled from the hero's lit belly
    rough=0.55,
    xy_scale=1.08,               # the hero pot is a touch wider than it is tall: stretch the plan, keep the height
)


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material():
    m = bpy.data.materials.new('Clay_Glaze'); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*[lin(c) for c in P['colour']], 1)
    b.inputs['Roughness'].default_value = P['rough']
    return m


def obj(name, bm, mat):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = False
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def profile():
    pts = list(P['foot'])
    R, c, sq = P['body_r'], P['body_z'], P['body_squash']
    z0, z1 = pts[-1][1] + 0.008, P['neck_z'] - 0.004
    n = 7
    for i in range(n):
        z = z0 + (z1 - z0) * i / (n - 1)
        r = math.sqrt(max(0.0, R * R - ((z - c) / sq) ** 2))
        pts.append((max(r, P['neck_r']), z))
    pts.append((P['neck_r'], P['neck_z']))
    return pts + P['lip'] + P['inner']


def lathe():
    rnd = random.Random(7)
    bm = bmesh.new(); prof = profile(); seg = P['seg']
    rings = []
    for (r, z) in prof:
        ring = []
        if r < 1e-6:
            ring = [bm.verts.new((0, 0, z))] * seg
        else:
            for k in range(seg):
                a = 2 * math.pi * (k + 0.5) / seg
                j = P['jitter'] * (rnd.random() * 2 - 1)
                ring.append(bm.verts.new(((r + j) * math.cos(a), (r + j) * math.sin(a), z + 0.6 * j)))
        rings.append(ring)
    # bottom cap
    bm.faces.new(list(reversed(rings[0])))
    for a, b in zip(rings, rings[1:]):
        for k in range(seg):
            k2 = (k + 1) % seg
            q = [a[k], a[k2], b[k2], b[k]]
            q = [v for i, v in enumerate(q) if v not in q[:i]]
            if len(q) >= 3:
                bm.faces.new(q)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def frames(path):
    """parallel-transport frames along a polyline"""
    T = [(path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized() for i in range(len(path))]
    up = Vector((1, 0, 0))
    N = [(up - up.dot(T[0]) * T[0]).normalized()]
    for i in range(1, len(path)):
        n = N[-1] - N[-1].dot(T[i]) * T[i]
        N.append(n.normalized())
    return T, N


def tube(bm, path, radii, sides, cap0=True, cap1=True, rnd=None, wob=0.06):
    T, N = frames(path)
    rings = []
    for p, t, n, r in zip(path, T, N, radii):
        b = t.cross(n)
        ring = []
        for k in range(sides):
            a = 2 * math.pi * k / sides
            j = 1 + (wob * (rnd.random() * 2 - 1) if rnd else 0)
            ring.append(bm.verts.new(p + (n * math.cos(a) + b * math.sin(a)) * r * j))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for k in range(sides):
            bm.faces.new([a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k]])
    if cap0:
        bm.faces.new(list(reversed(rings[0])))
    if cap1:
        bm.faces.new(rings[-1])
    return rings


def bez(pts, t):
    p = [Vector((0, y, z)) for y, z in pts]
    u = 1 - t
    return p[0] * u ** 3 + p[1] * 3 * u * u * t + p[2] * 3 * u * t * t + p[3] * t ** 3


def spout():
    bm = bmesh.new(); n = P['spout_steps']
    path = catmull([(y, z) for y, z, r in P['spout']], n)
    rad = catmull([(0, r) for y, z, r in P['spout']], n)
    radii = [v.z for v in rad]; rt = radii[-1]
    sides = P['spout_sides']
    tube(bm, path, radii, sides, cap0=True, cap1=False, rnd=random.Random(3))
    # flared rose: a short cone from the tip, a lip ring, then a recessed face (the hole)
    t = (path[-1] - path[-2]).normalized()
    tip = path[-1]
    rose = [tip, tip + t * P['rose_len'] * 0.6, tip + t * P['rose_len'], tip + t * P['rose_len'] * 0.7]
    rr = [rt, P['rose_r'], P['rose_r'] * 0.92, P['rose_r'] * 0.55]
    tube(bm, rose, rr, sides, cap0=False, cap1=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def catmull(pts, steps):
    p = [Vector((0, y, z)) for y, z in pts]
    p = [p[0] * 2 - p[1]] + p + [p[-1] * 2 - p[-2]]
    segs = len(p) - 3; out = []
    for i in range(steps + 1):
        s = i / steps * segs; k = min(int(s), segs - 1); t = s - k
        p0, p1, p2, p3 = p[k:k + 4]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return out


def handle():
    bm = bmesh.new()
    path = catmull(P['handle'], P['handle_steps'])
    tube(bm, path, [P['handle_r']] * len(path), P['handle_sides'], rnd=random.Random(5), wob=0.03)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    m = material()
    obj('pot_body', lathe(), m)
    obj('spout', spout(), m)
    obj('handle', handle(), m)
    for o in bpy.context.scene.objects:
        o.data.transform(Matrix.Diagonal((P['xy_scale'], P['xy_scale'], 1, 1)))
    tris = sum(len(p.vertices) - 2 for o in bpy.context.scene.objects for p in o.data.polygons)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=False, export_apply=True)
    print('triangles', tris)


if __name__ == '__main__':
    build()
