"""MK-083 Suit rack with spare suits: a wall frame holding a grown-up suit and a kid suit on hangers (empty suits, no
faces), helmets on the shelf above, a bench with spare boots below. The suits share the heroes' look: gunmetal plates
over grey cloth with the orange chest lamp. Diegetic: a missing suit means someone is outside."""
import math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, "..", ".."))
import bkit as k
from bkit import TAU
k.reset()
k.box('BackPanel', (2.2, 0.08, 2.4), (0, 0.35, 1.2), 'Metal_Hull', bevel=0.02, fill=0.5)
k.box('Shelf', (2.2, 0.45, 0.05), (0, 0.15, 2.1), 'Metal_Gunmetal', bevel=0.01)
k.box('Bench', (2.0, 0.45, 0.08), (0, 0.1, 0.4), 'Metal_Gunmetal', bevel=0.015)
for x in (-0.9, 0.9):
    k.box(f'BenchLeg{x}', (0.06, 0.4, 0.38), (x, 0.1, 0.19), 'Metal_Gunmetal', bevel=0.01)
def suit(tag, x, sc, z0):
    k.box(f'{tag}Hanger', (0.5 * sc, 0.04, 0.04), (x, 0.15, z0 + 0.62 * sc), 'Metal_Steel', bevel=0.005)
    k.box(f'{tag}Torso', (0.46 * sc, 0.26 * sc, 0.6 * sc), (x, 0.12, z0 + 0.3 * sc), 'Cloth_Suit', bevel=0.05 * sc)
    k.box(f'{tag}ChestPlate', (0.4 * sc, 0.06, 0.32 * sc), (x, 0.12 - 0.15 * sc, z0 + 0.4 * sc), 'Metal_Gunmetal', bevel=0.03 * sc)
    k.box(f'{tag}ChestLamp', (0.1 * sc, 0.02, 0.05 * sc), (x, 0.12 - 0.19 * sc, z0 + 0.45 * sc), 'OrangeBand', bevel=0.0)
    for s in (-1, 1):
        k.sphere(f'{tag}Shoulder{s}', 0.11 * sc, (x + s * 0.28 * sc, 0.12, z0 + 0.55 * sc), 'Metal_Gunmetal', seg=8, rings=5)
        k.cyl(f'{tag}Arm{s}', 0.07 * sc, 0.55 * sc, (x + s * 0.3 * sc, 0.12, z0 + 0.22 * sc), 'Cloth_Suit', n=8)
        k.cyl(f'{tag}Leg{s}', 0.09 * sc, 0.7 * sc, (x + s * 0.12 * sc, 0.12, z0 - 0.35 * sc), 'Cloth_Suit', n=8)
        k.box(f'{tag}KneeGuard{s}', (0.14 * sc, 0.05, 0.14 * sc), (x + s * 0.12 * sc, 0.12 - 0.1 * sc, z0 - 0.3 * sc), 'Metal_Gunmetal',
              bevel=0.02 * sc)
    k.box(f'{tag}Belt', (0.48 * sc, 0.28 * sc, 0.07 * sc), (x, 0.12, z0 + 0.02 * sc), 'Metal_Charcoal', bevel=0.01)
    k.sphere(f'{tag}Helmet', 0.17 * sc, (x, 0.15, 2.12 + 0.17 * sc), 'Metal_Hull', seg=12, rings=7)
    k.sphere(f'{tag}Visor', 0.13 * sc, (x, 0.15 - 0.07 * sc, 2.12 + 0.18 * sc), 'Glass_Window', seg=12, rings=6, scale=(1.1, 0.9, 0.8))
    for s in (-1, 1):
        k.box(f'{tag}Boot{s}', (0.13 * sc, 0.26 * sc, 0.14 * sc), (x + s * 0.09 * sc, 0.05, 0.51), 'Metal_Gunmetal', bevel=0.025)
suit('Grownup', -0.5, 1.0, 1.25)
suit('Kid', 0.55, 0.62, 1.38)
k.build(HERE, {'id': 'MK-083', 'name': 'Suit rack with spare suits'}, bake_size=1024,
        view=dict(yaw=18, pitch=8), fps_eye=((0.2, -2.0, 1.1), (0, 0.2, 1.3)))
