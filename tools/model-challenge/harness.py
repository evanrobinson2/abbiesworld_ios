"""Model challenge harness: render a GLB from the turnaround cameras and score it against the Midjourney sheet.

usage:
  python harness.py render MODEL.glb OUTDIR [--px 512] [--samples 24]
      writes OUTDIR/front.png side.png back.png hero.png (RGBA, transparent background) and stats.json
  python harness.py score OUTDIR MJDIR
      MJDIR holds view_front.png view_side.png view_back.png (split_views.py output) and hero.png.
      writes OUTDIR/score.json and OUTDIR/compare.jpg (rows: target | render | overlay)

Conventions every model must follow: Blender Z up, metres, origin at the centre of the footprint on the ground,
the object's front faces -Y (what Blender's Front view shows). Side view looks from +X (the object's left side), back from +Y.
Masks: the render's alpha; the target is the pixels that differ from the backdrop (estimated per row), minus
cast shadows (backdrop darkened without a hue shift), small holes filled.
IoU is computed after cropping both masks to their bounding boxes and fitting them into the same square, so
scale and placement in the image don't count, only shape and proportions.
"""
import sys, os, json, math, argparse
import numpy as np
from PIL import Image, ImageDraw

VIEWS = {'front': (0.0, -1.0, 0.0), 'side': (1.0, 0.0, 0.0), 'back': (0.0, 1.0, 0.0)}
HERO_DIR = (0.62, -0.78, 0.42)
BG = (0.93, 0.90, 0.84)
LIGHT = (3.2, 0.9)            # sun strength, world strength


def _scene(glb, px, samples):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.render.resolution_x = sc.render.resolution_y = px
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (*BG, 1); w.node_tree.nodes['Background'].inputs[1].default_value = LIGHT[1]
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = LIGHT[0]
    sun.rotation_euler = (math.radians(50), 0, math.radians(35)); sc.collection.objects.link(sun)
    meshes = [o for o in sc.objects if o.type == 'MESH']
    pts = []
    for o in meshes:
        for c in o.bound_box:
            pts.append(o.matrix_world @ __import__('mathutils').Vector(c))
    lo = np.min(np.array(pts), 0); hi = np.max(np.array(pts), 0)
    tris = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for o in meshes:
        m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    return sc, lo, hi, tris, len(meshes)


def _cam(sc, lo, hi, d, ortho):
    import bpy, mathutils
    c = (lo + hi) / 2; size = float(np.linalg.norm(hi - lo))
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    d = mathutils.Vector(d).normalized()
    cam.location = mathutils.Vector(c) + d * size * 3
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        cam.data.type = 'ORTHO'; cam.data.ortho_scale = size * 1.1
    else:
        cam.data.lens = 50; cam.data.sensor_width = 36
        cam.location = mathutils.Vector(c) + d * size * 1.9
    cam.data.clip_end = size * 10
    return cam


def render(glb, out, px=512, samples=24):
    import bpy
    os.makedirs(out, exist_ok=True)
    sc, lo, hi, tris, n = _scene(glb, px, samples)
    for name, d in list(VIEWS.items()) + [('hero', HERO_DIR)]:
        cam = _cam(sc, lo, hi, d, name != 'hero')
        sc.render.filepath = os.path.join(out, f'{name}.png'); bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(cam)
    stats = dict(triangles=tris, meshes=n, bounds_min=[float(x) for x in lo], bounds_max=[float(x) for x in hi],
                 dimensions_m=[float(x) for x in hi - lo], animations=[a.name for a in bpy.data.actions])
    json.dump(stats, open(os.path.join(out, 'stats.json'), 'w'), indent=1)
    return stats


