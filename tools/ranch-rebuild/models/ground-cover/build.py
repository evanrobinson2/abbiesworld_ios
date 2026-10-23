"""Ranch ground-cover kit (remaster item R1): six grass tufts, a clover patch, a wildflower clump and a mossy path edge,
one GLB per piece, built to be instanced hundreds of times across the Ranch tile.

Tufts are rings of strap blades with blunt round ends (3 triangles a blade, 40 blades a tuft; see TUFTS), not spikes.
Normals are authored: every vertex takes a dome normal from a point below the clump blended with up, and every triangle
is wound so its front agrees with them, so a tuft shades like one soft rounded mound instead of a bed of flat-shaded
facets, and on the double-sided material the out-and-up side is always the front. Colour is a vertex colour (COLOR_0,
the material's base colour reads it) running from a darker foliage-leaning base to a lighter meadow tip; each piece
drifts between meadow #a6b087 and foliage #6e9440 by its own amount. The `_sway` float attribute (glTF `_SWAY`,
three.js geometry attribute `_sway`) is 0 at the root and 1 at the tip of every blade, stem and flower, so the game can
bend tips in the wind. Materials are named Grass_* / Clover_* / Flower_* / Moss_* / Stone_* for the game's roles.

Z up, metres, origin at the centre of the base on the ground, front -Y. No animation.
usage: python build.py [piece ...]      (writes <piece>.glb next to this file; all pieces when none is named)
"""
import os, sys, math, random
import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))

MEADOW = (0xa6, 0xb0, 0x87)
FOLIAGE = (0x6e, 0x94, 0x40)

# Tufts. Each tuft is 4 nested "crowns": rings of blades rooted on small circles on the ground (radius `r` x h), each
# blade a strap from its ring segment out to a blunt round end (3 triangles: two for the strap, one wide-angle cap).
# Inner rings stand upright and tall; outer rings splay low and short, so the clump has a broad base and reads as one
# soft dome: 40 blades in 120 triangles. Double-sided; normals are a dome normal (from a point below the clump)
# blended with up, and every triangle is wound so its front agrees with them.
# crowns: (blades, root ring radius / h, tilt from vertical deg, length / h). bw = blade half-width / h at the tip.
# h = height (m), drift = 0 meadow .. 1 foliage for the tip colour, flat = depth squash (y), jit = random wobble.
def _cr(t, L, r=(0.015, 0.04, 0.07, 0.10), n=(8, 10, 11, 11)):
    return [(n[k], r[k], t[k], L[k]) for k in range(4)]


TUFTS = {
    'tuft-a': dict(seed=3, h=0.30, bw=0.10, drift=0.55, flat=0.85, jit=0.22, crowns=_cr((20, 40, 60, 80), (1, .96, .86, .70))),
    'tuft-b': dict(seed=5, h=0.16, bw=0.12, drift=0.70, flat=0.85, jit=0.28, crowns=_cr((22, 42, 62, 80), (1, .96, .88, .72))),
    'tuft-c': dict(seed=8, h=0.16, bw=0.12, drift=0.30, flat=0.85, jit=0.18, crowns=_cr((22, 42, 62, 80), (1, .97, .90, .74))),
    'tuft-d': dict(seed=11, h=0.34, bw=0.09, drift=0.60, flat=0.85, jit=0.25, crowns=_cr((16, 34, 54, 76), (1, .95, .84, .66))),
    'tuft-e': dict(seed=13, h=0.20, bw=0.10, drift=0.45, flat=0.85, jit=0.22, crowns=_cr((16, 32, 50, 70), (1, .96, .86, .68))),
    'tuft-f': dict(seed=17, h=0.33, bw=0.022, drift=0.25, flat=0.75, jit=0.35,           # wispy: thin straps, few rings
                   crowns=_cr((8, 26, 46, 68), (1, .92, .84, .74), r=(0.02, 0.04, 0.06, 0.08))),
}
CLOVER = dict(seed=4, trefoils=22, ell=(0.30, 0.20), mound=0.05, leaflet=(0.058, 0.070), heads=7, head_h=(0.09, 0.15),
              head_r=(0.026, 0.032))
