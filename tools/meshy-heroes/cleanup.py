"""Clean a rigged Meshy hero into the game's hero format (Character Studio's rig spec, tools/meshy-heroes/README.md).

    python3 cleanup.py <hero_id> [<hero_id> ...]       (needs `pip install bpy`, Blender as a Python module)

For each hero it reads tools/meshy-heroes/meshy/<id>/<id>_rigged_character_glb.glb and writes
prototypes/ranch-atelier/dist/studies/moon-mission/heroes/<id>.glb:
- Meshy's 24 bones become the 20 named bones (root, hips, spine, chest, neck, head, clavicle/upperarm/forearm/hand
  and thigh/shin/foot, _L/_R). Spine01, the head tips and the toes are merged into their neighbours, weights included.
- Metres, Y up, facing +Z; decimated to about 10k triangles; at most 4 weights per vertex, normalised.
- Faces split into materials skin / suit / boots / hair by body part and by the colour of Meshy's texture
  (all share the one texture). There is no visor: the round-2 astronauts have no helmets.
- Textures cut to 1024 px. Meshy's sample clip is dropped; the shared animation library is retargeted later.
The result's numbers go into cleanup.json beside the Meshy files, so the asset keeps its history.
"""
import json, math, sys
from pathlib import Path
import bpy, bmesh

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / "prototypes/ranch-atelier/dist/studies/moon-mission/heroes"
TARGET_TRIS = 10000

RENAME = {"Hips": "hips", "Spine02": "spine", "Spine": "chest", "neck": "neck", "Head": "head",
          "LeftShoulder": "clavicle_L", "LeftArm": "upperarm_L", "LeftForeArm": "forearm_L", "LeftHand": "hand_L",
          "RightShoulder": "clavicle_R", "RightArm": "upperarm_R", "RightForeArm": "forearm_R", "RightHand": "hand_R",
          "LeftUpLeg": "thigh_L", "LeftLeg": "shin_L", "LeftFoot": "foot_L",
          "RightUpLeg": "thigh_R", "RightLeg": "shin_R", "RightFoot": "foot_R"}
MERGE = {"Spine01": "Spine02", "head_end": "Head", "headfront": "Head", "LeftToeBase": "LeftFoot", "RightToeBase": "RightFoot"}


def merge_groups(mesh):
    vg = mesh.vertex_groups
    for src, dst in MERGE.items():
        if src not in vg:
            continue
        s, d = vg[src], vg.get(dst) or vg.new(name=dst)
        for v in mesh.data.vertices:
            for g in v.groups:
                if g.group == s.index and g.weight > 0:
                    d.add([v.index], g.weight, "ADD")
        vg.remove(s)


def fix_bones(arm):
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    eb["Spine"].parent = eb["Spine02"]
    eb["Spine02"].tail = eb["Spine"].head
    for b in MERGE:
        if b in eb:
            eb.remove(eb[b])
    root = eb.new("root")
    root.head, root.tail = (0, 0, 0), (0, 0.1, 0)
    eb["Hips"].parent = root
    bpy.ops.object.mode_set(mode="OBJECT")
    for old, new in RENAME.items():
        arm.data.bones[old].name = new


def dominant(mesh):
    names = {g.index: g.name for g in mesh.vertex_groups}
    out = []
    for v in mesh.data.vertices:
        best = max(v.groups, key=lambda g: g.weight, default=None)
        out.append(names.get(best.group, "") if best else "")
    return out


def texture(mesh):
    for n in mesh.material_slots[0].material.node_tree.nodes:
        if n.type == "TEX_IMAGE" and n.image and any(l.to_socket.name == "Base Color" for o in n.outputs for l in o.links):
            return n.image
    return None


