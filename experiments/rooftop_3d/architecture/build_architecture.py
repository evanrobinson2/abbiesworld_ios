"""A01: world-space architecture from design.json. No screen-space geometry."""
import bpy,bmesh,json,math,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent
D=json.loads((ROOT/'design.json').read_text());A=D['alcove'];R=D['roof'];F=D['deck'];T=D['tree']
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
 if c.name!='Collection':bpy.data.collections.remove(c)
scene=bpy.context.scene;scene.unit_settings.system='METRIC'
yaw=math.radians(A['yaw_degrees']);origin=Vector(A['origin']);rot=Matrix.Rotation(yaw,4,'Z')
def xyz(p):return origin+rot.to_3x3()@Vector(p)
collections={};parts=[]
for ident,label in [('deck','01 Deck boards'),('subfloor','02 Joists and girders'),('tree','03 Hollow trunk'),('fork','04 Foreground living fork'),('alcove','05 Window alcove'),('beams','06 Posts beams and braces'),('rafters','07 Seated rafters'),('ceiling','08 Timber canopy boarding'),('railing','09 Balcony railing'),('furniture','10 Bench and cushions'),('lighting','11 Review cameras and lights')]:
 c=bpy.data.collections.new(label);scene.collection.children.link(c);c['asset_id']=ident;c['vegetation_included']=False;collections[ident]=c
 if ident!='lighting':c.asset_mark()
def mat(name,color,rough=.8):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;return m
wood=mat('Structural timber · neutral ivory',(.61,.57,.49));tree=mat('Living tree mass · warm grey',(.26,.28,.28));panelmat=mat('Window recess · muted rose',(.43,.18,.24));glass=mat('Window glass · amber study',(.65,.47,.23));cushion=mat('Independent cushions · pale rose',(.67,.43,.45));steel=mat('Interface markers · charcoal',(.12,.14,.15))
def register(o,name,group,role,attachment=None):
 o.name=name
 for c in list(o.users_collection):c.objects.unlink(o)
 collections[group].objects.link(o);o['part_id']=name;o['role']=role
 if attachment:o['attaches_to']=attachment
 parts.append({'id':name,'group':group,'role':role,'attachment':attachment,'object':o.name});return o

def cube(name,loc,size,group='beams',material=wood,local=True,role='timber member',bevel=.008,attachment=None):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 o.location=xyz(loc) if local else loc
 if local:o.rotation_euler.z=yaw
 o.data.materials.append(material);register(o,name,group,role,attachment)
 if bevel:m=o.modifiers.new('Small worked edges','BEVEL');m.width=bevel;m.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o

def beam(name,a,b,width,depth,group='beams',local=True,material=wood,attachment=None):
 a,b=(xyz(a),xyz(b)) if local else (Vector(a),Vector(b));o=cube(name,(a+b)/2,(width,depth,(b-a).length),group,material,False,attachment=attachment);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def mesh(name,verts,faces,group,material,local=True,role='modeled piece'):
 me=bpy.data.meshes.new(name);me.from_pydata([xyz(v) if local else v for v in verts],[],faces);me.materials.append(material);me.update();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);register(o,name,group,role)
 bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free();return o

