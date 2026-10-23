"""Room shell: floors and the outer perimeter (AW-STUDY-0013 manifest `floors` and `perimeter`).

Room coordinates: 12 m (X) by 10 m (Y), interior faces at x = -6 and +6, y = -5 (front, the street) and +5 (back),
floor top at z = 0, main ceiling at 4.2 m with a coffer to 4.5 m over the dance floor. Every shell asset is built in
room coordinates (its root sits at the room origin), so the room assembles by placing them at (0, 0, 0).
The front wall is not in the picture (the camera stands there); it is built so first person has a whole room, and is
tagged `cutaway: iso` so the iso view can hide it.
"""
import math
from kit import *

REF = 'studies/cafe/img/interior-party_0.jpg (Evan\'s locked pick, Midjourney 5ab4584f image 0)'
X, Y, HC, HT, T = 6.0, 5.0, 4.2, 4.5, 0.15   # half width, half depth, ceiling, coffer top, wall thickness
DANCE = dict(cx=0.3, cy=0.5, cols=8, rows=7, tile=0.6)
DECK_X = 3.4                                   # bar deck from here to the right wall
STAGE = dict(cx=-3.8, cy=0.6, r=1.6, h=0.3)
ARCH = dict(cx=0.0, half=1.3, spring=1.9)      # main arch: legs to 1.9 m, semicircle to 3.2 m
DOOR = dict(x0=2.35, x1=3.25, h=2.2)             # pink door in the back wall
BASEMENT = dict(x0=4.5, x1=5.35, z0=0.30, h=2.05)  # the locked basement door behind the bar, on the bar deck
WIN_R = dict(y0=-1.4, y1=1.4, z0=1.55, z1=2.95)
WIN_L = dict(y0=-3.6, y1=-2.2, z0=1.2, z1=2.6)
PANEL_H = 1.2


def wall_box(name, side, a0, a1, z0, z1, mat, parent, inset=0.0, thick=T):
    """A box in a wall plane. side: back (+Y), front (-Y), left (-X), right (+X); a is the coordinate along the wall."""
    L, H = a1 - a0, z1 - z0; c = (a0 + a1) / 2
    if side in ('back', 'front'):
        s = 1 if side == 'back' else -1
        return box(name, (L, thick, H), mat, loc=(c, s * (Y + thick / 2 - inset), z0), parent=parent, origin='bottom')
    s = 1 if side == 'right' else -1
    return box(name, (thick, L, H), mat, loc=(s * (X + thick / 2 - inset), c, z0), parent=parent, origin='bottom')

def wall_shell(ob):
    return shell(ob, 0.025, open=True)   # stud wall: plasterboard both sides, about 30 kg per m2


@asset('plank_floor', 'Plank floor', 'Room shell', 'support', REF, real='22 mm oak boards, 180 mm wide, laid along X on a timber subfloor')
def plank_floor():
    """Warm honey boards everywhere at floor level. Boards run left to right with 3 mm gaps."""
    R = empty('plank_floor')
    w, n = 0.18, int(2 * Y / 0.18)
    for i in range(n):
        y = -Y + (i + 0.5) * (2 * Y / n)
        off = (i % 3) * 1.1
        # two boards per row with a staggered butt joint, like a real floor
        for k, (a, b) in enumerate([(-X, -X + 4.0 + off), (-X + 4.0 + off + 0.003, X)]):
            box(f'board_{i}_{k}', (b - a, 2 * Y / n - 0.003, 0.022), 'Plank_Honey', loc=((a + b) / 2, y, -0.022), parent=R, origin='bottom')
    return R


@asset('dance_floor', 'LED dance floor', 'Room shell', 'hero', REF,
       real='8 x 7 LED dance tiles, 600 mm square, 12 mm frosted acrylic over an RGB LED matrix, about 16 kg each',
       moving='none; every tile is addressable (tag `led`) so the party signal and the dance game light them')
def dance_floor():
    """The pink-peach and violet checker in the middle of the room, raised 50 mm, each tile its own part."""
    R = empty('dance_floor')
    d = DANCE; t = d['tile']
    x0 = d['cx'] - d['cols'] * t / 2; y0 = d['cy'] - d['rows'] * t / 2
    for r in range(d['rows']):
        for c in range(d['cols']):
            m = 'Glass_LedTile' if (r + c) % 2 == 0 else 'Glass_LedTileViolet'
            tl = box(f'tile_{r}_{c}', (t - 0.006, t - 0.006, 0.05), m, loc=(x0 + (c + 0.5) * t, y0 + (r + 0.5) * t, 0), parent=R, bevel=0.004, origin='bottom')
            tag(tl, led=[r, c], mass_override_kg=16.0)
    return R


