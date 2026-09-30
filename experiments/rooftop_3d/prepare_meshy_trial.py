"""Export only the alcove's timber for a single independently reviewable texture trial."""
import bpy, json, math, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'meshy_trial';OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'sunset-study.blend'))
dg=bpy.context.evaluated_depsgraph_get()
parts=[];names=[]
trial=bpy.data.collections.new('TRIAL · window timber');bpy.context.scene.collection.children.link(trial)
prefixes=('Door jamb','Door lintel','Door sill','Round timber','Window upright','Window crossbar')
for instance in list(bpy.context.scene.objects):
    if instance.get('asset_id') not in ('doorway.frame','doorway.panel'):continue
    for source in instance.instance_collection.objects:
        if not source.name.startswith(prefixes):continue
        mesh=bpy.data.meshes.new_from_object(source.evaluated_get(dg),depsgraph=dg)
        o=bpy.data.objects.new(source.name,mesh);trial.objects.link(o)
        o.matrix_world=instance.matrix_world @ source.matrix_world
        parts.append(o);names.append(source.name)
assert parts
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.join();model=bpy.context.object;model.name='Rooftop window timber'
origin=Vector((-1.99,2.43,1.85))
# Explicit object-space origin makes the returning model easy to place without scaling guesses.
transform=Matrix.Translation(-origin) @ model.matrix_world
model.data.transform(transform);model.matrix_world=Matrix.Identity(4)
model.data.materials.clear()
mat=bpy.data.materials.new('Neutral wood placeholder');mat.use_nodes=True
p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.3,.12,.10,1);p.inputs['Roughness'].default_value=.8
model.data.materials.append(mat)
for face in model.data.polygons:face.material_index=0
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.mesh.normals_make_consistent(inside=False) if hasattr(bpy.ops.mesh,'normals_make_consistent') else None
bpy.ops.uv.smart_project(angle_limit=math.radians(70),island_margin=.015)
bpy.ops.object.mode_set(mode='OBJECT')
path=OUT/'window-timber-input.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
model.data.calc_loop_triangles()
bounds=[Vector(v) for v in model.bound_box]
record={'input_model':path.name,'input_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'origin_blender_z_up':list(origin),'source_objects':names,'triangles':len(model.data.loop_triangles),
        'bounds_local':{'min':[min(v[i] for v in bounds) for i in range(3)],'max':[max(v[i] for v in bounds) for i in range(3)]},
        'scope':'Only window timber; existing rose panel, glass, scene and asset library remain unchanged',
        'uv':'Blender Smart Project with margins; preserved by retexture request'}
(OUT/'input-manifest.json').write_text(json.dumps(record,indent=2)+'\n')
print('TEXTURE_TRIAL_INPUT_READY',json.dumps({'parts':len(names),'triangles':record['triangles'],'bytes':path.stat().st_size}))
