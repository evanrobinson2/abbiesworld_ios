"""Borage clump for the Ranch tile (replaces simulations/regional-assets/GF-249.glb).

A bushy borage clump about as tall as it is wide, translated from the painted hero into flat low-poly shapes:
  * a ground rosette of broad oval, cupped leaf cards spreading flat, wider than the plant above it;
  * a leafy body of smaller oval leaves rising out of the crown;
  * a few upright, slightly branching green stems with small leaves climbing them;
  * about 15 chunky five-pointed blue stars with a pale centre cone, each on a short red stalk, spread through the
    upper half and round the edges, two of them nodding.
Leaf and petal cards are single sheets with double-sided materials. Flat colours, one material per object.
Z up, metres, origin at the base on the ground, front -Y. Height and footprint match the old GF-249 (0.34 x 0.32 x 0.41).
No animation (the game poses and sways plants).
usage: python build.py            (writes borage.glb next to this file)
"""
import os, math, random
import bpy

HERE = os.path.dirname(os.path.abspath(__file__))

P = dict(
    seed=7,
    height=0.41,                    # the finished clump is scaled to this (the old GF-249's height)
    spread_x=1.0,                   # flower and stem-tip positions below are stretched sideways by this
    # ground rosette
    ros_n=10, ros_len=(0.17, 0.185), ros_w=0.7, ros_r0=0.015, ros_pitch=(0.15, 0.30), ros_droop=0.04, ros_cup=0.25,
    ros_squash_y=0.95, ros_roll=0.25, ros_phase=0.0,
    # leafy body out of the crown
    core=((0.01, 0.07), (0.10, 0.115), (0.20, 0.085)), core_top=0.26,
    body_n=50, body_w=0.8,  body_z=(0.04, 0.29), body_r0=0.04, body_rise=(0.03, 0.08), body_R=0.16, body_R_top=0.08, body_skew=0.20,
    body_shoulder=0.22, body_squash_y=0.95,
    body_cup=0.25, body_lean=0.15, body_roll=(0.5, 1.0), body_droop=0.012,
    # stems
    stem_r0=0.0055, stem_r1=0.0028, stem_sides=3, stem_segs=3,
    stem_leaves=2, stem_leaf_len=(0.055, 0.075),
    red_len=0.035, red_r=0.0022,
    # flowers
    flower_r=0.034, flower_out=0.92, notch=0.46, centre_r=0.22, centre_h=0.45, petal_cup=0.12,
)

# The flowers, hand-placed from the hero (x across, y depth, z up, metres), with the stem each one hangs on.
# (x, y, z, stem, nod): nod = nodding flower (faces down and out instead of to the front and up).
FLOWERS = [
    (0.016, 0.00, 0.385, 0, 0), (-0.040, 0.02, 0.372, 0, 0), (0.012, -0.03, 0.335, 0, 0),
    (-0.088, -0.01, 0.315, 1, 0), (0.096, 0.01, 0.325, 2, 1), (0.058, 0.04, 0.300, 2, 0),
    (-0.012, -0.06, 0.258, 3, 0), (-0.118, -0.02, 0.238, 1, 0), (0.066, -0.05, 0.228, 4, 0),
    (0.132, -0.01, 0.200, 4, 0), (-0.134, 0.03, 0.208, 5, 0), (-0.150, -0.03, 0.150, 5, 1),
    (-0.055, -0.09, 0.160, 3, 0), (0.032, -0.10, 0.140, 4, 0), (0.104, 0.05, 0.180, 2, 0),
]
# main stems: base point (x, y) and tip (x, y, z); flowers on a stem branch off it, its top flower sits at the tip
STEMS = [
    ((0.000, 0.010), (0.000, 0.005, 0.36)),
    ((-0.015, 0.005), (-0.075, 0.000, 0.29)),
    ((0.015, 0.010), (0.080, 0.025, 0.29)),
    ((-0.005, -0.015), (-0.010, -0.045, 0.235)),
    ((0.012, -0.010), (0.075, -0.040, 0.20)),
    ((-0.018, -0.002), (-0.115, 0.005, 0.19)),
]

