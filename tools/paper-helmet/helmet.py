"""Paper helmet builder: a parametric Roman/Corinthian helmet, built two ways from the same shape numbers.

shape params (p['shape']) say WHAT the helmet is: dome radii, brow ledge, face opening, cheek guards, neck guard,
crest arc and blade lengths. They are shared by every variant.

mode says HOW it is made:
  'smooth'   fine, smoothly shaded geometry (what a geometry-only fit produces). Optionally followed by the
             generic 'filter' (decimate + crumple), which is what the full-warrior run did to look like paper.
  'grammar'  the papercraft construction grammar (p['grammar']): every part is made of the rules below, so the
             same rules can dress a knight, a policeman's helmet or a roof.

Grammar rules (each is a function you could call on any part):
  facet_shell   curved surfaces become a few large planar facets, creased on deliberate diagonals (no noise)
  hemmed_plate  a flat sheet cut to a polygon, folded once from its centre to each corner, with a bevelled hem
                around the border (the raised frame on the cheek guards)
  ledge         a band with a folded-over lip (the brow ridge)
  blade_stack   a row of folded blocks along a curve, each with a ridge crease and an angled cap (the crest)
  thickness     every sheet gets the same paper thickness; edges catch light because of it
  matte paper   rough, warm white, faint sheen; no fake folds in the shader
"""
import bpy, bmesh, math, random
import numpy as np
from mathutils import Vector as V, Matrix

# ----------------------------------------------------------------- scene helpers
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def link(ob):
    bpy.context.scene.collection.objects.link(ob); return ob

def mesh_obj(name, verts, faces, smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(map(float, v)) for v in verts], [], [tuple(f) for f in faces])
    me.validate(); me.update()
    for q in me.polygons: q.use_smooth = smooth
    return link(bpy.data.objects.new(name, me))

