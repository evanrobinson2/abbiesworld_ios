"""Fern (Ranch tile woodland ground cover, replaces simulations/regional-assets/WW-046.glb): a fountain-shaped fern
clump. 18 fronds rise from a tight dark crown at the ground: the central ones upright, the outer ones arching out and
drooping their tips almost to the ground on every side.

usage: python build.py      writes fern.glb
Z up, metres, origin at the footprint centre on the ground, front (the hero's view) faces -Y. No variants (plant group).
Each frond is a rachis on a smooth arc (a thin raised Stem_Green strip) and a blade built as one saw-tooth ribbon per
side: a tip vertex per pinna and a notch vertex between pinnae, fanned to the rachis, with pinnae shrinking to the
tip and drooping a little off the blade plane. Double-sided materials, flat colours.
The whole clump is finally scaled to the old GLB's box (TARGET), since to_game.py copies GLBs without rescaling.
"""
import os, math, random, json
import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    'TARGET': (0.85, 0.87, 0.53),   # old WW-046.glb: width x depth x height (m)
    # frond rings: (count, azimuth offset deg, base elevation deg, tip angle deg (neg = down), length, max half-width,
    #               light share, arc power). The direction angle falls from base to tip with s^power (higher = straighter
    #               base, sharper fall at the end). Lengths in build units (centre frond ~1 tall); the clump is
    #               rescaled to TARGET at the end. Arcs fitted to the hero's crest and tip positions.
    'RINGS': [
        (2, 20, 88, 76, 1.12, 0.32, 1.0, 1.0),     # upright centre
        (5, 0, 84, -120, 1.30, 0.33, 0.6, 2.2),    # high arches: rise, arch over, tips to mid height
        (6, 30, 80, -110, 1.20, 0.32, 0.2, 1.3),   # low arches: arch out, tips droop to the ground
        (6, 10, 52, -60, 0.85, 0.30, 0.0, 1.0),    # skirt: short fronds filling the lower mass
    ],
    'STIPE': 0.16,              # bare stalk share of the frond length
    'N_PINNAE': 7,              # pinnae per side
    'PINNA_FWD': 0.65,          # pinna tip leans towards the frond tip (x half-width)
    'NOTCH': 0.12,              # notch depth: notch sits at this share of the half-width
    'DROOP': 0.20,              # pinna tips sag off the blade plane (x half-width)
    'ROLL': 18,                 # random blade roll (deg)
    'TWIST': 25,                # extra roll towards the tip (deg, random sign), so hanging tips show their face
    'BASE_R': 0.05,             # crown radius where fronds leave the ground
    'JITTER': (12, 6, 0.08),    # azimuth deg, elevation deg, length share
    'RACHIS_W': 0.012, 'RACHIS_N': 4,
    # crown: short dark blades in a ring plus a low faceted mound
    'CROWN_N': 12, 'CROWN_LEN': 0.70, 'CROWN_W': 0.15, 'CROWN_ELEV': 8, 'MOUND': (0.36, 0.22, 7),
    'SEED': 7,
}
COL = {'Leaf_Fern': (98, 112, 30), 'Leaf_FernLight': (150, 162, 56), 'Leaf_FernDark': (42, 54, 12),
       'Stem_Green': (112, 114, 42)}
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
        b.inputs['Roughness'].default_value = 0.85
        m.use_backface_culling = False          # exported double-sided: frond cards show from both sides
        MATS[name] = m
    return MATS[name]


class Mesh:
    def __init__(self):
        self.v, self.f = [], []

    def add(self, pts, faces):
        o = len(self.v); self.v += [tuple(p) for p in pts]; self.f += [tuple(i + o for i in f) for f in faces]


MESHES = {k: Mesh() for k in COL}


def arc(az, elev, tip, length, pw):
    """Points and tangents along a frond's rachis: the direction angle falls from elev to tip with s^ARC_POW."""
    d = Vector((math.sin(az), -math.cos(az), 0))
    p = Vector((d.x * P['BASE_R'], d.y * P['BASE_R'], 0.0))
    pts, tans = [], []
    steps = 60
    ds = length / steps
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