WILD = dict(seed=9, stems=16, h=(0.15, 0.26), spread=0.13, flowers=20, lilac=0.3,
            leafy=[(9, 0.012, 22, 0.16), (11, 0.025, 46, 0.15), (11, 0.04, 70, 0.12)])   # crowns: (blades, ring r m, tilt deg, length m)
PATH = dict(seed=2, ell=(0.38, 0.15), h=0.085, segs=12, pebbles=4, blades=5)


def srgb(c):
    return np.array(c, float) / 255.0


def mix(a, b, t):
    return a * (1 - t) + b * t


def lin(c):
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


# ------------------------------------------------------------------ mesh assembly
class Part:
    """Triangles for one material: positions, per-vertex colour (sRGB), sway and an authored normal."""
    def __init__(self, mat, single=False):
        self.mat = mat; self.single = single; self.v, self.f, self.c, self.s, self.n = [], [], [], [], []

    def add(self, verts, faces, cols, sway, normals):
        o = len(self.v)
        self.v += [tuple(map(float, p)) for p in verts]; self.f += [tuple(i + o for i in t) for t in faces]
        self.c += [tuple(map(float, c[:3])) for c in cols]   # sRGB; linearised in obj()
        self.s += list(map(float, sway))
        self.n += [tuple(map(float, x / max(1e-9, np.linalg.norm(x)))) for x in normals]

    def tris(self):
        return len(self.f)

    def obj(self, name):
        me = bpy.data.meshes.new(name); me.from_pydata(self.v, [], self.f); me.update()
        for p in me.polygons:
            p.use_smooth = True
        col = me.color_attributes.new('Color', 'FLOAT_COLOR', 'POINT')
        for i, c in enumerate(self.c):
            col.data[i].color = tuple(lin(c)) + (1.0,)
        me.color_attributes.active_color = col
        sw = me.attributes.new('_sway', 'FLOAT', 'POINT')
        assert len(self.s) == len(self.v)
        sw.data.foreach_set('value', self.s)
        me.normals_split_custom_set_from_vertices(self.n)
        me.materials.append(material(self.mat, self.single))
        o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
        return o