@asset('dance_floor_rim', 'Dance floor rim', 'Room shell', 'support', REF, real='beech trim, 80 x 60 mm, rounded top edge')
def dance_floor_rim():
    """The honey timber edge that frames the dance floor."""
    R = empty('dance_floor_rim')
    d = DANCE; t = d['tile']; hw, hd = d['cols'] * t / 2, d['rows'] * t / 2; w = 0.08
    for nm, sx, sy, lx, ly in [('rim_front', 2 * hw + 2 * w, w, d['cx'], d['cy'] - hd - w / 2), ('rim_back', 2 * hw + 2 * w, w, d['cx'], d['cy'] + hd + w / 2),
                               ('rim_left', w, 2 * hd, d['cx'] - hw - w / 2, d['cy']), ('rim_right', w, 2 * hd, d['cx'] + hw + w / 2, d['cy'])]:
        box(nm, (sx, sy, 0.06), 'Timber_Trim', loc=(lx, ly, 0), parent=R, bevel=0.015, origin='bottom')
    return R


@asset('bar_deck', 'Bar deck', 'Room shell', 'support', REF, real='raised timber platform, 300 mm, stained oak boards, bullnose edge and one step')
def bar_deck():
    """The darker raised floor under the bar and stools, with a rounded front edge and a step up."""
    R = empty('bar_deck')
    h = 0.30; L = 2 * Y
    shell(box('deck_frame', (X - DECK_X - 0.04, L, h - 0.022), 'Plank_Counter', loc=((X + DECK_X + 0.04) / 2, 0, 0), parent=R, origin='bottom'), 0.018, open=True)
    n = int((X - DECK_X) / 0.14)
    for i in range(n):
        x = DECK_X + 0.02 + (i + 0.5) * (X - DECK_X - 0.02) / n
        box(f'deck_board_{i}', ((X - DECK_X - 0.02) / n - 0.003, L, 0.022), 'Plank_Dark', loc=(x, 0, h - 0.022), parent=R, origin='bottom')
    tube('bullnose', [(DECK_X + 0.02, -Y, h - 0.03), (DECK_X + 0.02, Y, h - 0.03)], 0.03, 'Plank_Dark', parent=R, verts=8)
    box('step', (0.30, 1.4, 0.15), 'Plank_Dark', loc=(DECK_X - 0.13, -2.6, 0), parent=R, bevel=0.02, origin='bottom')
    return R


@asset('booth_stage', 'Booth stage', 'Room shell', 'hero', REF, real='round timber stage, 300 mm, painted pink, LED neon edge, two steps')
def booth_stage():
    """The round pink stage the giant cup stands on, with a neon rim and steps down to the dance floor."""
    s = STAGE
    R = empty('booth_stage', loc=(0, 0, 0))
    g = empty('stage', loc=(s['cx'], s['cy'], 0), parent=R)
    shell(lathe('stage_drum', [(0.0, 0.0), (s['r'], 0.0), (s['r'], s['h'] - 0.03), (s['r'] - 0.03, s['h']), (0.0, s['h'])], 'Plaster_Pink', parent=g, verts=16), 0.018)
    torus('stage_neon', s['r'] - 0.01, 0.018, 'Glass_NeonPink', loc=(0, 0, s['h'] - 0.035), parent=g, seg=24, verts=6)
    for k, (dr, hh) in enumerate([(0.32, 0.2), (0.62, 0.1)]):
        a0, a1 = -0.55, 0.35
        pts = [((s['r'] + dr) * math.cos(a0 + (a1 - a0) * i / 6), (s['r'] + dr) * math.sin(a0 + (a1 - a0) * i / 6)) for i in range(7)]
        pts += [((s['r'] - 0.05) * math.cos(a1 - (a1 - a0) * i / 6), (s['r'] - 0.05) * math.sin(a1 - (a1 - a0) * i / 6)) for i in range(7)]
        prism(f'stage_step_{k}', pts, hh, 'Plaster_Tangerine', parent=g)
    return R


@asset('star_rug', 'Star rug', 'Room shell', 'dressing', REF, real='tufted wool rug, 12 mm pile, magenta with a sun-yellow star inlay')
def star_rug():
    R = empty('star_rug')
    g = empty('rug', loc=(-3.4, -3.3, 0), parent=R)
    pts = [(1.25 * math.cos(2 * math.pi * i / 16), 1.0 * math.sin(2 * math.pi * i / 16)) for i in range(16)]
    prism('rug_body', pts, 0.012, 'Cloth_Rug', parent=g)
    prism('rug_star', star_pts(0.7, 0.32), 0.004, 'Cloth_RugSun', parent=g, z0=0.012)
    return R


