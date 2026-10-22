"""Paper Warrior builder: parametric Roman legionary in a faceted folded-paper style.

Everything is generated from numbers in a params dict (see params_init.json):
body = metaball skeleton -> mesh -> decimate -> paper jitter, armour = procedural bmesh pieces.
No external assets are loaded.
"""
import bpy, bmesh, math, random, json
import numpy as np
from mathutils import Vector, Matrix, Euler, Quaternion
from mathutils.bvhtree import BVHTree

V = Vector

# ----------------------------------------------------------------- helpers
def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj

def mesh_obj(name, verts, faces, smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.validate()
    me.update()
    for p in me.polygons:
        p.use_smooth = smooth
    return link(bpy.data.objects.new(name, me))

def apply_all_modifiers(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    obj.modifiers.clear()
    old = obj.data
    obj.data = me
    bpy.data.meshes.remove(old)

def paper_jitter(obj, amount, seed):
    """Crumple: push each vertex a little along its normal, deterministic per seed."""
    rng = np.random.default_rng(seed)
    me = obj.data
    n = len(me.vertices)
    if n == 0 or amount <= 0:
        return
    co = np.empty(n * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    nr = np.empty(n * 3); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
    co += nr * rng.normal(0, amount, (n, 1)) + rng.normal(0, amount * 0.35, (n, 3))
    me.vertices.foreach_set('co', co.ravel())
    me.update()

def flat(obj):
    for p in obj.data.polygons:
        p.use_smooth = False

def rot_to(vec_from, vec_to):
    return V(vec_from).rotation_difference(V(vec_to))

# ----------------------------------------------------------------- materials
def paper_material(p):
    m = bpy.data.materials.get('paper')
    if m:
        return m
    m = bpy.data.materials.new('paper')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    c = p['look']['paper_albedo']
    b.inputs['Base Color'].default_value = (c, c * 0.985, c * 0.965, 1)
    b.inputs['Roughness'].default_value = p['look']['paper_rough']
    if 'Subsurface Weight' in b.inputs:
        b.inputs['Subsurface Weight'].default_value = p['look'].get('paper_sss', 0.0)
        b.inputs['Subsurface Radius'].default_value = (0.02, 0.02, 0.02)
    return m

def backdrop_material(p):
    m = bpy.data.materials.new('backdrop')
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*p['look']['bg_albedo'], 1)
    b.inputs['Roughness'].default_value = 1.0
    return m

# ----------------------------------------------------------------- body
SEGMENTS = [
    # chain, (joint a, joint b)
    ('pelvis', 'abdomen'), ('abdomen', 'chest'), ('chest', 'neck'), ('neck', 'head'),
    ('chest', 'r_shoulder'), ('r_shoulder', 'r_elbow'), ('r_elbow', 'r_wrist'), ('r_wrist', 'r_hand'),
    ('chest', 'l_shoulder'), ('l_shoulder', 'l_elbow'), ('l_elbow', 'l_wrist'), ('l_wrist', 'l_hand'),
    ('pelvis', 'r_hip'), ('r_hip', 'r_knee'), ('r_knee', 'r_ankle'), ('r_ankle', 'r_toe'),
    ('pelvis', 'l_hip'), ('l_hip', 'l_knee'), ('l_knee', 'l_ankle'), ('l_ankle', 'l_toe'),
]

def J(p, name):
    return V(p['joints'][name])

def build_body(p, lod):
    bd = p['body']
    mb = bpy.data.metaballs.new('body')
    res = {0: 0.045, 1: 0.03, 2: 0.02}[lod['body_res']]
    mb.resolution = res
    mb.render_resolution = res
    mb.threshold = 0.6
    obj = link(bpy.data.objects.new('body', mb))
    k = bd['ball_k']
    R = p['radii']
    bulge = bd['bulge']
    for a, b in SEGMENTS:
        A, B = J(p, a), J(p, b)
        ra, rb = R[a], R[b]
        if a in ('chest',) and b.endswith('shoulder'):
            ra = rb  # shoulder bridge uses shoulder radius
        L = (B - A).length
        n = max(2, int(L / (0.45 * min(ra, rb))) + 1)
        bu = bulge.get(f'{a}-{b}', 0.0)
        for i in range(n + 1):
            t = i / n
            r = ra + (rb - ra) * t + bu * math.sin(math.pi * t)
            e = mb.elements.new()
            e.co = A.lerp(B, t)
            e.radius = r / k
            e.stiffness = 2.0
    # torso masses as ellipsoids (chest, abdomen, glutes, pecs, deltoids)
    for blob in bd['blobs']:
        e = mb.elements.new()
        e.type = 'ELLIPSOID'
        base = J(p, blob['at'])
        e.co = base + V(blob['off'])
        e.radius = blob['r'] / k
        e.size_x, e.size_y, e.size_z = blob['size']
        e.stiffness = blob.get('stiff', 2.0)
    fg = bd.get('fingers')
    if fg:
        for sd in ('r', 'l'):
            Wr, Hd = J(p, f'{sd}_wrist'), J(p, f'{sd}_hand')
            d = (Hd - Wr).normalized()
            fwd = V((0, -1, 0))
            sa = d.cross(fwd).normalized()
            nrm = sa.cross(d).normalized()
            spread = math.radians(fg['spread'])
            for i in range(4):
                u = (i - 1.5) / 1.5
                base = Hd + sa * u * fg['width'] * 0.5
                fd = (d * math.cos(spread * u) + sa * math.sin(spread * u)).normalized()
                curl = math.radians(fg['curl'][0 if sd == 'r' else 1])
                pts = [base]
                cur, dirv = base, fd
                for seg in range(3):
                    dirv = (dirv * math.cos(curl) - nrm * math.sin(curl)).normalized()
                    cur = cur + dirv * fg['len'] * (1 - 0.15 * seg) / 3 * (0.85 if i in (0, 3) else 1)
                    pts.append(cur)
                for a_, b_ in zip(pts, pts[1:]):
                    for t in (0.0, 0.5, 1.0):
                        e = mb.elements.new(); e.co = a_.lerp(b_, t); e.radius = fg['r'] / k; e.stiffness = 2.0
            # thumb from the base of the palm, on the forward side
            tb = Wr.lerp(Hd, 0.4) + fwd * 0.02 + sa * fg['width'] * 0.3 * (1 if sd == 'r' else -1)
            tt = tb + (d * 0.6 + fwd * 0.5).normalized() * fg['len'] * 0.8
            for t in (0.0, 0.33, 0.66, 1.0):
                e = mb.elements.new(); e.co = tb.lerp(tt, t); e.radius = fg['r'] * 1.15 / k; e.stiffness = 2.0
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    bpy.data.objects.remove(obj)
    bpy.data.metaballs.remove(mb)
    body = link(bpy.data.objects.new('body', me))
    return body

def decimate(obj, ratio):
    if ratio >= 0.999:
        return
    m = obj.modifiers.new('dec', 'DECIMATE')
    m.decimate_type = 'COLLAPSE'
    m.ratio = ratio
    m.use_collapse_triangulate = True
    apply_all_modifiers(obj)

# ----------------------------------------------------------------- armour pieces
def strip_quad(base, down, side, length, width, fold, segs=2):
    """A folded paper strip: hangs from base along `down`, crease down the middle pushed by `fold`."""
    out = side.cross(down).normalized()
    verts, faces = [], []
    for i in range(segs + 1):
        t = i / segs
        c = base + down * (length * t)
        w = width * (1 - 0.15 * t)
        verts += [c - side * (w / 2), c + out * fold * (0.5 + t), c + side * (w / 2)]
    for i in range(segs):
        a = i * 3
        faces += [(a, a + 1, a + 4, a + 3), (a + 1, a + 2, a + 5, a + 4)]
    return verts, faces

class Acc:
    def __init__(self):
        self.v, self.f = [], []
    def add(self, verts, faces):
        o = len(self.v)
        self.v += [V(x) for x in verts]
        self.f += [tuple(i + o for i in f) for f in faces]
    def obj(self, name, xform=None):
        verts = self.v if xform is None else [xform @ x for x in self.v]
        return mesh_obj(name, verts, self.f)

def build_skirt(p, lod):
    s = p['skirt']
    acc = Acc()
    c = J(p, 'pelvis') + V(s['off'])
    rng = random.Random(7)
    rows = s['rows']
    n = lod['skirt_strips']
    for ri, row in enumerate(rows):
        for i in range(n):
            a = 2 * math.pi * (i + 0.5 * ri) / n
            dirv = V((math.sin(a), -math.cos(a), 0))
            rx, ry = row['rx'], row['ry']
            base = c + V((math.sin(a) * rx, -math.cos(a) * ry, row['z']))
            flare = row['flare']
            down = (V((0, 0, -1)) + dirv * flare).normalized()
            side = V((math.cos(a), math.sin(a), 0))
            L = row['len'] * (1 + rng.uniform(-0.08, 0.08))
            # longer at the front and back, a touch shorter at the hips (reference skirt)
            L *= 1 + s['front_long'] * abs(math.cos(a))
            width = 2 * math.pi * max(rx, ry) / n * row['overlap']
            v, f = strip_quad(base, down, side, L, width, row['fold'], segs=lod['strip_segs'])
            acc.add(v, f)
    # belt
    nb = 16
    bv, bf = [], []
    for i in range(nb):
        a = 2 * math.pi * i / nb
        for z, sc in ((s['belt_z'], 1.0), (s['belt_z'] - s['belt_h'], 1.02)):
            bv.append(c + V((math.sin(a) * s['belt_rx'] * sc, -math.cos(a) * s['belt_ry'] * sc, z)))
    for i in range(nb):
        j = (i + 1) % nb
        bf.append((2 * i, 2 * j, 2 * j + 1, 2 * i + 1))
    acc.add(bv, bf)
    return acc.obj('skirt')

def build_shoulder_guards(p, lod):
    g = p['shoulders']
    acc = Acc()
    rng = random.Random(3)
    for side_name, sgn in (('r', -1), ('l', 1)):
        S = J(p, f'{side_name}_shoulder')
        E = J(p, f'{side_name}_elbow')
        arm = (E - S).normalized()
        out = V((sgn, 0, 0))
        for ri, row in enumerate(g['rows']):
            n = row['n']
            for i in range(n):
                # strips fan over the shoulder cap: front -> outside -> back
                a = math.radians(-row['spread'] / 2 + row['spread'] * i / max(1, n - 1))
                rad = V((sgn * math.cos(a), -math.sin(a), 0)) * row['r']
                base = S + rad + V((0, 0, row['z']))
                down = (arm * (1 - row['flare']) + rad.normalized() * row['flare']).normalized()
                side = down.cross(rad.normalized()).normalized()
                L = row['len'] * (1 + rng.uniform(-0.1, 0.1))
                v, f = strip_quad(base, down, side, L, row['w'], row['fold'], segs=lod['strip_segs'])
                acc.add(v, f)
    return acc.obj('shoulder_guards')

def tube(A, B, rA, rB, n, cap=False):
    ax = (B - A).normalized()
    q = rot_to((0, 0, 1), ax)
    verts, faces = [], []
    for k, (C, r) in enumerate(((A, rA), (B, rB))):
        for i in range(n):
            a = 2 * math.pi * i / n
            verts.append(C + q @ V((math.cos(a) * r, math.sin(a) * r, 0)))
    for i in range(n):
        j = (i + 1) % n
        faces.append((i, j, n + j, n + i))
    return verts, faces

def build_bands(p, lod):
    """Wrist bracers, ankle wraps, sandal straps and shin greave ridges."""
    acc = Acc()
    n = lod['ring_n']
    b = p['bands']
    for s in ('r', 'l'):
        E, W = J(p, f'{s}_elbow'), J(p, f'{s}_wrist')
        A = W.lerp(E, b['bracer_a']); B = W.lerp(E, b['bracer_b'])
        acc.add(*tube(A, B, b['bracer_r'], b['bracer_r'] * 1.12, n))
        K, An = J(p, f'{s}_knee'), J(p, f'{s}_ankle')
        for t in b['shin_rings']:
            C = An.lerp(K, t)
            acc.add(*tube(C - V((0, 0, 0.012)), C + V((0, 0, 0.012)), b['shin_r'] * (1 + 0.6 * t), b['shin_r'] * (1 + 0.6 * t), n))
        # sandal: sole plate + straps
        T = J(p, f'{s}_toe')
        acc.add(*tube(An - V((0, 0, 0.03)), An + V((0, 0, 0.03)), b['ankle_r'], b['ankle_r'], n))
        fwd = (T - An); fwd.z = 0; fwd.normalize()
        lat = fwd.cross(V((0, 0, 1)))
        sole = []
        heel = V((An.x, An.y, 0.005)) - fwd * 0.06
        toe = V((T.x, T.y, 0.005)) + fwd * 0.04
        w = b['sole_w']
        for P, ww in ((heel, w * 0.8), (heel.lerp(toe, 0.5), w), (toe, w * 0.9)):
            sole += [P - lat * ww / 2, P + lat * ww / 2, P - lat * ww / 2 + V((0, 0, 0.022)), P + lat * ww / 2 + V((0, 0, 0.022))]
        sf = [(0, 1, 5, 4), (4, 5, 9, 8), (2, 6, 7, 3), (6, 10, 11, 7), (0, 4, 6, 2), (4, 8, 10, 6), (1, 3, 7, 5), (5, 7, 11, 9), (8, 9, 11, 10), (0, 2, 3, 1)]
        acc.add(sole, sf)
        gr = b.get('greave')
        if gr:
            ax = (K - An).normalized()
            fw = V((0, -1, 0)); fw = (fw - ax * fw.dot(ax)).normalized(); sd_ = ax.cross(fw)
            gv = []
            rows, cols = 4, 5
            for i in range(rows):
                t = gr['t0'] + (gr['t1'] - gr['t0']) * i / (rows - 1)
                C = An.lerp(K, t)
                rr = b['shin_r'] * gr['r'] * (1 + 0.5 * t)
                for j in range(cols):
                    a = math.radians(-gr['wrap'] + 2 * gr['wrap'] * j / (cols - 1))
                    gv.append(C + (fw * math.cos(a) + sd_ * math.sin(a)) * rr)
            gf = [(i * cols + j, i * cols + j + 1, (i + 1) * cols + j + 1, (i + 1) * cols + j) for i in range(rows - 1) for j in range(cols - 1)]
            acc.add(gv, gf)
    return acc.obj('bands')

def build_helmet(p, lod):
    h = p['helmet']
    acc = Acc()
    C = J(p, 'head') + V(h['off'])
    rx, ry, rz = h['r']
    nu, nv = lod['helm_u'], lod['helm_v']
    # dome (latitude from brow up to the top)
    lat0 = math.radians(h['brow_lat'])
    verts = []
    for j in range(nv + 1):
        lat = lat0 + (math.pi / 2 - lat0) * j / nv
        for i in range(nu):
            a = 2 * math.pi * i / nu
            verts.append(C + V((math.sin(a) * math.cos(lat) * rx, -math.cos(a) * math.cos(lat) * ry, math.sin(lat) * rz)))
    faces = []
    for j in range(nv):
        for i in range(nu):
            ii = (i + 1) % nu
            faces.append((j * nu + i, j * nu + ii, (j + 1) * nu + ii, (j + 1) * nu + i))
    acc.add(verts, faces)
    # brow band / peak: a flared ring at the brow line
    ring = []
    for i in range(nu):
        a = 2 * math.pi * i / nu
        front = max(0.0, -math.cos(a + math.pi))  # 1 at the front
        for k, (sc, dz) in enumerate(((1.0, 0.0), (1.0 + h['peak'] * (0.3 + front), -0.012))):
            ring.append(C + V((math.sin(a) * math.cos(lat0) * rx * sc, -math.cos(a) * math.cos(lat0) * ry * sc, math.sin(lat0) * rz + dz)))
    rf = [(2 * i, 2 * ((i + 1) % nu), 2 * ((i + 1) % nu) + 1, 2 * i + 1) for i in range(nu)]
    acc.add(ring, rf)
    # neck guard: flare at the back
    ng = []
    na = 9
    for i in range(na):
        a = math.radians(110 + 140 * i / (na - 1))  # around the back
        for sc, dz in ((1.0, 0.0), (1.0 + h['neck_flare'], -h['neck_len'])):
            ng.append(C + V((math.sin(a) * math.cos(lat0) * rx * sc, -math.cos(a) * math.cos(lat0) * ry * sc, math.sin(lat0) * rz + dz)))
    nf = [(2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(na - 1)]
    acc.add(ng, nf)
    # cheek guards: curved plates hanging from the brow at the sides of the face
    for sgn in (-1, 1):
        cv = []
        nr = 4
        for i in range(nr):
            a = sgn * math.radians(h['cheek_a0'] + (h['cheek_a1'] - h['cheek_a0']) * i / (nr - 1))
            for t in (0.0, 0.5, 1.0):
                z = math.sin(lat0) * rz - t * h['cheek_len']
                inward = 1.0 - h['cheek_in'] * t
                cv.append(C + V((math.sin(a) * rx * 1.02 * inward, -math.cos(a) * ry * 1.02 * inward, z)))
        cf = []
        for i in range(nr - 1):
            for t in range(2):
                a0 = i * 3 + t
                cf.append((a0, a0 + 3, a0 + 4, a0 + 1))
        acc.add(cv, cf)
    # crest: fan of folded blades along the sagittal arc, sweeping back
    c = p['crest']
    nb = lod['crest_blades']
    rng = random.Random(11)
    for i in range(nb):
        t = i / (nb - 1)
        ang = math.radians(c['a0'] + (c['a1'] - c['a0']) * t)   # 0 = straight up, + = towards back
        base = C + V((0, math.sin(ang) * ry * 0.98, math.cos(ang) * rz * 0.98)) + V((0, 0, c['lift']))
        out = V((0, math.sin(ang + math.radians(c['rake'])), math.cos(ang + math.radians(c['rake']))))
        L = c['len'] * (c['taper'] + (1 - c['taper']) * math.sin(math.pi * min(1, t * c['peak_at'])))
        L *= 1 + rng.uniform(-0.1, 0.1)
        tip = base + out * L + V((0, c['curl'] * (L / c['len']) ** 2, 0))
        w = c['w'] * (1.0 - 0.5 * t)
        side = V((1, 0, 0))
        along = V((0, math.cos(ang), -math.sin(ang)))
        bv = [base - along * w / 2, base + side * c['fold'] * 0.3, base + along * w / 2,
              tip - along * w * 0.25 + side * c['fold'], tip + along * w * 0.25]
        acc.add(bv, [(0, 1, 3), (1, 2, 4), (1, 4, 3)])
    # crest holder
    acc.add(*tube(C + V((0, -0.01, rz * 0.9)), C + V((0, 0.02, rz + c['lift'] + 0.02)), 0.012, 0.012, 5))
    return acc.obj('helmet')

def build_shield(p, lod):
    s = p['shield']
    nu, nv = lod['shield_u'], lod['shield_v']
    W, H, Rc = s['w'], s['h'], s['curve']
    verts, faces = [], []
    # elliptical grid: rows from bottom to top, columns across; bent around a vertical axis
    for j in range(nv + 1):
        v = -1 + 2 * j / nv
        half = math.sqrt(max(0.0, 1 - v * v)) ** s['squareness']
        for i in range(nu + 1):
            u = (-1 + 2 * i / nu) * half
            x = u * W / 2
            z = v * H / 2
            th = x / Rc
            px = Rc * math.sin(th)
            py = Rc * (1 - math.cos(th)) + s['vcurve'] * (v * v)
            verts.append(V((px, py, z)))
    for j in range(nv):
        for i in range(nu):
            a = j * (nu + 1) + i
            faces.append((a, a + 1, a + nu + 2, a + nu + 1))
    ob = mesh_obj('shield', verts, faces)
    sol = ob.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = s['thick']; sol.offset = 0
    apply_all_modifiers(ob)
    # merge collapsed vertices at the poles
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bm.to_mesh(ob.data); bm.free()
    R = Euler((math.radians(s['pitch']), math.radians(s['roll']), math.radians(s['yaw'])), 'ZXY').to_matrix().to_4x4()
    ob.matrix_world = Matrix.Translation(J(p, 'l_hand') + V(s['off'])) @ R
    apply_xform(ob)
    return ob

def apply_xform(ob):
    ob.data.transform(ob.matrix_world)
    ob.matrix_world = Matrix.Identity(4)

def build_sash(p, body, lod):
    """Diagonal sash (balteus) from right shoulder to left hip, projected onto the body."""
    s = p['sash']
    me = body.data
    bvh = BVHTree.FromPolygons([v.co.copy() for v in me.vertices], [tuple(f.vertices) for f in me.polygons])
    A = J(p, 'r_shoulder').lerp(J(p, 'neck'), s['a_t']) + V(s['a_off'])
    B = J(p, 'l_hip') + V(s['b_off'])
    n = 10
    verts, faces = [], []
    for i in range(n + 1):
        t = i / n
        P = A.lerp(B, t) + V((0, -0.5, 0))
        hit = bvh.ray_cast(P, V((0, 1, 0)))
        if hit[0] is None:
            loc, nor = A.lerp(B, t), V((0, -1, 0))
        else:
            loc, nor = hit[0], hit[1]
        d = (B - A).normalized()
        side = nor.cross(d).normalized()
        loc = loc + nor * s['lift']
        verts += [loc - side * s['w'] / 2, loc + side * s['w'] / 2]
    for i in range(n):
        faces.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    ob = mesh_obj('sash', verts, faces)
    if s.get('thick'):
        sol = ob.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = s['thick']; sol.offset = 1
        apply_all_modifiers(ob)
    return ob

# ----------------------------------------------------------------- stage
def build_stage(p):
    st = p['stage']
    prof = []
    R = st['cyc_r']
    for i in range(12):
        a = math.pi / 2 * i / 11
        prof.append((st['wall_y'] - R + R * math.sin(a), R - R * math.cos(a)))
    prof = [(-30.0, 0.0)] + prof + [(st['wall_y'], 30.0)]
    verts, faces = [], []
    for x in (-30.0, 30.0):
        for y, z in prof:
            verts.append((x, y, z))
    n = len(prof)
    for i in range(n - 1):
        faces.append((i, i + 1, n + i + 1, n + i))
    ob = mesh_obj('cyc', verts, faces, smooth=True)
    ob.data.materials.append(backdrop_material(p))
    return ob

def build_lights(p):
    L = p['light']
    sc = bpy.context.scene
    def area(name, az, el, dist, size, power, color=(1, 1, 1)):
        ld = bpy.data.lights.new(name, 'AREA')
        ld.shape = 'DISK'; ld.size = size; ld.energy = power; ld.color = color
        ob = link(bpy.data.objects.new(name, ld))
        a, e = math.radians(az), math.radians(el)
        tgt = V((0, 0, 1.0))
        ob.location = tgt + V((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
        ob.rotation_euler = (tgt - ob.location).to_track_quat('-Z', 'Y').to_euler()
        return ob
    area('key', L['key_az'], L['key_el'], L['key_dist'], L['key_size'], L['key_power'])
    area('fill', L['fill_az'], L['fill_el'], 6, 6, L['fill_power'], (0.85, 0.95, 1.0))
    w = bpy.data.worlds.new('world'); sc.world = w
    w.use_nodes = True
    bgn = w.node_tree.nodes['Background']
    bgn.inputs['Color'].default_value = (*L['world_color'], 1)
    bgn.inputs['Strength'].default_value = L['world_strength']
    sc.view_settings.view_transform = p['look'].get('view', 'Standard')
    sc.view_settings.exposure = p['look'].get('exposure', 0.0)

def build_camera(p, W=1024, H=1024):
    c = p['cam']
    sc = bpy.context.scene
    cd = bpy.data.cameras.new('cam'); cd.lens = c['focal']; cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24
    cd.shift_x = c.get('shift_x', 0); cd.shift_y = c.get('shift_y', 0)
    ob = link(bpy.data.objects.new('cam', cd))
    a = math.radians(c['az'])
    ob.location = V((math.sin(a) * c['dist'], -math.cos(a) * c['dist'], c['height']))
    tgt = V((c.get('tx', 0), 0, c['target_z']))
    ob.rotation_euler = (tgt - ob.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = ob
    sc.render.resolution_x, sc.render.resolution_y = W, H
    return ob

# ----------------------------------------------------------------- top level
def lod_settings(level):
    return {
        0: dict(body_res=0, body_ratio=0.18, skirt_strips=12, strip_segs=1, ring_n=5, helm_u=8, helm_v=3, crest_blades=7, shield_u=6, shield_v=6, jitter=0.006),
        1: dict(body_res=1, body_ratio=0.22, skirt_strips=18, strip_segs=2, ring_n=7, helm_u=12, helm_v=4, crest_blades=12, shield_u=10, shield_v=10, jitter=0.005),
        2: dict(body_res=2, body_ratio=0.30, skirt_strips=24, strip_segs=3, ring_n=9, helm_u=16, helm_v=6, crest_blades=18, shield_u=16, shield_v=14, jitter=0.004),
    }[level]

def build_figure(p, level=1, with_stage=True):
    lod = lod_settings(level)
    mat = paper_material(p)
    body = build_body(p, lod)
    decimate(body, p['look'].get('body_ratio', {}).get(str(level), lod['body_ratio']) if isinstance(p['look'].get('body_ratio'), dict) else lod['body_ratio'])
    paper_jitter(body, lod['jitter'] * p['look']['crumple'], 1)
    parts = [body,
             build_skirt(p, lod), build_shoulder_guards(p, lod), build_bands(p, lod),
             build_helmet(p, lod), build_shield(p, lod), build_sash(p, body, lod)]
    hy = p['helmet'].get('yaw', 0.0)
    if hy:
        Hc = J(p, 'head')
        parts[4].data.transform(Matrix.Translation(Hc) @ Matrix.Rotation(math.radians(hy), 4, 'Z') @ Matrix.Translation(-Hc))
    for i, ob in enumerate(parts[1:]):
        paper_jitter(ob, lod['jitter'] * 0.4 * p['look']['crumple'], 100 + i)
    # place whole figure: yaw about Z and ground offset
    f = p['fig']
    M = Matrix.Translation(V((f['x'], f['y'], 0))) @ Matrix.Rotation(math.radians(f['yaw']), 4, 'Z') @ Matrix.Scale(f['scale'], 4)
    for ob in parts:
        ob.data.transform(M)
        flat(ob)
        ob.data.materials.clear(); ob.data.materials.append(mat)
    if with_stage:
        build_stage(p)
        build_lights(p)
    return parts

def silhouette(p, parts, W=256, H=256):
    """Fast CPU raster of the figure silhouette using the scene camera (no render engine)."""
    from PIL import Image, ImageDraw
    sc = bpy.context.scene
    cam = sc.camera
    dg = bpy.context.evaluated_depsgraph_get()
    P = np.array(cam.calc_matrix_camera(dg, x=W, y=H)) @ np.array(cam.matrix_world.inverted())
    img = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(img)
    for ob in parts:
        me = ob.data
        me.calc_loop_triangles()
        n = len(me.vertices)
        co = np.empty(n * 3); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        h = np.c_[co, np.ones(n)] @ P.T
        xy = h[:, :2] / h[:, 3:4]
        px = (xy[:, 0] * 0.5 + 0.5) * W
        py = (0.5 - xy[:, 1] * 0.5) * H
        tri = np.empty(len(me.loop_triangles) * 3, dtype=np.int64)
        me.loop_triangles.foreach_get('vertices', tri)
        tri = tri.reshape(-1, 3)
        pts = np.stack([px[tri], py[tri]], -1)
        for t in pts:
            dr.polygon([tuple(t[0]), tuple(t[1]), tuple(t[2])], fill=255)
    return np.asarray(img) > 127

def render(path, W, H, samples=64, denoise=True):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = denoise
    sc.cycles.max_bounces = 6
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = False
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

def setup(p, level=1, W=1024, H=1024, with_stage=True):
    clear_scene()
    parts = build_figure(p, level, with_stage)
    build_camera(p, W, H)
    return parts
