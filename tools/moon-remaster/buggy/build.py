"""MB3 Moon buggy, from the Moon Mission pack's 4-view sheet (concept.png) and entities/moon_buggy_description.md.
A charcoal single-rider quad: balloon tyres with tread blocks, twin split nose pods with headlights, a saddle seat,
a long flat tail with a red tail light, exposed coil suspension and handlebars with a light pod.

Parts are separate named objects (Wheel_FL/FR/RL/RR, Chassis, Seat, Lights) so the game can spin the wheels and
light the lamps. Headlights are pale ice-white (HeadlightGlass), not the pack's cyan: on the Moon, cyan is reserved
for the meteorite and the Star Child (AW-STUDY-0007). Run: python build.py [--render]
"""
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import mkit as K  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
P = dict(
    wheel_r=0.37, wheel_w=0.42, track=0.60, base=0.64,  # wheel centres at x=+-track, y=+-base
    blocks=14, block_h=0.05,
    body_z=0.66, nose_y=-0.86, tail_y=0.98, seat_z=0.86,
)

K.reset()
K.mat('Charcoal', '#3a4a5a', rough=0.62, metal=0.2)
K.mat('PanelGrey', '#4a5a6a', rough=0.55, metal=0.25)
K.mat('Tyre', '#1f242b', rough=0.95)
K.mat('Hub', '#2b333d', rough=0.5, metal=0.5)
K.mat('Seat', '#1b2129', rough=0.85)
K.mat('Steel', '#7d8894', rough=0.35, metal=0.8)
K.mat('HeadlightGlass', '#dff3ff', rough=0.2, emit='#dff3ff', strength=2.0)
K.mat('TailLight', '#c8323a', rough=0.3, emit='#c8323a', strength=1.0)

root = K.empty('MoonBuggy')
R, W = P['wheel_r'], P['wheel_w']


def wheel(name, x, y):
    side = 1 if x > 0 else -1
    tyre = K.cyl(name + '_tyre', R - P['block_h'], W, (0, 0, 0), 'Tyre', rot=(0, math.pi / 2, 0), n=32, bevel=0.13)
    parts = [tyre]
    for i in range(P['blocks']):
        a = i / P['blocks'] * K.TAU
        for half in (-1, 1):  # staggered chevron tread: two blocks per row, offset across the tyre
            off = half * W * 0.22
            a2 = a + (half * 0.5 / P['blocks']) * K.TAU * 0.5
            b = K.box(f'{name}_tread{i}{half}', (W * 0.44, 0.11, P['block_h'] * 2),
                      (off, math.sin(a2) * (R - P['block_h']), math.cos(a2) * (R - P['block_h'])),
                      'Tyre', bevel=0.022, rot=(-a2, 0, 0))
            parts.append(b)
    t = K.join(name + '_tyre', parts)
    hub = K.cyl(name + '_hub', R * 0.5, W * 0.9, (side * 0.03, 0, 0), 'Hub', rot=(0, math.pi / 2, 0), n=24, bevel=0.03)
    cap = K.cyl(name + '_cap', R * 0.22, W * 0.96, (side * 0.04, 0, 0), 'Steel', rot=(0, math.pi / 2, 0), n=16, bevel=0.015)
    w = K.join(name, [t, hub, cap])
    w.location = (x, y, R)
    K.parent(w, root)
    return w


for nm, sx, sy in (('Wheel_FL', -1, -1), ('Wheel_FR', 1, -1), ('Wheel_RL', -1, 1), ('Wheel_RR', 1, 1)):
    wheel(nm, sx * P['track'], sy * P['base'])

