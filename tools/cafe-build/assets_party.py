"""The party: DJ cup, sound, lights, stars, wall dressing and the soft seats (AW-STUDY-0013 manifest `items`).

Free-standing props are built at their own origin (they move, and the layout in assemble.py places them).
Wall-mounted decor is built in room coordinates, like the room shell.
"""
import math, random
from kit import *
from assets_room import X, Y, HC, DECK_X, ARCH, WIN_R

REF = "studies/cafe/img/interior-party_0.jpg (Evan's locked pick)"
REF_LP = 'studies/cafe/img/r2/asset-{}-lowpoly_0.jpg (round 2, low poly, Evan picked low poly)'


@asset('cup_dj_booth', 'Giant cup DJ booth', 'Party', 'hero', REF + '; ' + REF_LP.format('cup-booth'),
       real='a walk-in DJ booth shaped like a 2.2 m cup: 40 mm glazed GRC shell on a steel frame, saucer plinth, a staff door at the back; inside, a DJ console at 1 m',
       moving='both turntables spin, tonearms swing, crossfader and channel faders slide, knobs turn; the back door hinges')
def cup_dj_booth():
    """The pink cup on its saucer with a glowing window to the dance floor (window faces -Y). A DJ stands inside;
    the console has two turntables, a mixer and a cyan neon strip. Height to the lip 2.2 m; the cream topper sits on it."""
    R = empty('cup_dj_booth')
    shell(lathe('saucer', [(0.0, 0.0), (1.30, 0.0), (1.55, 0.06), (1.58, 0.12), (1.50, 0.13), (1.15, 0.09), (0.0, 0.09)], 'Clay_PinkGlaze', parent=R, verts=16), 0.015)
    torus('saucer_rim_neon', 1.52, 0.02, 'Glass_NeonPink', loc=(0, 0, 0.12), parent=R, seg=24, verts=6)
    prof = [(0.95, 0.09), (1.02, 0.09), (1.32, 1.6), (1.38, 2.2), (1.30, 2.2), (1.25, 1.62), (0.95, 0.15)]
    cup = shell(lathe('cup_shell', prof, 'Clay_PinkGlaze', parent=R, verts=16), 0.015, open=True)
    lathe('cup_floor', [(0.0, 0.09), (0.97, 0.09), (0.97, 0.15), (0.0, 0.15)], 'Plank_Dark', parent=R, verts=16)
    # window to the dance floor (front, -Y) and the staff door (back)
    cut(cup, cutter_box((1.5, 1.2, 0.9), (0, -1.2, 1.35)))
    cut(cup, cutter_box((0.8, 1.0, 1.95), (0, 1.15, 1.07)))
    def r_out(z):
        return 1.02 + (z - 0.09) / 1.51 * 0.30 if z < 1.6 else 1.32 + (z - 1.6) / 0.6 * 0.06
    def on_cup(x, z):
        return (x, -math.sqrt(max(r_out(z) ** 2 - x * x, 0.01)) - 0.02, z)
    rim = [on_cup(-0.75 + 1.5 * i / 6, 0.9) for i in range(7)] + [on_cup(0.75, 1.35)] + [on_cup(0.75 - 1.5 * i / 6, 1.8) for i in range(7)] + [on_cup(-0.75, 1.35)]
    tube('window_neon', rim, 0.03, 'Glass_NeonWarm', parent=R, closed=True, verts=6)
    # the handle (left side)
    shell(tube('cup_handle', [(-1.30, 0, 1.8), (-1.85, 0, 1.75), (-2.0, 0, 1.2), (-1.75, 0, 0.6), (-1.15, 0, 0.55)], 0.16, 'Clay_PinkGlaze', parent=R, verts=6), 0.015)
    # the lid: a cream "lid" disc closes the top (the topper sits on it); it is the booth ceiling
    tag(lathe('cup_lid', [(0.0, 2.16), (1.36, 2.16), (1.36, 2.22), (0.0, 2.22)], 'Food_Cream', parent=R, verts=16), density=300)
    cyl('booth_light', 0.12, 0.02, 'Light_Warm', loc=(0, 0, 2.14), parent=R, verts=10)
    # back door
    dg = empty('booth_door', loc=(-0.4, 1.19, 0.15), parent=R); joint(dg, 'hinge', (0, 0, 1), 0, -1.5, 'staff door into the booth')
    box('booth_door_panel', (0.78, 0.04, 1.85), 'Plaster_Tangerine', loc=(0.39, 0, 0), parent=dg, bevel=0.01, origin='bottom')
    star('booth_door_star', 0.14, 0.02, 'Plaster_Sun', loc=(0.39, 0.03, 1.4), rot=(-math.pi / 2, 0, 0), parent=dg)
    # the console inside, at the window
    con = empty('dj_console', loc=(0, -0.42, 0.15), parent=R)
    shell(box('console_desk', (1.5, 0.55, 0.85), 'Plank_BlackPly', loc=(0, 0, 0), parent=con, bevel=0.02, origin='bottom'), 0.018, open=True)
    box('console_top', (1.52, 0.58, 0.04), 'Plastic_Black', loc=(0, 0, 0.85), parent=con, origin='bottom')
    tube('console_neon', [(-0.74, -0.29, 0.83), (0.74, -0.29, 0.83)], 0.012, 'Glass_NeonCyan', parent=con, verts=6)
    for s in (-1, 1):
        tt = empty(f'turntable_{"lr"[s > 0]}', loc=(s * 0.47, 0.0, 0.89), parent=con)
        box(f'turntable_{"lr"[s > 0]}_plinth', (0.45, 0.36, 0.06), 'Plastic_Violet', parent=tt, bevel=0.01, origin='bottom')
        pl = empty(f'turntable_{"lr"[s > 0]}_platter', loc=(-0.04, 0, 0.06), parent=tt); joint(pl, 'knob', (0, 0, 1), 0, 6.283, '33 rpm, scratchable')
        cyl(f'platter_{"lr"[s > 0]}', 0.15, 0.015, 'Metal_Aluminium', parent=pl, verts=14)
        cyl(f'record_{"lr"[s > 0]}', 0.148, 0.004, 'Plastic_Black', loc=(0, 0, 0.015), parent=pl, verts=14)
        cyl(f'label_{"lr"[s > 0]}', 0.045, 0.002, 'Plastic_Pink' if s < 0 else 'Plastic_Cyan', loc=(0, 0, 0.019), parent=pl, verts=10)
        arm = empty(f'tonearm_{"lr"[s > 0]}', loc=(0.16, 0.12, 0.08), parent=tt); joint(arm, 'hinge', (0, 0, 1), 0, 0.5, 'drop the needle')
        tube(f'tonearm_{"lr"[s > 0]}_tube', [(0, 0, 0), (-0.05, -0.12, 0.0), (-0.09, -0.2, -0.01)], 0.006, 'Metal_Chrome', parent=arm, verts=6)
        cyl(f'tonearm_{"lr"[s > 0]}_pivot', 0.02, 0.03, 'Metal_Chrome', loc=(0, 0, -0.03), parent=arm, verts=8)
    mx = empty('mixer', loc=(0, 0.0, 0.89), parent=con)
    box('mixer_body', (0.26, 0.34, 0.07), 'Plastic_Black', parent=mx, bevel=0.008, origin='bottom')
    for c in range(3):
        f = box(f'fader_{c}', (0.02, 0.03, 0.015), ['Plastic_Pink', 'Plastic_Lime', 'Plastic_Cyan'][c], loc=(-0.07 + c * 0.07, -0.06, 0.07), parent=mx, origin='bottom')
        joint(f, 'slide', (0, 1, 0), 0, 0.08, 'channel volume')
        for k in range(3):
            n = cyl(f'eq_{c}_{k}', 0.012, 0.015, 'Plastic_White', loc=(-0.07 + c * 0.07, 0.05 + k * 0.035, 0.07), parent=mx, verts=6)
            joint(n, 'knob', (0, 0, 1), -2.4, 2.4)
    xf = box('crossfader', (0.035, 0.02, 0.015), 'Plastic_Orange', loc=(0, -0.14, 0.07), parent=mx, origin='bottom')
    joint(xf, 'slide', (1, 0, 0), -0.05, 0.05, 'crossfader')
    for s in (-1, 1):
        sp = empty(f'monitor_speaker_{"lr"[s > 0]}', loc=(s * 0.62, 0.2, 0.15), rot=(0, 0, s * 0.6), parent=R)
        shell(box(f'monitor_speaker_{"lr"[s > 0]}_box', (0.28, 0.26, 0.4), 'Plank_BlackPly', parent=sp, bevel=0.01, origin='bottom'), 0.012, open=True)
        cyl(f'monitor_speaker_{"lr"[s > 0]}_cone', 0.09, 0.01, 'Cloth_Speaker', loc=(0, -0.13, 0.2), rot=(math.pi / 2, 0, 0), parent=sp, verts=10)
    return R


