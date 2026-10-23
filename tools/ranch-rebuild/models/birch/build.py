"""Weeping silver birch for the Ranch tile (replaces simulations/regional-assets/WW-139.glb).

A thin S-curved white trunk with black bark patches and a dark rough base, a few thin arching branches, and
long hanging curtains of faceted leaf-card ribbons in two greens, with gaps between them so the trunk shows.
Z up, metres, origin at the trunk base on the ground, front -Y. No animation (the game poses and sways trees).
usage: python build.py            (writes birch.glb next to this file)
"""
import os, math, random
import bpy, bmesh

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    seed=11,
    height=7.0,                 # top of the crown
    trunk_top=6.75,             # top of the leader
    trunk_r0=0.15, trunk_r1=0.115, trunk_rtop=0.03,   # radius at the ground, above the flare, at the top
    trunk_sides=7, trunk_rings=13,
    # S-curve of the trunk: (z, x, y) control points; x is left/right in the front view
    trunk_path=[(0.0, 0.0, 0.0), (1.2, 0.07, 0.02), (2.4, -0.06, 0.03), (3.6, -0.24, 0.0), (4.8, -0.30, -0.04),
                (6.0, -0.22, -0.02), (6.75, -0.16, 0.0)],
    base_dark_h=0.75, base_dark_jag=0.3,   # dark rough base band and how ragged its top edge is
    patches=36, patch_zmin=0.55, patch_zmax=5.2,
    # crown envelope: (z, radius) from the top down; curtains follow it
    crown=[(7.0, 0.3), (6.8, 0.85), (6.4, 1.3), (5.8, 1.6), (4.8, 1.8), (3.8, 1.8), (3.0, 1.7), (2.2, 1.55), (1.4, 1.4)],
    crown_k=0.95, crown_cx=-0.25, crown_cy=0.0, crown_lean=(0.12, -0.07),   # crown centre shift per metre above 4.5 m (-x, -y): top leans left as in the hero
    crown_sx=1.0, crown_sy=0.92,   # crown centre and x/y squash
    branches=12,                # main arching branches
    branch_zmin=3.7, branch_zmax=6.4,
    branch_r=0.04, branch_sides=3, branch_segs=6,
    strands_per_branch=6,       # leaf threads hanging from each branch
    attach_t=(0.55, 1.0),       # where along the branch the threads hang (0 trunk, 1 tip; the crest is near 0.8)
    fan_deg=9.0,                # threads of one branch spread over +-this azimuth; the rest is open
    inner_strands=10,
    card_len=0.26, card_w=0.22, card_turn=50, card_tilt=25, other_green=0.2,
    strand_bottom=(2.0, 4.2),   # thread tips end high and low
    long_bottom=(1.4, 2.0), long_side=0.3,   # threads on the +X side often hang longer, as in the hero
    inner_bottom=(3.4, 4.6),
)

COL = {  # sRGB, sampled from the hero
    'Bark_White': (0.90, 0.88, 0.83), 'Bark_Black': (0.10, 0.09, 0.08), 'Bark_Dark': (0.24, 0.20, 0.16),
    'Leaf_Light': (0.56, 0.70, 0.25), 'Leaf_Dark': (0.32, 0.48, 0.13),
}


def lin(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
    b.inputs['Roughness'].default_value = 0.85 if name.startswith('Bark') else 0.75
    m.use_backface_culling = False          # exported as doubleSided: the leaf cards render from both sides
    return m


def obj(name, verts, faces, mat):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for poly in me.polygons:
        poly.use_smooth = False
    me.materials.append(material(mat))
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def interp(pts, z):
    """Piecewise-linear lookup in a list of (z, ...) points sorted either way."""
    s = sorted(pts)
    if z <= s[0][0]:
        return s[0][1:]
    for a, b in zip(s, s[1:]):
        if a[0] <= z <= b[0]:
            t = (z - a[0]) / (b[0] - a[0])
            return tuple(u + (v - u) * t for u, v in zip(a[1:], b[1:]))
    return s[-1][1:]


def smooth_path(z):
    """Catmull-Rom through the trunk control points, so the S-curve has no kinks."""
    pts = P['trunk_path']
    for i in range(len(pts) - 1):
        if pts[i][0] <= z <= pts[i + 1][0] or i == len(pts) - 2:
            p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, len(pts) - 1)]
            t = min(max((z - p1[0]) / (p2[0] - p1[0]), 0), 1)
            out = []
            for k in (1, 2):
                a, b, c, d = p0[k], p1[k], p2[k], p3[k]
                out.append(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3))
            return tuple(out)


def trunk_radius(z):
    if z < 0.5:
        return P['trunk_r0'] + (P['trunk_r1'] - P['trunk_r0']) * (z / 0.5) ** 0.7
    t = (z - 0.5) / (P['trunk_top'] - 0.5)
    return P['trunk_r1'] + (P['trunk_rtop'] - P['trunk_r1']) * t ** 1.1