def boolean(obj,cutter):
 bpy.context.view_layer.objects.active=obj;m=obj.modifiers.new('Designed opening','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cutter;bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(cutter,do_unlink=True)

def cutter(loc,size):
 bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.location=xyz(loc);o.rotation_euler.z=yaw;return o

# Hollow trunk shell. The open alcove is a cut volume, not overlapping bark columns.
levels=T['levels'];verts=[];faces=[];n=128
for inner in [False,True]:
 for z,aa,bb in levels:
  a=aa-(T['shell_thickness'] if inner else 0);b=bb-(T['shell_thickness'] if inner else 0)
  for k in range(n):
   angle=2*math.pi*k/n;flute=1 if inner else 1+.017*math.sin(9*angle+.2*z)
   verts.append((a*math.cos(angle)*flute,T['center_v']+b*math.sin(angle)*flute,z))
layer=len(levels)*n
for shell in [0,1]:
 for j in range(len(levels)-1):
  for k in range(n):
   a=shell*layer+j*n+k;b=shell*layer+j*n+(k+1)%n;faces.append((a,b,b+n,a+n))
for row in [0,len(levels)-1]:
 for k in range(n):
  a=row*n+k;b=row*n+(k+1)%n;faces.append((a,a+layer,b+layer,b))
trunk=mesh('T01 Hollow living trunk',verts,faces,'tree',tree)
opening_bottom=-1.7;opening_top=T['opening_head'];vfront=-2.5;vback=T['opening_back_v']
boolean(trunk,cutter((0,(vfront+vback)/2,(opening_bottom+opening_top)/2),(T['opening_width'],vback-vfront,opening_top-opening_bottom)))
pocket=T['roof_pocket'];boolean(trunk,cutter((0,(pocket['v_front']+pocket['v_back'])/2,(pocket['z_bottom']+pocket['z_top'])/2),(pocket['u_width'],pocket['v_back']-pocket['v_front'],pocket['z_top']-pocket['z_bottom'])))
for f in trunk.data.polygons:f.use_smooth=True

def limb(name,coords,radii,group='fork',local=True):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16;c.bevel_depth=1;c.bevel_resolution=4;c.use_fill_caps=True
 sp=c.splines.new('BEZIER');sp.bezier_points.add(len(coords)-1)
 for p,co,r in zip(sp.bezier_points,coords,radii):p.co=xyz(co) if local else co;p.radius=r;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);scene.collection.objects.link(o);c.materials.append(tree);register(o,name,group,'Living branch; independent from timber');return o
fork=limb('T02 Foreground fork',T['fork_path_uvz'],T['fork_radii'])
limb('T03 Lower front bearing limb',[xyz((-2.1,.30,-1.45)),(-1.0,-1.0,-1.18),(1,-2.1,-.93),(2.85,-2.40,-.775)],[.44,.34,.27,.20],local=False)
limb('T04 Lower rear bearing limb',[xyz((1.4,1.05,-1.35)),(.2,2.5,-1.1),(1.8,2.45,-.89),(2.85,2.43,-.775)],[.44,.34,.27,.20],local=False)

limb('T05 Middle bearing limb',[xyz((-.8,.8,-1.40)),(-.2,.9,-1.02),(0,0,-.835),(1,-1,-1.0)],[.40,.32,.26,.06],local=False)

# Deck boards clipped to a single footprint; tree penetrations are real cutouts.
poly=[Vector(p) for p in F['outline']]
def clip(poly,x,above):
 out=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  ia=a.x>=x if above else a.x<=x;ib=b.x>=x if above else b.x<=x
  if ia:out.append(a)
  if ia!=ib:out.append(a.lerp(b,(x-a.x)/(b.x-a.x)))
 return out
xmin=min(p.x for p in poly);xmax=max(p.x for p in poly)
# The fork opening is derived from its actual deck-level center and radius.
base=xyz(T['fork_path_uvz'][1]);fork_hole=Vector((base.x,base.y,0))
for i in range(math.ceil((xmax-xmin)/F['board_width'])):
 x0=xmin+i*F['board_width'];x1=min(x0+F['board_width']-F['board_gap'],xmax);p=clip(clip(poly,x0,True),x1,False)
 if len(p)<3:continue
 count=len(p);vs=[(q.x,q.y,z) for z in [-F['board_thickness'],0] for q in p];fs=[tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]+[(j,(j+1)%count,(j+1)%count+count,j+count) for j in range(count)]
 board=mesh('D%02d Deck board'%i,vs,fs,'deck',wood,False)
 if x0<fork_hole.x+F['tree_opening_clear_radius'] and x1>fork_hole.x-F['tree_opening_clear_radius']:
  bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=F['tree_opening_clear_radius'],depth=.8,location=fork_hole);boolean(board,bpy.context.object)
 bevel=board.modifiers.new('Board edges','BEVEL');bevel.width=.004;bevel.segments=2
