"""Silhouette score per piece against its crop of the concept sheet (views/<piece>_mask.png, from make_views.py).

Each piece is rendered with the harness lens (50 mm, DIST x the bbox diagonal) from the direction the sheet draws it:
YAW deg off the front (negative turns towards -X), ELEV deg up. The directions were found with
`python score.py calibrate` (a grid per piece) and are then held fixed in VIEW. IoU as in the harness: both masks
cropped to their bounding boxes and fitted into the same square.

usage: python score.py calibrate [piece ...]
       python score.py [px] [samples]          renders r/<piece>.png, writes r/score.json, r/compare.jpg and r/kit.png
"""
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

PIECES = ['bed', 'stake', 'watering-can', 'crop-sprout', 'crop-growing', 'crop-ripe', 'crop-thirsty']
VIEW = {  # piece: (yaw, elev, dist)   -- calibrated, then fixed
    'bed': (-40, 30, 1.9), 'stake': (-20, 20, 1.9), 'watering-can': (-20, 20, 1.9),
    'crop-sprout': (-10, 15, 1.9), 'crop-growing': (-10, 15, 1.9), 'crop-ripe': (-10, 15, 1.9), 'crop-thirsty': (-10, 15, 1.9),
}
if os.path.exists(os.path.join(HERE, 'r', 'view.json')):
    VIEW.update({k: tuple(v) for k, v in json.load(open(os.path.join(HERE, 'r', 'view.json'))).items()})


def direction(yaw, elev):
    return (math.sin(math.radians(yaw)) * math.cos(math.radians(elev)), -math.cos(math.radians(yaw)) * math.cos(math.radians(elev)),
            math.sin(math.radians(elev)))


def target(piece):
    return harness.norm_mask(np.asarray(Image.open(os.path.join(HERE, 'views', f'{piece}_mask.png'))) > 127)


def shot(glb, path, d, px, samples, dist):
    import bpy, mathutils
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), px, samples)
    cam = harness._cam(sc, lo, hi, d, False)
    c = (lo + hi) / 2; size = float(np.linalg.norm(hi - lo))
    cam.location = mathutils.Vector(c) + mathutils.Vector(d).normalized() * size * dist
    sc.render.filepath = os.path.abspath(path); bpy.ops.render.render(write_still=True)
    return path, tris


def iou(nt, path):
    nr = harness.norm_mask(harness.render_mask(path)[0])
    return float((nt & nr).sum() / max(1, (nt | nr).sum())), nr


def calibrate(pieces):
    os.makedirs(os.path.join(HERE, 'r'), exist_ok=True)
    found = {}
    for piece in pieces:
        nt = target(piece); best = []
        yaws = range(-70, 71, 10) if piece == 'bed' else range(-40, 41, 10)
        for yaw in yaws:
            for elev in range(5, 46, 5):
                p, _ = shot(os.path.join(HERE, f'{piece}.glb'), os.path.join(HERE, 'r', '_cal.png'), direction(yaw, elev), 128, 1, 1.9)
                best.append((iou(nt, p)[0], yaw, elev))
        best.sort(reverse=True); found[piece] = (best[0][1], best[0][2], 1.9)
        print(piece, ' '.join('%.3f@%d/%d' % b for b in best[:4]), flush=True)
    os.remove(os.path.join(HERE, 'r', '_cal.png'))
    view = {}
    vp = os.path.join(HERE, 'r', 'view.json')
    if os.path.exists(vp):
        view = json.load(open(vp))
    view.update(found); json.dump(view, open(vp, 'w'), indent=1)


def diorama(path, px, samples):
    """The kit in use: the bed with a crop stage in each slot (two of each, ripe and thirsty mixed in), the stake at
    the back corner and the can beside it. Crops go on the bed's crop_slot empties, unscaled, so this also checks
    that every stage sits on its mound."""
    import bpy, mathutils
    bpy.ops.wm.read_factory_settings(use_empty=True)
    def put(name, loc, rz=0.0):
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, f'{name}.glb'))
        for o in set(bpy.data.objects) - before:
            if o.parent is None:
                o.location = mathutils.Vector(loc) + o.location; o.rotation_euler.z += rz
        return before
    put('bed', (0, 0, 0))
    slots = sorted([o for o in bpy.data.objects if o.name.startswith('crop_slot_')], key=lambda o: o.name)
    stages = ['crop-ripe', 'crop-growing', 'crop-sprout', 'crop-thirsty', 'crop-ripe', 'crop-growing']
    locs = [tuple(o.matrix_world.translation) for o in slots]
    for st, loc, k in zip(stages, locs, range(6)):
        put(st, loc, k * 1.3)
    put('stake', (0.72, 0.52, 0)); put('watering-can', (1.0, -0.15, 0), 0.5)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = False
    sc.render.resolution_x = px; sc.render.resolution_y = int(px * 0.62); sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (*harness.BG, 1); w.node_tree.nodes['Background'].inputs[1].default_value = harness.LIGHT[1]
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = harness.LIGHT[0]
    sun.rotation_euler = (math.radians(50), 0, math.radians(35)); sc.collection.objects.link(sun)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    c = mathutils.Vector((0.15, 0.0, 0.35)); d = mathutils.Vector(direction(-35, 28))
    cam.location = c + d * 4.2; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 50
    sc.render.filepath = os.path.abspath(path); bpy.ops.render.render(write_still=True)