def tube(path, radii, sides, rot=0.0, cap=True):
    """A faceted tube along a polyline; returns verts, faces."""
    V, F = [], []
    n = len(path)
    for i, (p, r) in enumerate(zip(path, radii)):
        a = path[min(i + 1, n - 1)]; b = path[max(i - 1, 0)]
        t = [a[k] - b[k] for k in range(3)]; L = math.sqrt(sum(x * x for x in t)) or 1; t = [x / L for x in t]
        up = (0, 0, 1) if abs(t[2]) < 0.9 else (1, 0, 0)
        u = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]]
        L = math.sqrt(sum(x * x for x in u)); u = [x / L for x in u]
        v = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]]
        for s in range(sides):
            ang = rot + 2 * math.pi * s / sides
            V.append(tuple(p[k] + r * (math.cos(ang) * u[k] + math.sin(ang) * v[k]) for k in range(3)))
    for i in range(n - 1):
        for s in range(sides):
            a = i * sides + s; b = i * sides + (s + 1) % sides
            F.append((a, b, b + sides, a + sides))
    if cap:
        V.append(path[-1]); c = len(V) - 1
        for s in range(sides):
            F.append(((n - 1) * sides + s, (n - 1) * sides + (s + 1) % sides, c))
    return V, F


def build_trunk(rng):
    zs = [P['trunk_top'] * (i / (P['trunk_rings'] - 1)) ** 0.9 for i in range(P['trunk_rings'])]
    path = [(*smooth_path(z), z) for z in zs]
    radii = [trunk_radius(z) for z in zs]
    V, F = tube(path, radii, P['trunk_sides'])
    # a little irregularity, so it reads as faceted bark not a pipe
    V = [(x + rng.uniform(-0.008, 0.008), y + rng.uniform(-0.008, 0.008), max(z, 0) if z > 0.01 else 0.0) for x, y, z in V]
    obj('trunk', V, F, 'Bark_White')

    # dark rough base: a slightly fatter sleeve with a ragged top edge
    sides = P['trunk_sides'] + 2; V, F = [], []
    for ring, zr in enumerate((0.0, 0.25, P['base_dark_h'])):
        for s in range(sides):
            ang = 2 * math.pi * s / sides + 0.2
            z = zr if ring < 2 else zr + rng.uniform(-P['base_dark_jag'], P['base_dark_jag']) * (1 if s % 2 else 0.4)
            r = trunk_radius(z) + 0.012 + (0.02 if ring == 0 else 0)
            cx, cy = smooth_path(z)
            V.append((cx + r * math.cos(ang), cy + r * math.sin(ang), z))
    for i in range(2):
        for s in range(sides):
            a = i * sides + s; b = i * sides + (s + 1) % sides
            F.append((a, b, b + sides, a + sides))
    obj('trunk_base', V, F, 'Bark_Dark')

    # black bark patches: small wrapped bands and diamonds, denser low down
    V, F = [], []
    for i in range(P['patches']):
        z = P['patch_zmin'] + (P['patch_zmax'] - P['patch_zmin']) * rng.random() ** 1.5
        th = rng.uniform(0, 2 * math.pi)
        r = trunk_radius(z) + 0.007
        low = z < 2.0                                                      # big black diamonds low down, thin bands higher up
        half = rng.uniform(0.35, 0.8) * (1.4 if low else 1.0)              # angular half width
        hgt = rng.uniform(0.03, 0.07) * (2.0 if low else 1.0)
        cx, cy = smooth_path(z); b = len(V)
        for j, a in enumerate((th - half, th, th + half)):
            mid = 1.0 if j == 1 else 0.35                                  # diamond-ish: taller in the middle
            for dz in (-hgt * mid, hgt * mid):
                V.append((cx + r * math.cos(a), cy + r * math.sin(a), z + dz + (0.02 * mid if dz > 0 else 0)))
        F += [(b, b + 2, b + 3, b + 1), (b + 2, b + 4, b + 5, b + 3)]
    obj('bark_marks', V, F, 'Bark_Black')


def crown_r(z):
    return P['crown_k'] * interp(P['crown'], z)[0]


def crown_xy(theta, r, z=4.5):
    lx, ly = P['crown_lean']
    return (P['crown_cx'] - lx * (z - 4.5) + P['crown_sx'] * r * math.cos(theta),
            P['crown_cy'] - ly * (z - 4.5) + P['crown_sy'] * r * math.sin(theta))


def card(cx, cy, z, ln, w, yaw, tilt, V, F):
    """One leaf card: a flat diamond ln long and w wide hanging from (cx, cy, z), turned yaw about the vertical and
    tilted in its own plane. 2 triangles."""
    ax, ay = math.cos(yaw), math.sin(yaw)                       # across the card
    ct, st = math.cos(tilt), math.sin(tilt)
    def p(u, v):                                                # u across, v down the card
        uu, vv = u * ct - v * st, u * st + v * ct
        return (cx + ax * uu, cy + ay * uu, z - vv)
    b = len(V)
    V += [p(0, 0), p(w * 0.5, ln * 0.45), p(0, ln), p(-w * 0.5, ln * 0.45)]
    F.append((b, b + 1, b + 2, b + 3))


