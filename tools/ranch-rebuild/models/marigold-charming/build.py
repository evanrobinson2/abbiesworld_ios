"""Marigold, charming (storybook-toy style B of marigold; replaces simulations/regional-assets/GF-250.glb in the
charming set): a chubby clump of pot marigold. A low rosette of plump spoon-shaped leaves splays out from the crown,
a few fat upright leaves rise through it, and seven oversized flat daisy blooms nod on thick, gently bowed stems,
the biggest at the top, the lower ones turned to face the viewer, the whole crown leaning a little to the right.

usage: python build.py      writes marigold-charming.glb
Same conventions as ../marigold/build.py: Z up, metres, origin at the base on the ground, front (the hero's view)
faces -Y, no variants (plant group). Built in plant units (top of the tallest bloom ~ 1), then scaled so the top
sits at HEIGHT (the old GF-250's height) and stretched in plan to the normal model's width/depth ratio.
Each bloom is a plump daisy: a ring of rounded orange petals cupped up at the tips, a raised ring of shorter amber
petals turned half a petal, a domed deep-orange heart, and an orange under-cone (through the petal notches) that gives the disc thickness.
Leaves are puffy spoon cards (6 triangles, raised midrib) on double-sided materials.
Material names and roles are the normal model's: Flower_Petal_Orange / _Amber / _Gold, Stem_Green, Leaf_Green, Leaf_Dark.
"""
import os, math, random
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'marigold-charming'

P = {
    'HEIGHT': 0.315,            # final top (m), as the normal model and the old GF-250
    'PLAN_RATIO': 1.24,         # width / depth of the normal model's footprint (0.306 x 0.246 m); kept so it drops in
    'CAM_ELEV': 18,             # the hero's camera height (deg); bloom heights are given as they appear in the hero
    # blooms, measured off the hero: (x, v, y, R, face): x across, v image height above the crown, y depth
    # (+ = back), R disc radius (plant units), face = how far the disc turns from straight up to the front (-Y)
    'BLOOMS': [
        (-0.077, 0.85, 0.06, 0.172, 0.55),      # top, the biggest
        (0.196, 0.70, 0.10, 0.128, 0.60),       # upper right
        (-0.304, 0.585, 0.04, 0.136, 0.75),     # left
        (0.009, 0.565, -0.04, 0.152, 0.65),     # middle
        (0.354, 0.495, 0.02, 0.095, 0.85),      # small, far right
        (-0.157, 0.335, -0.20, 0.132, 1.30),    # lower left, faces front
        (0.143, 0.275, -0.22, 0.106, 1.30),     # lower right, faces front
    ],
    'R_SCALE': 1.15,
    'X_SPREAD': 1.10,           # bloom x positions stretched out from the axis (the hero's blooms fan wider)
    'LEAN': 0.06,               # whole crown leans to +X by this much per unit height (the charming tilt)
    # petal rings: (petals, outer r, inner r, tip h, notch h, centre h, width share) in x R, and the material
    'RINGS': [(13, 1.00, 0.36, 0.20, 0.00, 0.10, 0.82, 'Flower_Petal_Orange'),
              (10, 0.58, 0.18, 0.26, 0.14, 0.20, 0.70, 'Flower_Petal_Amber')],
    'HEART': (0.17, 0.32, 6),   # heart dome radius, top height (x R), sides
    'UNDER': 0.26,              # under-cone depth (x R)
    'JAG': 0.06,                # random petal length variation
    # stems: thick and gently bowed out
    'STEM_R': (0.022, 0.014), 'STEM_SIDES': 3, 'STEM_BOW': 0.06, 'CROWN_R': 0.08,
    # leaves: (count, length range, width, elevation range deg)
    'N_BASE': 26, 'BASE_LEN': (0.32, 0.44), 'BASE_W': 0.105, 'BASE_ELEV': (2, 26), 'BASE_R': 0.10,
    'N_UP': 20, 'UP_LEN': (0.40, 0.56), 'UP_W': 0.095, 'UP_ELEV': (28, 60), 'UP_FAN': 1.0,
    'STEM_LEAVES': 1, 'STEM_LEN': (0.14, 0.20), 'STEM_W': 0.05, 'STEM_AT': (0.35, 0.6),
    'BASE_SQUASH_Y': 0.85,
    'DARK_SHARE': 0.30,
    # dark inner mass that keeps the clump solid between the leaves
    'CORE': [(0.0, 0.12), (0.12, 0.21), (0.28, 0.19), (0.42, 0.08)], 'CORE_LUMP': 0.25, 'CORE_SIDES': 6,
    'SMOOTH': True,
    'SEED': 3,
}
COL = {'Flower_Petal_Orange': (246, 128, 26), 'Flower_Petal_Amber': (250, 160, 36), 'Flower_Petal_Gold': (226, 96, 18),
       'Stem_Green': (120, 152, 46), 'Leaf_Green': (128, 162, 52), 'Leaf_Dark': (66, 100, 26)}
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
        m.use_backface_culling = False          # exported double-sided: leaf cards and petal discs show from both sides
        MATS[name] = m
    return MATS[name]


