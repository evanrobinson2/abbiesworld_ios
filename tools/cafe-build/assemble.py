"""Assemble the whole café from its assets, export one room GLB, and render the checks.

`python assemble.py [--samples N] [--no-render]` writes
  prototypes/ranch-atelier/dist/models/cafe-room/model.glb   every asset placed, extras intact
  prototypes/ranch-atelier/dist/models/cafe-room/{hero,iso,first_person,first_person_bar}.jpg
  assets/room/layout.json   where everything stands (the placements below), with masses and triangles
The shell and wall decor are built in room coordinates (placed at the origin); props are placed by LAYOUT.
"""
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Vector
import kit, render
import assets_backbar, assets_room, assets_party, assets_bar  # noqa: F401
from build import SITE, HERE

D = math.radians
BC_X, DECK, TOP = 5.675, 0.30, 0.30 + 0.90   # back counter centre line, deck top, back counter worktop
LAYOUT = {
    # room shell and wall decor (room coordinates)
    **{k: [(0, 0, 0, 0)] for k in ['plank_floor', 'dance_floor', 'dance_floor_rim', 'bar_deck', 'booth_stage', 'star_rug', 'confetti_carpet',
                                     'wall_left', 'wall_right', 'wall_back', 'wall_front', 'window_right', 'window_left', 'ceiling', 'soffit_teal',
                                     'ceiling_vent', 'downlights', 'arch_main', 'arch_niches', 'door_pink', 'basement_door', 'stars_arch', 'stars_cyan', 'stars_pink',
                                     'star_decals', 'sticker_collage', 'abstract_shapes', 'wall_art', 'bar_counter']},
    'cup_dj_booth': [(-3.8, 0.6, 0.30, 60)],
    'cup_topper': [(-3.8, 0.6, 0.30 + 2.22, 60)],
    'speakers': [(-1.88, 4.62, 0, 0), (1.88, 4.62, 0, 0)],
    'jukebox': [(-3.3, -1.6, 0, 0)],
    'boombox': [(-2.65, 1.35, 0.30, 100)],
    'disco_ball_big': [(2.0, 1.2, 4.5, 0)],
    'disco_ball_small': [(-0.5, -0.2, 4.5, 0)],
    'beanbag_orange_big': [(-3.5, -3.95, 0, 20)],
    'photo_booth': [(-5.35, -4.27, 0, 90)],
    'beanbag_lime_big': [(2.3, -3.9, 0, -25)],
    'beanbag_lime': [(-3.0, 3.6, 0, 160)],
    'beanbag_orange': [(-1.9, 3.85, 0, 200)],
    'beanbags_pink': [(1.85, 3.3, 0, 190), (2.9, 3.35, 0, 160)],
    'plush_toys': [(-5.35, -1.3, 0, 70)],
    'bar_stools': [(3.72, y, DECK, 0) for y in (-1.1, -0.1, 0.9, 1.9)],
    'giant_sundaes': [(4.35, y, DECK + 1.10, 0) for y in (-1.2, 0.35, 1.55)],
    'bar_bits': [(4.45, 2.1, DECK + 1.10, 0)],
    'back_counter': [(BC_X, 0.0, DECK, 0)],
    # Grace's computer and her manual moved to the basement (Evan 08:52Z); the register holds the basement key
    'cash_register': [(5.62, -1.5, TOP, -90)],
    'espresso_machine': [(5.65, -0.95, TOP, -90)],
    'grinder': [(5.68, -0.5, TOP, -90)],
    'smoothie_machine': [(5.65, -0.1, TOP, -90)],
    'urn': [(5.7, 0.35, TOP, -90)],
    'pastry_case': [(5.66, 1.05, TOP, -90)],
    'cup_shelves': [(5.88, 3.3, 1.3, 0)],
    'menu_board': [(5.99, -2.25, 2.1, -90)],
    'back_stars': [(5.97, 3.0, 2.55, -90)],
}

def place():
    kit.reset()
    room = kit.empty('cafe_room')
    kit.tag(room, study='AW-STUDY-0013', units='metres', up='Z (Y in the GLB)', front='-Y is the street')
    rows = []
    for id, spots in LAYOUT.items():
        a = kit.ASSETS[id]
        for n, (x, y, z, rz) in enumerate(spots):
            root = a['fn']()
            if len(spots) > 1:
                root.name = f'{id}_{n + 1}'
            root.location = (x, y, z); root.rotation_euler = (0, 0, D(rz)); root.parent = room
            bpy.context.view_layer.update()
            total, com, parts = kit.weigh(root)
            kit.tag(root, asset=id, tier=a['tier'], group=a['group'])
            rows.append(dict(asset=id, name=root.name, at=[x, y, z], rot_deg=rz, mass_kg=round(total, 2), triangles=kit.tris(root)))
    return room, rows

