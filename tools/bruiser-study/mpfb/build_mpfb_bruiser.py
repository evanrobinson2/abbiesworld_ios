"""AW-STUDY-0021: an MPFB (MakeHuman) body tuned to the bruiser, used as the anatomy reference.

Run: Blender -b -P tools/bruiser-study/mpfb/build_mpfb_bruiser.py
Rigs the body with MPFB's Rigify human (toes) meta-rig, generates the Rigify rig and poses the arms
down into the bruiser's relaxed stance. Writes bruiser_mpfb_rigged.blend (rest A-pose, Rigify
controls), bruiser_mpfb.glb (posed, smooth), bruiser_mpfb_lowpoly.glb (posed, decimated, flat
shaded) and front/side orthographic renders next to this file.
"""
import math
import os
import bpy
import addon_utils
from mathutils import Matrix, Vector
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService
from bl_ext.blender_org.mpfb.services.rigservice import RigService

HERE = os.path.dirname(os.path.abspath(__file__))

# Macros: adult male, maximum muscle, heavy, tall, with idealised (heroic) proportions.
MACROS = {
    "gender": 1.0, "age": 0.5, "muscle": 1.0, "weight": 1.0,
    "proportions": 1.0, "height": 0.75, "cupsize": 0.5, "firmness": 0.5,
    "race": {"asian": 0.33, "caucasian": 0.34, "african": 0.33},
}

# Detail targets that push the body toward the bruiser: huge shoulders and arms,
# thick neck, short legs relative to a deep, wide torso.
TARGETS = {
    "torso/measure-shoulder-dist-incr": 1.0,
    "torso/torso-scale-horiz-incr": 1.0,
    "torso/torso-scale-depth-incr": 0.8,
    "torso/torso-muscle-pectoral-incr": 0.8,
    "torso/torso-muscle-dorsi-incr": 1.0,
    "torso/measure-waist-circ-incr": 0.3,
    "arms/l-upperarm-muscle-incr": 1.0, "arms/r-upperarm-muscle-incr": 1.0,
    "arms/l-lowerarm-muscle-incr": 1.0, "arms/r-lowerarm-muscle-incr": 1.0,
    "arms/l-upperarm-shoulder-muscle-incr": 1.0, "arms/r-upperarm-shoulder-muscle-incr": 1.0,
    "neck/measure-neck-circ-incr": 1.0,
    "neck/neck-scale-horiz-incr": 1.0,
    "neck/measure-neck-height-decr": 0.6,
    # He wears shorts: smooth, closed groin, no genital geometry (it decimates into a spike).
    "genitals/penis-length-decr": 1.0,
    "genitals/penis-circ-decr": 1.0,
    "genitals/penis-testicles-decr": 1.0,
    "pelvis/bulge-decr": 1.0,
}

# Relaxed stance: arms hang about 15 degrees off vertical (his lats push them out),
# with a slight forward bend at the elbow.
ARM_DROP_FROM_VERTICAL = 15
ELBOW_BEND = 12

LOWPOLY_RATIO = 0.06


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def build_body():
    body = HumanService.create_human(macro_detail_dict=MACROS)
    tdir = os.path.join(os.path.dirname(TargetService.target_full_path("torso-scale-horiz-incr") or ""), "..")
    for rel, w in TARGETS.items():
        path = os.path.normpath(os.path.join(tdir, rel + ".target.gz"))
        TargetService.load_target(body, path, weight=w, name=os.path.basename(rel))
    body.name = "bruiser_mpfb"
    return body


def rig_and_pose(body):
    addon_utils.enable("rigify", default_set=True)
    meta = HumanService.add_builtin_rig(body, "rigify.human_toes", import_weights=True)
    rig = RigService.generate_rigify_rig(meta, name="bruiser_rig", meta_rig_action="delete")
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode="POSE")
    for side, sx in (("L", 1), ("R", -1)):
        parent = rig.pose.bones.get(f"upper_arm_parent.{side}")
        if parent is not None and "IK_FK" in parent:
            parent["IK_FK"] = 1.0  # FK
        a = math.radians(ARM_DROP_FROM_VERTICAL)
        aim(rig, f"upper_arm_fk.{side}", Vector((sx * math.sin(a), 0, -math.cos(a))))
        b = math.radians(ARM_DROP_FROM_VERTICAL - 5)
        e = math.radians(ELBOW_BEND)
        aim(rig, f"forearm_fk.{side}", Vector((sx * math.sin(b), -math.sin(e), -math.cos(b))))
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def aim(rig, bone_name, direction):
    """Rotate a pose bone about its head so it points along `direction` (armature space)."""
    pb = rig.pose.bones[bone_name]
    bpy.context.view_layer.update()
    head = pb.head.copy()
    current = (pb.tail - pb.head).normalized()
    rot = current.rotation_difference(direction.normalized()).to_matrix().to_4x4()
    pb.matrix = Matrix.Translation(head) @ rot @ Matrix.Translation(-head) @ pb.matrix
    bpy.context.view_layer.update()


