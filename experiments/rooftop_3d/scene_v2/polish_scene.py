"""B02: refine the assembled B01 scene without camera-dependent geometry."""
import bpy,math,json,random
from pathlib import Path
from mathutils import Vector,Matrix,noise
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'rooftop-scene.blend'));scene=bpy.context.scene;D=json.loads((ROOT/'design.json').read_text());rng=random.Random(908)
D['revision']='B02';D['deck'].update(board_width=.28,x_max=6.15);D['railing']['end_u']=6.03
D['tree']['clearance_radius']=.76;D['tree']['foreground_radii']=[r*.80 for r in D['tree']['foreground_radii']]
D['material_revision']='Darker irregular bark, lower foreground fill, dense connected canopy, staggered board joints'
(ROOT/'design-b02.json').write_text(json.dumps(D,indent=2)+'\n')
cols={k:bpy.data.collections.get(n) for k,n in [('deck','B01 Deck planks'),('framing','B02 Deck framing'),('rail','B03 Railing'),('tree','B04 Living branches'),('flowers','B07 Separate blossoms'),('lights','B10 Cameras and lights'),('env','B09 Mountain and sky layers')]}
wood=bpy.data.materials['B01 Aged rose deck wood'];frame=bpy.data.materials['B01 Deep mulberry structural wood'];bark=bpy.data.materials['B01 Furrowed bark']
# Material contrast follows the sheltered foreground / bright open sky arrangement.
for m,low,high in [(bark,(.018,.015,.027,1),(.068,.041,.052,1)),(bpy.data.materials['B01 Rose window panel'],(.34,.09,.155,1),(.40,.12,.195,1))]:
 r=next(n for n in m.node_tree.nodes if n.type=='VALTORGB');r.color_ramp.elements[0].color=low;r.color_ramp.elements[1].color=high
bpy.data.objects['B soft rosy foreground'].data.energy=280;bpy.data.objects['B cool sheltered bark fill'].data.energy=260
bpy.data.objects['B low peach sun'].data.energy=3.4;bpy.data.objects['B low peach sun'].data.color=(1,.54,.33)
bpy.data.objects['B open sky bounce'].data.energy=2350;bpy.data.objects['B open sky bounce'].data.color=(1,.67,.44)
# Thin and vary flowing bark ridges; the trunk itself gets real uneven surface relief.
for ob in list(cols['tree'].objects):
 if 'flowing bark ridge' in ob.name:
  for j,p in enumerate(ob.data.splines[0].bezier_points):p.radius*=.28+.18*math.sin(j*2.1+len(ob.name))**2
 elif ob.name=='B foreground sheltering trunk':
  for p in ob.data.splines[0].bezier_points:p.radius*=.80
for ob in list(cols['tree'].objects):
 if ob.type=='CURVE' and 'ridge' not in ob.name:
  bpy.ops.object.select_all(action='DESELECT');ob.select_set(True);bpy.context.view_layer.objects.active=ob;bpy.ops.object.convert(target='MESH');ob=bpy.context.object
  sub=ob.modifiers.new('Bark surface tessellation','SUBSURF');sub.subdivision_type='SIMPLE';sub.levels=1;sub.render_levels=1
  for scale,strength,label in [(.75,.065,'Slow uneven growth'),(.15,.034,'Bark fissures')]:
   tex=bpy.data.textures.new(ob.name+' '+label,type='CLOUDS');tex.noise_scale=scale;tex.noise_depth=2;dis=ob.modifiers.new(label,'DISPLACE');dis.texture=tex;dis.strength=strength;dis.mid_level=.5;dis.texture_coords='GLOBAL'
# Bring the shallow ribs down to the thinner sculpted trunk surface.
mainpts=[Vector(p) for p in D['tree']['foreground_path']]
for ob in cols['tree'].objects:
 if ob.type=='CURVE' and 'ridge' in ob.name:
  for p,center in zip(ob.data.splines[0].bezier_points,mainpts):p.co=center+(p.co-center)*.8
