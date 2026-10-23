"""Score an arm from the side and the back against the Midjourney turnaround (ref/views/mj_*_mask.png).

python3 views_score.py A B C ...   -> runs/<arm>/out/all/views.json and views.png (MJ | ours | overlay, side then back)

The figure is turned (side: front toward image left, as in the turnaround; back: 180 degrees) and rendered from the
study camera; both silhouettes are normalised crown-to-sole and centred before IoU, because the turnaround has its
own scale and is roughly orthographic.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import build  # noqa: E402
import stage  # noqa: E402
from ref_views import normalise  # noqa: E402

TURNS = {'side': -90, 'back': 180, 'front': 0}


def view_masks(arm, chunk_ids=None):
    import bpy
    import bkit
    bkit.SQUARE = True   # imported hero meshes skip the turn that matches his picture
    build.build_scene(os.path.join(HERE, 'runs', arm), chunk_ids or build.ORDER)
    bkit.SQUARE = False
    root = bpy.data.objects.new('turn', None); bpy.context.scene.collection.objects.link(root)
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH' and o.parent is None:
            o.parent = root
    _, floor = stage.setup(512, 4); floor.hide_render = True
    out = {}
    for v, t in TURNS.items():
        root.rotation_euler = (0, 0, math.radians(t))
        p = os.path.join(HERE, '.tmp', f'views_{os.getpid()}.png'); bpy.context.scene.render.filepath = p
        bpy.ops.render.render(write_still=True)
        m = np.asarray(Image.open(p).convert('RGBA'))[..., 3] > 127
        out[v] = normalise(np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((1024, 1024))) > 127)[0]
    return out


def score_arm(arm, chunk_ids=None, out_dir=None):
    """Side / back / front IoU against the turnaround; writes views.json and views.png into out_dir."""
    ms = view_masks(arm, chunk_ids)
    res, panels = {}, []
    for v in ('side', 'back', 'front'):
        ref = np.asarray(Image.open(os.path.join(HERE, 'ref', 'views', f'mj_{v}_mask.png'))) > 127
        m = ms[v]
        res[v] = float((m & ref).sum() / (m | ref).sum())
        if v != 'front':
            over = np.full(m.shape + (3,), 235, np.uint8)
            over[ref & ~m] = (219, 56, 46); over[m & ~ref] = (38, 191, 217); over[m & ref] = (140, 143, 148)
            panels.append(over)
    d = out_dir or os.path.join(HERE, 'runs', arm, 'out', 'all'); os.makedirs(d, exist_ok=True)
    json.dump(res, open(os.path.join(d, 'views.json'), 'w'), indent=1)
    Image.fromarray(np.concatenate(panels, 1)).resize((1024, 512)).save(os.path.join(d, 'views.png'))
    return res


def main():
    for arm in sys.argv[1:]:
        res = score_arm(arm)
        print(arm, {k: round(v, 3) for k, v in res.items()})


if __name__ == '__main__':
    main()