def make(name, verts, faces, material, smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces); me.validate(); me.update()
    for p in me.polygons:
        p.use_smooth = smooth           # smooth on petals and leaves: soft, puffy toy shading instead of facets
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(mat(material))
    bpy.context.scene.collection.objects.link(ob)
    return ob


def merge(*vfs):
    V, F = [], []
    for v, f in vfs:
        o = len(V); V += list(v); F += [tuple(i + o for i in face) for face in f]
    return V, F


def frame(t):
    t = t.normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
    u = up.cross(t).normalized(); return u, t.cross(u)


def tube(path, r0, r1, sides):
    rings = []
    for i, c in enumerate(path):
        t = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]; u, v = frame(t)
        r = r0 + (r1 - r0) * i / (len(path) - 1)
        rings.append([c + (u * math.cos(a) + v * math.sin(a)) * r for a in (2 * math.pi * k / sides for k in range(sides))])
    n = sides; V = [p for r in rings for p in r]; F = []
    for i in range(len(rings) - 1):
        a, b = i * n, (i + 1) * n
        F += [(a + k, a + (k + 1) % n, b + (k + 1) % n, b + k) for k in range(n)]
    return V, F


# ------------------------------------------------------------------ blooms
def petal_ring(c, up, R, n, spec, rot):
    """A daisy ring: n rounded petals fanned round a centre. Each petal is notch, shoulder, shoulder on the rim
    (a squared-off, plump tip), cupped up toward the tips. Returns verts, faces and the notch indices."""
    tr, nr, th, nh, ch, ws = spec; u, v = frame(up)
    V = [c + up * ch * R]; notches = []
    step = 2 * math.pi / n
    for k in range(n):
        a = rot + k * step
        j = 1 + RND.uniform(-P['JAG'], P['JAG'])
        notches.append(len(V))
        V.append(c + (u * math.cos(a) + v * math.sin(a)) * nr * R + up * nh * R)
        for s in (-0.5 * ws, 0.5 * ws):
            b = a + step * (0.5 + s)
            V.append(c + (u * math.cos(b) + v * math.sin(b)) * tr * R * j + up * th * R * j)
    m = len(V) - 1
    return V, [(0, 1 + k, 1 + (k + 1) % m) for k in range(m)], notches


def bloom(c, up, R):
    """A plump daisy: outer orange ring, raised amber ring turned half a petal, deep-orange heart dome, and an
    orange under-cone from the outer notches. Returns {material: (verts, faces)} and the stem foot."""
    rot = RND.random() * 6.28; out = {}
    for i, (n, *spec, name) in enumerate(P['RINGS']):
        V, F, notch = petal_ring(c, up, R, n, spec, rot + i * math.pi / n)
        if i == 0:
            bot = len(V); V.append(c - up * P['UNDER'] * R)
            # close the underside with a shallow cone through the notches so the disc reads thick from the side
            F += [(bot, notch[(k + 1) % len(notch)], notch[k]) for k in range(len(notch))]
        out[name] = (V, F)
    hr, hh, hs = P['HEART']; u, v = frame(up)
    V = [c + up * hh * R] + [c + (u * math.cos(2 * math.pi * k / hs) + v * math.sin(2 * math.pi * k / hs)) * hr * R
                              + up * 0.16 * R for k in range(hs)]
    out['Flower_Petal_Gold'] = (V, [(0, 1 + k, 1 + (k + 1) % hs) for k in range(hs)])
    return out, c - up * P['UNDER'] * R


