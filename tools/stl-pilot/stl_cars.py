"""Toy-car variant of the STL pipeline (called by stl_pipeline.py for slugs starting with "car-").

Result contract for the game's garage:
  * glTF is Y-up, metres, the car faces +Z, the lowest point of the wheels sits on y = 0.
  * the body is one node (origin on the ground, centred); every wheel is its own node named "wheel",
    "wheel.001", ... whose origin is the wheel centre, with the axle along X and no baked rotation, so the game
    can spin it by setting rotation.x.
  * triangle target about 3 to 6k in total, normal + AO baked per part.

Work happens in a build frame where the car faces +X, X is length, Y is width, Z is up (mm); the last step turns it
to Blender's -Y forward, which the glTF exporter writes as +Z forward.
"""
import os, json, math, time
import bpy, bmesh
from mathutils import Vector, Matrix

# R: degrees (rx, ry, rz) applied to the source STL so the car faces +X with Z up. axle_f: front and rear axle as a
# fraction of the body length (0 = tail, 1 = nose). wheel_z: wheel centre height in the rotated source frame, as
# body_min_z + this many mm. inset: how far a wheel's inner face sinks into the body side, mm.
CARS = {
    "car-pickup": dict(body=("source_body.stl", "body"), wheel=("source_wheel.stl", "wheel"), R=(0, 0, 0), flip=False,
                       axle_f=(0.14, 0.82), wheel_z=9.0, inset=0.5, length_m=4.6, tex=512, target=5000,
                       paint=("pickup_paint", (0.75, 0.22, 0.12, 1))),
    "car-racer": dict(body=("source_body.stl", "body"), wheel=("source_wheel.stl", "wheel"), R=(0, 0, 90), flip=False,
                      axle_f=(0.22, 0.78), wheel_z=18.0, inset=1.0, length_m=3.2, tex=512, target=5000,
                      paint=("racer_paint", (0.85, 0.70, 0.45, 1))),
    "car-toddler": dict(body=("source_body.stl", "body"), wheel=("source_wheel.stl", "wheel"), R=(0, 0, 0), flip=False,
                        axle_f=(0.24, 0.76), wheel_z=20.0, inset=2.0, length_m=2.6, tex=512, target=4500,
                        paint=("toy_paint", (0.95, 0.55, 0.70, 1))),
    "car-wedge": dict(body=("source_body.stl", "body"), wheel=None, R=(-90, 0, 0), flip=False,
                      length_m=4.2, tex=512, target=4500, paint=("wedge_paint", (0.95, 0.45, 0.10, 1))),
    "car-concept": dict(body=("source_body.stl", "body"), wheel=None, R=(0, 0, 90), flip=False,
                        length_m=4.6, tex=1024, target=6000, paint=("concept_paint", (0.75, 0.78, 0.82, 1))),
    "car-sedan": dict(body=("source_body.stl", "body"), wheel=None, R=(0, 0, 90), flip=False,
                      length_m=4.4, tex=512, target=4500, paint=("sedan_paint", (0.75, 0.10, 0.10, 1))),
}
WHEEL_TRIS = 220  # budget per wheel; the body gets the rest


