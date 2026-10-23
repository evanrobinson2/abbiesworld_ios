"""MB4 Mysterious meteorite, from the Moon Mission pack's four-view sheet (concept.png) and
entities/mysterious_meteorite_description.md: a craggy dark spheroid with cyan crystals breaking through its cracks.

States are built in, not baked: the upper shell is five named petals (Petal_0..4) hinged at their lower outer edge,
so the game can open it like origami (buried, glowing, opening, open); the Core and Crystals stay put. Glowing
materials are MeteorCore and MeteorCrystal, the only cyan (#00ffd1) on the Moon tile. Petals are pulled back a little
from each other so cracks of core glow show between them.

Scale: the story says soccer-ball size (20 to 25 cm). On a tile seen from ten metres that would vanish, so the game
model is 0.56 m across (toy scale, like the rest of the tile); recorded in notes.json. Run: python build.py [--render]
"""
import math
import os
import random
import sys

import bpy
import bmesh
from mathutils import Vector, noise

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import mkit as K  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
P = dict(radius=0.28, crag=0.06, petals=5, crack_deg=6, seed=7, open_split=-0.02)
random.seed(P['seed'])

K.reset()
K.mat('MeteorRock', '#2a2d40', rough=0.88)
K.mat('MeteorRockLight', '#3a3d52', rough=0.9)
K.mat('MeteorCore', '#00ffd1', rough=0.3, emit='#00ffd1', strength=3.0)
K.mat('MeteorCrystal', '#7affe4', rough=0.08, emit='#00ffd1', strength=1.6)
K.mat('MeteorVein', '#4a5fdd', rough=0.4, emit='#4a5fdd', strength=0.8)

R = P['radius']
root = K.empty('Meteorite')  # origin at the sphere's centre; the game sinks it 40% into its crater


def crag(v):
    """Craggy facets: large cellular plates plus a little fine chipping."""
    n = noise.noise(v * 3.1 + Vector((P['seed'], 0, 0)), noise_basis='VORONOI_F1')
    f = noise.noise(v * 9.0, noise_basis='PERLIN_ORIGINAL')
    return R * (1 + P['crag'] * (-0.6 + 2.2 * n) + 0.012 * f)


def shell():
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1)
    o = bpy.context.object
    for v in o.data.vertices:
        d = v.co.normalized()
        v.co = d * crag(d)
    return o


# Split the shell into a base bowl and five petals by azimuth sector.
src = shell()
bm = bmesh.new()
bm.from_mesh(src.data)
bpy.data.objects.remove(src)
groups = {k: [] for k in ['Base'] + [f'Petal_{i}' for i in range(P['petals'])]}
for f in bm.faces:
    c = f.calc_center_median()
    if c.z < P['open_split'] * 1 - 0.08 * R:
        groups['Base'].append(f.index)
    else:
        a = (math.atan2(c.y, c.x) + math.pi * 0.1) % K.TAU
        groups[f'Petal_{int(a / K.TAU * P["petals"]) % P["petals"]}'].append(f.index)

pieces = {}
for name, idx in groups.items():
    b2 = bm.copy()
    keep = set(idx)
    bmesh.ops.delete(b2, geom=[f for f in b2.faces if f.index not in keep], context='FACES')
    me = bpy.data.meshes.new(name)
    b2.to_mesh(me)
    b2.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    # thickness, then pull each petal in toward its own centre so the cracks between them glow
    m = o.modifiers.new('solid', 'SOLIDIFY')
    m.thickness = 0.035
    m.offset = -1
    K.apply_mods(o)
    K.shade(o, False)
    K.assign(o, 'MeteorRock')
    pieces[name] = o
bm.free()

# Lighter weathered plates on a few faces, like the sheet's pale top patches.
for name, o in pieces.items():
    o.data.materials.append(K.material('MeteorRockLight'))
    for p in o.data.polygons:
        if p.normal.z > 0.55 and noise.noise(p.center * 4.0) > 0.12:
            p.material_index = 1

# Hinges: each petal's origin sits at its lowest outer edge so a rotation about the tangent opens it outward.
for name, o in pieces.items():
    if not name.startswith('Petal'):
        o.location = (0, 0, 0)
        continue
    vs = [v.co.copy() for v in o.data.vertices]
    cen = sum(vs, Vector()) / len(vs)
    low = min(v.z for v in vs)
    out = Vector((cen.x, cen.y, 0)).normalized() * R * 0.95
    pivot = Vector((out.x, out.y, low + 0.02))
    for v in o.data.vertices:
        v.co -= pivot
    o.location = pivot
    # already ajar: each petal leans out a few degrees on its hinge, so star cracks of core light show at the top
    tangent = Vector((-out.y, out.x, 0)).normalized()
    from mathutils import Matrix
    o.matrix_world = Matrix.Translation(pivot) @ Matrix.Rotation(math.radians(-P['crack_deg']), 4, tangent)

bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=R * 0.78, location=(0, 0, 0))
core = bpy.context.object
core.name = 'Core'
K.shade(core, True)
K.assign(core, 'MeteorCore')


def crystal(name, base, direction, length, width):
    """A hexagonal prism with a pointed tip, pushed out along direction from base."""
    d = Vector(direction).normalized()
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=width, radius2=width * 0.85, depth=length * 0.7,
                                    location=(0, 0, length * 0.35))
    body = bpy.context.object
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=width * 0.85, radius2=0, depth=length * 0.3,
                                    location=(0, 0, length * 0.85))
    tip = bpy.context.object
    c = K.join(name, [body, tip])
    c.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    c.location = base
    K.shade(c, False)
    return K.assign(c, 'MeteorCrystal')


crystals = []
clusters = [((0.3, -0.45, 0.8), 0.42, 0.055, 5), ((-0.75, -0.25, 0.5), 0.2, 0.032, 3), ((0.55, 0.55, 0.35), 0.16, 0.028, 3), ((-0.2, 0.7, 0.6), 0.12, 0.022, 2)]
for k, (direc, length, width, n) in enumerate(clusters):
    d = Vector(direc).normalized()
    for i in range(n):
        jitter = Vector((random.uniform(-.3, .3), random.uniform(-.3, .3), random.uniform(-.1, .3)))
        dd = (d + jitter * (0 if i == 0 else 1)).normalized()
        L = length * (1 if i == 0 else random.uniform(0.35, 0.6))
        crystals.append(crystal(f'c{k}{i}', d * R * 0.8, dd, L, width * (1 if i == 0 else 0.6)))
cr = K.join('Crystals', crystals)

for o in list(pieces.values()) + [core, cr]:
    K.parent(o, root)

lo, hi = K.bounds()
print('bounds', [round(v, 3) for v in lo], [round(v, 3) for v in hi], 'triangles', K.triangles())
K.export(os.path.join(HERE, 'meteorite.glb'))
if '--render' in sys.argv:
    os.makedirs(os.path.join(HERE, 'r'), exist_ok=True)
    K.render(os.path.join(HERE, 'r', 'hero.png'), yaw=-25, pitch=18, world=(0.05, 0.07, 0.08), sun=1.0)