def lights_for_preview(room):
    """Preview-only lamps standing in for the downlights, cove and window sun (the game lights the room itself)."""
    for ob in room.children_recursive:
        if ob.name.startswith('downlight_') and ob.type == 'EMPTY':
            p = ob.matrix_world.translation
            render.light('dl_' + ob.name, 'SPOT', (p.x, p.y, p.z - 0.05), 220, col=(1, 0.82, 0.6)).rotation_euler = (0, 0, 0)
    render.light('coffer', 'AREA', (0.3, 0.5, 4.35), 900, size=3.5, col=(1, 0.55, 0.85)).rotation_euler = (0, 0, 0)
    render.light('bar_soffit', 'AREA', (4.9, 0.0, 3.55), 500, size=2.0, col=(1, 0.75, 0.85)).rotation_euler = (0, 0, 0)
    s = bpy.data.lights.new('sun', 'SUN'); s.energy = 2.5; s.color = (1, 0.92, 0.8)
    so = bpy.data.objects.new('sun', s); bpy.context.scene.collection.objects.link(so); so.rotation_euler = (D(55), 0, D(-110))

def shot(name, loc, look, lens=20, ortho=None, hide=(), px=(1280, 800), samples=64):
    sc = bpy.context.scene
    for ob in bpy.data.objects:
        ob.hide_render = any(ob.name == h or ob.name.startswith(h + '_') for h in hide) or (ob.parent is not None and ob.parent.hide_render)
    for ob in bpy.data.objects:   # inherit hiding down the tree
        p = ob.parent
        while p is not None:
            if p.hide_render:
                ob.hide_render = True
                break
            p = p.parent
    cam = bpy.data.cameras.new(name); co = bpy.data.objects.new(name, cam); sc.collection.objects.link(co); sc.camera = co
    co.location = loc; d = Vector(look) - Vector(loc); co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        cam.type = 'ORTHO'; cam.ortho_scale = ortho
    else:
        cam.lens = lens
    cam.clip_end = 200
    sc.render.resolution_x, sc.render.resolution_y = px; sc.cycles.samples = samples
    out = os.path.join(SITE, 'cafe-room', name + '.png'); sc.render.filepath = out
    bpy.ops.render.render(write_still=True)
    from PIL import Image
    Image.open(out).convert('RGB').save(out[:-4] + '.jpg', quality=86); os.remove(out)

if __name__ == '__main__':
    samples = int(sys.argv[sys.argv.index('--samples') + 1]) if '--samples' in sys.argv else 64
    room, rows = place()
    total = sum(r['mass_kg'] for r in rows); tris = sum(r['triangles'] for r in rows)
    kit.tag(room, physics=dict(mass_kg=round(total, 1), note='whole fit-out, shell included'))
    kit.export(room, os.path.join(SITE, 'cafe-room', 'model.glb'))
    os.makedirs(os.path.join(HERE, 'assets', 'room'), exist_ok=True)
    json.dump(dict(room=dict(width_m=12, depth_m=10, ceiling_m=4.2, coffer_m=4.5), assets=len(rows), triangles=tris, mass_kg=round(total, 1), placed=rows),
              open(os.path.join(HERE, 'assets', 'room', 'layout.json'), 'w'), indent=1)
    print('room:', len(rows), 'placed,', tris, 'tris,', round(total), 'kg')
    if '--no-render' in sys.argv:
        sys.exit()
    render.setup(1280, samples)
    bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.25
    lights_for_preview(room)
    shot('hero', (1.6, -4.7, 1.5), (-1.0, 2.6, 1.35), lens=16, samples=samples)
    shot('iso', (-14, -16, 15.5), (0.3, 0.2, 0.6), ortho=17.5, hide=('wall_front', 'wall_left', 'ceiling', 'ceiling_vent', 'downlights', 'disco_ball_big', 'disco_ball_small', 'soffit_teal', 'stars_pink'), samples=samples)
    shot('first_person', (0.3, -3.9, 1.6), (-1.5, 2.0, 1.4), lens=18, samples=samples)
    shot('first_person_bar', (3.7, -3.2, 1.65), (5.6, -0.6, 1.25), lens=20, samples=samples)