def apply_mods(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    ob.modifiers.clear(); old = ob.data; ob.data = me; bpy.data.meshes.remove(old)

def thicken(ob, t, offset=-1.0):
    if t <= 0: return
    m = ob.modifiers.new('sol', 'SOLIDIFY'); m.thickness = t; m.offset = offset; m.use_even_offset = True
    apply_mods(ob)

class Mesh:
    def __init__(self): self.v, self.f = [], []
    def add_v(self, p): self.v.append(tuple(map(float, p))); return len(self.v) - 1
    def tri(self, a, b, c): self.f.append((a, b, c))
    def quad(self, a, b, c, d): self.f.append((a, b, c, d))
    def obj(self, name, smooth=False): return mesh_obj(name, self.v, self.f, smooth)

def unit(a): return a / (np.linalg.norm(a) + 1e-12)

# ----------------------------------------------------------------- surfaces (shape)
def dome_pt(S, th, ph, grow=0.0):
    rx, ry, rz = S['dome']
    k = 1 + grow
    return np.array([rx * k * math.cos(ph) * math.cos(th), ry * k * math.cos(ph) * math.sin(th), rz * k * math.sin(ph)])

def shell_scale(S, z):
    """Radius scale of the lower helmet (below the brow) at height z: tapers in toward the neck."""
    d = max(0.0, -z - S['band_h'])
    return 1.0 - S['taper'] * d

def shell_pt(S, th, z, out=0.0):
    rx, ry, _ = S['dome']
    s = shell_scale(S, z) + out
    return np.array([rx * s * math.cos(th), ry * s * math.sin(th), z])

FRONT = -math.pi / 2   # helmet faces -Y

def front_w(th):
    return max(0.0, math.cos(th - FRONT)) ** 2  # 1 at the front, 0 at the sides and back

def band_bottom(S, th):
    """z of the lower edge of the brow band: deeper at the front, where it becomes the forehead plate."""
    return -S['band_h'] - (S.get('band_front', 0.0) + S.get('front_drop', 0.0)) * front_w(th)

def eye_cut(S, th):
    """How far below the band the lower helmet starts: the eye slot of a Corinthian helmet, widest at the opening."""
    d = abs(math.degrees(math.atan2(math.sin(th - FRONT), math.cos(th - FRONT)))) - S['open']
    return S.get('eye_gap', 0.0) * max(0.0, 1 - max(0.0, d) / max(1.0, S.get('eye_w', 20)))
LANDMARKS = {}  # named 3D points filled in while building; projected and compared to hand-clicked reference points

# ----------------------------------------------------------------- grammar primitives
def fan_plate(name, poly_uv, F, sub=1, fold=0.0, hem_w=0.0, hem_h=0.0, smooth=False, normal_sign=1.0):
    """A sheet cut to a convex polygon in (u, v), mapped to 3D by F(u, v).
    fold: the centre is pushed out by fold x plate size, so creases run from the centre to every corner.
    hem: a bevelled frame of width hem_w (fraction of the plate radius) whose outer edge stands hem_h proud.
    sub: barycentric subdivision of each fan triangle (1 = pure facets; >1 = fine smooth surface)."""
    P = np.array(poly_uv, float); c = P.mean(0)
    def Fn(u, v):
        e = 1e-3
        a = F(u, v); du = F(u + e, v) - F(u - e, v); dv = F(u, v + e) - F(u, v - e)
        return a, unit(np.cross(du, dv)) * normal_sign
    rad = np.mean([np.linalg.norm(F(*p) - F(*c)) for p in P])
    m = Mesh()
    rings = []  # each ring: list of uv points around the polygon, with a height offset
    if hem_w > 0:
        rings = [(P, hem_h), (c + (P - c) * (1 - hem_w * 0.55), hem_h * 0.9), (c + (P - c) * (1 - hem_w), 0.0)]
    else:
        rings = [(P, 0.0)]
    # border rings as quads
    ids = []
    for R, h in rings:
        row = []
        for u, v in R:
            a, n = Fn(u, v); row.append(m.add_v(a + n * h * rad))
        ids.append(row)
    n_ = len(P)
    for r in range(len(ids) - 1):
        A, B = ids[r], ids[r + 1]
        for i in range(n_):
            j = (i + 1) % n_
            m.quad(A[i], A[j], B[j], B[i])
    inner, _ = rings[-1]
    inner_ids = ids[-1]
    a, nc = Fn(*c)
    if sub <= 1:
        ci = m.add_v(a + nc * fold * rad)
        for i in range(n_):
            m.tri(inner_ids[i], inner_ids[(i + 1) % n_], ci)
    else:
        # barycentric grid on each fan triangle, smooth (fold ignored)
        cache = {}
        def vid(uv):
            key = (round(uv[0], 7), round(uv[1], 7))
            if key not in cache:
                pt, nn = Fn(*uv); cache[key] = m.add_v(pt)
            return cache[key]
        for i in range(n_):
            p0, p1 = inner[i], inner[(i + 1) % n_]
            grid = {}
            for a_ in range(sub + 1):
                for b_ in range(sub + 1 - a_):
                    uv = c + (p0 - c) * (a_ / sub) + (p1 - c) * (b_ / sub)
                    grid[(a_, b_)] = vid(uv) if not (a_ + b_ == sub and (a_ == sub or b_ == sub)) else None
            grid[(sub, 0)] = inner_ids[i]; grid[(0, sub)] = inner_ids[(i + 1) % n_]
            # edge between p0 and p1 on the outer side must reuse new vertices (shared with neighbour via cache)
            for a_ in range(sub):
                for b_ in range(sub - a_):
                    m.tri(grid[(a_, b_)], grid[(a_ + 1, b_)], grid[(a_, b_ + 1)])
                    if a_ + b_ + 2 <= sub:
                        m.tri(grid[(a_ + 1, b_)], grid[(a_ + 1, b_ + 1)], grid[(a_, b_ + 1)])
    return m.obj(name, smooth)

def facet_shell(name, S, G, smooth, mode):
    """Dome above the brow. Grammar: nu x nv large facets, quads split on alternating diagonals (deliberate creases)."""
    nu, nv = (G['dome_u'], G['dome_v']) if mode == 'grammar' else (48, 16)
    m = Mesh(); rows = []
    for k in range(nv):
        ph = (math.pi / 2) * k / nv
        rows.append([m.add_v(dome_pt(S, FRONT + 2 * math.pi * j / nu + (G.get('dome_twist', 0) * k if mode == 'grammar' else 0), ph)) for j in range(nu)])
    top = m.add_v(dome_pt(S, 0, math.pi / 2))
    for k in range(nv - 1):
        for j in range(nu):
            a, b, c, d = rows[k][j], rows[k][(j + 1) % nu], rows[k + 1][(j + 1) % nu], rows[k + 1][j]
            if (j + k) % 2: m.tri(a, b, c); m.tri(a, c, d)
            else: m.tri(a, b, d); m.tri(b, c, d)
    for j in range(nu):
        m.tri(rows[-1][j], rows[-1][(j + 1) % nu], top)
    return m.obj(name, smooth)

def ledge(name, S, G, smooth, mode):
    """Brow band with a folded-over lip, swept around the rim. Profile in (radius scale, z)."""
    nu = G['band_u'] if mode == 'grammar' else 64
    lip, bh, lz, fz = S['lip'], S['band_h'], S['lip_z'], S.get('front_drop', 0.0)
    prof = [(1.0, lz + 0.03), (1.0 + lip, lz), (1.0 + lip * 0.85, -bh), (0.995, -bh)]
    m = Mesh(); rows = []
    for j in range(nu):
        th = FRONT + 2 * math.pi * j / nu
        fr = front_w(th)
        rx, ry, _ = S['dome']
        row = []
        for s, z in prof:
            s2 = s + (S.get('lip_front', 0.0) * fr if s > 1.0 else 0.0)
            z2 = band_bottom(S, th) if z == -bh else z - fz * fr
            row.append(m.add_v((rx * s2 * math.cos(th), ry * s2 * math.sin(th), z2)))
        rows.append(row)
    for j in range(nu):
        A, B = rows[j], rows[(j + 1) % nu]
        for i in range(len(prof) - 1):
            m.quad(A[i], B[i], B[i + 1], A[i + 1])
    return m.obj(name, smooth)

def lower_shell(name, S, G, smooth, mode):
    """Sides and back below the brow, open at the face. A strip of plates (grammar) or a smooth skirt."""
    nu = G['shell_u'] if mode == 'grammar' else 48
    op = math.radians(S['open'])
    th0, th1 = FRONT + op, FRONT + 2 * math.pi - op
    m = Mesh(); top, bot = [], []
    for j in range(nu + 1):
        th = th0 + (th1 - th0) * j / nu
        back = max(0.0, math.sin(th))  # deeper at the back, where the neck guard hangs
        zl = -S['band_h'] - S['low_h'] - S['low_back'] * back
        z0 = band_bottom(S, th) + 0.01 - eye_cut(S, th)
        top.append(m.add_v(shell_pt(S, th, min(z0, zl + 0.1))))
        bot.append(m.add_v(shell_pt(S, th, zl)))
    for j in range(nu):
        m.quad(top[j], top[j + 1], bot[j + 1], bot[j])
    return m.obj(name, smooth)

def cheek_guard(name, S, G, side, smooth, mode):
    """Cheek guard: pentagon plate hanging from the front edge of the opening, tip tucked forward and in."""
    op = math.radians(S['open'])
    sgn = 1 if side > 0 else -1
    thf = FRONT + sgn * op * S['cheek_front']           # front edge (near the face opening)
    thb = FRONT + sgn * (op + math.radians(S['cheek_w']))  # back edge
    L = S['cheek_len']; z0 = -S['band_h'] + 0.02
    zf = band_bottom(S, thf) + 0.02 - eye_cut(S, thf); zb = band_bottom(S, thb) + 0.02
    poly = [(thf, zf), (thb, zb), (thb - sgn * math.radians(S['cheek_w']) * 0.1, z0 - L * S['cheek_back_len']),
            (thf + sgn * math.radians(S['cheek_w']) * S['cheek_tip_u'], z0 - L), (thf - sgn * math.radians(4), z0 - L * 0.7)]
    if sgn < 0: poly = poly[::-1]
    tipin = S['cheek_in']
    def F(u, v):
        d = (z0 - v) / L
        return shell_pt(S, u, v, out=0.03 - tipin * d * d)
    tip = [q for q in poly if abs(q[1] - (z0 - L)) < 1e-9][0]
    LANDMARKS['cheek_near_tip' if side > 0 else 'cheek_far_tip'] = F(*tip)
    g = G
    if mode == 'grammar':
        return fan_plate(name, poly, F, sub=1, fold=g['plate_fold'], hem_w=g['hem_w'], hem_h=g['hem_h'])
    return fan_plate(name, poly, F, sub=8, smooth=smooth)

def neck_guard(name, S, G, smooth, mode):
    """Flared plate at the back that kicks outward like a tail."""
    hw = math.radians(S['neck_w'])
    zt = -S['band_h'] - S['low_h'] - S['low_back'] + 0.02
    th_c = math.pi / 2 + math.radians(S.get('neck_off', 0))
    L, fl = S['neck_len'], math.radians(S['neck_flare'])
    poly = [(th_c - hw, 0.0), (th_c + hw, 0.0), (th_c + hw * 0.55, 1.0), (th_c, 1.12), (th_c - hw * 0.55, 1.0)]
    def F(u, t):
        base = shell_pt(S, u, zt)
        rdir = unit(np.array([base[0], base[1], 0.0]))
        return base + rdir * (L * t * math.sin(fl)) - np.array([0, 0, L * t * math.cos(fl)])
    LANDMARKS['neck_tip'] = F(th_c, 1.12)
    if mode == 'grammar':
        return fan_plate(name, poly, F, sub=1, fold=G['plate_fold'], hem_w=G['hem_w'], hem_h=G['hem_h'], normal_sign=-1)
    return fan_plate(name, poly, F, sub=8, smooth=smooth, normal_sign=-1)

def crest_profile(S, a):
    """Point on the dome's mid-line at polar angle a (0 = top, negative = front)."""
    _, ry, rz = S['dome']
    return np.array([0.0, ry * math.sin(a), rz * math.cos(a)])

def blade_stack(name, S, G, smooth, mode, seed=7):
    """Crest: a holder band plus n folded blocks along an arc. Grammar adds a ridge crease and angled caps."""
    C = S['crest']
    n = G['blades'] if mode == 'grammar' else C.get('n_smooth', 16)
    a0, a1 = math.radians(C['a0']), math.radians(C['a1'])
    rng = random.Random(seed)
    m = Mesh()
    w = C['w']
    # holder: an arched band sitting on the dome
    hn = 14 if mode == 'grammar' else 40
    hold = []
    for i in range(hn + 1):
        a = a0 + (a1 - a0) * i / hn
        p0 = crest_profile(S, a) + np.array([0, 0, C['lift']])
        r = unit(np.array([0, math.sin(a), math.cos(a)]))
        p1 = p0 + r * C['hold_h']
        hold.append([m.add_v(p0 + [-w * 0.35, 0, 0]), m.add_v(p0 + [w * 0.35, 0, 0]), m.add_v(p1 + [w * 0.35, 0, 0]), m.add_v(p1 + [-w * 0.35, 0, 0])])
    for i in range(hn):
        A, B = hold[i], hold[i + 1]
        for k in range(4):
            m.quad(A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k])
    for k_ in (0, -1):
        R = hold[k_]; m.quad(*R) if k_ == 0 else m.quad(*R[::-1])
    # blades
    span = (a1 - a0) / n
    for i in range(n):
        t = (i + 0.5) / n
        a = a0 + (a1 - a0) * t
        peak = C['peak_at']
        prof = 1.0 - (1 - C['taper']) * ((t - peak) / (1 - peak if t > peak else peak)) ** 2
        Lb = C['len'] * max(0.15, prof)
        if mode == 'grammar': Lb *= 1 + rng.gauss(0, G['blade_jitter'])
        base = crest_profile(S, a) + unit(np.array([0, math.sin(a), math.cos(a)])) * (C['hold_h'] * 0.8) + np.array([0, 0, C['lift']])
        rake = math.radians(C['rake'] + C['curl'] * (1 - t) * 40)
        dirn = np.array([0, math.sin(a + rake), math.cos(a + rake)])
        tang = np.array([0, math.cos(a + rake), -math.sin(a + rake)])
        d = span * np.linalg.norm(crest_profile(S, a + 0.01) - crest_profile(S, a)) / 0.01 * C['fill'] * 0.5
        ww = w * (1 + 0.25 * (1 - t))
        tip = base + dirn * Lb
        cap = C['cap'] * Lb  # angled cap: the front edge is shorter than the back edge
        # 8 corners + ridge
        corners = []
        for sx in (-1, 1):
            for st in (-1, 1):
                b = base + tang * d * st + np.array([sx * ww * 0.5, 0, 0])
                tp = tip + tang * d * st + np.array([sx * ww * 0.5, 0, 0]) - dirn * (cap if st < 0 else 0)
                corners.append((b, tp))
        if i == 0: LANDMARKS['crest_front'] = tip - dirn * cap - tang * d
        if i == n - 1: LANDMARKS['crest_back'] = tip + tang * d
        ids = [(m.add_v(b), m.add_v(tp)) for b, tp in corners]
        (b0, t0), (b1, t1), (b2, t2), (b3, t3) = ids  # (-x,-t) (-x,+t) (+x,-t) (+x,+t)
        if mode == 'grammar' and G['ridge'] > 0:
            # ridge crease down the outer (front-facing) face: the face at -t gets a centre fold out by ridge*d
            rb = m.add_v(base - tang * d * (1 + G['ridge']))
            rt = m.add_v(tip - tang * d * (1 + G['ridge']) - dirn * cap)
            m.quad(b0, t0, rt, rb); m.quad(rb, rt, t2, b2)
            m.quad(t0, t1, t3, t2)  # cap (approx; ridge cap)
            m.tri(t0, t2, rt)
            m.quad(b0, rb, b2, b2) if False else m.tri(b0, rb, b2)
        else:
            m.quad(b0, t0, t2, b2)
            m.quad(t0, t1, t3, t2)
        m.quad(b1, b3, t3, t1)       # back face
        m.quad(b0, b1, t1, t0)       # -x side
        m.quad(b2, t2, t3, b3)       # +x side
        m.quad(b0, b2, b3, b1)       # base
    return m.obj(name, smooth)

