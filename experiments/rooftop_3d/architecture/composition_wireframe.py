"""Place the A01 architecture in the source composition and render visible mesh edges."""
import bpy,json,math,hashlib,struct
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parent
C=json.loads((ROOT/'observer-composition-camera.json').read_text())
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'treehouse-architecture.blend'))
scene=bpy.context.scene

def geometry_signature():
 h=hashlib.sha256();dg=bpy.context.evaluated_depsgraph_get()
 for ob in sorted(scene.objects,key=lambda ob:ob.name):
  if ob.type not in {'MESH','CURVE'}:continue
  obj=ob.evaluated_get(dg);me=obj.to_mesh();h.update(ob.name.encode())
  for vertex in me.vertices:
   p=ob.matrix_world@vertex.co;h.update(struct.pack('<3f',*(round(v,5) for v in p)))
  obj.to_mesh_clear()
 return h.hexdigest()
before=geometry_signature()
cam=bpy.data.objects['CAM A02 Observer'];cam.name='CAM A06 Reference composition';cam.location=C['location'];cam.rotation_euler=Vector(C['direction']).to_track_quat('-Z','Y').to_euler();cam.data.lens=C['lens_mm'];cam.data.sensor_fit='HORIZONTAL';cam.data.sensor_width=36;cam.data.shift_x=C['shift_x'];cam.data.shift_y=C['shift_y'];scene.camera=cam
scene.render.resolution_x=1024;scene.render.resolution_y=771;scene.render.resolution_percentage=100;scene.render.pixel_aspect_x=1;scene.render.pixel_aspect_y=1
scene.render.film_transparent=False
bpy.context.view_layer.update()
projected=[]
for landmark in C['landmarks']:
 p=world_to_camera_view(scene,cam,Vector(landmark['world']));actual=[p.x,1-p.y];assert max(abs(a-b) for a,b in zip(actual,landmark['projected']))<.00001
 projected.append({'label':landmark['label'],'actual_uv':actual,'target_uv':landmark['target']})
assert before==geometry_signature()
# Save the reusable scene with original modular geometry and materials.
scene['camera_alignment']='A06 diagnostic only: full composition exposes model-layout differences; not an approved camera'
scene['user_camera_intent']=C['user_direction']
scene['geometry_sha256']=before
cam['reference_camera']=True
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.region_3d.view_perspective='CAMERA';area.spaces.active.overlay.show_floor=False
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'treehouse-composition-scene.blend'))
# Presentation-only render override: solid pale faces, visible dark wire lines.
white=bpy.data.materials.new('A06 Pale clay for wire review');white.diffuse_color=(.44,.51,.54,1);white.use_nodes=True
p=white.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.44,.51,.54,1);p.inputs['Roughness'].default_value=.9
bpy.context.view_layer.material_override=white
world=scene.world;world.use_nodes=True;world.node_tree.nodes.get('Background').inputs[0].default_value=(.86,.90,.93,1);world.node_tree.nodes.get('Background').inputs[1].default_value=.8
for ob in scene.objects:
 if ob.type=='LIGHT':ob.data.energy*=.22
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=0;scene.view_settings.gamma=1
scene.render.use_freestyle=True
settings=bpy.context.view_layer.freestyle_settings;settings.crease_angle=math.radians(130)
line=settings.linesets[0];line.select_silhouette=True;line.select_border=True;line.select_crease=True;line.select_edge_mark=True
line.select_contour=True;line.select_external_contour=True
style=line.linestyle;style.color=(.085,.16,.19);style.thickness=1.6
# Quad cage on the organic tree; architectural member outlines stay readable.
for ob in scene.objects:
 if ob.type=='MESH' and ob.name=='T01 Hollow living trunk':
  bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob
  bpy.context.tool_settings.mesh_select_mode=(False,True,False)
  for vertex in ob.data.vertices:vertex.select=False
  for face in ob.data.polygons:face.select=False
  for edge in ob.data.edges:
   a,b=(ob.data.vertices[i].co for i in edge.vertices)
   edge.select=abs(a.z-b.z)<.0001 or (min(edge.vertices)%8==0)
  bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.mark_freestyle_edge(clear=False);bpy.ops.object.mode_set(mode='OBJECT')
scene.render.filepath=str(ROOT/'A06-camera-wireframe.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'treehouse-composition-wireframe.blend'))
bpy.ops.render.render(write_still=True)
report={'geometry_unchanged':before==geometry_signature(),'geometry_sha256':before,'camera_projection_verified_in_blender':True,'landmarks':projected,'image':'A06-camera-wireframe.png','source_scene':'treehouse-architecture.blend','scene':'treehouse-composition-scene.blend','wire_scene':'treehouse-composition-wireframe.blend','notes':'Approximate reference camera on fixed architecture. Materials are overridden only for wire review. Organic fork and branch masses remain schematic. No new texture jobs.'}
(ROOT/'composition-camera-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('CAMERA_WIREFRAME_COMPLETE',json.dumps(report))