@asset('confetti_carpet', 'Confetti carpet', 'Room shell', 'dressing', REF, real='printed nylon carpet tiles with confetti dots')
def confetti_carpet():
    import random
    rnd = random.Random(4)
    R = empty('confetti_carpet')
    g = empty('carpet', loc=(-2.4, 3.7, 0), parent=R)
    W, D, r = 2.6, 1.6, 0.25
    pts = []
    for cx, cy, a0 in [(W / 2 - r, -D / 2 + r, -math.pi / 2), (W / 2 - r, D / 2 - r, 0), (-W / 2 + r, D / 2 - r, math.pi / 2), (-W / 2 + r, -D / 2 + r, math.pi)]:
        pts += [(cx + r * math.cos(a0 + math.pi / 2 * i / 3), cy + r * math.sin(a0 + math.pi / 2 * i / 3)) for i in range(4)]
    prism('carpet_body', pts, 0.008, 'Cloth_Confetti', parent=g)
    cols = ['Plaster_Sun', 'Plaster_CyanPaint', 'Plaster_Lime', 'Plaster_Violet', 'Plaster_Tangerine']
    for i in range(40):
        cyl(f'confetti_{i}', 0.035, 0.002, cols[i % 5], loc=(rnd.uniform(-W / 2 + 0.1, W / 2 - 0.1), rnd.uniform(-D / 2 + 0.1, D / 2 - 0.1), 0.008), parent=g, verts=5)
    return R


def panelled(R, side, spans, mat_upper='Plaster_Purple'):
    """Upper paint and lower pink boards with a chair rail, over the given (a0, a1) spans of one wall."""
    for k, (a0, a1) in enumerate(spans):
        n = max(1, int((a1 - a0) / 0.12))
        for i in range(n):
            b0 = a0 + i * (a1 - a0) / n
            wall_box(f'{side}_board_{k}_{i}', side, b0 + 0.002, b0 + (a1 - a0) / n - 0.002, 0.0, PANEL_H, 'Plank_PinkPanel', R, inset=-0.0, thick=0.02).location += (
                Vector((0, -0.01 if side == 'back' else 0.01, 0)) if side in ('back', 'front') else Vector((-0.01 if side == 'right' else 0.01, 0, 0)))
        wall_box(f'{side}_rail_{k}', side, a0, a1, PANEL_H, PANEL_H + 0.05, 'Timber_Trim', R, thick=0.05).location += (
            Vector((0, -0.025 if side == 'back' else 0.025, 0)) if side in ('back', 'front') else Vector((-0.025 if side == 'right' else 0.025, 0, 0)))

from mathutils import Vector


@asset('wall_left', 'Left wall', 'Room shell', 'support', REF, real='stud wall, plasterboard, matt purple above, painted pink boards below, one window')
def wall_left():
    R = empty('wall_left')
    w = WIN_L
    for nm, a0, a1, z0, z1 in [('wall_l_a', -Y - T, w['y0'], 0, HT), ('wall_l_b', w['y1'], Y + T, 0, HT),
                               ('wall_l_sill', w['y0'], w['y1'], 0, w['z0']), ('wall_l_head', w['y0'], w['y1'], w['z1'], HT)]:
        wall_shell(wall_box(nm, 'left', a0, a1, z0, z1, 'Plaster_Purple', R))
    panelled(R, 'left', [(-Y, Y)])
    return R


@asset('wall_right', 'Right wall', 'Room shell', 'support', REF, real='stud wall, purple above, pink boards below, the big window over the bar')
def wall_right():
    R = empty('wall_right')
    w = WIN_R
    for nm, a0, a1, z0, z1 in [('wall_r_a', -Y - T, w['y0'], 0, HT), ('wall_r_b', w['y1'], Y + T, 0, HT),
                               ('wall_r_sill', w['y0'], w['y1'], 0, w['z0']), ('wall_r_head', w['y0'], w['y1'], w['z1'], HT)]:
        wall_shell(wall_box(nm, 'right', a0, a1, z0, z1, 'Plaster_Purple', R))
    panelled(R, 'right', [(-Y, Y)])
    return R


