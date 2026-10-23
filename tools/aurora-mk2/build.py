"""AW-STUDY-0035 Aurora Mk 2: the upgrade of the USS Aurora lunar ferry (Mk 1 is RE-072 / RE-073 in the Moon scene).

Mk 2 keeps everything that makes the Aurora read as the Aurora: the sealed rounded ivory shell with light rib bands, the
dark window waist with its terracotta pinstripe, the two spherical shoulder engine pods with brass rims, the ribbed
cockpit window and four splayed landing legs. The upgrade is what a child can see from across the pad:

- a longer three-section hull (cockpit, cabin, cargo) instead of Mk 1's single egg, so it carries a crew;
- a bigger wraparound canopy, so you can see the pilots;
- engine pods that glow amber when the ship is ready to fly (the diegetic "ready" signal; no HUD needed);
- a lit doorway and a boarding stair on the starboard side (the "come aboard" signal);
- red and green running lights on the pods, the way real ships say port and starboard;
- a dorsal sensor mast with a dish and a red beacon, and twin main nozzles at the stern.

Built from named parts on the Moon base kit (tools/moon-base-kit/bkit.py): role materials, baked colour, roughness and
normal maps, mass per part in the glTF extras. Feet sit inside the 12 m MK-003 landing pad's touchdown circle.
Run: python tools/aurora-mk2/build.py   (needs `pip install bpy`)
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'moon-base-kit'))
import bkit as k  # noqa: E402
import bpy  # noqa: E402

# Aurora palette, taken from Mk 1's materials (ShellIvory, ShellLight, ShellRust, ShellBrass, ShellDark, ShellGlass).
k.ROLES.update({
    'Metal_Ivory':      ('#e4ddcd', 0.5, 0.05, 'grain', 2700, None, 0, 1),
    'Metal_IvoryLight': ('#f2eee4', 0.45, 0.05, 'brushed', 2700, None, 0, 1),
    'Metal_Waist':      ('#3e5357', 0.5, 0.3, 'panels_small', 2700, None, 0, 1),
    'Metal_Terracotta': ('#b65f3e', 0.5, 0.1, 'none', 2700, None, 0, 1),
    'Metal_Brass':      ('#c99a52', 0.35, 0.85, 'brushed', 8500, None, 0, 1),
    'Glass_Canopy':     ('#1f3b3d', 0.06, 0.2, 'none', 2500, '#2a5a58', 0.25, 1),
})

A, B, C, ZC = 2.15, 4.6, 1.75, 2.35   # hull ellipsoid semi-axes (x, y, z) and centre height, metres


def hull_x(y, z):
    """Half-width of the hull at a station y and height z (0 if outside)."""
    t = 1 - (y / B) ** 2 - ((z - ZC) / C) ** 2
    return A * math.sqrt(t) if t > 0 else 0.0


def section(y):
    """Cross-section semi-axes (x, z) at station y."""
    s = math.sqrt(max(0.0, 1 - (y / B) ** 2))
    return A * s, C * s


def intersect(o, cutter):
    md = o.modifiers.new('keep', 'BOOLEAN')
    md.operation = 'INTERSECT'
    md.object = cutter
    md.solver = 'EXACT'
    keep = o.data.materials[0]
    k.apply_mods(o)
    o.data.materials.clear()
    o.data.materials.append(keep)
    bpy.data.objects.remove(cutter)
    return o


def hoop(name, y, sx, sz, r=0.05):
    """A rib band hugging the hull's elliptical cross-section at station y."""
    o = k.torus(name, 1, r, (0, y, ZC), 'Metal_IvoryLight', n=36, m=6)
    o.scale = (sx, sz, 1)
    k.apply_tf(o)
    o.rotation_euler = (math.pi / 2, 0, 0)
    k.apply_tf(o)
    return o


k.reset()
# ---------------------------------------------------------------- the shell
k.sphere('HullShell', 1, (0, 0, ZC), 'Metal_Ivory', seg=24, rings=14, scale=(A, B, C), fill=0.12)
# Dark window waist and terracotta pinstripe: slightly larger shells kept only inside a horizontal band.
waist = k.sphere('WindowWaist', 1, (0, 0, ZC), 'Metal_Waist', seg=24, rings=14, scale=(A * 1.012, B * 1.006, C * 1.012), fill=0.01)
intersect(waist, k.cutter_box((6, 6.6, 0.62), (0, 0.3, ZC + 0.12)))
stripe = k.sphere('Pinstripe', 1, (0, 0, ZC), 'Metal_Terracotta', seg=24, rings=14, scale=(A * 1.02, B * 1.01, C * 1.02), fill=0.01)
intersect(stripe, k.cutter_box((6, 7.4, 0.08), (0, 0.4, ZC - 0.32)))
# Light rib bands: Mk 1's signature hoops, now five of them marking the three sections.
for i, y in enumerate((-2.7, -1.2, 0.4, 1.9, 3.2)):
    sx, sz = section(y)
    hoop(f'RibBand{i}', y, sx + 0.035, sz + 0.035)
