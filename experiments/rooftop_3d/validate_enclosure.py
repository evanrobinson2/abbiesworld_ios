"""Reopen and check the review scene, then render a small real camera displacement."""
import bpy,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'enclosure-study.blend'));scene=bpy.context.scene
assert scene.camera.name=='CAM 07 · Sheltered reference composition'
libs=[bpy.path.abspath(l.filepath) for l in bpy.data.libraries];assert all(Path(p).exists() for p in libs)
components={c.get('asset_id'):c for c in scene.collection.children if c.get('asset_id')}
for key in ['ceiling.timber','tree.alcove.surround','deck.reference','railing.reference']:
 assert key in components,key
 assert not components[key].get('vegetation_included',True)
 assert all('Blossom' not in o.name and 'Petal' not in o.name for o in components[key].objects)
blossoms=[o for o in scene.objects if o.get('asset_id','').startswith('blossom.cluster.') and not o.hide_render]
cushions=[o for o in scene.objects if o.get('asset_id','').startswith('cushion.') and not o.hide_render]
assert len(blossoms)>=9 and len(cushions)==9
assert all(o.instance_collection is not None for o in blossoms+cushions)
textures={node.image for o in scene.objects if o.type=='MESH' and not o.hide_render for mat in o.data.materials if mat and mat.use_nodes for node in mat.node_tree.nodes if node.type=='TEX_IMAGE' and node.image}
assert textures and all(image.packed_file for image in textures)
manifest=json.loads((ROOT/'meshy_bark_trial/input-manifest.json').read_text());model=ROOT/'meshy_bark_trial'/manifest['input_model']
assert hashlib.sha256(model.read_bytes()).hexdigest()==manifest['input_sha256'],'Uploaded source geometry changed'
# Confirm independent placement: moving one pillow preserves every other placement matrix.
pillow=cushions[0];before={o.name:o.matrix_world.copy() for o in scene.objects};pillow.location.x+=.2;bpy.context.view_layer.update()
assert all(o.matrix_world==before[o.name] for o in scene.objects if o!=pillow)
pillow.matrix_world=before[pillow.name];bpy.context.view_layer.update()
report={'saved_scene_reopened':True,'camera':scene.camera.name,'libraries_resolved':len(libs),'separate_structural_collections':list(components),'independent_blossom_placements':len(blossoms),'independent_cushions':len(cushions),'packed_texture_images':len(textures),'uploaded_tree_hash_unchanged':True,'single_pillow_move_isolated':True,'native_runtime_verified':False,'camera_fit_is_approximate':True}
(ROOT/'enclosure-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('ENCLOSURE_VALIDATION_PASSED',json.dumps(report))
# A modest translation demonstrates real depth; do not resave over the intended observer.
scene.camera.location+=Vector((.4,-.24,.06));scene.cycles.samples=32;scene.render.resolution_percentage=85
scene.render.filepath=str(ROOT/'renders/16-enclosure-depth.png');bpy.ops.render.render(write_still=True)