@asset('wall_back', 'Back wall', 'Room shell', 'support', REF, real='stud wall with the main arch opening, the pink door and two portholes')
def wall_back():
    R = empty('wall_back')
    a, d = ARCH, DOOR
    for nm, a0, a1, z0, z1 in [('wall_b_a', -X - T, a['cx'] - a['half'], 0, HT), ('wall_b_b', a['cx'] + a['half'], d['x0'], 0, HT),
                               ('wall_b_c', d['x1'], BASEMENT['x0'], 0, HT), ('wall_b_door_head', d['x0'], d['x1'], d['h'], HT),
                               ('wall_b_d', BASEMENT['x1'], X + T, 0, HT), ('wall_b_base_head', BASEMENT['x0'], BASEMENT['x1'], BASEMENT['z0'] + BASEMENT['h'], HT),
                               ('wall_b_base_sill', BASEMENT['x0'], BASEMENT['x1'], 0, BASEMENT['z0'])]:
        wall_shell(wall_box(nm, 'back', a0, a1, z0, z1, 'Plaster_Purple', R))
    h = a['half']; pts = [(a['cx'] - h, HT), (a['cx'] - h, a['spring'])]
    pts += [(a['cx'] + h * math.cos(math.pi - math.pi * i / 12), a['spring'] + h * math.sin(math.pi - math.pi * i / 12)) for i in range(1, 12)]
    pts += [(a['cx'] + h, a['spring']), (a['cx'] + h, HT)]
    wall_shell(prism('wall_b_arch_head', pts, T, 'Plaster_Purple', loc=(0, Y, 0), rot=(math.pi / 2, 0, 0), parent=R, z0=-T))
    panelled(R, 'back', [(-X, a['cx'] - a['half'] - 0.2), (a['cx'] + a['half'] + 0.2, d['x0'] - 0.25), (d['x1'] + 0.25, DECK_X)])
    return R


@asset('wall_front', 'Front wall', 'Room shell', 'support', 'not in the picture (the camera stands here); built for first person',
       real='shop front: stud wall with a glazed double door and two shop windows')
def wall_front():
    """The street side. Tagged cutaway: iso, so the iso camera can hide it and look in like the picture."""
    R = empty('wall_front'); tag(R, cutaway='iso')
    door = (-0.8, 0.8, 2.4); wins = [(-4.6, -1.8), (1.6, 3.1)]
    spans = [(-X - T, wins[0][0]), (wins[0][1], door[0]), (door[1], wins[1][0]), (wins[1][1], X + T)]
    for i, (a0, a1) in enumerate(spans):
        wall_shell(wall_box(f'wall_f_{i}', 'front', a0, a1, 0, HT, 'Plaster_Purple', R))
    wall_shell(wall_box('wall_f_door_head', 'front', door[0], door[1], door[2], HT, 'Plaster_Purple', R))
    for i, (a0, a1) in enumerate(wins):
        wall_shell(wall_box(f'wall_f_sill_{i}', 'front', a0, a1, 0, 0.9, 'Plaster_Purple', R))
        wall_shell(wall_box(f'wall_f_head_{i}', 'front', a0, a1, 2.7, HT, 'Plaster_Purple', R))
        g = empty(f'shop_window_{i}', loc=((a0 + a1) / 2, -Y - T / 2, 0.9), parent=R)
        frame(g, f'shop_window_{i}', a1 - a0, 1.8, 'Timber_Trim', glass='Glass_Window', mull=2)
    for s in (-1, 1):
        dg = empty(f'entrance_door_{"lr"[s > 0]}', loc=(s * 0.8, -Y - T / 2, 0), parent=R)
        joint(dg, 'hinge', (0, 0, 1), 0, -s * 1.6, 'opens inwards')
        box(f'entrance_door_{"lr"[s > 0]}_stile', (0.8, 0.05, 2.4), 'Timber_DoorDark', loc=(-s * 0.4, 0, 0), parent=dg, origin='bottom')
        shell(box(f'entrance_door_{"lr"[s > 0]}_glass', (0.6, 0.012, 1.7), 'Glass_Window', loc=(-s * 0.4, -0.03, 0.5), parent=dg, origin='bottom'), 0.006)
        tube(f'entrance_door_{"lr"[s > 0]}_push', [(-s * 0.7, 0.06, 0.9), (-s * 0.7, 0.06, 1.3)], 0.015, 'Metal_Brass', parent=dg, verts=6)
    panelled(R, 'front', [(-X, wins[0][0]), (wins[0][1], door[0] - 0.1), (door[1] + 0.1, wins[1][0]), (wins[1][1], DECK_X)])
    return R


def frame(g, nm, w, h, mat, glass=None, mull=1, depth=0.12):
    """A window frame of width w and height h centred on g (in the wall plane, X along, Z up)."""
    f = 0.07
    for k, (sx, sz, lx, lz) in enumerate([(w, f, 0, 0), (w, f, 0, h - f), (f, h, -w / 2 + f / 2, 0), (f, h, w / 2 - f / 2, 0)]):
        box(f'{nm}_frame_{k}', (sx, depth, sz), mat, loc=(lx, 0, lz), parent=g, bevel=0.01, origin='bottom')
    for k in range(1, mull):
        box(f'{nm}_mullion_{k}', (0.04, depth * 0.8, h - 2 * f), mat, loc=(-w / 2 + k * w / mull, 0, f), parent=g, origin='bottom')
    if glass:
        shell(box(f'{nm}_glass', (w - 2 * f, 0.008, h - 2 * f), glass, loc=(0, 0, f), parent=g, origin='bottom'), 0.006)


