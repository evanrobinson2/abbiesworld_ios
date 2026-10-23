"""The milkshake bar: counter, stools, giant sundaes and the small things on the bar (AW-STUDY-0013 `items`).

Plan on the bar deck (room coordinates, deck top at z = 0.30): stools stand in front of the counter on the deck,
the counter front face is at x = 4.05, the staff aisle runs from 4.65 to 5.35, and the back counter is against
the right wall. The counter curves round to the wall at the front with a lift-up flap for the staff.
"""
import math
from kit import *
from assets_room import X, Y, DECK_X

REF = "studies/cafe/img/interior-party_0.jpg (Evan's locked pick)"
DECK = 0.30
BAR = dict(x=4.05, depth=0.6, h=1.10, y_back=2.4, y_turn=-1.6, r=0.9)   # shortened 2026-10-23 (Evan: "counter is too big"), was 3.6 / -3.0


def bar_path(off=0.0, n_arc=8):
    """The front line of the counter, offset `off` metres towards the staff side."""
    b = BAR; x = b['x'] + off; r = b['r'] - off; cx, cy = b['x'] + b['r'], b['y_turn']
    pts = [(x, b['y_back']), (x, cy)]
    pts += [(cx + r * math.cos(math.pi + math.pi / 2 * i / n_arc), cy + r * math.sin(math.pi + math.pi / 2 * i / n_arc)) for i in range(1, n_arc + 1)]
    pts += [(5.25, cy - r)]
    return pts

