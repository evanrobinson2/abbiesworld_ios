"""Ranch Atelier original pack: thirteen trees, bushes, rocks and yard props built from primitives.

Run:  python3 scripts/atelier-pack/build_pack.py          (bpy module)
  or  blender -b -P scripts/atelier-pack/build_pack.py

Everything is made here from Blender primitives with a fixed random seed. No outside models,
textures or images are read. Proportions follow the Northgard measurements written up on the
Original Pack page (low full crowns, boulders about half as tall as wide, one model repainted per
land); nothing from Northgard is used as input.

Output: dist/simulation-assets/atelier/<id>.glb, <id>.json (provenance), palette.json, manifest.json
"""
import bpy, bmesh, hashlib, json, math, os, platform, random, sys, time
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
DIST = os.path.normpath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(DIST, 'simulation-assets', 'atelier')
SCRIPT_REL = 'prototypes/ranch-atelier/dist/scripts/atelier-pack/build_pack.py'
DATE = '2026-10-22'
AUTHOR = 'Claude (Anthropic), Claude Code cloud session, for Evan'
PROMPT = ("Rebuild the Ranch Atelier original pack from its write-up: thirteen trees, bushes, rocks and "
          "yard props (two oaks, a birch, two firs, two bushes, two boulders, a stump, a log pile, a rain "
          "barrel and a crate stack), made from scratch in Blender by a script. Sizes and shapes follow "
          "what was measured in Northgard: simple cheap shapes, low full crowns that come almost to the "
          "ground, flat boulders about half as tall as wide, and one model repainted per land (meadow, "
          "autumn, frost; firs stay green in autumn). Nothing copied. Keep provenance for every model.")
REFERENCE = ("Northgard (Shiro Games), studied for proportion and paint strategy only, via the measurements "
             "recorded on the Original Pack page (https://claude.ai/artifact/6aQ47M8cnig6tW8gAxDqsR). "
             "No Northgard meshes, textures, screenshots or other files were used as input.")

# Meadow colours are baked into the GLB; the browser repaints by material name from palette.json.
PALETTE = {
    'meadow': {'leaf': '7FA04A', 'leaf-dark': '5E8240', 'needle': '3F6B45', 'bark': '6E5039', 'bark-birch': 'E6E0CF',
               'birch-mark': '3B3934', 'stone': '9A9585', 'stone-moss': '7E8F55', 'wood': '9B7148', 'wood-cut': 'D9B27A',
               'hoop': '4E4B47', 'berry': 'B8433A'},
    'autumn': {'leaf': 'D9892F', 'leaf-dark': 'B4562A', 'needle': '3F6B45', 'bark': '634632', 'bark-birch': 'E2D9C4',
               'birch-mark': '3B3934', 'stone': '978F80', 'stone-moss': '9C8A4A', 'wood': '94683F', 'wood-cut': 'D2A46C',
               'hoop': '4E4B47', 'berry': '8E2F2A'},
    'frost':  {'leaf': 'C9D6D3', 'leaf-dark': '9FB2B4', 'needle': '557468', 'bark': '5B4C42', 'bark-birch': 'EDEDEA',
               'birch-mark': '45474A', 'stone': 'A7AAA8', 'stone-moss': 'DDE5E6', 'wood': '86705A', 'wood-cut': 'CDB79A',
               'hoop': '55585B', 'berry': '9A3A3A'},
}

