"""Charming shade tree (Ranch tile `tree-standing-charming`, the storybook-toy twin of `tree-standing`): a chubby
S-curved twisty trunk on big rounded root toes, holding a crown of plump cloud puffs with raised cinnamon-roll swirls
in two greens (lime and mid green) over a few dark leafy clumps; plus the chopped `stump` state.

usage: python build.py            builds both states, writes tree-standing-charming.glb (standing) and variants/<state>.glb
Z up, metres, origin at the trunk base on the ground, front (the hero's view) faces -Y. Same states, material names
and object names as models/tree-standing, so it drops into the game in place of the normal tree.
"""
import os, sys, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))

P = {
    'SCALE': 1.0,               # whole model (laid out in metres for a 6.4 m storybook tree)
    # trunk: a chubby S-curve, from the hero (it swings left above the roots and back right into the fork)
    'TRUNK': [(0.0, 0.0, 0.0), (0.0, 0.0, 0.1), (0.04, 0.0, 0.25), (0.1, 0.02, 0.45), (0.18, 0.05, 0.9), (0.1, 0.06, 1.2),
              (-0.15, 0.03, 1.55), (-0.45, -0.02, 1.85), (-0.4, -0.04, 2.1), (-0.1, 0.0, 2.35)],
    'TRUNK_R': [0.5, 0.5, 0.46, 0.42, 0.38, 0.34, 0.31, 0.29, 0.3, 0.35],
    'TWIST': 150.0,             # the buttress ridges spiral up the trunk: a soft twisty toy trunk
    'LOBES': 5,
    'LOBE_PHASE': 18.0,         # deg: toes spread left and right, none pointing straight at the viewer
    'FLARE': [1.2, 1.16, 0.55, 0.22, 0.06, 0.05, 0.03, 0.02, 0.02, 0.0],   # the toe tips round over onto the ground
    'RIDGE': 0.1,              # how far the twist ridges stand out above the roots
    'RING_N': 20,
    'LOBE_POW': 0.6,            # higher = rounder, separate root toes
    'TOE_LIFT': 0.06,           # toes rise a little at the tips (rounded feet, not flat blades)
    'LIMBS': [
        [(-0.4, -0.02, 2.0), (-0.8, -0.1, 2.35), (-1.1, -0.15, 2.65), (-1.4, -0.05, 3.15)],    # left, to the low-left clumps
        [(-0.06, 0.0, 2.3), (0.25, -0.1, 2.65), (0.45, -0.2, 3.1), (0.55, -0.3, 3.8)],         # right stem into the big puff
        [(0.15, -0.05, 2.5), (0.7, -0.1, 2.85), (1.15, -0.05, 3.15), (1.55, 0.0, 3.5)],        # out right
        [(-0.06, 0.0, 2.3), (-0.15, 0.35, 2.85), (-0.45, 0.75, 3.35), (-0.75, 0.95, 3.9)],    # back left
        [(-0.06, 0.0, 2.3), (0.25, 0.4, 2.85), (0.6, 0.8, 3.3), (0.9, 1.0, 3.7)],             # back right
        [(-0.06, 0.0, 2.3), (-0.12, 0.05, 3.1), (-0.2, 0.1, 3.9), (-0.15, 0.15, 4.6)],        # centre, up into the top
    ],
    'LIMB_R': (0.2, 0.1),
    'TWIGS': [],
    # clumps: (x, y, z, radius, kind); S = lime swirl puff (Leaf_Light), M = mid-green swirl puff (Leaf_Dark),
    # D = dark leafy clump (Leaf_Dark plates over a Leaf_Deep fill)
    'CLUMPS': [
        (-0.05, 0.1, 5.55, 0.85, 'S'),    # crown top
        (-0.75, -0.1, 5.1, 1.0, 'M'),     # top left, mid green
        (0.6, -0.5, 4.95, 1.15, 'S'),     # big front right puff
        (1.55, -0.25, 4.4, 0.75, 'S'),    # right puff
        (-1.25, -0.5, 4.05, 0.95, 'S'),   # low-left puff
        (1.85, 0.0, 4.05, 0.9, 'D'),    # right leafy
        (-1.35, -0.15, 3.25, 1.08, 'D'),     # low-left leafy, under the puff
        (0.3, 0.6, 4.0, 1.0, 'D'),    # under centre, behind the fork
        (0.3, 0.9, 5.15, 0.95, 'S'),      # back top
        (-0.9, 0.95, 4.4, 0.9, 'M'),      # back left
        (0.95, 0.95, 3.9, 1.0, 'D'),      # back right low
    ],
    'CROWN_SX': 1.0, 'CROWN_SY': 1.0, 'CROWN_SZ': 1.0, 'CROWN_DZ': 0.0,
    'FORK_Z': 2.3,              # the crown stretch pivots here
    # swirl puffs: a soft cloud blob with a raised cinnamon-roll spiral on its outward face
    'PUFF_SUB': 2,              # icosphere subdivisions (2 -> 320 tris)
    'PUFF_BUMPS': 4, 'PUFF_BUMP_H': 0.14, 'PUFF_BUMP_K': 3.0,   # a few broad soft lobes
    'SQUASH': 0.82,             # puffs and clumps flatten a little underneath
    'SWIRL': True,
    'SWIRL_TURNS': 1.6, 'SWIRL_R': 0.72,       # spiral turns, outer radius (x puff radius, measured over the surface)
    'SWIRL_W': (0.17, 0.06),                   # ridge tube radius at the outer end and the centre (x puff radius)
    'SWIRL_SIDES': 5, 'SWIRL_SEGS': 15,
    'SWIRL_N': [(0.8, 1), (1.05, 2), (9, 3)],   # swirls per puff by radius (up to r: n); extra swirls fan round the main one
    'SWIRL_FAN': 0.62, 'SWIRL_SMALL': 0.6,
    'SWIRL_FACE': (0.0, -1.0, 0.45),           # swirls face the front and up (blended with the puff's outward side)
    # dark leafy clumps: chunky toy leaf plates over a coarse fill (as in the normal tree, fewer and bigger leaves)
    'FILL': 0.86, 'PLATES': 34, 'PLATE_MIN': 14, 'HIDDEN': 0.85, 'PLATE_R': 0.36,
    'PLATE_INSET': 0.92, 'PLATE_OUT': 0.7, 'PLATE_DOWN': 0.1, 'JIT': 0.05,
    'BUMPS': 6, 'BUMP_H': 0.2, 'BUMP_K': 6.0,
    # stump
    'STUMP_H': 0.8,
    'CHIPS': [(0.62, 0.85, 20), (-1.09, -0.36, 150), (-0.0, -1.1, 75), (0.95, -0.31, 200)],   # (x, y, rot): in the gaps between the root toes
    'CHIP': (0.44, 0.24, 0.12),   # chunky chip length, width, thick edge
    'RINGS': (1.8, 0.035),       # growth-ring swirl on the cut: turns, ridge radius
}
COL = {'Bark_Brown': (126, 120, 56), 'Leaf_Light': (168, 182, 82), 'Leaf_Dark': (90, 130, 54), 'Leaf_Deep': (50, 80, 26),
       'Timber_Cut': (232, 204, 146), 'Timber_Chip': (206, 170, 110)}