# Cabin portholes along the waist, warm when someone is home.
for side in (-1, 1):
    for j, y in enumerate((-1.9, -0.9, 0.0, 0.9, 1.7)):
        z = ZC + 0.12
        x = hull_x(y, z) * 1.01
        k.cyl(f'Porthole{"PS"[side > 0]}{j}', 0.17, 0.08, (side * x, y, z), 'Window_Warm', rot=(0, math.pi / 2, 0), n=12)
        k.torus(f'PortholeRim{"PS"[side > 0]}{j}', 0.19, 0.035, (side * (x + 0.01), y, z), 'Metal_Brass',
                rot=(0, math.pi / 2, 0), n=12, m=4)

# ---------------------------------------------------------------- cockpit (bow is -Y)
canopy = k.sphere('Canopy', 1, (0, -3.35, ZC + 0.55), 'Glass_Canopy', seg=20, rings=10, scale=(1.55, 1.45, 1.0), fill=0.02)
intersect(canopy, k.cutter_box((4, 3, 2), (0, -3.6, ZC + 1.15)))
# Canopy frame: brass arches over the glass, kept above the sill like Mk 1's ribbed window.
for i, x in enumerate((-0.95, -0.48, 0.0, 0.48, 0.95)):
    arch = k.torus(f'CanopyArch{i}', 1, 0.04, (x, -3.35, ZC + 0.55), 'Metal_Brass', rot=(0, math.pi / 2, 0), n=28, m=4)
    w = math.sqrt(max(0.05, 1 - (x / 1.58) ** 2))
    arch.scale = (1.02 * w, 1.47 * w, 1)
    k.apply_tf(arch)
    intersect(arch, k.cutter_box((0.3, 3, 2), (x, -3.6, ZC + 1.15 + 0.02)))
k.torus('CanopySill', 1, 0.06, (0, -3.35, ZC + 0.15), 'Metal_Brass', n=32, m=5)
sill = k._parts[-1]
sill.scale = (1.5, 1.32, 1)
k.apply_tf(sill)
intersect(sill, k.cutter_box((4, 2.4, 1), (0, -3.9, ZC + 0.15)))
k.sphere('NoseCap', 0.32, (0, -4.55, ZC - 0.2), 'Metal_Gunmetal', seg=12, rings=6, scale=(1, 0.5, 1))
k.cyl('Headlamp', 0.16, 0.06, (0, -4.68, ZC - 0.2), 'HeadlightGlass', rot=(math.pi / 2, 0, 0), n=12)

# ---------------------------------------------------------------- shoulder engine pods
for side, lamp in ((-1, 'Lamp_Red'), (1, 'Lamp_Green')):
    tag = 'Port' if side < 0 else 'Starboard'
    px, py, pz = side * 3.05, 0.9, ZC + 0.25
    k.box(f'PodPylon{tag}', (1.1, 0.9, 0.42), (side * 2.2, py, pz), 'Metal_Gunmetal', bevel=0.05)
    k.sphere(f'EnginePod{tag}', 1.0, (px, py, pz), 'Metal_Ivory', seg=16, rings=10, fill=0.3)
    k.torus(f'PodRimBrass{tag}', 0.78, 0.11, (px + side * 0.62, py, pz), 'Metal_Brass', rot=(0, math.pi / 2, 0), n=24, m=6)
    k.cyl(f'PodIntake{tag}', 0.66, 0.1, (px + side * 0.66, py, pz), 'Metal_Gunmetal', rot=(0, math.pi / 2, 0), n=20)
    k.torus(f'PodReadyGlow{tag}', 0.5, 0.05, (px + side * 0.72, py, pz), 'Lamp_Amber', rot=(0, math.pi / 2, 0), n=20, m=4)
    k.cyl(f'PodHub{tag}', 0.2, 0.12, (px + side * 0.74, py, pz), 'Metal_Steel', rot=(0, math.pi / 2, 0), n=12)
    for s in range(8):
        a = math.tau * s / 8
        k.box(f'PodVane{tag}{s}', (0.04, 0.5, 0.06), (px + side * 0.73, py + 0.38 * math.cos(a), pz + 0.38 * math.sin(a)),
              'Metal_Steel', bevel=0, rot=(a, 0, 0))
    k.cyl(f'PodNozzle{tag}', 0.42, 0.42, (px, py, pz - 1.05), 'Metal_Steel', n=16, r2=0.3)
    k.cyl(f'PodNozzleGlow{tag}', 0.3, 0.03, (px, py, pz - 1.27), 'Lamp_Amber', n=16)
    k.sphere(f'RunningLight{tag}', 0.09, (px, py - 0.95, pz + 0.25), lamp, seg=8, rings=4)

