"""Elder, charming (storybook toy) version of models/elder. Ranch tile hedge shrub; installs as the charming twin of
simulations/regional-assets/GF-159.glb. A soft, twisty olive trunk leans out of a plump pale-green cloud bush and
arches over into three umbrella canopies (a big crowning one, one out to the left, a small low one sitting on the
cloud bush), each a skirt of oversized dark leaflets under a lumpy cap of creamy flower heads.

usage: python build.py      writes elder-charming.glb
Z up, metres, origin at the base on the ground, front faces -Y. No variants (tree group), no animation.
Same material names and roles as the normal elder (Leaf_Shade, Leaf_Dark, Leaf_Mid, Stem_Brown, Flower_Cream,
Flower_Ivory, Flower_Butter), plus one new one for the new detail: Leaf_Cloud (the cloud bush and its swirls).

Layout is read off the Midjourney hero in its own pixels (display scale, 1932 px), so revisions are edits to the
numbers below: x to the right, y down. Everything is built in a 'screen' frame (X = the hero's screen right, Y = depth
away from the hero camera) and turned by HERO_YAW at the end, so the hero view (30 deg off the front) sees the
layout as drawn.
"""
import os, math, random
import bpy
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    # hero image -> metres: ground row, centre column (display px) and metres per px
    'IMG': {'ground': 1650, 'cx': 968, 'mpp': 3.15 / 1350},
    'HERO_YAW': 30,             # deg; the layout's screen-right axis faces this view
    'SPREAD': 1.0,              # final horizontal scale
    # trunk and branches: polylines in hero px with a depth (m) per point; radii (m) at start and end
    'TRUNK': [(950, 1650, -0.30), (972, 1480, -0.30), (925, 1310, -0.28), (815, 1200, -0.22), (730, 1110, -0.15)],
    'TRUNK_R': (0.20, 0.13), 'FLARE': 0.30,       # root flare radius at the ground
    'BRANCHES': [
        # (points, r0, r1)
        ([(730, 1110, -0.15), (770, 995, -0.05), (835, 870, 0.05), (905, 755, 0.15), (1000, 630, 0.22)], 0.13, 0.07),
        ([(905, 755, 0.15), (1050, 700, 0.25), (1200, 675, 0.30), (1330, 690, 0.32)], 0.06, 0.035),
        ([(730, 1110, -0.15), (630, 1095, -0.12), (585, 1040, -0.08), (552, 950, -0.05)], 0.10, 0.05),
        ([(925, 1310, -0.28), (1000, 1250, -0.33), (1080, 1180, -0.36), (1125, 1110, -0.36)], 0.07, 0.04),
    ],
    'TUBE_SIDES': 6, 'TUBE_N': 7, 'TWIST_BULGE': 0.12,
    # canopies: centre (hero px x, y of the cap's underside), depth t (m), half-width (px), depth half-width (m),
    # flower cap: blob count, blob radius (m); leaf skirt: leaf count, how far the skirt hangs (m),
    # hang bias to the right (+) or left (-), and the cap's tilt (deg, + raises the right side)
    'CANOPIES': [
        dict(name='top', x=1080, y=625, t=0.30, hw=430, ht=1.0, blobs=12, br=(0.27, 0.34), leaves=92,
             hang=0.6, bias=0.75, tilt=-10, dome=0.2),
        dict(name='left', x=545, y=905, t=-0.05, hw=300, ht=0.70, blobs=7, br=(0.24, 0.31), leaves=64,
             hang=0.7, bias=-0.55, tilt=8, dome=0.2),
        dict(name='low', x=1150, y=1170, t=-0.45, hw=230, ht=0.55, blobs=5, br=(0.22, 0.28), leaves=38,
             hang=0.45, bias=-0.3, tilt=-4, dome=0.18),
    ],
    'CORE': 0.66,               # dark under-body radius, as a share of the canopy's
    'LEAF': (0.34, 0.12),       # leaflet length and half-width (m): oversized for the toy look
    'LEAF_RING': (0.45, 0.85),  # leaf bases from this share of the canopy radius out (the cards reach past it)
    'FOLD': 0.4,
    'MID_SHARE': 0.38,
    # cloud bush: puffs (hero px x, y, radius px, depth m); a few carry a raised swirl
    'PUFFS': [
        (800, 1535, 115, -0.45), (735, 1585, 80, -0.55), (930, 1545, 120, -0.50), (1080, 1530, 135, -0.55), (1240, 1540, 130, -0.55),
        (1400, 1530, 130, -0.50), (1495, 1495, 115, -0.40), (815, 1425, 95, -0.30), (1050, 1385, 130, -0.35),
        (1350, 1365, 150, -0.35), (1505, 1335, 110, -0.20), (1290, 1180, 150, -0.10), (1515, 1195, 100, 0.0),
        (1455, 1070, 105, 0.05), (1325, 1010, 95, 0.10), (1200, 1030, 90, 0.15), (1100, 1300, 150, 0.40),
        (1430, 1250, 140, 0.40),
    ],
    # the cloud bush's solid body under the puffs: centre (hero px), depth, radii (m)
    'CLOUD_CORE': (1230, 1350, 0.0, 0.95, 0.55, 0.75),
    'PUFF_SEG': (8, 5), 'PUFF_SQUASH': 0.92,
    'SWIRLS': [0, 3, 5, 8, 9, 11, 16, 17],   # puff indices that get a swirl (the last two, at the back, face +Y)
    'SWIRL_TURNS': 1.3, 'SWIRL_R': 0.035,
    'BLOB_SEG': (7, 4),
    'SEED': 11,
}
COL = {'Stem_Brown': (146, 128, 62), 'Leaf_Shade': (44, 64, 24), 'Leaf_Dark': (52, 80, 32), 'Leaf_Mid': (86, 110, 52),
       'Leaf_Cloud': (150, 162, 80), 'Flower_Ivory': (250, 246, 228), 'Flower_Butter': (232, 218, 166),
       'Flower_Cream': (244, 236, 206)}