STATES = ['standing', 'stump']
RND = random.Random(7)


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
        b.inputs['Roughness'].default_value = 0.85
        m.use_backface_culling = False          # exported double-sided: leaf plates show from both faces
        MATS[name] = m
    return MATS[name]


def make(name, verts, faces, material):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(Vector(v) * P['SCALE']) for v in verts], [], faces); me.validate(); me.update()
    for p in me.polygons:
        p.use_smooth = False
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(mat(material))
    bpy.context.scene.collection.objects.link(ob)
    return ob


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


def bezier(pts, n):
    """Catmull-Rom through pts, n samples."""
    P_ = [Vector(p) for p in pts]; P_ = [P_[0] * 2 - P_[1]] + P_ + [P_[-1] * 2 - P_[-2]]
    out = []
    for i in range(n):
        s = i / (n - 1) * (len(pts) - 1); k = min(int(s), len(pts) - 2); t = s - k
        p0, p1, p2, p3 = P_[k], P_[k + 1], P_[k + 2], P_[k + 3]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    return out


def tube(path, r0, r1, sides=6, cap0=False, cap1=True, jit=0.08):
    rings = []
    for i, c in enumerate(path):
        t = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]; u, v = frame(t)
        r = r0 + (r1 - r0) * (i / (len(path) - 1)) ** 0.8
        rings.append([c + (u * math.cos(a) + v * math.sin(a)) * r * (1 + RND.uniform(-jit, jit))
                      for a in (2 * math.pi * k / sides + i * 0.4 for k in range(sides))])
    return loft(rings, cap0, cap1)


def merge(*vfs):
    V, F = [], []
    for v, f in vfs:
        o = len(V); V += list(v); F += [tuple(i + o for i in face) for face in f]
    return V, F


