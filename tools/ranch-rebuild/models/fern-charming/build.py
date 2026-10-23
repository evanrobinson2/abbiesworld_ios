"""Fern, charming (storybook-toy twin of models/fern; Ranch tile woodland ground cover, installs as the charming
WW-046.glb): a bouncy fern clump of a few fat fronds with plump, separate pillow-shaped leaflets. One big frond rises
and curls over to the left, one leans up and out to the right, the rest arch out and flop their tips to the ground,
over a ruffled dark rosette of little leaves at the foot.

usage: python build.py      writes fern-charming.glb
Same conventions as models/fern: Z up, metres, origin at the footprint centre on the ground, front (the hero's view)
faces -Y, no variants (plant group), the same four materials (Leaf_Fern, Leaf_FernLight, Leaf_FernDark, Stem_Green),
the same width x depth box as the old WW-046.glb.
Each frond is a rachis on a smooth arc (a fat tapered Stem_Green strip) carrying pairs of separate leaflets. A leaflet
is a 6-sided oval with its centre puffed up off the blade plane (a pillow), angled towards the frond tip and drooping a
little at its end; the frond ends in a single tip leaflet. The whole clump leans a few degrees to the right.
The clump is finally scaled to TARGET, since to_game.py copies GLBs without rescaling.
"""
import os, math, random, json
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    'TARGET': (0.85, 0.87, 0.74),   # old WW-046.glb width x depth; height from the charming hero's w/h (1.14)
    # fronds, fitted to the hero (front view): (azimuth deg (0 = towards the camera, +90 = right), base elevation deg,
    #   tip angle deg (neg = down), length, leaflet scale, light?, arc power). The direction angle falls from base to
    #   tip with s^power (higher = straighter base, sharper fall at the end). Centre frond ~1 tall in build units.
    'FRONDS': [
        (-60, 90, -100, 1.40, 1.00, 0, 3.0),   # big left arch: rises tall, curls over to the left
        (30, 90, 10, 1.10, 0.85, 1, 2.5),      # upright right frond, leaning out
        (-67, 89, -80, 0.95, 1.00, 0, 2.5),    # left mid arch
        (-95, 69, -104, 0.75, 0.95, 0, 1.6),    # left low frond, tip to the ground
        (80, 84, -60, 0.90, 1.00, 1, 2.0),     # right mid frond, reaches far out
        (100, 77, -108, 0.75, 0.95, 1, 1.6),   # right low frond, flops to the ground
        (188, 75, -28, 0.90, 1.00, 0, 2.0),    # back frond: mass behind the centre
        (-15, 70, -60, 0.70, 0.95, 1, 1.5),    # front frond towards the camera
    ],
    'STIPE': 0.14,              # bare stalk share of the frond length
    'N_PAIRS': 7,               # leaflet pairs per frond (plus one tip leaflet)
    'LEAF_LEN': 0.24,           # leaflet length (x frond length) at the base of the blade
    'LEAF_W': 0.55,             # leaflet width / length: plump ovals
    'LEAF_TAPER': 0.6,          # leaflets shrink to (1 - taper) at the tip
    'LEAF_FWD': 40,             # leaflets angle towards the frond tip (deg)
    'LEAF_ROT': 30,             # rim sampling offset (deg): 0 gives pointed diamonds, 30 blunt pillow ovals
    'GRAVITY': 0.4,             # leaflet directions bend down by this much (they hang a little)
    'PUFF': 0.30,               # pillow: centre raised off the blade plane (x leaflet width)
    'DROOP': 0.18,              # leaflet ends sag below the blade plane (x leaflet length)
    'FACE': 0.6,                # 0: blades lie face-up, 1: blades face the front (-Y) like the hero's fan
    'ROLL': 14,                 # random blade roll (deg)
    'BASE_R': 0.05,             # crown radius where fronds leave the ground
    'JITTER': (5, 4, 0.05),     # azimuth deg, elevation deg, length share
    'RACHIS_W': 0.024, 'RACHIS_N': 6,
    'LEAN': 3,                  # whole clump leans this many degrees to the right (+X)
    # crown: a ruffle of small dark leaflets lying low around the foot, plus a low faceted mound
    'CROWN_N': 14, 'CROWN_LEN': 0.38, 'CROWN_R': 0.10, 'CROWN_ELEV': 6, 'MOUND': (0.22, 0.16, 7),
    'SEED': 3,
}
COL = {'Leaf_Fern': (102, 146, 44), 'Leaf_FernLight': (146, 182, 66), 'Leaf_FernDark': (72, 106, 28),
       'Stem_Green': (86, 126, 36)}