@asset('window_right', 'Big window', 'Room shell', 'support', REF, real='timber casement window, 2.8 x 1.4 m, double glazed, with the palms and sky outside')
def window_right():
    """The window over the bar, with a sill, two casements (they open) and a view of palms outside."""
    R = empty('window_right')
    w = WIN_R; W = w['y1'] - w['y0']; Hh = w['z1'] - w['z0']
    g = empty('window_r', loc=(X + T / 2, (w['y0'] + w['y1']) / 2, w['z0']), rot=(0, 0, math.pi / 2), parent=R)
    frame(g, 'window_r', W, Hh, 'Timber_Trim', glass=None, mull=2)
    for s in (-1, 1):
        c = empty(f'casement_{"lr"[s > 0]}', loc=(s * W / 2 - s * 0.07, 0, 0.07), parent=g)
        joint(c, 'hinge', (0, 0, 1), 0, s * 1.2, 'opens out')
        shell(box(f'casement_{"lr"[s > 0]}_glass', (W / 2 - 0.1, 0.008, Hh - 0.14), 'Glass_Window', loc=(-s * (W / 4 - 0.05), 0, 0), parent=c, origin='bottom'), 0.006)
    box('window_r_sill', (W + 0.2, 0.25, 0.04), 'Timber_Trim', loc=(0, -0.12, -0.04), parent=g, bevel=0.01, origin='bottom')
    # the view: sky card and two palms a few metres outside
    out = empty('outside_view', loc=(X + 3.0, 0, 0), parent=R); tag(out, note='scenery outside the window; the town replaces it in the game')
    tag(box('sky', (0.05, 9.0, 5.0), 'Plaster_CyanPaint', loc=(2.0, 0, 0), parent=out, origin='bottom'), mass_override_kg=0.0)
    for k, y in enumerate((-1.2, 1.4)):
        p = empty(f'palm_{k}', loc=(0, y, 0), parent=out)
        tag(tube(f'palm_{k}_trunk', [(0, 0, 0), (0.15, 0.05, 1.5), (0.1, 0.2, 3.2)], 0.12, 'Plank_Dark', parent=p, verts=6), mass_override_kg=0.0)
        for i in range(6):
            a = i * math.pi / 3
            tag(tube(f'palm_{k}_leaf_{i}', [(0.1, 0.2, 3.2), (0.1 + 0.8 * math.cos(a), 0.2 + 0.8 * math.sin(a), 3.4), (0.1 + 1.4 * math.cos(a), 0.2 + 1.4 * math.sin(a), 2.9)], 0.07, 'Plaster_Lime', parent=p, verts=4), mass_override_kg=0.0)
    return R


@asset('window_left', 'Small window', 'Room shell', 'dressing', REF, real='timber window, 1.4 x 1.4 m')
def window_left():
    R = empty('window_left')
    w = WIN_L
    g = empty('window_l', loc=(-X - T / 2, (w['y0'] + w['y1']) / 2, w['z0']), rot=(0, 0, math.pi / 2), parent=R)
    frame(g, 'window_l', w['y1'] - w['y0'], w['z1'] - w['z0'], 'Timber_Trim', glass='Glass_Window', mull=2)
    return R


@asset('ceiling', 'Ceiling', 'Room shell', 'support', REF, real='painted plasterboard ceiling at 4.2 m with a stepped coffer to 4.5 m and LED cove strips')
def ceiling():
    """Magenta ceiling, stepped soffits around a raised coffer over the dance floor, teal and pink cove light."""
    R = empty('ceiling'); tag(R, cutaway='iso')
    d = DANCE; cx, cy = d['cx'], d['cy']; hw, hd = 3.0, 2.7
    th = 0.05
    # main ceiling as four boards around the coffer opening
    for nm, x0, x1, y0, y1 in [('ceiling_front', -X, X, -Y, cy - hd), ('ceiling_back', -X, X, cy + hd, Y), ('ceiling_left', -X, cx - hw, cy - hd, cy + hd), ('ceiling_right', cx + hw, X, cy - hd, cy + hd)]:
        shell(box(nm, (x1 - x0, y1 - y0, th), 'Plaster_Magenta', loc=((x0 + x1) / 2, (y0 + y1) / 2, HC), parent=R, origin='bottom'), 0.0125, open=True)
    # stepped soffit ring (two steps) and the coffer top
    for k, (inset, z0) in enumerate([(0.0, HC), (0.35, HC + 0.15)]):
        x0, x1, y0, y1 = cx - hw + inset, cx + hw - inset, cy - hd + inset, cy + hd - inset
        for nm, sx, sy, lx, ly in [('f', x1 - x0, 0.35, (x0 + x1) / 2, y0 + 0.175), ('b', x1 - x0, 0.35, (x0 + x1) / 2, y1 - 0.175),
                                   ('l', 0.35, y1 - y0 - 0.7, x0 + 0.175, (y0 + y1) / 2), ('r', 0.35, y1 - y0 - 0.7, x1 - 0.175, (y0 + y1) / 2)]:
            shell(box(f'soffit_{k}_{nm}', (sx, sy, 0.15), 'Plaster_Magenta', loc=(lx, ly, z0), parent=R, origin='bottom'), 0.0125, open=True)
        m = 'Glass_NeonTeal' if k == 0 else 'Glass_NeonPink'
        x0n, x1n, y0n, y1n = x0 + 0.37, x1 - 0.37, y0 + 0.37, y1 - 0.37
        tube(f'cove_{k}', [(x0n, y0n, z0 + 0.02), (x1n, y0n, z0 + 0.02), (x1n, y1n, z0 + 0.02), (x0n, y1n, z0 + 0.02)], 0.015, m, parent=R, closed=True, verts=4)
    shell(box('coffer_top', (2 * hw - 1.4, 2 * hd - 1.4, th), 'Plaster_Violet', loc=(cx, cy, HT), parent=R, origin='bottom'), 0.0125, open=True)
    return R


