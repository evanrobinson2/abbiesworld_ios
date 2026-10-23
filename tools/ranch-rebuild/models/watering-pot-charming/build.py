"""Watering pot, CHARMING version (storybook toy; drop-in for watering-pot, replaces garden-assets/GF-074.glb).
Chubby: a big low ellipsoid belly on a small flat base, a fat two-band collar with a rolled lip, a short fat spout
with a big rolled mouth, a chunky ear handle, glossier glaze, and a little sideways lean.
Normal version described below for reference:
A lathe-turned, nearly spherical glazed terracotta pot on a stepped foot ring, a short neck with a thick rolled lip
around an open top, a long tapering spout leaving the lower front and rising to a small flared rose, and a big round
loop handle from the rim arching high over the back into the back of the body.
Z up, metres, origin at the centre of the base on the ground, spout pointing -Y.  usage: python build.py"""
import os, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'watering-pot-charming.glb')

P = dict(
    seg=18,                      # lathe segments round the pot
    # chubby belly: an ellipsoid sat on a small flat base (no foot ring), widest low down like a toy
    base_r=0.072,                # flat contact disc
    body_r=0.133, body_z=0.106, body_rv=0.128,
    pear=0.0,                    # widen low, narrow high: a squat, bottom-heavy toy belly   # belly radius, centre height, vertical radius
    belly_rings=10,
    shoulder=(0.084, 0.222),     # where the belly turns in to the collar
    # fat collar: a lower band, a groove, then a thick rolled lip around a wide open top (r, z), outside to inside
    lip=[(0.076, 0.226), (0.078, 0.236), (0.075, 0.243), (0.072, 0.246), (0.079, 0.251), (0.081, 0.259),
         (0.077, 0.266), (0.068, 0.268), (0.063, 0.262)],
    inner=[(0.061, 0.240), (0.0, 0.228)],                                     # the inside wall down to a floor
    jitter=0.0004,               # hand-made wobble on the vertices
    # spout: shorter and fatter than the normal pot, leaving the upper belly at ~47 deg; (y, z, radius)
    spout=[(-0.055, 0.136, 0.052), (-0.094, 0.163, 0.039), (-0.131, 0.214, 0.024), (-0.165, 0.258, 0.017),
           (-0.186, 0.281, 0.016)],
    spout_sides=10, spout_steps=8,
    mouth_len=0.016, mouth_r=0.025,   # a big rolled mouth instead of a flared rose
    # handle: a chunky ear from the back of the lip, up, over and down into the back of the belly (y, z)
    handle=[(0.048, 0.252), (0.071, 0.277), (0.102, 0.294), (0.135, 0.293), (0.160, 0.273), (0.172, 0.234),
            (0.167, 0.190), (0.149, 0.152), (0.126, 0.122)],
    handle_r=0.0165, handle_r_end=0.0200,  # a touch fatter where it meets the pot
    handle_sides=10, handle_steps=16,
    colour=(190, 82, 28),        # sRGB, sampled from the hero's lit belly
    rough=0.40,                  # glossier glaze than the normal pot (the hero is shiny)
    lean_deg=4.0,                # playful sideways lean (shear in x with height, base stays flat on the ground)
    xy_scale=1.0,
    z_scale=1.0,                 # squat the whole pot (chubbier)
    crease_deg=38,               # lathe edges sharper than this stay crisp
    smooth=True,                 # soft toy shading (the normal pot is flat-shaded and faceted)
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
        p.use_smooth = P['smooth']
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def profile():
    """flat base ring, then the belly ellipsoid sampled evenly by angle from the base up to where it is as narrow as
    the shoulder, then the collar and lip"""
    R, c, rv = P['body_r'], P['body_z'], P['body_rv']
    a0 = -math.acos(min(1.0, P['base_r'] / R))            # angle where the ellipsoid is base-wide (below the equator)
    a1 = math.acos(min(1.0, P['shoulder'][0] / R))        # angle where it is shoulder-wide (above the equator)
    pts = [(P['base_r'], 0.0)]
    n = P['belly_rings']
    for i in range(n + 1):
        t = a0 + (a1 - a0) * i / n
        pts.append((R * math.cos(t), c + rv * math.sin(t)))
    pts[1] = (pts[1][0], max(pts[1][1], 0.004))
    pts.append(P['shoulder'])
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
    # flat bottom cap
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
    crease(bm)
    return bm


def crease(bm):
    """split edges whose faces meet sharper than crease_deg, so smooth shading keeps the bands and lip crisp"""
    lim = math.radians(P['crease_deg'])
    sharp = [e for e in bm.edges if len(e.link_faces) == 2 and e.link_faces[0].normal.angle(e.link_faces[1].normal, 0) > lim]
    if sharp:
        bmesh.ops.split_edges(bm, edges=sharp)


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
    # big rolled mouth: swell out to a fat ring, round over the top, then dip inside (the hole)
    t = (path[-1] - path[-2]).normalized()
    tip = path[-1]; L, R = P['mouth_len'], P['mouth_r']
    mouth = [tip, tip + t * L * 0.35, tip + t * L * 0.8, tip + t * L, tip + t * L * 0.85, tip + t * L * 0.3]
    rr = [rt, R * 0.92, R, R * 0.82, R * 0.6, R * 0.5]
    tube(bm, mouth, rr, sides, cap0=False, cap1=True)
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
    n = len(path) - 1
    rad = [P['handle_r'] + (P['handle_r_end'] - P['handle_r']) * max(0.0, abs(2 * i / n - 1) - 0.6) / 0.4 for i in range(n + 1)]
    tube(bm, path, rad, P['handle_sides'], rnd=random.Random(5), wob=0.03)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    m = material()
    obj('pot_body', lathe(), m)
    obj('spout', spout(), m)
    obj('handle', handle(), m)
    for o in bpy.context.scene.objects:
        o.data.transform(Matrix.Diagonal((P['xy_scale'], P['xy_scale'], P['z_scale'], 1)))
        sh = Matrix.Identity(4); sh[0][2] = math.tan(math.radians(P['lean_deg']))   # x += z * tan(lean)
        o.data.transform(sh)
    tris = sum(len(p.vertices) - 2 for o in bpy.context.scene.objects for p in o.data.polygons)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=False, export_apply=True)
    print('triangles', tris)


if __name__ == '__main__':
    build()