# ------------------------------------------------------------------ parts
def trunk_rings(top=None):
    """Lofted trunk with lobed root buttresses that twist as they rise. top: cut height (stump) or None."""
    path = [Vector(p) for p in P['TRUNK']]; n = P['RING_N']; L = P['LOBES']; rings = []
    zs = [p.z for p in path]
    if top is not None:     # resample the stations below the cut
        stations = [z for z in zs if z < top] + [top]
    else:
        stations = zs
    for z in stations:
        # interpolate station data at height z
        j = max(0, min(len(zs) - 2, max(i for i in range(len(zs)) if zs[i] <= z)))
        f = (z - zs[j]) / (zs[j + 1] - zs[j])
        c = path[j].lerp(path[j + 1], f)
        r = P['TRUNK_R'][j] + (P['TRUNK_R'][j + 1] - P['TRUNK_R'][j]) * f
        fl = P['FLARE'][j] + (P['FLARE'][j + 1] - P['FLARE'][j]) * f
        tw = math.radians(P['TWIST']) * z / zs[-1] + math.radians(P['LOBE_PHASE'])
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n
            lobe = (0.5 + 0.5 * math.cos(L * (a - tw))) ** P['LOBE_POW']   # rounded buttress ridges
            rr = r * (1 + P['RIDGE'] * math.cos(L * (a - tw))) + fl * lobe
            rr *= 1 + RND.uniform(-0.04, 0.04)
            ring.append(c + Vector((math.cos(a) * rr, math.sin(a) * rr, 0)))
        if z == 0:  # feet sit on the ground
            ring = [Vector((p.x, p.y, 0.0)) for p in ring]
        elif z < 0.5:   # toes swell upward toward their tips: rounded feet
            ring = [p + Vector((0, 0, P['TOE_LIFT'] * ((p - c).length - r) / max(P['FLARE'][0], 1e-3) * (1 - z / 0.5))) for p in ring]
        rings.append(ring)
    return rings


def build_bark():
    rings = trunk_rings()
    parts = [loft(rings, True, False)]
    limbs = []
    for pts in P['LIMBS']:
        path = bezier(pts, 6); limbs.append(path)
        parts.append(tube(path, *P['LIMB_R'], sides=6))
    for li, s, end in P['TWIGS']:
        path = limbs[li]; c = path[int(s * (len(path) - 1))]
        mid = c.lerp(Vector(end), 0.5) + Vector((0, 0, 0.15))
        parts.append(tube(bezier([c, mid, Vector(end)], 4), *P['TWIG_R'], sides=5))
    make('trunk', *merge(*parts), 'Bark_Brown')


def lumpy(c, r, seed, sub=None, nb=None, h=None, k=None):
    """a soft blob: icosphere with nb broad bumps, flattened underneath"""
    rnd = random.Random(seed)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub or P['PUFF_SUB'], radius=1.0)
    bumps = []
    for _ in range(P['BUMPS'] if nb is None else nb):
        d = Vector((rnd.gauss(0, 1), rnd.gauss(0, 1), rnd.gauss(0, 1) * 0.7 + 0.35)).normalized()
        bumps.append((d, (P['BUMP_H'] if h is None else h) * rnd.uniform(0.6, 1.2)))
    V = []
    for v in bm.verts:
        d = v.co.normalized(); s = 1.0
        for b, hh in bumps:
            s += hh * max(0.0, d.dot(b)) ** (P['BUMP_K'] if k is None else k)
        s *= 1 + rnd.uniform(-P['JIT'], P['JIT'])
        p = d * s * r
        if p.z < 0:
            p.z *= P['SQUASH']
        V.append(c + p)
    F = [tuple(v.index for v in f.verts) for f in bm.faces]; bm.free()
    return V, F


OTHERS = []
GROUPS = {}


def clump_centre(x, y, z):
    f = P['FORK_Z']
    return Vector((x * P['CROWN_SX'], y * P['CROWN_SY'], f + (z - f) * P['CROWN_SZ'] + P['CROWN_DZ']))


def build_crown():
    OTHERS[:] = [(clump_centre(x, y, z), r) for x, y, z, r, m in P['CLUMPS']]
    for i, (x, y, z, r, m) in enumerate(P['CLUMPS']):
        c = clump_centre(x, y, z)
        if m == 'D':
            leafy_clump(i, c, r, m)
        else:
            swirl_puff(i, c, r, 'Leaf_Light' if m == 'S' else 'Leaf_Dark')