@asset('soffit_teal', 'Teal soffit', 'Room shell', 'support', REF, real='painted plasterboard bulkhead over the bar, 600 mm deep, with a pink LED strip')
def soffit_teal():
    R = empty('soffit_teal')
    shell(box('soffit', (X - DECK_X - 0.6, 2 * Y, 0.6), 'Plaster_Teal', loc=((X + DECK_X + 0.6) / 2, 0, HC - 0.6), parent=R, origin='bottom'), 0.0125, open=True)
    tube('soffit_neon', [(DECK_X + 0.58, -Y, HC - 0.62), (DECK_X + 0.58, Y, HC - 0.62)], 0.015, 'Glass_NeonPink', parent=R, verts=4)
    return R


@asset('ceiling_vent', 'Ceiling vent', 'Room shell', 'dressing', REF, real='round ventilation diffuser, 900 mm, painted tangerine, black louvres', moving='the fan inside turns')
def ceiling_vent():
    R = empty('ceiling_vent')
    g = empty('vent', loc=(-0.6, -3.0, HC), parent=R)
    shell(torus('vent_ring', 0.42, 0.06, 'Plaster_Tangerine', loc=(0, 0, -0.03), parent=g, seg=16, verts=6), 0.003)
    cyl('vent_back', 0.40, 0.02, 'Metal_Dark', loc=(0, 0, -0.02), parent=g, verts=16)
    for i in range(5):
        box(f'louvre_{i}', (0.72 - abs(i - 2) * 0.12, 0.03, 0.06), 'Metal_Dark', loc=(0, (i - 2) * 0.13, -0.08), rot=(0.5, 0, 0), parent=g, origin='bottom')
    fan = empty('vent_fan', loc=(0, 0, -0.03), parent=g); joint(fan, 'knob', (0, 0, 1), 0, 6.283, 'spins')
    for i in range(4):
        box(f'fan_blade_{i}', (0.3, 0.07, 0.005), 'Metal_Dark', loc=(0.15 * math.cos(i * math.pi / 2), 0.15 * math.sin(i * math.pi / 2), 0), rot=(0.3, 0, i * math.pi / 2), parent=fan, origin='bottom')
    return R


@asset('downlights', 'Downlights', 'Room shell', 'dressing', REF, real='recessed LED downlights, 120 mm, warm 2700 K')
def downlights():
    R = empty('downlights')
    k = 0
    for x in (-4.6, -2.6, 3.2):
        for y in (-3.6, -1.2, 1.2, 3.6):
            if x > 3 and abs(y) < 5:
                continue
            g = empty(f'downlight_{k}', loc=(x, y, HC), parent=R); k += 1
            cyl(f'downlight_{k}_trim', 0.075, 0.012, 'Metal_Dark', loc=(0, 0, -0.012), parent=g, verts=10)
            cyl(f'downlight_{k}_lens', 0.055, 0.004, 'Light_Warm', loc=(0, 0, -0.014), parent=g, verts=10)
    for y in (-3.6, -2.0, -0.4, 1.2, 2.8, 4.2):
        g = empty(f'downlight_{k}', loc=(4.8, y, HC - 0.6), parent=R); k += 1
        cyl(f'downlight_{k}_trim', 0.075, 0.012, 'Metal_Dark', loc=(0, 0, -0.012), parent=g, verts=10)
        cyl(f'downlight_{k}_lens', 0.055, 0.004, 'Light_Warm', loc=(0, 0, -0.014), parent=g, verts=10)
    return R


@asset('arch_main', 'Main arch', 'Room shell', 'hero', REF, real='tangerine-painted timber arch frame with 30 warm marquee bulbs and aubergine double doors',
       moving='the two doors swing open; the bulbs chase with the party signal')
