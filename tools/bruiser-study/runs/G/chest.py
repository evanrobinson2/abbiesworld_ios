"""Arm G: the scaling version. The rings learned from the Meshy mesh (scale/spec) drive its vertices as a cage, then
Decimate takes it to about 3,000 faces (scale/deform.py --ratio 0.1). Materials are named by role. Turned like arm M."""
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(HERE, '..', '..', 'scale', 'out', 'cage_identity_r0.1_welded', 'model.glb')
TURN = -24.0
DX = -0.036   # centres his outline on the picture's after the turn


def build(k):
    import bpy
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=GLB)
    for o in set(bpy.data.objects) - before:
        if o.parent is None and not getattr(k, 'SQUARE', False):   # side/back scoring wants him square
            o.rotation_mode = 'XYZ'; o.rotation_euler.z += math.radians(TURN); o.location.x += DX
