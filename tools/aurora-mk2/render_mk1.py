"""Render Aurora Mk 1 (RE-072, the shipped Moon ferry) with exactly Mk 2's cameras and light, for the side-by-side."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'moon-base-kit'))
import bkit as k  # noqa: E402
import bpy  # noqa: E402
k.reset()
bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, '..', '..', 'prototypes', 'ranch-atelier', 'dist', 'simulations',
                                                'moon', 'assets', 'RE-072.glb'))
k._parts[:] = [o for o in bpy.data.objects if o.type == 'MESH']
k.render(os.path.join(HERE, 'mk1'), hero_cam=((10.5, -12.0, 6.2), (0, -0.2, 2.0)), samples=32, size=1100,
         fps_eye=((6.2, -3.2, 1.1), (0, 0, 2.2)))
