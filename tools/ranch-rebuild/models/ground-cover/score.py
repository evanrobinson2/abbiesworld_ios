"""Silhouette IoU of each ground-cover piece against its crop of the sheet (views/<piece>_mask.png from make_views.py),
rendered with the challenge harness's lens from the sheet's camera: front-on (yaw 0), ELEV deg up. Also renders the
kit contact sheet r/kit.png: the concept's two rows on top, all 9 pieces laid out the same way below, from that camera.
usage: python score.py [px] [samples]          score every piece, write r/score.json and r/compare.jpg
       python score.py kit [px] [samples]      render r/kit.png
       python score.py calibrate               try a few elevations on every piece
"""
import sys, os, json, math
import numpy as np
from PIL import Image, ImageDraw
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

ELEV, DIST = 16.0, 1.9
PIECES = ['tuft-a', 'tuft-b', 'tuft-c', 'tuft-d', 'tuft-e', 'tuft-f', 'clover-patch', 'wildflower-clump', 'path-edge']
# where each piece stands in the kit render (x, y in metres), copying the sheet's two rows
LAYOUT = {'tuft-a': (-0.95, 0.0), 'tuft-b': (-0.38, 0.0), 'tuft-c': (0.05, 0.0), 'tuft-d': (0.62, 0.0),
          'tuft-e': (1.20, 0.0), 'tuft-f': (-1.22, -1.0), 'clover-patch': (-0.45, -1.0),
          'wildflower-clump': (0.25, -1.0), 'path-edge': (0.98, -1.0)}


def direction(elev):
    e = math.radians(elev)
    return (0.0, -math.cos(e), math.sin(e))


def cull_backfaces():
    """Cycles draws both sides of every face. Single-sided glTF materials (doubleSided false, which import as
    use_backface_culling) get a backfacing -> transparent mix, so the render shows what the game's FrontSide shows."""
    import bpy
    for m in bpy.data.materials:
        if not (m.use_backface_culling and m.use_nodes):
            continue
        nt = m.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
        link = out.inputs['Surface'].links[0]; src = link.from_socket
        geo = nt.nodes.new('ShaderNodeNewGeometry'); tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mx = nt.nodes.new('ShaderNodeMixShader')
        nt.links.new(geo.outputs['Backfacing'], mx.inputs[0]); nt.links.new(src, mx.inputs[1])
        nt.links.new(tr.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs['Surface'])


def shot(glb, path, elev, px, samples):
    import bpy, mathutils
    sc, lo, hi, tris, n = harness._scene(os.path.abspath(glb), px, samples)
    cull_backfaces()
    cam = harness._cam(sc, lo, hi, direction(elev), False)
    c = (lo + hi) / 2; size = float(np.linalg.norm(hi - lo))
    cam.location = mathutils.Vector(c) + mathutils.Vector(direction(elev)).normalized() * size * DIST
    sc.render.filepath = os.path.abspath(path)
    bpy.ops.render.render(write_still=True)
    return tris


def iou(name, path):
    nt = harness.norm_mask(np.asarray(Image.open(os.path.join(HERE, 'views', name + '_mask.png'))) > 127)
    nr = harness.norm_mask(harness.render_mask(path)[0])
    return float((nt & nr).sum() / max(1, (nt | nr).sum())), nt, nr


