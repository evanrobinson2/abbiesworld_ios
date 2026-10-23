"""Back bar: the machines behind the counter (AW-STUDY-0013 manifest `back_bar`).

The espresso and smoothie machines are built as real machines, part by part, because Game 1 (espresso) is a
mechatronics puzzle and Game 2 (smoothie) a timing game: every part a player can fix, fill, press or remove is its
own named object with a joint. "Ultra fine does not mean high poly ... low poly parts that perfectly build the system."
"""
import math
from kit import *

REF_LOWPOLY = 'studies/cafe/img/r2/asset-{}-lowpoly_0.jpg (Midjourney round 2, low poly, Evan picked low poly 2026-10-23 08:02Z)'


@asset('espresso_machine', 'Espresso machine', 'Back bar', 'hero', REF_LOWPOLY.format('espresso'),
       real='single-group prosumer espresso machine (E61-style group, 1.8 L copper boiler, vibration pump), about 380 x 440 x 420 mm',
       moving='portafilter twists in and lifts out; steam wand swings; steam knob turns; three buttons press; drip tray slides out and its grate lifts; water tank lifts out; right side panel lifts off to show the boiler, pump and valves')
def espresso_machine():
    """Pink enamel body on a teal plinth and orange skirt (the round-2 low-poly pick), chrome group, cup warmer rail,
    violet wand and handle. Inside: copper boiler with heating element, vibration pump, solenoid, pressurestat, OPV and
    copper pipes, all named, because the espresso game is fixing this system."""
    R = empty('espresso_machine')
    W, D = 0.38, 0.42
    # base: orange skirt, teal plinth, rubber feet
    shell(box('skirt', (W + 0.03, D + 0.03, 0.028), 'Metal_OrangeEnamel', loc=(0, 0, 0.012), parent=R, bevel=0.008, origin='bottom'), 0.0015, open=True)
    shell(box('plinth', (W + 0.01, D + 0.01, 0.045), 'Metal_TealEnamel', loc=(0, 0, 0.038), parent=R, bevel=0.012, origin='bottom'), 0.0015, open=True)
    for i, (x, y) in enumerate([(-1, -1), (1, -1), (-1, 1), (1, 1)]):
        cyl(f'foot_{i}', 0.016, 0.012, 'Rubber_Black', loc=(x * (W / 2 - 0.03), y * (D / 2 - 0.03), 0), parent=R, verts=8)
    # drip tray (slides out to the front) with a lifting grate
    tray = shell(box('drip_tray', (0.30, 0.17, 0.03), 'Metal_Steel', loc=(0, -D / 2 + 0.09, 0.083), parent=R, bevel=0.004, origin='bottom'), 0.0008, open=True)
    joint(tray, 'slide', (0, -1, 0), 0, 0.16, 'pull to empty')
    grate = empty('drip_grate', loc=(0, 0, 0.031), parent=tray); joint(grate, 'lift', note='lifts off to clean')
    for i in range(9):
        box(f'grate_bar_{i}', (0.006, 0.16, 0.004), 'Metal_Chrome', loc=(-0.12 + i * 0.03, 0, 0), parent=grate, origin='bottom')
    box('grate_rim', (0.29, 0.006, 0.004), 'Metal_Chrome', loc=(0, -0.08, 0), parent=grate, origin='bottom')
    # body: tall back column and the head that overhangs the cup bay; right side panel removable
    shell(box('body_column', (W - 0.006, 0.24, 0.335), 'Metal_PinkEnamel', loc=(0, D / 2 - 0.12, 0.083), parent=R, bevel=0.018, origin='bottom'), 0.001, open=True)
    shell(box('body_head', (W, D, 0.13), 'Metal_PinkEnamel', loc=(0, 0, 0.293), parent=R, bevel=0.022, origin='bottom'), 0.001, open=True)
    side = shell(box('side_panel_right', (0.012, 0.23, 0.205), 'Metal_OrangeEnamel', loc=(W / 2 + 0.006, D / 2 - 0.12, 0.085), parent=R, bevel=0.004, origin='bottom'), 0.001, open=True)
    joint(side, 'lift', note='unscrew to reach the boiler, pump and valves')
    box('trim_left', (0.010, 0.30, 0.012), 'Metal_Chrome', loc=(-W / 2 - 0.004, 0.0, 0.29), parent=R, origin='bottom')
    # cup warmer: steel tray with a chrome rail on posts
    box('cup_warmer', (W - 0.04, D - 0.06, 0.003), 'Metal_Steel', loc=(0, 0.01, 0.423), parent=R, origin='bottom')
    rail = [(-0.16, -0.17, 0.47), (0.16, -0.17, 0.47), (0.16, 0.19, 0.47), (-0.16, 0.19, 0.47)]
    tube('cup_rail', rail, 0.005, 'Metal_Chrome', parent=R, closed=True, verts=6)
    for i, p in enumerate(rail):
        tube(f'rail_post_{i}', [(p[0], p[1], 0.43), p], 0.004, 'Metal_Chrome', parent=R, verts=6)
    lid = box('tank_lid', (0.30, 0.14, 0.006), 'Metal_Chrome', loc=(0, 0.13, 0.431), parent=R, origin='bottom')
    joint(lid, 'hinge', (1, 0, 0), 0, 1.6, 'lift to fill the tank')
    # front panel: pressure gauge, three buttons, steam knob, power lamp
    fy = -D / 2 - 0.002
    g = empty('pressure_gauge', loc=(-0.11, fy, 0.36), rot=(math.pi / 2, 0, 0), parent=R)
    cyl('gauge_bezel', 0.032, 0.014, 'Metal_Chrome', parent=g, verts=14)
    cyl('gauge_face', 0.026, 0.002, 'Plaster_Cream', loc=(0, 0, 0.012), parent=g, verts=14)
    box('gauge_needle', (0.003, 0.022, 0.001), 'Plastic_Red', loc=(0.006, 0.006, 0.0145), rot=(0, 0, -0.6), parent=g, origin='bottom')
    cyl('gauge_lens', 0.027, 0.003, 'Glass_Gauge', loc=(0, 0, 0.014), parent=g, verts=14)
    tag(g, reads='boiler pressure 0 to 3 bar; brew pressure shows here in the game')
    for i, (x, m, fn) in enumerate([(-0.035, 'Plastic_Teal', 'power'), (0.005, 'Plastic_Lime', 'brew'), (0.045, 'Plastic_Pink', 'hot_water')]):
        b = cyl(f'button_{fn}', 0.012, 0.012, m, loc=(x, fy, 0.355), rot=(math.pi / 2, 0, 0), parent=R, verts=10)
        cyl(f'button_{fn}_ring', 0.016, 0.004, 'Metal_Chrome', loc=(x, fy + 0.001, 0.355), rot=(math.pi / 2, 0, 0), parent=R, verts=10)
        joint(b, 'button', (0, 1, 0), 0, 0.004, fn)
    k = empty('steam_knob', loc=(0.125, fy, 0.355), rot=(math.pi / 2, 0, 0), parent=R)
    cyl('steam_knob_base', 0.024, 0.012, 'Metal_Chrome', parent=k, verts=12)
    cyl('steam_knob_cap', 0.020, 0.014, 'Plastic_Orange', loc=(0, 0, 0.012), parent=k, verts=8, r2=0.016)
    joint(k, 'knob', (0, 0, 1), 0, 4.7, 'opens the steam valve (about 1.5 turns)')
    cyl('power_lamp', 0.005, 0.004, 'Light_Bulb', loc=(-0.07, fy, 0.395), rot=(math.pi / 2, 0, 0), parent=R, verts=8)
    # group head under the head, over the drip tray
    gh = empty('group_head', loc=(0, -0.06, 0.293), parent=R)
    cyl('group_body', 0.045, 0.045, 'Metal_ChromeBrass', loc=(0, 0, -0.045), parent=gh, verts=12, r2=0.05)
    cyl('group_collar', 0.040, 0.012, 'Metal_ChromeBrass', loc=(0, 0, -0.057), parent=gh, verts=12)
    cyl('group_gasket', 0.036, 0.004, 'Rubber_Black', loc=(0, 0, -0.061), parent=gh, verts=12)
    cyl('shower_screen', 0.030, 0.002, 'Metal_Steel', loc=(0, 0, -0.062), parent=gh, verts=12)
    tag(gh, brews='water at 93 C and 9 bar through the puck')
    # portafilter: locks into the group with a twist, lifts out
    pf = empty('portafilter', loc=(0, -0.06, 0.226), parent=R)
    joint(pf, 'knob', (0, 0, 1), -0.8, 0, 'twist to lock (lifts out when unlocked)')
    lathe('portafilter_basket', [(0.0, -0.028), (0.032, -0.028), (0.038, -0.004), (0.040, 0.0), (0.0, 0.0)], 'Metal_Chrome', parent=pf, verts=12)
    box('portafilter_lug_l', (0.012, 0.010, 0.006), 'Metal_Chrome', loc=(-0.042, 0, -0.004), parent=pf, origin='bottom')
    box('portafilter_lug_r', (0.012, 0.010, 0.006), 'Metal_Chrome', loc=(0.042, 0, -0.004), parent=pf, origin='bottom')
    cyl('coffee_puck', 0.030, 0.006, 'Coffee', loc=(0, 0, -0.008), parent=pf, verts=10)
    for sx in (-1, 1):
        tube(f'spout_{"lr"[sx > 0]}', [(0, 0, -0.028), (sx * 0.012, 0, -0.040), (sx * 0.016, 0, -0.048)], 0.004, 'Metal_Chrome', parent=pf, verts=6)
    tube('portafilter_neck', [(0, -0.035, -0.012), (0, -0.07, -0.016)], 0.008, 'Metal_Chrome', parent=pf, verts=8)
    tube('portafilter_grip', [(0, -0.07, -0.016), (0, -0.11, -0.020), (0, -0.155, -0.022)], 0.013, 'Plastic_Violet', parent=pf, verts=8)
    # steam wand on a ball joint at the right, violet cool-touch sleeve
    sw = empty('steam_wand', loc=(0.15, -0.15, 0.30), parent=R)
    joint(sw, 'hinge', (0, 0, 1), -0.9, 0.9, 'swings out over a jug')
    cyl('wand_ball', 0.012, 0.016, 'Metal_Chrome', loc=(0, 0, -0.008), parent=sw, verts=8)
    tube('wand_pipe', [(0, 0, -0.01), (0.01, -0.03, -0.06), (0.012, -0.04, -0.16)], 0.006, 'Metal_Chrome', parent=sw, verts=8)
    tube('wand_sleeve', [(0.006, -0.018, -0.035), (0.011, -0.036, -0.10)], 0.0105, 'Plastic_Violet', parent=sw, verts=8)
    cyl('wand_tip', 0.007, 0.012, 'Metal_Steel', loc=(0.012, -0.04, -0.172), parent=sw, verts=8)
    # hot water spout on the left
    tube('hot_water_spout', [(-0.15, -0.15, 0.295), (-0.152, -0.17, 0.25), (-0.152, -0.17, 0.215)], 0.005, 'Metal_Chrome', parent=R, verts=6)
    # inside (behind the removable side panel)
    inside = empty('internals', parent=R)
    tag(inside, note='the system the espresso game is about: tank -> pump -> boiler -> group, with valves and a pressure switch')
    tank = box('water_tank', (0.30, 0.10, 0.25), 'Glass_Tank', loc=(0, 0.15, 0.12), parent=inside, bevel=0.01, origin='bottom')
    joint(tank, 'lift', note='lifts out through the top to fill; holds 2.2 L')
    box('tank_water', (0.29, 0.09, 0.085), 'Water', loc=(0, 0.15, 0.125), parent=inside, origin='bottom')
    b = cyl('boiler', 0.055, 0.20, 'Metal_Copper', loc=(0.0, 0.035, 0.21), rot=(0, math.pi / 2, 0), parent=inside, verts=12, origin='center')
    tag(b, holds='1.8 L at 1.2 bar steam / 93 C brew; the heating element is inside')
    tube('heating_element', [(-0.08, 0.02, 0.20), (0.08, 0.02, 0.20), (0.08, 0.05, 0.20), (-0.08, 0.05, 0.20)], 0.004, 'Metal_Steel', parent=inside, verts=6)
    cyl('pump', 0.022, 0.09, 'Metal_Dark', loc=(0.08, 0.06, 0.11), rot=(0, math.pi / 2, 0), parent=inside, verts=10, origin='center')
    tag(inside.children[-1], what='vibration pump, 15 bar max (ULKA-style)')
    box('solenoid_valve', (0.03, 0.03, 0.04), 'Metal_Brass', loc=(0.05, -0.01, 0.25), parent=inside, origin='bottom')
    box('pressurestat', (0.04, 0.03, 0.03), 'Metal_Dark', loc=(0.12, 0.02, 0.30), parent=inside, origin='bottom')
    cyl('opv_valve', 0.008, 0.035, 'Metal_Brass', loc=(0.06, 0.06, 0.15), parent=inside, verts=8)
    cyl('safety_valve', 0.008, 0.03, 'Metal_Brass', loc=(-0.06, 0.035, 0.262), parent=inside, verts=8)
    tube('pipe_tank_pump', [(0.0, 0.10, 0.12), (0.035, 0.07, 0.10)], 0.004, 'Metal_Copper', parent=inside, verts=6)
    tube('pipe_pump_boiler', [(0.125, 0.05, 0.10), (0.15, 0.0, 0.14), (0.0, -0.02, 0.17)], 0.004, 'Metal_Copper', parent=inside, verts=6)
    tube('pipe_boiler_group', [(-0.05, -0.05, 0.25), (0.0, -0.06, 0.27), (0.0, -0.06, 0.28)], 0.004, 'Metal_Copper', parent=inside, verts=6)
    tube('pipe_steam', [(-0.12, -0.06, 0.27), (0.08, -0.12, 0.30), (0.15, -0.15, 0.30)], 0.004, 'Metal_Copper', parent=inside, verts=6)
    # two cups waiting on the tray (lime and orange, as in the pick)
    for nm, x, m in [('cup_lime', -0.07, 'Clay_CupLime'), ('cup_orange', 0.07, 'Clay_CupOrange')]:
        c = empty(nm, loc=(x, -D / 2 + 0.09, 0.118), parent=R); joint(c, 'lift')
        lathe(nm + '_body', [(0.0, 0.0), (0.024, 0.0), (0.033, 0.03), (0.036, 0.055), (0.031, 0.055), (0.028, 0.032), (0.0, 0.03)], m, parent=c, verts=10)
        tube(nm + '_handle', [(0.034, 0, 0.045), (0.05, 0, 0.042), (0.05, 0, 0.02), (0.031, 0, 0.016)], 0.0045, m, parent=c, verts=6)
    return R


