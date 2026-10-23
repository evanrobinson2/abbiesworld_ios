"""MB2 The dome, from the Moon Mission pack's moonbase painting (concept.png) and b-roll cinematics 01 and 20:
a glass-ribbed main dome on a panelled drum, the orange light band round the drum, an airlock with a ramp.

Replaces the white torus habitat (ME-072) and keeps its footprint (about 5.8 m across) so the base plan still fits.
Parts: Drum, OrangeBand, DomeGlass, Ribs, Airlock, Ramp. Night: DomeGlass and OrangeBand glow from inside (the game
treats them as windows). Run: python build.py [--render]
"""
import math
import os
import sys

import bpy
import bmesh

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import mkit as K  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
P = dict(drum_r=2.55, drum_h=0.9, dome_r=2.45, meridians=14, rings=3, door_w=1.0, lock_d=0.9)

K.reset()
K.mat('HullPanel', '#9aa3b3', rough=0.6, metal=0.15)
K.mat('HullDark', '#4a5468', rough=0.7, metal=0.1)
K.mat('Rib', '#d3d9e3', rough=0.45, metal=0.3)
K.mat('DomeGlass', '#b4c6dc', rough=0.08, alpha=0.5)
K.mat('OrangeBand', '#ff9a3c', rough=0.3, emit='#ff9a3c', strength=1.2)
K.mat('DoorPanel', '#3a4a5a', rough=0.5, metal=0.3)
K.mat('Greens', '#5f8f6a', rough=0.9)

root = K.empty('Dome')
dr, dh, R = P['drum_r'], P['drum_h'], P['dome_r']
parts = []

# Drum: a low panelled wall on a dark plinth, with vertical seams.
plinth = K.cyl('plinth', dr + 0.12, 0.16, (0, 0, 0.08), 'HullDark', n=48, bevel=0.03, smooth=False)
drum = K.cyl('drum_wall', dr, dh, (0, 0, dh / 2 + 0.08), 'HullPanel', n=48, bevel=0.04, smooth=True)
seams = [K.box(f'seam{i}', (0.05, 0.05, dh - 0.1), (math.cos(a) * dr, math.sin(a) * dr, dh / 2 + 0.08), 'HullDark', rot=(0, 0, a))
         for i, a in enumerate(i / 16 * K.TAU for i in range(16))]
lip = K.cyl('drum_lip', dr + 0.05, 0.08, (0, 0, dh + 0.1), 'Rib', n=48, bevel=0.02)
D = K.join('Drum', [plinth, drum, lip] + seams)
K.parent(D, root)

band = K.cyl('OrangeBand', dr + 0.025, 0.1, (0, 0, dh * 0.62), 'OrangeBand', n=48)
K.parent(band, root)

