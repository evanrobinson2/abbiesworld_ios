"""Install rebuilt models into the Ranch tile.

usage: python to_game.py NAME [NAME ...]     (or `all`: every models/<name> with a finished GLB)

The tile loads two kinds of model:
  * mesh lists (`simulation-assets/<category>/<id>.json`): one entry per part, positions in metres with Y up, flat
    normals, an sRGB colour and a material role that picks the game's shading profile. Buildings, animals, the shade
    tree and supplies use these, plus a GLB of the same name.
  * plain GLBs (regional plants and trees, garden props), recoloured in game by material name.
Each modeler exports `models/<name>/<name>.glb` and, where the game has states, `models/<name>/variants/<state>.glb`.
This writes every file the game reads, keeping the old ids, and updates the triangle counts in the catalogues.
"""
import sys, os, json, shutil, re
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.join(HERE, '..', '..', 'prototypes', 'ranch-atelier', 'dist')
STAGES = ['planned', 'foundation', 'frame', 'roof', 'complete']
POSES = ['idle', 'feeding', 'rest']
FILLS = ['full', 'partial', 'empty', 'carried']
# name -> (kind, game id or path, states)
TARGETS = {
    'family-home': ('mesh', 'buildings/family-home', STAGES), 'feed-store': ('mesh', 'buildings/feed-store', STAGES),
    'water-point': ('mesh', 'buildings/water-point', STAGES), 'horse-shelter': ('mesh', 'buildings/cattle-shelter', STAGES),
    'goat-shelter': ('mesh', 'buildings/goat-shelter', STAGES), 'chicken-coop': ('mesh', 'buildings/chicken-coop', STAGES),
    'barn-shelter': ('mesh', 'buildings/shelter', STAGES),
    'horse': ('mesh', 'organics/horse', POSES), 'cow': ('mesh', 'organics/cow', POSES), 'goat': ('mesh', 'organics/goat', POSES),
    'chicken': ('mesh', 'organics/chicken', POSES), 'tree-standing': ('mesh', 'organics/tree', ['standing', 'stump']),
    'hay-rack': ('mesh', 'supplies/hay', FILLS), 'ration-jar': ('mesh', 'supplies/ration', FILLS),
    'water-bucket': ('mesh', 'supplies/water-bucket', FILLS), 'water-trough': ('mesh', 'supplies/water-trough', ['full', 'partial', 'empty']),
    'birch': ('glb', 'simulations/regional-assets/WW-139.glb'), 'maple': ('glb', 'simulations/regional-assets/WW-151.glb'),
    'apple-tree': ('glb', 'simulations/regional-assets/GF-153.glb'), 'hazel': ('glb', 'simulations/regional-assets/GF-158.glb'),
    'elder': ('glb', 'simulations/regional-assets/GF-159.glb'), 'stone-edging': ('glb', 'simulations/regional-assets/GF-010.glb'),
    'borage': ('glb', 'simulations/regional-assets/GF-249.glb'), 'marigold': ('glb', 'simulations/regional-assets/GF-250.glb'),
    'sunflower': ('glb', 'simulations/regional-assets/GF-567.glb'), 'hollyhock': ('glb', 'simulations/regional-assets/GF-634.glb'),
    'coneflower': ('glb', 'simulations/regional-assets/GF-679.glb'), 'clover': ('glb', 'simulations/regional-assets/UP-051.glb'),
    'fern': ('glb', 'simulations/regional-assets/WW-046.glb'), 'bramble': ('glb', 'simulations/regional-assets/WW-273.glb'),
    'goldenrod': ('glb', 'simulations/regional-assets/WW-347.glb'),
    'compost-bay': ('glb', 'garden-assets/GF-019.glb'), 'potting-bench': ('glb', 'garden-assets/GF-020.glb'),
    'watering-pot': ('glb', 'garden-assets/GF-074.glb'), 'bench': ('glb', 'garden-assets/GF-194.glb'),
}
# the game's material roles, matched on material then object name (same patterns as simulations/material-policy.js)
ROLE_PATTERNS = [('glass', r'glass'), ('water', r'^(?:water)(?:[. _-]|$)'), ('metal', r'bronze|metal|copper|steel|iron|brass'),
                 ('plaster', r'plaster|stucco|wall'), ('foliage', r'leaf|leaves|foliage|canopy|grass|moss|petal|flower|stem'),
                 ('ground', r'soil|earth|ground|terrain|sand|mud|compost'), ('roof', r'roof|shingle|thatch'),
                 ('timber', r'wood|timber|bark|plank|beam|post'), ('stone', r'stone|rock|slate|brick'), ('clay', r'clay|ceramic|terracotta'),
                 ('fiber', r'rope|reed|straw|wicker|hay'), ('food', r'onion|bread|grain|fruit|apple|berry|vegetable|feed|nut'),
                 ('cloth', r'cloth|fabric|canvas|linen|wool'), ('skin', r'skin|fur|hide|hair|mane|leather|feather|horn|hoof|beak|comb')]


def role_of(*names):
    for n in names:
        n = (n or '').lower()
        for role, pat in ROLE_PATTERNS:
            if re.search(pat, n):
                return role
    return 'plain'