# Rebuild the same rectangular deck grid with plausible plank lengths and a framed trunk opening.
for key in ['deck','rail']:
 for ob in list(cols[key].objects):bpy.data.objects.remove(ob,do_unlink=True)
for ob in list(cols['framing'].objects):
 if not ob.name.startswith('Short high canopy brace'):bpy.data.objects.remove(ob,do_unlink=True)
F=D['deck'];O=Vector(F['origin']);yaw=math.radians(F['yaw_degrees']);rot=Matrix.Rotation(yaw,3,'Z')
def xyz(p):return O+rot@Vector(p)
def cube(name,loc,size,mat=frame,key='framing',angle=None,bevel=.007):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if angle is not None:ob.rotation_euler.z=angle
 for c in list(ob.users_collection):c.objects.unlink(ob)
 cols[key].objects.link(ob);ob.data.materials.append(mat);ob['component']=key
 if bevel:b=ob.modifiers.new('Worked edges','BEVEL');b.width=bevel;b.segments=2;ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return ob
def beam(name,a,b,w,d,key='framing'):
 a,b=Vector(a),Vector(b);ob=cube(name,(a+b)/2,(w,d,(b-a).length),key=key);ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return ob
cx,cy,_=rot.inverted()@(Vector((-4.55,-2.5,0))-O);half=.87
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=D['tree']['clearance_radius'],depth=2,location=(-4.55,-2.5,0));cutter=bpy.context.object
floor=[];width=F['board_width'];n=math.ceil((F['y_max']-F['y_min'])/width)
for row in range(n):
 y0=F['y_min']+row*width;y1=min(y0+width-F['gap'],F['y_max']);joints=[F['x_min']]+[F['x_min']+.2+.48*j for j in range(1,22) if (j-row)%5==0]+[F['x_max']];joints=sorted(set(x for x in joints if F['x_min']<=x<=F['x_max']))
 for seg,(a,b) in enumerate(zip(joints,joints[1:])):
  ob=cube('B02 plank %02d.%d'%(row,seg),xyz(((a+b)/2,(y0+y1)/2,-.035)),(b-a-.006,y1-y0,.07),wood,'deck',yaw,.004);ob['grain_axis']='deck X';floor.append(ob)
  if a<cx+.9 and b>cx-.9 and abs((y0+y1)/2-cy)<1:
   bpy.context.view_layer.objects.active=ob;mod=ob.modifiers.new('Tree opening','BOOLEAN');mod.object=cutter;mod.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cutter,do_unlink=True)
for i in range(22):
 x=F['x_min']+.2+i*.48
 if x>F['x_max']:continue
 start=max(F['y_min'],cy+half+.1) if abs(x-cx)<half+.05 else F['y_min']
 beam('B02 cross joist %02d'%i,xyz((x,start,-.18)),xyz((x,F['y_max'],-.18)),.1,.22)
for side in [-1,1]:
 for pair in [0,1]:
  x=cx+side*(half+.05+pair*.10);beam('B02 doubled tree trimmer %d.%d'%(side,pair),xyz((x,F['y_min'],-.18)),xyz((x,F['y_max'],-.18)),.10,.22)
beam('B02 tree opening header',xyz((cx-half,cy+half+.05,-.18)),xyz((cx+half,cy+half+.05,-.18)),.10,.22)
for y in [-6.3,-3.7,-.6]:
 spans=[(F['x_min'],cx-half-.1),(cx+half+.1,F['x_max'])] if abs(y-cy)<half else [(F['x_min'],F['x_max'])]
 for j,(a,b) in enumerate(spans):beam('B02 primary girder %.1f.%d'%(y,j),xyz((a,y,-.44)),xyz((b,y,-.44)),.22,.30)
