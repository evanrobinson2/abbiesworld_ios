import os
root=os.path.dirname(__file__)
p=os.path.join(root,'create-organic-assets.py')
s=open(p,encoding='utf-8-sig').read();prefix=s.split('manifest=[];start=')[0]
prefix=prefix.replace(" with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump(manifest,f,indent=2)","")
prefix=prefix.replace("'idle':['explore','settling-in']","'idle':['explore','settling-in'],'carried':['hauling','walking-loaded']")
exec(compile(prefix,p,'exec'))
for key,h in {'fur':'BD9062','collar':'9B6656','tag':'D4B65F'}.items():
 m=bpy.data.materials.new(key);m.diffuse_color=tuple(int(h[i:i+2],16)/255 for i in (0,2,4))+(1,);m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=m.diffuse_color;m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.9;M[key]=m

def dog(state):
 rest=state=='rest';z=.32 if rest else .67
 ball('Retriever body',(0,0,z),(.57,.28,.31),'fur');ball('Fluffy chest',(.33,0,z+.04),(.3,.31,.34),'fur');ball('Cream bib',(.52,0,z),(.08,.22,.26),'cream')
 for x in [-.38,.36]:
  for y in [-.2,.2]:
   if rest:ball('Folded haunch',(x,y,.16),(.23,.13,.15),'fur');ball('Resting paw',(x+.2,y,.09),(.2,.13,.09),'cream')
   else:beam('Leg',(x,y,.1),(x,y,z-.06),.08,'fur');ball('Cream paw',(x+.06,y,.075),(.14,.105,.08),'cream')
 headz=z+.48;hx=.55
 beam('Neck',(.36,0,z+.14),(.49,0,headz-.03),.2,'fur');ball('Round head',(hx,0,headz),(.27,.24,.26),'fur')
 ball('Cream muzzle',(hx+.21,0,headz-.08),(.2,.18,.13),'cream');ball('Nose',(hx+.37,0,headz-.04),(.07,.105,.07),'eye')
 for side in [-1,1]:
  ball('Floppy ear',(hx-.1,side*.23,headz-.07),(.15,.09,.28),'fur',(0,-.13,side*.13));ball('Eye',(hx+.13,side*.19,headz+.055),(.038,.024,.041),'eye');ball('Glint',(hx+.14,side*.208,headz+.068),(.012,.008,.013),'cream')
 for x,y,z1 in [(-.42,0,z+.26),(.12,-.19,z+.26),(.24,.17,z+.24)]:ball('Fur tuft',(x,y,z1),(.16,.13,.12),'fur')
 # Curved retriever tail, broad at the base and feathered at the tip.
 beam('Tail base',(-.5,0,z+.09),(-.81,.02,z+.27),.095,'fur');beam('Tail tip',(-.81,.02,z+.27),(-.93,.03,z+.53),.08,'fur')
 for k in range(3):ball('Tail feather',(-.76-k*.06,-.015,z+.24+k*.09),(.13,.075,.12),'cream')
 # Collar is a short rounded ring around the neck, with a brass tag on the chest.
 bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,location=(.44,0,z+.27),major_radius=.205,minor_radius=.033);o=bpy.context.object;o.name='Terracotta collar';o.rotation_euler[1]=-.3;o.data.materials.append(M['collar'])
 ball('Brass tag',(.62,-.02,z+.18),(.028,.065,.065),'tag')
 if state=='carried':
  beam('Small carried stick',(hx+.31,-.43,headz-.14),(hx+.31,.43,headz-.14),.043,'wood')
  ball('Stick cut end',(hx+.31,-.44,headz-.14),(.044,.012,.044),'cut')
old=json.load(open(os.path.join(OUT,'manifest.json')));manifest=[];start=time.perf_counter()
for i,state in enumerate(['idle','carried','rest']):
 export_asset('marley',state,dog,i)
 item=manifest[-1];item['simulationMapping']={'actor':'marley','species':'dog','activities':['resting','rest'] if state=='rest' else ['hauling','carrying'] if state=='carried' else ['walking','walking-home','idle'],'kind':'static-pose','note':'Retriever worker; carried pose shows one small stick for cargo > 0. Not an animation.'}
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'marley-editable.blend'))
combined=[a for a in old if a['subject']!='marley']+manifest
temp=os.path.join(OUT,'manifest.pending.json')
with open(temp,'w') as f:json.dump(combined,f,indent=2)
os.replace(temp,os.path.join(OUT,'manifest.json'))
with open(os.path.join(OUT,'marley-timings.json'),'w') as f:json.dump({'assets':3,'generationAndExportSeconds':round(time.perf_counter()-start,3),'excludes':'Authoring, review and rendering'},f,indent=2)
scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=1350;scene.render.resolution_y=650;scene.render.resolution_percentage=100;scene.world.color=(.7,.7,.7)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.03));bpy.context.object.data.materials.append(M['cream'])
bpy.ops.object.light_add(type='AREA',location=(1,-4,8));bpy.context.object.data.energy=1600;bpy.context.object.data.size=8
bpy.ops.object.camera_add(location=(10,-14,9));cam=bpy.context.object;cam.rotation_euler=(Vector((3.8,0,.4))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=11;scene.camera=cam;scene.view_settings.view_transform='Standard';scene.render.filepath=os.path.join(OUT,'marley-contact-sheet.png');bpy.ops.render.render(write_still=True)
