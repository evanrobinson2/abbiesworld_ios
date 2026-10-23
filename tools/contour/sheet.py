"""Picture beside model, same camera: each turnaround view on top, our model rendered from that view's turn below.

python3 sheet.py --stage ../bruiser-study --glb out/body.glb --view front:0:ref/views/mj_front.png ... --out sheet.jpg
"""
import argparse
import math
import os

import numpy as np
from PIL import Image, ImageDraw

from contour import load_stage


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--stage', required=True); ap.add_argument('--glb', required=True)
    ap.add_argument('--view', action='append', required=True); ap.add_argument('--out', required=True)
    ap.add_argument('--res', type=int, default=512); ap.add_argument('--samples', type=int, default=24)
    a = ap.parse_args()
    import bpy
    st = load_stage(a.stage)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=a.glb)
    root = bpy.data.objects.new('root', None); bpy.context.scene.collection.objects.link(root)
    for o in list(bpy.data.objects):
        if o.type == 'MESH':
            o.parent = root
    st.setup(a.res, a.samples)
    sc = bpy.context.scene
    top, bot = [], []
    for v in a.view:
        name, turn, path = v.split(':', 2)
        path = path if os.path.isabs(path) else os.path.join(a.stage, path)
        root.rotation_euler = (0, 0, math.radians(float(turn)))
        p = os.path.join(os.path.dirname(os.path.abspath(a.out)), f'.render_{name}.png'); sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        r = np.asarray(Image.open(p).convert('RGBA')) / 255.0; os.remove(p)
        pic = np.asarray(Image.open(path).convert('RGB').resize((a.res, a.res))) / 255.0
        bg = np.median(pic[:, :8].reshape(-1, 3), 0)
        bot.append(r[..., :3] * r[..., 3:] + bg * (1 - r[..., 3:])); top.append(pic)
    img = np.concatenate([np.concatenate(top, 1), np.concatenate(bot, 1)], 0)
    im = Image.fromarray((img * 255).astype(np.uint8)); d = ImageDraw.Draw(im)
    for i, v in enumerate(a.view):
        d.text((i * a.res + 8, 8), v.split(':')[0] + ' (picture)', fill=(20, 20, 20))
        d.text((i * a.res + 8, a.res + 8), v.split(':')[0] + ' (ours, same camera)', fill=(20, 20, 20))
    im.save(a.out, quality=88)


if __name__ == '__main__':
    main()