def arch_main():
    """The big glowing arch at the back, where friends arrive."""
    a = ARCH
    R = empty('arch_main')
    g = empty('arch', loc=(a['cx'], Y - 0.04, 0), parent=R)
    h = a['half'] + 0.12
    path = [(-h, 0, 0.0), (-h, 0, a['spring'])] + [(h * math.cos(math.pi - math.pi * i / 14), 0, a['spring'] + h * math.sin(math.pi - math.pi * i / 14)) for i in range(1, 14)] + [(h, 0, a['spring']), (h, 0, 0.0)]
    shell(tube('arch_frame', path, 0.16, 'Plaster_Tangerine', parent=g, verts=4), 0.018)
    bulbs = [p for p in path[1:-1]] + [(-h, 0, z) for z in (0.4, 0.9, 1.4)] + [(h, 0, z) for z in (0.4, 0.9, 1.4)]
    for i, (x, _, z) in enumerate(bulbs):
        b = blob(f'bulb_{i}', (0.035, 0.035, 0.035), 'Light_Bulb', loc=(x, -0.17, z), parent=g, subdiv=1)
        tag(b, chase=i)
    hw = a['half']
    for s in (-1, 1):
        dg = empty(f'arch_door_{"lr"[s > 0]}', loc=(s * hw, 0.02, 0), parent=g)
        joint(dg, 'hinge', (0, 0, 1), 0, s * 1.6, 'opens into the café')
        sp = a['spring']
        pts = [(0, 0), (hw, 0), (hw, sp + hw)] + [(hw + hw * math.cos(math.pi / 2 + math.pi / 2 * i / 6), sp + hw * math.sin(math.pi / 2 + math.pi / 2 * i / 6)) for i in range(1, 7)]
        pts = [(-s * x, z) for x, z in pts]
        if s > 0:
            pts = list(reversed(pts))
        prism(f'arch_door_{"lr"[s > 0]}_panel', pts, 0.05, 'Timber_DoorDark', rot=(math.pi / 2, 0, 0), parent=dg, z0=-0.05)
        torus(f'arch_door_{"lr"[s > 0]}_porthole', 0.16, 0.03, 'Plaster_Tangerine', loc=(-s * hw / 2, -0.03, 1.7), rot=(math.pi / 2, 0, 0), parent=dg, seg=12, verts=4)
        cyl(f'arch_door_{"lr"[s > 0]}_glass', 0.15, 0.01, 'Glass_Porthole', loc=(-s * hw / 2, -0.02, 1.7), rot=(math.pi / 2, 0, 0), parent=dg, verts=12, origin='center')
        tube(f'arch_door_{"lr"[s > 0]}_pull', [(-s * 0.12, -0.08, 0.95), (-s * 0.12, -0.08, 1.25)], 0.015, 'Metal_Brass', parent=dg, verts=6)
    return R


@asset('arch_niches', 'Portholes', 'Room shell', 'support', REF, real='two round glazed portholes in tangerine surrounds, back-lit', moving='none')
def arch_niches():
    R = empty('arch_niches')
    for s in (-1, 1):
        g = empty(f'porthole_{"lr"[s > 0]}', loc=(s * 1.95, Y - 0.02, 2.7), parent=R)
        torus(f'porthole_{"lr"[s > 0]}_ring', 0.34, 0.07, 'Plaster_Tangerine', rot=(math.pi / 2, 0, 0), parent=g, seg=16, verts=4)
        cyl(f'porthole_{"lr"[s > 0]}_glass', 0.3, 0.02, 'Glass_Porthole', rot=(math.pi / 2, 0, 0), parent=g, verts=16, origin='center')
    return R


@asset('door_pink', 'Pink door', 'Room shell', 'support', REF, real='pink-painted solid-core door in a tangerine arch surround, brass knob', moving='door hinges open; the knob turns')
def door_pink():
    d = DOOR
    R = empty('door_pink')
    w = d['x1'] - d['x0']; cx = (d['x0'] + d['x1']) / 2
    g = empty('pink_door', loc=(cx, Y - 0.03, 0), parent=R)
    path = [(-w / 2 - 0.08, 0, 0), (-w / 2 - 0.08, 0, d['h'])] + [((w / 2 + 0.08) * math.cos(math.pi - math.pi * i / 8), 0, d['h'] + 0.25 * math.sin(math.pi * i / 8)) for i in range(1, 8)] + [(w / 2 + 0.08, 0, d['h']), (w / 2 + 0.08, 0, 0)]
    shell(tube('door_surround', path, 0.08, 'Plaster_Tangerine', parent=g, verts=4), 0.018)
    hg = empty('door_leaf', loc=(-w / 2, 0.0, 0), parent=g); joint(hg, 'hinge', (0, 0, 1), 0, 1.6, 'staff door')
    box('door_panel', (w - 0.02, 0.045, d['h'] - 0.01), 'Plaster_Pink', loc=(w / 2, 0, 0), parent=hg, bevel=0.01, origin='bottom')
    for k in range(2):
        box(f'door_inlay_{k}', (w - 0.3, 0.01, 0.7), 'Plaster_Magenta', loc=(w / 2, -0.026, 0.25 + k * 0.95), parent=hg, bevel=0.01, origin='bottom')
    kn = blob('door_knob', (0.03, 0.03, 0.03), 'Metal_Brass', loc=(w - 0.12, -0.06, 1.0), parent=hg, subdiv=1)
    joint(kn, 'knob', (0, 1, 0), 0, 1.2)
    star('door_star', 0.1, 0.02, 'Plaster_Sun', loc=(w / 2, -0.04, 1.85), parent=hg)
    return R


