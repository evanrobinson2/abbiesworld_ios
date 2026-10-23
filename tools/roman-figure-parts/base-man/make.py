"""Turn build.py's parts into base-man.glb and same-camera renders beside the reference (r/compare.jpg, r/score.json)."""
import json, os, sys
import numpy as np
import bpy
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import build
R = os.path.join(HERE, "r"); os.makedirs(R, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene

def mat(name, rgb, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    return m
SKIN = mat("Skin", (0.55, 0.55, 0.56), 0.55)
CLOTH = mat("Cloth", (0.66, 0.66, 0.67), 0.8)

ROUND = sys.argv[-1] if sys.argv[-1] in ("r1", "r2") else "r2"
if ROUND == "r2":
    d = np.load(os.path.join(HERE, "base-man-r2.npz"))
    conv = lambda v: [(float(x * build.S), float((y - build.P["cx_side"]) * build.S), float((build.P["ground"] - z) * build.S)) for x, y, z in v]
    PARTS = {"Skin": (conv(d["vs"]), d["fs"].tolist()), "Briefs": (conv(d["vb"]), d["fb"].tolist())}
    R = os.path.join(HERE, "r2"); os.makedirs(R, exist_ok=True)
else:
    PARTS = build.PARTS
for name, (V, F) in PARTS.items():
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(map(float, v)) for v in V], [], [tuple(f) for f in F]); me.update()
    me.validate()
    ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob)
    ob.data.materials.append(CLOTH if name.startswith("Briefs") else SKIN)
    for p in me.polygons: p.use_smooth = True
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    if ROUND == "r2":
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode="OBJECT")
        dec = ob.modifiers.new("Lighter", "DECIMATE"); dec.ratio = 0.18
        bpy.ops.object.modifier_apply(modifier="Lighter")
        for p in me.polygons: p.use_smooth = True
    else:
        sub = ob.modifiers.new("Smooth", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
        bpy.ops.object.modifier_apply(modifier="Smooth")
    ob.select_set(False)

bpy.ops.export_scene.gltf(filepath=os.path.join(HERE, "base-man.glb" if ROUND == "r1" else "base-man-r2.glb"), export_format="GLB", export_apply=True)

# ---- same-camera renders: orthographic, the reference's own scale and framing
sc.render.engine = "CYCLES"; sc.cycles.samples = 24; sc.cycles.device = "CPU"
sc.render.film_transparent = True
SCALE = 3; W, H = 160, 360
sc.render.resolution_x, sc.render.resolution_y = W * SCALE, H * SCALE
world = bpy.data.worlds.new("W"); sc.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.9, 0.92, 1); world.node_tree.nodes["Background"].inputs[1].default_value = 0.22
lights = []
for name, e, rot in (("Key", 3.6, (45, 0, -40)), ("Fill", 0.9, (60, 0, 70)), ("Rim", 1.6, (-55, 0, 20))):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); l.data.energy = e; l.data.angle = np.radians(8)
    l.rotation_euler = tuple(np.radians(rot)); sc.collection.objects.link(l); lights.append(l)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = H * build.S
zc = build.Z(180)
views = {"front": ((0, -10, zc), (np.radians(90), 0, 0), build.P["cx_front"]),
         "side": ((10, 0, zc), (np.radians(90), 0, np.radians(90)), build.P["cx_side"]),
         "back": ((0, 10, zc), (np.radians(90), 0, np.radians(180)), build.P["cx_back"])}
ref = np.asarray(Image.open(build.REF).convert("RGB")); refm = build.M
tiles, score = [], {}
for v, (loc, rot, cx) in views.items():
    cam.location = loc; cam.rotation_euler = rot
    for l, base in zip(lights, ((45, 0, -40), (60, 0, 70), (-55, 0, 20))):   # lights turn with the camera
        l.rotation_euler = (np.radians(base[0]), 0, np.radians(base[2]) + rot[2])
    out = os.path.join(R, f"{v}.png"); sc.render.filepath = out; bpy.ops.render.render(write_still=True)
    im = Image.open(out).convert("RGBA"); a = np.asarray(im)[..., 3] > 40
    small = np.asarray(Image.fromarray((a * 255).astype("uint8")).resize((W, H), Image.BILINEAR)) > 127
    x0 = int(round(cx - W / 2)); refcrop = np.zeros((H, W), bool)
    xs = slice(max(0, x0), min(refm.shape[1], x0 + W)); refcrop[:refm.shape[0], xs.start - x0:xs.stop - x0] = refm[:H, xs]
    iou = (small & refcrop).sum() / max(1, (small | refcrop).sum()); score[v] = round(float(iou), 3)
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im); tiles.append(bg.convert("RGB"))
    r = np.full((H, W, 3), 255, np.uint8); r[:, xs.start - x0:xs.stop - x0] = ref[:H, xs]
    Image.fromarray(r).resize((W * SCALE, H * SCALE), Image.LANCZOS).save(os.path.join(R, f"ref_{v}.png"))
json.dump(score, open(os.path.join(R, "score.json"), "w"), indent=1)
row1 = [Image.open(os.path.join(R, f"ref_{v}.png")).convert("RGB") for v in views]
sheet = Image.new("RGB", (W * SCALE * 3, H * SCALE * 2), "white")
for i, t in enumerate(row1): sheet.paste(t, (i * W * SCALE, 0))
for i, t in enumerate(tiles): sheet.paste(t, (i * W * SCALE, H * SCALE))
sheet.save(os.path.join(R, "compare.jpg"), quality=88)
print("IoU", score)
