"""Papercraft construction grammar: style rules that apply to ANY mesh, independent of what the mesh depicts.

Rules (each is a function on a Blender mesh object):
  facet(obj, edge, crumple)     faceted surface: re-triangulate to a target edge length, then crumple each vertex by a
                                fraction of the local edge length, so the paper looks the same at any scale or density
  plates(obj, ...)              cut a surface region into flat-ish plates along seams, put a centre fold in each,
                                overlap them like shingles and give them paper thickness (armour, cuirass, roofs, walls)
  stiffen(obj, thick, jitter)   give strip/sheet parts paper thickness and slight hand-made irregularity
                                (skirt tabs, shoulder flaps, crest feathers, flags)
  material                      matte paper: high roughness, faint sheen, tiny fibre bump only (no fake folds in the shader)
A style is a dict of these rules per role; the builder tags each part with a role.
"""
import bpy, bmesh, math, random
import numpy as np
from mathutils import Vector as V, Matrix

def _apply(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
    obj.modifiers.clear(); old = obj.data; obj.data = me; bpy.data.meshes.remove(old)

def _co(me):
    a = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', a); return a.reshape(-1, 3)

def mean_edge(me):
    co = _co(me)
    e = np.empty(len(me.edges) * 2, dtype=np.int64); me.edges.foreach_get('vertices', e); e = e.reshape(-1, 2)
    if len(e) == 0: return 0.0
    return float(np.linalg.norm(co[e[:, 0]] - co[e[:, 1]], axis=1).mean())

def facet(obj, edge=0.04, crumple=0.12, seed=1):
    """Decimate to roughly `edge` mean edge length, then crumple by `crumple` x local edge length."""
    me = obj.data
    cur = mean_edge(me)
    if cur > 0 and cur < edge:
        ratio = max(0.02, (cur / edge) ** 2)
        m = obj.modifiers.new('dec', 'DECIMATE'); m.decimate_type = 'COLLAPSE'; m.ratio = ratio; m.use_collapse_triangulate = True
        _apply(obj)
    me = obj.data
    me.calc_loop_triangles()
    L = mean_edge(me)
    rng = np.random.default_rng(seed)
    co = _co(me)
    nr = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('normal', nr); nr = nr.reshape(-1, 3)
    co += nr * rng.normal(0, crumple * L, (len(co), 1))
    me.vertices.foreach_set('co', co.ravel()); me.update()
    return L

def _kmeans(X, k, iters=12, seed=0):
    rng = np.random.default_rng(seed)
    C = X[rng.choice(len(X), size=min(k, len(X)), replace=False)]
    for _ in range(iters):
        d = ((X[:, None, :] - C[None, :, :]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(len(C)):
            pts = X[lab == j]
            if len(pts): C[j] = pts.mean(0)
    return lab

def plates(obj, region=None, k=30, normal_w=0.06, flatten=0.6, fold=0.25, overlap=0.04, lift=0.003, thick=0.004, seed=0):
    """Cut faces (optionally only those whose centre passes `region(center)`) into k shingled, folded plates."""
    bm = bmesh.new(); bm.from_mesh(obj.data)
    bm.faces.ensure_lookup_table()
    faces = [f for f in bm.faces if region is None or region(f.calc_center_median())]
    if len(faces) < k * 2:
        bm.free(); return
    X = np.array([[*f.calc_center_median(), *(f.normal * normal_w / 0.06 * 0.06)] for f in faces])
    X[:, 3:] *= normal_w / 0.06
    lab = _kmeans(X, k, seed=seed)
    flab = {f.index: int(l) for f, l in zip(faces, lab)}
    # split along cluster borders (and the border to non-plate faces)
    cut = [e for e in bm.edges if len(e.link_faces) == 2 and flab.get(e.link_faces[0].index, -1) != flab.get(e.link_faces[1].index, -1)]
    bmesh.ops.split_edges(bm, edges=cut)
    bm.faces.ensure_lookup_table(); bm.verts.ensure_lookup_table()
    groups = {}
    for f in bm.faces:
        l = flab.get(f.index, -1)
        if l >= 0: groups.setdefault(l, set()).update(f.verts)
    order = sorted(groups, key=lambda l: -np.mean([v.co.z for v in groups[l]]))
    for rank, l in enumerate(order):
        vs = list(groups[l])
        P = np.array([v.co[:] for v in vs]); c = P.mean(0)
        n = np.mean([np.array(f.normal[:]) for f in bm.faces if flab.get(f.index, -1) == l], axis=0)
        n /= np.linalg.norm(n) + 1e-9
        Q = P - c
        dist = Q @ n
        Q = Q - np.outer(dist * flatten, n)              # flatten toward the plate plane
        inplane = Q - np.outer(Q @ n, n)
        if len(P) >= 3:
            u, s_, vt = np.linalg.svd(inplane, full_matrices=False)
            axis = vt[0]
        else:
            axis = np.array([0, 0, 1.0])
        perp = inplane - np.outer(inplane @ axis, axis)
        d = np.linalg.norm(perp, axis=1); half = d.max() + 1e-9
        Q = Q + np.outer(fold * half * (1 - d / half), n)  # centre ridge: a single fold down the plate
        Q = Q * (1 + overlap)
        Q = Q + n * (lift * (rank % 3))                      # shingle layering
        for v, q in zip(vs, Q):
            v.co = V((c + q).tolist())
    bm.to_mesh(obj.data); bm.free()
    if thick:
        sol = obj.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = thick; sol.offset = -1; _apply(obj)

def stiffen(obj, thick=0.003, jitter_deg=4, seed=2):
    """Paper thickness for sheet parts plus a slight per-island twist so strips don't look machine-stamped."""
    bm = bmesh.new(); bm.from_mesh(obj.data)
    rng = random.Random(seed)
    seen = set()
    for v in bm.verts:
        if v in seen: continue
        isl, stack = [], [v]
        while stack:
            x = stack.pop()
            if x in seen: continue
            seen.add(x); isl.append(x)
            for e in x.link_edges: stack.append(e.other_vert(x))
        if len(isl) < 3: continue
        top = max(isl, key=lambda q: q.co.z).co.copy()
        R = Matrix.Rotation(math.radians(rng.gauss(0, jitter_deg)), 3, V((rng.random() - .5, rng.random() - .5, 0)).normalized() if rng.random() > .1 else V((1, 0, 0)))
        for q in isl:
            q.co = top + R @ (q.co - top)
    bm.to_mesh(obj.data); bm.free()
    if thick:
        sol = obj.modifiers.new('sol', 'SOLIDIFY'); sol.thickness = thick; sol.offset = 0; _apply(obj)

def paper_material(albedo=0.72, rough=0.88, sheen=0.25, fibre=0.15):
    m = bpy.data.materials.new('papercraft'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (albedo, albedo * 0.985, albedo * 0.96, 1)
    b.inputs['Roughness'].default_value = rough
    if 'Sheen Weight' in b.inputs: b.inputs['Sheen Weight'].default_value = sheen
    if fibre:
        tex = nt.nodes.new('ShaderNodeTexNoise'); tex.inputs['Scale'].default_value = 900; tex.inputs['Detail'].default_value = 2
        bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = fibre * 0.2; bump.inputs['Distance'].default_value = 0.0005
        nt.links.new(tex.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m

# ------------------------------------------------------------------ the papercraft style
def apply_style(style, parts_by_role, J=None):
    """parts_by_role: {'skin': [objs], 'armour': [...], 'strips': [...], 'trim': [...]}  ->  modified in place."""
    for ob in parts_by_role.get('skin', []):
        facet(ob, **style['skin'])
    for ob in parts_by_role.get('armour_body', []):
        if style.get('bands'):
            bands(ob, **style['bands'])
        if style.get('plates', {}).get('k'):
            reg = style.get('_torso_region')
            plates(ob, region=reg, **style['plates'])
    for ob in parts_by_role.get('strips', []):
        stiffen(ob, **style['strips'])
    for ob in parts_by_role.get('trim', []):
        facet(ob, **style['trim'])
    mat = paper_material(**style['material'])
    for objs in parts_by_role.values():
        for ob in objs:
            for poly in ob.data.polygons: poly.use_smooth = False
            ob.data.materials.clear(); ob.data.materials.append(mat)

def bands(obj, spacing=0.07, tilt=12, lift=0.004, z0=-1e9, z1=1e9, extra_planes=(), seed=3):
    """Straight seams: cut the surface with tilted planes every `spacing` (plus any extra planes, e.g. a centre seam),
    split along the cuts and lift alternate bands, so the surface reads as overlapping paper bands with clean seams."""
    bm = bmesh.new(); bm.from_mesh(obj.data)
    rng = random.Random(seed)
    zs = [v.co.z for v in bm.verts]
    lo, hi = max(min(zs), z0), min(max(zs), z1)
    planes = []
    z = lo + spacing * 0.5
    i = 0
    while z < hi:
        a = math.radians(tilt * (1 if i % 2 else -1) + rng.gauss(0, tilt * 0.3))
        b = math.radians(rng.gauss(0, tilt * 0.5))
        n = V((math.sin(b), math.sin(a), 1)).normalized()
        planes.append((V((0, 0, z)), n)); z += spacing * (1 + rng.uniform(-0.15, 0.15)); i += 1
    planes += [(V(c), V(n).normalized()) for c, n in extra_planes]
    cut_edges = set()
    for co, no in planes:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        r = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no)
        cut_edges.update(e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge))
    bmesh.ops.split_edges(bm, edges=[e for e in cut_edges if e.is_valid])
    bm.normal_update()
    # islands, ranked by height; alternate ones are lifted along their vertex normals
    seen = set(); islands = []
    for v in bm.verts:
        if v in seen: continue
        isl, st = [], [v]
        while st:
            x = st.pop()
            if x in seen: continue
            seen.add(x); isl.append(x)
            for e in x.link_edges: st.append(e.other_vert(x))
        islands.append(isl)
    islands.sort(key=lambda isl: -sum(q.co.z for q in isl) / len(isl))
    for r_, isl in enumerate(islands):
        if r_ % 2 == 0: continue
        for q in isl: q.co += q.normal * lift
    bm.to_mesh(obj.data); bm.free()