def material(name, single=False):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'Color'
    nt.links.new(ca.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.85
    m.use_backface_culling = single         # blades and petals are doubleSided cards; moss and pebbles are closed, single-sided
    return m


# ------------------------------------------------------------------ blade
def blade(part, root, azim, tilt0, tilt1, length, width, base_col, tip_col, dome_c, rng, cap=True, nfrac=0.65,
          twist=0.0, prof=(0.40, 0.85, 1.0)):
    """A curved ribbon leaning towards azim, tilting from tilt0 at the root to tilt1 at the tip (radians), with a
    3-triangle round cap. 9 vertices, 7 triangles. Its front face points outward (away from the clump axis)."""
    d = np.array([math.cos(azim), math.sin(azim), 0.0])
    side = np.array([-math.sin(azim + twist), math.cos(azim + twist), 0.0])
    pts = [np.array(root, float)]; steps = 40
    for k in range(steps):                          # integrate the spine
        a = tilt0 + (tilt1 - tilt0) * ((k + 0.5) / steps) ** 1.4
        pts.append(pts[-1] + (length / steps) * (d * math.sin(a) + np.array([0, 0, 1.0]) * math.cos(a)))
    sp = lambda t: pts[int(round(t * steps))]
    w0, w1, w2 = [width * x / 2 for x in prof]
    V = [sp(0) - side * w0, sp(0) + side * w0, sp(.45) - side * w1, sp(.45) + side * w1, sp(.8) - side * w2,
         sp(.8) + side * w2, sp(.93) - side * w2 * 0.72, sp(.93) + side * w2 * 0.72, sp(1.0)]
    T = [0, 0, .45, .45, .8, .8, .93, .93, 1.0]
    F = [(0, 1, 3), (0, 3, 2), (2, 3, 5), (2, 5, 4), (4, 5, 7), (4, 7, 8), (4, 8, 6)]
    fn = np.cross(V[1] - V[0], V[2] - V[0])
    out = np.array([V[4][0] - dome_c[0], V[4][1] - dome_c[1], 0.0])
    if np.dot(fn, out if np.linalg.norm(out) > 1e-6 else d) < 0:
        F = [(a, c, b) for a, b, c in F]; fn = -fn
    fn = fn / max(1e-9, np.linalg.norm(fn))
    N = [(1 - nfrac) * fn + nfrac * (v - dome_c) / max(1e-9, np.linalg.norm(v - dome_c)) for v in V]
    C = [mix(base_col, tip_col, t ** 0.8) for t in T]
    part.add(V, F, C, T, N)


def crown(part, n, r0, tilt, L, bw, base_col, tip_col, dome_c, rng, jit, phase, z0=0.0):
    """A ring of n blades rooted on a circle of radius r0: blade i is a strap from ring vertices i and i+1 out to a
    blunt round end (tL, apex, tR). 4 vertices and 3 triangles per blade. Each triangle is wound to agree with its
    authored (dome) normal, so on a double-sided material the side facing out and up is the front."""
    up = np.array([0, 0, 1.0])
    def ray(az, t):
        t = math.radians(min(86.0, t))
        return np.array([math.cos(az) * math.sin(t), math.sin(az) * math.sin(t), math.cos(t)])
    sec = 2 * math.pi / n
    V, T, C, F = [], [], [], []
    for i in range(n):                                # ring
        a = phase + i * sec
        V.append(np.array([r0 * math.cos(a), r0 * math.sin(a), z0])); T.append(0.0); C.append(base_col)
    for i in range(n):
        az = phase + (i + 0.5) * sec + rng.uniform(-jit, jit) * sec * 0.4
        tl = tilt * (1 + rng.uniform(-jit, jit) * 0.6) + rng.uniform(-4, 4)
        ll = L * (1 + rng.uniform(-jit, jit) * 0.8)
        sh = 1 + rng.uniform(-0.09, 0.09)              # each blade its own shade, so blades read apart
        root = (V[i] + V[(i + 1) % n]) / 2
        wb = bw * rng.uniform(0.85, 1.15)
        side = np.array([-math.sin(az), math.cos(az), 0.0])
        c = root + ray(az, tl) * (ll - 0.55 * wb) * 0.6 + ray(az, tl + 8) * (ll - 0.55 * wb) * 0.4   # bows outward
        top = root + ray(az, tl) * ll * 0.6 + ray(az, tl + 10) * ll * 0.4
        V += [c - side * wb, top, c + side * wb]; T += [0.9, 1.0, 0.9]
        C += [mix(base_col, tip_col * sh, 0.85), tip_col * sh, mix(base_col, tip_col * sh, 0.85)]
        r_a, r_b = i, (i + 1) % n; tL, tT, tR = n + 3 * i, n + 3 * i + 1, n + 3 * i + 2
        F += [(r_a, r_b, tR), (r_a, tR, tL), (tL, tR, tT)]
    N = [0.5 * up + 0.5 * (v - dome_c) / max(1e-9, np.linalg.norm(v - dome_c)) for v in V]
    fixed = []
    for f in F:                   # wind each triangle to agree with its authored normals (front = the lit side)
        a, b, c = (V[k] for k in f)
        if np.dot(np.cross(b - a, c - a), N[f[0]] + N[f[1]] + N[f[2]]) < 0:
            f = (f[0], f[2], f[1])
        fixed.append(f)
    part.add(V, fixed, C, T, N)


# ------------------------------------------------------------------ pieces
def tuft(name, P):
    rng = random.Random(P['seed']); h = P['h']
    grass = Part('Grass_Tuft')
    tip = mix(srgb(MEADOW), srgb(FOLIAGE), P['drift'] * 0.6) * 1.06
    base = mix(srgb(FOLIAGE), srgb(MEADOW), 0.3) * 0.78
    dome = np.array([0, 0, -0.5 * h])
    for j, (n, r0, tilt, L) in enumerate(P['crowns']):
        shade = 1.06 - 0.04 * j                       # inner (upright, top) crowns a touch lighter
        crown(grass, n, r0 * h, tilt, L * h, P['bw'] * h, base, tip * shade, dome, rng, P['jit'], rng.uniform(0, 6.28))
    if P['flat'] != 1:
        grass.v = [(x, y * P['flat'], z) for x, y, z in grass.v]
    fit_height([grass], h)
    return [grass]


SIDES = 8


def core(part, r, ch, flat, c_lo, c_hi, dome_c):
    """A low 8-sided dome under the blades (17 vertices, 24 triangles); sway 0 at the ground, 0.3 at the top."""
    V = [np.array([0, 0, ch])]
    for zf, rf, off in ((0.72, 0.72, 0.5), (0.0, 1.0, 0.0)):
        for k in range(SIDES):
            a = (k + off) * 2 * math.pi / SIDES
            V.append(np.array([math.cos(a) * r * rf, math.sin(a) * r * rf, ch * zf]))
    S = SIDES
    F = [(0, 1 + k, 1 + (k + 1) % S) for k in range(S)]
    for k in range(S):
        a, b = 1 + k, 1 + (k + 1) % S; c, d = 1 + S + k, 1 + S + (k + 1) % S
        F += [(a, c, d), (a, d, b)]
    N = [v - dome_c for v in V]
    C = [c_hi] + [mix(c_lo, c_hi, .6)] * S + [c_lo] * S
    part.add(V, F, C, [0.3] + [0.18] * S + [0.0] * S, N)


def fit_height(parts, h):
    top = max(v[2] for p in parts for v in p.v)
    s = h / top
    for p in parts:
        p.v = [(x * s, y * s, z * s) for x, y, z in p.v]


def leaflet(part, centre, azim, tilt, L, base_col, tip_col, dome_c, sway0, sway1):
    """A heart-ish rounded leaflet: a 3-triangle fan from the stalk point (5 vertices)."""
    d = np.array([math.cos(azim) * math.cos(tilt), math.sin(azim) * math.cos(tilt), math.sin(tilt)])
    side = np.array([-math.sin(azim), math.cos(azim), 0.0])
    c = np.array(centre, float)
    V = [c, c + d * L * 0.55 - side * L * 0.42, c + d * L * 0.98 - side * L * 0.22, c + d * L * 0.98 + side * L * 0.22,
         c + d * L * 0.55 + side * L * 0.42]
    F = [(0, 1, 2), (0, 2, 3), (0, 3, 4)]
    fn = np.cross(V[1] - V[0], V[2] - V[0])
    if fn[2] < 0:
        F = [(a, cc, b) for a, b, cc in F]
    N = [0.5 * np.array([0, 0, 1.0]) + 0.5 * (v - dome_c) / np.linalg.norm(v - dome_c) for v in V]
    C = [base_col, mix(base_col, tip_col, .8), tip_col, tip_col, mix(base_col, tip_col, .8)]
    part.add(V, F, C, [sway0, sway1 * .7, sway1, sway1, sway1 * .7], N)


def head(part, centre, r, col_lo, col_hi, sway):
    """A clover / flower ball: a squashed octahedron (6 vertices, 8 triangles) with smooth outward normals."""
    c = np.array(centre, float)
    V = [c + np.array([0, 0, r * 0.80]), c + np.array([r, 0, 0]), c + np.array([0, r, 0]), c + np.array([-r, 0, 0]),
         c + np.array([0, -r, 0]), c - np.array([0, 0, r * 0.55])]
    F = [(0, 1, 2), (0, 2, 3), (0, 3, 4), (0, 4, 1), (5, 2, 1), (5, 3, 2), (5, 4, 3), (5, 1, 4)]
    N = [v - c for v in V]
    C = [col_hi, col_hi, col_hi, col_hi, col_hi, col_lo]
    part.add(V, F, C, [sway] * 6, N)


def stem(part, a, b, w, col_a, col_b, s0, s1):
    """A flat 2-triangle ribbon stem facing the camera axis sideways (4 vertices)."""
    a, b = np.array(a, float), np.array(b, float)
    axis = b - a; side = np.cross(axis, [0, 0, 1.0])
    if np.linalg.norm(side) < 1e-6:
        side = np.array([1.0, 0, 0])
    side = np.array([1.0, 0, 0]) * 0.7 + side / np.linalg.norm(side) * 0.3
    side = side / np.linalg.norm(side) * w / 2
    V = [a - side, a + side, b + side * 0.7, b - side * 0.7]
    F = [(0, 1, 2), (0, 2, 3)]
    n = np.cross(side, axis); n = n if n[1] < 0 else -n
    N = [n + np.array([0, 0, 0.3 * np.linalg.norm(n)])] * 4
    part.add(V, F, [col_a, col_a, col_b, col_b], [s0, s0, s1, s1], N)


def clover_patch(P=CLOVER):
    rng = random.Random(P['seed'])
    leaf, flw = Part('Clover_Leaf'), Part('Flower_White')
    ex, ey = P['ell']; dome = np.array([0, 0, -0.25])
    lb, lt = srgb((78, 118, 56)), srgb((140, 172, 92))
    for i in range(P['trefoils']):
        u = (i + 0.5) / P['trefoils']; r = math.sqrt(u) * 0.92; ang = i * 2.39996 + rng.uniform(-.3, .3)
        cx, cy = ex * r * math.cos(ang), ey * r * math.sin(ang)
        z = P['mound'] * (1 - r ** 2) ** 0.6 * rng.uniform(0.8, 1.15) + 0.006
        L = rng.uniform(*P['leaflet']); rot = rng.uniform(0, 2 * math.pi)
        tilt = math.radians(rng.uniform(5, 20) + 10 * r)
        shade = rng.uniform(0.85, 1.12)
        for k in range(3):
            leaflet(leaf, (cx, cy, z), rot + k * 2.0944, tilt, L, lb * shade, lt * shade, dome, 0.0, 0.25)
    for i in range(P['heads']):
        ang = i * 2.39996 + 0.7; r = math.sqrt((i + 0.5) / P['heads']) * 0.78
        cx, cy = ex * r * math.cos(ang), ey * r * math.sin(ang)
        hz = rng.uniform(*P['head_h']) * (1 - 0.35 * r)
        hr = rng.uniform(*P['head_r'])
        stem(leaf, (cx, cy, 0.01), (cx + rng.uniform(-.01, .01), cy, hz - hr * 0.6), 0.006, lb, lt, 0.0, 0.9)
        head(flw, (cx, cy, hz), hr, srgb((176, 186, 150)), srgb((236, 236, 220)), 1.0)
    # a flat dark dome under the leaves so the patch reads as one mat (8-sided, 24 triangles, squashed to the ellipse)
    k = Part('x'); core(k, 1.0, P['mound'] * 0.9, 1, lb * 0.75, lb, dome)
    leaf.add([(x * ex * 0.85, y * ey * 0.85, z) for x, y, z in k.v], k.f, [np.array(c) for c in k.c], [0.0] * len(k.v),
             k.n)
    return [leaf, flw]


def wildflower_clump(P=WILD):
    rng = random.Random(P['seed'])
    stems, yel, lil = Part('Grass_Stem'), Part('Flower_Yellow'), Part('Flower_Lilac')
    sb, st = srgb((72, 98, 48)), srgb((128, 150, 78))
    dome = np.array([0, 0, -0.1])
    tops = []
    for i in range(P['stems']):
        ang = i * 2.39996; r = P['spread'] * math.sqrt((i + 0.5) / P['stems'])
        a = np.array([r * math.cos(ang), r * math.sin(ang) * 0.8, 0.0])
        H = rng.uniform(*P['h']) * (1 - 0.3 * r / P['spread'])
        lean = np.array([math.cos(ang), math.sin(ang) * 0.6, 0]) * (0.38 * H) * (0.4 + r / P['spread'])
        m = a + lean * 0.4 + np.array([0, 0, H * 0.55]); b = a + lean + np.array([0, 0, H])
        stem(stems, a, m, 0.006, sb, mix(sb, st, .55), 0.0, 0.55)
        stem(stems, m, b, 0.0045, mix(sb, st, .55), st, 0.55, 1.0)
        tops.append((b, m))
    # flowers: one on each stem top, the rest on short side twigs off the stem's middle
    for i in range(P['flowers']):
        b, m = tops[i % len(tops)]
        if i >= len(tops):
            off = np.array([rng.uniform(-.04, .04), rng.uniform(-.03, .03), rng.uniform(.02, .05)])
            c = m + (b - m) * rng.uniform(0.3, 0.7) + off
            stem(stems, m + (b - m) * 0.3, c, 0.0035, st, st, 0.7, 1.0)
        else:
            c = b
        lilac = rng.random() < P['lilac']
        part = lil if lilac else yel
        cl = srgb((186, 166, 214)) if lilac else srgb((236, 200, 66))
        flower(part, c, rng.uniform(0.015, 0.02), cl, rng)
    # leafy base: three crowns of narrow round-ended leaves (the tufts' construction)
    leaves = Part('Grass_Leaf')
    for n, r0, tilt, L in P['leafy']:
        crown(leaves, n, r0, tilt, L, 0.009, sb * 0.9, st * 1.05, dome, rng, 0.3, rng.uniform(0, 6.28))
    leaves.v = [(x, y * 0.8, z) for x, y, z in leaves.v]
    return [stems, leaves, yel, lil]


def flower(part, c, r, col, rng):
    """A 5-petal cup: a pentagon fan with the rim lifted and alternate points pulled in (6 vertices, 5 triangles)."""
    c = np.array(c, float); rot = rng.uniform(0, 2 * math.pi)
    tilt = np.array([rng.uniform(-.3, .3), -0.45, 1.0]); up = tilt / np.linalg.norm(tilt)   # faces up and a bit to the front
    e1 = np.cross(up, [0, 0, 1.0] if abs(up[2]) < .9 else [1.0, 0, 0]); e1 /= np.linalg.norm(e1); e2 = np.cross(up, e1)
    V = [c - up * r * 0.25]
    for k in range(5):
        a = rot + k * 2 * math.pi / 5
        V.append(c + (e1 * math.cos(a) + e2 * math.sin(a)) * r + up * r * 0.25)
    F = [(0, 1 + k, 1 + (k + 1) % 5) for k in range(5)]
    if np.dot(np.cross(V[F[0][1]] - V[0], V[F[0][2]] - V[0]), up) < 0:
        F = [(a, cc, b) for a, b, cc in F]
    N = [up] + [up * 0.7 + (v - c) / max(1e-9, np.linalg.norm(v - c)) * 0.3 for v in V[1:]]
    centre = mix(col, srgb((150, 130, 40)), 0.5)
    part.add(V, F, [centre] + [col * 1.03] * 5, [1.0] * 6, N)


def path_edge(P=PATH):
    """A low mossy berm along X; its front (-Y) edge is the path side, with a dirt rim and pebbles."""
    rng = random.Random(P['seed'])
    moss, peb, grass = Part('Moss_Path', True), Part('Stone_Pebble', True), Part('Grass_Meadow')
    ex, ey = P['ell']; S = P['segs']; H = P['h']
    mb, mt = srgb((92, 104, 38)), srgb((142, 152, 60))
    dirt = srgb((0xd4, 0xb4, 0x8a)) * 0.82
    def hump(x):     # two soft humps along the strip, the right one higher, as in the sheet
        return 0.68 + 0.32 * math.cos((x / ex) * 2.6 - 0.6)
    rings = [(0.0, 1.0), (0.45, 0.93), (0.78, 0.72), (0.94, 0.35), (1.06, 0.0)]   # (radius frac, height frac)
    V, C, Nn, Sw = [], [], [], []
    wob = [rng.uniform(0.92, 1.08) for _ in range(S)]
    for ri, (rf, hf) in enumerate(rings):
        cnt = 1 if rf == 0 else S
        for k in range(cnt):
            a = 2 * math.pi * k / S
            w = wob[k] if rf > 0 else 1
            x, y = ex * rf * math.cos(a) * w, ey * rf * math.sin(a) * w
            if y < 0:
                y *= 0.85     # front edge a little straighter (the path line)
            z = H * hf * hump(x) * (rng.uniform(0.86, 1.14) if 0 < rf < 1 else 1.0)   # lumpy moss
            V.append((x, y, z))
            # dome normal from the ellipse gradient, blended up
            gx, gy = 2 * x / ex ** 2, 2 * y / ey ** 2
            n = np.array([gx * H * 0.6, gy * H * 0.6, 1.0 + (1 - rf) * 1.5])
            Nn.append(n)
            c = mix(mb, mt, hf ** 0.7)
            if ri == len(rings) - 1 and y < 0:
                c = mix(c, dirt, 0.65)
            C.append(c); Sw.append(0.0)
    F = []
    for k in range(S):
        F.append((0, 1 + k, 1 + (k + 1) % S))
    for ri in range(1, len(rings) - 1):
        o0 = 1 + (ri - 1) * S; o1 = o0 + S
        for k in range(S):
            a, b = o0 + k, o0 + (k + 1) % S; c, d = o1 + k, o1 + (k + 1) % S
            F += [(a, c, d), (a, d, b)]
    moss.add(V, F, C, Sw, Nn)
    # pebbles along the front edge
    for i in range(P['pebbles']):
        x = -ex * 0.55 + i * ex * 0.42 + rng.uniform(-.04, .04)
        y = -ey * rng.uniform(0.85, 1.05)
        pebble(peb, (x, y, -0.006), rng.uniform(0.032, 0.045), rng)
    # a few round-tipped blades poking out of the top
    dome = np.array([0, 0, -0.2])
    for i in range(P['blades']):
        x = rng.uniform(-ex * 0.5, ex * 0.85); y = rng.uniform(-ey * 0.2, ey * 0.4)
        z = H * hump(x) * 0.85
        blade(grass, (x, y, z - 0.01), rng.uniform(0, 6.28), math.radians(5), math.radians(rng.uniform(8, 30)),
              rng.uniform(0.06, 0.10), 0.010, mb, mt, dome, rng)
    return [moss, peb, grass]


def pebble(part, c, r, rng):
    """A flat rounded stone: top vertex, a ring of 5 at mid height, a ring of 5 at the ground (11 v, 15 tris)."""
    c = np.array(c, float); rot = rng.uniform(0, 6.28); sx = rng.uniform(1.0, 1.5)
    V = [c + np.array([0, 0, r * 0.75])]
    for zf, rf in ((0.55, 0.8), (0.0, 1.0)):
        for k in range(5):
            a = rot + k * 2 * math.pi / 5 + (0.3 if zf == 0 else 0)
            V.append(c + np.array([math.cos(a) * r * rf * sx, math.sin(a) * r * rf, r * zf]))
    F = [(0, 1 + k, 1 + (k + 1) % 5) for k in range(5)]
    for k in range(5):
        a, b = 1 + k, 1 + (k + 1) % 5; cc, d = 6 + k, 6 + (k + 1) % 5
        F += [(a, cc, d), (a, d, b)]
    N = [(v - (c + np.array([0, 0, -r * 0.3]))) for v in V]
    lo, hi = srgb((150, 146, 134)), srgb((200, 194, 180))
    part.add(V, F, [hi] + [mix(lo, hi, .7)] * 5 + [lo] * 5, [0.0] * 11, N)


PIECES = dict({k: (lambda k=k: tuft(k, TUFTS[k])) for k in TUFTS},
              **{'clover-patch': clover_patch, 'wildflower-clump': wildflower_clump, 'path-edge': path_edge})
BUDGET = dict({k: 120 for k in TUFTS}, **{'clover-patch': 300, 'wildflower-clump': 300, 'path-edge': 200})


def export(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    parts = PIECES[name]()
    tris = sum(p.tris() for p in parts)
    for p in parts:
        if p.tris():
            p.obj(name.replace('-', '_') + '_' + p.mat.lower())
    out = os.path.join(HERE, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_animations=False, export_apply=True,
                              export_normals=True, export_vertex_color='ACTIVE', export_attributes=True,
                              export_yup=True)
    xs = np.array([v for p in parts for v in p.v])
    print('%-17s triangles %3d / %3d   size %.3f x %.3f x %.3f m' % (name, tris, BUDGET[name], *np.ptp(xs, 0)))
    assert tris <= BUDGET[name], name + ' over budget'
    return tris


if __name__ == '__main__':
    names = [a for a in sys.argv[1:] if a in PIECES] or list(PIECES)
    for n in names:
        export(n)