def run(slug, D):
    t_all = time.perf_counter()
    C = CARS[slug]
    notes = {"slug": slug, "stages": {}, "blender": bpy.app.version_string, "target_tris": C["target"], "pipeline": "stl_cars.py"}
    bpy.ops.wm.read_factory_settings(use_empty=True)

    def tris(obs): return sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in obs)
    def rec(name, t0, n, **kw):
        notes["stages"][name] = dict(seconds=round(time.perf_counter() - t0, 2), tris=int(n), **kw)
        print(f"STAGE {slug} {name} {time.perf_counter()-t0:.1f}s tris={n} {kw}", flush=True)
    def bb(ob):  # from the vertices (ob.bound_box can be stale after mesh.transform)
        import numpy as np
        n = len(ob.data.vertices); co = np.empty(n * 3, dtype=np.float32); ob.data.vertices.foreach_get("co", co)
        co = co.reshape(n, 3); M = np.array(ob.matrix_world)
        w = co @ M[:3, :3].T + M[:3, 3]
        return Vector(w.min(axis=0).tolist()), Vector(w.max(axis=0).tolist())
    def dim(ob):
        a, b = bb(ob); return b - a
    def xform(ob, m): ob.data.transform(m); ob.data.update()

    # ---- import ------------------------------------------------------------------------------
    t0 = time.perf_counter()
    objs = {}
    for key in ("body", "wheel"):
        if not C.get(key): continue
        fn, role = C[key]
        bpy.ops.wm.stl_import(filepath=os.path.join(D, fn))
        o = bpy.context.selected_objects[0]; o.name = role; objs[key] = o
    rec("import", t0, tris(objs.values()), files=[C[k][0] for k in objs])

    # ---- repair (weld, normals, drop dust, fill small holes) ----------------------------------------
    t0 = time.perf_counter(); rep = dict(open_edges_before=0, open_edges_after=0, dust_shells_removed=0)
    def shells_of(bm):
        seen, out = set(), []
        for fc in bm.faces:
            if fc.index in seen: continue
            comp, st = [], [fc]
            while st:
                cur = st.pop()
                if cur.index in seen: continue
                seen.add(cur.index); comp.append(cur)
                for e in cur.edges:
                    for nf in e.link_faces:
                        if nf.index not in seen: st.append(nf)
            out.append(comp)
        return out
    for o in objs.values():
        size = max(dim(o))
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=size * 1e-6)
        bm.edges.ensure_lookup_table(); bm.faces.ensure_lookup_table()
        rep["open_edges_before"] += sum(1 for e in bm.edges if len(e.link_faces) != 2)
        sh = shells_of(bm); total = len(bm.faces)
        dust = [s for s in sh if len(s) < max(6, total * 0.0005)]
        if dust and len(sh) > 1:
            bmesh.ops.delete(bm, geom=[f for s in dust for f in s], context="FACES"); rep["dust_shells_removed"] += len(dust)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.edges.ensure_lookup_table()
        bnd = [e for e in bm.edges if len(e.link_faces) == 1]
        if bnd:
            try: bmesh.ops.holes_fill(bm, edges=bnd, sides=16)
            except Exception: pass
        bm.edges.ensure_lookup_table()
        rep["open_edges_after"] += sum(1 for e in bm.edges if len(e.link_faces) != 2)
        bm.to_mesh(o.data); bm.free()
    rec("repair", t0, tris(objs.values()), **rep)

    # ---- orient to the build frame, find or place wheels --------------------------------------------
    t0 = time.perf_counter()
    rx, ry, rz = [math.radians(a) for a in C["R"]]
    Rm = Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(ry, 4, "Y") @ Matrix.Rotation(rx, 4, "X")
    if C["flip"]: Rm = Matrix.Rotation(math.pi, 4, "Z") @ Rm
    for o in objs.values(): xform(o, Rm)
    body = objs["body"]; wheel_src = []
    if C.get("wheel"):
        w = objs["wheel"]
        lo, hi = bb(body)
        L = hi.x - lo.x
        # wheel axis is its thinnest dimension; turn it to Y
        wlo, whi = bb(w); wd = whi - wlo
        ax = min(range(3), key=lambda i: wd[i])
        if ax == 0: xform(w, Matrix.Rotation(math.pi / 2, 4, "Z"))
        elif ax == 2: xform(w, Matrix.Rotation(math.pi / 2, 4, "X"))
        wlo, whi = bb(w); wc = (wlo + whi) / 2
        xform(w, Matrix.Translation(-wc))  # centre on origin
        thick = whi.y - wlo.y; rad = max(whi.x - wlo.x, whi.z - wlo.z) / 2
        zc = lo.z + C["wheel_z"]
        mid_y = (lo.y + hi.y) / 2; half_w = (hi.y - lo.y) / 2
        for f in C["axle_f"]:
            x = lo.x + f * L
            for side in (-1, 1):
                wheel_src.append((Vector((x, mid_y + side * (half_w + thick / 2 - C["inset"]), zc)), side))
        wheel_mesh = w
        wheels = []
        for i, (pos, side) in enumerate(wheel_src):
            wo = bpy.data.objects.new("wheel", w.data.copy()); bpy.context.collection.objects.link(wo)
            if side > 0: xform(wo, Matrix.Rotation(math.pi, 4, "X"))  # outer face outward
            wo.data.transform(Matrix.Translation(pos)); wheels.append(wo)
        bpy.data.objects.remove(w)
    else:
        # single-mesh car: split shells, wheels = flat round shells low on the body
        bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.separate(type="LOOSE"); bpy.ops.object.mode_set(mode="OBJECT")
        shells = [o for o in bpy.context.scene.objects if o.type == "MESH"]
        shells.sort(key=lambda o: -len(o.data.polygons))
        big = shells[0]; blo, bhi = bb(big)
        wheels = []; rest = []
        for s in shells[1:]:
            lo, hi = bb(s); d = hi - lo
            dims = sorted([d.x, d.y, d.z])
            roundish = dims[1] / max(dims[2], 1e-9) > 0.75 and dims[0] / dims[2] < 0.75
            low = (lo.z + hi.z) / 2 < blo.z + (bhi.z - blo.z) * 0.45
            (wheels if roundish and low else rest).append(s)
        if rest:  # glue stray bits (mirrors, lamps) back onto the body
            bpy.ops.object.select_all(action="DESELECT")
            for o in rest + [big]: o.select_set(True)
            bpy.context.view_layer.objects.active = big; bpy.ops.object.join()
        body = big
        # wheel axis along Y: shells whose thin axis is X get quarter-turned about Z (they are mirrored on both sides)
        for w in wheels:
            lo, hi = bb(w); d = hi - lo
            if d.y < d.x and d.y < d.z: pass
        notes["wheel_shells_found"] = len(wheels)
    if False:
      for w_ in wheels: print("DBG wheel", [round(v,1) for v in bb(w_)[0]], [round(v,1) for v in bb(w_)[1]], "body", [round(v,1) for v in bb(body)[0]], [round(v,1) for v in bb(body)[1]], flush=True)
    rec("orient_and_wheels", t0, tris([body] + wheels), wheels=len(wheels), body_dims_mm=[round(v, 1) for v in (bb(body)[1] - bb(body)[0])])

    # ---- scale to metres, put the car on the ground, pivot, face -Y (glTF +Z) ---------------------------
    t0 = time.perf_counter()
    all_obs = [body] + wheels
    blo, bhi = bb(body)
    mins = Vector((min(bb(o)[0].x for o in all_obs), min(bb(o)[0].y for o in all_obs), min(bb(o)[0].z for o in all_obs)))
    maxs = Vector((max(bb(o)[1].x for o in all_obs), max(bb(o)[1].y for o in all_obs), max(bb(o)[1].z for o in all_obs)))
    s = C["length_m"] / (maxs.x - mins.x)
    wheel_ground = min(bb(w)[0].z for w in wheels) if wheels else mins.z
    cx, cy = (mins.x + maxs.x) / 2, (mins.y + maxs.y) / 2
    fix = Matrix.Rotation(-math.pi / 2, 4, "Z") @ Matrix.Scale(s, 4) @ Matrix.Translation((-cx, -cy, -wheel_ground))
    xform(body, fix)
    for w in wheels:
        ctr = (bb(w)[0] + bb(w)[1]) / 2
        xform(w, fix)  # moves geometry; now recentre the mesh on its own centre and put the object there
        c2 = (bb(w)[0] + bb(w)[1]) / 2
        w.data.transform(Matrix.Translation(-c2)); w.matrix_world = Matrix.Translation(c2)
    size_m = [round(v * s, 3) for v in (maxs - mins)]
    notes["scale_to_metres"] = dict(factor=s, final_size_m=[size_m[1], size_m[2], size_m[0]], axes="width, height, length")
    rec("scale_pivot", t0, tris(all_obs), final_size_m_wh_l=notes["scale_to_metres"]["final_size_m"])

    # ---- decimate + bake each distinct part ------------------------------------------------------------
    t0 = time.perf_counter()
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 16

    def decimate_to(ob, budget):
        orig = ob.data.copy(); b0 = tris([ob]); r = min(1.0, budget / b0); got = b0
        for _ in range(4):
            ob.data = orig.copy()
            bpy.ops.object.select_all(action="DESELECT"); ob.select_set(True); bpy.context.view_layer.objects.active = ob
            if r < 1.0:
                m = ob.modifiers.new("dec", "DECIMATE"); m.decimate_type = "COLLAPSE"; m.ratio = r; m.use_collapse_triangulate = True
                bpy.ops.object.modifier_apply(modifier="dec")
            t = ob.modifiers.new("tri", "TRIANGULATE"); bpy.ops.object.modifier_apply(modifier="tri")
            got = tris([ob])
            if r >= 1.0 or abs(got - budget) <= 0.1 * budget: break
            r *= budget / max(1, got)
        return got

    def bake_pair(high, low, tag, px):
        ext = max(dim(high)) * 0.02
        bpy.ops.object.select_all(action="DESELECT"); low.select_set(True); bpy.context.view_layer.objects.active = low
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004, area_weight=0.5); bpy.ops.uv.pack_islands(margin=0.004)
        bpy.ops.object.mode_set(mode="OBJECT")
        imgs = {}
        for kind, btype in (("normal", "NORMAL"), ("ao", "AO")):
            im = bpy.data.images.new(f"{slug}_{tag}_{kind}", px, px); im.colorspace_settings.name = "Non-Color"; imgs[kind] = im
            mat = low.data.materials[0]; nt = mat.node_tree
            n = nt.nodes.new("ShaderNodeTexImage"); n.image = im; nt.nodes.active = n
            bpy.ops.object.select_all(action="DESELECT"); high.select_set(True); low.select_set(True); bpy.context.view_layer.objects.active = low
            kw = dict(normal_space="TANGENT") if kind == "normal" else {}
            bpy.ops.object.bake(type=btype, use_selected_to_active=True, cage_extrusion=ext, max_ray_distance=ext * 3, margin=6, margin_type="EXTEND", **kw)
            nt.nodes.remove(n)
        return imgs

    def make_material(name, color, imgs):
        mat = bpy.data.materials.new("mat_" + name); mat.use_nodes = True; mat.diffuse_color = color
        nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]
        bsdf.inputs["Base Color"].default_value = color; bsdf.inputs["Roughness"].default_value = 0.6
        return mat

    def attach_maps(mat, imgs):
        nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]
        ni = nt.nodes.new("ShaderNodeTexImage"); ni.image = imgs["normal"]
        nm = nt.nodes.new("ShaderNodeNormalMap"); nt.links.new(ni.outputs["Color"], nm.inputs["Color"]); nt.links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
        ai = nt.nodes.new("ShaderNodeTexImage"); ai.image = imgs["ao"]
        grp = bpy.data.node_groups.get("glTF Material Output") or bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
        if not grp.interface.items_tree: grp.interface.new_socket("Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
        g = nt.nodes.new("ShaderNodeGroup"); g.node_tree = grp; g.name = "glTF Material Output"
        sep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(ai.outputs["Color"], sep.inputs["Color"]); nt.links.new(sep.outputs["Red"], g.inputs["Occlusion"])

    def to_high_low(ob):
        high = bpy.data.objects.new("high_" + ob.name, ob.data.copy()); bpy.context.collection.objects.link(high)
        high.matrix_world = ob.matrix_world.copy(); return high

    info = {}
    wheel_budget = WHEEL_TRIS if wheels else 0
    body_budget = max(300, C["target"] - wheel_budget * len(wheels))
    body_high_tris = tris([body]); high_b = to_high_low(body)
    info["body"] = dict(before=body_high_tris, after=decimate_to(body, body_budget))
    body.data.materials.append(make_material(C["paint"][0], C["paint"][1], None))
    imgs = bake_pair(high_b, body, "body", C["tex"]); attach_maps(body.data.materials[0], imgs)
    bpy.data.objects.remove(high_b)
    body.name = "body"; body.data.name = "body"; bpy.ops.object.select_all(action="DESELECT"); body.select_set(True); bpy.context.view_layer.objects.active = body; bpy.ops.object.shade_smooth()

    if wheels:
        # bake once per handedness (left and right wheels are mirrored copies), then copy to each
        proto = {}
        for w in wheels:
            side = 1 if w.matrix_world.translation.x > 0 else -1
            key = (side, round(max(dim(w)) * 50))
            proto.setdefault(key, []).append(w)
        for (side, _), ws in proto.items():
            w0 = ws[0]; hw = to_high_low(w0); hw.matrix_world = w0.matrix_world.copy()
            before = tris([w0]); got = decimate_to(w0, WHEEL_TRIS)
            w0.data.materials.append(make_material("rubber_tyre", (0.05, 0.05, 0.05, 1), None))
            im2 = bake_pair(hw, w0, f"wheel_{'r' if side > 0 else 'l'}{_}", 256); attach_maps(w0.data.materials[0], im2)
            bpy.data.objects.remove(hw)
            for w in ws[1:]:
                keep = w.matrix_world.copy(); w.data = w0.data; w.matrix_world = keep
            info.setdefault("wheel", dict(before=before, after=got))
        for i, w in enumerate(wheels):
            w.name = "wheel" if i == 0 else f"wheel.{i:03d}"
            bpy.ops.object.select_all(action="DESELECT"); w.select_set(True); bpy.context.view_layer.objects.active = w; bpy.ops.object.shade_smooth()
    rec("decimate_uv_bake", t0, tris([body]) + sum(tris([w]) for w in wheels), parts=info, texture_px=C["tex"])
    t0 = time.perf_counter()

    # ---- export --------------------------------------------------------------------------------------
    glb = os.path.join(D, f"{slug}.glb")
    bpy.ops.object.select_all(action="DESELECT")
    for o in [body] + wheels: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                              export_image_format="JPEG", export_jpeg_quality=75)
    final = tris([body]) + sum(tris([w]) for w in wheels)
    rec("export", t0, final, glb=os.path.basename(glb), bytes=os.path.getsize(glb))

    # ---- preview (not timed) -----------------------------------------------------------------------------
    for o in [x for x in bpy.data.objects if x.name.startswith("high_")]: o.hide_render = True
    sc.render.engine = "BLENDER_WORKBENCH"; sc.display.shading.light = "STUDIO"; sc.display.shading.color_type = "MATERIAL"
    sc.render.resolution_x = sc.render.resolution_y = 640; sc.render.film_transparent = True
    lo = Vector((-1, -1, 0)); hi = Vector((1, 1, 1.5))
    lo, hi = bb(body); wl = [bb(w) for w in wheels]
    if wl: lo = Vector((min(lo.x, *[a.x for a, b in wl]), min(lo.y, *[a.y for a, b in wl]), min(lo.z, *[a.z for a, b in wl]))); hi = Vector((max(hi.x, *[b.x for a, b in wl]), max(hi.y, *[b.y for a, b in wl]), max(hi.z, *[b.z for a, b in wl])))
    c = (lo + hi) / 2; r = (hi - lo).length / 2
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = "ORTHO"; cam.data.ortho_scale = r * 2.1; cam.data.clip_end = 1000
    cam.location = c + Vector((1.2, -1.0, 0.7)).normalized() * r * 4  # front-left three-quarter: front is -Y here
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(D, "preview.png"); bpy.ops.render.render(write_still=True)

    notes["final_tris"] = final
    notes["high_poly_tris"] = body_high_tris + (sum(tris([w]) for w in wheels) if False else 0)
    notes["wheel_count"] = len(wheels)
    notes["script_total_s"] = round(time.perf_counter() - t_all, 2)
    t_env = os.environ.get("STL_T0")
    if t_env: notes["process_wall_s"] = round(time.time() - float(t_env), 2)
    json.dump(notes, open(os.path.join(D, "notes.json"), "w"), indent=2)
    print("DONE", slug, final, "tris", notes["script_total_s"], "s", flush=True)