@asset('cup_topper', 'Cream topper', 'Party', 'support', REF,
       real='a sculpted topper: expanded-polystyrene swirl with a hard-coat of pink and cream paint, a wafer cone and three cherries, about 1.3 m tall')
def cup_topper():
    """The whipped-cream swirl that crowns the cup, with a wafer cone, cherries and sprinkles."""
    R = empty('cup_topper')
    for k in range(6):
        r = 1.15 - k * 0.18
        torus(f'swirl_{k}', r, 0.22 - k * 0.022, 'Food_CreamPink' if k % 2 else 'Food_Cream', loc=(0.03 * k, 0, 0.18 + k * 0.2), rot=(0, 0, k * 0.5), parent=R, seg=12, verts=6)
    blob('swirl_tip', (0.18, 0.18, 0.25), 'Food_Cream', loc=(0.18, 0, 1.35), parent=R, subdiv=1, squash=lambda p: Vector((p.x * (1 - 0.6 * max(p.z, 0)), p.y * (1 - 0.6 * max(p.z, 0)), p.z)))
    tube('wafer_cone', [(-0.35, 0.2, 0.9), (-0.55, 0.3, 1.45)], 0.12, 'Food_Wafer', parent=R, verts=6)
    for i, (x, y, z) in enumerate([(0.4, -0.5, 0.85), (-0.2, -0.65, 0.65), (0.55, 0.35, 0.95)]):
        c = empty(f'cherry_{i}', loc=(x, y, z), parent=R)
        blob(f'cherry_{i}_fruit', (0.13, 0.13, 0.12), 'Food_Cherry', parent=c, subdiv=1)
        tube(f'cherry_{i}_stem', [(0, 0, 0.1), (0.05, 0.02, 0.3), (0.12, 0.0, 0.38)], 0.012, 'Plaster_Lime', parent=c, verts=4)
    rnd = random.Random(3)
    cols = ['Food_Sprinkles', 'Plastic_Yellow', 'Plastic_Lime', 'Plastic_Violet']
    for i in range(30):
        a = rnd.uniform(0, 2 * math.pi); k = rnd.randint(0, 4); r = 1.15 - k * 0.18 + 0.05
        box(f'sprinkle_{i}', (0.08, 0.025, 0.025), cols[i % 4], loc=(r * math.cos(a) + 0.03 * k, r * math.sin(a), 0.32 + k * 0.2), rot=(0, 0.3, rnd.uniform(0, 3)), parent=R)
    for ob in R.children_recursive:
        if ob.type == 'MESH':
            ob['density'] = 45.0   # EPS foam core with a hard paint coat
    return R