def onbg(path, size):
    r = Image.open(path).convert('RGBA'); bg = Image.new('RGB', r.size, tuple(int(c * 255) for c in harness.BG)); bg.paste(r, (0, 0), r)
    bb = r.getbbox()
    if bb:
        bg = bg.crop(bb)
    bg.thumbnail(size); return bg


def main(px=384, samples=16):
    out = os.path.join(HERE, 'r'); os.makedirs(out, exist_ok=True)
    res = {}; rows = []
    for piece in PIECES:
        yaw, elev, dist = VIEW[piece]
        p, tris = shot(os.path.join(HERE, f'{piece}.glb'), os.path.join(out, f'{piece}.png'), direction(yaw, elev), px, samples, dist)
        nt = target(piece); v, nr = iou(nt, p)
        res[piece] = dict(iou=round(v, 3), triangles=tris, yaw=yaw, elev=elev)
        ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
        tg = Image.open(os.path.join(HERE, 'views', f'{piece}.png')).convert('RGB'); tg.thumbnail((256, 256))
        rows.append((piece, tg, onbg(p, (256, 256)), Image.fromarray(ov)))
        print(piece, 'IoU %.3f' % v, 'tris', tris, flush=True)
    json.dump(res, open(os.path.join(out, 'score.json'), 'w'), indent=1)
    # compare.jpg: one row per piece, target | render | overlay
    sheet = Image.new('RGB', (3 * 262 + 140, 262 * len(rows)), 'white'); d = ImageDraw.Draw(sheet)
    for i, (piece, *ims) in enumerate(rows):
        d.text((6, i * 262 + 120), f'{piece}\nIoU {res[piece]["iou"]:.3f}\n{res[piece]["triangles"]} tris', fill=(30, 30, 30))
        for j, im in enumerate(ims):
            sheet.paste(im, (140 + j * 262 + (256 - im.width) // 2, i * 262 + 3 + (256 - im.height)))
    sheet.save(os.path.join(out, 'compare.jpg'), quality=88)
    # kit.png: the concept on top, the renders below in the sheet's order (each fitted to its own box), the kit in use at the bottom
    concept = Image.open(os.path.join(HERE, 'views', 'sheet.png')).convert('RGB'); concept.thumbnail((1600, 900))
    W = concept.width; strip_h = 420
    kit = Image.new('RGB', (W, concept.height + strip_h + 40), tuple(int(c * 255) for c in harness.BG)); kit.paste(concept, (0, 0))
    d = ImageDraw.Draw(kit); d.text((10, concept.height + 8), 'concept (top)  |  build (below), each from its matched camera and fitted to its own box; IoU and triangles under each', fill=(60, 50, 40))
    widths = {'bed': 0.30, 'stake': 0.06, 'watering-can': 0.13, 'crop-sprout': 0.07, 'crop-growing': 0.11, 'crop-ripe': 0.13, 'crop-thirsty': 0.13}
    x = 10
    for piece, tg, rim, ov in rows:
        w = int(widths[piece] * (W - 20) / sum(widths.values()))
        im = onbg(os.path.join(out, f'{piece}.png'), (w - 8, strip_h - 60))
        kit.paste(im, (x + (w - im.width) // 2, concept.height + 30 + strip_h - 60 - im.height))
        d.text((x + 4, concept.height + strip_h - 10), f'{piece}\nIoU {res[piece]["iou"]:.2f} | {res[piece]["triangles"]} tris', fill=(40, 40, 40))
        x += w
    diorama(os.path.join(out, 'diorama.png'), 2 * px, samples)
    dio = onbg(os.path.join(out, 'diorama.png'), (W // 2, 600))
    full = Image.new('RGB', (W, kit.height + dio.height + 40), kit.getpixel((5, 5))); full.paste(kit, (0, 0))
    full.paste(dio, ((W - dio.width) // 2, kit.height + 30))
    ImageDraw.Draw(full).text((10, kit.height + 8), 'in use: crops dropped on the bed\'s crop_slot empties unscaled (ripe, growing, sprout / thirsty, ripe, growing), stake and can beside', fill=(60, 50, 40))
    full.save(os.path.join(out, 'kit.png'))
    print('mean IoU %.3f' % np.mean([r['iou'] for r in res.values()]))


if __name__ == '__main__' and len(sys.argv) > 1 and sys.argv[1] == 'calibrate':
    calibrate(sys.argv[2:] or PIECES)
elif __name__ == '__main__':
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 384, int(sys.argv[2]) if len(sys.argv) > 2 else 16)