rng = random.Random(20261022)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for name, hexc in PALETTE['meadow'].items():
        m = bpy.data.materials.new(name)
        c = tuple(int(hexc[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1,)
        m.diffuse_color = c
        m.use_nodes = True
        bsdf = m.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = c
        bsdf.inputs['Roughness'].default_value = .9


def finish(o, mat, smooth=False):
    o.data.materials.clear()
    o.data.materials.append(bpy.data.materials[mat])
    for f in o.data.polygons:
        f.use_smooth = smooth
    return o


def jitter(o, amount, keep_base=True):
    """Break up primitive symmetry; vertices on the base ring stay put so the model sits flat."""
    for v in o.data.vertices:
        if keep_base and v.co.z <= 1e-4:
            continue
        v.co += Vector((rng.uniform(-amount, amount), rng.uniform(-amount, amount), rng.uniform(-amount, amount) * .6))


def blob(p, r, mat, squash=(1, 1, .82), wobble=.12, subdiv=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdiv, radius=r, location=p)
    o = bpy.context.object
    o.scale = squash
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    jitter(o, r * wobble, keep_base=False)
    return finish(o, mat, smooth=mat.startswith('leaf'))  # soft crowns, crisp wood and stone


def trunk(base, top, r0, r1, mat, sides=6):
    d = Vector(top) - Vector(base)
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r0, radius2=r1, depth=d.length,
                                    location=(Vector(base) + Vector(top)) / 2)
    o = bpy.context.object
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return finish(o, mat)


def cone(p, r, h, mat, sides=7):
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r, radius2=0, depth=h, location=(p[0], p[1], p[2] + h / 2))
    o = bpy.context.object
    o.rotation_euler.z = rng.uniform(0, math.pi)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    jitter(o, r * .06, keep_base=False)
    return finish(o, mat)


def box(p, s, mat, rot=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=p)
    o = bpy.context.object
    o.scale = s
    o.rotation_euler.z = rot
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return finish(o, mat)


def log(a, b, r, sides=8):
    o = trunk(a, b, r, r * .96, 'wood', sides)
    # end grain caps as separate thin discs so they take the cut-wood colour
    d = (Vector(b) - Vector(a)).normalized()
    for end, sgn in ((Vector(a), -1), (Vector(b), 1)):
        c = trunk(end - d * .004 * sgn, end + d * .012 * sgn, r * .9, r * .86, 'wood-cut', sides)
    return o


# --- models ----------------------------------------------------------------------------------

def oak(height, spread, lobes):
    tw = height * .055
    trunk((0, 0, 0), (0, 0, height * .42), tw * 1.5, tw, 'bark')
    for i in range(3):  # root flare
        a = i * 2.1 + rng.uniform(-.3, .3)
        trunk((math.cos(a) * tw * 1.4, math.sin(a) * tw * 1.4, 0), (0, 0, height * .14), tw * .55, tw * .3, 'bark', 5)
    for i in range(2):  # two short limbs into the crown
        a = i * math.pi + rng.uniform(-.4, .4)
        trunk((0, 0, height * .34), (math.cos(a) * spread * .35, math.sin(a) * spread * .35, height * .55), tw * .6, tw * .35, 'bark', 5)
    # low, full crown: comes down to ~22% of height so a wood reads as one mass from above
    cz = height * .58
    blob((0, 0, cz), spread * .62, 'leaf', squash=(1, 1, .78))
    for i in range(lobes):
        a = i / lobes * math.tau + rng.uniform(-.3, .3)
        rr = spread * rng.uniform(.38, .5)
        z = cz + rng.uniform(-height * .14, height * .14)
        blob((math.cos(a) * spread * .48, math.sin(a) * spread * .48, z), rr, 'leaf-dark' if i % 2 else 'leaf')
    blob((0, 0, height - spread * .38), spread * .4, 'leaf')


def birch(height):
    tw = height * .032
    trunk((0, 0, 0), (0, 0, height * .62), tw * 1.2, tw * .7, 'bark-birch')
    for k in range(5):  # dark lenticel marks
        z = height * (.08 + k * .11)
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=tw * (1.18 - k * .08), depth=height * .012, location=(0, 0, z))
        o = bpy.context.object
        o.rotation_euler = (rng.uniform(-.12, .12), rng.uniform(-.12, .12), 0)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        finish(o, 'birch-mark')
    w = height * .19
    for i, (z, r) in enumerate([(.42, 1.0), (.6, .92), (.77, .74), (.9, .5)]):
        off = (rng.uniform(-.1, .1) * w, rng.uniform(-.1, .1) * w)
        blob((off[0], off[1], height * z), w * r, 'leaf' if i % 2 == 0 else 'leaf-dark', squash=(1, 1, 1.05))