def ridge_strip(name, S, G, smooth, mode):
    """Late-Roman ridge helmet: a folded strip along the mid-line joining the two bowl halves (Intercisa type).
    Same grammar: a hemmed strip with a centre fold, standing proud of the facet shell."""
    R = S['ridge']
    n = 14 if mode == 'grammar' else 48
    m = Mesh(); rows = []
    a_lo = -math.pi / 2 + 0.02
    for i in range(n + 1):
        a = a_lo + (math.pi - 0.04) * i / n
        p0 = crest_profile(S, a)
        r = unit(np.array([0, math.sin(a), math.cos(a)]))
        rows.append([m.add_v(p0 + np.array([-R['w'] / 2, 0, 0]) - r * 0.01), m.add_v(p0 + np.array([-R['w'] / 2 * 0.6, 0, 0]) + r * R['h'] * 0.7),
                     m.add_v(p0 + r * R['h']), m.add_v(p0 + np.array([R['w'] / 2 * 0.6, 0, 0]) + r * R['h'] * 0.7),
                     m.add_v(p0 + np.array([R['w'] / 2, 0, 0]) - r * 0.01)])
    for i in range(n):
        A, B = rows[i], rows[i + 1]
        for k in range(4): m.quad(A[k], B[k], B[k + 1], A[k + 1])
    LANDMARKS['crest_front'] = crest_profile(S, a_lo); LANDMARKS['crest_back'] = crest_profile(S, a_lo + math.pi - 0.04)
    return m.obj(name, smooth)

