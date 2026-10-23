"""Fit the study lights to the reference (one-off): build an assembled arm, then search key/fill/world settings
for the lowest image terms (ssim + edge + tone). Prints the best settings for stage.py."""
import itertools, json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import numpy as np
from PIL import Image
import build, stage  # build puts paper-warrior on the path for loss
import loss

arm = sys.argv[1] if len(sys.argv) > 1 else 'B'
build.build_scene(os.path.join(HERE, 'runs', arm), build.ORDER)
import bpy
_, floor = stage.setup(256, 12)
sc = bpy.context.scene
key, fill = bpy.data.objects['Key'], bpy.data.objects['Fill']
wbg = sc.world.node_tree.nodes['Background']
R = 256
ref = np.asarray(Image.open(stage.REF).convert('RGB').resize((R, R), Image.LANCZOS)) / 255.0
ref_m = np.asarray(Image.open(stage.REF_MASK).convert('L').resize((R, R))) > 127
bg = stage.backdrop(R)
res = []
for ke, kel, kaz, fe, we in itertools.product([2.5, 4.0], [30, 50], [-45, -20, 25], [0.3, 0.8], [0.3, 0.6]):
    key.data.energy = ke; key.rotation_euler = (math.radians(kel), 0, math.radians(kaz))
    fill.data.energy = fe; fill.rotation_euler = (math.radians(70), 0, math.radians(-kaz * 1.2))
    wbg.inputs['Strength'].default_value = we
    p = os.path.join(HERE, '.tmp', 'tune.png'); sc.render.filepath = p; bpy.ops.render.render(write_still=True)
    a = np.asarray(Image.open(p).convert('RGBA')) / 255.0
    rgb = a[..., :3] * a[..., 3:] + bg * (1 - a[..., 3:])
    t = loss.score(ref_m, ref_m, rgb, ref)
    img = t['ssim'] * 0.2 + t['edge'] * 0.2 + t['tone'] * 0.6
    res.append((img, dict(key=ke, elev=kel, azim=kaz, fill=fe, world=we), {k: round(t[k], 3) for k in ('ssim', 'edge', 'tone')}))
    print(round(img, 4), res[-1][1], res[-1][2], flush=True)
res.sort(key=lambda r: r[0])
print('BEST', json.dumps(res[:3], default=str))