def strand(theta, k, z0, z1, width, rng, own, other):
    """A hanging thread of loose leaf cards from z0 down to z1 at azimuth theta, following the crown envelope
    scaled by k. Every card gets its own size (0.5-1.3x), spacing, turn and tilt; about one card in five takes the
    other green. own/other are (V, F) lists of the strand's main green and the other one."""
    sway = rng.uniform(-1, 1); z = z0; first = True
    while z > z1:
        t = (z0 - z) / max(z0 - z1, 1e-3)
        th = theta + sway * 0.05 * t
        r = k * crown_r(z) + 0.05 * math.sin(t * 5 + theta * 3) + rng.uniform(-0.03, 0.03)
        cx, cy = crown_xy(th, r, z)
        sc = rng.uniform(0.5, 1.3) * (1 - 0.45 * t ** 2)       # cards get smaller towards the tip
        ln = P['card_len'] * sc; w = width * sc * rng.uniform(0.8, 1.15)
        yaw = th + math.pi / 2 + math.radians(rng.uniform(-P['card_turn'], P['card_turn']))
        tilt = math.radians(rng.uniform(-P['card_tilt'], P['card_tilt']))
        V, F = other if (not first and rng.random() < P['other_green']) else own
        card(cx, cy, z, ln, w, yaw, tilt, V, F)
        z -= ln * rng.uniform(0.6, 1.0)                          # random spacing, cards overlap a little
        first = False


def build_crown(rng):
    BV, BF = [], []
    L, D = ([], []), ([], [])
    nb = P['branches']
    for i in range(nb):
        theta = 2 * math.pi * (i + rng.uniform(-0.2, 0.2)) / nb + 0.3
        zb = P['branch_zmin'] + (P['branch_zmax'] - P['branch_zmin']) * ((i * 5) % nb) / (nb - 1)
        bx, by = smooth_path(zb)
        top = min(zb + 0.9 + rng.uniform(-0.2, 0.3), P['height'] - 0.05)
        rr = crown_r(top - 0.2) * rng.uniform(0.85, 1.0)
        # arching branch: out and up from the trunk to a crest, then over and down to the crown edge
        pts = []
        segs = P['branch_segs']
        for s in range(segs + 1):
            t = s / segs
            r = rr * (0.15 + 0.85 * t) if t > 0 else 0.0
            z = zb + (top - zb) * math.sin(math.pi * 0.62 * t) / math.sin(math.pi * 0.62) - 0.5 * max(0, t - 0.6) ** 1.5
            if s == 0:
                pts.append((bx, by, zb))
            else:
                cx, cy = crown_xy(theta, r, z)
                pts.append((bx + (cx - bx) * min(1, t * 1.4), by + (cy - by) * min(1, t * 1.4), z))
        radii = [P['branch_r'] * (1 - 0.6 * s / segs) for s in range(segs + 1)]
        V, F = tube(pts, radii, P['branch_sides'], rot=0.4, cap=False)
        o = len(BV); BV += V; BF += [tuple(x + o for x in f) for f in F]
        # threads hanging from the arch, below its crest so the branch tops show; spread over a narrow fan, so
        # there is open sky between one branch's curtain and the next
        for j in range(P['strands_per_branch']):
            t = rng.uniform(*P['attach_t']); f = t * segs; s0 = min(int(f), segs - 1); u = f - s0
            p = [pts[s0][c] + (pts[s0 + 1][c] - pts[s0][c]) * u for c in range(3)]
            th = theta + math.radians(rng.uniform(-P['fan_deg'], P['fan_deg']))
            k = max(0.35, math.hypot(p[0] - crown_xy(th, 0, p[2])[0], p[1] - crown_xy(th, 0, p[2])[1]) / max(crown_r(p[2]), 0.1))
            k = min(k, 1.0) * rng.uniform(0.9, 1.05)
            z1 = rng.uniform(*P['strand_bottom'])
            if math.cos(th) > P['long_side'] and rng.random() < 0.5:
                z1 = rng.uniform(*P['long_bottom'])
            own, other = (D, L) if (k < 0.8 or rng.random() < 0.3) else (L, D)   # darker threads sit inside
            strand(th, k, p[2] - rng.uniform(0.1, 0.3), z1, P['card_w'], rng, own, other)
    # a few short inner threads, dark, for depth
    for i in range(P['inner_strands']):
        th = rng.uniform(0, 2 * math.pi)
        strand(th, rng.uniform(0.4, 0.6), rng.uniform(5.2, 6.4), rng.uniform(*P['inner_bottom']), P['card_w'], rng, D, L)
    obj('branches', BV, BF, 'Bark_White')
    obj('leaves_light', L[0], L[1], 'Leaf_Light')
    obj('leaves_dark', D[0], D[1], 'Leaf_Dark')


def main(path=os.path.join(HERE, 'birch.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rng = random.Random(P['seed'])
    build_trunk(rng)
    build_crown(rng)
    tris = 0
    for o in bpy.context.scene.objects:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    for o in bpy.context.scene.objects:
        print('  ', o.name, len(o.data.loop_triangles))
    print('triangles', tris)


if __name__ == '__main__':
    main()
