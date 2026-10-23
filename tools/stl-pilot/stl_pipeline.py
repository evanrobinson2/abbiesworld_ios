"""STL -> game-ready GLB cleanup, one model per run, timed per stage.

blender -b -P stl_pipeline.py -- <slug>

Stages (each timed, with triangle counts, written to <slug>/notes.json):
  import -> repair (weld, normals, fill holes, drop dust shells) -> assemble/scale/pivot
  -> decimate to the triangle target -> uv (Smart UV Project + pack)
  -> bake (normal + AO from the untouched high-poly) -> material (role-named) -> export GLB

The repaired high-poly is the bake source and is NOT written out; the original
source STL in the same folder is the archival high-poly.
"""
import sys, os, json, time, math
import bpy, bmesh
from mathutils import Vector, Matrix

T0 = time.perf_counter()
ROOT = os.path.dirname(os.path.abspath(__file__))
slug = sys.argv[sys.argv.index("--") + 1]
D = os.path.join(ROOT, slug)
if slug.startswith("car-"):  # toy-car variant: separate named wheels, car faces +Z, wheels on y=0
    sys.path.insert(0, ROOT)
    import stl_cars
    stl_cars.run(slug, D)
    raise SystemExit(0)

# dim: ("Z"|"MAX", metres) is the real-world size we scale the assembled model to.
CFG = {
    "pirate-chest": dict(files=[("source.stl", "body")], dim=("MAX", 0.50), target=900, tex=512,
                         mats={"body": ("painted_wood", (0.50, 0.30, 0.16, 1))}),
    "potion-bottle": dict(files=[("source.stl", "bottle")], dim=("Z", 0.20), target=700, tex=512,
                          mats={"bottle": ("glass_milky", (0.85, 0.80, 0.90, 1))}),
    "space-helmet": dict(files=[("source.stl", "shell")], dim=("MAX", 0.36), target=1500, tex=512,
                         mats={"shell": ("painted_metal", (0.80, 0.82, 0.86, 1))}),
    "street-lamp": dict(files=[("source.stl", "lamp")], dim=("Z", 4.2), target=1500, tex=512,
                        mats={"lamp": ("cast_iron", (0.07, 0.07, 0.08, 1))}),
    "sci-fi-crate": dict(files=[("source_bottom.stl", "tray"), ("source_top.stl", "lid")], dim=("MAX", 0.60), target=1000, tex=512,
                         mats={"tray": ("crate_plastic", (0.30, 0.34, 0.38, 1)), "lid": ("crate_lid", (0.36, 0.40, 0.44, 1))},
                         assemble="crate"),
    "picnic-table": dict(files=[("source.stl", "table")], dim=("MAX", 1.80), target=490, tex=512,
                         mats={"table": ("weathered_wood", (0.55, 0.40, 0.24, 1))}),
    "park-bench": dict(files=[("source.stl", "bench")], dim=("MAX", 1.80), target=3000, tex=512,
                       mats={"bench": ("bench_wood_and_iron", (0.45, 0.36, 0.25, 1))}),
    "lighthouse": dict(files=[("source.stl", "island")], dim=("Z", 9.0), target=5000, tex=512,
                       mats={"island": ("rock_and_plaster", (0.55, 0.52, 0.50, 1))}),
    "tractor": dict(files=[("source_body.stl", "body"), ("source_wheels.stl", "wheels")], dim=("MAX", 3.6), target=6000, tex=512,
                    mats={"body": ("tractor_paint", (0.15, 0.45, 0.20, 1)), "wheels": ("rubber_tyre", (0.05, 0.05, 0.05, 1))},
                    assemble="tractor"),
    "chicken": dict(files=[("source.stl", "body")], dim=("MAX", 0.40), target=8000, tex=512,
                    mats={"body": ("chicken_clay", (0.95, 0.93, 0.90, 1))}),
}[slug]

notes = {"slug": slug, "stages": {}, "blender": bpy.app.version_string, "target_tris": CFG["target"]}


def tri_count(obs):
    return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs)


class Stage:
    def __init__(self, name): self.name = name
    def __enter__(self): self.t = time.perf_counter(); return self
    def __exit__(self, *a): self.dt = time.perf_counter() - self.t


