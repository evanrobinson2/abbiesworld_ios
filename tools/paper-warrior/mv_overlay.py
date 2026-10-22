"""Silhouette overlays for every view: white = both, blue = reference only, red = model only. usage: mv_overlay.py params.json out.png"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, bpy
from PIL import Image
import build, mv_fit
p = json.load(open(sys.argv[1])); N = 384
build.clear_scene(); parts = build.build_figure(p, 1, with_stage=False)
tiles = []
for v in mv_fit.VIEWS:
    q = dict(p['cam']); q.update(p['mv'][v])
    for ob in [o for o in bpy.data.objects if o.type == 'CAMERA']: bpy.data.objects.remove(ob, do_unlink=True)
    build.build_camera(dict(p, cam=q), N, N)
    m = build.silhouette(p, parts, N, N); t = mv_fit.loss.load_mask(os.path.join(mv_fit.ROOT, 'mv', f'{v}_mask.png'), N)
    ov = np.zeros((N, N, 3), np.uint8); ov[m & t] = 235; ov[t & ~m] = (60, 140, 255); ov[m & ~t] = (255, 90, 60)
    tiles.append(ov)
Image.fromarray(np.concatenate(tiles, 1)).save(sys.argv[2])