def posed_copy(src):
    """Freeze the posed body into a plain mesh exactly as the rig deforms it.

    MPFB stacks two armature modifiers that blend together ("Armature" and "Armature PV"),
    so applying them one at a time is wrong; take the evaluated mesh instead. The helper mask
    is switched off first so vertex indices (and vertex groups) still match the source.
    """
    mask = [m for m in src.modifiers if m.type == "MASK"]
    for m in mask:
        m.show_viewport = m.show_render = False
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(src.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    for m in mask:
        m.show_viewport = m.show_render = True
    obj = bpy.data.objects.new("bruiser_mpfb", mesh)
    obj.matrix_world = src.matrix_world.copy()
    for g in src.vertex_groups:
        obj.vertex_groups.new(name=g.name)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def bake(obj):
    """Apply shape keys and modifiers so the GLB is a plain mesh."""
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    if obj.data.shape_keys:
        obj.shape_key_add(name="baked", from_mix=True)
        for k in list(obj.data.shape_keys.key_blocks):
            if k.name != "baked":
                obj.shape_key_remove(k)
        obj.shape_key_remove(obj.data.shape_keys.key_blocks["baked"])
    for m in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)


def strip_helpers(obj):
    """Drop MakeHuman's helper geometry (joints, tights, hair) and keep only the skin."""
    import bmesh
    vg = obj.vertex_groups.get("body")
    if vg is None:
        return
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    deform = bm.verts.layers.deform.verify()
    doomed = [v for v in bm.verts if vg.index not in v[deform]]
    bmesh.ops.delete(bm, geom=doomed, context="VERTS")
    bm.to_mesh(obj.data)
    bm.free()


def export(obj, name):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, name), use_selection=True, export_apply=True)


def render(obj, name):
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "SINGLE"
    scene.display.shading.single_color = (0.55, 0.55, 0.55)
    scene.render.resolution_x, scene.render.resolution_y = 1600, 1000
    scene.render.film_transparent = False
    scene.world = scene.world or bpy.data.worlds.new("w")
    pts = [obj.matrix_world @ v.co for v in obj.data.vertices]
    zmax = max(p.z for p in pts)
    cx = (min(p.x for p in pts) + max(p.x for p in pts)) / 2
    cy = (min(p.y for p in pts) + max(p.y for p in pts)) / 2
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = zmax * 1.6
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    for label, rot, loc in (("front", (90, 0, 0), (cx, cy - 10, zmax / 2)), ("side", (90, 0, 90), (cx + 10, cy, zmax / 2))):
        cam.rotation_euler = [math.radians(a) for a in rot]
        cam.location = loc
        scene.render.filepath = os.path.join(HERE, f"{name}_{label}.png")
        bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam)


clear_scene()
src = build_body()
rig = rig_and_pose(src)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "bruiser_mpfb_rigged.blend"))
body = posed_copy(src)
src.hide_render = True
rig.hide_render = True
strip_helpers(body)
for p in body.data.polygons:
    p.use_smooth = True
export(body, "bruiser_mpfb.glb")
render(body, "render_mpfb")

low = body.copy()
low.data = body.data.copy()
low.name = "bruiser_mpfb_lowpoly"
bpy.context.scene.collection.objects.link(low)
body.hide_render = True
dec = low.modifiers.new("decimate", "DECIMATE")
dec.ratio = LOWPOLY_RATIO
bake(low)
for p in low.data.polygons:
    p.use_smooth = False
export(low, "bruiser_mpfb_lowpoly.glb")
render(low, "render_mpfb_lowpoly")
print("FACES", len(body.data.polygons), len(low.data.polygons))
