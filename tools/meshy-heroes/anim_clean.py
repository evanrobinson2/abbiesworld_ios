"""Turn a Meshy animation GLB (full character + clip) into a small clip on the game's 20-bone rig.

    python3 anim_clean.py <in.glb> <out.glb> <clip name>      (needs `pip install bpy`)

Keeps only the armature and its action: Meshy's bones are renamed to the hero rig's names (cleanup.py RENAME),
bones the hero rig drops (Spine01, head tips, toes) are removed with their keys, the 0.01 armature scale is applied so
the clip is in metres, and the action is named after the clip. Any hero cleaned by cleanup.py plays it as is.
"""
import sys
from pathlib import Path
import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cleanup import RENAME, MERGE


def fcurves(act):
    """All F-curves of an action, for both the old flat actions and Blender 4.4+ layered ones."""
    if getattr(act, "layers", None):
        return [fc for layer in act.layers for strip in layer.strips for cb in strip.channelbags for fc in cb.fcurves]
    return list(act.fcurves)


def main(src, dst, name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=src)
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    for o in [o for o in bpy.data.objects if o != arm]:
        bpy.data.objects.remove(o)
    act = arm.animation_data.action
    # metres: scale the location keys by the armature's 0.01, then apply the scale to the rest pose
    k = arm.scale[0]
    for fc in fcurves(act):
        if fc.data_path.endswith("location"):
            for kp in fc.keyframe_points:
                kp.co[1] *= k; kp.handle_left[1] *= k; kp.handle_right[1] *= k
    bpy.ops.object.select_all(action="DESELECT"); arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    eb["Spine"].parent = eb["Spine02"]
    for b in MERGE:
        if b in eb:
            eb.remove(eb[b])
    root = eb.new("root"); root.head, root.tail = (0, 0, 0), (0, 0.1, 0)
    eb["Hips"].parent = root
    bpy.ops.object.mode_set(mode="OBJECT")
    for old, new in RENAME.items():
        arm.data.bones[old].name = new  # Blender renames the action's channels with the bone
    act.name = name
    bpy.ops.object.select_all(action="DESELECT"); arm.select_set(True)
    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=True, export_animations=True,
                              export_animation_mode="ACTIONS", export_skins=False)


if __name__ == "__main__":
    main(*sys.argv[1:4])
