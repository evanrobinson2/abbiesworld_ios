"""Restore Meshy's normalized tree to its authored size and retain the local study."""
import bpy,json
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent;TRIAL=ROOT/'meshy_bark_trial'
manifest=json.loads((TRIAL/'input-manifest.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'bark-local-study.blend'))
scene=bpy.context.scene
local=next(o for o in scene.objects if o.get('asset_id')=='tree.bare.refined')
local.hide_render=True;local.hide_viewport=True
before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(TRIAL/'tree-bark-textured.glb'))
imported=set(bpy.data.objects)-before;meshes=[o for o in imported if o.type=='MESH'];assert meshes
bpy.context.view_layer.update()
verts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
lo=Vector([min(v[i] for v in verts) for i in range(3)]);hi=Vector([max(v[i] for v in verts) for i in range(3)])
elo=Vector(manifest['bounds_local']['min']);ehi=Vector(manifest['bounds_local']['max'])
ratios=[(ehi-elo)[i]/(hi-lo)[i] for i in range(3)];scale=sum(ratios)/3
assert max(abs(v/scale-1) for v in ratios)<.025,'Unexpected model proportions'
placement=Matrix.Translation(Vector(manifest['origin_blender_z_up'])+(elo+ehi)/2)@Matrix.Scale(scale,4)@Matrix.Translation(-(lo+hi)/2)
col=bpy.data.collections.new('ASSET · Meshy textured bare tree');scene.collection.children.link(col)
root=bpy.data.objects.new('Bare tree · Meshy bark placement',None);col.objects.link(root)
for o in imported:
 for c in list(o.users_collection):c.objects.unlink(o)
 col.objects.link(o)
 if o.parent not in imported:
  mw=o.matrix_world.copy();o.parent=root;o.matrix_world=mw
root.matrix_world=placement;root['asset_id']='tree.bare.meshy';root['vegetation_included']=False
root['task_id']=json.loads((TRIAL/'job.json').read_text())['task_id']
for o in meshes:o['asset_id']='tree.bare.meshy.surface'
maps=[]
for mat in {m for o in meshes for m in o.data.materials if m}:
 for node in mat.node_tree.nodes:
  if node.type=='TEX_IMAGE' and node.image:
   node.image.pack();maps.append({'material':mat.name,'image':node.image.name,'size':list(node.image.size)})
assert maps
scene.camera=bpy.data.objects['CAM 05 · Sunset from the balcony'];scene.cycles.samples=32
scene['milestone']='3b / Meshy bark on independently modeled bare tree'
scene.render.filepath=str(ROOT/'renders'/'12-bark-meshy.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'bark-material-study.blend'))
bpy.ops.render.render(write_still=True)
scene.camera=bpy.data.objects['CAM 06 · Bark detail'];scene.render.filepath=str(ROOT/'renders'/'13-bark-meshy-detail.png');bpy.ops.render.render(write_still=True)
(TRIAL/'blender-review.json').write_text(json.dumps({'returned_meshes':len(meshes),'fit_axis_ratios':ratios,'uniform_fit_scale':scale,'maps':maps,'separate_foliage':True,'library_modified':False},indent=2)+'\n')
print('BARK_MATERIAL_REVIEW_COMPLETE')
