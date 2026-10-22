"""Final deliverables from the best params: LOD GLBs, a matched proof shot, a turntable, provenance.
usage: python finals.py best.json OUTDIR"""
import sys, os, json, math, hashlib, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import build
from PIL import Image

p = json.load(open(sys.argv[1])); od = sys.argv[2]; os.makedirs(od, exist_ok=True)

def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()

info = {}
for level in (0, 1, 2):
    parts = build.setup(p, level=level, W=1024, H=1024, with_stage=False)
    tris = 0
    for ob in parts:
        ob.data.calc_loop_triangles(); tris += len(ob.data.loop_triangles)
    bpy.ops.object.select_all(action='DESELECT')
    for ob in parts: ob.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    bpy.context.active_object.name = f'paper_warrior_lod{level}'
    path = os.path.join(od, f'paper_warrior_lod{level}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True)
    info[f'lod{level}'] = dict(tris=tris, path=os.path.basename(path), bytes=os.path.getsize(path), sha256=sha(path))
    print('lod', level, tris, flush=True)

# matched proof shot at reference resolution
build.setup(p, level=2, W=1024, H=1024)
proof = os.path.join(od, 'proof_matched_1024.png'); build.render(proof, 1024, 1024, samples=96)
# turntable: 12 views, LOD2
frames = []
for i in range(12):
    q = json.loads(json.dumps(p)); q['fig']['yaw'] = p['fig']['yaw'] + 30 * i
    build.setup(q, level=2, W=384, H=384)
    f = os.path.join(od, f'turn_{i:02d}.png'); build.render(f, 384, 384, samples=32); frames.append(Image.open(f).convert('RGB'))
frames[0].save(os.path.join(od, 'turntable.gif'), save_all=True, append_images=frames[1:], duration=350, loop=0)
sheet = Image.new('RGB', (384 * 6, 384 * 2))
for i, fr in enumerate(frames): sheet.paste(fr, ((i % 6) * 384, (i // 6) * 384))
sheet.save(os.path.join(od, 'turntable_sheet.jpg'), quality=88)
# LOD comparison
tiles = []
for level in (0, 1, 2):
    build.setup(p, level=level, W=420, H=420)
    f = os.path.join(od, f'lod{level}.png'); build.render(f, 420, 420, samples=32); tiles.append(Image.open(f).convert('RGB'))
s = Image.new('RGB', (420 * 3, 420))
for i, t in enumerate(tiles): s.paste(t, (i * 420, 0))
s.save(os.path.join(od, 'lods.jpg'), quality=90)
json.dump(info, open(os.path.join(od, 'lod_info.json'), 'w'), indent=1)
print(json.dumps(info))