COL = {  # sRGB, sampled from the hero and lifted a little toward the set's flat painted look
    'Leaf_Green': (0.33, 0.47, 0.22), 'Leaf_Pale': (0.55, 0.66, 0.38),
    'Stem_Green': (0.40, 0.47, 0.22), 'Stem_Red': (0.70, 0.22, 0.17),
    'Petal_Blue': (0.24, 0.42, 0.88), 'Flower_White': (0.93, 0.93, 0.96),
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
    b.inputs['Roughness'].default_value = 0.75 if name.startswith(('Leaf', 'Petal')) else 0.85
    m.use_backface_culling = False          # exported as doubleSided: leaf and petal cards render from both sides
    return m


def obj(name, verts, faces, mat):
    me = bpy.data.meshes.new(name); me.from_pydata(verts, [], faces); me.update()
    for poly in me.polygons:
        poly.use_smooth = False
    me.materials.append(material(mat))
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def norm(v):
    L = math.sqrt(sum(x * x for x in v)) or 1.0
    return tuple(x / L for x in v)


def cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def lerp(a, b, t):
    return tuple(a[k] + (b[k] - a[k]) * t for k in range(3))


def add(V, F, v, f):
    o = len(V); V += v; F += [tuple(i + o for i in x) for x in f]


def tube(path, radii, sides, cap=True):
    V, F = [], []
    n = len(path)
    for i, (p, r) in enumerate(zip(path, radii)):
        a = path[min(i + 1, n - 1)]; b = path[max(i - 1, 0)]
        t = norm([a[k] - b[k] for k in range(3)])
        u = norm(cross(t, (1, 0, 0) if abs(t[0]) < 0.9 else (0, 1, 0))); v = cross(t, u)
        for s in range(sides):
            ang = 2 * math.pi * s / sides
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


def leaf(base, d, across, L, wr, cup, droop, V, F, ground=False):
    """A broad oval leaf card, 6 triangles: midrib base / middle / tip and two edge pairs, edges cupped up
    along the face normal and the tip drooping. `across` is roughly the width direction; the face normal is d x across."""
    w = L * wr / 2
    dot = sum(across[k] * d[k] for k in range(3))
    s = norm(tuple(across[k] - dot * d[k] for k in range(3)))
    n = cross(d, s)
    if n[2] < 0:                            # keep the cupped face up
        s = tuple(-x for x in s); n = tuple(-x for x in n)
    pts = [(0.0, 0.0, 0.0), (0.48, 0.0, 0.0), (1.0, 0.0, 0.0),
           (0.25, -0.86, cup), (0.25, 0.86, cup), (0.66, -1.0, cup), (0.66, 1.0, cup)]
    v = []
    for a, b, c in pts:
        dz = -droop * a * a
        q = tuple(base[k] + d[k] * a * L + s[k] * b * w + n[k] * (c * w) + (dz if k == 2 else 0) for k in range(3))
        if ground:
            q = (q[0], q[1], max(q[2], 0.004))
        v.append(q)
    add(V, F, v, [(0, 3, 1), (0, 1, 4), (3, 5, 1), (1, 6, 4), (5, 2, 1), (1, 2, 6)])


def star(c, nrm, up, rng, PV, PF, CV, CF):
    """A five-pointed star (10 triangles) facing nrm, points cupped forward a little, plus a pale centre cone (5)."""
    R = P['flower_r'] * rng.uniform(0.92, 1.08)
    u = norm(cross(nrm, up)); v = cross(nrm, u)
    rot = rng.uniform(0, 2 * math.pi / 5)
    vs = [c]
    for i in range(5):
        a = rot + 2 * math.pi * i / 5
        vs.append(tuple(c[k] + R * (math.cos(a) * u[k] + math.sin(a) * v[k]) + nrm[k] * R * P['petal_cup'] for k in range(3)))
        a2 = a + math.pi / 5
        vs.append(tuple(c[k] + R * P['notch'] * (math.cos(a2) * u[k] + math.sin(a2) * v[k]) for k in range(3)))
    f = []
    for i in range(5):
        t, nt, pn = 1 + 2 * i, 2 + 2 * i, 2 + 2 * ((i - 1) % 5)
        f += [(0, pn, t), (0, t, nt)]
    add(PV, PF, vs, f)
    cr = R * P['centre_r']
    cv = [tuple(c[k] + nrm[k] * R * 0.18 + cr * (math.cos(rot + 2 * math.pi * i / 5) * u[k] + math.sin(rot + 2 * math.pi * i / 5) * v[k])
                for k in range(3)) for i in range(5)]
    cv.append(tuple(c[k] + nrm[k] * R * P['centre_h'] for k in range(3)))
    add(CV, CF, cv, [(i, (i + 1) % 5, 5) for i in range(5)])


def build(rng):
    LV, LF, PLV, PLF = [], [], [], []      # Leaf_Green, Leaf_Pale
    SV, SF, RV, RF = [], [], [], []        # Stem_Green, Stem_Red
    PV, PF, CV, CF = [], [], [], []        # Petal_Blue, Flower_White

    # 1. ground rosette: broad leaves radiating flat from the crown
    n = P['ros_n']
    for i in range(n):
        th = 2 * math.pi * (i + rng.uniform(-0.15, 0.15)) / n + P['ros_phase']
        o = (math.cos(th), math.sin(th) * P['ros_squash_y'], 0.0)
        pitch = rng.uniform(*P['ros_pitch'])
        d = norm((o[0], o[1], math.tan(pitch)))
        base = (o[0] * P['ros_r0'], o[1] * P['ros_r0'], 0.006)
        V, F = (PLV, PLF) if i % 3 == 1 else (LV, LF)
        roll = rng.uniform(-P['ros_roll'], P['ros_roll'])
        leaf(base, d, (-o[1] * math.cos(roll), o[0] * math.cos(roll), math.sin(roll)), rng.uniform(*P['ros_len']) * math.hypot(o[0], o[1]), P['ros_w'], P['ros_cup'], P['ros_droop'], V, F, ground=True)

    # 1b. a low faceted core inside the body, so the leaf mass reads solid instead of see-through
    rings = P['core']
    sides = 6
    cv, cf = [], []
    for zr, rr in rings:
        for j in range(sides):
            a = 2 * math.pi * (j + 0.5 * (len(cv) // sides % 2)) / sides
            cv.append((rr * math.cos(a) * (1 + P['body_skew'] * math.cos(a)), rr * math.sin(a) * P['body_squash_y'], zr))
    for r in range(len(rings) - 1):
        for j in range(sides):
            a0, a1 = r * sides + j, r * sides + (j + 1) % sides
            cf += [(a0, a1, a1 + sides), (a0, a1 + sides, a0 + sides)]
    cv.append((0.0, 0.0, P['core_top'])); top = len(cv) - 1
    cf += [((len(rings) - 1) * sides + j, (len(rings) - 1) * sides + (j + 1) % sides, top) for j in range(sides)]
    add(LV, LF, cv, cf)

    # 2. leafy body: leaves out of the crown and up the stems, each aimed at a tip point on the hero's dome
    #    (half-width body_R up to body_shoulder, narrowing to body_R_top at the top of the body)
    nb = P['body_n']
    for i in range(nb):
        th = 2 * math.pi * (i * 0.618 % 1.0) + rng.uniform(-0.2, 0.2)
        o = (math.cos(th), math.sin(th) * P['body_squash_y'], 0.0)
        zt = P['body_z'][0] + (P['body_z'][1] - P['body_z'][0]) * ((i + rng.random()) / nb)
        f = max(0.0, (zt - P['body_shoulder']) / (P['body_z'][1] - P['body_shoulder']))
        R = (P['body_R'] + (P['body_R_top'] - P['body_R']) * f * f) * rng.uniform(0.88, 1.0) * (1 + P['body_skew'] * o[0])  # hero: fuller on the right
        tip = (o[0] * R, o[1] * R, zt)
        r0 = P['body_r0'] * rng.uniform(0.3, 1.0) + P['body_lean'] * zt   # higher leaves sit further out, on the leaning stems
        base = (o[0] * r0, o[1] * r0, max(0.01, zt - rng.uniform(*P['body_rise'])))
        d = norm(tuple(tip[k] - base[k] for k in range(3)))
        L = math.dist(tip, base)
        V, F = (PLV, PLF) if rng.random() < 0.25 else (LV, LF)
        # rolled about the midrib, so the face tilts sideways and the leaf shows its width from any side
        roll = rng.choice((-1, 1)) * rng.uniform(*P['body_roll'])
        tg = norm((-o[1], o[0], 0.0))
        across = tuple(tg[k] * math.cos(roll) + (0, 0, 1)[k] * math.sin(roll) for k in range(3))
        leaf(base, d, across, L, P['body_w'], P['body_cup'], P['body_droop'], V, F)

    # 3. stems: gently curved from the crown to the tip, a couple of small leaves climbing each
    paths = []
    for (bx, by), tip in STEMS:
        tip = (tip[0] * P['spread_x'], tip[1], tip[2])
        segs = P['stem_segs']
        mid = (bx + (tip[0] - bx) * 0.25, by + (tip[1] - by) * 0.25, tip[2] * 0.5)   # rises straight first, then leans
        path = []
        for i in range(segs + 1):
            t = i / segs
            a = lerp((bx, by, 0.0), mid, t); b = lerp(mid, tip, t)
            path.append(lerp(a, b, t))
        paths.append(path)
        radii = [P['stem_r0'] + (P['stem_r1'] - P['stem_r0']) * (i / segs) for i in range(segs + 1)]
        add(SV, SF, *tube(path, radii, P['stem_sides']))
        out = norm((tip[0] - bx + 1e-3, tip[1] - by, 0.0))
        for j in range(P['stem_leaves']):
            t = 0.55 + 0.3 * j + rng.uniform(-0.04, 0.04)
            k = int(t * segs); f = t * segs - k
            p = lerp(path[k], path[min(k + 1, segs)], f)
            side = (-out[1], out[0], 0.0) if j % 2 == 0 else (out[1], -out[0], 0.0)
            d = norm((side[0] * 0.55 + out[0] * 0.8, side[1] * 0.55 + out[1] * 0.8, 0.45))
            V, F = (PLV, PLF) if j == 1 else (LV, LF)
            leaf(p, d, (-d[1], d[0], 0.0), rng.uniform(*P['stem_leaf_len']) * (1.2 - 0.5 * t), 0.55, 0.2, 0.01, V, F)

    def on_stem(si, z):
        path = paths[si]
        for i in range(len(path) - 1):
            if path[i + 1][2] >= z:
                f = (z - path[i][2]) / max(1e-6, path[i + 1][2] - path[i][2])
                return lerp(path[i], path[i + 1], max(0.0, min(1.0, f)))
        return path[-1]

    # 4. flowers: a green side branch from the stem, a short red stalk, the star
    for (x, y, z, si, nod) in FLOWERS:
        x *= P['spread_x']
        # flowers inside the leaf dome are moved out onto its surface (front or back), so they show
        if z < P['body_z'][1]:
            f = max(0.0, (z - P['body_shoulder']) / (P['body_z'][1] - P['body_shoulder']))
            Renv = (P['body_R'] + (P['body_R_top'] - P['body_R']) * f * f) * (1 + P['body_skew'] * (1 if x > 0 else -1) * min(1.0, abs(x) / 0.1)) * P['flower_out']
            if math.hypot(x, y) < Renv and abs(x) < Renv:
                y = (1 if y > 0.02 else -1) * math.sqrt(Renv * Renv - x * x) * P['body_squash_y']
        fp = (x, y, z)
        tip = paths[si][-1]
        if nod:
            nrm = norm((math.copysign(0.9, x), -0.5, -0.6))
        else:
            nrm = norm((x * 3, -1.0 + y * 2, 0.55))
        stalk_end = tuple(fp[k] - nrm[k] * P['flower_r'] * 0.15 for k in range(3))
        if nod:
            stalk_start = (stalk_end[0] - (0.02 if x > 0 else -0.02), stalk_end[1] + 0.005, stalk_end[2] + 0.012)
            knee = (stalk_start[0] + (stalk_end[0] - stalk_start[0]) * 0.3, stalk_start[1], stalk_start[2] + 0.012)
            red = [stalk_start, knee, stalk_end]
        else:
            stalk_start = (stalk_end[0] - nrm[0] * 0.006 - (x - tip[0]) * 0.25, stalk_end[1] + 0.012, stalk_end[2] - P['red_len'])
            red = [stalk_start, stalk_end]
        add(RV, RF, *tube(red, [P['red_r']] * len(red), 3, cap=False))
        # the green branch from the stem to the stalk (skipped when the stalk starts right at the stem tip)
        if math.dist(stalk_start, tip) > 0.025:
            sp = on_stem(si, min(stalk_start[2] - 0.05, tip[2] - 0.02))
            add(SV, SF, *tube([sp, stalk_start], [P['stem_r1'] * 1.1, P['stem_r1']], 3, cap=False))
        up = (0, 0, 1) if not nod else (0, 1, 0)
        star(fp, nrm, up, rng, PV, PF, CV, CF)

    obj('leaves', LV, LF, 'Leaf_Green')
    obj('leaves_pale', PLV, PLF, 'Leaf_Pale')
    obj('stems', SV, SF, 'Stem_Green')
    obj('flower_stalks', RV, RF, 'Stem_Red')
    obj('petals', PV, PF, 'Petal_Blue')
    obj('flower_centres', CV, CF, 'Flower_White')


def main(path=os.path.join(HERE, 'borage.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build(random.Random(P['seed']))
    # scale the whole clump to the old model's height (the game copies the GLB as-is, no rescale)
    top = max(v.co[2] for o in bpy.context.scene.objects for v in o.data.vertices)
    for o in bpy.context.scene.objects:            # nothing below the ground
        for v in o.data.vertices:
            v.co.z = max(v.co.z, 0.0)
    for o in bpy.context.scene.objects:
        for v in o.data.vertices:
            v.co = v.co * (P['height'] / top)
    tris = 0
    lo, hi = [1e9] * 3, [-1e9] * 3
    for o in bpy.context.scene.objects:
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
        for v in o.data.vertices:
            for k in range(3):
                lo[k] = min(lo[k], v.co[k]); hi[k] = max(hi[k], v.co[k])
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)
    for o in bpy.context.scene.objects:
        print('  ', o.name, len(o.data.loop_triangles))
    print('bounds', [round(x, 3) for x in lo], [round(x, 3) for x in hi], 'dims', [round(hi[k] - lo[k], 3) for k in range(3)])
    print('triangles', tris)


if __name__ == '__main__':
    main()
