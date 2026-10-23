"""Roman kit scorer: match a part's GLB to its one Midjourney concept (a single 3/4 product shot, no turnaround).

usage (from tools/roman-kit, with the bpy venv):
  python score.py PART [--calibrate] [--render] [--px 768] [--samples 48]

  PART is a folder under parts/ holding concept.png, concept_mask.png and PART.glb.
  --calibrate   searches yaw / pitch / lens for the camera that best explains the concept (written to cam.json).
                The search runs on the model itself, so the score is a guide, the same caveat as the model challenge.
  --render      Cycles render from cam.json to r/hero.png and r/compare.jpg (concept | render | overlay).
  Always writes r/score.json: silhouette IoU at the calibrated camera, triangle count, size in metres.

The target is concept_mask.png (rembg isnet-general-use cut-out of the concept, made by mask.py). IoU is measured
after cropping both masks to their bounding boxes and fitting them into the same square (harness.norm_mask), so only
shape and proportion count, not placement in the frame. Silhouettes for the camera search are rasterised in numpy
from the evaluated triangles, which takes milliseconds, so thousands of cameras can be tried.
"""
import sys, os, json, math, argparse
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'model-challenge'))
import harness  # noqa: E402  (norm_mask, BG, render settings)


def load(glb):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=glb)
    dg = bpy.context.evaluated_depsgraph_get()
    tris = []
    for o in bpy.context.scene.objects:
        if o.type != 'MESH':
            continue
        e = o.evaluated_get(dg); m = e.to_mesh(); m.calc_loop_triangles()
        mw = np.array(o.matrix_world)
        v = np.array([tuple(x.co) for x in m.vertices]) if len(m.vertices) else np.zeros((0, 3))
        v = (np.c_[v, np.ones(len(v))] @ mw.T)[:, :3]
        for t in m.loop_triangles:
            tris.append(v[list(t.vertices)])
        e.to_mesh_clear()
    return np.array(tris)


def cam_basis(yaw, pitch, roll=0.0):
    """Camera looking at the origin from direction (yaw, pitch); yaw 0 = from the front (-Y), positive yaw swings
    toward +X (the object's left side seen from the front is on the right of the image)."""
    y, p = math.radians(yaw), math.radians(pitch)
    d = np.array([math.sin(y) * math.cos(p), -math.cos(y) * math.cos(p), math.sin(p)])   # camera position direction
    f = -d
    r = np.cross(f, [0, 0, 1.0]); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    if roll:
        c, s_ = math.cos(math.radians(roll)), math.sin(math.radians(roll))
        r, u = c * r + s_ * u, -s_ * r + c * u
    return d, r, u, f


def silhouette(tris, yaw, pitch, lens=50.0, px=192, roll=0.0):
    lo, hi = tris.reshape(-1, 3).min(0), tris.reshape(-1, 3).max(0)
    c = (lo + hi) / 2; size = float(np.linalg.norm(hi - lo))
    d, r, u, f = cam_basis(yaw, pitch, roll)
    dist = size * lens / 36.0 * 1.2                       # keeps the framing the same for every lens
    eye = c + d * dist
    P = tris.reshape(-1, 3) - eye
    z = P @ f; x = (P @ r) / z; yv = (P @ u) / z
    xs = np.c_[x, yv].reshape(-1, 3, 2)
    s = px / 2 / max(np.abs(xs).max(), 1e-9) * 0.95
    pts = xs * s * np.array([1, -1]) + px / 2
    im = Image.new('L', (px, px), 0); dr = ImageDraw.Draw(im)
    for t in pts:
        dr.polygon([tuple(q) for q in t], fill=255)
    return np.asarray(im) > 127


def iou(a, b):
    na, nb = harness.norm_mask(a), harness.norm_mask(b)
    return float((na & nb).sum() / max(1, (na | nb).sum())), na, nb


def target(part_dir):
    return np.asarray(Image.open(os.path.join(part_dir, 'concept_mask.png')).convert('L')) > 127