@asset('speakers', 'Speakers', 'Party', 'support', REF, real='a pair of 15-inch two-way PA speakers, 450 x 420 x 1300 mm, about 32 kg each',
       moving='woofer cones pump with the bass')
def speakers():
    """One floor speaker (the layout places two, either side of the arch). Faces -Y."""
    R = empty('speaker')
    shell(box('cabinet', (0.45, 0.42, 1.3), 'Plank_BlackPly', parent=R, bevel=0.02, origin='bottom'), 0.018, open=True)
    box('grille', (0.41, 0.01, 1.24), 'Cloth_Speaker', loc=(0, -0.212, 0.03), parent=R, origin='bottom')
    for nm, r, z in [('woofer', 0.17, 0.35), ('mid', 0.11, 0.78), ('tweeter', 0.05, 1.08)]:
        w = empty(nm, loc=(0, -0.22, z), rot=(math.pi / 2, 0, 0), parent=R); joint(w, 'slide', (0, 0, 1), 0, 0.006, 'pumps with the beat')
        torus(f'{nm}_surround', r, 0.015, 'Rubber_Black', parent=w, seg=14, verts=4)
        lathe(f'{nm}_cone', [(0.0, -0.04), (r * 0.25, -0.04), (r, 0.0), (0.0, -0.005)], 'Plastic_Black', parent=w, verts=14)
        cyl(f'{nm}_cap', r * 0.25, 0.01, 'Metal_Chrome', loc=(0, 0, -0.04), parent=w, verts=8)
    for s in (-1, 1):
        box(f'handle_{"lr"[s > 0]}', (0.02, 0.12, 0.04), 'Plastic_Black', loc=(s * 0.235, 0, 1.0), parent=R, origin='bottom')
    tag(box('driver_magnets', (0.3, 0.2, 0.3), 'Metal_Dark', loc=(0, 0.0, 0.25), parent=R, origin='bottom'), mass_override_kg=12.0, what='woofer and horn drivers, amplifier')
    return R


@asset('jukebox', 'Jukebox', 'Party', 'dressing', REF, real='arched-top jukebox, 0.9 x 0.65 x 1.55 m, about 130 kg', moving='record carousel turns; selector buttons press; bubble tubes glow')
def jukebox():
    R = empty('jukebox')
    W, Dd, H = 0.9, 0.62, 1.55
    pts = [(-W / 2, 0), (W / 2, 0), (W / 2, 1.1)] + [(W / 2 * math.cos(math.pi * i / 10), 1.1 + 0.45 * math.sin(math.pi * i / 10)) for i in range(1, 10)] + [(-W / 2, 1.1)]
    shell(prism('cabinet', pts, Dd, 'Plaster_Pink', loc=(0, Dd / 2, 0), rot=(math.pi / 2, 0, 0), parent=R), 0.018)
    arc_pts = [(0.4 * math.cos(math.pi * i / 10), 0, 1.1 + 0.4 * math.sin(math.pi * i / 10)) for i in range(11)]
    tube('bubble_arc', [(-0.4, 0, 0.1)] + arc_pts[::-1] + [(0.4, 0, 0.1)], 0.035, 'Glass_NeonPink', loc=(0, -Dd / 2 - 0.02, 0), parent=R, verts=6)
    tube('bubble_arc_inner', [(-0.3, 0, 0.6)] + [(0.3 * math.cos(math.pi * (10 - i) / 10), 0, 1.1 + 0.3 * math.sin(math.pi * (10 - i) / 10)) for i in range(11)] + [(0.3, 0, 0.6)], 0.025, 'Glass_NeonCyan', loc=(0, -Dd / 2 - 0.02, 0), parent=R, verts=6)
    shell(box('window', (0.5, 0.01, 0.36), 'Glass_Clear', loc=(0, -Dd / 2 - 0.005, 1.0), parent=R, origin='bottom'), 0.004)
    car = empty('record_carousel', loc=(0, -0.1, 1.15), rot=(math.pi / 2, 0, 0), parent=R); joint(car, 'knob', (0, 0, 1), 0, 6.283)
    for i in range(6):
        a = i * math.pi / 3
        cyl(f'record_{i}', 0.09, 0.004, 'Plastic_Black', loc=(0.12 * math.cos(a), 0.12 * math.sin(a), 0), parent=car, verts=10, origin='center')
    box('grille', (0.5, 0.01, 0.4), 'Cloth_Speaker', loc=(0, -Dd / 2 - 0.005, 0.2), parent=R, origin='bottom')
    for i in range(10):
        b = box(f'select_{i}', (0.035, 0.02, 0.025), ['Plastic_Yellow', 'Plastic_Cyan'][i % 2], loc=(-0.2 + i * 0.045, -Dd / 2 - 0.01, 0.75), parent=R, origin='bottom')
        joint(b, 'button', (0, 1, 0), 0, 0.006, f'song {i + 1}')
    tag(box('mechanism', (0.6, 0.4, 0.6), 'Metal_Steel', loc=(0, 0, 0.2), parent=R, origin='bottom'), mass_override_kg=70.0, what='changer, amplifier and speaker')
    return R