def bosses(name, S, G, smooth, mode):
    m_objs = []
    for sgn in (-1, 1):
        th = FRONT + sgn * math.radians(S['boss_th'])
        p = shell_pt(S, th, -S['band_h'] * 0.45, out=S['lip'] * 0.6)
        if sgn > 0: LANDMARKS['boss_near'] = p
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1 if mode == 'grammar' else 3, radius=S['boss_r'], location=tuple(p))
        ob = bpy.context.active_object
        for q in ob.data.polygons: q.use_smooth = smooth
        m_objs.append(ob)
    return m_objs

# ----------------------------------------------------------------- generic paper filter (the full-warrior approach)
def mean_edge(me):
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    e = np.empty(len(me.edges) * 2, dtype=np.int64); me.edges.foreach_get('vertices', e); e = e.reshape(-1, 2)
    return float(np.linalg.norm(co[e[:, 0]] - co[e[:, 1]], axis=1).mean()) if len(e) else 0.0

def paper_filter(ob, edge, crumple, seed):
    """Decimate to a target edge length, then crumple each vertex along its normal (no notion of folds)."""
    cur = mean_edge(ob.data)
    if 0 < cur < edge:
        md = ob.modifiers.new('dec', 'DECIMATE'); md.decimate_type = 'COLLAPSE'; md.ratio = max(0.03, (cur / edge) ** 2)
        md.use_collapse_triangulate = True; apply_mods(ob)
    me = ob.data; Lm = mean_edge(me)
    rng = np.random.default_rng(seed)
    co = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    nr = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
    co += nr * rng.normal(0, crumple * Lm, (len(co), 1))
    me.vertices.foreach_set('co', co.ravel()); me.update()