TONES = (('Flower_Cream', 0.5), ('Flower_Ivory', 0.3), ('Flower_Butter', 0.2))
SMOOTH = {'Stem_Brown', 'Leaf_Cloud', 'Leaf_Shade'}   # flower heads stay faceted so they sparkle like floret clusters
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
        m.use_backface_culling = False          # exported double-sided: leaf cards show from both sides
        MATS[name] = m
    return MATS[name]


def make(name, verts, faces, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces); me.validate(); me.update()
    for p in me.polygons:
        p.use_smooth = material in SMOOTH
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(mat(material))
    bpy.context.scene.collection.objects.link(ob)
    return ob


def merge(*vfs):
    V, F = [], []
    for v, f in vfs:
        o = len(V); V += list(v); F += [tuple(i + o for i in face) for face in f]
    return V, F


def loft(rings, cap0=True, cap1=True):
    n = len(rings[0]); V = [tuple(p) for r in rings for p in r]; F = []
    for i in range(len(rings) - 1):
        a, b = i * n, (i + 1) * n
        F += [(a + k, a + (k + 1) % n, b + (k + 1) % n, b + k) for k in range(n)]
    if cap0:
        F.append(tuple(range(n))[::-1])
    if cap1:
        F.append(tuple((len(rings) - 1) * n + k for k in range(n)))
    return V, F


def frame(t):
    t = t.normalized(); up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
    u = up.cross(t).normalized(); return u, t.cross(u)


def spline(pts, n):
    P_ = [Vector(p) for p in pts]; P_ = [P_[0] * 2 - P_[1]] + P_ + [P_[-1] * 2 - P_[-2]]
    out = []
    for i in range(n):
        s = i / (n - 1) * (len(pts) - 1); k = min(int(s), len(pts) - 2); t = s - k
        p0, p1, p2, p3 = P_[k], P_[k + 1], P_[k + 2], P_[k + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return out


def tube(path, radii, sides, cap=True):
    rings = []
    for i, c in enumerate(path):
        t = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]; u, v = frame(t)
        r = radii[i]
        rings.append([c + (u * math.cos(a) + v * math.sin(a)) * r for a in (2 * math.pi * k / sides + i * 0.35 for k in range(sides))])
    return loft(rings, False, cap)


def ellipsoid(c, rx, ry, rz, seg, rings, jit=0.0):
    """Low UV ellipsoid (seg x rings), optionally lumpy. Smooth-shaded where used."""
    V = [c + Vector((0, 0, -rz))]
    for j in range(1, rings):
        ph = math.pi * j / rings - math.pi / 2
        for k in range(seg):
            th = 2 * math.pi * (k + 0.5 * (j % 2)) / seg
            f = 1 + RND.uniform(-jit, jit)
            V.append(c + Vector((math.cos(ph) * math.cos(th) * rx * f, math.cos(ph) * math.sin(th) * ry * f, math.sin(ph) * rz * f)))
    V.append(c + Vector((0, 0, rz)))
    F = [(0, 1 + (k + 1) % seg, 1 + k) for k in range(seg)]
    for j in range(rings - 2):
        a, b = 1 + j * seg, 1 + (j + 1) * seg
        F += [(a + k, a + (k + 1) % seg, b + (k + 1) % seg, b + k) for k in range(seg)]
    top = len(V) - 1; a = 1 + (rings - 2) * seg
    F += [(a + k, a + (k + 1) % seg, top) for k in range(seg)]
    return V, F