@asset('boombox', 'Boombox', 'Party', 'dressing', REF, real='portable stereo, 600 x 160 x 340 mm, 6 kg', moving='handle folds; cassette door hinges; buttons press')
def boombox():
    R = empty('boombox')
    shell(box('body', (0.6, 0.16, 0.30), 'Plastic_Pink', parent=R, bevel=0.02, origin='bottom'), 0.003)
    for s in (-1, 1):
        g = empty(f'speaker_{"lr"[s > 0]}', loc=(s * 0.19, -0.082, 0.15), rot=(math.pi / 2, 0, 0), parent=R)
        torus(f'speaker_{"lr"[s > 0]}_ring', 0.1, 0.012, 'Plastic_Violet', parent=g, seg=12, verts=4)
        cyl(f'speaker_{"lr"[s > 0]}_cone', 0.09, 0.01, 'Cloth_Speaker', parent=g, verts=12, origin='center')
    dr = empty('cassette_door', loc=(0, -0.081, 0.08), parent=R); joint(dr, 'hinge', (1, 0, 0), 0, 0.5)
    box('cassette_window', (0.14, 0.006, 0.09), 'Glass_Clear', loc=(0, 0, 0), parent=dr, origin='bottom')
    for i in range(5):
        b = box(f'key_{i}', (0.022, 0.03, 0.012), 'Plastic_Lime' if i != 1 else 'Plastic_Red', loc=(-0.05 + i * 0.025, -0.03, 0.30), parent=R, origin='bottom')
        joint(b, 'button', (0, 0, -1), 0, 0.006, ['play', 'record', 'rewind', 'forward', 'stop'][i])
    h = empty('handle', loc=(0, 0, 0.30), parent=R); joint(h, 'hinge', (1, 0, 0), -1.4, 0)
    tube('handle_bar', [(-0.22, 0, 0), (-0.2, 0, 0.09), (0.2, 0, 0.09), (0.22, 0, 0)], 0.014, 'Plastic_Violet', parent=h, verts=6)
    tag(box('works', (0.4, 0.1, 0.2), 'Metal_Steel', loc=(0, 0.01, 0.05), parent=R, origin='bottom'), mass_override_kg=3.5, what='speakers, transformer, batteries')
    return R


def disco_ball(id, r, drop):
    R = empty(id)
    g = empty('ball', loc=(0, 0, -drop), parent=R); joint(g, 'knob', (0, 0, 1), 0, 6.283, 'turns at 1 rpm; the game throws sparkle spots from it')
    shell(blob('mirror_ball', (r, r, r), 'Glass_Mirror', parent=g, subdiv=3), 0.003)
    cyl('motor', 0.05, 0.08, 'Metal_Dark', loc=(0, 0, -0.08), parent=R, verts=8)
    tube('rod', [(0, 0, -0.08), (0, 0, -drop + r)], 0.008, 'Metal_Chrome', parent=R, verts=6)
    cyl('canopy', 0.1, 0.02, 'Metal_Chrome', loc=(0, 0, -0.02), parent=R, verts=10)
    tag(blob('core', (r * 0.95, r * 0.95, r * 0.95), 'Plastic_White', parent=g, subdiv=1), mass_override_kg=r * 8, what='polystyrene core')
    return R

@asset('disco_ball_big', 'Big disco ball', 'Party', 'hero', REF, real='800 mm mirror ball, glass mirror tiles on a polystyrene core, ceiling motor', moving='spins')
def disco_ball_big():
    """Hangs from the ceiling (origin at the ceiling)."""
    return disco_ball('disco_ball_big', 0.4, 0.9)

@asset('disco_ball_small', 'Small disco ball', 'Party', 'support', REF, real='500 mm mirror ball on a ceiling motor', moving='spins')
def disco_ball_small():
    return disco_ball('disco_ball_small', 0.25, 0.7)


def neon_star(parent, nm, loc, r, m, wall='back', depth=0.03):
    """A neon star mounted on a wall: tube outline on stand-offs with a clear backer."""
    rot = {'back': (math.pi / 2, 0, 0), 'right': (math.pi / 2, 0, -math.pi / 2), 'left': (math.pi / 2, 0, math.pi / 2)}[wall]
    g = empty(nm, loc=loc, rot=rot, parent=parent)
    pts = star_pts(r, r * 0.45)
    tube(nm + '_tube', [(x, y, -depth) for x, y in pts], max(0.01, r * 0.05), m, parent=g, closed=True, verts=6)
    prism(nm + '_backer', [(x * 1.1, y * 1.1) for x, y in pts], 0.005, 'Glass_Clear', parent=g, z0=-0.006)
    return g