# ----------------------------------------------------------------- materials, stage, light, camera
def paper_material(L):
    m = bpy.data.materials.new('paper'); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    a = L['paper_albedo']; w = L.get('paper_warm', 0.03)
    b.inputs['Base Color'].default_value = (a, a * (1 - w), a * (1 - 2.5 * w), 1)
    b.inputs['Roughness'].default_value = L['paper_rough']
    if 'Sheen Weight' in b.inputs: b.inputs['Sheen Weight'].default_value = 0.2
    if 'Subsurface Weight' in b.inputs:
        b.inputs['Subsurface Weight'].default_value = L.get('sss', 0.0)
    return m

def stage(p):
    L = p['light']
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, p['place']['ground']))
    gr = bpy.context.active_object
    # curved cyc so the backdrop has no horizon line
    prof = []
    R = 6.0; wy = 14.0
    for i in range(12):
        a = math.pi / 2 * i / 11; prof.append((wy - R + R * math.sin(a), R - R * math.cos(a)))
    verts, faces = [], []
    for x in (-40.0, 40.0):
        for y, z in [(-40.0, 0.0)] + prof + [(wy, 40.0)]:
            verts.append((x, y, z + p['place']['ground']))
    n = len(prof) + 2
    for i in range(n - 1): faces.append((i, i + 1, n + i + 1, n + i))
    bpy.data.objects.remove(gr)
    cyc = mesh_obj('cyc', verts, faces, smooth=True)
    mt = bpy.data.materials.new('bg'); mt.use_nodes = True
    bb = mt.node_tree.nodes['Principled BSDF']
    bb.inputs['Base Color'].default_value = (*L['bg_albedo'], 1); bb.inputs['Roughness'].default_value = 1.0
    cyc.data.materials.append(mt)