joist_top=-F['board_thickness'];joist_bottom=joist_top-F['joist_depth'];girder_z=joist_bottom-F['girder_depth']/2
opening_half=F['tree_opening_frame_half_width'];jw=F['joist_width'];cx,cy=fork_hole.x,fork_hole.y
for i in range(12):
 y=-2.42+i*.44;xleft=max(-3.30,y-3.0+.07);xright=3.30
 if abs(y-cy)<opening_half+jw*2.2:
  if abs(y-cy)>opening_half:continue
  xleft=max(xleft,cx+opening_half+jw)
 cube('J%02d Floor joist'%i,((xleft+xright)/2,y,(joist_top+joist_bottom)/2),(xright-xleft,jw,F['joist_depth']),'subfloor',local=False,role='Crosswise bearing under longitudinal deck boards')
for side in [-1,1]:
 for pair in [0,1]:
  y=cy+side*(opening_half+jw/2+pair*jw);xleft=max(-3.30,y-3.0+.07)
  cube('JH%d.%d Tree-opening trimmer'%(side,pair),((xleft+3.30)/2,y,(joist_top+joist_bottom)/2),(3.30-xleft,jw,F['joist_depth']),'subfloor',local=False,role='Doubled transverse trimmer at tree opening')
cube('JH0 Tree-opening inner header',(cx+opening_half+jw/2,cy,(joist_top+joist_bottom)/2),(jw,2*opening_half,F['joist_depth']),'subfloor',local=False,role='Header receives interrupted joist ends')
for i,x in enumerate(F['girder_centers_x']):
 ymax=min(2.50,x+3.0-.05)
 cube('G%02d Primary girder'%(i+1),(x,(-2.5+ymax)/2,girder_z),(F['girder_width'],ymax+2.5,F['girder_depth']),'subfloor',local=False,role='Longitudinal girder carrying transverse joists',attachment='Tree bearing zones')
beam('G04 Chamfer ledger',(-1.93,A['post_v'],girder_z),(1.93,A['post_v'],girder_z),F['girder_width'],F['girder_depth'],'subfloor',True,attachment='Tree bearing zones')

# Recess: post positions and header bearing dimensions are shared by roof and elevation.
for i,u in enumerate(A['post_centers_u']):cube('P0%d Alcove bearing post'%(i+1),(u,A['post_v'],A['header_bottom']/2),(A['post_width'],A['post_depth'],A['header_bottom']),attachment='G04 Chamfer ledger')
cube('B01 Rear canopy and alcove header',(0,A['post_v'],A['header_bottom']+A['header_depth']/2),(R['u_max']-R['u_min'],R['beam_width'],A['header_depth']),attachment='P01, P02')
for u in [-1.255,1.255]:cube('W00 Recess side reveal %.2f'%u,(u,-.12,(A['panel_bottom']+A['panel_top'])/2),(.055,.28,A['panel_top']-A['panel_bottom']),'alcove')
cube('W01 Lower rose wall',(0,A['panel_v'],A['panel_bottom']/2),(A['panel_width'],.14,A['panel_bottom']),'alcove',panelmat)
panel=cube('W02 Round-window panel',(0,A['panel_v'],(A['panel_bottom']+A['panel_top'])/2),(A['panel_width'],A['panel_thickness'],A['panel_top']-A['panel_bottom']),'alcove',panelmat,bevel=0)
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=A['window_inner_radius'],depth=.65,location=xyz((0,A['panel_v'],A['window_center_z'])))
hole=bpy.context.object;hole.rotation_euler=(rot@Matrix.Rotation(math.pi/2,4,'X')).to_euler();boolean(panel,hole)
vs=[];fs=[];n=96
for v,r in [(-.08,A['window_outer_radius']),(-.08,A['window_inner_radius']),(.07,A['window_outer_radius']),(.07,A['window_inner_radius'])]:
 vs.extend((r*math.cos(i*2*math.pi/n),v,A['window_center_z']+r*math.sin(i*2*math.pi/n)) for i in range(n))
for i in range(n):
 j=(i+1)%n;fs.extend([(i,j,n+j,n+i),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i),(2*n+i,3*n+i,3*n+j,2*n+j)])