for x in [F['x_min'],F['x_max']]:beam('B02 side fascia '+str(x),xyz((x,F['y_min'],-.15)),xyz((x,F['y_max'],-.15)),.13,.28)
for j,(a,b) in enumerate([(F['x_min'],cx-half),(cx+half,F['x_max'])]):beam('B02 front fascia '+str(j),xyz((a,F['y_min'],-.15)),xyz((b,F['y_min'],-.15)),.13,.28)
R=D['railing'];h=R['height'];rail=beam('B02 continuous handrail',xyz((0,0,h-.04)),xyz((R['end_u'],0,h-.04)),.14,.12,'rail');beam('B02 lower rail',xyz((0,0,.14)),xyz((R['end_u'],0,.14)),.08,.07,'rail')
for i in range(8):cube('B02 guard post '+str(i),xyz((R['end_u']*i/7,0,h/2)),(.12,.12,h),key='rail',angle=yaw)
for i in range(1,33):beam('B02 baluster '+str(i),xyz((R['end_u']*i/33,0,.17)),xyz((R['end_u']*i/33,0,h-.10)),.035,.042,'rail')
# Existing flower meshes stay reusable. Add clustered masses directly along branches.
flowers=list(cols['flowers'].objects);meshes=list({o.data.name:o.data for o in flowers}.values())
# Independent copies fill the canopy volumes, leaving the doorway clear.
for group,center,extent,count in [('far cherry crown',(4.5,3.8,5.15),(2.35,1.1,.85),100),('near shelter blossoms',(-3.6,.6,4.6),(1.75,1,.7),50)]:
 for i in range(count):
  loc=Vector(center)+Vector(tuple(rng.uniform(-1,1)*e for e in extent));ob=bpy.data.objects.new('B02 '+group+' %03d'%i,meshes[i%len(meshes)]);cols['flowers'].objects.link(ob);ob.location=loc;sz=rng.uniform(.55,1.1);ob.scale=(sz,sz,sz);ob.rotation_euler=(rng.random(),rng.random(),rng.random()*math.tau);ob['independent_from_tree']=True
# Small true branches connect the two crowns.
def curve(name,pts,radii):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=1;c.bevel_resolution=3;s=c.splines.new('BEZIER');s.bezier_points.add(len(pts)-1)
 for p,co,r in zip(s.bezier_points,pts,radii):p.co=co;p.radius=r;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 ob=bpy.data.objects.new(name,c);cols['tree'].objects.link(ob);c.materials.append(bark);return ob
for i in range(14):
 x=rng.uniform(1.5,6.4);curve('B02 flower-bearing twig '+str(i),[(x,3.1,4.7),(x+rng.uniform(-.5,.5),3.7,4.9),(x+rng.uniform(-.7,.7),4.4,5.3)],[.045,.028,.004])
# Base flowers soften the tree/deck opening without becoming part of its geometry.
for i in range(15):
 ob=bpy.data.objects.new('B02 foreground sakura '+str(i),meshes[i%len(meshes)]);cols['flowers'].objects.link(ob);ob.location=(-4.5+rng.uniform(-.65,.65),-2.4+rng.uniform(-.55,.55),rng.uniform(.04,.3));ob.scale=(.42,.42,.42);ob['independent_from_tree']=True
# Visible warm light among blossoms.
sunmat=bpy.data.materials.new('B02 visible warm sun');sunmat.use_nodes=True;bs=sunmat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,.7,.32,1);bs.inputs['Emission Color'].default_value=(1,.74,.36,1);bs.inputs['Emission Strength'].default_value=18
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=.75,location=(18,22,11));sun=bpy.context.object;sun.name='B02 distant sunset disc';sun.data.materials.append(sunmat)
for c in list(sun.users_collection):c.objects.unlink(sun)
cols['env'].objects.link(sun);sun.visible_shadow=False;sun.visible_diffuse=False;sun.visible_glossy=False
scene['revision']='B02';scene['status']='Complete desktop scene with camera/layout revision; final art and iPad integration remain open';scene.cycles.samples=48;scene.render.filepath=str(ROOT/'B02-assembled.png');scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-scene-b02.blend'));bpy.ops.render.render(write_still=True)
print('B02_SCENE_COMPLETE',len(scene.objects))