def lights(p):
    L = p['light']; sc = bpy.context.scene
    def area(name, az, el, dist, size, power, color=(1, 1, 1)):
        ld = bpy.data.lights.new(name, 'AREA'); ld.shape = 'DISK'; ld.size = size; ld.energy = power; ld.color = color
        ob = link(bpy.data.objects.new(name, ld))
        a, e = math.radians(az), math.radians(el)
        tgt = V((0, 0, 0))
        ob.location = tgt + V((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
        ob.rotation_euler = (tgt - ob.location).to_track_quat('-Z', 'Y').to_euler()
    area('key', L['key_az'], L['key_el'], 8, L['key_size'], L['key_power'], (1.0, 0.97, 0.92))
    area('fill', L['fill_az'], L['fill_el'], 8, 8, L['fill_power'], (0.92, 0.95, 1.0))
    w = bpy.data.worlds.new('world'); sc.world = w; w.use_nodes = True
    bgn = w.node_tree.nodes['Background']
    bgn.inputs['Color'].default_value = (*L['world_color'], 1); bgn.inputs['Strength'].default_value = L['world_strength']
    sc.view_settings.view_transform = 'AgX' if L.get('agx', 1) else 'Standard'
    sc.view_settings.exposure = L['exposure']

def camera(p, W, H):
    c = p['cam']; sc = bpy.context.scene
    cd = bpy.data.cameras.new('cam'); cd.lens = c['focal']; cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24
    ob = link(bpy.data.objects.new('cam', cd))
    e = math.radians(c['el'])
    ob.location = V((0, -c['dist'] * math.cos(e), c['dist'] * math.sin(e)))
    ob.rotation_euler = (V((c['tx'], 0, c['tz'])) - ob.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = ob
    sc.render.resolution_x, sc.render.resolution_y = W, H

# ----------------------------------------------------------------- top level
def build(p, mode='grammar', filt=None, with_stage=True):
    """Returns the list of helmet objects, placed and posed. filt = {'edge':..,'crumple':..} applies the generic filter."""
    S, G, L = p['shape'], p['grammar'], p['light']
    LANDMARKS.clear()
    smooth = mode == 'smooth'
    parts = [facet_shell('dome', S, G, smooth, mode), ledge('brow', S, G, smooth, mode), lower_shell('shell', S, G, smooth, mode),
             cheek_guard('cheek_r', S, G, -1, smooth, mode), cheek_guard('cheek_l', S, G, 1, smooth, mode),
             neck_guard('neck', S, G, smooth, mode),
             blade_stack('crest', S, G, smooth, mode) if S.get('crest') else ridge_strip('ridge', S, G, smooth, mode)]
    parts += bosses('boss', S, G, smooth, mode)
    t = G['paper_t'] if mode == 'grammar' else 0.02
    for ob in parts:
        if ob.name.startswith(('cheek', 'neck', 'shell')):
            thicken(ob, t, offset=1.0)
        elif ob.name.startswith('dome'):
            thicken(ob, t, offset=-1.0)
    if filt:
        for i, ob in enumerate(parts):
            paper_filter(ob, filt['edge'], filt['crumple'], 11 + i)
    pl = p['place']
    M = (Matrix.Translation(V((pl['x'], 0, pl['z']))) @ Matrix.Rotation(math.radians(pl['yaw']), 4, 'Z') @
         Matrix.Rotation(math.radians(pl['pitch']), 4, 'X') @ Matrix.Rotation(math.radians(pl['roll']), 4, 'Y') @ Matrix.Scale(pl['scale'], 4))
    for k in list(LANDMARKS): LANDMARKS[k] = np.array(M @ V(tuple(map(float, LANDMARKS[k]))))
    mat = paper_material(L)
    for ob in parts:
        ob.data.transform(M); ob.matrix_world = Matrix.Identity(4)
        if ob.name.startswith('boss'):
            pass
        for q in ob.data.polygons: q.use_smooth = smooth
        ob.data.materials.clear(); ob.data.materials.append(mat)
    if with_stage:
        stage(p); lights(p)
    return parts

def setup(p, mode, filt=None, W=512, H=512, with_stage=True):
    clear_scene()
    parts = build(p, mode, filt, with_stage)
    camera(p, W, H)
    return parts

def silhouette(parts, W, H):
    """Fast CPU raster of the helmet silhouette through the scene camera (no render engine)."""
    from PIL import Image, ImageDraw
    sc = bpy.context.scene; cam = sc.camera
    dg = bpy.context.evaluated_depsgraph_get()
    P = np.array(cam.calc_matrix_camera(dg, x=W, y=H)) @ np.array(cam.matrix_world.inverted())
    img = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(img)
    for ob in parts:
        me = ob.data; me.calc_loop_triangles()
        n = len(me.vertices)
        co = np.empty(n * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        co = co @ np.array(ob.matrix_world)[:3, :3].T + np.array(ob.matrix_world)[:3, 3]
        h = np.c_[co, np.ones(n)] @ P.T
        xy = h[:, :2] / h[:, 3:4]
        px = (xy[:, 0] * 0.5 + 0.5) * W; py = (0.5 - xy[:, 1] * 0.5) * H
        tri = np.empty(len(me.loop_triangles) * 3, dtype=np.int64); me.loop_triangles.foreach_get('vertices', tri)
        for t in tri.reshape(-1, 3):
            dr.polygon([(px[t[0]], py[t[0]]), (px[t[1]], py[t[1]]), (px[t[2]], py[t[2]])], fill=255)
    return np.asarray(img) > 127

def project_landmarks(W, H):
    """Landmarks in reference pixels (1024 frame)."""
    sc = bpy.context.scene; cam = sc.camera
    dg = bpy.context.evaluated_depsgraph_get()
    P = np.array(cam.calc_matrix_camera(dg, x=W, y=H)) @ np.array(cam.matrix_world.inverted())
    out = {}
    for k, v in LANDMARKS.items():
        h = P @ np.r_[v, 1.0]; xy = h[:2] / h[3]
        out[k] = ((xy[0] * 0.5 + 0.5) * 1024, (0.5 - xy[1] * 0.5) * 1024)
    return out

def render(path, W, H, samples=32):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.cycles.use_denoising = True; sc.cycles.max_bounces = 6
    sc.render.resolution_x, sc.render.resolution_y = W, H; sc.render.resolution_percentage = 100
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

def tri_count(parts):
    n = 0
    for ob in parts:
        ob.data.calc_loop_triangles(); n += len(ob.data.loop_triangles)
    return n

def export_glb(path, parts):
    for ob in bpy.context.scene.objects: ob.select_set(ob in parts)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True)