P.update(json.loads(os.environ.get('FERN_P', '{}')))   # parameter sweeps: FERN_P='{"SEED": 3}'
RND = random.Random(P['SEED'])


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.8
        m.use_backface_culling = False          # exported double-sided: leaflets show from both sides
        MATS[name] = m
    return MATS[name]


class Mesh:
    def __init__(self):
        self.v, self.f = [], []

    def add(self, pts, faces):
        o = len(self.v); self.v += [tuple(p) for p in pts]; self.f += [tuple(i + o for i in f) for f in faces]


MESHES = {k: Mesh() for k in COL}


def arc(az, elev, tip, length, pw):
    d = Vector((math.sin(az), -math.cos(az), 0))
    p = Vector((d.x * P['BASE_R'], d.y * P['BASE_R'], 0.0))
    steps = 60; ds = length / steps
    out = []
    for k in range(steps + 1):
        s = k / steps
        a = math.radians(elev + (tip - elev) * s ** pw)
        t = Vector((d.x * math.cos(a), d.y * math.cos(a), math.sin(a)))
        out.append((s, p.copy(), t))
        p = p + t * ds
    return d, out


def sample(curve, s):
    k = min(len(curve) - 2, int(s * (len(curve) - 1)))
    s0, p0, t0 = curve[k]; s1, p1, t1 = curve[k + 1]
    u = (s - s0) / max(1e-9, s1 - s0)
    return p0.lerp(p1, u), t0.lerp(t1, u).normalized()


def leaflet(mesh, base, along, nrm, L, W):
    """A plump 6-sided oval from `base` along `along`, puffed up along `nrm`, its far end drooping."""
    side = along.cross(nrm).normalized()
    pts = []
    for ang in range(0, 360, 60):
        a = math.radians(ang + P['LEAF_ROT'])       # 30: blunt rounded ends instead of pointed ones
        u = 0.5 + 0.5 * math.cos(a) / math.cos(math.radians(P['LEAF_ROT']))   # 0 at the base, 1 at the far end
        w = 0.5 * W * math.sin(a)
        pts.append(base + along * (L * u) + side * w - nrm * (P['DROOP'] * L * u * u))
    pts.append(base + along * (0.5 * L) + nrm * (P['PUFF'] * W) - nrm * (P['DROOP'] * L * 0.25))
    mesh.add(pts, [(6, i, (i + 1) % 6) for i in range(6)])


def frond(az, elev, tip, length, lscale, mname, pw):
    d, curve = arc(az, elev, tip, length, pw)
    roll = math.radians(RND.uniform(-P['ROLL'], P['ROLL']))
    F = P['FACE']
    ref = Vector((0, -F, 1 - F)).normalized()   # blade normal leans from up towards the front, so fronds show their face

    def frame(s):
        p, t = sample(curve, s)
        lat = ref.cross(t)
        if lat.length < 0.2:
            lat = Vector((0, 0, 1)).cross(t)
        lat.normalize()
        nrm = t.cross(lat).normalized()
        if nrm.z < 0:
            nrm = -nrm
        lat = (lat * math.cos(roll) + nrm * math.sin(roll)).normalized()
        nrm = t.cross(lat).normalized()
        if nrm.z < 0:
            nrm = -nrm
        return p, t, lat, nrm

    n = P['N_PAIRS']; s0 = P['STIPE']
    fwd = math.radians(P['LEAF_FWD'])
    mesh = MESHES[mname]
    for i in range(n):
        u = i / n
        s = s0 + (1 - s0) * u
        L = length * P['LEAF_LEN'] * lscale * (1 - P['LEAF_TAPER'] * u)
        p, t, lat, nrm = frame(s)
        for sd in (1, -1):
            along = (lat * sd * math.cos(fwd) + t * math.sin(fwd)).normalized()
            along = (along - Vector((0, 0, P['GRAVITY']))).normalized()   # leaflets hang a little: soft and heavy
            leaflet(mesh, p + nrm * 0.004, along, nrm, L, L * P['LEAF_W'])
    p, t, lat, nrm = frame(0.97)
    L = length * P['LEAF_LEN'] * lscale * (1 - P['LEAF_TAPER'])
    leaflet(mesh, p, t, nrm, L * 1.2, L * 1.2 * P['LEAF_W'])
    # rachis: a fat tapered strip from the ground to the tip, raised just above the leaflets' bases
    rp, rf = [], []
    m = P['RACHIS_N']
    for k in range(m + 1):
        s = k / m
        p, t, lat, nrm = frame(s)
        w = P['RACHIS_W'] * (1 - 0.6 * s)
        lift = nrm * 0.01
        rp += [p + lat * w + lift, p - lat * w + lift]
        if k:
            a = 2 * (k - 1); rf += [(a, a + 2, a + 1), (a + 1, a + 2, a + 3)]
    MESHES['Stem_Green'].add(rp, rf)