def to_srgb(c):
    c = np.clip(np.asarray(c[:3], float), 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def mesh_list(glb, yaw=0.0):
    """GLB -> the tile's part list (Y up, metres, origin on the ground at the footprint centre, front +Z)."""
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    bpy.context.scene.frame_set(1)          # the rest pose, not wherever the idle loop happens to be
    dg = bpy.context.evaluated_depsgraph_get()
    parts, R = [], np.array([[np.cos(yaw), 0, np.sin(yaw)], [0, 1, 0], [-np.sin(yaw), 0, np.cos(yaw)]])
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH':
            continue
        ev = ob.evaluated_get(dg); me = ev.to_mesh(); me.calc_loop_triangles()
        M = np.array(ob.matrix_world)
        co = np.array([v.co[:] for v in me.vertices]).reshape(-1, 3)
        co = (np.c_[co, np.ones(len(co))] @ M.T)[:, :3]
        co = co[:, [0, 2, 1]] * [1, 1, -1]                     # Blender Z up -> three.js Y up (front -Y -> +Z)
        co = co @ R.T
        by_mat = {}
        for t in me.loop_triangles:
            by_mat.setdefault(t.material_index, []).append(t.vertices[:])
        for mi, tris in by_mat.items():
            mat = me.materials[mi] if mi < len(me.materials) else None
            col = [0.8, 0.8, 0.8]
            if mat and mat.use_nodes and mat.node_tree.nodes.get('Principled BSDF'):
                col = list(mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value)
            elif mat:
                col = list(mat.diffuse_color)
            P = co[np.array(tris)]                                # (n, 3, 3)
            n = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]); n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
            N = np.repeat(n[:, None], 3, 1)
            mname = mat.name if mat else ''
            srgb = [round(float(x), 4) for x in to_srgb(col)]
            parts.append(dict(name=ob.name, positions=[round(float(x), 4) for x in P.ravel()], normals=[round(float(x), 4) for x in N.ravel()],
                              color=srgb, role=role_of(mname, ob.name), defaultColor=srgb, materialName=mname.lower(),
                              surfaceName=ob.name, roleSource='ranch-rebuild material-and-object'))
        ev.to_mesh_clear()
    A = np.concatenate([np.array(p['positions']).reshape(-1, 3) for p in parts])
    lo, hi = A.min(0), A.max(0); shift = np.array([-(lo[0] + hi[0]) / 2, -lo[1], -(lo[2] + hi[2]) / 2])
    for p in parts:
        p['positions'] = [round(float(x), 4) for x in (np.array(p['positions']).reshape(-1, 3) + shift).ravel()]
    tris = sum(len(p['positions']) // 9 for p in parts)
    return parts, tris


def install(name):
    kind, target, *rest = TARGETS[name]
    md = os.path.join(HERE, 'models', name); main = os.path.join(md, f'{name}.glb'); out = []
    if kind == 'glb':
        dst = os.path.join(DIST, target); shutil.copy(main, dst); out.append(target)
        mirror = os.path.join(DIST, 'sandbox2-runtime', target)
        if os.path.exists(mirror):
            shutil.copy(main, mirror)
        return out, {}
    states = rest[0]; yaw = np.pi / 2 if target.startswith('organics/') and name != 'tree-standing' else 0.0   # animals face +X in game
    tris = {}
    for st in states:
        src = os.path.join(md, 'variants', f'{st}.glb')
        if not os.path.exists(src):
            if st in ('complete', 'standing', 'idle', 'full'):
                src = main
            else:
                print(f'  {name}: no {st} variant, keeping the old one'); continue
        gid = f'{os.path.basename(target)}-{st}'
        parts, n = mesh_list(src, yaw)
        base = os.path.join(DIST, 'simulation-assets', os.path.dirname(target), gid)
        json.dump(parts, open(base + '.json', 'w'), separators=(',', ':'))
        shutil.copy(src, base + '.glb'); tris[gid] = n; out.append(gid)
        mirror = os.path.join(DIST, 'sandbox2-runtime', 'simulation-assets', os.path.dirname(target), gid)
        if os.path.exists(mirror + '.json'):             # /sandbox2 serves its own copy of the same files
            shutil.copy(base + '.json', mirror + '.json'); shutil.copy(base + '.glb', mirror + '.glb')
    return out, tris


def update_catalogs(tris):
    for cat in ['simulation-assets/catalog.json', 'sandbox2-runtime/simulation-assets/catalog.json']:
        p = os.path.join(DIST, cat)
        if not os.path.exists(p):
            continue
        c = json.load(open(p))
        for r in c:
            if r['id'] in tris:
                r['triangles'] = tris[r['id']]; r['source'] = 'tools/ranch-rebuild'
        json.dump(c, open(p, 'w'), indent=2, ensure_ascii=False)


if __name__ == '__main__':
    names = sys.argv[1:]
    if names == ['all']:
        names = [n for n in TARGETS if os.path.exists(os.path.join(HERE, 'models', n, f'{n}.glb'))]
    alltris = {}
    for n in names:
        o, t = install(n); alltris.update(t); print(n, o, flush=True)
    update_catalogs(alltris)