@asset('smoothie_machine', 'Smoothie machine', 'Back bar', 'hero', REF_LOWPOLY.format('smoothie'),
       real='commercial countertop blender, 1.5 kW motor, 2 L Tritan jar, about 210 x 230 x 470 mm',
       moving='jar lifts off the base; lid and filler cap lift off; speed dial turns; four buttons press; blades spin on the drive coupling')
def smoothie_machine():
    """Faceted pink base on an orange foot ring with an orange speed dial and four coloured buttons (the low-poly
    pick), a faceted Tritan jar with a pink handle, a violet lid, and a strawberry smoothie inside. The motor,
    coupling and blade set are real parts because the smoothie game times the drop, blend and pour."""
    R = empty('smoothie_machine')
    lathe('foot_ring', [(0.0, 0.0), (0.10, 0.0), (0.108, 0.012), (0.104, 0.024), (0.0, 0.024)], 'Plastic_Orange', parent=R, verts=8)
    base = lathe('base_housing', [(0.0, 0.024), (0.098, 0.024), (0.104, 0.07), (0.092, 0.15), (0.075, 0.172), (0.0, 0.172)], 'Plastic_Pink', parent=R, verts=8)
    shell(base, 0.003)
    for i in range(4):
        a = math.pi / 4 + i * math.pi / 2
        cyl(f'foot_{i}', 0.012, 0.006, 'Rubber_Black', loc=(0.075 * math.cos(a), 0.075 * math.sin(a), -0.006), parent=R, verts=6)
    motor = cyl('motor', 0.045, 0.09, 'Metal_Steel', loc=(0, 0, 0.05), parent=R, verts=10)
    tag(motor, mass_override_kg=1.6, what='1.5 kW universal motor, up to 25,000 rpm')
    cyl('drive_coupling', 0.022, 0.012, 'Rubber_Black', loc=(0, 0, 0.172), parent=R, verts=8)
    # control face: speed dial with four buttons around it, on the front facet
    face = empty('controls', loc=(0, -0.099, 0.09), rot=(math.pi / 2 - 0.08, 0, 0), parent=R)
    dial = cyl('speed_dial', 0.026, 0.016, 'Plastic_Orange', parent=face, verts=8, r2=0.022)
    box('dial_pointer', (0.004, 0.016, 0.003), 'Plastic_White', loc=(0, 0.008, 0.016), parent=dial, origin='bottom')
    joint(dial, 'knob', (0, 0, 1), -2.4, 2.4, 'off, 1 to 10, pulse')
    for i, (dx, dy, m, fn) in enumerate([(-0.045, 0.028, 'Plastic_Teal', 'pulse'), (0.045, 0.028, 'Plastic_Lime', 'smoothie'),
                                          (-0.045, -0.028, 'Plastic_Violet', 'ice'), (0.045, -0.028, 'Plastic_Pink', 'stop')]):
        b = cyl(f'button_{fn}', 0.013, 0.010, m, loc=(dx, dy, 0), parent=face, verts=6)
        joint(b, 'button', (0, 0, -1), 0, 0.004, fn)
    jar = empty('jar', loc=(0, 0, 0.174), parent=R); joint(jar, 'lift', note='lift straight up off the coupling')
    lathe('jar_collar', [(0.0, 0.0), (0.078, 0.0), (0.082, 0.03), (0.0, 0.03)], 'Plastic_Pink', parent=jar, verts=8)
    j = lathe('jar_wall', [(0.068, 0.03), (0.072, 0.03), (0.098, 0.24), (0.104, 0.27), (0.099, 0.27), (0.093, 0.24), (0.064, 0.034)], 'Glass_Tritan', parent=jar, verts=8)
    lathe('jar_floor', [(0.0, 0.03), (0.068, 0.03), (0.066, 0.036), (0.0, 0.036)], 'Glass_Tritan', parent=jar, verts=8)
    tube('jar_handle', [(0.096, 0, 0.23), (0.15, 0, 0.215), (0.155, 0, 0.12), (0.125, 0, 0.065), (0.078, 0, 0.055)], 0.013, 'Plastic_Pink', parent=jar, verts=6)
    tube('jar_spout', [(-0.09, 0, 0.262), (-0.112, 0, 0.272)], 0.008, 'Glass_Tritan', parent=jar, verts=6)
    blades = empty('blade_assembly', loc=(0, 0, 0.04), parent=jar); joint(blades, 'knob', (0, 0, 1), 0, 6.283, 'spins with the motor')
    cyl('blade_hub', 0.012, 0.02, 'Metal_Steel', parent=blades, verts=8)
    for i in range(4):
        a = i * math.pi / 2
        box(f'blade_{i}', (0.05, 0.012, 0.0015), 'Metal_Steel', loc=(0.025 * math.cos(a), 0.025 * math.sin(a), 0.014 + (i % 2) * 0.006),
            rot=((0.35 if i % 2 else -0.35), 0, a), parent=blades, origin='bottom')
    sm = lathe('smoothie', [(0.0, 0.037), (0.064, 0.037), (0.082, 0.15), (0.0, 0.15)], 'Food_Smoothie', parent=jar, verts=8)
    tag(sm, holds='about 1.1 L of strawberry smoothie')
    for i, (x, y, z, m) in enumerate([(0.03, 0.02, 0.17, 'Food_Fruit'), (-0.03, -0.01, 0.175, 'Food_Cherry'), (0.0, -0.035, 0.16, 'Plastic_Lime')]):
        blob(f'fruit_{i}', (0.022, 0.02, 0.016), 'Food_Fruit' if m == 'Plastic_Lime' else m, loc=(x, y, z), parent=jar, subdiv=1, seed=i)
    lid = empty('lid', loc=(0, 0, 0.27), parent=jar); joint(lid, 'lift')
    lathe('lid_shell', [(0.0, 0.0), (0.104, 0.0), (0.108, 0.012), (0.09, 0.03), (0.04, 0.045), (0.0, 0.045)], 'Plastic_Violet', parent=lid, verts=8)
    cap = lathe('filler_cap', [(0.0, 0.0), (0.035, 0.0), (0.035, 0.02), (0.02, 0.032), (0.0, 0.032)], 'Plastic_Violet', loc=(0, 0, 0.042), parent=lid, verts=6)
    joint(cap, 'lift', note='add ice and fruit while it runs')
    return R


