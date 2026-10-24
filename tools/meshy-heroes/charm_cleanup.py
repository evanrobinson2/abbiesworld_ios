"""Clean Meshy backpack charms for the game.

    python3 charm_cleanup.py <charm_id> [<charm_id> ...]      (needs `pip install bpy`)

Reads tools/meshy-heroes/meshy/<id>/<id>.glb and writes
prototypes/ranch-atelier/dist/simulations/assets/backpack/charms/<name>.glb (name = id without "charm-"):
centred on its bounds, largest side 1.0 (the backpack scales it), Y up, at most 8k triangles, textures 1024 px
JPEG. Untextured charms keep Meshy's plain material, named "charm", for the game to shade. Writes cleanup.json
beside the Meshy files.
"""
import json, sys
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / "prototypes/ranch-atelier/dist/simulations/assets/backpack/charms"
TARGET_TRIS = 8000


def clean(cid):
    folder = HERE / "meshy" / cid
    src = folder / f"{cid}.glb"
    if cid.endswith("-tex"):  # a textured retexture rerun on the same geometry replaces the plain charm
        cid = cid.removesuffix("-tex")
        folder = HERE / "meshy" / cid / "tex"
        src = folder / "model.glb"
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(src))
    ms = [o for o in bpy.data.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in ms:
        o.select_set(True)
    bpy.context.view_layer.objects.active = ms[0]
    if len(ms) > 1:
        bpy.ops.object.join()
    m = bpy.context.view_layer.objects.active
    for o in [o for o in bpy.data.objects if o != m]:
        bpy.data.objects.remove(o)
    m.parent = None
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    tris0 = sum(len(p.vertices) - 2 for p in m.data.polygons)
    if tris0 > TARGET_TRIS:
        d = m.modifiers.new("decimate", "DECIMATE"); d.ratio = TARGET_TRIS / tris0
        bpy.ops.object.modifier_apply(modifier="decimate")
    lo = Vector([min(v.co[i] for v in m.data.vertices) for i in range(3)])
    hi = Vector([max(v.co[i] for v in m.data.vertices) for i in range(3)])
    s = 1.0 / max(hi - lo)
    for v in m.data.vertices:
        v.co = (v.co - (lo + hi) / 2) * s
    if not bpy.data.images:
        for mat in m.data.materials:
            mat.name = "charm"
    for img in bpy.data.images:
        if img.size[0] > 1024:
            img.scale(1024, 1024)
    m.name = cid
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"{cid.removeprefix('charm-')}.glb"
    bpy.ops.export_scene.gltf(filepath=str(dest), export_format="GLB", export_image_format="JPEG", export_jpeg_quality=88)
    tris = sum(len(p.vertices) - 2 for p in m.data.polygons)
    rec = {"source": str(src.relative_to(ROOT)), "out": str(dest.relative_to(ROOT)), "tris_before": tris0, "tris": tris,
           "largest_side": 1.0, "textured": bool(bpy.data.images), "bytes": dest.stat().st_size,
           "tool": f"Blender {bpy.app.version_string} (bpy), tools/meshy-heroes/charm_cleanup.py"}
    (folder / "cleanup.json").write_text(json.dumps(rec, indent=1))
    print(cid, tris0, "->", tris, "tris", rec["bytes"] // 1024, "KB", flush=True)


if __name__ == "__main__":
    for c in sys.argv[1:]:
        clean(c)
