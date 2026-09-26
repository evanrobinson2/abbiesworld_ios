"""Export one named clip from a Meshy GLB as a Y-up USDZ."""
import bpy
import sys

argv = sys.argv[sys.argv.index("--") + 1 :]
glb_path, clip_name, out_path = argv[:3]
out_name = argv[3] if len(argv) > 3 else clip_name.split("|")[-2] if "|" in clip_name else clip_name

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=glb_path)

for obj in list(bpy.data.objects):
    if obj.type == "MESH" and obj.name != "char1":
        bpy.data.objects.remove(obj, do_unlink=True)

arm = bpy.data.objects["Armature"]
action = bpy.data.actions[clip_name]
action.name = out_name
for track in arm.animation_data.nla_tracks:
    track.name = out_name
    track.mute = False
    for strip in track.strips:
        length = max(1, int(round(action.frame_range[1] - action.frame_range[0])))
        strip.frame_start = 1
        strip.frame_end = 1 + length

arm.animation_data.action = action
scene = bpy.context.scene
length = max(1, int(round(action.frame_range[1] - action.frame_range[0])))
scene.frame_start = 1
scene.frame_end = 1 + length

bpy.ops.wm.usd_export(
    filepath=out_path,
    check_existing=False,
    export_animation=True,
    export_materials=True,
    generate_preview_surface=True,
    convert_orientation=True,
    export_global_up_selection="Y",
    export_global_forward_selection="NEGATIVE_Z",
    export_armatures=True,
    export_meshes=True,
    selected_objects_only=False,
    merge_parent_xform=False,
    root_prim_path="/root",
)
print("EXPORTED", out_name, "frames", length, out_path)