@asset('grinder', 'Coffee grinder', 'Back bar', 'support',
       'studies/cafe/img/r2/backbar-machines_0.jpg (back bar proof)',
       real='on-demand flat-burr grinder, 64 mm burrs, 1.2 kg bean hopper, about 200 x 260 x 480 mm',
       moving='hopper lifts off; grind-size collar turns; portafilter fork holds a portafilter; dose button presses')
def grinder():
    """Pink enamel tower, chrome collar and chute, glass bean hopper full of beans, a fork for the portafilter."""
    R = empty('grinder')
    shell(box('base', (0.20, 0.26, 0.05), 'Metal_TealEnamel', loc=(0, 0, 0), parent=R, bevel=0.012, origin='bottom'), 0.0015, open=True)
    shell(box('body', (0.15, 0.19, 0.27), 'Metal_PinkEnamel', loc=(0, 0.02, 0.05), parent=R, bevel=0.02, origin='bottom'), 0.0012, open=True)
    tag(cyl('motor', 0.05, 0.12, 'Metal_Steel', loc=(0, 0.03, 0.08), parent=R, verts=10), mass_override_kg=3.5, what='550 W motor')
    c = cyl('grind_collar', 0.07, 0.04, 'Metal_Chrome', loc=(0, 0.02, 0.32), parent=R, verts=12)
    joint(c, 'knob', (0, 0, 1), 0, 6.0, 'grind size, fine to coarse'); shell(c, 0.002)
    cyl('burr_upper', 0.032, 0.008, 'Metal_Steel', loc=(0, 0.02, 0.33), parent=R, verts=10)
    cyl('burr_lower', 0.032, 0.008, 'Metal_Steel', loc=(0, 0.02, 0.32), parent=R, verts=10)
    hop = empty('hopper', loc=(0, 0.02, 0.36), parent=R); joint(hop, 'lift')
    lathe('hopper_glass', [(0.03, 0.0), (0.034, 0.0), (0.075, 0.13), (0.071, 0.13), (0.03, 0.004)], 'Glass_Clear', parent=hop, verts=10)
    tag(lathe('beans', [(0.0, 0.004), (0.032, 0.004), (0.066, 0.10), (0.0, 0.11)], 'Food_Beans', parent=hop, verts=10), holds='about 1 kg of beans')
    lathe('hopper_lid', [(0.0, 0.13), (0.078, 0.13), (0.07, 0.15), (0.02, 0.155), (0.0, 0.155)], 'Plastic_Pink', parent=hop, verts=10)
    tube('chute', [(0, -0.07, 0.25), (0, -0.10, 0.22), (0, -0.105, 0.19)], 0.012, 'Metal_Chrome', parent=R, verts=8)
    tube('fork', [(-0.04, -0.12, 0.13), (-0.04, -0.075, 0.13), (0.04, -0.075, 0.13), (0.04, -0.12, 0.13)], 0.005, 'Metal_Chrome', parent=R, verts=6)
    tube('fork_stem', [(0, -0.075, 0.13), (0, -0.06, 0.13)], 0.006, 'Metal_Chrome', parent=R, verts=6)
    b = cyl('dose_button', 0.012, 0.01, 'Plastic_Lime', loc=(0, -0.076, 0.27), rot=(math.pi / 2, 0, 0), parent=R, verts=8)
    joint(b, 'button', (0, 1, 0), 0, 0.004, 'grind one dose')
    box('catch_tray', (0.12, 0.08, 0.01), 'Metal_Steel', loc=(0, -0.08, 0.05), parent=R, origin='bottom')
    return R


@asset('urn', 'Hot water urn', 'Back bar', 'support', 'studies/cafe/img/r2/backbar-machines_0.jpg (back bar proof)',
       real='10 L stainless hot water urn with sight gauge and lever tap, about 300 x 340 x 520 mm',
       moving='lid lifts; tap lever pulls down')
