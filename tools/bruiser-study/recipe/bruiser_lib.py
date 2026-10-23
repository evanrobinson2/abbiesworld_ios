"""Shared Blender helpers for the bruiser recipe: build the MPFB body from a character card,
re-apply the card cheaply (shape keys + bone scales), bake, dress, decimate, render.

Imported by build_bruiser.py and fit_to_meshy.py (run inside Blender).
"""
import json
import math
import os

import addon_utils
import bpy
import numpy as np
from mathutils import Matrix, Vector
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.rigservice import RigService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService

HERE = os.path.dirname(os.path.abspath(__file__))
STUDY = os.path.dirname(HERE)
MESHY_GLB = os.path.join(STUDY, "meshy", "bruiser_meshy.glb")

# Head knobs: one signed number per named feature, mapped onto MakeHuman's paired targets
# (positive drives the first target, negative the second). 0 = the body's own head.
HEAD_KNOBS = {
    "width": ("head/head-scale-horiz-incr", "head/head-scale-horiz-decr"),
    "depth": ("head/head-scale-depth-incr", "head/head-scale-depth-decr"),
    "height": ("head/head-scale-vert-incr", "head/head-scale-vert-decr"),
    "square": ("head/head-square", "head/head-round"),
    "jaw_width": ("chin/chin-width-incr", "chin/chin-width-decr"),
    "jaw_forward": ("chin/chin-prognathism-incr", "chin/chin-prognathism-decr"),
    "chin_height": ("chin/chin-height-incr", "chin/chin-height-decr"),
    "brow_forward": ("eyebrows/eyebrows-trans-forward", "eyebrows/eyebrows-trans-backward"),
    "forehead_forward": ("forehead/forehead-trans-forward", "forehead/forehead-trans-backward"),
    "head_forward": ("head/head-trans-forward", "head/head-trans-backward"),
}

MATERIALS = {"skin": (0.62, 0.60, 0.58), "tank_top": (0.48, 0.49, 0.50), "shorts": (0.38, 0.39, 0.41)}


def load_card(path):
    with open(path) as f:
        return json.load(f)


def save_card(card, path):
    with open(path, "w") as f:
        json.dump(card, f, indent=2)
        f.write("\n")


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    addon_utils.enable("rigify", default_set=True)


def target_dir():
    return os.path.normpath(os.path.join(os.path.dirname(TargetService.target_full_path("torso-scale-horiz-incr")), ".."))


def build_body(card):
    """Create the MPFB body and its Rigify rig. Returns (body, rig)."""
    macros = {k: v for k, v in card["body"].items() if not k.startswith("_")}
    macros.update({"cupsize": 0.5, "firmness": 0.5, "race": {"asian": 0.33, "caucasian": 0.34, "african": 0.33}})
    body = HumanService.create_human(macro_detail_dict=macros)
    tdir = target_dir()
    for rel, w in card["shape"].items():
        if rel.startswith("_"):
            continue
        TargetService.load_target(body, os.path.join(tdir, rel + ".target.gz"), weight=w, name=os.path.basename(rel))
    for pos, neg in HEAD_KNOBS.values():
        for rel in (pos, neg):
            if os.path.basename(rel) not in body.data.shape_keys.key_blocks:
                TargetService.load_target(body, os.path.join(tdir, rel + ".target.gz"), weight=0.0, name=os.path.basename(rel))
    for k in body.data.shape_keys.key_blocks:
        k.slider_max = 3.0  # let the card push a target past MakeHuman's own maximum
    meta = HumanService.add_builtin_rig(body, "rigify.human_toes", import_weights=True)
    rig = RigService.generate_rigify_rig(meta, name="bruiser_rig", meta_rig_action="delete")
    for side in ("L", "R"):
        for parent in (f"upper_arm_parent.{side}", f"thigh_parent.{side}"):
            pb = rig.pose.bones.get(parent)
            if pb is not None and "IK_FK" in pb:
                pb["IK_FK"] = 1.0  # FK, so the FK controls below drive the limbs
    body.name = "bruiser_body"
    apply_card(card, body, rig)
    return body, rig


