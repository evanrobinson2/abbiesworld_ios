"""Re-export a GLB centred in x/y with its feet at z = 0 (Blender axes; the model faces -Y).

Run: Blender -b -P tools/bruiser-study/recipe/normalize_glb.py -- IN.glb OUT.glb
"""
import sys

import bpy
from mathutils import Vector

src, dst = sys.argv[sys.argv.index("--") + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
pts = [o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
lo = Vector([min(p[i] for p in pts) for i in range(3)])
hi = Vector([max(p[i] for p in pts) for i in range(3)])
shift = Vector((-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z))
for o in bpy.context.scene.objects:
    if o.parent is None:
        o.location += shift
bpy.ops.export_scene.gltf(filepath=dst)
print("NORMALIZED", dst, "height", round(hi.z - lo.z, 3))