def urn():
    """Chrome urn on three pink feet, a sight glass, a lever tap, side handles and a lid knob."""
    R = empty('urn')
    for i in range(3):
        a = math.pi / 2 + i * 2 * math.pi / 3
        cyl(f'foot_{i}', 0.022, 0.05, 'Plastic_Pink', loc=(0.11 * math.cos(a), 0.11 * math.sin(a), 0), parent=R, verts=6, r2=0.016)
    body = lathe('body', [(0.0, 0.05), (0.12, 0.05), (0.15, 0.08), (0.15, 0.44), (0.13, 0.47), (0.0, 0.47)], 'Metal_Chrome', parent=R, verts=12)
    tag(lathe('water', [(0.0, 0.055), (0.145, 0.055), (0.145, 0.30), (0.0, 0.30)], 'Water', parent=R, verts=12), holds='about 6 L')
    lid = empty('lid', loc=(0, 0, 0.47), parent=R); joint(lid, 'lift')
    lathe('lid_dome', [(0.0, 0.0), (0.132, 0.0), (0.11, 0.035), (0.04, 0.05), (0.0, 0.05)], 'Metal_Chrome', parent=lid, verts=12)
    lathe('lid_knob', [(0.0, 0.05), (0.02, 0.05), (0.028, 0.07), (0.0, 0.08)], 'Plastic_Pink', parent=lid, verts=8)
    for s in (-1, 1):
        tube(f'handle_{"lr"[s > 0]}', [(s * 0.15, 0, 0.40), (s * 0.19, 0, 0.40), (s * 0.19, 0, 0.34), (s * 0.15, 0, 0.34)], 0.008, 'Plastic_Black', parent=R, verts=6)
    tube('sight_glass', [(0.07, -0.142, 0.10), (0.07, -0.142, 0.42)], 0.009, 'Glass_Clear', parent=R, verts=6)
    tube('sight_water', [(0.07, -0.142, 0.10), (0.07, -0.142, 0.30)], 0.006, 'Water', parent=R, verts=6)
    tube('tap_body', [(0, -0.15, 0.11), (0, -0.20, 0.11), (0, -0.21, 0.08)], 0.014, 'Metal_Chrome', parent=R, verts=8)
    lev = empty('tap_lever', loc=(0, -0.20, 0.13), parent=R); joint(lev, 'hinge', (1, 0, 0), 0, 0.6, 'pull down to pour')
    tube('lever_arm', [(0, 0, 0), (0, -0.01, 0.06)], 0.007, 'Plastic_Pink', parent=lev, verts=6)
    return R


@asset('pastry_case', 'Pastry case', 'Back bar', 'support', 'docs/oracle/cafe/room-manifest.json back_bar.pastry_case',
       real='countertop glass display case, two glass shelves, rear sliding doors, about 700 x 420 x 380 mm',
       moving='two rear doors slide; every pastry lifts out')
def pastry_case():
    """A pink-based glass case with croissants, iced donuts, muffins and cookies on two shelves."""
    R = empty('pastry_case')
    W, D, H = 0.70, 0.42, 0.38
    box('base', (W, D, 0.05), 'Plastic_Pink', loc=(0, 0, 0), parent=R, bevel=0.01, origin='bottom')
    box('top_frame', (W, D, 0.02), 'Plastic_Pink', loc=(0, 0, H - 0.02), parent=R, bevel=0.006, origin='bottom')
    shell(box('glass_front', (W - 0.02, 0.006, H - 0.07), 'Glass_Clear', loc=(0, -D / 2 + 0.01, 0.05), rot=(0.12, 0, 0), parent=R, origin='bottom'), 0.006)
    for s in (-1, 1):
        shell(box(f'glass_side_{"lr"[s > 0]}', (0.006, D - 0.04, H - 0.07), 'Glass_Clear', loc=(s * (W / 2 - 0.01), 0.01, 0.05), parent=R, origin='bottom'), 0.006)
        d = shell(box(f'rear_door_{"lr"[s > 0]}', (W / 2 - 0.02, 0.006, H - 0.08), 'Glass_Clear', loc=(s * W / 4, D / 2 - 0.012 - (0.008 if s > 0 else 0), 0.055), parent=R, origin='bottom'), 0.006)
        joint(d, 'slide', (-s, 0, 0), 0, W / 2 - 0.05, 'staff side')
    for k, z in enumerate((0.05, 0.20)):
        shell(box(f'shelf_{k}', (W - 0.04, D - 0.06, 0.006), 'Glass_Clear', loc=(0, 0.01, z + (0.001 if k == 0 else 0)), parent=R, origin='bottom'), 0.006)
    i = 0
    for k, z in enumerate((0.057, 0.207)):
        for j in range(4):
            x = -0.25 + j * 0.165
            kind = (j + k * 2) % 4
            p = empty(f'pastry_{i}', loc=(x, 0.0, z), parent=R); joint(p, 'lift'); i += 1
            if kind == 0:   # croissant
                for c in range(3):
                    blob(f'croissant_{i}_{c}', (0.028 - abs(c - 1) * 0.006, 0.026 - abs(c - 1) * 0.006, 0.022), 'Food_Pastry', loc=((c - 1) * 0.03, abs(c - 1) * 0.012, 0.02), parent=p, subdiv=1, seed=c)
            elif kind == 1:  # iced donut
                torus(f'donut_{i}', 0.032, 0.018, 'Food_Pastry', loc=(0, 0, 0.018), parent=p, seg=10, verts=6)
                torus(f'icing_{i}', 0.032, 0.016, 'Food_Icing', loc=(0, 0, 0.026), parent=p, seg=10, verts=6)
            elif kind == 2:  # muffin
                lathe(f'muffin_case_{i}', [(0.0, 0.0), (0.028, 0.0), (0.036, 0.04), (0.0, 0.04)], 'Plastic_Lime', parent=p, verts=8)
                blob(f'muffin_top_{i}', (0.042, 0.042, 0.028), 'Food_Pastry', loc=(0, 0, 0.045), parent=p, subdiv=1, seed=i)
                blob(f'muffin_berry_{i}', (0.008, 0.008, 0.008), 'Food_Cherry', loc=(0.01, -0.01, 0.07), parent=p, subdiv=1)
            else:            # cookies
                for c in range(3):
                    cyl(f'cookie_{i}_{c}', 0.034, 0.01, 'Food_Pastry', loc=(0, 0, c * 0.011), rot=(0, 0, c), parent=p, verts=8)
                cyl(f'cookie_icing_{i}', 0.026, 0.003, 'Food_Sprinkles', loc=(0, 0, 0.033), parent=p, verts=8)
    return R


@asset('back_counter', 'Back counter', 'Back bar', 'hero', 'docs/oracle/cafe/room-manifest.json back_bar.back_counter',
       real='back-bar cabinet run: 18 mm lacquered plywood carcass on a kick plinth, 20 mm solid-surface top, stainless sink, 4.8 m x 0.65 m x 0.90 m',
       moving='six pink doors hinge open; the sink tap lever turns')
def back_counter():
    """The staff counter along the right wall that holds every machine. Long axis along Y; the staff side (doors) faces -X."""
    R = empty('back_counter')
    L, D, H = 3.6, 0.65, 0.90   # was 4.8 m; shortened with the bar (Evan 08:51Z "counter is too big")
    shell(box('carcass', (D - 0.04, L, H - 0.12), 'Plank_Counter', loc=(0.02, 0, 0.10), parent=R, bevel=0.01, origin='bottom'), 0.018, open=True)
    shell(box('kick_plinth', (D - 0.10, L - 0.02, 0.10), 'Metal_Dark', loc=(0.05, 0, 0), parent=R, origin='bottom'), 0.0015, open=True)
    top = box('worktop', (D, L + 0.02, 0.02), 'Stone_MintTop', loc=(0, 0, H - 0.02), parent=R, bevel=0.006, origin='bottom')
    box('upstand', (0.02, L + 0.02, 0.10), 'Stone_MintTop', loc=(D / 2 - 0.01, 0, H), parent=R, origin='bottom')
    n = 6
    for i in range(n):
        y = -L / 2 + (i + 0.5) * L / n
        d = empty(f'door_{i}', loc=(-D / 2 + 0.01, y - L / n / 2 + 0.01, 0.12), parent=R)
        shell(box(f'door_{i}_panel', (0.018, L / n - 0.02, H - 0.17), 'Plank_PinkPanel', loc=(0, (L / n - 0.02) / 2, 0), parent=d, bevel=0.004, origin='bottom'), 0.018)
        box(f'door_{i}_groove', (0.004, L / n - 0.14, 0.012), 'Plank_TealFront', loc=(-0.01, (L / n - 0.02) / 2, H - 0.30), parent=d, origin='bottom')
        tube(f'door_{i}_pull', [(-0.03, 0.05, 0.50), (-0.03, 0.05, 0.38)], 0.006, 'Metal_Brass', parent=d, verts=6)
        tube(f'door_{i}_pull_a', [(-0.009, 0.05, 0.50), (-0.03, 0.05, 0.50)], 0.005, 'Metal_Brass', parent=d, verts=6)
        tube(f'door_{i}_pull_b', [(-0.009, 0.05, 0.38), (-0.03, 0.05, 0.38)], 0.005, 'Metal_Brass', parent=d, verts=6)
        joint(d, 'hinge', (0, 0, 1), 0, 1.75, 'cupboard')
    # stainless sink with a lever tap, at the far end
    sy = L / 2 - 0.45
    shell(box('sink_bowl', (0.40, 0.45, 0.16), 'Metal_Steel', loc=(-0.02, sy, H - 0.17), parent=R, origin='bottom'), 0.0009, open=True)
    tube('tap_neck', [(0.20, sy, H), (0.20, sy, H + 0.28), (0.06, sy, H + 0.30), (0.02, sy, H + 0.24)], 0.012, 'Metal_Chrome', parent=R, verts=8)
    lv = empty('tap_lever', loc=(0.20, sy + 0.05, H + 0.06), parent=R); joint(lv, 'hinge', (0, 1, 0), -0.8, 0.8, 'hot and cold')
    tube('tap_lever_arm', [(0, 0, 0), (-0.08, 0, 0.03)], 0.007, 'Metal_Chrome', parent=lv, verts=6)
    return R