def swirl(c, r, d, sz, rnd):
    """a tapered spiral ridge lying on the puff surface round direction d"""
    u, v = frame(d); spin = rnd.uniform(0, 2 * math.pi)
    tmax = 2 * math.pi * P['SWIRL_TURNS']; n = P['SWIRL_SEGS']; path = []
    for k in range(n):
        t = k / (n - 1)                         # 0 = outer end, 1 = the curled centre
        th = spin + t * tmax; ang = (P['SWIRL_R'] * (1 - t) ** 0.9 + 0.06) * sz
        dirn = (d * math.cos(ang) + (u * math.cos(th) + v * math.sin(th)) * math.sin(ang)).normalized()
        p = dirn * blob_surface([(Vector(), r * (1 + P['PUFF_BUMP_H'] * 0.5))], dirn) * 0.97
        if p.z < 0:
            p.z *= P['SQUASH']
        path.append(c + p)
    w0, w1 = P['SWIRL_W']
    return tube(path, w0 * r * sz ** 0.5, w1 * r * sz ** 0.5, sides=P['SWIRL_SIDES'], cap0=True, cap1=True, jit=0.0)


def swirl_puff(i, c, r, mname):
    """a plump cloud puff with a raised spiral ridge (a cinnamon roll) on the side that faces out and to the front"""
    parts = [lumpy(c, r, 100 + i, P['PUFF_SUB'], P['PUFF_BUMPS'], P['PUFF_BUMP_H'], P['PUFF_BUMP_K'])]
    if P['SWIRL']:
        out = Vector((c.x, c.y - 0.0, 0)); out = out.normalized() if out.length > 0.2 else Vector((0, -1, 0))
        d = (out + Vector(P['SWIRL_FACE']) * (1.3 if c.y < 0.5 else 0.0) + Vector((0, 0, 0.45))).normalized()
        if c.y >= 0.5:      # back puffs: swirl to the back and up
            d = (out * 0.6 + Vector((0, 1, 0.7))).normalized()
        u, v = frame(d); rnd = random.Random(900 + i)
        ns = next(n for rmax, n in P['SWIRL_N'] if r <= rmax)
        dirs = [(d, 1.0)] if ns == 1 else [((d + (u * math.cos(f) + v * math.sin(f)) * P['SWIRL_FAN']).normalized(), P['SWIRL_SMALL'])
                                            for f in (2 * math.pi * j / ns + rnd.uniform(0, 1) for j in range(ns))]
        for d, sz in dirs:
            parts.append(swirl(c, r, d, sz, rnd))
    GROUPS.setdefault(mname, []).extend(parts)


# pointed leaf plate outline: (angle deg, radius), tip along +axis; 8 triangles round a centre point
LEAF = [(0, 1.0), (35, 0.8), (80, 0.62), (130, 0.45), (180, 0.32), (-130, 0.45), (-80, 0.62), (-35, 0.8)]   # a round-ended toy leaf


def plate(center, axis, normal, r, rnd):
    side = normal.cross(axis).normalized(); normal = axis.cross(side).normalized()
    V = [center + normal * (0.12 * r)]       # a puffed ridge along the middle: chubby toy leaves
    for a, k in LEAF:
        a = math.radians(a); k *= 1 + rnd.uniform(-0.1, 0.1)
        x, y = math.cos(a) * k * r, math.sin(a) * k * r
        V.append(center + axis * x + side * y - normal * (0.05 * r * abs(y) / r))
    n = len(LEAF)
    return V, [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]


def blob_surface(blobs, d):
    """distance from the clump centre to the outside of its blobs (spheres) along the unit direction d"""
    best = 0.0
    for b, rb in blobs:
        t = d.dot(b); q = b.length_squared - t * t
        if q < rb * rb:
            best = max(best, t + math.sqrt(rb * rb - q))
    return best


def leafy_clump(i, c, r, m):
    rnd = random.Random(500 + i)
    blobs = [(Vector(), r)]
    GROUPS.setdefault('Leaf_Deep', []).append(lumpy(c, r * P['FILL'], 100 + i, 1, 3, 0.25, 4.0))
    n = max(P['PLATE_MIN'], round(P['PLATES'] * r * r)); ga = math.pi * (3 - math.sqrt(5))
    for k in range(n):       # fibonacci directions over the sphere, a little jittered
        z = 1 - 2 * (k + 0.5) / n; rho = math.sqrt(max(0.0, 1 - z * z)); th = ga * k + i
        d = Vector((rho * math.cos(th), rho * math.sin(th), z)) + Vector([rnd.uniform(-0.12, 0.12) for _ in range(3)])
        d.normalize()
        p = d * blob_surface(blobs, d) * P['PLATE_INSET']
        if d.z < 0:
            p.z *= P['SQUASH']
        if any((c + p - oc).length < orr * P['HIDDEN'] for oc, orr in OTHERS if (oc - c).length > 1e-3):
            continue        # buried inside a neighbouring clump: never seen, skip it
        down = Vector((0, 0, -1)) - d * (-d.z)
        down = down.normalized() if down.length > 0.2 else Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), 0)).normalized()
        ax = (down + d * P['PLATE_OUT'] + Vector((0, 0, -P['PLATE_DOWN']))).normalized()
        ax = Matrix.Rotation(rnd.uniform(-0.6, 0.6), 3, d) @ ax
        nrm = (d + Vector((0, 0, 0.5))).normalized()
        GROUPS.setdefault('Leaf_Dark', []).append(plate(c + p, ax, nrm, P['PLATE_R'] * rnd.uniform(0.85, 1.15), rnd))