bz = P['body_z']
chassis = [
    # spine and belly pan
    K.box('spine', (0.42, 1.55, 0.22), (0, 0.02, bz - 0.12), 'Charcoal', bevel=0.04),
    K.box('belly', (0.34, 1.1, 0.12), (0, 0.0, bz - 0.27), 'Hub', bevel=0.03),
    # engine block and side covers between the wheels
    K.box('engine', (0.46, 0.5, 0.26), (0, 0.08, bz - 0.06), 'Hub', bevel=0.05),
    K.cyl('engine_l', 0.12, 0.08, (-0.25, 0.1, bz - 0.06), 'PanelGrey', rot=(0, math.pi / 2, 0), n=20, bevel=0.02),
    K.cyl('engine_r', 0.12, 0.08, (0.25, 0.1, bz - 0.06), 'PanelGrey', rot=(0, math.pi / 2, 0), n=20, bevel=0.02),
    # tank and hood rising toward the bars
    K.box('tank', (0.5, 0.52, 0.2), (0, -0.32, bz + 0.12), 'PanelGrey', bevel=0.06, rot=(math.radians(-12), 0, 0)),
    # the split nose: two angular pods side by side
    K.box('nose_l', (0.28, 0.56, 0.26), (-0.15, P['nose_y'] + 0.27, bz + 0.08), 'Charcoal', bevel=0.05, rot=(math.radians(14), 0, 0)),
    K.box('nose_r', (0.28, 0.56, 0.26), (0.15, P['nose_y'] + 0.27, bz + 0.08), 'Charcoal', bevel=0.05, rot=(math.radians(14), 0, 0)),
    K.box('chin', (0.42, 0.18, 0.16), (0, P['nose_y'] + 0.12, bz - 0.14), 'Hub', bevel=0.03),
    # long flat tail fender
    K.box('tail', (0.62, 0.62, 0.1), (0, P['tail_y'] - 0.3, P['seat_z'] + 0.02), 'Charcoal', bevel=0.04, rot=(math.radians(12), 0, 0)),
    K.box('tail_strut', (0.3, 0.4, 0.16), (0, 0.56, bz + 0.02), 'PanelGrey', bevel=0.04),
]
# fenders arched over each wheel
for sx in (-1, 1):
    for sy in (-1, 1):
        y = sy * P['base']
        a0, a1 = (-95, 40) if sy < 0 else (-40, 95)
        chassis.append(K.arc_plate(f'fender_{sx}{sy}', (sx * (P['track'] - 0.02), y, R), R + 0.07, a0, a1, W + 0.06, 0.05, 'Charcoal'))
        # A-arms and coil-over shock to the hub
        hub = (sx * (P['track'] - W / 2 - 0.02), y, R)
        top = (sx * 0.16, y * 0.75, bz + 0.05)
        chassis.append(K.tube(f'arm_{sx}{sy}', [(sx * 0.18, y * 0.8, bz - 0.25), hub], 0.025, 'Steel'))
        chassis.append(K.tube(f'shock_{sx}{sy}', [top, hub], 0.03, 'Steel'))
        mid = tuple((a + b) / 2 for a, b in zip(top, hub))
        dx, dz = hub[0] - top[0], hub[2] - top[2]
        ang = math.atan2(dx, -dz)
        chassis.append(K.cyl(f'coil_{sx}{sy}', 0.055, 0.2, mid, 'Charcoal', rot=(0, ang, 0), n=12, bevel=0.01))
body = K.join('Chassis', chassis)
K.parent(body, root)

seat = K.join('Seat', [
    K.box('saddle', (0.34, 0.66, 0.1), (0, 0.18, P['seat_z']), 'Seat', bevel=0.045, rot=(math.radians(-4), 0, 0)),
    K.box('saddle_base', (0.38, 0.6, 0.08), (0, 0.18, P['seat_z'] - 0.08), 'Charcoal', bevel=0.03),
])
K.parent(seat, root)

bars_z = 1.06
bars = K.join('Handlebars', [
    K.tube('stem', [(0, -0.48, bz + 0.18), (0, -0.52, bars_z)], 0.03, 'Steel'),
    K.tube('bar', [(-0.36, -0.46, bars_z + 0.04), (-0.12, -0.52, bars_z), (0.12, -0.52, bars_z), (0.36, -0.46, bars_z + 0.04)], 0.018, 'Steel'),
    K.cyl('grip_l', 0.028, 0.12, (-0.4, -0.45, bars_z + 0.05), 'Seat', rot=(0, math.pi / 2, 0), n=12),
    K.cyl('grip_r', 0.028, 0.12, (0.4, -0.45, bars_z + 0.05), 'Seat', rot=(0, math.pi / 2, 0), n=12),
    K.box('light_pod', (0.18, 0.14, 0.12), (0, -0.58, bars_z - 0.02), 'Charcoal', bevel=0.025),
])
K.parent(bars, root)

ny = P['nose_y']
lights = K.join('Lights', [
    K.box('head_l', (0.11, 0.03, 0.07), (-0.15, ny + 0.02, bz + 0.03), 'HeadlightGlass', bevel=0.01),
    K.box('head_r', (0.11, 0.03, 0.07), (0.15, ny + 0.02, bz + 0.03), 'HeadlightGlass', bevel=0.01),
    K.box('pod_lamp', (0.09, 0.02, 0.05), (0, -0.655, bars_z - 0.02), 'HeadlightGlass', bevel=0.008),
    K.box('tail_lamp', (0.2, 0.02, 0.04), (0, P['tail_y'] + 0.01, P['seat_z'] - 0.02), 'TailLight', bevel=0.008),
])
K.parent(lights, root)

lo, hi = K.bounds()
print('bounds', [round(v, 3) for v in lo], [round(v, 3) for v in hi], 'triangles', K.triangles())
K.export(os.path.join(HERE, 'buggy.glb'))
if '--render' in sys.argv:
    os.makedirs(os.path.join(HERE, 'r'), exist_ok=True)
    K.render(os.path.join(HERE, 'r', 'hero.png'), yaw=-40, pitch=20)
    K.render(os.path.join(HERE, 'r', 'back.png'), yaw=150, pitch=18)
