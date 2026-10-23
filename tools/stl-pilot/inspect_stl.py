"""Inspect and preview one or more STL files in Blender (headless).

blender -b -P inspect_stl.py -- <out_dir> <file.stl> [<file.stl> ...]

Prints triangles, bounding box (source units), loose shell count and open
(non-manifold) edge count per file, and renders one workbench preview of all
files laid out side by side so a human can decide orientation and parts.
"""
import sys, os, time, math
import bpy, bmesh
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
out_dir, files = argv[0], argv[1:]
os.makedirs(out_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
x_cursor = 0.0
for f in files:
    t0 = time.perf_counter()
    bpy.ops.wm.stl_import(filepath=f)
    ob = bpy.context.selected_objects[0]
    ob.name = os.path.basename(f)
    me = ob.data
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    bb = [ob.matrix_world @ Vector(c) for c in ob.bound_box]
    mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb)))
    mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-3)
    bm.edges.ensure_lookup_table()
    open_edges = sum(1 for e in bm.edges if len(e.link_faces) != 2)
    # loose shells via union-find on faces
    seen, shells = set(), 0
    for fc in bm.faces:
        if fc.index in seen: continue
        shells += 1
        stack = [fc]
        while stack:
            cur = stack.pop()
            if cur.index in seen: continue
            seen.add(cur.index)
            for e in cur.edges:
                for nf in e.link_faces:
                    if nf.index not in seen: stack.append(nf)
    bm.free()
    size = mx - mn
    print(f"INSPECT {os.path.basename(f)} tris={tris} size=({size.x:.2f},{size.y:.2f},{size.z:.2f}) min=({mn.x:.2f},{mn.y:.2f},{mn.z:.2f}) shells={shells} open_edges={open_edges} t={time.perf_counter()-t0:.1f}s")
    ob.location.x += x_cursor - (mn.x + mx.x) / 2
    x_cursor += size.x * 1.2

# preview
bpy.ops.object.select_all(action="SELECT")
scene = bpy.context.scene
scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "STUDIO"
scene.display.shading.color_type = "SINGLE"
scene.render.resolution_x, scene.render.resolution_y = 1100, 520
objs = [o for o in scene.objects if o.type == "MESH"]
pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
c = sum(pts, Vector()) / len(pts)
r = max((p - c).length for p in pts)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam)
scene.camera = cam
cam.data.type = "ORTHO"; cam.data.ortho_scale = r * 2.2
d = Vector((1.0, -1.2, 0.8)).normalized()
cam.location = c + d * r * 4
cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
scene.render.filepath = os.path.join(out_dir, "inspect.png")
bpy.ops.render.render(write_still=True)
