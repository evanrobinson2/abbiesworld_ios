"""Bring the Meshy image-to-3D brute into the study frame and shoot extra reference views from it.

python3 align_meshy.py meshy/bruiser_meshy.glb            (Meshy mesh -> meshy/aligned.glb, ref/views/meshy_*.png)
python3 align_meshy.py mpfb/bruiser_mpfb.glb mpfb       (MPFB anatomy body -> mpfb/aligned.glb, ref/views/mpfb_*.png)

1. Import the GLB, scale it to 2.0 m tall, feet on z = 0, centred on x = 0, facing -Y.
2. Search a small turn about Z and a nudge in x / z so its silhouette from the study camera best matches ref/mask.png.
3. Write meshy/aligned.glb, meshy/align.json (transform and the front IoU), and ref/views/<view>.png:
   front (the study camera), left / right sides, back and two three-quarter views, all same lens and distance,
   with a matching silhouette mask ref/views/<view>_mask.png. Jobs use these as the second and third shots the
   front-only reference lacks; the Meshy mesh itself is only a guide, never the deliverable.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import stage  # noqa: E402

VIEWS = {'front': 0, 'three_quarter_left': 45, 'left': 90, 'back': 180, 'right': -90, 'three_quarter_right': -45}


def load(path):
    import bpy
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    root = bpy.data.objects.new('meshy_root', None); bpy.context.scene.collection.objects.link(root)
    for o in bpy.context.scene.objects:
        if o.parent is None and o is not root:
            o.parent = root
    bpy.context.view_layer.update()
    pts = np.array([tuple(o.matrix_world @ v.co) for o in meshes for v in o.data.vertices])
    lo, hi = pts.min(0), pts.max(0)
    s = 2.0 / (hi[2] - lo[2])
    root.scale = (s, s, s)
    root.location = (-(lo[0] + hi[0]) / 2 * s, -(lo[1] + hi[1]) / 2 * s, -lo[2] * s)
    clay = bpy.data.materials.new('Clay'); clay.use_nodes = True
    clay.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.33, 0.33, 0.32, 1)
    for o in meshes:
        o.data.materials.clear(); o.data.materials.append(clay)
    return root, meshes


def mask_render(res=256):
    import bpy
    sc = bpy.context.scene
    p = os.path.join(HERE, '.tmp', f'align_{os.getpid()}.png'); sc.render.filepath = p
    bpy.ops.render.render(write_still=True)
    return np.asarray(Image.open(p).convert('RGBA'))[..., 3] > 127


def main():
    import bpy
    path = sys.argv[1]
    tag = sys.argv[2] if len(sys.argv) > 2 else 'meshy'
    os.makedirs(os.path.join(HERE, '.tmp'), exist_ok=True)
    root, meshes = load(path)
    _, floor = stage.setup(256, 1)
    floor.hide_render = True
    ref = np.asarray(Image.open(stage.REF_MASK).convert('L').resize((256, 256))) > 127
    base = tuple(root.location)
    iou = lambda m: float((m & ref).sum() / max((m | ref).sum(), 1))
    best = (-1, None)
    # Facing: Meshy usually faces -Y or +Y; try both, then refine the turn and nudge.
    # FIXED_TURN=0 keeps the body square to the camera (used for the anatomy body, whose job is depth, not pose).
    fixed = os.environ.get('FIXED_TURN')
    turns = [int(fixed)] if fixed is not None else range(-30, 31, 10)
    for face in ((0,) if fixed is not None else (0, 180)):
        for rz in turns:
            root.rotation_euler = (0, 0, math.radians(face + rz)); root.location = base
            v = iou(mask_render())
            if v > best[0]:
                best = (v, (face + rz, 0.0, 0.0))
    rz0 = best[1][0]
    for rz in ([rz0] if fixed is not None else np.arange(rz0 - 8, rz0 + 9, 4)):
        for dx in (-0.03, 0, 0.03):
            for dz in (-0.02, 0, 0.02):
                root.rotation_euler = (0, 0, math.radians(rz)); root.location = (base[0] + dx, base[1], base[2] + dz)
                v = iou(mask_render())
                if v > best[0]:
                    best = (v, (float(rz), dx, dz))
    rz, dx, dz = best[1]
    root.rotation_euler = (0, 0, math.radians(rz)); root.location = (base[0] + dx, base[1], base[2] + dz)
    bpy.context.view_layer.update()
    out = os.path.join(HERE, tag); os.makedirs(out, exist_ok=True)
    json.dump(dict(source=os.path.relpath(path, HERE), scale=root.scale[0], turn_deg=rz, location=list(root.location), front_iou=best[0]),
              open(os.path.join(out, 'align.json'), 'w'), indent=1)
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'aligned.glb'), export_format='GLB', export_apply=True, use_selection=True)

    # Extra shots: turn the figure (not the camera) so every view uses the study lens, distance and light.
    vdir = os.path.join(HERE, 'ref', 'views'); os.makedirs(vdir, exist_ok=True)
    sc = bpy.context.scene; sc.cycles.samples = 48; sc.render.resolution_x = sc.render.resolution_y = 1024
    bg = stage.backdrop(1024)
    for name, turn in VIEWS.items():
        root.rotation_euler = (0, 0, math.radians(rz + turn))
        floor.hide_render = False; sc.cycles.samples = 48
        p = os.path.join(HERE, '.tmp', 'view.png'); sc.render.filepath = p; bpy.ops.render.render(write_still=True)
        a = np.asarray(Image.open(p).convert('RGBA')) / 255.0
        rgb = a[..., :3] * a[..., 3:] + bg * (1 - a[..., 3:])
        Image.fromarray((rgb * 255).astype(np.uint8)).save(os.path.join(vdir, f'{tag}_{name}.png'))
        floor.hide_render = True; sc.cycles.samples = 4
        m = mask_render(1024)
        Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(vdir, f'{tag}_{name}_mask.png'))
    print(json.dumps(dict(front_iou=best[0], turn=rz, dx=dx, dz=dz)))


if __name__ == '__main__':
    main()