def apply_card(card, body, rig):
    """Re-apply shape weights, bone scales and pose. Cheap: no mesh rebuild."""
    keys = body.data.shape_keys.key_blocks
    for rel, w in card["shape"].items():
        if not rel.startswith("_") and os.path.basename(rel) in keys:
            keys[os.path.basename(rel)].value = w
    for knob, v in card.get("head", {}).items():
        if knob.startswith("_"):
            continue
        pos, neg = HEAD_KNOBS[knob]
        keys[os.path.basename(pos)].value = max(v, 0.0)
        keys[os.path.basename(neg)].value = max(-v, 0.0)
    s = card["stylise"]
    pb = rig.pose.bones
    for b in pb:
        b.matrix_basis = Matrix.Identity(4)
    bpy.context.view_layer.update()

    def scale(name, girth=1.0, length=1.0):
        if name in pb:
            pb[name].scale = (girth, length, girth)

    scale("head", s["head"], s["head"])
    scale("neck", s["neck_girth"], 1.0)
    for side in ("L", "R"):
        scale(f"upper_arm_fk.{side}", s["upper_arm_girth"], 1.0)
        # forearm_fk inherits the upper arm's girth; divide it out so each knob is independent.
        scale(f"forearm_fk.{side}", s["forearm_girth"] / s["upper_arm_girth"], s["forearm_length"])
        hg = s["hand"] / s["forearm_girth"]
        scale(f"hand_fk.{side}", hg, s["hand"] / s["forearm_length"])
        scale(f"thigh_fk.{side}", s["thigh_girth"], s["leg_length"])
        scale(f"shin_fk.{side}", s["shin_girth"] / s["thigh_girth"], 1.0)
        scale(f"foot_fk.{side}", s["foot"] / s["shin_girth"], s["foot"] / s["leg_length"])
    bpy.context.view_layer.update()
    pose_arms(card, rig)


def aim(rig, bone_name, direction):
    pb = rig.pose.bones[bone_name]
    bpy.context.view_layer.update()
    head = pb.head.copy()
    current = (pb.tail - pb.head).normalized()
    rot = current.rotation_difference(direction.normalized()).to_matrix().to_4x4()
    pb.matrix = Matrix.Translation(head) @ rot @ Matrix.Translation(-head) @ pb.matrix
    bpy.context.view_layer.update()


def pose_arms(card, rig):
    p = card["pose"]
    a = math.radians(p["arm_drop_from_vertical"])
    b = math.radians(max(p["arm_drop_from_vertical"] - 5, 0))
    e = math.radians(p["elbow_bend"])
    for side, sx in (("L", 1), ("R", -1)):
        aim(rig, f"upper_arm_fk.{side}", Vector((sx * math.sin(a), 0, -math.cos(a))))
        aim(rig, f"forearm_fk.{side}", Vector((sx * math.sin(b), -math.sin(e), -math.cos(b))))


LIMB_WORDS = ("arm", "hand", "f_", "thumb", "palm", "elbow")


def landmarks(rig):
    """Heights (world z) the outfit is cut at, read off the Rigify deform bones."""
    m = rig.matrix_world
    z = lambda b, end="head": (m @ getattr(rig.pose.bones[b], end)).z
    return {"waist": z("DEF-spine.001"), "chest": z("DEF-spine.003"),
            # The neck bone starts inside his trapezius, so the collar line is the top of the shoulders.
            "neck_base": (z("DEF-shoulder.L") + z("DEF-shoulder.R")) / 2,
            "mid_thigh": (z("DEF-thigh.L.001") + z("DEF-thigh.R.001")) / 2}