@asset('stars_arch', 'Warm stars round the arch', 'Party', 'support', REF, real='warm-white LED neon stars, 300 to 500 mm, on the back wall', moving='twinkle with the party signal')
def stars_arch():
    R = empty('stars_arch')
    for i, (x, z, r) in enumerate([(-2.6, 3.3, 0.35), (-1.9, 3.75, 0.22), (2.0, 3.6, 0.3), (2.7, 3.15, 0.2), (-3.3, 2.6, 0.18), (0.0, 3.85, 0.25)]):
        neon_star(R, f'star_{i}', (x, Y - 0.01, z), r, 'Glass_NeonWarm')
    return R

@asset('stars_cyan', 'Cyan stars', 'Party', 'hero', REF, real='cyan LED neon stars, 1.0 m and 0.7 m, on the right wall', moving='pulse with the party signal')
def stars_cyan():
    R = empty('stars_cyan')
    neon_star(R, 'star_big', (X - 0.01, -3.9, 2.85), 0.5, 'Glass_NeonCyan', wall='right')
    neon_star(R, 'star_mid', (X - 0.01, 4.35, 3.15), 0.3, 'Glass_NeonCyan', wall='right')
    return R

@asset('stars_pink', 'Pink stars', 'Party', 'support', REF, real='pink LED neon stars high on the right wall', moving='pulse')
def stars_pink():
    R = empty('stars_pink')
    for i, (y, z, r) in enumerate([(0.0, 3.9, 0.24), (2.6, 3.9, 0.2), (-2.6, 3.9, 0.2)]):
        neon_star(R, f'star_{i}', (DECK_X + 0.6 - 0.01, y, z), r, 'Glass_NeonPink', wall='right')
    return R

@asset('star_decals', 'Painted stars', 'Party', 'dressing', REF, real='sun-yellow painted stars on the walls')
def star_decals():
    R = empty('star_decals')
    rnd = random.Random(7)
    k = 0
    for wall, n in [('left', 10), ('back', 8)]:
        for i in range(n):
            if wall == 'left':
                y = rnd.uniform(-4.6, 4.6); z = rnd.uniform(1.5, 4.0)
                if -3.8 < y < -2.0 and z < 2.8:
                    continue
                g = empty(f'decal_{k}', loc=(-X + 0.003, y, z), rot=(math.pi / 2, 0, math.pi / 2), parent=R)
            else:
                x = rnd.uniform(-5.6, -1.8) if i % 2 else rnd.uniform(3.4, 5.6); z = rnd.uniform(1.4, 4.0)
                g = empty(f'decal_{k}', loc=(x, Y - 0.003, z), rot=(math.pi / 2, 0, 0), parent=R)
            prism(f'decal_{k}_star', star_pts(rnd.uniform(0.08, 0.2), 0.45 * 0.15), 0.003, 'Plaster_Sun', parent=g, z0=-0.003)
            k += 1
    return R

@asset('sticker_collage', 'Sticker collage', 'Party', 'dressing', REF, real='a wall of vinyl stickers: hearts, stars, circles, lightning, cups')
def sticker_collage():
    R = empty('sticker_collage')
    rnd = random.Random(11)
    cols = ['Plaster_Sun', 'Plaster_CyanPaint', 'Plaster_Lime', 'Plaster_White', 'Plaster_Tangerine', 'Plaster_Pink', 'Plaster_Violet']
    for i in range(60):
        x = rnd.uniform(-5.7, -2.5); z = rnd.uniform(1.3, 2.9)
        g = empty(f'sticker_{i}', loc=(x, Y - 0.002 - i * 0.00005, z), rot=(math.pi / 2, 0, rnd.uniform(-0.4, 0.4)), parent=R)
        kind = i % 4; s = rnd.uniform(0.05, 0.12); m = cols[i % len(cols)]
        if kind == 0:
            pts = [(s * math.cos(2 * math.pi * k / 10), s * math.sin(2 * math.pi * k / 10)) for k in range(10)]
        elif kind == 1:
            pts = star_pts(s, s * 0.45)
        elif kind == 2:
            pts = [(-s, -s * 0.6), (s, -s * 0.6), (s, s * 0.6), (-s, s * 0.6)]
        else:
            pts = [(0, -s)] + [(s * 0.55 * math.cos(a) + (s * 0.45 if a < math.pi / 2 else -s * 0.45) * 0, 0) for a in []] + [(s, s * 0.2), (s * 0.5, s * 0.75), (0, s * 0.35), (-s * 0.5, s * 0.75), (-s, s * 0.2)]
        prism(f'sticker_{i}_shape', pts, 0.0015, m, parent=g, z0=-0.0015)
    return R