def finish_crown():
    for name in ('Leaf_Light', 'Leaf_Dark', 'Leaf_Deep'):
        if GROUPS.get(name):
            make({'Leaf_Light': 'leaves_light', 'Leaf_Dark': 'leaves_dark', 'Leaf_Deep': 'crown_fill'}[name],
                 *merge(*GROUPS[name]), name)
    GROUPS.clear()


def build_stump():
    rings = trunk_rings(top=P['STUMP_H'])
    # slant the cut a little, as an axe leaves it
    top = rings[-1]; c = sum(top, Vector()) / len(top)
    # round the cut: the buttress ridges slope away below it, the cut face itself is a near-round disc
    rc = sum((p - c).length for p in top) / len(top) * 0.95
    def rnd(p):
        d = p - c; d.z = 0; return c + d * min(1.0, rc / max(d.length, 1e-6) * (1 + RND.uniform(-0.03, 0.03)))
    rings[-1] = [rnd(p) for p in top]; rings[-1] = [Vector((p.x, p.y, p.z + 0.08 * (p.x - c.x))) for p in rings[-1]]
    make('stump', *loft(rings, True, False), 'Bark_Brown')
    inner = [c.lerp(p, 0.93) + Vector((0, 0, 0.012)) for p in rings[-1]]
    V = inner + [c + Vector((0, 0, 0.02))]; n = len(inner)
    make('stump_cut', V, [(k, (k + 1) % n, n) for k in range(n)], 'Timber_Cut')
    # a growth-ring swirl on the cut face (the crown's cinnamon-roll motif, in the chip colour)
    turns, w = P['RINGS']; m = 22; tc = c + Vector((0, 0, 0.02)); path = []
    for k in range(m):
        t = k / (m - 1); th = t * 2 * math.pi * turns; rho = rc * 0.78 * (1 - t) + 0.03
        p = tc + Vector((math.cos(th) * rho, math.sin(th) * rho, 0)); p.z += 0.08 * (p.x - c.x)
        path.append(p)
    make('stump_rings', *tube(path, w, w * 0.7, sides=4, cap0=True, cap1=True, jit=0.0), 'Timber_Chip')
    for i, (x, y, rot) in enumerate(P['CHIPS']):
        # a wedge chip: flat on the ground, thin at one edge
        a = math.radians(rot); R = Matrix.Rotation(a, 3, 'Z')
        L, W, H = P['CHIP']
        base = [(-L / 2, -W / 2, 0), (L / 2, -W / 2, 0), (L / 2, W / 2, 0), (-L / 2, W / 2, 0),
                (-L / 2, -W / 2, H), (L / 2, -W / 2, H * 0.3), (L / 2, W / 2, H * 0.3), (-L / 2, W / 2, H)]
        V = [R @ Vector(p) + Vector((x, y, 0)) for p in base]
        F = [(3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
        make(f'chip_{i}', V, F, 'Timber_Chip')


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); RND.seed(7)
    if state == 'standing':
        build_bark(); build_crown(); finish_crown()
    else:
        build_stump()


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


def tris():
    n = 0
    for ob in bpy.context.scene.objects:
        if ob.type == 'MESH':
            dg = bpy.context.evaluated_depsgraph_get(); m = ob.evaluated_get(dg).to_mesh()
            m.calc_loop_triangles(); n += len(m.loop_triangles); ob.evaluated_get(dg).to_mesh_clear()
    return n


def main():
    for st in sys.argv[1:] or STATES:
        build(st)
        export(os.path.join(HERE, 'variants', f'{st}.glb'))
        if st == 'standing':
            export(os.path.join(HERE, 'tree-standing-charming.glb'))
        print('state', st, 'triangles', tris())


if __name__ == '__main__':
    main()