@asset('cup_shelves', 'Cup shelves', 'Back bar', 'support', 'docs/oracle/cafe/room-manifest.json back_bar.cup_shelves',
       real='three 30 mm oak shelves on powder-coated brackets, 1.6 m long, with cups and glass jars',
       moving='every cup and jar lifts off')
def cup_shelves():
    """Floating shelves over the back counter: stacks of teal, lime and orange cups and jars of straws and sweets.
    Long axis along Y; the wall is at +X (the shelves hang on the right wall)."""
    R = empty('cup_shelves')
    L = 1.6
    cols = ['Clay_CupTeal', 'Clay_CupLime', 'Clay_CupOrange', 'Clay_PinkGlaze']
    k = 0
    for s, z in enumerate((0.0, 0.38, 0.76)):
        box(f'shelf_{s}', (0.24, L, 0.03), 'Timber_Trim', loc=(0, 0, z), parent=R, bevel=0.004, origin='bottom')
        for b in (-1, 1):
            prism(f'bracket_{s}_{"lr"[b > 0]}', [(0.12, 0), (-0.08, 0), (0.12, -0.16)], 0.012, 'Metal_Dark', loc=(0, b * (L / 2 - 0.15), z), rot=(math.pi / 2, 0, 0), parent=R, z0=-0.006)
        for j in range(5):
            y = -L / 2 + 0.18 + j * 0.31
            g = empty(f'item_{k}', loc=(-0.02, y, z + 0.03), parent=R); joint(g, 'lift'); k += 1
            if (j + s) % 3 == 2:
                lathe(f'jar_{k}', [(0.0, 0.0), (0.055, 0.0), (0.06, 0.16), (0.045, 0.19), (0.045, 0.21), (0.0, 0.21)], 'Glass_Clear', parent=g, verts=8)
                lathe(f'jar_fill_{k}', [(0.0, 0.004), (0.052, 0.004), (0.056, 0.12), (0.0, 0.13)], ['Food_Sprinkles', 'Food_Cherry', 'Plastic_Yellow'][s], parent=g, verts=8)
                cyl(f'jar_lid_{k}', 0.05, 0.025, 'Plastic_Pink', loc=(0, 0, 0.205), parent=g, verts=8)
            else:
                for c in range(3):
                    m = cols[(j + c + s) % 4]
                    lathe(f'cup_{k}_{c}', [(0.0, 0.0), (0.03, 0.0), (0.045, 0.075), (0.04, 0.075), (0.026, 0.006), (0.0, 0.006)], m, loc=(0, 0, c * 0.03), parent=g, verts=8)
    return R


@asset('menu_board', 'Menu board', 'Back bar', 'support', 'docs/oracle/cafe/room-manifest.json back_bar.menu_board',
       real='8 mm slate chalkboard in a 40 mm painted timber frame, 1.4 x 0.9 m, hung on two chains',
       moving='none (it swings a little on its chains if bumped)')
