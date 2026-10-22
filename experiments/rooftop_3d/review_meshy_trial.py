"""Compare one returned Meshy texture candidate against the existing alcove materials."""
import bpy, json
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parent;TRIAL=ROOT/'meshy_trial'
manifest=json.loads((TRIAL/'input-manifest.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'sunset-study.blend'))
scene=bpy.context.scene
wide=scene.camera
scene.camera=bpy.data.objects['CAM 04 · Alcove reference correction']
scene.cycles.samples=48
scene.render.filepath=str(ROOT/'renders'/'06-timber-before.png')
bpy.ops.render.render(write_still=True)

# Copy only the retained non-timber parts into this trial scene, leaving the asset library intact.
retained=bpy.data.collections.new('TRIAL · retained rose panel and glass');scene.collection.children.link(retained)
source_names=set(manifest['source_objects'])
for instance in list(scene.objects):
    if instance.get('asset_id') not in ('doorway.frame','doorway.panel'):continue
    for source in instance.instance_collection.objects:
        if source.name in source_names:continue
        o=source.copy();o.name='Retained · '+source.name
        retained.objects.link(o);o.matrix_world=instance.matrix_world @ source.matrix_world
    instance.hide_render=True;instance.hide_viewport=True

before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(TRIAL/'window-timber-textured.glb'))
imported=set(bpy.data.objects)-before
meshes=[o for o in imported if o.type=='MESH']
assert meshes,'No mesh returned by Meshy'
bpy.context.view_layer.update()
verts=[o.matrix_world @ v.co for o in meshes for v in o.data.vertices]
actual_min=Vector([min(v[i] for v in verts) for i in range(3)])
actual_max=Vector([max(v[i] for v in verts) for i in range(3)])
expected_min=Vector(manifest['bounds_local']['min']);expected_max=Vector(manifest['bounds_local']['max'])
actual_dimensions=actual_max-actual_min;expected_dimensions=expected_max-expected_min
ratios=[expected_dimensions[i]/actual_dimensions[i] for i in range(3)]
scale=sum(ratios)/3
assert max(abs(r/scale-1) for r in ratios)<.025,'Returned model proportions differ; inspect before fitting'
origin=Vector(manifest['origin_blender_z_up'])
expected_center=(expected_min+expected_max)/2;actual_center=(actual_min+actual_max)/2
placement=Matrix.Translation(origin+expected_center) @ Matrix.Scale(scale,4) @ Matrix.Translation(-actual_center)
root=bpy.data.objects.new('Meshy candidate · independent timber assembly',None);scene.collection.objects.link(root)
for o in imported:
    if o.parent not in imported:
        matrix=o.matrix_world.copy();o.parent=root;o.matrix_world=matrix
root.matrix_world=placement
root['provider']='Meshy';root['task_id']=json.loads((TRIAL/'job.json').read_text())['task_id']
root['status']='Texture candidate for review'

materials={m for o in meshes for m in o.data.materials if m}
maps=[]
for m in materials:
    if not m.use_nodes:continue
    for node in m.node_tree.nodes:
        if node.type=='TEX_IMAGE' and node.image:
            maps.append({'material':m.name,'image':node.image.name,'size':list(node.image.size)})
            node.image.pack()
assert maps,'Returned model has no attached image textures'
scene['milestone']='3a / single Meshy timber material candidate'
scene['next_gate']='Judge material fidelity against the source before using this technique elsewhere'
scene.render.filepath=str(ROOT/'renders'/'07-timber-meshy.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'meshy-material-study.blend'))
bpy.ops.render.render(write_still=True)
scene.camera=wide;scene.render.filepath=str(ROOT/'renders'/'08-timber-scene.png')
bpy.ops.render.render(write_still=True)
report={'source_parts':len(source_names),'returned_meshes':len(meshes),
        'expected_dimensions':list(expected_dimensions),'returned_dimensions':list(actual_dimensions),
        'uniform_fit_scale':scale,'fit_axis_ratios':ratios,'maps':maps,
        'library_modified':False,'baseline':'../renders/06-timber-before.png',
        'candidate':'../renders/07-timber-meshy.png','scene':'../renders/08-timber-scene.png'}
(TRIAL/'blender-review.json').write_text(json.dumps(report,indent=2)+'\n')
print('MESHY_CANDIDATE_RENDERED',json.dumps({'meshes':len(meshes),'texture_images':len(maps),'scale':scale}))