def bake(card, body, rig, name="bruiser"):
    """Freeze the posed body into a plain mesh, drop MakeHuman helpers, and dress it:
    tank top and shorts become a thin shell (own faces, own material) over the skin."""
    import bmesh
    mask = [m for m in body.modifiers if m.type == "MASK"]
    for m in mask:
        m.show_viewport = m.show_render = False
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(body.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    for m in mask:
        m.show_viewport = m.show_render = True
    obj = bpy.data.objects.new(name, mesh)
    obj.matrix_world = body.matrix_world.copy()
    for g in body.vertex_groups:
        obj.vertex_groups.new(name=g.name)
    bpy.context.scene.collection.objects.link(obj)
    for mname, rgb in MATERIALS.items():
        mat = bpy.data.materials.get(mname) or bpy.data.materials.new(mname)
        mat.diffuse_color = (*rgb, 1.0)
        mat.use_nodes = True
        mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*rgb, 1.0)
        mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
        obj.data.materials.append(mat)

    lm = landmarks(rig)
    mw = obj.matrix_world
    limb = {g.index for g in obj.vertex_groups if g.name.startswith("DEF-") and any(w in g.name for w in LIMB_WORDS)}
    keep = obj.vertex_groups.get("body").index
    o = card["outfit"]
    span = lm["neck_base"] - lm["waist"]

    bm = bmesh.new()
    bm.from_mesh(obj.data)
    deform = bm.verts.layers.deform.verify()
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if keep not in v[deform]], context="VERTS")
    bm.verts.ensure_lookup_table()
    cx = sum((mw @ v.co).x for v in bm.verts) / len(bm.verts)
    cy = sum((mw @ v.co).y for v in bm.verts) / len(bm.verts)

    def is_limb(v):
        best = max(((w, gi) for gi, w in v[deform].items() if gi in limb or obj.vertex_groups[gi].name.startswith("DEF-")), default=None)
        return best is not None and best[1] in limb

    def region(v):
        p = mw @ v.co
        if is_limb(v):
            return 0
        t = o["tank_top"]
        if lm["waist"] - t["overlap_shorts"] * span <= p.z <= lm["neck_base"]:
            # scoop neckline in front, higher at the back; straps leave the shoulders bare
            front = p.y < cy
            top = lm["neck_base"] - (t["neckline_drop"] * (lm["neck_base"] - lm["chest"]) if front else 0.15 * span)
            side = abs(p.x - cx)
            strap = side < 0.55 * (lm["neck_base"] - lm["waist"])
            if p.z <= top or (strap and p.z <= lm["neck_base"] and side > 0.18 * span):
                return 1
        sh = o["shorts"]
        if lm["mid_thigh"] <= p.z <= lm["waist"] + sh["overlap_tank"] * span:
            return 2
        return 0

    reg = {v.index: region(v) for v in bm.verts}
    shell_faces = {1: [], 2: []}
    for f in bm.faces:
        r = [reg[v.index] for v in f.verts]
        f.material_index = 0
        for k in (1, 2):
            if all(x == k for x in r):
                shell_faces[k].append(f)
    thick = o["thickness"] * (max((mw @ v.co).z for v in bm.verts) - min((mw @ v.co).z for v in bm.verts))
    for k, faces in shell_faces.items():
        if not faces:
            continue
        dup = bmesh.ops.duplicate(bm, geom=faces)
        new_faces = [g for g in dup["geom"] if isinstance(g, bmesh.types.BMFace)]
        new_verts = [g for g in dup["geom"] if isinstance(g, bmesh.types.BMVert)]
        for f in new_faces:
            f.material_index = k
        bm.normal_update()
        for v in new_verts:
            v.co += v.normal * thick
        # close the hem: extrude the shell's open border edges inward to the skin
        border = [e for e in bm.edges if e.is_boundary and all(v in set(new_verts) for v in e.verts)]
        ext = bmesh.ops.extrude_edge_only(bm, edges=border)
        for g in ext["geom"]:
            if isinstance(g, bmesh.types.BMVert):
                g.co -= g.normal * thick * 0.9
            if isinstance(g, bmesh.types.BMFace):
                g.material_index = k
    bm.to_mesh(obj.data)
    bm.free()
    obj.vertex_groups.clear()
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def decimate(obj, ratio, name):
    low = obj.copy()
    low.data = obj.data.copy()
    low.name = name
    bpy.context.scene.collection.objects.link(low)
    m = low.modifiers.new("decimate", "DECIMATE")
    m.ratio = ratio
    bpy.context.view_layer.objects.active = low
    for o in bpy.context.selected_objects:
        o.select_set(False)
    low.select_set(True)
    bpy.ops.object.modifier_apply(modifier=m.name)
    for p in low.data.polygons:
        p.use_smooth = False
    return low


def export_glb(obj, path):
    for o in bpy.context.scene.objects:
        o.select_set(o == obj)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_apply=True)