def bloom_list():
    e = math.radians(P['CAM_ELEV'])
    out = []
    for x, vv, y, R, face in P['BLOOMS']:
        R *= P['R_SCALE']
        z = (vv - y * math.sin(e)) / math.cos(e)
        x *= P['X_SPREAD']
        c = Vector((x + RND.uniform(-0.01, 0.01), y, z))
        up = Vector((0, 0, 1)) + Vector((0, -1, 0)) * face + Vector((x, 0, 0)) * 0.8
        out.append((c, up.normalized(), R))
    return out


# ------------------------------------------------------------------ leaves
def leaf(base, d, side, L, W, droop):
    """Puffy spoon leaf: narrow at the base, widest near the round tip, midrib lifted so it reads plump. 6 triangles."""
    nrm = d.cross(side).normalized()
    if nrm.z < 0:
        nrm = -nrm
    def at(t, w, lift):
        return base + d * (t * L) - Vector((0, 0, droop * L * t * t)) + side * w + nrm * lift
    mid = at(0.55, 0, W * 0.45)
    V = [base, at(0.35, W * 0.65, 0), at(0.78, W, 0), at(1.0, 0, W * 0.1), at(0.78, -W, 0), at(0.35, -W * 0.65, 0), mid]
    return V, [(0, 1, 6), (1, 2, 6), (2, 3, 6), (3, 4, 6), (4, 5, 6), (5, 0, 6)]


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); RND.seed(P['SEED'])
    blooms = bloom_list()
    petals = {r[-1]: [] for r in P['RINGS']}; petals['Flower_Petal_Gold'] = []
    stems = []
    leaves = {'Leaf_Green': [], 'Leaf_Dark': []}
    pick = lambda: 'Leaf_Dark' if RND.random() < P['DARK_SHARE'] else 'Leaf_Green'
    for i, (c, up, R) in enumerate(blooms):
        parts, foot = bloom(c, up, R)
        for name, vf in parts.items():
            petals[name].append(vf)
        h = Vector((c.x, c.y, 0)); hd = h.normalized() if h.length > 1e-3 else Vector((0, -1, 0))
        th = math.atan2(c.x, -c.y) + RND.uniform(-0.3, 0.3)
        b = Vector((math.sin(th), -math.cos(th), 0)) * P['CROWN_R'] * RND.uniform(0.2, 1.0)
        top = foot - up * 0.02
        mid = b.lerp(top, 0.5) + hd * P['STEM_BOW']
        stems.append(tube([b, mid, top], *P['STEM_R'], P['STEM_SIDES']))
        for k in range(P['STEM_LEAVES']):
            t = RND.uniform(*P['STEM_AT'])
            p = (b.lerp(mid, t * 2) if t < 0.5 else mid.lerp(top, t * 2 - 1))
            a = th + (1 if (i + k) % 2 else -1) * RND.uniform(0.7, 1.3)
            d = Vector((math.sin(a), -math.cos(a), RND.uniform(0.5, 0.9))).normalized()
            side = Vector((0, 0, 1)).cross(d).normalized()
            leaves[pick()].append(leaf(p, d, side, RND.uniform(*P['STEM_LEN']), P['STEM_W'], 0.2))
    ga = math.pi * (3 - math.sqrt(5))
    # base rosette: broad spoon leaves splaying out low from the crown in every direction
    for i in range(P['N_BASE']):
        a = i * ga + RND.uniform(-0.2, 0.2)
        h = Vector((math.sin(a), -math.cos(a) * P['BASE_SQUASH_Y'], 0))
        base = h * RND.uniform(0.0, P['BASE_R']) + Vector((0, 0, RND.uniform(0.0, 0.08)))
        el = math.radians(RND.uniform(*P['BASE_ELEV']))
        d = (h.normalized() * math.cos(el) + Vector((0, 0, math.sin(el)))).normalized()
        side = Vector((0, 0, 1)).cross(d).normalized()
        side = Matrix.Rotation(math.radians(RND.uniform(-25, 25)), 3, d) @ side
        leaves[pick()].append(leaf(base, d, side, RND.uniform(*P['BASE_LEN']), P['BASE_W'], RND.uniform(0.1, 0.3)))
    # upright leaves: fat leaves standing up through the middle, between the stems
    for i in range(P['N_UP']):
        # most fan out to the sides (the hero's leaves stick out left and right at mid height), a few front and back
        a = (math.pi / 2 if i % 2 else -math.pi / 2) + RND.uniform(-1, 1) * P['UP_FAN'] if i % 4 != 3 else i * ga
        h = Vector((math.sin(a), -math.cos(a) * P['BASE_SQUASH_Y'], 0))
        base = h * RND.uniform(0.02, 0.09) + Vector((0, 0, RND.uniform(0.06, 0.18)))
        el = math.radians(RND.uniform(*P['UP_ELEV']))
        d = (h.normalized() * math.cos(el) + Vector((0, 0, math.sin(el)))).normalized()
        side = Matrix.Rotation(math.radians(RND.uniform(-30, 30)), 3, d) @ Vector((0, 0, 1)).cross(d).normalized()
        leaves[pick()].append(leaf(base, d, side, RND.uniform(*P['UP_LEN']), P['UP_W'], RND.uniform(0.05, 0.2)))
    # dark core
    ns = P['CORE_SIDES']; V = []; F = []
    for j, (z, r) in enumerate(P['CORE']):
        for k in range(ns):
            a = 2 * math.pi * (k + 0.5 * (j % 2)) / ns
            rr = r * (1 + P['CORE_LUMP'] * math.sin(3 * a + 2.1 * j))
            V.append(Vector((math.sin(a) * rr, -math.cos(a) * rr * P['BASE_SQUASH_Y'], z)))
    for j in range(len(P['CORE']) - 1):
        a0, b0 = j * ns, (j + 1) * ns
        for k in range(ns):
            F += [(a0 + k, a0 + (k + 1) % ns, b0 + k), (a0 + (k + 1) % ns, b0 + (k + 1) % ns, b0 + k)]
    top = len(V); V.append(Vector((0, 0, P['CORE'][-1][0] + 0.05))); a0 = (len(P['CORE']) - 1) * ns
    F += [(a0 + k, a0 + (k + 1) % ns, top) for k in range(ns)]
    leaves['Leaf_Dark'].append((V, F))

    lean = lambda v: Vector((v[0] + P['LEAN'] * v[2] * v[2], v[1], v[2]))   # the crown leans, the base stays put
    for name, lst in petals.items():
        V, F = merge(*lst); make('blooms_' + name.split('_')[-1].lower(), [lean(v) for v in V], F, name, P['SMOOTH'])
    V, F = merge(*stems); make('stems', [lean(Vector((v[0], v[1], max(v[2], 0)))) for v in V], F, 'Stem_Green')
    for name, lst in leaves.items():
        V, F = merge(*lst)
        make('leaves_' + name.split('_')[1].lower(), [lean(Vector((v[0], v[1], max(v[2], 0.005)))) for v in V], F, name, P['SMOOTH'])
    # scale to the normal model's height and plan ratio
    ps = [v.co for ob in bpy.context.scene.objects for v in ob.data.vertices]
    s = P['HEIGHT'] / max(p.z for p in ps)
    w = max(p.x for p in ps) - min(p.x for p in ps); dp = max(p.y for p in ps) - min(p.y for p in ps)
    sy = (w / dp) / P['PLAN_RATIO']
    cx = (max(p.x for p in ps) + min(p.x for p in ps)) / 2; cy = (max(p.y for p in ps) + min(p.y for p in ps)) / 2
    for ob in bpy.context.scene.objects:
        ob.data.transform(Matrix.Translation((-cx, -cy, 0)))
        ob.data.transform(Matrix.Diagonal((s, s * sy, s, 1.0)))


def tris():
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles(); n += len(ob.data.loop_triangles)
    return n


def main():
    build()
    ps = [v.co for ob in bpy.context.scene.objects for v in ob.data.vertices]
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, NAME + '.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(max(p.z for p in ps), 3),
          'width', round(max(p.x for p in ps) - min(p.x for p in ps), 3), 'depth', round(max(p.y for p in ps) - min(p.y for p in ps), 3))


if __name__ == '__main__':
    main()
