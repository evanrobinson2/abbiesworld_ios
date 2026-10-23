"""Install rebuilt models into the Ranch tile.

usage: python to_game.py NAME [NAME ...]     (or `all`: every models/<name> with a finished GLB)

The tile loads two kinds of model:
  * mesh lists (`simulation-assets/<category>/<id>.json`): one entry per part, positions in metres with Y up, flat
    normals, an sRGB colour and a material role that picks the game's shading profile. Buildings, animals, the shade
    tree and supplies use these, plus a GLB of the same name.
  * plain GLBs (regional plants and trees, garden props), recoloured in game by material name.
Each modeler exports `models/<name>/<name>.glb` and, where the game has states, `models/<name>/variants/<state>.glb`.
This writes every file the game reads, keeping the old ids, and updates the triangle counts in the catalogues.
A `<name>-charming` model (the storybook style, see BRIEF.md) installs like `<name>` into a parallel tree whose top
folder ends in `-charming` (`simulation-assets-charming/...`, `simulations/regional-assets-charming/...`); the tile's
"Model style" switch reads that tree first and falls back to the normal file for anything not modelled yet.
"""
import sys, os, json, shutil, re, subprocess
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
    'goat-house-open': ('mesh', 'buildings/goat-shelter', STAGES), 'chicken-coop': ('mesh', 'buildings/chicken-coop', STAGES),
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
# The goat house (remaster R3, Evan's pick) replaces the old goat shelter under the same game ids. Its walls are named
# Wall_* by the modeler, which the role patterns read as plaster; they are timber planks, so rename them on the way in.
MATERIAL_RENAMES = {'goat-house-open': [(r'^Wall_', 'Plank_')]}
# Buildings whose walls stay up inside a pen (the goat house already has its open side); the others become open sheds.
KEEP_WALLS = {'goat-house-open'}
# Kits (remaster wave 1): every top-level GLB of models/<name>/ is copied as is to ranch-kits/<name>/, where
# simulations/ranch-kits.mjs loads and places them (both model styles use the same files).
KITS = {'kitchen-garden': 'ranch-kits/kitchen-garden', 'lamp-kit': 'ranch-kits/lamp-kit'}
# the game's material roles, matched on material then object name (same patterns as simulations/material-policy.js)
ROLE_PATTERNS = [('glass', r'glass'), ('water', r'^(?:water)(?:[. _-]|$)'), ('metal', r'bronze|metal|copper|steel|iron|brass'),
                 ('plaster', r'plaster|stucco|wall'), ('foliage', r'leaf|leaves|foliage|canopy|grass|moss|petal|flower|stem'),
                 ('ground', r'soil|earth|ground|terrain|sand|mud|compost'), ('roof', r'roof|shingle|thatch'),
                 ('timber', r'wood|timber|bark|plank|beam|post'), ('stone', r'stone|rock|slate|brick'), ('clay', r'clay|ceramic|terracotta'),
                 ('fiber', r'rope|reed|straw|wicker|hay'), ('food', r'onion|bread|grain|fruit|apple|berry|vegetable|feed|(?<![a-z])nut'),
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


def mesh_list(glb, yaw=0.0, renames=()):
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
            for pat, rep in renames:
                mname = re.sub(pat, rep, mname)
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


ORIGINAL = '831ec83a'   # the live tile before the rebuild: its models set each subject's game footprint


def original_extent(target, state):
    """Largest horizontal size of the model this one replaces, in the old file's own units.

    The game multiplies every model by a per-family metres-per-unit factor (simulations/model-calibration.js) and
    plans the ranch layout from the result, so a rebuilt model must keep its predecessor's footprint in file units or
    the site planner finds no room for it."""
    path = f'prototypes/ranch-atelier/dist/simulation-assets/{target}-{state}.json'
    raw = subprocess.run(['git', 'show', f'{ORIGINAL}:{path}'], cwd=HERE, capture_output=True).stdout
    if not raw:
        return None
    A = np.concatenate([np.array(p['positions']).reshape(-1, 3) for p in json.loads(raw)])
    span = A.max(0) - A.min(0)
    return float(max(span[0], span[2]))


def rescale(parts, k):
    for p in parts:
        p['positions'] = [round(float(x) * k, 4) for x in p['positions']]


def calibration(family):
    """The game's metres-per-unit factor for a model family (simulations/model-calibration.js)."""
    src = open(os.path.join(DIST, 'simulations', 'model-calibration.js')).read()
    m = re.search(r"'%s':([0-9.]+)" % re.escape(family), src)
    return float(m.group(1)) if m else 1.0


def islands(P):
    """Connected triangle groups of one (n, 3, 3) triangle array, joined where they share a vertex."""
    keys = np.round(P.reshape(-1, 3), 3); _, vid = np.unique(keys, axis=0, return_inverse=True); vid = vid.reshape(-1, 3)
    parent = list(range(vid.max() + 1))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for a, b, c in vid:
        ra, rb, rc = find(a), find(b), find(c); parent[rb] = ra; parent[find(rc)] = ra
    groups = {}
    for t, (a, _, _) in enumerate(vid):
        groups.setdefault(find(a), []).append(t)
    return [np.array(g) for g in groups.values()]


def shed_ready(parts, mpu, keep_walls=False):
    """Tag a building's parts for simulations/ranch-shelter.mjs, which turns the complete building into an open shed.

    Without tags that module keeps only meshes that look like roof, posts or floor by size, and parts merged by
    material hide the posts and roof inside wall-sized meshes, so the whole shed disappears. Here each connected piece
    is judged in game metres (mpu): roofing, anything above 55% of the height and the floor are kept, square posts
    taller than 0.5 m are kept as their own meshes (the shed's collision obstacles), and walls and fittings are dropped."""
    A = np.concatenate([np.array(p['positions']).reshape(-1, 3) for p in parts]) * mpu
    y0, H = A[:, 1].min(), A[:, 1].max() - A[:, 1].min()
    out = []
    for p in parts:
        P = np.array(p['positions']).reshape(-1, 3, 3); N = np.array(p['normals']).reshape(-1, 3, 3)
        buckets = {}
        for isl in islands(P):
            Q = P[isl].reshape(-1, 3) * mpu; lo, hi = Q.min(0), Q.max(0); size = hi - lo
            across = sorted([size[0], size[2]])
            if p['role'] == 'roof' or lo[1] > y0 + H * .55: cls = 'roof'
            elif hi[1] < y0 + .3: cls = 'floor'
            elif across[1] < .65 and across[0] > across[1] * .5 and size[1] > .5: cls = 'post%d' % len(buckets)
            else: cls = 'body'
            buckets.setdefault(cls, []).append(isl)
        for cls, isls in buckets.items():
            idx = np.concatenate(isls)
            q = dict(p); q['positions'] = [round(float(x), 4) for x in P[idx].ravel()]; q['normals'] = [round(float(x), 4) for x in N[idx].ravel()]
            q['name'] = f"{p['name']}-{cls}"; q['shed'] = 'drop' if cls == 'body' and not keep_walls else 'keep'; out.append(q)
    return out

CHARMING = '-charming'


def charming_path(path):
    """The charming twin of a normal file: the top asset folder gets the suffix (garden-assets/x -> garden-assets-charming/x)."""
    head, _, rest = path.partition('/')
    return f'{head}/{charming_path(rest)}' if head == 'simulations' else f'{head}{CHARMING}/{rest}'


def install_kit(name):
    src, dst = os.path.join(HERE, 'models', name), os.path.join(DIST, KITS[name])
    os.makedirs(dst, exist_ok=True); out = []
    for f in sorted(os.listdir(src)):
        if f.endswith('.glb'):
            shutil.copy(os.path.join(src, f), os.path.join(dst, f)); out.append(f'{KITS[name]}/{f}')
    return out, {}


def install(name):
    if name in KITS:
        return install_kit(name)
    base_name = name[:-len(CHARMING)] if name.endswith(CHARMING) else name
    charming = base_name != name
    kind, target, *rest = TARGETS[base_name]
    md = os.path.join(HERE, 'models', name); main = os.path.join(md, f'{name}.glb'); out = []
    place = charming_path if charming else (lambda p: p)
    if kind == 'glb':
        dst = os.path.join(DIST, place(target)); os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy(main, dst); out.append(place(target))
        mirror = os.path.join(DIST, 'sandbox2-runtime', target)
        if os.path.exists(mirror):
            mirror = os.path.join(DIST, 'sandbox2-runtime', place(target)); os.makedirs(os.path.dirname(mirror), exist_ok=True)
            shutil.copy(main, mirror)
        return out, {}
    states = rest[0]; yaw = np.pi / 2 if target.startswith('organics/') and base_name != 'tree-standing' else 0.0   # animals face +X in game
    tris = {}; k = None
    ref = next(st for st in states if st in ('complete', 'standing', 'idle', 'full'))
    for st in [ref] + [st for st in states if st != ref]:   # the reference state first: it sets one factor for all
        src = os.path.join(md, 'variants', f'{st}.glb')
        if not os.path.exists(src):
            if st in ('complete', 'standing', 'idle', 'full'):
                src = main
            else:
                print(f'  {name}: no {st} variant, ' + ('the game falls back to the normal one' if charming else 'keeping the old one')); continue
        gid = f'{os.path.basename(target)}-{st}'
        parts, n = mesh_list(src, yaw, MATERIAL_RENAMES.get(base_name, ()))
        if k is None:
            old = original_extent(target, ref)
            A = np.concatenate([np.array(p['positions']).reshape(-1, 3) for p in parts]); span = A.max(0) - A.min(0)
            k = old / max(span[0], span[2]) if old else 1.0
            print(f'  {name}: scaled x{k:.3f} to keep the old footprint ({old and round(old, 2)} units)')
        rescale(parts, k)
        if target.startswith('buildings/'):
            parts = shed_ready(parts, calibration(os.path.basename(target)), base_name in KEEP_WALLS)
        rel = place(f'simulation-assets/{os.path.dirname(target)}/{gid}')
        base = os.path.join(DIST, rel); os.makedirs(os.path.dirname(base), exist_ok=True)
        json.dump(parts, open(base + '.json', 'w'), separators=(',', ':'))
        shutil.copy(src, base + '.glb'); out.append(gid)
        if not charming:                                 # the catalogues list the normal set only
            tris[gid] = n
        normal_mirror = os.path.join(DIST, 'sandbox2-runtime', 'simulation-assets', os.path.dirname(target), gid)
        if os.path.exists(normal_mirror + '.json'):      # /sandbox2 serves its own copy of the same files
            mirror = os.path.join(DIST, 'sandbox2-runtime', rel); os.makedirs(os.path.dirname(mirror), exist_ok=True)
            shutil.copy(base + '.json', mirror + '.json'); shutil.copy(base + '.glb', mirror + '.glb')
    return out, tris


def charming_manifest():
    """List every installed charming file (simulations/model-style.mjs requests only listed ones, so no 404s)."""
    found = []
    for top in ['simulation-assets-charming', 'simulations/regional-assets-charming', 'garden-assets-charming']:
        for root, _, files in os.walk(os.path.join(DIST, top)):
            found += ['/' + os.path.relpath(os.path.join(root, f), DIST).replace(os.sep, '/') for f in files if f.endswith(('.json', '.glb')) and f != 'manifest.json']
    path = os.path.join(DIST, 'simulation-assets-charming', 'manifest.json'); os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f'{path}.{os.getpid()}'                          # other modelers install in parallel: replace the file whole
    with open(tmp, 'w') as f:
        json.dump(sorted(found), f, indent=0)
    os.replace(tmp, path)


def update_catalogs(tris):
    for cat in ['simulation-assets/catalog.json', 'sandbox2-runtime/simulation-assets/catalog.json']:
        p = os.path.join(DIST, cat)
        if not os.path.exists(p):
            continue
        c = json.load(open(p))
        for r in c:
            if r['id'] in tris:
                r['triangles'] = tris[r['id']]; r['source'] = 'tools/ranch-rebuild'
        raw = open(p, 'rb').read(); nl = b'\r\n' if b'\r\n' in raw[:200] else b'\n'   # keep the file's own format
        out = json.dumps(c, indent=2).encode().replace(b'\n', nl) + (nl if raw.endswith(nl) else b'')
        open(p, 'wb').write(out)


if __name__ == '__main__':
    names = sys.argv[1:]
    if names == ['all']:
        names = [n for t in TARGETS for n in (t, t + CHARMING) if os.path.exists(os.path.join(HERE, 'models', n, f'{n}.glb'))] + list(KITS)
    alltris = {}
    for n in names:
        o, t = install(n); alltris.update(t); print(n, o, flush=True)
    update_catalogs(alltris)
    if any(n.endswith(CHARMING) for n in names):
        charming_manifest()