def fir(height, tiers, girth):
    trunk((0, 0, 0), (0, 0, height * .3), height * .04, height * .03, 'bark')
    base = height * .1
    step = (height - base) / (tiers + .6)
    for i in range(tiers):
        r = girth * (1 - i / (tiers + .4))
        cone((0, 0, base + i * step), r, step * 1.75, 'needle', 8)


def bush(width, height, lobes, berries):
    for i in range(lobes):
        a = i / lobes * math.tau + rng.uniform(-.25, .25)
        d = width * .26 if i else 0
        r = width * rng.uniform(.28, .36)
        blob((math.cos(a) * d, math.sin(a) * d, r * .62), r, 'leaf' if i % 3 else 'leaf-dark', squash=(1, 1, height / width * 1.3))
    for i in range(berries):
        a = rng.uniform(0, math.tau)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=width * .045,
                                              location=(math.cos(a) * width * .42, math.sin(a) * width * .42, rng.uniform(.35, .8) * height))
        finish(bpy.context.object, 'berry')


def boulder(width, pieces):
    for i in range(pieces):
        w = width * (1 if i == 0 else rng.uniform(.38, .55))
        a = rng.uniform(0, math.tau)
        d = 0 if i == 0 else width * .52
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=w / 2, location=(math.cos(a) * d, math.sin(a) * d, 0))
        o = bpy.context.object
        o.scale = (1, rng.uniform(.75, .95), .5)  # Northgard rocks: about half as tall as wide
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        jitter(o, w * .09, keep_base=False)
        for v in o.data.vertices:  # flatten the underside into the ground
            v.co.z = max(v.co.z, -w * .06)
        finish(o, 'stone')
        if i == 0:  # a moss cap on the big stone
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=w * .36, location=(w * .05, 0, w * .2))
            m = bpy.context.object
            m.scale = (1, .85, .28)
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
            finish(m, 'stone-moss')


def stump():
    trunk((0, 0, 0), (0, 0, .42), .32, .27, 'bark', 9)
    trunk((0, 0, .41), (0, 0, .44), .25, .24, 'wood-cut', 9)
    for i in range(4):
        a = i * math.tau / 4 + .4
        trunk((math.cos(a) * .2, math.sin(a) * .2, .12), (math.cos(a) * .48, math.sin(a) * .48, 0), .09, .04, 'bark', 5)


def log_pile():
    r, L = .13, 1.5
    rows = [3, 2, 1]
    for row, n in enumerate(rows):
        for i in range(n):
            y = (i - (n - 1) / 2) * r * 2.02
            z = r + row * r * 1.72
            x = rng.uniform(-.05, .05)
            log((x - L / 2, y, z), (x + L / 2, y, z), r * rng.uniform(.92, 1.04))
    for sx in (-.5, .5):  # two stakes holding the pile
        trunk((sx, -r * 3.4, 0), (sx, -r * 3.4, .62), .035, .03, 'bark', 5)
        trunk((sx, r * 3.4, 0), (sx, r * 3.4, .62), .035, .03, 'bark', 5)


def rain_barrel():
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.34, depth=.9, location=(0, 0, .45))
    o = bpy.context.object
    for v in o.data.vertices:  # barrel belly
        t = 1 - abs(v.co.z) / .45
        v.co.x *= 1 + .1 * t
        v.co.y *= 1 + .1 * t
    finish(o, 'wood')
    for z in (.14, .76):
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.365 if z > .5 else .36, depth=.05, location=(0, 0, z))
        finish(bpy.context.object, 'hoop')
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.3, depth=.02, location=(0, 0, .885))
    finish(bpy.context.object, 'stone')  # water surface, reads as dark grey-blue in shade
    box((.0, .0, .02), (.9, .9, .04), 'wood-cut')  # standing board