def import_glb(path, name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    obj = objs[0]
    obj.name = name
    return obj


# ---- views and silhouettes -------------------------------------------------

def world_points(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = ev.to_mesh()
    n = len(me.vertices)
    co = np.empty(n * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    ev.to_mesh_clear()
    co = co.reshape(-1, 3)
    m = np.array(obj.matrix_world)
    return co @ m[:3, :3].T + m[:3, 3]


VIEWS = {"front": (90, 0, 0), "side": (90, 0, 90), "back": (90, 0, 180), "three_quarter": (90, 0, 35)}


def frame(obj, view, res=(256, 256), margin=1.08):
    """Point an orthographic camera at obj so it fills the frame by height: the view every
    comparison uses, so a model's scale never matters, only its proportions."""
    scene = bpy.context.scene
    cam = scene.camera
    if cam is None:
        cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
        cam.data.type = "ORTHO"
        scene.collection.objects.link(cam)
        scene.camera = cam
    pts = world_points(obj)
    lo, hi = pts.min(0), pts.max(0)
    c = (lo + hi) / 2
    h = hi[2] - lo[2]
    cam.data.ortho_scale = h * margin
    rx, ry, rz = (math.radians(a) for a in VIEWS[view])
    cam.rotation_euler = (rx, ry, rz)
    d = Matrix.Rotation(rz, 4, "Z") @ Vector((0, -10 * h, 0))
    cam.location = Vector((c[0], c[1], c[2])) + d
    scene.render.resolution_x, scene.render.resolution_y = res


HEAD_WINDOW = 0.17  # top fraction of body height that holds the head and neck


def frame_head(obj, view, res=(256, 256)):
    """Close-up camera on the head: the top HEAD_WINDOW of the body, scaled by full height
    so head size relative to the body still counts."""
    scene = bpy.context.scene
    cam = scene.camera
    pts = world_points(obj)
    lo, hi = pts.min(0), pts.max(0)
    h = hi[2] - lo[2]
    top = pts[pts[:, 2] > hi[2] - HEAD_WINDOW * h]
    c = (top.min(0) + top.max(0)) / 2
    cam.data.ortho_scale = h * HEAD_WINDOW * 1.25
    rx, ry, rz = (math.radians(a) for a in VIEWS[view])
    cam.rotation_euler = (rx, ry, rz)
    d = Matrix.Rotation(rz, 4, "Z") @ Vector((0, -10 * h, 0))
    cam.location = Vector((c[0], c[1], hi[2] - HEAD_WINDOW * h / 2)) + d
    scene.render.resolution_x, scene.render.resolution_y = res


def silhouette(obj, view, res=(256, 256), head=False):
    """Binary mask of obj from a view, as a numpy bool array (H, W)."""
    scene = bpy.context.scene
    shown = {o: o.hide_render for o in scene.objects}
    for o in scene.objects:
        if o.type == "MESH":
            o.hide_render = o != obj
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.film_transparent = True
    scene.display.shading.light = "FLAT"
    scene.display.shading.color_type = "SINGLE"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    frame(obj, view, res)
    if head:
        frame_head(obj, view, res)
    path = os.path.join(bpy.app.tempdir, f"sil_{obj.name}_{view}{'_head' if head else ''}.png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o, h in shown.items():
        o.hide_render = h
    img = bpy.data.images.load(path, check_existing=False)
    px = np.array(img.pixels[:], dtype=np.float32).reshape(res[1], res[0], 4)
    bpy.data.images.remove(img)
    return px[::-1, :, 3] > 0.5


def iou(a, b):
    return float((a & b).sum()) / max(float((a | b).sum()), 1.0)


def overlay(target, ours):
    """RGB image: target only red, ours only blue, both grey."""
    img = np.full(target.shape + (3,), 245, dtype=np.uint8)
    img[target & ~ours] = (220, 60, 60)
    img[ours & ~target] = (60, 90, 220)
    img[target & ours] = (150, 150, 150)
    return img


def shaded(obj, view, path, res=(800, 1000), head=False):
    """Studio render of obj alone from a view (the screenshots in the study)."""
    scene = bpy.context.scene
    shown = {o: o.hide_render for o in scene.objects}
    for o in scene.objects:
        if o.type == "MESH":
            o.hide_render = o != obj
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.film_transparent = False
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_cavity = False
    scene.world = scene.world or bpy.data.worlds.new("w")
    scene.world.color = (0.42, 0.43, 0.42)
    scene.render.image_settings.color_mode = "RGB"
    frame(obj, view, res, margin=1.12)
    if head:
        frame_head(obj, view, res)
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o, h in shown.items():
        o.hide_render = h


def save_rgb(arr, path):
    """Write an (H, W, 3) uint8 array to PNG with Blender's own image writer."""
    h, w, _ = arr.shape
    img = bpy.data.images.new("tmp_save", w, h, alpha=False)
    rgba = np.concatenate([arr[::-1].astype(np.float32) / 255.0, np.ones((h, w, 1), np.float32)], axis=2)
    img.pixels.foreach_set(rgba.ravel())
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    bpy.data.images.remove(img)
