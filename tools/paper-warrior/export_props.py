"""Export each fitted prop as a standalone GLB for the web viewer: built from its fitted shape, paper material,
centred on the origin with its base at z=0, Blender Z-up converted to glTF Y-up by the exporter.
usage: python export_props.py PROPS_DIR OUT_DIR [fit file name]"""
import sys, os, json, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, bpy
from mathutils import Vector as V, Matrix
import build, props, paper
pdir, od = sys.argv[1], sys.argv[2]; fitname = sys.argv[3] if len(sys.argv) > 3 else 'fit.json'
os.makedirs(od, exist_ok=True); man = {}
for name, fn in props.BUILDERS.items():
    build.clear_scene()
    p = json.load(open(os.path.join(pdir, name, fitname)))
    objs = fn(p['shape'])
    m = p['material']
    mat = paper.paper_material(albedo=min(0.95, m['albedo'] * 1.35), rough=m.get('rough', 0.85), sheen=m.get('sheen', 0.2), fibre=0, tint=tuple(m.get('tint', (1.0, 0.97, 0.9))))
    a = np.concatenate([np.array([v.co[:] for v in o.data.vertices]) for o in objs]); lo, hi = a.min(0), a.max(0); c = (lo + hi) / 2
    tris = 0
    for o in objs:
        o.data.transform(Matrix.Translation(V((-c[0], -c[1], -lo[2]))))
        for poly in o.data.polygons: poly.use_smooth = False
        o.data.materials.clear(); o.data.materials.append(mat)
        o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    path = os.path.join(od, f'{name}.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True)
    man[name] = dict(file=f'{name}.glb', triangles=tris, size_m=[round(x, 3) for x in (hi - lo)], sha256=hashlib.sha256(open(path, 'rb').read()).hexdigest())
json.dump(man, open(os.path.join(od, 'props.json'), 'w'), indent=1)
print(json.dumps({k: (v['triangles'], v['size_m']) for k, v in man.items()}))