@asset('abstract_shapes', 'Wall shapes', 'Party', 'dressing', REF, real='tangerine and sun MDF cut-outs on the back-left wall: rings, a squiggle, a triangle, dots')
def abstract_shapes():
    R = empty('abstract_shapes')
    g = empty('shapes', loc=(-4.4, Y - 0.02, 3.3), parent=R)
    torus('ring_big', 0.45, 0.06, 'Plaster_Tangerine', loc=(0, 0, 0), rot=(math.pi / 2, 0, 0), parent=g, seg=16, verts=4)
    torus('ring_small', 0.2, 0.04, 'Plaster_Sun', loc=(0.85, 0, 0.35), rot=(math.pi / 2, 0, 0), parent=g, seg=12, verts=4)
    tube('squiggle', [(-1.4 + i * 0.12, 0, -0.2 + 0.15 * math.sin(i * 1.3)) for i in range(10)], 0.04, 'Plaster_Lime', parent=g, verts=4)
    prism('triangle', [(0, 0.3), (-0.26, -0.15), (0.26, -0.15)], 0.03, 'Plaster_Pink', loc=(0.9, 0, -0.35), rot=(math.pi / 2, 0, 0.3), parent=g, z0=-0.03)
    for i in range(5):
        cyl(f'dot_{i}', 0.05, 0.02, 'Plaster_Sun', loc=(-0.6 + i * 0.2, 0, -0.6), rot=(math.pi / 2, 0, 0), parent=g, verts=8, origin='center')
    return R

@asset('wall_art', 'Wall art', 'Party', 'dressing', REF, real='three painted canvases in oak frames, 600 to 900 mm', moving='each lifts off its hook (the art auction game sells them)')
def wall_art():
    """Abstract paintings on the left wall. The art auction game swaps and sells these."""
    R = empty('wall_art')
    for i, (y, z, w, h, cols) in enumerate([(-0.8, 2.3, 0.7, 0.9, ['Plaster_Sun', 'Plaster_Pink']), (0.4, 2.4, 0.9, 0.7, ['Plaster_CyanPaint', 'Plaster_Tangerine']), (1.7, 2.2, 0.6, 0.6, ['Plaster_Lime', 'Plaster_Violet'])]):
        g = empty(f'painting_{i}', loc=(-X + 0.03, y, z), rot=(0, 0, math.pi / 2), parent=R); joint(g, 'lift', note='auction lot')
        for k, (sx, sz, lx, lz) in enumerate([(w, 0.04, 0, -h / 2), (w, 0.04, 0, h / 2 - 0.04), (0.04, h, -w / 2 + 0.02, -h / 2), (0.04, h, w / 2 - 0.02, -h / 2)]):
            box(f'painting_{i}_frame_{k}', (sx, 0.05, sz), 'Timber_Trim', loc=(lx, 0, lz), parent=g, origin='bottom')
        shell(box(f'painting_{i}_canvas', (w - 0.06, 0.02, h - 0.06), 'Paper_Canvas', loc=(0, 0.005, -h / 2 + 0.03), parent=g, origin='bottom'), 0.02, open=True)
        cyl(f'painting_{i}_sun', min(w, h) * 0.22, 0.004, cols[0], loc=(-w * 0.12, -0.007, h * 0.08), rot=(math.pi / 2, 0, 0), parent=g, verts=12, origin='center')
        box(f'painting_{i}_band', (w - 0.1, 0.004, h * 0.18), cols[1], loc=(0, -0.007, -h * 0.3), rot=(0, 0.15, 0), parent=g, origin='bottom')
    return R


def beanbag(id, rx, ry, rz, mat, seed):
    R = empty(id)
    def sq(p):
        z = p.z
        if z < -0.3:
            z = -0.3 - (z + 0.3) * 0.25          # flat bottom where it sits
        if z > 0.2 and p.y > -0.2:
            z = 0.2 + (z - 0.2) * 0.35 - 0.15 * max(0.0, 0.6 - abs(p.x)) * (1 if p.y < 0.5 else 0)  # the dent you sit in
        return Vector((p.x, p.y * (1 + 0.15 * max(0, -p.z)), z))
    b = blob('bag', (rx, ry, rz), mat, loc=(0, 0, rz * 0.78), parent=R, subdiv=2, jitter=0.07, seed=seed, squash=sq)
    tag(b, mass_override_kg=round(1.2 + 4.0 * rx * ry * rz / (0.55 * 0.5 * 0.45), 2), what='canvas shell (1.2 kg) and EPS bead fill', soft='squashes when sat on')
    return R

@asset('beanbag_orange_big', 'Big orange beanbag', 'Party', 'support', REF_LP.format('beanbag'), real='1.1 m canvas beanbag, EPS beads, about 5 kg')
def beanbag_orange_big():
    return beanbag('beanbag_orange_big', 0.62, 0.55, 0.45, 'Cloth_Tangerine', 1)

@asset('beanbag_lime_big', 'Big lime beanbag', 'Party', 'support', REF_LP.format('beanbag'), real='1.1 m canvas beanbag')
def beanbag_lime_big():
    return beanbag('beanbag_lime_big', 0.6, 0.55, 0.45, 'Cloth_Lime', 2)

@asset('beanbag_lime', 'Lime beanbag', 'Party', 'support', REF_LP.format('beanbag'), real='0.8 m canvas beanbag')
def beanbag_lime():
    return beanbag('beanbag_lime', 0.42, 0.4, 0.34, 'Cloth_Lime', 3)

@asset('beanbag_orange', 'Orange beanbag', 'Party', 'support', REF_LP.format('beanbag'), real='0.8 m canvas beanbag')
def beanbag_orange():
    return beanbag('beanbag_orange', 0.42, 0.4, 0.34, 'Cloth_Tangerine', 4)