def ribbon(name, pts, z0, z1, thick, mat, parent):
    """A vertical wall of `thick` metres following a 2D path."""
    import bmesh
    from mathutils import Vector as V
    bm = bmesh.new(); P = [V((x, y, 0)) for x, y in pts]
    def nrm(i):
        if i == 0:
            t = P[1] - P[0]
        elif i == len(P) - 1:
            t = P[-1] - P[-2]
        else:
            t = (P[i + 1] - P[i]).normalized() + (P[i] - P[i - 1]).normalized()
        t.normalize(); return V((t.y, -t.x, 0))
    rows = []
    for i, p in enumerate(P):
        n = nrm(i) * thick / 2
        rows.append([bm.verts.new(p + n + V((0, 0, z0))), bm.verts.new(p - n + V((0, 0, z0))), bm.verts.new(p - n + V((0, 0, z1))), bm.verts.new(p + n + V((0, 0, z1)))])
    for a, b in zip(rows, rows[1:]):
        for k in range(4):
            m = (k + 1) % 4
            bm.faces.new((a[k], a[m], b[m], b[k]))
    bm.faces.new(list(reversed(rows[0]))); bm.faces.new(rows[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    from kit import _finish
    return _finish(bm, name, mat, parent=parent)


@asset('bar_counter', 'Milkshake bar', 'Bar', 'hero', REF,
       real='bar counter: 18 mm ply carcass with gloss teal fluted front, 20 mm solid-surface top with a bullnose, brass foot rail on brackets, stainless ice well and glass racks on the staff side, lift-up flap',
       moving='the staff flap lifts; the ice-well lid slides')
def bar_counter():
    """The teal milkshake bar that curves round to the wall, a mint top, brass foot rail and a pink glow under the top."""
    R = empty('bar_counter')
    b = BAR; z0 = DECK
    front = bar_path(0.0); back = bar_path(b['depth'])
    shell(ribbon('bar_front', bar_path(0.02), z0, z0 + b['h'] - 0.03, 0.04, 'Plank_TealFront', R), 0.018, open=True)
    shell(ribbon('bar_back_panel', bar_path(b['depth'] - 0.05), z0, z0 + b['h'] - 0.03, 0.03, 'Plank_Counter', R), 0.018, open=True)
    top = [(x, y) for x, y in bar_path(-0.05)] + [(x, y) for x, y in reversed(bar_path(b['depth']))]
    prism('bar_top', top, 0.04, 'Stone_MintTop', parent=R, z0=z0 + b['h'] - 0.04)
    # flutes on the front: half-round teal ribs every 150 mm along the straight run and the curve
    import itertools
    pts = bar_path(-0.005, n_arc=10)
    seglens = [math.dist(a, c) for a, c in zip(pts, pts[1:])]
    total = sum(seglens); k = 0; s = 0.12
    while s < total - 0.12:
        acc = 0
        for (a, c), L in zip(zip(pts, pts[1:]), seglens):
            if acc + L >= s:
                t = (s - acc) / L; x = a[0] + (c[0] - a[0]) * t; y = a[1] + (c[1] - a[1]) * t
                cyl(f'flute_{k}', 0.035, b['h'] - 0.2, 'Plank_TealFront', loc=(x, y, z0 + 0.1), parent=R, verts=6); k += 1
                break
            acc += L
        s += 0.15
    tube('glow_strip', [(x - 0.06, y, z0 + b['h'] - 0.06) for x, y in bar_path(-0.02)], 0.012, 'Glass_NeonPink', parent=R, verts=4)
    # brass foot rail on brackets, 220 mm up, 150 mm proud
    rail = [(x - 0.17, y, z0 + 0.22) for x, y in bar_path(-0.17)][:-1]
    tube('foot_rail', rail, 0.025, 'Metal_Brass', parent=R, verts=8)
    for i, (x, y, z) in enumerate(rail[::2]):
        tube(f'rail_bracket_{i}', [(x, y, z), (x + 0.15, y, z + 0.05)], 0.012, 'Metal_Brass', parent=R, verts=6)
    # staff side: ice well, glass racks, shelf
    shell(box('ice_well', (0.4, 0.6, 0.25), 'Metal_Steel', loc=(b['x'] + 0.33, 1.0, z0 + b['h'] - 0.30), parent=R, origin='bottom'), 0.001, open=True)
    lid = box('ice_well_lid', (0.4, 0.3, 0.01), 'Metal_Steel', loc=(b['x'] + 0.33, 0.85, z0 + b['h'] - 0.035), parent=R, origin='bottom'); joint(lid, 'slide', (0, 1, 0), 0, 0.3)
    box('staff_shelf', (0.45, 5.5, 0.02), 'Plank_Counter', loc=(b['x'] + 0.33, 0.2, z0 + 0.45), parent=R, origin='bottom')
    for i in range(3):
        g = empty(f'glass_rack_{i}', loc=(b['x'] + 0.33, -1.6 + i * 0.55, z0 + 0.47), parent=R)
        box(f'glass_rack_{i}_tray', (0.4, 0.4, 0.04), 'Plastic_Black', parent=g, origin='bottom')
        for gx in range(3):
            for gy in range(3):
                lathe(f'glass_{i}_{gx}_{gy}', [(0.0, 0.04), (0.035, 0.04), (0.042, 0.16), (0.038, 0.16), (0.032, 0.044), (0.0, 0.044)], 'Glass_Clear', loc=(-0.12 + gx * 0.12, -0.12 + gy * 0.12, 0), parent=g, verts=6)
    fl = empty('staff_flap', loc=(5.25, b['y_turn'] - b['r'], z0 + b['h']), parent=R); joint(fl, 'hinge', (1, 0, 0), 0, 1.6, 'lift to walk behind the bar')
    box('staff_flap_top', (0.7, b['depth'], 0.04), 'Stone_MintTop', loc=(0.35, b['depth'] / 2 - 0.05, -0.04), parent=fl, origin='bottom')
    return R


@asset('bar_stools', 'Bar stool', 'Bar', 'support', 'studies/cafe/img/r2/asset-stool-lowpoly_0.jpg (round 2, low poly)',
       real='swivel bar stool: 380 mm vinyl seat on foam, plum powder-coated post with a gas lift, chrome foot ring, 450 mm steel base; seat 750 mm; about 11 kg',
       moving='the seat swivels and rises on its gas lift')
def bar_stools():
    """One stool (the layout places six along the bar)."""
    R = empty('bar_stool')
    shell(lathe('base', [(0.0, 0.0), (0.225, 0.0), (0.22, 0.02), (0.06, 0.035), (0.0, 0.035)], 'Metal_OrangeEnamel', parent=R, verts=12), 0.003)
    tag(cyl('base_plate', 0.2, 0.004, 'Metal_Dark', loc=(0, 0, 0.002), parent=R, verts=12), what='steel weight plate')
    seat = empty('seat', loc=(0, 0, 0.0), parent=R); joint(seat, 'knob', (0, 0, 1), 0, 6.283, 'swivels'); tag(seat, lift_m=[0, 0.1])
    shell(cyl('post', 0.035, 0.62, 'Metal_PlumEnamel', loc=(0, 0, 0.035), parent=seat, verts=8), 0.002)
    torus('foot_ring', 0.2, 0.012, 'Metal_Chrome', loc=(0, 0, 0.30), parent=seat, seg=14, verts=6)
    for i in range(3):
        a = i * 2 * math.pi / 3
        tube(f'ring_spoke_{i}', [(0.035 * math.cos(a), 0.035 * math.sin(a), 0.30), (0.19 * math.cos(a), 0.19 * math.sin(a), 0.30)], 0.008, 'Metal_Chrome', parent=seat, verts=6)
    shell(cyl('seat_pan', 0.15, 0.02, 'Metal_Dark', loc=(0, 0, 0.655), parent=seat, verts=12), 0.002)
    lathe('cushion', [(0.0, 0.675), (0.185, 0.675), (0.19, 0.71), (0.17, 0.75), (0.0, 0.755)], 'Cloth_SeatTeal', parent=seat, verts=12)
    return R


@asset('giant_sundaes', 'Giant sundae', 'Bar', 'hero', REF,
       real='a display sundae prop on the bar: 600 mm cast pink acrylic goblet, foam ice cream with a hard coat, a resin cherry and two straws',
       moving='lifts off the bar')
def giant_sundaes():
    """One giant sundae (the layout puts three on the bar: these are the bar's signs, read from across the room)."""
    R = empty('giant_sundae')
    shell(lathe('goblet', [(0.0, 0.0), (0.13, 0.0), (0.12, 0.02), (0.03, 0.04), (0.025, 0.2), (0.06, 0.24), (0.15, 0.36), (0.17, 0.48), (0.16, 0.48), (0.14, 0.37), (0.055, 0.25), (0.0, 0.25)], 'Glass_Pink', parent=R, verts=10), 0.006)
    tag(lathe('shake', [(0.0, 0.25), (0.055, 0.25), (0.14, 0.37), (0.155, 0.46), (0.0, 0.46)], 'Food_Shake', parent=R, verts=10), density=150, what='foam core, painted')
    for k, (r, z) in enumerate([(0.17, 0.5), (0.13, 0.57), (0.085, 0.63)]):
        tag(blob(f'cream_{k}', (r, r, r * 0.55), 'Food_CreamPink' if k == 1 else 'Food_Cream', loc=(0, 0, z), parent=R, subdiv=1, seed=k), density=45)
    tag(blob('cherry', (0.05, 0.05, 0.048), 'Food_Cherry', loc=(0.01, 0, 0.69), parent=R, subdiv=1), density=1200)
    tube('cherry_stem', [(0.01, 0, 0.73), (0.03, 0.01, 0.8), (0.06, 0, 0.83)], 0.006, 'Plaster_Lime', parent=R, verts=4)
    for i, (m, a) in enumerate([('Plastic_Cyan', 0.3), ('Plastic_Yellow', -0.4)]):
        tube(f'straw_{i}', [(0.05 * math.cos(a), 0.05 * math.sin(a), 0.3), (0.11 * math.cos(a), 0.11 * math.sin(a), 0.85), (0.16 * math.cos(a), 0.16 * math.sin(a), 0.9)], 0.012, m, parent=R, verts=6)
    tube('wafer', [(-0.08, 0.03, 0.5), (-0.14, 0.05, 0.75)], 0.03, 'Food_Wafer', parent=R, verts=4)
    return R


@asset('bar_bits', 'Bar bits', 'Bar', 'dressing', REF,
       real='the small things on a milkshake bar: a service bell, napkin dispenser, straw jar, three syrup bottles, a cherry jar, shake tins and a tip jar',
       moving='the bell rings (its button presses); everything lifts')
def bar_bits():
    """Built as one group laid out along a 1.6 m stretch of bar top (Y along). The service bell is how a customer
    calls the staff: a sound in the world, not a UI tick."""
    R = empty('bar_bits')
    bell = empty('service_bell', loc=(0, -0.7, 0), parent=R); joint(bell, 'lift')
    cyl('bell_base', 0.05, 0.012, 'Plank_Dark', parent=bell, verts=10)
    lathe('bell_dome', [(0.0, 0.012), (0.045, 0.012), (0.04, 0.035), (0.02, 0.05), (0.0, 0.052)], 'Metal_Brass', parent=bell, verts=10)
    b = cyl('bell_button', 0.006, 0.012, 'Metal_Chrome', loc=(0, 0, 0.052), parent=bell, verts=6); joint(b, 'button', (0, 0, -1), 0, 0.005, 'ding')
    nd = empty('napkin_dispenser', loc=(0, -0.45, 0), parent=R); joint(nd, 'lift')
    shell(box('napkin_box', (0.1, 0.16, 0.14), 'Metal_Chrome', parent=nd, bevel=0.01, origin='bottom'), 0.0008)
    box('napkins', (0.002, 0.12, 0.1), 'Paper_Pages', loc=(-0.051, 0, 0.02), parent=nd, origin='bottom')
    sj = empty('straw_jar', loc=(0, -0.2, 0), parent=R); joint(sj, 'lift')
    lathe('straw_jar_glass', [(0.0, 0.0), (0.045, 0.0), (0.045, 0.16), (0.04, 0.16), (0.04, 0.005), (0.0, 0.005)], 'Glass_Clear', parent=sj, verts=8)
    for i in range(9):
        a = i * 0.7
        tube(f'straw_{i}', [(0.02 * math.cos(a), 0.02 * math.sin(a), 0.01), (0.03 * math.cos(a), 0.03 * math.sin(a), 0.24)], 0.004, ['Plastic_Pink', 'Plastic_Cyan', 'Plastic_Yellow'][i % 3], parent=sj, verts=4)
    for i, m in enumerate(['Food_Smoothie', 'Food_Fruit', 'Plastic_Lime']):
        sb = empty(f'syrup_bottle_{i}', loc=(0, 0.05 + i * 0.09, 0), parent=R); joint(sb, 'lift')
        lathe(f'syrup_bottle_{i}_glass', [(0.0, 0.0), (0.035, 0.0), (0.035, 0.2), (0.015, 0.24), (0.012, 0.27), (0.0, 0.27)], 'Glass_Clear', parent=sb, verts=8)
        tag(lathe(f'syrup_bottle_{i}_syrup', [(0.0, 0.003), (0.032, 0.003), (0.032, 0.17), (0.0, 0.17)], m, parent=sb, verts=8), density=1300, what='syrup')
        lathe(f'syrup_bottle_{i}_pump', [(0.0, 0.27), (0.014, 0.27), (0.014, 0.29), (0.004, 0.29), (0.004, 0.33), (0.0, 0.33)], 'Plastic_Black', parent=sb, verts=6)
        tube(f'syrup_bottle_{i}_nozzle', [(0, 0, 0.32), (0.04, 0, 0.32)], 0.004, 'Plastic_Black', parent=sb, verts=4)
    cj = empty('cherry_jar', loc=(0, 0.42, 0), parent=R); joint(cj, 'lift')
    lathe('cherry_jar_glass', [(0.0, 0.0), (0.06, 0.0), (0.065, 0.12), (0.05, 0.14), (0.0, 0.14)], 'Glass_Clear', parent=cj, verts=8)
    for i in range(7):
        blob(f'cherry_{i}', (0.014, 0.014, 0.014), 'Food_Cherry', loc=(0.03 * math.cos(i), 0.03 * math.sin(i), 0.02 + (i % 3) * 0.025), parent=cj, subdiv=1)
    for i in range(2):
        t = empty(f'shake_tin_{i}', loc=(0.0, 0.62 + i * 0.11, 0), parent=R); joint(t, 'lift')
        lathe(f'shake_tin_{i}_body', [(0.0, 0.0), (0.035, 0.0), (0.048, 0.18), (0.045, 0.18), (0.032, 0.004), (0.0, 0.004)], 'Metal_Steel', parent=t, verts=8)
    tj = empty('tip_jar', loc=(0, 0.85, 0), parent=R); joint(tj, 'lift')
    lathe('tip_jar_glass', [(0.0, 0.0), (0.05, 0.0), (0.05, 0.12), (0.045, 0.12), (0.045, 0.005), (0.0, 0.005)], 'Glass_Clear', parent=tj, verts=8)
    for i in range(5):
        cyl(f'coin_{i}', 0.012, 0.002, 'Metal_Brass', loc=(0.01 * i - 0.02, 0.01 * (i % 2), 0.006 + i * 0.002), parent=tj, verts=8)
    star('tip_jar_star', 0.03, 0.003, 'Plaster_Sun', loc=(0, -0.052, 0.07), parent=tj)
    return R