mesh('W03 Flat window surround',vs,fs,'alcove',wood)
for i,u in enumerate([-.23,0,.23]):
 extent=math.sqrt(A['window_inner_radius']**2-u**2);cube('W04.%d Vertical lattice'%i,(u,-.012,A['window_center_z']),(.045,.075,2*extent),'alcove')
for i,z in enumerate([-.16,.16]):
 extent=math.sqrt(A['window_inner_radius']**2-z**2);cube('W05.%d Horizontal lattice'%i,(0,-.028,A['window_center_z']+z),(2*extent,.075,.045),'alcove')
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=A['window_inner_radius'],depth=.015,location=xyz((0,.16,A['window_center_z'])));pane=bpy.context.object;pane.rotation_euler=(rot@Matrix.Rotation(math.pi/2,4,'X')).to_euler();pane.data.materials.append(glass);register(pane,'W06 Recessed pane','alcove','Fixed window glazing')
cube('W07 Continuous sill',(0,-.09,A['sill_top']-A['sill_depth']/2),(2.86,.32,A['sill_depth']),'alcove')
cube('F01 Bench seat',(0,A['bench_v'],A['bench_top']-.055),(A['bench_width'],A['bench_depth'],.11),'furniture')
for i,u in enumerate([-.98,.98]):cube('F02.%d Bench leg'%i,(u,A['bench_v'],.16),(.11,.30,.32),'furniture')

# Timber canopy: planar pitch, horizontal beams and explicitly seated rafters.
slope=R['slope_dz_per_minus_v'];theta=math.atan(slope);cos=math.cos(theta)
def beam_bottom(v):return R['rear_beam_bottom']+slope*(R['rear_beam_v']-v)
def beam_top(v):return beam_bottom(v)+R['beam_depth']
def rafter_lower(v):return beam_top(v)-.045
def rafter_upper(v):return rafter_lower(v)+R['rafter_depth']/cos
for ident,v in [('B02 Front canopy beam',R['front_beam_v'])]:
 cube(ident,(0,v,beam_bottom(v)+R['beam_depth']/2),(R['u_max']-R['u_min'],R['beam_width'],R['beam_depth']),attachment='P01, P02' if ident.startswith('B01') else 'K01, K02')
# The rear beam and alcove header are the same member, directly over the posts.
for i,u in enumerate(R['brace_u']):
 beam('K0%d Canopy knee brace'%(i+1),(u,A['post_v'],R['brace_post_z']),(u,R['front_beam_v'],beam_bottom(R['front_beam_v'])),R['brace_width'],R['brace_width'],attachment='P01/B02' if i==0 else 'P02/B02')
for i in range(R['rafter_count']):
 u=-1.48+2.96*i/(R['rafter_count']-1);v0=R['front_v'];v1=R['rear_v'];bottom=[(v0,rafter_lower(v0))]
 for bv in sorted([R['front_beam_v'],R['rear_beam_v']]):
  lo=max(v0,bv-R['beam_width']/2);hi=min(v1,bv+R['beam_width']/2)
  bottom.extend([(lo,rafter_lower(lo)),(lo,beam_top(bv)),(hi,beam_top(bv)),(hi,rafter_lower(hi))])
 bottom.append((v1,rafter_lower(v1)));profile=bottom+[(v1,rafter_upper(v1)),(v0,rafter_upper(v0))];n=len(profile)
 verts=[(u+du,v,z) for du in [-R['rafter_width']/2,R['rafter_width']/2] for v,z in profile];faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
 o=mesh('R%02d Seated canopy rafter'%i,verts,faces,'rafters',wood);o['attaches_to']='B01, B02'
length=R['rear_v']-R['front_v'];count=math.ceil(length/R['boarding_width']);width=length/count
for i in range(count):
 v=R['front_v']+(i+.5)*width;z=rafter_upper(v)+R['boarding_thickness']/(2*cos)
 o=cube('S%02d Canopy board'%i,(0,v,z),(R['u_max']-R['u_min'],(width-R['boarding_gap'])/cos,R['boarding_thickness']),'ceiling',bevel=.002);o.rotation_euler=(rot@Matrix.Rotation(-theta,4,'X')).to_euler();o['attaches_to']='R00-R06'