@asset('beanbags_pink', 'Pink beanbag', 'Party', 'support', REF_LP.format('beanbag'), real='0.8 m canvas beanbag (the layout places two by the pink door)')
def beanbags_pink():
    return beanbag('beanbag_pink', 0.42, 0.4, 0.34, 'Cloth_Magenta', 5)

@asset('plush_toys', 'Plush toys', 'Party', 'dressing', REF, real='two plush toys, minky with fibre fill: a star and a cloud', moving='each lifts and can be carried')
def plush_toys():
    R = empty('plush_toys')
    s = empty('plush_star', loc=(0, 0, 0.0), parent=R); joint(s, 'lift')
    st = star('plush_star_body', 0.22, 0.1, 'Cloth_Plush', loc=(0, 0, 0.2), rot=(math.pi / 2 - 0.2, 0, 0), parent=s, puff=0.05)
    tag(st, mass_override_kg=0.35)
    for x in (-0.05, 0.05):
        blob(f'plush_star_eye_{x > 0}', (0.015, 0.008, 0.02), 'Plastic_Black', loc=(x, -0.1, 0.24), parent=s, subdiv=1)
    c = empty('plush_cloud', loc=(0.45, 0.1, 0), parent=R); joint(c, 'lift')
    for i, (x, z, r) in enumerate([(-0.12, 0.12, 0.12), (0.0, 0.18, 0.15), (0.13, 0.12, 0.11), (0.0, 0.08, 0.12)]):
        tag(blob(f'plush_cloud_puff_{i}', (r, r * 0.8, r), 'Cloth_Plush', loc=(x, 0, z), parent=c, subdiv=1, seed=i), mass_override_kg=0.08)
    for x in (-0.05, 0.05):
        blob(f'plush_cloud_eye_{x > 0}', (0.014, 0.008, 0.018), 'Plastic_Black', loc=(x, -0.115, 0.16), parent=c, subdiv=1)
    return R


@asset('photo_booth', 'Photo booth', 'Party', 'hero', 'Evan 2026-10-23 08:51Z: "add a photo booth minigame"; dressed in the dance-party look of studies/cafe/img/interior-party_0.jpg',
       real='coin-op photo booth: 18 mm ply cabinet on a steel plinth, gloss teal paint with pink trim, velvet curtain on a brass rail, '
            'swivel stool on a screw lift, camera behind a smoked window with a soft-box flash, a marquee of warm bulbs, a print slot for the strip',
       moving='the curtain slides, the stool swivels and winds up and down, the flash fires, the strip drops out of the slot')