def img(x, y, t=0.0):
    """Hero pixel (display scale) + depth -> metres in the screen frame."""
    I = P['IMG']
    return Vector(((x - I['cx']) * I['mpp'], t, (I['ground'] - y) * I['mpp']))


def px(r):
    return r * P['IMG']['mpp']


# ------------------------------------------------------------------ parts
def build_wood():
    parts = []
    # trunk: soft twisty S with gentle bulges, flared root at the ground
    pts = spline([img(*p) for p in P['TRUNK']], P['TUBE_N'] + 3)
    r0, r1 = P['TRUNK_R']; n = len(pts)
    radii = [r0 + (r1 - r0) * i / (n - 1) for i in range(n)]
    radii = [r * (1 + P['TWIST_BULGE'] * math.sin(i * 1.7)) for i, r in enumerate(radii)]
    radii[0] = P['FLARE']; radii[1] = (radii[1] + P['FLARE']) / 2
    pts[0] = Vector((pts[0].x, pts[0].y, -0.02))
    parts.append(tube(pts, radii, P['TUBE_SIDES'], False))
    for bp, b0, b1 in P['BRANCHES']:
        pts = spline([img(*p) for p in bp], P['TUBE_N'])
        n = len(pts)
        parts.append(tube(pts, [b0 + (b1 - b0) * i / (n - 1) for i in range(n)], P['TUBE_SIDES']))
    V, F = merge(*parts)
    make('trunk', [Vector((v[0], v[1], max(v[2], 0.0))) for v in V], F, 'Stem_Brown')


def leaflet(base, d, nrm, L, W):
    """Folded, pointed leaf card: base, two side points lifted on the midrib fold, tip. 2 triangles."""
    side = nrm.cross(d).normalized()
    tip = base + d * L
    s1 = base + d * (0.45 * L) + side * W + nrm * (W * P['FOLD'])
    s2 = base + d * (0.45 * L) - side * W + nrm * (W * P['FOLD'])
    return [base, s1, tip, s2], [(0, 1, 2), (0, 2, 3)]


def tone():
    u = RND.random()
    for name, w in TONES:
        if u < w:
            return name
        u -= w
    return TONES[0][0]


def build_canopies(leaves, flowers, cores):
    for cp in P['CANOPIES']:
        c = img(cp['x'], cp['y'], cp['t'])
        hw, ht = px(cp['hw']), cp['ht']
        tilt = math.tan(math.radians(cp['tilt']))
        zat = lambda dx: c.z + dx * tilt
        # dark under-body that keeps the canopy solid between leaves and flowers
        cores.append(ellipsoid(c + Vector((0, 0, -0.02)), hw * P['CORE'], ht * P['CORE'], 0.24, 8, 4, 0.1))
        # flower cap: big plump heads over the canopy, a dome rising to the middle
        br0, br1 = cp['br']; n = cp['blobs']; ga = math.pi * (3 - math.sqrt(5)); off = RND.random() * 6
        for i in range(n):
            d = math.sqrt((i + 0.5) / n) * 0.78; a = off + i * ga
            dx, dt = math.cos(a) * d * hw, math.sin(a) * d * ht
            r = RND.uniform(br0, br1)
            z = zat(dx) + 0.12 + cp['dome'] * (1 - d * d) + r * 0.25
            flowers[tone()].append(ellipsoid(Vector((c.x + dx, c.y + dt, z)), r * 1.15, r * 1.05, r * 0.62, *P['BLOB_SEG'], 0.2))
        # leaf skirt: oversized leaflets fanned out round the rim and hanging below, longer on the 'bias' side
        L, W = P['LEAF']
        for i in range(cp['leaves']):
            a = 2 * math.pi * (i + RND.uniform(-0.4, 0.4)) / cp['leaves']
            ring = RND.uniform(*P['LEAF_RING'])
            dx, dt = math.cos(a) * hw * ring, math.sin(a) * ht * ring
            side = math.cos(a) * cp['bias']
            hang = cp['hang'] * (1 + side) * RND.uniform(0.3, 1.0) * ring
            base = Vector((c.x + dx, c.y + dt, zat(dx) + 0.08 - hang * 0.6))
            out = Vector((math.cos(a) * hw, math.sin(a) * ht, 0)).normalized()
            droop = math.radians(RND.uniform(25, 75) + 20 * max(0, side))
            dirv = (out * math.cos(droop) - Vector((0, 0, math.sin(droop)))).normalized()
            dirv = (Matrix.Rotation(math.radians(RND.uniform(-35, 35)), 3, 'Z') @ dirv).normalized()
            nrm = Vector((0, 0, 1)) - dirv * dirv.z; nrm = nrm.normalized()
            nrm = Matrix.Rotation(math.radians(RND.uniform(-30, 30)), 3, dirv) @ nrm
            s = RND.uniform(0.85, 1.15)
            name = 'Leaf_Mid' if RND.random() < P['MID_SHARE'] else 'Leaf_Dark'
            leaves[name].append(leaflet(base, dirv, nrm, L * s, W * s))