def split_materials(mesh, bare_limbs, head_z):
    """skin / suit / boots / hair by body part and texture colour; all four share Meshy's texture."""
    img = texture(mesh)
    w, h = img.size
    px = img.pixels[:]
    def colour(uv):
        x, y = min(w - 1, int(uv[0] % 1 * w)), min(h - 1, int(uv[1] % 1 * h))
        i = (y * w + x) * 4
        return px[i:i + 3]
    bm = bmesh.new(); bm.from_mesh(mesh.data)
    uvl = bm.loops.layers.uv.active
    dom = dominant(mesh)
    face_col, face_bone, face_z = [], [], []
    for f in bm.faces:
        u = [sum(l[uvl].uv[k] for l in f.loops) / len(f.loops) for k in (0, 1)]
        face_col.append(colour(u))
        bones = [dom[v.index] for v in f.verts]
        face_bone.append(max(set(bones), key=bones.count))
        face_z.append(f.calc_center_median().z)
    # skin tone: the median colour of the cheeks (front of the head, the middle of the band between the head joint
    # and the crown), which a beard, a fringe or a collar rarely covers. Only head faces above the head joint can be hair.
    ztop = max(z for z, bn in zip(face_z, face_bone) if bn == "head")
    band = lambda z: head_z + 0.3 * (ztop - head_z) < z < head_z + 0.6 * (ztop - head_z)
    cheek = [face_col[i] for i, f in enumerate(bm.faces) if face_bone[i] == "head" and f.normal.y < -0.5 and band(face_z[i])]
    cheek = cheek or [c for c, bn in zip(face_col, face_bone) if bn == "head"]
    skin = [float(sorted(c[k] for c in cheek)[len(cheek) // 2]) for k in range(3)]
    ss = sum(skin)
    def near(c):  # same chroma as the skin, lit or shaded (painted textures bake in light and shadow)
        t = sum(c)
        return t > 0.15 and 0.55 < t / ss < 1.6 and math.dist((c[0] / t, c[1] / t), (skin[0] / ss, skin[1] / ss)) < 0.045
    zmin, zmax = min(face_z), max(face_z)
    tall = zmax - zmin
    roles = []
    for i in range(len(face_col)):
        b, c, z = face_bone[i], face_col[i], (face_z[i] - zmin) / tall
        if near(c) and (b in ("head", "neck") or b.startswith("hand") or bare_limbs):
            r = "skin"
        elif b == "head" and face_z[i] > head_z:
            r = "hair"
        elif b.startswith("foot") or (b.startswith("shin") and z < 0.16):
            r = "boots"
        else:
            r = "suit"
        roles.append(r)
    base = mesh.material_slots[0].material
    order = ["skin", "suit", "boots", "hair"]
    mesh.data.materials.clear()
    for r in order:
        m = base.copy(); m.name = r
        mesh.data.materials.append(m)
    bpy.data.materials.remove(base)
    for f, r in zip(bm.faces, roles):
        f.material_index = order.index(r)
    bm.to_mesh(mesh.data); bm.free()
    return {r: roles.count(r) for r in order}, [round(x, 3) for x in skin]


def clean(hid):
    job = next((j for j in json.loads((HERE / "meshy-queue.json").read_text())["jobs"] if j["id"] == hid), {})
    folder = ROOT / job["save_to"] if job.get("save_to") else HERE / "meshy" / hid
    src = folder / f"{hid}_rigged_character_glb.glb"
    out_dir = ROOT / job["deliver_to"] if job.get("deliver_to") else OUT
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(src))
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    mesh = next(o for o in bpy.data.objects if o.type == "MESH" and o.parent == arm)
    for o in [o for o in bpy.data.objects if o not in (arm, mesh)]:
        bpy.data.objects.remove(o)
    for a in list(bpy.data.actions):
        bpy.data.actions.remove(a)
    if arm.animation_data:
        arm.animation_data_clear()
    # metres: apply the armature's 0.01 scale to the rig and the mesh
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True); mesh.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    merge_groups(mesh)
    fix_bones(arm)
    for vg in mesh.vertex_groups:
        if vg.name in RENAME:
            vg.name = RENAME[vg.name]
    tris0 = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    bpy.ops.object.select_all(action="DESELECT")
    mesh.select_set(True); bpy.context.view_layer.objects.active = mesh
    dec = mesh.modifiers.new("decimate", "DECIMATE")
    dec.ratio = min(1.0, TARGET_TRIS / tris0)
    bpy.ops.object.modifier_move_to_index(modifier="decimate", index=0)
    bpy.ops.object.modifier_apply(modifier="decimate")
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    counts, skin = split_materials(mesh, bare_limbs="-tee" in hid, head_z=arm.data.bones["head"].head_local.z)
    for img in bpy.data.images:
        if img.size[0] > 1024:
            img.scale(1024, 1024)
    tris = sum(len(p.vertices) - 2 for p in mesh.data.polygons)
    mesh.name = hid; arm.name = f"{hid}_rig"
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / f"{hid}.glb"
    bpy.ops.export_scene.gltf(filepath=str(dest), export_format="GLB", export_animations=False,
                              export_image_format="JPEG", export_jpeg_quality=88, use_selection=False)
    z = [(mesh.matrix_world @ v.co).z for v in mesh.data.vertices]
    rec = {"source": str(src.relative_to(ROOT)), "out": str(dest.relative_to(ROOT)), "tris_before": tris0,
           "tris": tris, "height_m": round(max(z) - min(z), 3), "bones": [b.name for b in arm.data.bones],
           "faces_per_material": counts, "skin_colour": skin, "max_weights": 4, "texture_px": 1024,
           "bytes": dest.stat().st_size, "tool": f"Blender {bpy.app.version_string} (bpy), tools/meshy-heroes/cleanup.py"}
    (folder / "cleanup.json").write_text(json.dumps(rec, indent=1))
    print(hid, tris0, "->", tris, "tris", counts, rec["bytes"] // 1024, "KB", flush=True)
    return rec


if __name__ == "__main__":
    for h in sys.argv[1:]:
        clean(h)