# ---------------------------------------------------------------- landing legs (feet inside a 12 m pad's touchdown circle)
for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
    hip = (sx * 1.35, sy * 2.35, ZC - 1.2)
    knee = (sx * 2.15, sy * 3.0, 0.95)
    foot = (sx * 2.35, sy * 3.15, 0.2)
    k.tube(f'LegStrut{i}', [hip, knee, foot], 0.1, 'Metal_Gunmetal', n=8)
    k.cyl(f'LegShock{i}', 0.065, 0.75, ((hip[0] + knee[0]) / 2 + sx * 0.12, (hip[1] + knee[1]) / 2, (hip[2] + knee[2]) / 2),
          'Metal_Brass', rot=(sy * 0.6, -sx * 0.7, 0), n=8)
    k.cyl(f'FootPad{i}', 0.48, 0.14, (foot[0], foot[1], 0.07), 'Metal_Steel', n=14, bevel=0.03)
    k.cyl(f'FootSole{i}', 0.5, 0.04, (foot[0], foot[1], 0.02), 'Rubber_Black', n=14)
# Belly VTOL thrusters (Mk 1 had four; Mk 2 keeps them for the vertical lift path).
for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
    k.cyl(f'BellyThruster{i}', 0.3, 0.3, (sx * 0.9, sy * 1.5, ZC - 1.55), 'Metal_Steel', n=12, r2=0.22)
    k.cyl(f'BellyThrusterGlow{i}', 0.2, 0.02, (sx * 0.9, sy * 1.5, ZC - 1.71), 'Lamp_Amber', n=12)

# ---------------------------------------------------------------- starboard door and boarding stair
dy, dz = -0.35, ZC - 0.35
dx = hull_x(dy, dz + 0.4)
k.box('DoorFrame', (0.22, 1.25, 1.9), (dx - 0.02, dy, dz + 0.35), 'Metal_Brass', bevel=0.06)
k.box('DoorwayLight', (0.06, 0.95, 1.6), (dx + 0.08, dy, dz + 0.35), 'Window_Warm', bevel=0.02)
base_z = dz - 0.6
for s in range(5):
    t = s / 5
    k.box(f'StairTread{s}', (0.5, 1.1, 0.07), (dx + 0.3 + t * 2.0, dy, base_z - t * (base_z - 0.1)), 'Metal_Grate', bevel=0.01)
for side in (-1, 1):
    k.tube(f'StairStringer{"LR"[side > 0]}', [(dx + 0.1, dy + side * 0.58, base_z + 0.05), (dx + 2.45, dy + side * 0.58, 0.05)],
           0.045, 'Metal_Gunmetal', n=6)
    k.tube(f'StairRail{"LR"[side > 0]}', [(dx + 0.1, dy + side * 0.58, base_z + 0.95), (dx + 2.45, dy + side * 0.58, 0.95)],
           0.03, 'Metal_Brass', n=6)

# ---------------------------------------------------------------- dorsal spine, mast and stern
k.box('DorsalSpine', (0.55, 4.6, 0.3), (0, 0.4, ZC + C - 0.05), 'Metal_IvoryLight', bevel=0.1)
k.box('DorsalHatch', (0.62, 0.9, 0.14), (0, -0.9, ZC + C + 0.14), 'Metal_Brass', bevel=0.04)
k.cyl('MastPost', 0.06, 1.1, (0, 1.6, ZC + C + 0.6), 'Metal_Gunmetal', n=8)
k.bowl('MastDish', 0.42, 0.14, (0, 1.6, ZC + C + 1.05), 'Metal_IvoryLight', rot=(0.5, 0, 0), seg=12, rings=3)
k.sphere('MastBeacon', 0.08, (0, 1.6, ZC + C + 1.2), 'Lamp_Red', seg=8, rings=4)
for side in (-1, 1):
    k.cyl(f'MainNozzle{"PS"[side > 0]}', 0.42, 0.7, (side * 0.55, 4.55, ZC - 0.1), 'Metal_Steel', rot=(math.pi / 2, 0, 0),
          n=16, r2=0.55)
    k.cyl(f'MainNozzleGlow{"PS"[side > 0]}', 0.48, 0.03, (side * 0.55, 4.9, ZC - 0.1), 'Lamp_Amber',
          rot=(math.pi / 2, 0, 0), n=16)
k.box('CargoDoor', (1.3, 0.12, 1.0), (0, 4.28, ZC - 0.65), 'Metal_Waist', bevel=0.05, rot=(0.55, 0, 0))

k.build(HERE, {'id': 'AW-0035-MK2', 'name': 'Aurora Mk 2'}, bake_size=2048,
        view=dict(hero_cam=((10.5, -12.0, 6.2), (0, -0.2, 2.0)), samples=32, size=1100),
        fps_eye=((6.2, -3.2, 1.1), (0, 0, 2.2)))
