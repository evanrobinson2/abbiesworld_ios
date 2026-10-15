import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path('C:/Users/Evan Robinson/Documents/Codex/2026-10-14/overcooked-2-deep-study/outputs/artist-restaurant-intake')
RAW=Path('C:/Users/Evan Robinson/Documents/Codex/2026-10-14/abbies-original-scenery-library/outputs/expansion/forest-fairy-artist/raw')
OUT=ROOT/'derived';OUT.mkdir(exist_ok=True)
roles={'FF-CHAR-ABBIE-UNICORN-001':'ChefAbbie','FF-CHAR-DADDY-FOX-001':'ChefDaddy','FF-CHAR-MOMMY-SNAIL-001':'ChefMommy','FF-KITCHEN-WOODLAND-COUNTER-001':'Counter'}
results=[]
for ident,role in roles.items():
 src=RAW/(ident+'.glb')
 if not src.exists():continue
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(src))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();o=bpy.context.object;o.name='SM_'+role
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 o.rotation_mode='XYZ';o.rotation_euler.z=math.pi/2;bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 coords=[o.matrix_world@Vector(v) for v in o.bound_box];lo=Vector([min(v[i] for v in coords) for i in range(3)]);hi=Vector([max(v[i] for v in coords) for i in range(3)])
 height=1.15 if role.startswith('Chef') else .95
 scale=height/(hi.z-lo.z);o.scale*=scale;o.location=Vector((-(hi.x+lo.x)*.5*scale,-(hi.y+lo.y)*.5*scale,-lo.z*scale));bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
 mats=[]
 for idx,slot in enumerate(o.material_slots):
  m=slot.material;m.name='M_Artist_'+role+'_'+str(idx)
  textures=[]
  for node in m.node_tree.nodes:
   if node.type=='TEX_IMAGE' and node.image:
    im=node.image;im.name='T_Artist_'+role+'_'+str(len(textures));im.filepath_raw=str(OUT/(im.name+'.png'));im.file_format='PNG';im.save();textures.append({'file':im.name+'.png','colorspace':im.colorspace_settings.name})
  mats.append({'name':m.name,'textures':textures})
 bpy.ops.export_scene.fbx(filepath=str(OUT/(o.name+'.fbx')),use_selection=True,object_types={'MESH'},global_scale=1,apply_unit_scale=True,bake_anim=False,axis_forward='-Y',axis_up='Z',path_mode='STRIP')
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(role+'.blend')))
 # Actual textured model render, front +X viewed from +X/+Y.
 bpy.ops.object.camera_add(location=(2.7,2.3,1.8));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,height*.48))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=height*1.6
 for loc,power,size in [((3,1,4),450,4),((-2,-3,3),350,3)]:
  bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,.5))-l.location).to_track_quat('-Z','Y').to_euler()
 s=bpy.context.scene;s.camera=cam;s.world.color=(.35,.35,.35);s.render.engine='BLENDER_EEVEE';s.render.resolution_x=800;s.render.resolution_y=800;s.render.resolution_percentage=100;s.view_settings.view_transform='Standard';s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/(role+'-model.png'));bpy.ops.render.render(write_still=True)
 results.append({'id':ident,'role':role,'fbx':o.name+'.fbx','materials':mats,'bounds_cm':[v*100 for v in o.dimensions],'forward_assumption':'+X after GLB+Z-to-Blender-Y rotation; inspect render','static':True})
(ROOT/'derived-manifest.json').write_text(json.dumps(results,indent=2))