# ------------------------------------------------------------------ scoring
def target_mask(path, thresh=0.10):
    from scipy import ndimage
    a = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    # Midjourney backdrops are gradients, so the background is estimated per row from the left and right edges
    # (rows where the object touches the edge are skipped and filled in from the rows above and below)
    edge = np.concatenate([a[:, :6], a[:, -6:]], 1); top = np.median(a[:6].reshape(-1, 3), 0)
    rowbg = np.median(edge, 1); ok = (np.linalg.norm(edge - top, axis=-1) < 0.15).mean(1) > 0.8
    ys = np.arange(len(rowbg))
    if ok.sum() > 10:
        rowbg = np.stack([np.interp(ys, ys[ok], rowbg[ok, c]) for c in range(3)], 1)
    else:
        rowbg = np.repeat(top[None], len(rowbg), 0)
    bg = ndimage.median_filter(rowbg, size=(25, 1))[:, None, :]
    m = np.linalg.norm(a - bg, axis=-1) > thresh
    # cast shadows are the backdrop darkened without a change of hue: drop them, they aren't the object
    r = a / np.maximum(bg, 1e-3); lum = r.mean(-1)
    shadow = (lum > 0.35) & (lum < 0.97) & (r.std(-1) / np.maximum(lum, 1e-3) < 0.035)
    m &= ~shadow
    m = ndimage.binary_opening(m, iterations=1)
    lab, k = ndimage.label(m)
    if k:
        sizes = ndimage.sum(m, lab, range(1, k + 1)); keep = np.where(sizes >= 0.02 * sizes.max())[0] + 1
        m = np.isin(lab, keep)
    holes = ndimage.binary_fill_holes(m) & ~m          # fill only small holes (specks inside the object);
    hl, hk = ndimage.label(holes)                       # big ones are real gaps, e.g. between beam cords
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m = m | np.isin(hl, np.where(hs < 0.01 * m.size)[0] + 1)
    return m, a


def render_mask(path):
    a = np.asarray(Image.open(path).convert('RGBA')).astype(float) / 255
    return a[..., 3] > 0.5, a


def norm_mask(m, n=256):
    ys, xs = np.where(m)
    if len(ys) == 0:
        return np.zeros((n, n), bool)
    m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = m.shape; s = (n - 8) / max(h, w)
    im = Image.fromarray((m * 255).astype(np.uint8)).resize((max(1, round(w * s)), max(1, round(h * s))), Image.BILINEAR)
    sq = Image.new('L', (n, n), 0); sq.paste(im, ((n - im.width) // 2, n - 4 - im.height))
    return np.asarray(sq) > 127


def aspect(m):
    ys, xs = np.where(m)
    return (np.ptp(ys) + 1) / (np.ptp(xs) + 1) if len(ys) else 0.0


def mean_color(a, m):
    return a[..., :3][m].mean(0) if m.any() else np.zeros(3)


def score(out, mj):
    res = {}; rows = []
    for v in VIEWS:
        tp = os.path.join(mj, f'view_{v}.png')
        if not os.path.exists(tp):
            continue
        mt, at = target_mask(tp); mr, ar = render_mask(os.path.join(out, f'{v}.png'))
        nt, nr = norm_mask(mt), norm_mask(mr)
        iou = float((nt & nr).sum() / max(1, (nt | nr).sum()))
        ht, hr = aspect(mt), aspect(mr)
        col = float(np.linalg.norm(mean_color(at, mt) - mean_color(ar, mr)))
        res[v] = dict(iou=round(iou, 3), aspect_target=round(float(ht), 3), aspect_render=round(float(hr), 3), mean_color_dist=round(col, 3))
        ov = np.full((256, 256, 3), (245, 242, 235), np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
        tgt = Image.open(tp).convert('RGB'); tgt.thumbnail((256, 256))
        r = Image.open(os.path.join(out, f'{v}.png')).convert('RGBA'); rim = Image.new('RGB', r.size, tuple(int(c * 255) for c in BG)); rim.paste(r, (0, 0), r); rim.thumbnail((256, 256))
        rows.append((v, tgt, rim, Image.fromarray(ov), iou))
    if res:
        res['mean_iou'] = round(float(np.mean([res[v]['iou'] for v in VIEWS if v in res])), 3)
    sheet = Image.new('RGB', (3 * 260 + 10, len(rows) * 280 + 10), 'white'); d = ImageDraw.Draw(sheet)
    for i, (v, t, r, o, iou) in enumerate(rows):
        for j, im in enumerate((t, r, o)):
            sheet.paste(im, (5 + j * 260, 5 + i * 280))
        d.text((8, 5 + i * 280 + 260), f'{v}  IoU {iou:.3f}   (orange = target only, blue = render only, purple = both)', fill='black')
    sheet.save(os.path.join(out, 'compare.jpg'), quality=88)
    json.dump(res, open(os.path.join(out, 'score.json'), 'w'), indent=1)
    return res


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('cmd'); ap.add_argument('a'); ap.add_argument('b')
    ap.add_argument('--px', type=int, default=512); ap.add_argument('--samples', type=int, default=24)
    x = ap.parse_args()
    if x.cmd == 'render':
        print(json.dumps(render(os.path.abspath(x.a), os.path.abspath(x.b), x.px, x.samples)))
    else:
        print(json.dumps(score(x.a, x.b), indent=1))