@asset('basement_door', 'Basement door', 'Room shell', 'hero', 'Evan 2026-10-23 08:52Z: the computer "goes in the basement", "basement is a secret unlock", "there\'s a key in the cash register"',
       real='old ledged-and-braced tongue-and-groove door in dark stained pine, black iron strap hinges, a brass mortice lock with an escutcheon, '
            'in a painted timber casing; it is older than the rest of the café',
       moving='locked until the brass key from the cash register is used; then it hinges open onto the basement stairs')
def basement_door():
    """The secret door behind the bar, in the back wall on the bar deck. It does not glow or call out: it looks like an old
    door the café grew around. Locked (lock tag names the key); opening it goes to /studies/basement/play.html?from=cafe and
    sets localStorage aw-basement-unlocked = 1 (the basement thread reads both)."""
    b = BASEMENT
    R = empty('basement_door')
    w = b['x1'] - b['x0']; cx = (b['x0'] + b['x1']) / 2; h = b['h']
    g = empty('basement_doorway', loc=(cx, Y - 0.02, b['z0']), parent=R)
    tag(g, lock='cafe-basement-key', leads_to='/studies/basement/play.html?from=cafe', sets_storage='aw-basement-unlocked=1')
    for nm, sz, lc in [('casing_l', (0.07, 0.05, h + 0.07), (-w / 2 - 0.035, 0, 0)), ('casing_r', (0.07, 0.05, h + 0.07), (w / 2 + 0.035, 0, 0)),
                       ('casing_head', (w + 0.14, 0.05, 0.07), (0, 0, h))]:
        box(nm, sz, 'Timber_Trim', loc=(lc[0], -0.025, lc[2]), parent=g, bevel=0.006, origin='bottom')
    tag(box('stair_dark', (w, 0.02, h), 'Metal_Dark', loc=(0, 0.06, 0), parent=g, origin='bottom'), mass_override_kg=0.0)   # the dark stairwell seen when it opens (a backdrop, no mass)
    hg = empty('basement_door_leaf', loc=(-w / 2 + 0.005, -0.03, 0), parent=g)
    joint(hg, 'hinge', (0, 0, -1), 0, 1.7, 'locked until the brass key is used'); tag(hg, locked=1)
    n = 6; bw = (w - 0.01) / n
    for i in range(n):
        box(f'board_{i}', (bw - 0.004, 0.03, h - 0.01), 'Timber_DoorDark', loc=(0.005 + (i + 0.5) * bw, 0, 0.005), parent=hg, bevel=0.003, origin='bottom')
    for z in (0.25, h / 2, h - 0.3):
        box(f'ledge_{int(z * 100)}', (w - 0.06, 0.025, 0.12), 'Timber_DoorDark', loc=(w / 2, -0.027, z - 0.06), parent=hg, origin='bottom')
        box(f'strap_{int(z * 100)}', (w * 0.55, 0.006, 0.035), 'Metal_Dark', loc=(w * 0.275, -0.043, z - 0.0175), parent=hg, origin='bottom')
        cyl(f'pintle_{int(z * 100)}', 0.012, 0.05, 'Metal_Dark', loc=(0, -0.02, z - 0.025), parent=hg, verts=6)
    box('escutcheon', (0.05, 0.006, 0.12), 'Metal_Brass', loc=(w - 0.09, -0.05, 0.92), parent=hg, bevel=0.004, origin='bottom')
    box('keyhole', (0.008, 0.004, 0.025), 'Metal_Dark', loc=(w - 0.09, -0.054, 0.95), parent=hg, origin='bottom')
    kn = blob('basement_knob', (0.028, 0.028, 0.028), 'Metal_Brass', loc=(w - 0.09, -0.07, 1.08), parent=hg, subdiv=1)
    joint(kn, 'knob', (0, 1, 0), 0, 1.0)
    return R
