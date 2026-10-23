"""Make a Meshy ship exactly left-right symmetric.

    python symmetrize.py aurora_1_0 [aurora_1_1 ...]      (run from tools/aurora-mk2/meshy)

Per ship: import the raw GLB, find which horizontal axis (X or Z) the ship is closest to mirror-symmetric about,
cut at the centre plane through the middle of the hull, keep the half with more surface, mirror it back
(Mirror modifier, merge at the centre), apply, and export <id>_sym.glb. Also updates provenance.json with the axis, the symmetry score before and the face counts.
Blender via `pip install bpy`.
"""
import bpy, bmesh, json, sys, math
import numpy as np
from pathlib import Path
from mathutils import Vector
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent


def load(glb):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(glb))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return ob


def sym_error(pts, axis, c):
    m = pts.copy(); m[:, axis] = 2 * c - m[:, axis]
    d, _ = cKDTree(pts).query(m)
    return float(np.mean(d))


def run(jid):
    d = HERE / jid
    ob = load(d / f"{jid}.glb")
    pts = np.array([v.co[:] for v in ob.data.vertices])
    size = pts.max(0) - pts.min(0)
    horiz = [0, 2]
    # the ship is symmetric about its long vertical midplane, so mirror across the narrower horizontal axis
    # (a side-view concept gives Meshy a thin depth, so the width is the smaller of X and Z)
    ax = 0 if size[0] < size[2] else 2
    lo, hi = pts[:, ax].min(), pts[:, ax].max()
    cands = {ax: (sym_error(pts, ax, (lo + hi) / 2), (lo + hi) / 2)}
    err, c = cands[ax]
    # refine the centre plane by a small search around the bbox centre
    best = (err, c)
    for dc in np.linspace(-0.04, 0.04, 17) * size[ax]:
        e = sym_error(pts, ax, c + dc)
        if e < best[0]: best = (e, c + dc)
    err_before, c = best
    bm = bmesh.new(); bm.from_mesh(ob.data)
    n = Vector((1 if ax == 0 else 0, 0, 1 if ax == 2 else 0))
    pt = n * c
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=pt, plane_no=n, clear_inner=False, clear_outer=False)
    pos = [v for v in bm.verts if (v.co - pt).dot(n) > 1e-5]
    neg = [v for v in bm.verts if (v.co - pt).dot(n) < -1e-5]
    drop = neg if len(pos) >= len(neg) else pos
    bmesh.ops.delete(bm, geom=drop, context="VERTS")
    # mirror the kept half across the plane, flip the copy's faces, weld along the plane
    dup = bmesh.ops.duplicate(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:])["geom"]
    dv = [g for g in dup if isinstance(g, bmesh.types.BMVert)]
    df = [g for g in dup if isinstance(g, bmesh.types.BMFace)]
    for v in dv:
        v.co[ax] = 2 * c - v.co[ax]
    bmesh.ops.reverse_faces(bm, faces=df)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.002 * float(size[ax]))
    bm.to_mesh(ob.data); bm.free()
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data); bm.free()
    after = np.array([v.co[:] for v in ob.data.vertices])
    err_after = sym_error(after, ax, c)
    faces_full = len(ob.data.polygons)
    ob.name = f"{jid}_hull"
    bpy.ops.export_scene.gltf(filepath=str(d / f"{jid}_sym.glb"), export_format="GLB", use_selection=False)
    # a lighter copy for the study page viewer: about 15k triangles, same mirror plane (decimate keeps the symmetry
    # because the collapse is run on the already symmetric mesh and the result is re-mirrored below)
    keep = 15000 / max(len(ob.data.polygons), 1)
    if keep < 1:
        bm = bmesh.new(); bm.from_mesh(ob.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co[ax] < c - 1e-6], context="VERTS")
        bm.to_mesh(ob.data); bm.free()
        dm = ob.modifiers.new("dec", "DECIMATE"); dm.ratio = keep
        bpy.ops.object.modifier_apply(modifier="dec")
        bm = bmesh.new(); bm.from_mesh(ob.data)
        dup = bmesh.ops.duplicate(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:])["geom"]
        for v in [g for g in dup if isinstance(g, bmesh.types.BMVert)]:
            v.co[ax] = 2 * c - v.co[ax]
        bmesh.ops.reverse_faces(bm, faces=[g for g in dup if isinstance(g, bmesh.types.BMFace)])
        bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=0.002 * float(size[ax]))
        bm.to_mesh(ob.data); bm.free()
    bpy.ops.export_scene.gltf(filepath=str(d / f"{jid}_sym_15k.glb"), export_format="GLB", use_selection=False)
    prov = json.loads((d / "provenance.json").read_text())
    prov["symmetrize"] = {"mirror_axis": "xyz"[ax], "plane": round(float(c), 4), "asymmetry_before_m": round(err_before, 5),
                          "asymmetry_after_m": round(err_after, 6), "length_m_units": [round(float(s), 3) for s in size],
                          "faces_full": faces_full, "faces_viewer": len(ob.data.polygons), "tool": "Blender " + bpy.app.version_string}
    (d / "provenance.json").write_text(json.dumps(prov, indent=1))
    print(jid, "axis", "xyz"[ax], "before", round(err_before, 4), "after", round(err_after, 6), "faces", faces_full, len(ob.data.polygons), flush=True)



if __name__ == "__main__":
    for j in sys.argv[1:]:
        run(j)
