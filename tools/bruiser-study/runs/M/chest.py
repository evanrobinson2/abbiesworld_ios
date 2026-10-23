"""Arm M: the Meshy hero mesh itself (image-to-3D, task 01a167ca), square to the camera in meshy/canonical/, turned
the 24 degrees it needed to match his picture. Not a recipe: it is the target the scaling version learns from."""
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
GLB = os.path.join(HERE, '..', '..', 'meshy', 'canonical', 'meshy_canonical.glb')
TURN = -24.0
DX = -0.036   # centres his outline on the picture's after the turn


def build(k):
    import bpy
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=GLB)
    for o in set(bpy.data.objects) - before:
        if o.parent is None and not getattr(k, 'SQUARE', False):   # side/back scoring wants him square
            o.rotation_mode = 'XYZ'; o.rotation_euler.z += math.radians(TURN); o.location.x += DX
        if o.type == 'MESH':
            o.data.materials.clear(); import kit; o.data.materials.append(kit._material(k.SKIN))
            for p in o.data.polygons:
                p.use_smooth = False