def record(name, dt, tris, **extra):
    notes["stages"][name] = dict(seconds=round(dt, 2), tris=int(tris), **extra)
    print(f"STAGE {slug} {name} {dt:.1f}s tris={tris} {extra}", flush=True)


def shells_of(bm):
    seen, out = set(), []
    for fc in bm.faces:
        if fc.index in seen: continue
        comp, stack = [], [fc]
        while stack:
            cur = stack.pop()
            if cur.index in seen: continue
            seen.add(cur.index); comp.append(cur)
            for e in cur.edges:
                for nf in e.link_faces:
                    if nf.index not in seen: stack.append(nf)
        out.append(comp)
    return out


bpy.ops.wm.read_factory_settings(use_empty=True)

# ---- import ---------------------------------------------------------------
parts = []
with Stage("import") as st:
    for fname, role in CFG["files"]:
        bpy.ops.wm.stl_import(filepath=os.path.join(D, fname))
        ob = bpy.context.selected_objects[0]; ob.name = role
        parts.append(ob)
record("import", st.dt, tri_count(parts), files=[f for f, _ in CFG["files"]])

# ---- repair ---------------------------------------------------------------
rep = dict(open_edges_before=0, open_edges_after=0, dust_shells_removed=0, welded_verts=0)
with Stage("repair") as st:
    for ob in parts:
        bm = bmesh.new(); bm.from_mesh(ob.data)
        n0 = len(bm.verts)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-3)
        rep["welded_verts"] += n0 - len(bm.verts)
        bm.edges.ensure_lookup_table(); bm.faces.ensure_lookup_table()
        rep["open_edges_before"] += sum(1 for e in bm.edges if len(e.link_faces) != 2)
        total = len(bm.faces)
        sh = shells_of(bm)
        if len(sh) > 1:
            dust = [f for s in sh if len(s) < max(8, total * 0.0005) for f in s]
            rep["dust_shells_removed"] += sum(1 for s in sh if len(s) < max(8, total * 0.0005))
            if dust: bmesh.ops.delete(bm, geom=dust, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.edges.ensure_lookup_table()
        bnd = [e for e in bm.edges if len(e.link_faces) == 1]
        if bnd:
            try: bmesh.ops.holes_fill(bm, edges=bnd, sides=16)
            except Exception as ex: print("holes_fill failed", ex)
        bm.edges.ensure_lookup_table()
        rep["open_edges_after"] += sum(1 for e in bm.edges if len(e.link_faces) != 2)
        bm.to_mesh(ob.data); bm.free()
record("repair", st.dt, tri_count(parts), **rep)

# ---- assemble, scale to metres, pivot at base ------------------------------
def shell_split(ob):
    """Split an object into one object per loose shell; return list."""
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    bpy.ops.mesh.separate(type="LOOSE") if False else None
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
    return list(bpy.context.selected_objects)

def bbox(ob):
    v = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    return Vector((min(a.x for a in v), min(a.y for a in v), min(a.z for a in v))), Vector((max(a.x for a in v), max(a.y for a in v), max(a.z for a in v)))

def bake_transform(ob):
    ob.data.transform(ob.matrix_world); ob.matrix_world = Matrix.Identity(4)

def move(ob, vec, rot=None):
    m = Matrix.Translation(vec)
    if rot is not None: m = m @ rot.to_4x4()
    ob.data.transform(m)

with Stage("assemble_scale_pivot") as st:
    asm = CFG.get("assemble")
    if asm == "crate":
        tray, lid = parts
        lo, hi = bbox(lid)
        # lid is printed open-side-up; flip it over onto the tray rim
        move(lid, Vector(), Matrix.Rotation(math.pi, 4, "X"))
        lo2, hi2 = bbox(lid); tlo, thi = bbox(tray)
        move(lid, Vector((-(lo2.x + hi2.x) / 2 + (tlo.x + thi.x) / 2, -(lo2.y + hi2.y) / 2 + (tlo.y + thi.y) / 2, thi.z - lo2.z - 1.0)))
    elif asm == "tractor":
        body, wh = parts
        # axle stubs found by inspection at y~0 (z 4.5) and y~40 (z 2.5), sticking out of x=+-21
        blo, bhi = bbox(body)
        cab_y = sum(v.co.y for v in body.data.vertices if v.co.z > bhi.z * 0.8) / max(1, sum(1 for v in body.data.vertices if v.co.z > bhi.z * 0.8))
        rear_y, front_y = (0.0, 40.0) if abs(cab_y - 0.0) < abs(cab_y - 40.0) else (40.0, 0.0)
        axle_z = {0.0: 4.5, 40.0: 2.5}
        shells = shell_split(wh)
        shells.sort(key=lambda o: -max(bbox(o)[1].x - bbox(o)[0].x, bbox(o)[1].y - bbox(o)[0].y))
        newparts = [body]
        for i, w in enumerate(shells):
            lo, hi = bbox(w)
            cx, cy = (lo.x + hi.x) / 2, (lo.y + hi.y) / 2
            thick = hi.z - lo.z
            big = i < 2
            ay = rear_y if big else front_y
            side = 1 if i % 2 == 0 else -1
            # recentre on wheel hub, spin axis Z -> X
            move(w, Vector((-cx, -cy, -(lo.z + hi.z) / 2)))
            rot = Matrix.Rotation(math.pi / 2 * side, 3, "Y")
            move(w, Vector((side * (21.0 + thick / 2 - 0.5), ay, axle_z[ay])), rot)
            w.name = "wheel_%d" % i
            newparts.append(w)
        # merge wheel shells into one "wheels" object
        bpy.ops.object.select_all(action="DESELECT")
        for w in newparts[1:]: w.select_set(True)
        bpy.context.view_layer.objects.active = newparts[1]
        bpy.ops.object.join(); newparts[1].name = "wheels"
        parts = [body, newparts[1]]
    # global scale + pivot
    los = [bbox(o)[0] for o in parts]; his = [bbox(o)[1] for o in parts]
    mn = Vector((min(l.x for l in los), min(l.y for l in los), min(l.z for l in los)))
    mx = Vector((max(h.x for h in his), max(h.y for h in his), max(h.z for h in his)))
    size = mx - mn
    kind, metres = CFG["dim"]
    ref = size.z if kind == "Z" else max(size.x, size.y, size.z)
    s = metres / ref
    cx, cy = (mn.x + mx.x) / 2, (mn.y + mx.y) / 2
    for ob in parts:
        ob.data.transform(Matrix.Scale(s, 4) @ Matrix.Translation((-cx, -cy, -mn.z)))
        ob.data.update()
    notes["scale_to_metres"] = dict(factor=s, source_size_mm=[round(v, 2) for v in size],
                                    final_size_m=[round(v * s, 3) for v in size])
record("assemble_scale_pivot", st.dt, tri_count(parts), final_size_m=notes["scale_to_metres"]["final_size_m"])

# keep the high-poly bake source: duplicate everything, joined
for o in parts: o.select_set(True)
high_parts = []
for o in parts:
    d = bpy.data.objects.new("high_" + o.name, o.data.copy())
    bpy.context.collection.objects.link(d); high_parts.append(d)
bpy.ops.object.select_all(action="DESELECT")
for d in high_parts: d.select_set(True)
bpy.context.view_layer.objects.active = high_parts[0]
if len(high_parts) > 1: bpy.ops.object.join()
high = bpy.context.view_layer.objects.active; high.name = "high"
high_tris = tri_count([high])
notes["high_poly_tris"] = high_tris

# ---- decimate ----------------------------------------------------------------
with Stage("decimate") as st:
    tris_by = {o.name: tri_count([o]) for o in parts}
    notes_before = dict(tris_by)
    total = sum(tris_by.values())
    left = CFG["target"]
    dec_info = {}
    for o in parts:
        budget = max(60, int(CFG["target"] * tris_by[o.name] / total)) if len(parts) > 1 else CFG["target"]
        ratio = min(1.0, budget / tris_by[o.name])
        bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
        if tris_by[o.name] > 20 * budget:  # huge scans: one coarse collapse first (to ~10x budget) so retries stay fast
            m = o.modifiers.new("pre", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = 10 * budget / tris_by[o.name]; m.use_collapse_triangulate = True
            bpy.ops.object.select_all(action="DESELECT"); o.select_set(True); bpy.context.view_layer.objects.active = o
            o.data = o.data.copy(); bpy.ops.object.modifier_apply(modifier="pre")
            tris_by[o.name] = tri_count([o]); ratio = min(1.0, budget / tris_by[o.name])
        orig = o.data.copy()  # keep the repaired mesh so we can retry with a corrected ratio
        r_try = ratio
        for attempt in range(4):
            o.data = orig.copy()  # fresh single-user mesh so modifiers can be applied
            if ratio < 1.0:
                if tris_by[o.name] > 3 * budget:  # cheap pass first: planar dissolve of flat regions
                    m = o.modifiers.new("flat", "DECIMATE"); m.decimate_type = "DISSOLVE"; m.angle_limit = math.radians(2.0)
                    bpy.ops.object.modifier_apply(modifier="flat")
                m = o.modifiers.new("dec", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = min(1.0, r_try); m.use_collapse_triangulate = True
                bpy.ops.object.modifier_apply(modifier="dec")
            t = o.modifiers.new("tri", "TRIANGULATE"); bpy.ops.object.modifier_apply(modifier="tri")
            got = tri_count([o])
            if ratio >= 1.0 or abs(got - budget) <= 0.08 * budget: break
            r_try *= budget / max(1, got)
        fallback = None
        if ratio < 1.0 and got > 1.5 * budget:  # collapse stalled on open/degenerate geometry: voxel remesh, then collapse again
            fallback = "voxel_remesh"
            dims = o.dimensions
            for attempt2 in range(3):
                o.data = orig.copy()
                m = o.modifiers.new("vox", "REMESH"); m.mode = "VOXEL"; m.voxel_size = max(dims) / (140 - 30 * attempt2); m.adaptivity = 0.0
                bpy.ops.object.modifier_apply(modifier="vox")
                m = o.modifiers.new("dec2", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.use_collapse_triangulate = True
                m.ratio = min(1.0, budget / max(1, tri_count([o])))
                bpy.ops.object.modifier_apply(modifier="dec2")
                got = tri_count([o])
                if got <= 1.15 * budget: break
        dec_info[o.name] = dict(fallback=fallback, before=notes_before[o.name], budget=budget, ratio=round(r_try, 4), after=tri_count([o]), attempts=attempt + 1)
record("decimate", st.dt, tri_count(parts), per_part=dec_info)

# ---- join low parts, material slots by role, UV -------------------------------
for r, (mname, col) in CFG["mats"].items():
    pass
bpy.ops.object.select_all(action="DESELECT")
for o in parts:
    o.select_set(True)
    mat = bpy.data.materials.new("mat_" + CFG["mats"][o.name][0]); mat.use_nodes = True
    o.data.materials.clear(); o.data.materials.append(mat)
bpy.context.view_layer.objects.active = parts[0]
if len(parts) > 1: bpy.ops.object.join()
low = bpy.context.view_layer.objects.active; low.name = slug
low.data.name = slug
bm_ = bmesh.new(); bm_.from_mesh(low.data)
bmesh.ops.dissolve_degenerate(bm_, dist=1e-6, edges=bm_.edges)
bm_.to_mesh(low.data); bm_.free()
low.data.validate(clean_customdata=True)
bpy.ops.object.shade_smooth()

with Stage("uv") as st:
    bpy.ops.object.select_all(action="DESELECT"); low.select_set(True); bpy.context.view_layer.objects.active = low
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, area_weight=0.5)
    bpy.ops.uv.pack_islands(margin=0.004)
    bpy.ops.object.mode_set(mode="OBJECT")
record("uv", st.dt, tri_count([low]), islands="smart_project+pack")

# ---- bake normal + AO ----------------------------------------------------------
size_m = max(notes["scale_to_metres"]["final_size_m"])
ext = size_m * 0.02
tex = CFG["tex"]
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 16
with Stage("bake") as st:
    imgs = {}
    for kind in ("normal", "ao"):
        im = bpy.data.images.new(f"{slug}_{kind}", tex, tex, alpha=False)
        im.colorspace_settings.name = "Non-Color"
        imgs[kind] = im
    def bake(kind, btype, **kw):
        for slot in low.material_slots:
            nt = slot.material.node_tree
            n = nt.nodes.new("ShaderNodeTexImage"); n.image = imgs[kind]; nt.nodes.active = n
        bpy.ops.object.select_all(action="DESELECT"); high.select_set(True); low.select_set(True)
        bpy.context.view_layer.objects.active = low
        bpy.ops.object.bake(type=btype, use_selected_to_active=True, cage_extrusion=ext, max_ray_distance=ext * 3,
                            margin=6, margin_type="EXTEND", **kw)
        for slot in low.material_slots:
            nt = slot.material.node_tree
            nt.nodes.remove(nt.nodes.active) if nt.nodes.active and nt.nodes.active.type == "TEX_IMAGE" else None
    bake("normal", "NORMAL", normal_space="TANGENT")
    bake("ao", "AO")
    for kind, im in imgs.items():
        im.filepath_raw = os.path.join(D, f"{slug}_{kind}.png"); im.file_format = "PNG"; im.save()
record("bake", st.dt, tri_count([low]), texture_px=tex, extrusion_m=round(ext, 4))

# ---- materials by role -----------------------------------------------------------
with Stage("material") as st:
    # glTF "Material Output" group carries the AO channel
    grp = bpy.data.node_groups.get("glTF Material Output") or bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
    if not grp.interface.items_tree:
        grp.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    for slot in low.material_slots:
        mat = slot.material; nt = mat.node_tree
        role = [r for r, (n, c) in CFG["mats"].items() if "mat_" + n == mat.name][0]
        bsdf = nt.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = CFG["mats"][role][1]
        bsdf.inputs["Roughness"].default_value = 0.7
        mat.diffuse_color = CFG["mats"][role][1]  # viewport colour, used by the preview render
        n_img = nt.nodes.new("ShaderNodeTexImage"); n_img.image = imgs["normal"]
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(n_img.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
        a_img = nt.nodes.new("ShaderNodeTexImage"); a_img.image = imgs["ao"]
        g = nt.nodes.new("ShaderNodeGroup"); g.node_tree = grp; g.name = "glTF Material Output"
        sep = nt.nodes.new("ShaderNodeSeparateColor")
        nt.links.new(a_img.outputs["Color"], sep.inputs["Color"]); nt.links.new(sep.outputs["Red"], g.inputs["Occlusion"])
record("material", st.dt, tri_count([low]), materials=[s.material.name for s in low.material_slots])

# ---- export ----------------------------------------------------------------------
glb = os.path.join(D, f"{slug}.glb")
with Stage("export") as st:
    bpy.ops.object.select_all(action="DESELECT"); low.select_set(True); bpy.context.view_layer.objects.active = low
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                              export_image_format="JPEG", export_jpeg_quality=75)
record("export", st.dt, tri_count([low]), glb=os.path.basename(glb), bytes=os.path.getsize(glb))

# ---- preview render (not part of the timed pipeline) -------------------------------
high.hide_render = True
sc.render.engine = "BLENDER_WORKBENCH"
sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
sc.render.resolution_x = sc.render.resolution_y = 640
lo, hi = bbox(low); c = (lo + hi) / 2; r = (hi - lo).length / 2
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = r * 2.1; cam.data.clip_end = 1000
cam.location = c + Vector((1, -1.3, 0.8)).normalized() * r * 4
cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.render.film_transparent = True
sc.render.filepath = os.path.join(D, "preview.png")
bpy.ops.render.render(write_still=True)

notes["final_tris"] = tri_count([low])
notes["script_total_s"] = round(time.perf_counter() - T0, 2)
t0 = os.environ.get("STL_T0")
if t0: notes["process_wall_s"] = round(time.time() - float(t0), 2)
notes["bake_source"] = "repaired high-poly (%d tris) built from the source STL(s) in this folder; not stored separately" % high_tris
with open(os.path.join(D, "notes.json"), "w") as f: json.dump(notes, f, indent=2)
print("DONE", slug, notes["final_tris"], "tris", notes["script_total_s"], "s", flush=True)