# Glass hemisphere.
z0 = dh + 0.14
bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, radius=R, location=(0, 0, z0))
g = bpy.context.object
bm = bmesh.new()
bm.from_mesh(g.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS')
bm.to_mesh(g.data)
bm.free()
g.name = 'DomeGlass'
K.shade(g, True)
K.assign(g, 'DomeGlass')
K.parent(g, root)

# A little life inside the glass: floor, a planter ring and a lamp column, so the dome is not an empty bubble.
inside = [
    K.cyl('floor', R - 0.05, 0.06, (0, 0, z0 - 0.02), 'HullDark', n=48),
    K.cyl('planter', 1.1, 0.3, (0, 0, z0 + 0.15), 'HullPanel', n=32, bevel=0.03),
    K.cyl('greens', 0.95, 0.22, (0, 0, z0 + 0.38), 'Greens', n=24, bevel=0.1),
    K.cyl('column', 0.09, 1.6, (0, 0, z0 + 1.0), 'Rib', n=12),
    K.cyl('lamp', 0.22, 0.12, (0, 0, z0 + 1.82), 'OrangeBand', n=16, bevel=0.03),
]
I = K.join('Interior', inside)
K.parent(I, root)

# Ribs: meridians and latitude rings standing just proud of the glass, like the painting's grid.
ribs = []
for i in range(P['meridians']):
    a = i / P['meridians'] * K.TAU
    pts = [(math.cos(a) * math.cos(t) * (R + 0.03), math.sin(a) * math.cos(t) * (R + 0.03), z0 + math.sin(t) * (R + 0.03))
           for t in (k / 16 * (math.pi / 2 - 0.12) for k in range(17))]
    ribs.append(K.tube(f'meridian{i}', pts, 0.045, 'Rib'))
for k in range(1, P['rings'] + 1):
    t = k / (P['rings'] + 1) * math.pi / 2
    r = math.cos(t) * (R + 0.03)
    pts = [(math.cos(a) * r, math.sin(a) * r, z0 + math.sin(t) * (R + 0.03)) for a in (j / 48 * K.TAU for j in range(49))]
    ribs.append(K.tube(f'ring{k}', pts, 0.04, 'Rib'))
ribs.append(K.cyl('crown', 0.32, 0.12, (0, 0, z0 + R + 0.02), 'Rib', n=24, bevel=0.03))
ribs.append(K.cyl('crown_vent', 0.14, 0.2, (0, 0, z0 + R + 0.14), 'HullDark', n=16, bevel=0.02))
Rb = K.join('Ribs', ribs)
K.parent(Rb, root)

# Airlock: a squared vestibule on the front (-Y) with a dark door in an orange frame, and a ramp to the ground.
w, d = P['door_w'], P['lock_d']
ly = -(dr + d / 2 - 0.15)
lock = [
    K.box('lock_body', (w + 0.5, d, 1.25), (0, ly, 0.7), 'HullPanel', bevel=0.08),
    K.box('lock_roof', (w + 0.62, d + 0.1, 0.12), (0, ly, 1.36), 'Rib', bevel=0.03),
    K.box('door', (w * 0.72, 0.04, 0.95), (0, ly - d / 2 - 0.005, 0.6), 'DoorPanel', bevel=0.02),
]
for sx in (-1, 1):
    lock.append(K.box(f'door_light{sx}', (0.05, 0.03, 0.9), (sx * (w * 0.36 + 0.06), ly - d / 2 - 0.01, 0.6), 'OrangeBand'))
lock.append(K.box('door_light_top', (w * 0.85, 0.03, 0.05), (0, ly - d / 2 - 0.01, 1.1), 'OrangeBand'))
L = K.join('Airlock', lock)
K.parent(L, root)

ramp_len = 0.9
ry = ly - d / 2 - ramp_len / 2
ramp = K.box('Ramp', (w * 0.9, ramp_len, 0.06), (0, ry, 0.08), 'HullDark', bevel=0.015, rot=(math.radians(-7), 0, 0))
rails = [K.tube(f'rail{sx}', [(sx * w * 0.45, ly - d / 2, 0.55), (sx * w * 0.45, ry - ramp_len / 2 + 0.05, 0.35)], 0.02, 'Rib') for sx in (-1, 1)]
Rm = K.join('Ramp', [ramp] + rails)
K.parent(Rm, root)

# A small side hatch and service boxes so the drum is not a plain cylinder from the back.
svc = []
for a in (math.radians(60), math.radians(130), math.radians(230)):
    svc.append(K.box(f'svc{a:.1f}', (0.5, 0.35, 0.45), (math.cos(a) * (dr + 0.15), math.sin(a) * (dr + 0.15), 0.32), 'HullDark', bevel=0.04, rot=(0, 0, a)))
S = K.join('Service', svc)
K.parent(S, root)

lo, hi = K.bounds()
print('bounds', [round(v, 3) for v in lo], [round(v, 3) for v in hi], 'triangles', K.triangles())
K.export(os.path.join(HERE, 'dome.glb'))
if '--render' in sys.argv:
    os.makedirs(os.path.join(HERE, 'r'), exist_ok=True)
    K.render(os.path.join(HERE, 'r', 'hero.png'), yaw=-25, pitch=16)