def frond(az, elev, tip, length, halfw, mname, pw):
    d, curve = arc(az, elev, tip, length, pw)
    roll0 = math.radians(RND.uniform(-P['ROLL'], P['ROLL']))
    twist = math.radians(P['TWIST']) * RND.choice((-1, 1))
    side0 = Vector((-d.y, d.x, 0))       # horizontal, across the frond

    def frame(s):
        p, t = sample(curve, s)
        lat = (side0 - t * side0.dot(t)).normalized()
        nrm = t.cross(lat).normalized()
        if nrm.z < 0:
            nrm = -nrm
        roll = roll0 + twist * s ** 2
        lat = (lat * math.cos(roll) + nrm * math.sin(roll)).normalized()
        nrm = t.cross(lat).normalized()
        if nrm.z < 0:
            nrm = -nrm
        return p, t, lat, nrm

    n = P['N_PINNAE']; s0 = P['STIPE']
    ss = [s0 + (1 - s0) * i / n for i in range(n)]
    pts, faces = [], []
    R = []
    for s in ss:
        R.append(len(pts)); pts.append(frame(s)[0])
    Rt = len(pts); pts.append(frame(1.0)[0])
    for side in (1, -1):
        tips, notches = [], []
        for i, s in enumerate(ss):
            t_ = (s - s0) / (1 - s0)
            w = halfw * (1 - t_) ** 0.75 * (0.75 + 0.25 * min(1, t_ * 4))
            sf = min(1.0, s + P['PINNA_FWD'] * w / length)
            p, t, lat, nrm = frame(sf)
            tips.append(len(pts)); pts.append(p + lat * side * w - nrm * P['DROOP'] * w)
            if i < n - 1:
                sm = (s + ss[i + 1]) / 2 + 0.25 * P['PINNA_FWD'] * w / length
                p, t, lat, nrm = frame(sm)
                notches.append(len(pts)); pts.append(p + lat * side * P['NOTCH'] * w - nrm * 0.1 * w)
        for i in range(n - 1):
            faces += [(R[i], tips[i], notches[i]), (R[i], notches[i], R[i + 1]), (R[i + 1], notches[i], tips[i + 1])]
        faces.append((R[n - 1], tips[n - 1], Rt))
    MESHES[mname].add(pts, faces)
    # rachis: a thin strip from the ground to the tip, raised just above the blade
    rp, rf = [], []
    m = P['RACHIS_N']
    for k in range(m + 1):
        s = k / m
        p, t, lat, nrm = frame(s)
        w = P['RACHIS_W'] * (1 - 0.6 * s)
        lift = nrm * 0.006
        rp += [p + lat * w + lift, p - lat * w + lift]
        if k:
            a = 2 * (k - 1); rf += [(a, a + 2, a + 1), (a + 1, a + 2, a + 3)]
    MESHES['Stem_Green'].add(rp, rf)


def crown():
    n = P['CROWN_N']
    for i in range(n):
        az = 2 * math.pi * (i + 0.5) / n + RND.uniform(-0.2, 0.2)
        d = Vector((math.sin(az), -math.cos(az), 0)); lat = Vector((-d.y, d.x, 0))
        e = math.radians(P['CROWN_ELEV'] + RND.uniform(-10, 14))
        t = Vector((d.x * math.cos(e), d.y * math.cos(e), math.sin(e)))
        b = d * 0.03
        L = P['CROWN_LEN'] * RND.uniform(0.8, 1.15); w = P['CROWN_W']
        pts = [b, b + t * 0.3 * L + lat * w, b + t * 0.45 * L + lat * 0.4 * w, b + t * 0.65 * L + lat * 0.7 * w,
               b + t * L, b + t * 0.65 * L - lat * 0.7 * w, b + t * 0.45 * L - lat * 0.4 * w, b + t * 0.3 * L - lat * w]
        MESHES['Leaf_FernDark'].add(pts, [(0, 1, 2), (0, 2, 6), (0, 6, 7), (2, 3, 4), (2, 4, 6), (6, 4, 5)])
    r, h, k = P['MOUND']
    ring = [Vector((r * math.cos(2 * math.pi * j / k), r * math.sin(2 * math.pi * j / k), 0.0)) for j in range(k)]
    mid = [Vector((0.6 * v.x, 0.6 * v.y, 0.6 * h)) for v in ring]
    pts = ring + mid + [Vector((0, 0, h))]
    faces = []
    for j in range(k):
        a, b2 = j, (j + 1) % k
        faces += [(a, b2, k + b2), (a, k + b2, k + a), (k + a, k + b2, 2 * k)]
    MESHES['Leaf_FernDark'].add(pts, faces)


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for count, off, elev, tip, length, halfw, light, pw in P['RINGS']:
        ja, je, jl = P['JITTER']
        lights = set(RND.sample(range(count), round(light * count)))
        for i in range(count):
            az = math.radians(off + 360 * i / count + RND.uniform(-ja, ja))
            frond(az, elev + RND.uniform(-je, je), tip + RND.uniform(-je, je), length * RND.uniform(1 - jl, 1 + jl), halfw,
                  'Leaf_FernLight' if i in lights else 'Leaf_Fern', pw)
    crown()
    # fit the old GLB's box: footprint centred on the origin, base on the ground
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
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'fern.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(max(p.z for p in zs), 3),
          'width', round(max(p.x for p in zs) - min(p.x for p in zs), 3), 'depth', round(max(p.y for p in zs) - min(p.y for p in zs), 3))


if __name__ == '__main__':
    main()