def swirl(c, r, view):
    """A raised spiral ridge on a puff's face: a thin 3-sided tube wound inward on the sphere towards the viewer."""
    u, v = frame(view)
    pts = []
    n = 7
    for i in range(n):
        f = i / (n - 1); a = f * P['SWIRL_TURNS'] * 2 * math.pi
        rr = 0.62 * (1 - 0.8 * f)
        q = (u * math.cos(a) + v * math.sin(a)) * rr
        pts.append(c + (q + view * math.sqrt(max(0.0, 1 - rr * rr))) * r * 1.0)
    return tube(pts, [P['SWIRL_R'] * (1.2 - 0.7 * i / (n - 1)) for i in range(n)], 3)


def build_cloud():
    parts = []; sq = P['PUFF_SQUASH']
    view = Vector((0, -1, 0.25)).normalized()
    x, y, t, a, b, h = P['CLOUD_CORE']; c = img(x, y, t); c.z = h * 0.95
    parts.append(ellipsoid(c, a, b, h, 10, 6, 0.05))
    for i, (x, y, r, t) in enumerate(P['PUFFS']):
        rr = px(r); c = img(x, y, t)
        c.z = max(c.z, rr * sq * 0.75)
        parts.append(ellipsoid(c, rr, rr, rr * sq, *P['PUFF_SEG'], 0.07))
        if i in P['SWIRLS']:
            v = view if t < 0.3 else Vector((view.x, -view.y, view.z))
            d = (v + Vector((RND.uniform(-0.3, 0.3), 0, RND.uniform(-0.1, 0.3)))).normalized()
            parts.append(swirl(c, rr, d))
    V, F = merge(*parts)
    V = [Vector((v[0], v[1], max(v[2], 0.0))) for v in V]
    make('cloud_bush', V, F, 'Leaf_Cloud')


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); RND.seed(P['SEED'])
    build_cloud()
    build_wood()
    leaves = {'Leaf_Dark': [], 'Leaf_Mid': []}; flowers = {n: [] for n, _ in TONES}; cores = []
    build_canopies(leaves, flowers, cores)
    make('canopy_core', *merge(*cores), 'Leaf_Shade')
    for name, lst in leaves.items():
        make('leaves_' + name.split('_')[1].lower(), *merge(*lst), name)
    for name, lst in flowers.items():
        if lst:
            make('umbels_' + name.split('_')[1].lower(), *merge(*lst), name)
    # screen frame -> world: turn so the hero camera (yaw 30 deg) sees the layout; recentre the footprint on the origin
    R = Matrix.Rotation(math.radians(P['HERO_YAW']), 4, 'Z')
    obs = [ob for ob in bpy.context.scene.objects if ob.type == 'MESH']
    for ob in obs:
        ob.data.transform(R)
    xs = [v.co.x for ob in obs for v in ob.data.vertices]; ys = [v.co.y for ob in obs for v in ob.data.vertices]
    T = Matrix.Translation((-(max(xs) + min(xs)) / 2, -(max(ys) + min(ys)) / 2, 0))
    S = Matrix.Diagonal((P['SPREAD'], P['SPREAD'], 1.0, 1.0))
    for ob in obs:
        ob.data.transform(S @ T)


def tris():
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            ob.data.calc_loop_triangles(); n += len(ob.data.loop_triangles)
    return n


def main():
    build()
    zs = [(ob.matrix_world @ Vector(v.co)) for ob in bpy.context.scene.objects for v in ob.data.vertices]
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, 'elder-charming.glb'), export_format='GLB',
                              export_animations=False, export_apply=True)
    print('triangles', tris(), 'height', round(max(p.z for p in zs), 2),
          'width', round(max(p.x for p in zs) - min(p.x for p in zs), 2), 'depth', round(max(p.y for p in zs) - min(p.y for p in zs), 2))


if __name__ == '__main__':
    main()