# Rail geometry follows two actual platform edges; front remains open for the review camera.
for run,points in enumerate([D['railing']['reference_run'],D['railing']['return_run']]):
 a,b=map(Vector,points);length=(b-a).length;n=math.ceil(length/D['railing']['bay_spacing']);h=D['railing']['height']
 for i in range(n+1):
  if run==1 and i==0:continue
  p=a.lerp(b,i/n);cube('L%d.%02d Rail post'%(run,i),(p.x,p.y,h/2),(.1,.1,h),'railing',local=False)
 beam('L%d Top rail'%run,(*a,h-.05),(*b,h-.05),.10,.11,'railing',False)
 beam('L%d Lower rail'%run,(*a,.12),(*b,.12),.07,.075,'railing',False)
 for i in range(1,math.ceil(length/.16)):
  p=a.lerp(b,i/math.ceil(length/.16));beam('L%d.%02d Baluster'%(run,i),(*p,.15),(*p,h-.1),.035,.035,'railing',False)
seat=D['seat'];sx,sy,_=seat['center'];cube('F03 Sofa base',(sx,sy,seat['top']/2),(seat['width'],seat['length'],seat['top']),'furniture',local=False)
for i in range(3):
 yy=sy+(i-1)*seat['length']/3
 cube('F04.%d Seat cushion'%i,(sx,yy,seat['top']+.08),(.88,.74,.16),'furniture',cushion,False,bevel=.07,role='Independent removable cushion')
 cube('F05.%d Back cushion'%i,(sx-.34,yy,seat['top']+.43),(.18,.7,.65),'furniture',cushion,False,bevel=.075,role='Independent removable cushion')

# Review cameras live downstream of all geometry creation.
def camera(name,loc,target,lens=40,ortho=None):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);collections['lighting'].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens
 if ortho:d.type='ORTHO';d.ortho_scale=ortho
 return o
review=camera('CAM A01 Spatial review',(10,-12,8.4),(-.3,.2,1.75),ortho=11.5)
eye=camera('CAM A02 Observer',D['camera']['location'],D['camera']['target'],D['camera']['lens_mm'])
plan=camera('CAM A03 Plan',(0,0,20),(0,0,0),ortho=10.4)
for name,loc,power,size in [('Large studio key',(2,-7,11),2200,7),('Soft studio fill',(-6,-2,8),1700,6),('Rear separation',(1,7,9),1500,5)]:
 d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);collections['lighting'].objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.8,.8,.8,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.35
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1400;scene.render.resolution_y=1120;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX'
scene.camera=review;scene['design_source']='design.json';scene['revision']='A01';scene['geometry_depends_on_camera']=False;scene['status']='Architectural arrangement for review; inferred geometry explicitly recorded'
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'treehouse-architecture.blend'))
(ROOT/'parts.json').write_text(json.dumps(parts,indent=2)+'\n')
(ROOT/'derived.json').write_text(json.dumps({'roof_pitch_degrees':math.degrees(theta),'roof_rear_underside_z':beam_bottom(R['rear_beam_v']),'roof_front_underside_z':beam_bottom(R['front_beam_v']),'roof_board_top_front_z':rafter_upper(R['front_v'])+R['boarding_thickness']/cos,'joist_top_z':joist_top,'joist_bottom_z':joist_bottom,'girder_bottom_z':joist_bottom-F['girder_depth'],'parts':len(parts)},indent=2)+'\n')
for cam,file in [(review,'A01-spatial.png'),(eye,'A02-observer.png')]:
 scene.camera=cam;scene.render.filepath=str(ROOT/file);bpy.ops.render.render(write_still=True)
# Explicit cutaway: remove living masses to expose the roof bearings, without moving a part.
for group in ['tree','fork']:collections[group].hide_render=True
scene.camera=review;scene.render.filepath=str(ROOT/'A03-frame-cutaway.png');bpy.ops.render.render(write_still=True)
print('ARCHITECTURE_A01_BUILT',len(parts))