def score(px=384, samples=16):
    out = os.path.join(HERE, 'r'); os.makedirs(out, exist_ok=True)
    res = {}; rows = []
    for name in PIECES:
        p = os.path.join(out, name + '.png')
        tris = shot(os.path.join(HERE, name + '.glb'), p, ELEV, px, samples)
        v, nt, nr = iou(name, p)
        res[name] = dict(iou=round(v, 3), triangles=tris)
        ov = np.full((256, 256, 3), 245, np.uint8); ov[nt & ~nr] = (230, 120, 60); ov[nr & ~nt] = (40, 110, 200)
        ov[nt & nr] = (150, 110, 170)
        tgt = Image.open(os.path.join(HERE, 'views', name + '.png')).convert('RGB'); tgt.thumbnail((256, 256))
        r = Image.open(p).convert('RGBA'); rim = Image.new('RGB', r.size, tuple(int(c * 255) for c in harness.BG))
        rim.paste(r, (0, 0), r); rim = rim.resize((256, 256))
        rows.append((name, tgt, rim, Image.fromarray(ov), v))
        print('%-17s IoU %.3f  tris %d' % (name, v, tris))
    res['mean_iou'] = round(float(np.mean([res[n]['iou'] for n in PIECES])), 3)
    res['camera'] = dict(yaw=0, elev=ELEV, dist=DIST, lens='harness 50 mm / 36 mm')
    json.dump(res, open(os.path.join(out, 'score.json'), 'w'), indent=1)
    sheet = Image.new('RGB', (3 * 260 + 10, len(rows) * 262 + 4), 'white'); d = ImageDraw.Draw(sheet)
    for i, (name, *ims, v) in enumerate(rows):
        for j, im in enumerate(ims):
            sheet.paste(im, (5 + j * 260, 4 + i * 262))
        d.text((10, 8 + i * 262), '%s  IoU %.3f' % (name, v), fill=(0, 0, 0))
    sheet.save(os.path.join(out, 'compare.jpg'), quality=88)
    print('mean IoU', res['mean_iou'])


def kit(px=1600, samples=48, elev=None, outname='kit.png'):
    elev = ELEV if elev is None else elev
    import bpy, mathutils
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for name in PIECES:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, name + '.glb'))
        for o in set(bpy.data.objects) - before:
            if o.parent is None:
                o.location.x += LAYOUT[name][0]; o.location.y += LAYOUT[name][1]
    cull_backfaces()
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = False
    sc.render.resolution_x = px; sc.render.resolution_y = int(px * 9 / 16 * 0.62)
    sc.view_settings.view_transform = 'Standard'
    bg = harness.target_mask  # noqa (keeps the import obviously used)
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.92, 0.84, 0.64, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = harness.LIGHT[1]
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = harness.LIGHT[0]
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-40)); sc.collection.objects.link(sun)   # light from the right, shadows fall left as on the sheet
    # a cream ground plane that only catches shadows
    bpy.ops.mesh.primitive_plane_add(size=8); g = bpy.context.object; g.is_shadow_catcher = True
    sc.render.film_transparent = True
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 50; cam.data.sensor_width = 36
    target = mathutils.Vector((0.0, -0.5, 0.12)); d = mathutils.Vector(direction(elev))
    cam.location = target + d * (4.6 if elev < 30 else 5.2); cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    p = os.path.join(HERE, 'r', '_kit_render.png'); sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    r = Image.open(p).convert('RGBA')
    cream = Image.new('RGB', r.size, (245, 235, 206)); cream.paste(r, (0, 0), r)
    sh = Image.open(os.path.join(HERE, '..', '..', 'mj', 'ground-cover', 'sheet.png')).convert('RGB')
    concept = sh.crop((0, int(240 * 1.456), sh.width, int(790 * 1.456)))
    concept = concept.resize((cream.width, round(concept.height * cream.width / concept.width)))
    out = Image.new('RGB', (cream.width, concept.height + cream.height + 60), 'white'); dr = ImageDraw.Draw(out)
    out.paste(concept, (0, 30)); out.paste(cream, (0, concept.height + 60))
    dr.text((10, 8), 'concept: mj/ground-cover/sheet.png (crop)', fill=(0, 0, 0))
    dr.text((10, concept.height + 38), 'kit: 9 GLBs, front-on from %d deg up (Cycles, harness light)' % elev, fill=(0, 0, 0))
    out.save(os.path.join(HERE, 'r', outname)); os.remove(p)
    print('r/' + outname + ' written', out.size)


def calibrate():
    tmp = os.path.join(HERE, 'r', '_cal.png')
    for e in (6, 10, 14, 18, 24):
        vals = []
        for name in PIECES:
            shot(os.path.join(HERE, name + '.glb'), tmp, e, 160, 1); vals.append(iou(name, tmp)[0])
        print('elev %2d mean %.3f  ' % (e, np.mean(vals)) + ' '.join('%.2f' % v for v in vals))
    os.remove(tmp)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == 'calibrate':
        calibrate()
    elif a and a[0] == 'kit':
        kit(*(int(x) for x in a[1:3]))
    elif a and a[0] == 'kit45':
        kit(*(int(x) for x in a[1:3]), elev=45, outname='kit_45.png')
    else:
        score(*(int(x) for x in a[:2]))
