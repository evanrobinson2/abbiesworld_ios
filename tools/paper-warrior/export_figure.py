"""Export a whole figure (all parts, one GLB) for the web viewer. usage: python export_figure.py params.json out.glb [--level 1] [--kit PROPS_DIR]"""
import sys, os, json, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
from mathutils import Matrix, Vector as V
import build
ap = argparse.ArgumentParser(); ap.add_argument('params'); ap.add_argument('out'); ap.add_argument('--level', type=int, default=1); ap.add_argument('--kit')
a = ap.parse_args()
if a.kit:
    import dress; dress.install(a.kit)
p = json.load(open(a.params))
build.clear_scene()
parts = build.build_figure(p, a.level, with_stage=False)
f = p['fig']
for ob in parts:   # face the viewer: undo the figure's turn and centre it
    ob.data.transform(Matrix.Rotation(-__import__('math').radians(f['yaw']), 4, 'Z') @ Matrix.Translation(V((-f['x'], -f['y'], 0))))
bpy.ops.object.select_all(action='DESELECT')
for ob in parts: ob.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.export_scene.gltf(filepath=a.out, export_format='GLB', use_selection=True, export_apply=True)
print(a.out, sum(len(o.data.polygons) for o in parts))