def crown():
    n = P['CROWN_N']
    for i in range(n):
        az = 2 * math.pi * (i + 0.5) / n + RND.uniform(-0.2, 0.2)
        d = Vector((math.sin(az), -math.cos(az), 0)); lat = Vector((-d.y, d.x, 0))
        e = math.radians(P['CROWN_ELEV'] + RND.uniform(-8, 12))
        t = Vector((d.x * math.cos(e), d.y * math.cos(e), math.sin(e)))
        nrm = t.cross(lat).normalized()
        if nrm.z < 0:
            nrm = -nrm
        L = P['CROWN_LEN'] * RND.uniform(0.8, 1.2)
        base = d * P['CROWN_R'] + Vector((0, 0, 0.02 + 0.03 * (i % 2)))
        leaflet(MESHES['Leaf_FernDark'], base, t, nrm, L, L * 0.55)
    r, h, k = P['MOUND']
    ring = [Vector((r * math.cos(2 * math.pi * j / k), r * math.sin(2 * math.pi * j / k), 0.0)) for j in range(k)]
    mid = [Vector((0.6 * v.x, 0.6 * v.y, 0.7 * h)) for v in ring]
    pts = ring + mid + [Vector((0, 0, h))]
    faces = []
    for j in range(k):
        a, b2 = j, (j + 1) % k
        faces += [(a, b2, k + b2), (a, k + b2, k + a), (k + a, k + b2, 2 * k)]
    MESHES['Leaf_FernDark'].add(pts, faces)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ja, je, jl = P['JITTER']
    for az, elev, tip, length, lscale, light, pw in P['FRONDS']:
        frond(math.radians(az + RND.uniform(-ja, ja)), elev + RND.uniform(-je, je), tip + RND.uniform(-je, je),
              length * RND.uniform(1 - jl, 1 + jl), lscale, 'Leaf_FernLight' if light else 'Leaf_Fern', pw)
    crown()
    # lean: shear the clump to the right with height (keeps the foot planted)
    lean = math.tan(math.radians(P['LEAN']))
    for m in MESHES.values():
        m.v = [(x + lean * max(0.0, z), y, z) for x, y, z in m.v]
    # fit the box: footprint centred on the origin, base on the ground
    allp = [Vector(v) for m in MESHES.values() for v in m.v]
    lo = Vector([min(p[i] for p in allp) for i in range(3)]); hi = Vector([max(p[i] for p in allp) for i in range(3)])
    lo.z = 0.0
    sc = [P['TARGET'][i] / (hi[i] - lo[i]) for i in range(3)]
    c = (lo + hi) / 2
    names = {'Leaf_Fern': 'fronds', 'Leaf_FernLight': 'fronds_young', 'Leaf_FernDark': 'crown', 'Stem_Green': 'rachises'}
    for name, m in MESHES.items():
        v = [((x - c.x) * sc[0], (y - c.y) * sc[1], max(0.0, z) * sc[2]) for x, y, z in m.v]
        me = bpy.data.meshes.new(names[name]); me.from_pydata(v, [], m.f); me.validate(); me.update()
        me.materials.append(mat(name))
        for poly in me.polygons:
            poly.use_smooth = False
        ob = bpy.data.objects.new(names[name], me); bpy.context.scene.collection.objects.link(ob)


def tris():
    return sum(len(p.vertices) - 2 for o in bpy.context.scene.objects if o.type == 'MESH' for p in o.data.polygons)


def main():
    build()
    zs = [(ob.matrix_world @ Vector(v.co)) for ob in bpy.context.scene.objects for v in ob.data.vertices]
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'fern-charming.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(max(p.z for p in zs), 3),
          'width', round(max(p.x for p in zs) - min(p.x for p in zs), 3), 'depth', round(max(p.y for p in zs) - min(p.y for p in zs), 3))


if __name__ == '__main__':
    main()