def photo_booth():
    """A teal and pink photo booth in the front-left corner. Sit inside, the booth calls four poses, the flash pops for each,
    and a strip of four pictures of the in-game characters drops out of the slot (no real camera: kids' photos stay private)."""
    R = empty('photo_booth')
    W, D, H = 1.25, 1.0, 2.1; C = 0.875           # cabinet width, depth, height; seat compartment width (the rest is the column)
    x0 = -W / 2; xc = x0 + C                       # compartment from x0 to xc, column from xc to W/2
    shell(box('plinth', (W, D, 0.08), 'Metal_Dark', parent=R, origin='bottom'), 0.002, open=True)
    t = 0.018
    for nm, sz, lc in [('side_left', (t, D, H - 0.08), (x0 + t / 2, 0, 0.08)), ('side_right', (t, D, H - 0.08), (W / 2 - t / 2, 0, 0.08)),
                       ('back', (W, t, H - 0.08), (0, D / 2 - t / 2, 0.08)), ('roof', (W, D, t), (0, 0, H - t)),
                       ('column_inner', (t, D - 0.02, H - 0.08), (xc + t / 2, 0, 0.08)), ('column_front', (W / 2 - xc, t, H - 0.08), ((xc + W / 2) / 2, -D / 2 + t / 2, 0.08)),
                       ('valance', (C, t, 0.22), (x0 + C / 2, -D / 2 + t / 2, H - 0.22)), ('kick', (C, t, 0.12), (x0 + C / 2, -D / 2 + t / 2, 0.08))]:
        box(nm, sz, 'Plank_TealFront' if nm in ('side_left', 'side_right', 'column_front', 'valance', 'kick') else 'Plank_Counter', loc=lc, parent=R, origin='bottom')
    for nm, z in [('trim_low', 0.2), ('trim_high', H - 0.24)]:
        box(nm, (W + 0.01, 0.012, 0.03), 'Plaster_Pink', loc=(0, -D / 2 - 0.006, z), parent=R, origin='bottom')
    # inside: the camera wall faces the sitter (sitter's back to the curtain)
    cam = empty('camera', loc=(x0 + C / 2, D / 2 - t - 0.005, 1.15), parent=R); tag(cam, camera='booth', faces='-Y', fov_deg=50)
    box('camera_window', (0.22, 0.01, 0.16), 'Glass_Crt', loc=(x0 + C / 2, D / 2 - t - 0.005, 1.08), parent=R, origin='bottom')
    box('camera_bezel', (0.30, 0.02, 0.24), 'Metal_Dark', loc=(x0 + C / 2, D / 2 - t + 0.002, 1.04), parent=R, origin='bottom')
    fl = box('flash_softbox', (0.6, 0.03, 0.22), 'Light_Warm', loc=(x0 + C / 2, D / 2 - t - 0.015, 1.45), parent=R, origin='bottom')
    tag(fl, light='flash', fires='on each snap')
    for i in range(10):
        a = 2 * math.pi * i / 10
        cyl(f'pose_light_{i}', 0.018, 0.02, 'Light_Bulb', loc=(x0 + C / 2 + 0.2 * math.cos(a), D / 2 - t - 0.012, 1.16 + 0.15 * math.sin(a)), rot=(math.pi / 2, 0, 0), parent=R, verts=6)
    box('mirror_strip', (0.5, 0.008, 0.05), 'Glass_Mirror', loc=(x0 + C / 2, D / 2 - t - 0.005, 0.95), parent=R, origin='bottom')
    st = empty('stool', loc=(x0 + C / 2, -0.05, 0.08), parent=R); joint(st, 'knob', (0, 0, 1), 0, 6.283, 'swivels; winds up for small kids'); tag(st, lift_m=[0, 0.15])
    shell(cyl('stool_post', 0.025, 0.36, 'Metal_Chrome', parent=st, verts=8), 0.002)
    shell(cyl('stool_foot', 0.16, 0.02, 'Metal_Dark', parent=st, verts=10), 0.003)
    lathe('stool_seat', [(0.0, 0.36), (0.17, 0.36), (0.175, 0.40), (0.16, 0.43), (0.0, 0.435)], 'Cloth_Magenta', parent=st, verts=10)
    # curtain on a brass rail: pleats that slide along the rail
    box('curtain_rail', (C - 0.04, 0.02, 0.02), 'Metal_Brass', loc=(x0 + C / 2, -D / 2 + 0.05, H - 0.25), parent=R, origin='bottom')
    cu = empty('curtain', loc=(x0 + 0.03, -D / 2 + 0.05, 0.22), parent=R); joint(cu, 'slide', (1, 0, 0), 0, 0.5, 'drawn shut for the photos')
    n = 7
    for i in range(n):
        x = (i + 0.5) * 0.36 / n
        pts = [(x - 0.03, 0.0), (x, 0.025 * (1 if i % 2 else -1)), (x + 0.03, 0.0)]
        tag(prism(f'curtain_pleat_{i}', [(p[0], p[1]) for p in pts] + [(x + 0.03, 0.012 * (1 if i % 2 else -1)), (x - 0.03, 0.012 * (1 if i % 2 else -1))],
                  H - 0.48, 'Cloth_Magenta', parent=cu), density=350, what='cotton velvet, 1.5 mm')
    # the column: coin slot, print slot with a strip, star marquee on top
    cx = (xc + W / 2) / 2
    box('coin_plate', (0.12, 0.01, 0.18), 'Metal_Chrome', loc=(cx, -D / 2 - 0.004, 1.05), parent=R, bevel=0.003, origin='bottom')
    box('coin_slot', (0.006, 0.004, 0.04), 'Metal_Dark', loc=(cx, -D / 2 - 0.01, 1.15), parent=R, origin='bottom')
    box('print_slot', (0.09, 0.012, 0.02), 'Metal_Dark', loc=(cx, -D / 2 - 0.006, 0.72), parent=R, origin='bottom')
    sp = empty('photo_strip', loc=(cx, -D / 2 - 0.03, 0.64), parent=R); joint(sp, 'slide', (0, 0, -1), 0, 0.12, 'drops out after the fourth flash')
    tag(sp, render_target='booth_strip', frames=4)
    box('strip_paper', (0.05, 0.002, 0.2), 'Paper_Pages', parent=sp, origin='bottom')
    for k in range(4):
        box(f'strip_frame_{k}', (0.04, 0.001, 0.04), 'Paper_Canvas', loc=(0, -0.0015, 0.01 + k * 0.048), parent=sp, origin='bottom')
    star('column_star', 0.07, 0.02, 'Plaster_Sun', loc=(cx, -D / 2 - 0.01, 1.55), parent=R, puff=0.01)
    mq = empty('marquee', loc=(0, -D / 2 + 0.05, H), parent=R)
    prof = [(-W / 2, 0), (W / 2, 0), (W / 2, 0.2), (0.25, 0.26), (0.0, 0.36), (-0.25, 0.26), (-W / 2, 0.2)]
    shell(prism('marquee_board', prof, 0.1, 'Plaster_Pink', loc=(0, 0.05, 0), rot=(math.pi / 2, 0, 0), parent=mq), 0.012)
    for i, (sx, sz) in enumerate([(-0.4, 0.13), (0.0, 0.2), (0.4, 0.13)]):
        star(f'marquee_star_{i}', 0.07 if i == 1 else 0.05, 0.02, ['Glass_NeonCyan', 'Glass_NeonWarm', 'Glass_NeonPink'][i], loc=(sx, -0.06, sz), parent=mq)
    for i in range(14):
        u = i / 13; x = -W / 2 + 0.04 + u * (W - 0.08)
        z = 0.03 if abs(x) > 0.25 else 0.03
        cyl(f'marquee_bulb_{i}', 0.014, 0.02, 'Light_Bulb', loc=(x, -0.06, z), rot=(math.pi / 2, 0, 0), parent=mq, verts=6)
    return R
