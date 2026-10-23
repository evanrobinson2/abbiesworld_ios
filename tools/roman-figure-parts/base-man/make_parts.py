"""Render each sheet's pieces alone (parts/<sheet>.npz from parts.py solo) and set them beside the Midjourney take
they were modeled against: parts/<sheet>.png and parts/<sheet>_vs.jpg.  python3 make_parts.py [sheet ...]"""
import json, os, sys
import numpy as np
import bpy
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "parts")
MJ = os.path.join(HERE, "..", "..", "midjourney", "outputs", "base-man-parts-0020")
PICKS = json.load(open(os.path.join(OUT, "picks.json")))
S = 1.80 / 353

def scene():
    bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.samples = 32; sc.cycles.device = "CPU"; sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = 720
    world = bpy.data.worlds.new("W"); sc.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.9, 0.92, 1); world.node_tree.nodes["Background"].inputs[1].default_value = 0.25
    return sc

def mat(name, rgb, rough):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    return m

def obj(sc, name, V, F, m):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(float(x * S), float((y - 248) * S), float((357 - z) * S)) for x, y, z in V], [], [tuple(map(int, f)) for f in F])
    me.update(); ob = bpy.data.objects.new(name, me); sc.collection.objects.link(ob); ob.data.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    return ob

for sh in sys.argv[1:] or [f[:-4] for f in sorted(os.listdir(OUT)) if f.endswith(".npz")]:
    d = np.load(os.path.join(OUT, sh + ".npz")); sc = scene()
    skin, cloth = mat("Skin", (0.56, 0.56, 0.57), 0.55), mat("Cloth", (0.66, 0.66, 0.67), 0.8)
    obs = [obj(sc, "Skin", d["vs"], d["fs"], skin)]
    if len(d["vb"]): obs.append(obj(sc, "Briefs", d["vb"], d["fb"], cloth))
    az, el = np.radians(d["cam"][0]), np.radians(d["cam"][1])
    V = np.concatenate([np.array([v.co[:] for v in o.data.vertices]) for o in obs])
    c = (V.min(0) + V.max(0)) / 2
    dirn = np.array([np.sin(az) * np.cos(el), -np.cos(az) * np.cos(el), np.sin(el)])
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = "ORTHO"; cam.location = tuple(c + dirn * 4)
    cam.rotation_euler = (np.pi / 2 - el, 0, az)
    # frame: project the vertices onto the camera plane
    right = np.array([np.cos(az), np.sin(az), 0]); up = np.cross(right, -dirn)
    pr = (V - c) @ right; pu = (V - c) @ up
    cam.data.ortho_scale = 1.12 * max(np.ptp(pr), np.ptp(pu))
    off = ((pr.max() + pr.min()) / 2) * right + ((pu.max() + pu.min()) / 2) * up; cam.location = tuple(c + off + dirn * 4)
    for name, e, (dx, dz) in (("Key", 3.6, (-40, -40)), ("Fill", 1.0, (-5, 55)), ("Rim", 2.2, (-30, 160))):   # relative to the camera
        l = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN")); l.data.energy = e; l.data.angle = np.radians(8)
        l.rotation_euler = (np.pi / 2 - el + np.radians(dx), 0, az + np.radians(dz)); sc.collection.objects.link(l)
    out = os.path.join(OUT, sh + ".png"); sc.render.filepath = out; bpy.ops.render.render(write_still=True)
    im = Image.open(out).convert("RGBA")
    if len(d["cam"]) > 2: im = im.rotate(d["cam"][2])
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    ref = Image.open(os.path.join(MJ, "images", f"{sh}_{PICKS[sh]}.png")).convert("RGB")
    ref = ref.resize((round(ref.width * 720 / ref.height), 720), Image.LANCZOS)
    pair = Image.new("RGB", (ref.width + 720, 720), "white"); pair.paste(ref, (0, 0)); pair.paste(bg.convert("RGB"), (ref.width, 0))
    pair.save(os.path.join(OUT, sh + "_vs.jpg"), quality=86); print(sh, flush=True)