def crate_stack():
    def crate(p, s, rot):
        box((p[0], p[1], p[2] + s / 2), (s, s, s), 'wood', rot)
        for dz in (.12, .88):
            box((p[0], p[1], p[2] + s * dz), (s * 1.03, s * 1.03, s * .08), 'wood-cut', rot)
    crate((0, 0, 0), .62, .08)
    crate((.7, .05, 0), .56, -.12)
    crate((.32, 0, .62), .5, .3)


MODELS = [
    ('oak-a', 'Oak', 'tree', 6.5, lambda: oak(6.5, 4.6, 5)),
    ('oak-b', 'Spreading oak', 'tree', 5.6, lambda: oak(5.6, 5.0, 6)),
    ('birch', 'Birch', 'tree', 7.0, lambda: birch(7.0)),
    ('fir-a', 'Tall fir', 'tree', 8.0, lambda: fir(8.0, 5, 2.4)),
    ('fir-b', 'Stout fir', 'tree', 6.0, lambda: fir(6.0, 4, 2.6)),
    ('bush-a', 'Round bush', 'bush', 1.1, lambda: bush(1.5, 1.1, 4, 0)),
    ('bush-b', 'Berry bush', 'bush', .85, lambda: bush(1.4, .85, 5, 9)),
    ('boulder-a', 'Flat boulder', 'rock', .8, lambda: boulder(1.7, 1)),
    ('boulder-b', 'Boulder group', 'rock', .7, lambda: boulder(1.5, 3)),
    ('stump', 'Stump', 'prop', .44, stump),
    ('log-pile', 'Log pile', 'prop', .76, log_pile),
    ('rain-barrel', 'Rain barrel', 'prop', .9, rain_barrel),
    ('crate-stack', 'Crate stack', 'prop', 1.12, crate_stack),
]


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()


def main():
    os.makedirs(OUT, exist_ok=True)
    script_hash = sha(os.path.abspath(__file__))
    manifest = []
    for mid, label, kind, height, build in MODELS:
        t0, c0 = time.perf_counter(), time.process_time()
        reset()
        build()
        objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        o = bpy.context.object
        o.name = mid
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        dims = [round(v, 3) for v in o.dimensions]
        path = os.path.join(OUT, mid + '.glb')
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                                  export_yup=True, export_materials='EXPORT')
        record = {
            'id': 'atelier/' + mid, 'label': label, 'kind': kind, 'origin': 'original',
            'author': AUTHOR, 'tool': f'Blender {bpy.app.version_string} (bpy module), Python {platform.python_version()}',
            'prompt': PROMPT, 'date': DATE, 'script': SCRIPT_REL, 'scriptSha256': script_hash,
            'referenceStudied': REFERENCE, 'inputs': [], 'randomSeed': 20261022,
            'glb': f'/simulation-assets/atelier/{mid}.glb', 'glbSha256': sha(path),
            'triangles': tris, 'dimensionsMetres': {'x': dims[0], 'y': dims[1], 'z': dims[2]}, 'gameHeightMetres': height,
            'paintSets': list(PALETTE), 'materials': sorted({m.name for m in o.data.materials}),
            'build': {'wallSeconds': round(time.perf_counter() - t0, 3), 'cpuSeconds': round(time.process_time() - c0, 3),
                      'exit': 0, 'host': platform.platform()},
        }
        with open(os.path.join(OUT, mid + '.json'), 'w') as f:
            json.dump(record, f, indent=1)
        manifest.append({k: record[k] for k in ('id', 'label', 'kind', 'glb', 'triangles', 'gameHeightMetres')})
        print(f'{mid:12s} {tris:5d} tris  {record["build"]["wallSeconds"]:.2f}s', flush=True)
    with open(os.path.join(OUT, 'palette.json'), 'w') as f:
        json.dump(PALETTE, f, indent=1)
    with open(os.path.join(OUT, 'manifest.json'), 'w') as f:
        json.dump({'pack': 'Ranch Atelier original pack', 'origin': 'original', 'date': DATE, 'script': SCRIPT_REL,
                   'scriptSha256': script_hash, 'models': manifest}, f, indent=1)


if __name__ == '__main__':
    main()