def menu_board():
    """The menu as pictures, no words (Evan's rule): a coffee cup, a smoothie, a donut, a cookie, a star for the
    party, with chalk dots for price. Hangs on the wall at +Y facing -Y."""
    R = empty('menu_board')
    W, H = 1.4, 0.9
    shell(box('slate', (W - 0.06, 0.012, H - 0.06), 'Stone_Slate', loc=(0, 0, 0), parent=R, origin='bottom'), 0.008, open=True)
    for nm, sz, loc in [('frame_top', (W, 0.04, 0.04), (0, 0, H - 0.07)), ('frame_bottom', (W, 0.04, 0.04), (0, 0, -0.01)),
                        ('frame_left', (0.04, 0.04, H), (-W / 2 + 0.02, 0, -0.01)), ('frame_right', (0.04, 0.04, H), (W / 2 - 0.02, 0, -0.01))]:
        box(nm, sz, 'Plaster_Tangerine', loc=loc, parent=R, bevel=0.006, origin='bottom')
    for s in (-1, 1):
        tube(f'chain_{"lr"[s > 0]}', [(s * 0.5, 0, H - 0.03), (s * 0.3, 0, H + 0.25)], 0.004, 'Metal_Brass', parent=R, verts=6)
    ch = empty('chalk_pictures', loc=(0, -0.008, 0), parent=R)
    cw = 'Metal_Chalk'
    def ring(nm, cx, cz, r, n=12, seg=None):
        tube(nm, [(cx + r * math.cos(2 * math.pi * i / n), 0, cz + r * math.sin(2 * math.pi * i / n)) for i in range(n)], 0.004, cw, parent=ch, closed=True, verts=4)
    # cup
    tube('cup', [(-0.52, 0, 0.62), (-0.49, 0, 0.47), (-0.37, 0, 0.47), (-0.34, 0, 0.62), (-0.52, 0, 0.62)], 0.005, cw, parent=ch, verts=4)
    tube('cup_handle', [(-0.345, 0, 0.6), (-0.30, 0, 0.58), (-0.31, 0, 0.52), (-0.355, 0, 0.51)], 0.005, cw, parent=ch, verts=4)
    for i in range(3):
        tube(f'steam_{i}', [(-0.47 + i * 0.04, 0, 0.66), (-0.48 + i * 0.04, 0, 0.70), (-0.46 + i * 0.04, 0, 0.74)], 0.004, 'Plaster_Pink', parent=ch, verts=4)
    # smoothie glass with straw
    tube('glass', [(-0.18, 0, 0.66), (-0.15, 0, 0.47), (-0.07, 0, 0.47), (-0.04, 0, 0.66)], 0.005, cw, parent=ch, verts=4)
    tube('straw', [(-0.09, 0, 0.55), (-0.06, 0, 0.74), (-0.02, 0, 0.76)], 0.005, 'Plaster_Pink', parent=ch, verts=4)
    # donut
    ring('donut', 0.15, 0.56, 0.08); ring('donut_hole', 0.15, 0.56, 0.025, 8)
    # cookie
    ring('cookie', 0.42, 0.56, 0.075)
    for i in range(4):
        cyl(f'chip_{i}', 0.008, 0.004, cw, loc=(0.40 + (i % 2) * 0.04, 0, 0.54 + (i // 2) * 0.04), rot=(math.pi / 2, 0, 0), parent=ch, verts=5)
    # price dots under each (one to three dots, no numbers)
    for x, n in [(-0.43, 2), (-0.11, 3), (0.15, 1), (0.42, 1)]:
        for k in range(n):
            cyl(f'dot_{x}_{k}', 0.012, 0.004, 'Plaster_Sun', loc=(x + (k - (n - 1) / 2) * 0.035, 0, 0.36), rot=(math.pi / 2, 0, 0), parent=ch, verts=6)
    star('party_star', 0.09, 0.006, 'Plaster_Sun', loc=(0, 0, 0.17), parent=ch)
    tube('underline', [(-0.5, 0, 0.27), (0.5, 0, 0.27)], 0.004, 'Plaster_Pink', parent=ch, verts=4)
    return R


@asset('back_stars', 'Back-bar neon stars', 'Back bar', 'support', 'studies/cafe/img/r2/backbar-front_0.jpg',
       real='LED neon flex bent into stars on clear 5 mm acrylic backers, wall-mounted on stand-offs',
       moving='none; the game pulses them with the party signal')
def back_stars():
    """One big pink star and two cyan stars for the wall behind the machines. Facing -Y, wall at +Y."""
    R = empty('back_stars')
    for nm, x, z, r, m in [('star_pink', 0.0, 0.55, 0.42, 'Glass_NeonPink'), ('star_cyan_l', -0.75, 0.25, 0.22, 'Glass_NeonCyan'), ('star_cyan_r', 0.78, 0.75, 0.18, 'Glass_NeonCyan')]:
        g = empty(nm, loc=(x, 0, z), parent=R)
        pts = star_pts(r, r * 0.45)
        tube(nm + '_tube', [(px, -0.03, pz) for px, pz in pts], 0.011, m, parent=g, closed=True, verts=6)
        prism(nm + '_backer', [(px * 1.12, pz * 1.12) for px, pz in pts], 0.005, 'Glass_Clear', rot=(math.pi / 2, 0, 0), parent=g, z0=-0.005)
        for k in range(0, 10, 2):
            tube(f'{nm}_standoff_{k}', [(pts[k][0] * 0.8, 0.0, pts[k][1] * 0.8), (pts[k][0] * 0.8, 0.02, pts[k][1] * 0.8)], 0.004, 'Metal_Chrome', parent=g, verts=6)
    return R


@asset('crt_terminal', "Grace's computer", 'Back bar', 'hero', 'docs/oracle/cafe/CAFE_STUDY.md section 9, "The old computer"',
       real='a 1986 beige personal computer: system unit with two 5.25-inch floppy drives, 12-inch green-phosphor monitor, 84-key keyboard on a coiled cable',
       moving='floppy drive levers turn; power switch flips; brightness and contrast knobs turn; every key presses; the screen is the render target for the DOS shell')
def crt_terminal():
    """Aunt Grace's 1986 computer, a quiet nod (Evan was six, playing in her basement). The screen is a named part
    (`crt_screen`) that the game paints with the C:\\GRACE> shell from simulations/grace-dos.mjs."""
    R = empty('crt_terminal')
    # system unit
    su = empty('system_unit', parent=R)
    shell(box('case', (0.50, 0.40, 0.14), 'Plastic_Beige', loc=(0, 0.06, 0), parent=su, bevel=0.006, origin='bottom'), 0.0012, open=True)
    tag(box('chassis', (0.48, 0.38, 0.12), 'Metal_Steel', loc=(0, 0.06, 0.008), parent=su, origin='bottom'), mass_override_kg=6.5, what='steel chassis, PSU, motherboard, cards')
    box('front_bezel', (0.50, 0.012, 0.14), 'Plastic_Beige', loc=(0, -0.146, 0), parent=su, bevel=0.003, origin='bottom')
    for i, x in enumerate((0.07, 0.19)):
        box(f'drive_{i}_face', (0.15, 0.006, 0.045), 'Plastic_BeigeKey', loc=(x - 0.04, -0.154, 0.07 - i * 0.0), parent=su, origin='bottom') if False else None
    for i, z in enumerate((0.075, 0.02)):
        box(f'floppy_{i}_face', (0.16, 0.006, 0.045), 'Plastic_BeigeKey', loc=(0.12, -0.155, z), parent=su, bevel=0.002, origin='bottom')
        box(f'floppy_{i}_slot', (0.13, 0.004, 0.004), 'Plastic_Black', loc=(0.12, -0.158, z + 0.028), parent=su, origin='bottom')
        lv = box(f'floppy_{i}_lever', (0.012, 0.01, 0.03), 'Plastic_Black', loc=(0.195, -0.16, z + 0.008), parent=su, origin='bottom')
        joint(lv, 'knob', (0, 1, 0), 0, 1.5708, 'turn to close the drive door')
        cyl(f'floppy_{i}_lamp', 0.003, 0.003, 'Glass_NeonCyan' if i else 'Light_Bulb', loc=(0.06, -0.159, z + 0.01), rot=(math.pi / 2, 0, 0), parent=su, verts=6)
    box('badge', (0.06, 0.003, 0.012), 'Metal_Aluminium', loc=(-0.17, -0.154, 0.11), parent=su, origin='bottom')
    tag(box('badge_text', (0.05, 0.002, 0.006), 'Plastic_Pink', loc=(-0.17, -0.156, 0.113), parent=su, origin='bottom'), note='a small G for Grace')
    sw = box('power_switch', (0.02, 0.03, 0.03), 'Plastic_Red', loc=(0.255, 0.18, 0.05), parent=su, origin='bottom')
    joint(sw, 'hinge', (0, 1, 0), 0, 0.3, 'the big red switch on the side')
    for k in range(6):
        box(f'vent_{k}', (0.12, 0.004, 0.006), 'Plastic_Black', loc=(-0.15, -0.157, 0.02 + k * 0.012), parent=su, origin='bottom')
    # monitor on top
    mon = empty('monitor', loc=(0, 0.06, 0.14), parent=R)
    shell(box('monitor_front', (0.34, 0.08, 0.30), 'Plastic_Beige', loc=(0, -0.13, 0.02), parent=mon, bevel=0.012, origin='bottom'), 0.0025, open=True)
    shell(prism('monitor_bell', [(-0.15, -0.09), (0.15, -0.09), (0.11, 0.20), (-0.11, 0.20)], 0.24, 'Plastic_Beige', loc=(0, 0, 0.05), parent=mon), 0.0025, open=True)
    box('monitor_foot', (0.22, 0.20, 0.02), 'Plastic_Beige', loc=(0, 0.0, 0.0), parent=mon, bevel=0.005, origin='bottom')
    tag(lathe('crt_tube', [(0.0, 0.0), (0.12, 0.0), (0.05, 0.22), (0.02, 0.27), (0.0, 0.27)], 'Glass_Clear', loc=(0, -0.13, 0.17), rot=(-math.pi / 2, 0, 0), parent=mon, verts=8),
        mass_override_kg=4.0, what='12-inch monochrome CRT (most of the monitor weight is this glass)')
    box('screen_surround', (0.27, 0.012, 0.21), 'Plastic_Black', loc=(0, -0.172, 0.065), parent=mon, origin='bottom')
    scr = box('crt_screen', (0.24, 0.008, 0.18), 'Glass_Crt', loc=(0, -0.178, 0.08), parent=mon, bevel=0.012, origin='bottom')
    tag(scr, screen='DOS shell render target, 80x25 text at 640x350, green phosphor', game='simulations/grace-dos.mjs')
    for i, x in enumerate((0.10, 0.135)):
        k = cyl(f'knob_{["brightness", "contrast"][i]}', 0.009, 0.012, 'Plastic_BeigeKey', loc=(x, -0.172, 0.04), rot=(math.pi / 2, 0, 0), parent=mon, verts=8)
        joint(k, 'knob', (0, 0, 1), 0, 4.5)
    cyl('monitor_lamp', 0.003, 0.003, 'Light_Bulb', loc=(0.07, -0.172, 0.04), rot=(math.pi / 2, 0, 0), parent=mon, verts=6)
    # keyboard in front, with 84 keys
    kb = empty('keyboard', loc=(0, -0.33, 0), parent=R)
    prism('keyboard_case', [(-0.24, -0.10), (0.24, -0.10), (0.24, 0.10), (-0.24, 0.10)], 0.03, 'Plastic_Beige', rot=(0.06, 0, 0), parent=kb)
    rows = [(['GreyKey'] + ['BeigeKey'] * 12 + ['GreyKey'], 1.0), (['GreyKey'] * 1 + ['BeigeKey'] * 12 + ['GreyKey'], 1.0),
            (['GreyKey'] + ['BeigeKey'] * 11 + ['GreyKey'], 1.0), (['GreyKey'] + ['BeigeKey'] * 10 + ['GreyKey'], 1.0), (['BeigeKey'], 9.0)]
    u = 0.019
    n = 0
    for r, (keys, wide) in enumerate(rows):
        y = 0.06 - r * u
        if r == 4:
            k = box('key_space', (u * 8.5, u * 0.85, 0.012), 'Plastic_BeigeKey', loc=(-0.02, y, 0.03 + (0.06 * (y + 0.1)) - 0.006), parent=kb, bevel=0.002, origin='bottom')
            joint(k, 'button', (0, 0, -1), 0, 0.004, 'space'); n += 1
            continue
        x = -0.21 + r * 0.006
        for c, m in enumerate(keys):
            w = u * (1.5 if m == 'GreyKey' and c else 1.0)
            k = box(f'key_{r}_{c}', (w * 0.86, u * 0.86, 0.011), 'Plastic_' + m, loc=(x + w / 2, y, 0.03 + 0.06 * (y + 0.1) - 0.006), parent=kb, bevel=0.002, origin='bottom')
            joint(k, 'button', (0, 0, -1), 0, 0.004); n += 1
            x += w
        for c in range(3):  # numeric pad block
            k = box(f'key_{r}_pad{c}', (u * 0.86, u * 0.86, 0.011), 'Plastic_BeigeKey', loc=(0.17 + c * u, y, 0.03 + 0.06 * (y + 0.1) - 0.006), parent=kb, bevel=0.002, origin='bottom')
            joint(k, 'button', (0, 0, -1), 0, 0.004); n += 1
    for c in range(10):  # function keys in two columns on the left, as on 84-key boards
        k = box(f'key_f{c + 1}', (u * 0.86, u * 0.86, 0.011), 'Plastic_GreyKey', loc=(-0.235 + (c % 2) * u, 0.06 - (c // 2) * u, 0.03 + 0.06 * (0.06 - (c // 2) * u + 0.1) - 0.006), parent=kb, bevel=0.002, origin='bottom')
        joint(k, 'button', (0, 0, -1), 0, 0.004, f'F{c + 1}'); n += 1
    tag(kb, keys=n)
    # coiled cable from keyboard to the unit
    coil = [(0.20 + 0.012 * math.cos(t * 0.9), -0.24 + t * 0.0045, 0.03 + 0.012 * math.sin(t * 0.9)) for t in range(0, 22)]
    tube('keyboard_cable', coil, 0.003, 'Plastic_Beige', parent=R, verts=4)
    return R


@asset('tutor_manual', 'Typing tutor manual', 'Back bar', 'support', 'docs/oracle/cafe/CAFE_STUDY.md section 9 (a readable manual beside the computer)',
       real='A5 spiral-bound manual, 120 pages of 80 gsm paper in laminated card covers, 22 wire loops',
       moving='the cover hinges open; pages turn (the game swaps page pictures)')
def tutor_manual():
    """Our own typing tutor's manual (style yes, expression never), yellow cover with a pink star, a wire spiral."""
    R = empty('tutor_manual')
    W, Dp = 0.15, 0.21
    box('back_cover', (W, Dp, 0.0012), 'Paper_Cover', loc=(0, 0, 0), parent=R, origin='bottom')
    tag(box('pages', (W - 0.006, Dp - 0.008, 0.012), 'Paper_Pages', loc=(0.002, 0, 0.0012), parent=R, origin='bottom'), pages=120, readable='yes: the game shows page pictures when opened')
    cov = empty('front_cover', loc=(-W / 2, 0, 0.0135), parent=R); joint(cov, 'hinge', (0, 1, 0), 0, 3.1, 'opens like a book')
    box('front_cover_card', (W, Dp, 0.0012), 'Paper_Cover', loc=(W / 2, 0, 0), parent=cov, origin='bottom')
    star('cover_star', 0.035, 0.0006, 'Plaster_Pink', loc=(W / 2 + 0.01, 0.02, 0.0015), rot=(0, 0, 0), parent=cov)
    for i in range(4):
        box(f'cover_key_{i}', (0.016, 0.016, 0.0006), 'Plastic_BeigeKey', loc=(W / 2 - 0.03 + i * 0.02, -0.05, 0.0012), parent=cov, origin='bottom')
    for i in range(22):
        y = -Dp / 2 + 0.008 + i * (Dp - 0.016) / 21
        torus(f'spiral_{i}', 0.008, 0.0009, 'Metal_Chrome', loc=(-W / 2, y, 0.007), rot=(math.pi / 2, 0, 0), parent=R, seg=8, verts=4)
    return R


@asset('cash_register', 'Cash register', 'Back bar', 'hero', 'studies/cafe/img/interior-party_0.jpg (Evan\'s locked pick); Evan 2026-10-23 08:52Z "there\'s a key in the cash register"',
       real='1950s-style mechanical cash register: pressed-steel case in pink enamel over a cast base, brass trim, '
            'three rows of plunger keys, pop-up price flags behind glass, side crank, spring cash drawer with a wooden coin tray',
       moving='keys press, the crank turns, the drawer springs open; the brass key in the coin tray can be picked up')
def cash_register():
    """The till at the end of the back counter. Its drawer hides the brass basement key: Abbie finds it, her inner voice says
    "Interesting... this key will come in handy.", it goes in her inventory, and it opens basement_door (a secret unlock)."""
    R = empty('cash_register')
    W, D = 0.36, 0.42
    shell(box('base', (W, D, 0.10), 'Metal_PlumEnamel', parent=R, bevel=0.008, origin='bottom'), 0.0015, open=True)
    # cash drawer slides out towards the staff (-Y), with a coin tray and the key inside
    dr = empty('drawer', loc=(0, 0, 0.012), parent=R); joint(dr, 'slide', (0, -1, 0), 0, 0.30, 'springs open when NO SALE is pressed')
    shell(box('drawer_box', (W - 0.03, D - 0.03, 0.075), 'Metal_Dark', loc=(0, 0.0, 0), parent=dr, origin='bottom'), 0.001, open=True)
    box('drawer_front', (W - 0.026, 0.012, 0.08), 'Metal_PinkEnamel', loc=(0, -D / 2 - 0.007, 0.004), parent=dr, bevel=0.004, origin='bottom')
    blob('drawer_pull', (0.03, 0.012, 0.012), 'Metal_Brass', loc=(0, -D / 2 - 0.016, 0.045), parent=dr, subdiv=1)
    shell(box('coin_tray', (W - 0.06, 0.16, 0.03), 'Plank_Honey', loc=(0, -0.08, 0.004), parent=dr, origin='bottom'), 0.006, open=True)
    for i in range(4):
        box(f'coin_divider_{i}', (0.006, 0.15, 0.028), 'Plank_Honey', loc=(-0.12 + i * 0.08, -0.08, 0.004), parent=dr, origin='bottom')
    k = empty('basement_key', loc=(0.06, -0.08, 0.04), rot=(0, 0, math.radians(20)), parent=dr)
    tag(k, pickup='cafe-basement-key', item_name='Brass key', opens='basement_door', thought='Interesting... this key will come in handy.')
    torus('key_bow', 0.016, 0.004, 'Metal_Brass', loc=(-0.045, 0, 0), parent=k, seg=10, verts=6)
    cyl('key_shaft', 0.0035, 0.07, 'Metal_Brass', loc=(-0.03, 0, 0), rot=(0, math.pi / 2, 0), parent=k, verts=6)
    box('key_bit', (0.012, 0.004, 0.014), 'Metal_Brass', loc=(0.032, 0, -0.008), parent=k, origin='bottom')
    box('key_bit_2', (0.006, 0.004, 0.008), 'Metal_Brass', loc=(0.020, 0, -0.006), parent=k, origin='bottom')
    # the body: sloped key bed at the front, tower with price flags at the back
    prof = [(-D / 2, 0.10), (D / 2, 0.10), (D / 2, 0.24), (0.02, 0.24), (-D / 2 + 0.02, 0.15)]
    shell(prism('body', prof, W - 0.01, 'Metal_PinkEnamel', loc=(-(W - 0.01) / 2, 0, 0), rot=(math.pi / 2, 0, math.pi / 2), parent=R, bevel=0.006), 0.0012, open=True)
    tower = box('flag_tower', (W - 0.04, 0.14, 0.13), 'Metal_PinkEnamel', loc=(0, D / 2 - 0.08, 0.24), parent=R, bevel=0.01, origin='bottom')
    shell(tower, 0.0012, open=True)
    box('flag_window', (W - 0.10, 0.006, 0.06), 'Glass_Window', loc=(0, D / 2 - 0.152, 0.285), parent=R, origin='bottom')
    for i in range(4):
        f = box(f'price_flag_{i}', (0.05, 0.004, 0.04), ['Plastic_Pink', 'Plastic_Teal', 'Plastic_Lime', 'Plastic_Orange'][i],
                loc=(-0.09 + i * 0.06, D / 2 - 0.145, 0.29), parent=R, origin='bottom')
        joint(f, 'lift', (0, 0, 1), 0, 0.03, 'pops up when its key is pressed')
    box('crest', (0.12, 0.01, 0.04), 'Metal_Brass', loc=(0, D / 2 - 0.15, 0.37), parent=R, bevel=0.004, origin='bottom')
    star('crest_star', 0.018, 0.006, 'Plaster_Sun', loc=(0, D / 2 - 0.157, 0.39), rot=(math.pi / 2, 0, 0), parent=R)
    # three rows of five plunger keys on the slope, plus a big NO SALE bar
    sl = math.atan2(0.09, D / 2 - 0.02 + 0.02)
    for r in range(3):
        for c in range(5):
            y = -D / 2 + 0.06 + r * 0.06; z = 0.15 + (y + D / 2 - 0.02) * math.tan(sl) + 0.004
            kb = empty(f'key_{r}_{c}', loc=(-0.12 + c * 0.06, y, z), rot=(-sl, 0, 0), parent=R); joint(kb, 'button', (0, 0, -1), 0, 0.012)
            cyl(f'key_{r}_{c}_stem', 0.004, 0.018, 'Metal_Chrome', parent=kb, verts=6)
            cyl(f'key_{r}_{c}_cap', 0.02, 0.014, 'Plastic_BeigeKey' if r else 'Plastic_Teal', loc=(0, 0, 0.018), parent=kb, verts=8)
    nb = empty('no_sale_bar', loc=(0, -D / 2 + 0.03, 0.125), parent=R); joint(nb, 'button', (0, 0, -1), 0, 0.01, 'opens the drawer')
    box('no_sale_cap', (0.26, 0.03, 0.016), 'Plastic_Orange', parent=nb, bevel=0.004, origin='bottom')
    # side crank (staff side is -Y; crank on the +X side)
    cr = empty('crank', loc=(W / 2 + 0.01, 0.05, 0.17), parent=R); joint(cr, 'knob', (1, 0, 0), 0, 6.283, 'turn to ring up')
    cyl('crank_hub', 0.025, 0.02, 'Metal_Brass', rot=(0, math.pi / 2, 0), parent=cr, verts=10)
    box('crank_arm', (0.012, 0.012, 0.10), 'Metal_Brass', loc=(0.018, 0, 0), parent=cr, origin='bottom')
    blob('crank_handle', (0.014, 0.014, 0.024), 'Plastic_Black', loc=(0.03, 0, 0.10), parent=cr, subdiv=1)
    for s in (-1, 1):
        for t in (-1, 1):
            cyl(f'foot_{s}_{t}', 0.016, 0.008, 'Rubber_Black', loc=(s * (W / 2 - 0.03), t * (D / 2 - 0.03), -0.008), parent=R, verts=8)
    return R


@asset('pin_board', 'Pin board', 'Back bar', 'support',
       'Context pass 2026-10-23: Unpacking (Witch Beam, GDC 2022) "No item? No trait!"; MAGES set-dressing guide (focal points, varied density)',
       real='cork pin board in a honey-oak frame, about 900 x 600 mm, with photo strips, a crayon drawing, a postcard and a lost mitten held by push pins',
       moving='the pinned things lift off their pins; the mitten swings')
def pin_board():
    """The café's life story, told by what is pinned up (no words): two photo-booth strips say friends come here and love
    the booth, a crayon drawing says little kids do too, a moon postcard says somebody dreams of space, and a lost lime mitten
    says someone left in a hurry. Hangs on the wall behind the machines, front at -Y like the menu board."""
    R = empty('pin_board')
    W, H = 0.9, 0.6
    box('cork', (W - 0.05, 0.016, H - 0.05), 'Cork_Board', loc=(0, 0, 0.025), parent=R, origin='bottom')
    for nm, sz, loc in [('frame_top', (W, 0.03, 0.025), (0, 0, H - 0.025)), ('frame_bottom', (W, 0.03, 0.025), (0, 0, 0)),
                        ('frame_left', (0.025, 0.03, H), (-W / 2 + 0.0125, 0, 0)), ('frame_right', (0.025, 0.03, H), (W / 2 - 0.0125, 0, 0))]:
        box(nm, sz, 'Plank_Honey', loc=loc, parent=R, bevel=0.004, origin='bottom')
    F = -0.009   # the cork's face
    def pin(nm, x, z, m='Plastic_Pink'):
        cyl(nm, 0.008, 0.008, m, loc=(x, F - 0.003, z), rot=(math.pi / 2, 0, 0), parent=R, verts=6)
    def pinned(nm, x, z, tilt):
        it = empty(nm, loc=(x, F, z), rot=(0, math.radians(tilt), 0), parent=R); joint(it, 'lift', (0, -1, 0), 0, 0.2, 'comes off its pin')
        return it
    # two photo strips from the booth: four squares of friends each (colour blocks for faces, no real photos)
    for s, (x, tilt, cols) in enumerate([(-0.32, -4, ['Plaster_Pink', 'Plaster_Teal', 'Plaster_Sun', 'Plaster_Purple']),
                                         (-0.22, 6, ['Plaster_Teal', 'Plaster_Tangerine', 'Plaster_Pink', 'Plaster_Sun'])]):
        st = pinned(f'photo_strip_{s}', x, 0.10, tilt)
        box(f'photo_strip_{s}_paper', (0.07, 0.002, 0.26), 'Paper_Photo', parent=st, origin='bottom')
        for i, c in enumerate(cols):
            box(f'photo_strip_{s}_frame_{i}', (0.058, 0.002, 0.055), c, loc=(0, -0.0015, 0.012 + i * 0.062), parent=st, origin='bottom')
            blob(f'photo_strip_{s}_friend_{i}', (0.012, 0.003, 0.014), 'Plaster_Cream', loc=(0.008 * (-1) ** i, -0.003, 0.034 + i * 0.062), parent=st, subdiv=1)
        pin(f'photo_strip_{s}_pin', x, 0.345)
    # a crayon drawing: the pink cup and a big star (a little customer's present)
    dr = pinned('crayon_drawing', 0.0, 0.24, 3)
    box('drawing_paper', (0.21, 0.002, 0.28), 'Paper_Pages', parent=dr, origin='bottom')
    prism('drawn_cup', [(-0.05, 0.05), (0.05, 0.05), (0.06, 0.15), (-0.06, 0.15)], 0.002, 'Plaster_Pink', loc=(0, -0.0015, 0), rot=(math.pi / 2, 0, 0), parent=dr)
    star('drawn_star', 0.045, 0.002, 'Plaster_Sun', loc=(0.02, -0.003, 0.215), parent=dr)
    for i in range(3):
        tube(f'drawn_steam_{i}', [(-0.03 + i * 0.03, -0.003, 0.16), (-0.035 + i * 0.03, -0.003, 0.18)], 0.0025, 'Plaster_Teal', parent=dr, verts=4)
    pin('crayon_drawing_pin', 0.0, 0.51, 'Plastic_Teal')
    # a postcard of the moon
    pc = pinned('moon_postcard', 0.24, 0.33, -5)
    box('postcard', (0.15, 0.002, 0.10), 'Plank_BlackPly', parent=pc, origin='bottom')
    cyl('postcard_moon', 0.032, 0.002, 'Plaster_Cream', loc=(-0.03, -0.0015, 0.05), rot=(math.pi / 2, 0, 0), parent=pc, verts=10)
    for i, (x, z) in enumerate([(0.03, 0.075), (0.05, 0.03), (0.015, 0.02)]):
        star(f'postcard_star_{i}', 0.008, 0.002, 'Plaster_Sun', loc=(x, -0.0015, z), parent=pc)
    pin('moon_postcard_pin', 0.24, 0.425, 'Plastic_Lime')
    # a lost mitten, hung by its cuff from one pin
    mt = empty('lost_mitten', loc=(0.27, F - 0.012, 0.25), parent=R); joint(mt, 'hinge', (0, 1, 0), -0.4, 0.4, 'swings on its pin')
    blob('mitten_hand', (0.04, 0.014, 0.055), 'Cloth_Lime', loc=(0, 0, -0.08), parent=mt, subdiv=1)
    blob('mitten_thumb', (0.014, 0.012, 0.025), 'Cloth_Lime', loc=(0.042, 0, -0.07), rot=(0, math.radians(-30), 0), parent=mt, subdiv=1)
    cyl('mitten_cuff', 0.036, 0.03, 'Cloth_Plush', loc=(0, 0, -0.035), parent=mt, verts=8)
    pin('lost_mitten_pin', 0.27, 0.25, 'Plastic_Orange')
    return R


@asset('tip_jar', 'Tip jar', 'Bar', 'support',
       'Context pass 2026-10-23: Unpacking "everything is an opportunity to tell a story"; the till side of the bar needed a small human thing',
       real='500 ml glass jam jar with a pink ribbon, a few copper coins inside (copper, so gold coins stay special)',
       moving='coins rattle and can be tipped out')
def tip_jar():
    """A jam jar on the bar by the till, a pink ribbon round its neck and a few copper coins in the bottom."""
    R = empty('tip_jar')
    shell(lathe('jar', [(0.0, 0.0), (0.038, 0.0), (0.042, 0.01), (0.042, 0.085), (0.034, 0.10), (0.034, 0.115)], 'Glass_Clear', parent=R, verts=12), 0.003, open=True)
    torus('ribbon', 0.0365, 0.004, 'Cloth_Magenta', loc=(0, 0, 0.098), parent=R, seg=12, verts=4)
    blob('ribbon_bow', (0.014, 0.006, 0.01), 'Cloth_Magenta', loc=(0, -0.038, 0.1), parent=R, subdiv=1)
    for i, (x, y, z, a) in enumerate([(0.0, 0.0, 0.004, 0), (0.012, 0.008, 0.007, 20), (-0.014, 0.004, 0.006, -15), (0.006, -0.014, 0.009, 35), (-0.004, 0.012, 0.011, 60)]):
        cyl(f'coin_{i}', 0.011, 0.002, 'Metal_Copper', loc=(x, y, z), rot=(math.radians(a * 0.3), math.radians(a * 0.2), 0), parent=R, verts=10)
    return R