def square(m, n):
    """Pad a mask to a square, then resize it, so tall (2:3) concepts keep their proportions."""
    h, w = m.shape; k = max(h, w); sq = np.zeros((k, k), bool); sq[(k - h) // 2:(k - h) // 2 + h, (k - w) // 2:(k - w) // 2 + w] = m
    return np.asarray(Image.fromarray(sq).resize((n, n))) > 0


def calibrate(tris, tgt, rolls=(0,), pitches=range(0, 46, 5), yaws=range(-180, 180, 10)):
    best = (-1, None)
    tg = square(tgt, 192)
    lenses = (35, 50, 85)
    for lens in lenses:
        for rl in rolls:
            for yw in yaws:
                for pt in pitches:
                    s = iou(silhouette(tris, yw, pt, lens, 192, rl), tg)[0]
                    if s > best[0]:
                        best = (s, (yw, pt, lens, rl))
    yw0, pt0, lens, rl0 = best[1]
    t2 = square(tgt, 256)
    rr = (rl0,) if len(rolls) == 1 else (rl0 - 4, rl0, rl0 + 4)
    for yw in np.arange(yw0 - 8, yw0 + 8.1, 2):
        for pt in np.arange(pt0 - 6, pt0 + 6.1, 2):
            for ln in (lens * 0.8, lens, lens * 1.25):
                for rl in rr:
                    s = iou(silhouette(tris, yw, pt, ln, 256, rl), t2)[0]
                    if s > best[0]:
                        best = (s, (float(yw), float(pt), float(ln), float(rl)))
    return dict(yaw=best[1][0], pitch=best[1][1], lens=best[1][2], roll=best[1][3])


def cycles_render(glb, cam, out_png, px, samples):
    import bpy, mathutils
    sc, lo, hi, tris, n = harness._scene(glb, px, samples)
    # softer than the harness light so ivory doesn't blow out: AgX, a weaker sun and a fill from the camera side
    sc.view_settings.view_transform = 'AgX'
    for o in sc.objects:
        if o.type == 'LIGHT':
            o.data.energy = 3.4; o.data.angle = 0.2
    sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.45
    c = (lo + hi) / 2; size = float(np.linalg.norm(hi - lo))
    d, r, u, f = cam_basis(cam['yaw'], cam['pitch'], cam.get('roll', 0))
    co = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(co); sc.camera = co
    co.data.lens = cam['lens']; co.data.sensor_width = 36
    co.location = mathutils.Vector(c + d * size * cam['lens'] / 36.0 * 0.85)
    co.rotation_euler = mathutils.Matrix((r, u, -f)).transposed().to_euler()
    co.data.clip_end = size * 50
    # key light from above and to the camera's left, like a product shot
    ld, _, _, _ = cam_basis(cam['yaw'] - 45, min(cam['pitch'] + 45, 80))
    for o in sc.objects:
        if o.type == 'LIGHT':
            o.rotation_euler = mathutils.Vector(-ld).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = out_png; bpy.ops.render.render(write_still=True)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('part'); ap.add_argument('--calibrate', action='store_true')
    ap.add_argument('--render', action='store_true'); ap.add_argument('--px', type=int, default=512)
    ap.add_argument('--samples', type=int, default=24)
    ap.add_argument('--pitch', default='0,45', help='pitch range searched (product shots look down 0 to 45 degrees)')
    ap.add_argument('--yaw', default='-180,170', help='yaw range searched; set it from what the concept shows (the front of a part faces -Y, yaw 90 looks from +X)')
    ap.add_argument('--cam', help='yaw,pitch,lens[,roll]: set the camera by hand instead of searching')
    ap.add_argument('--rolls', default='0', help='comma-separated camera rolls to search, e.g. -45,-30,-15,0 for the gladius')
    a = ap.parse_args()
    # PART is a folder under parts/, or a path to any asset folder laid out the same way
    pd = a.part if os.path.isdir(a.part) else os.path.join(HERE, 'parts', a.part)
    name = os.path.basename(os.path.normpath(pd)); glb = os.path.join(pd, f'{name}.glb'); rd = os.path.join(pd, 'r')
    os.makedirs(rd, exist_ok=True)
    tris = load(glb); tgt = target(pd)
    cp = os.path.join(pd, 'cam.json')
    if a.cam:
        c = [float(x) for x in a.cam.split(',')] + [0.0]
        json.dump(dict(yaw=c[0], pitch=c[1], lens=c[2], roll=c[3], by_hand=True), open(cp, 'w'), indent=1)
    elif a.calibrate or not os.path.exists(cp):
        p0, p1 = (int(x) for x in a.pitch.split(','))
        json.dump(calibrate(tris, tgt, tuple(float(x) for x in a.rolls.split(',')), range(p0, p1 + 1, 5), range(int(a.yaw.split(',')[0]), int(a.yaw.split(',')[1]) + 1, 10)), open(cp, 'w'), indent=1)
    cam = json.load(open(cp))
    tg = square(tgt, 512)
    sil = silhouette(tris, cam['yaw'], cam['pitch'], cam['lens'], 512, cam.get('roll', 0))
    s, nt, nr = iou(tg, sil)
    lo, hi = tris.reshape(-1, 3).min(0), tris.reshape(-1, 3).max(0)
    res = dict(iou=round(s, 3), camera=cam, triangles=int(len(tris)), dimensions_m=[round(float(x), 3) for x in hi - lo])
    if a.render:
        hp = os.path.join(rd, 'hero.png'); cycles_render(glb, cam, hp, a.px, a.samples)
        ov = np.full((256, 256, 3), (245, 242, 235), np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200); ov[nt & nr] = (150, 110, 170)
        con = Image.open(os.path.join(pd, 'concept.png')).convert('RGB'); con.thumbnail((256, 256))
        rr = Image.open(hp).convert('RGBA'); rim = Image.new('RGB', rr.size, tuple(int(x * 255) for x in harness.BG)); rim.paste(rr, (0, 0), rr); rim.thumbnail((256, 256))
        sh = Image.new('RGB', (3 * 260 + 10, 290), 'white'); dr = ImageDraw.Draw(sh)
        for j, im in enumerate((con, rim, Image.fromarray(ov))):
            sh.paste(im, (5 + j * 260, 5))
        dr.text((8, 268), f'{a.part}  IoU {s:.3f}   (orange = concept only, blue = model only, purple = both)', fill='black')
        sh.save(os.path.join(rd, 'compare.jpg'), quality=88)
    json.dump(res, open(os.path.join(rd, 'score.json'), 'w'), indent=1)
    print(json.dumps(res))


if __name__ == '__main__':
    main()
