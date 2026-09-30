"""B01: coherent world-space arrangement, material lighting and modular scenery."""
import bpy,bmesh,math,json,random,hashlib,struct,sys
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent;BASE=ROOT.parent;D=json.loads((ROOT/'design.json').read_text());rng=random.Random(803)
bpy.ops.wm.open_mainfile(filepath=str(BASE/'architecture/treehouse-architecture.blend'));scene=bpy.context.scene
# Reuse the modeled window, bench and fitted roof bearings via a rigid transform.
old_origin=Vector((-1.925,1.075,0));new_origin=Vector(D['alcove']['origin']);yaw=math.radians(D['alcove']['yaw_degrees'])
placement=Matrix.Translation(new_origin)@Matrix.Rotation(yaw-math.pi/4,4,'Z')@Matrix.Translation(-old_origin)
keep=[]
for ob in list(scene.objects):
 ident=ob.users_collection[0].get('asset_id') if ob.users_collection else None
 if ident in ['alcove','beams','rafters','ceiling','tree'] or ob.name.startswith(('F01','F02')):
  ob.matrix_world=placement@ob.matrix_world;keep.append(ob)
 else:bpy.data.objects.remove(ob,do_unlink=True)
for c in list(bpy.data.collections):
 if len(c.objects)==0:bpy.data.collections.remove(c)
scene.unit_settings.system='METRIC';scene['revision']='B01';scene['geometry_camera_independent']=True
cols={}
for key,label in [('deck','B01 Deck planks'),('framing','B02 Deck framing'),('rail','B03 Railing'),('tree','B04 Living branches'),('sofa','B05 Independent upholstery'),('lantern','B06 Suspended lanterns'),('flowers','B07 Separate blossoms'),('petals','B08 Loose petals'),('env','B09 Mountain and sky layers'),('lights','B10 Cameras and lights')]:
 c=bpy.data.collections.new(label);scene.collection.children.link(c);c['asset_id']=key;cols[key]=c

def move(ob,key):
 for c in list(ob.users_collection):c.objects.unlink(ob)
 cols[key].objects.link(ob);ob['component']=key;return ob

def material(name,color,rough=.65,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m

def grain(m,scale,strength=.22,distance=.035):
 nt=m.node_tree;bs=nt.nodes.get('Principled BSDF');co=nt.nodes.new('ShaderNodeTexCoord');mp=nt.nodes.new('ShaderNodeVectorMath');mp.operation='MULTIPLY';mp.inputs[1].default_value=scale;nt.links.new(co.outputs['Generated'],mp.inputs[0]);n=nt.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=4;n.inputs['Detail'].default_value=4;n.inputs['Roughness'].default_value=.7;nt.links.new(mp.outputs[0],n.inputs['Vector'])
 ramp=nt.nodes.new('ShaderNodeValToRGB');col=m.diffuse_color[:3];ramp.color_ramp.elements[0].position=.22;ramp.color_ramp.elements[0].color=(*(v*.48 for v in col),1);ramp.color_ramp.elements[1].position=.78;ramp.color_ramp.elements[1].color=(*(v*1.4 for v in col),1);nt.links.new(n.outputs['Fac'],ramp.inputs[0]);nt.links.new(ramp.outputs[0],bs.inputs['Base Color']);b=nt.nodes.new('ShaderNodeBump');b.inputs['Strength'].default_value=strength;b.inputs['Distance'].default_value=distance;nt.links.new(n.outputs['Fac'],b.inputs['Height']);nt.links.new(b.outputs[0],bs.inputs['Normal'])
wood=material('B01 Aged rose deck wood',(.32,.16,.18),.72);grain(wood,(.28,38,7),.24,.018)
frame=material('B01 Deep mulberry structural wood',(.16,.064,.071),.71);grain(frame,(14,14,.4),.28,.023)
ceilingmat=material('B01 Sheltered timber soffit',(.095,.040,.048),.79);grain(ceilingmat,(.4,28,6),.22,.024)
rose=material('B01 Rose window panel',(.40,.105,.18),.83);grain(rose,(18,1,2),.12,.006)
bark=material('B01 Furrowed bark',(.095,.047,.059),.92);grain(bark,(22,22,.48),.46,.07)
pink=material('B01 Dusty pink linen',(.57,.18,.30),.92);grain(pink,(70,70,70),.16,.004)
blush=material('B01 Blush velvet',(.74,.31,.38),.96);grain(blush,(65,65,65),.12,.004)
piping=material('B01 Cushion piping',(.69,.22,.31),.8)
windowmat=material('B01 Honey light behind lattice',(1,.46,.16),.35,2.8)
gold=material('B01 Aged bronze fittings',(.35,.17,.08),.32)
paper=material('B01 Coral lantern silk',(.9,.15,.12),.58,.38)
petalmats=[material('B01 Sakura tone '+str(i),c,.76) for i,c in enumerate([(.72,.055,.19),(.95,.19,.34),(.98,.36,.47),(.99,.53,.61)])]
for m in petalmats:
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Subsurface Weight'].default_value=.07
for ob in keep:
 if ob.type not in {'MESH','CURVE'}:continue
 mat=bark if ob.name.startswith('T') else rose if ob.name.startswith(('W01','W02')) else windowmat if ob.name.startswith('W06') else ceilingmat if ob.name.startswith(('R','S')) else frame
 ob.data.materials.clear();ob.data.materials.append(mat)
# Raise / shorten the braces above the window sightline, keeping their beam contacts.
for ob in [o for o in keep if o.name.startswith('K0')]:bpy.data.objects.remove(ob,do_unlink=True)

def cube(name,loc,size,mat=frame,key='framing',bevel=.015,rotation=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if rotation is not None:o.rotation_euler=rotation
 o.data.materials.append(mat);move(o,key)
 if bevel:
  b=o.modifiers.new('Worked round edges','BEVEL');b.width=bevel;b.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o

def beam(name,a,b,w,d,mat=frame,key='framing'):
 a,b=Vector(a),Vector(b);o=cube(name,(a+b)/2,(w,d,(b-a).length),mat,key);o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();return o

def ball(name,loc,scale,mat,key,segments=20,rings=12):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(mat);move(o,key)
 for p in o.data.polygons:p.use_smooth=True
 return o

def path(name,coords,radii,mat=bark,key='tree'):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16;c.bevel_depth=1;c.bevel_resolution=4;c.use_fill_caps=True;s=c.splines.new('BEZIER');s.bezier_points.add(len(coords)-1)
 for p,co,r in zip(s.bezier_points,coords,radii):p.co=co;p.radius=r;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,c);cols[key].objects.link(o);o['component']=key;c.materials.append(mat);return o

def local(p):return new_origin+Matrix.Rotation(yaw,3,'Z')@Vector(p)
for i,u in enumerate([-1.32,1.32]):beam('Short high canopy brace '+str(i),local((u,-.36,2.91)),local((u,-1.79,3.6218)),.13,.13)
# Planks, joists and railing use one explicit rotated rectangular grid.
F=D['deck'];origin=Vector(F['origin']);dyaw=math.radians(F['yaw_degrees']);rotation=Matrix.Rotation(dyaw,3,'Z')
def deck(p):return origin+rotation@Vector(p)
span=F['x_max']-F['x_min'];depth=F['y_max']-F['y_min'];boards=[]
for i in range(math.ceil(depth/F['board_width'])):
 y0=F['y_min']+i*F['board_width'];y1=min(y0+F['board_width']-F['gap'],F['y_max'])
 o=cube('B deck board %02d'%i,deck(((F['x_min']+F['x_max'])/2,(y0+y1)/2,-F['thickness']/2)),(span,y1-y0,F['thickness']),wood,'deck',.004,(0,0,dyaw));boards.append(o)
# Real opening around the foreground tree and shell intersection.
bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=.91,depth=2,location=(-4.55,-2.5,0));cut=bpy.context.object
for o in boards:
 # Only intersecting boards receive booleans; all remain independently editable.
 localcut=rotation.inverted()@(cut.location-origin);localboard=rotation.inverted()@(o.location-origin)
 if abs(localcut.y-localboard.y)<1.05:
  bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('Tree clearance opening','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cut,do_unlink=True)
for i in range(math.ceil(span/.48)):
 x=F['x_min']+.2+i*.48
 beam('B floor joist %02d'%i,deck((x,F['y_min'], -.18)),deck((x,F['y_max'],-.18)),.10,.22)
for y in [-6.3,-3.7,-.6]:beam('B primary girder '+str(y),deck((F['x_min'],y,-.44)),deck((F['x_max'],y,-.44)),.22,.30)
for x in [F['x_min'],F['x_max']]:beam('B side fascia '+str(x),deck((x,F['y_min'],-.15)),deck((x,F['y_max'],-.15)),.13,.28)
beam('B outer platform fascia',deck((F['x_min'],F['y_min'],-.15)),deck((F['x_max'],F['y_min'],-.15)),.13,.28)
R=D['railing'];h=R['height'];a=deck((R['start_u'],R['v'],h-.04));b=deck((R['end_u'],R['v'],h-.04))
rail=beam('B continuous handrail',a,b,.14,.12,frame,'rail');beam('B lower rail',deck((0,0,.14)),deck((R['end_u'],0,.14)),.08,.07,frame,'rail')
for i in range(8):
 p=deck((R['end_u']*i/7,0,0));cube('B guard post '+str(i),p+Vector((0,0,h/2)),(.12,.12,h),frame,'rail',.012,(0,0,dyaw))
for i in range(1,36):
 p=deck((R['end_u']*i/36,0,0));beam('B slender baluster '+str(i),p+Vector((0,0,.17)),p+Vector((0,0,h-.10)),.035,.042,frame,'rail')
# Independent tree limbs: no projected coordinates or mesh warping.
main=path('B foreground sheltering trunk',D['tree']['foreground_path'],D['tree']['foreground_radii'])
branch_specs=[('Right hanging canopy',[(-2.8,.8,4.65),(-1.6,2.9,4.5),(.3,3.5,4.7),(2.4,3.8,4.9),(4.8,4.6,5.25),(7.2,4.9,5.9)],[.35,.31,.25,.19,.13,.035]),('Canopy cross limb',[(-3.9,-.3,3.8),(-2.6,1.8,4.0),(-.8,2.8,4.15),(.4,2.8,4.45)],[.34,.30,.22,.04]),('Far right drooping limb',[(1.1,3.6,4.8),(2.9,3.2,4.45),(4.4,2.9,4.1),(6,2.5,3.8)],[.19,.16,.1,.015]),('Under couch supporting arm',[(-4.6,-2.6,-1.0),(-4.0,-2.2,-.65),(-3.1,-.7,-.7),(-2.3,1,-.8),(-2.5,3,-1.1)],[.57,.4,.31,.22,.4]),('Under terrace bearing',[(-4.3,.2,-1.3),(-2.3,-1.4,-1.1),(0,-2.4,-.85),(2,-2.2,-.82)],[.64,.47,.33,.16])]
for name,pts,rs in branch_specs:path('B '+name,pts,rs)
# Sculpt shallow longitudinal bark ribs on the main trunk as actual independent surface curves.
pts=[Vector(p) for p in D['tree']['foreground_path']];rads=D['tree']['foreground_radii']
for k in range(28):
 theta=2*math.pi*k/28;ridge=[]
 for j,p in enumerate(pts):
  tangent=(pts[min(j+1,len(pts)-1)]-pts[max(j-1,0)]).normalized();right=tangent.cross(Vector((0,1,0))).normalized();up=tangent.cross(right).normalized();t=theta+.05*math.sin(j*1.6+k)
  ridge.append(p+(right*math.cos(t)+up*math.sin(t))*rads[j]*.985)
 path('B flowing bark ridge %02d'%k,ridge,[min(.025,r*.065) for r in rads],bark)
# Sofa and every cushion are standalone pieces.
S=D['sofa'];sx,sy,_=S['center'];cube('B sofa timber base',(sx,sy,.17),(S['width'],S['length'],.34),frame,'sofa',.06)
for i in range(3):
 y=sy+(i-1)*S['length']/3
 cube('B seat cushion '+str(i),(sx,y,.44),(S['width'],1.105,.24),pink,'sofa',.115)
 ob=cube('B back cushion '+str(i),(sx-.46,y,.91),(.26,1.05,.92),blush,'sofa',.12);ob.rotation_euler.y=-.12
 ob=cube('B loose cushion '+str(i),(sx-.19,y+.14,.93),(.70,.25,.71),blush if i!=1 else pink,'sofa',.105);ob.rotation_euler=(.16,-.22,-.2+i*.22)
for i,p in enumerate([(-.88,2.10,.31),(-.30,2.01,.26)]):
 ob=cube('B floor pillow '+str(i),p,(.60,.25,.56),blush,'sofa',.10);ob.rotation_euler=(.15,-.13,(-.2 if i==0 else .20))
for i,u in enumerate([-.98,1.0]):
 ob=cube('B bench pillow '+str(i),local((u,-.40,.78)),(.46,.22,.55),pink,'sofa',.09);ob.rotation_euler=(.12,-.15,yaw)
# Lanterns are pivoted at their actual cord suspension points.
lantern_specs=[((.75,2.75,4.85),2.45,.26),((1.85,2.9,4.73),2.13,.18),((3.70,2.9,4.30),2.45,.34),((5.0,2.70,4.10),2.18,.29)]
for i,(anchor,z,rad) in enumerate(lantern_specs):
 root=bpy.data.objects.new('B lantern %d suspension'%i,None);cols['lantern'].objects.link(root);root.location=anchor;root['asset_id']='lantern.'+str(i);children=[]
 center=Vector((anchor[0],anchor[1],z));children.append(path('B lantern cord '+str(i),[anchor,(anchor[0],anchor[1],z+rad)], [.012,.012],gold,'lantern'))
 children.append(ball('B lantern silk '+str(i),center,(rad,rad,rad*1.1),paper,'lantern',32,16))
 for k in range(12):
  angle=2*math.pi*k/12;coords=[]
  for j in range(13):
   phi=-math.pi/2+math.pi*j/12;coords.append(center+Vector((rad*1.005*math.cos(phi)*math.cos(angle),rad*1.005*math.cos(phi)*math.sin(angle),rad*1.1*math.sin(phi))))
  children.append(path('B lantern %d rib %02d'%(i,k),coords,[.005]*13,gold,'lantern'))
 for dz in [-rad*1.06,rad*1.06]:children.append(ball('B lantern brass cap',center+Vector((0,0,dz)),(rad*.33,rad*.33,.025),gold,'lantern'))
 children.append(path('B lantern tassel '+str(i),[center+Vector((0,0,-rad*1.12)),center+Vector((0,0,-rad*1.62))],[.014,.023],paper,'lantern'))
 for child in children:child.parent=root;child.matrix_parent_inverse=root.matrix_world.inverted()
 for fr,angle in [(1,0),(61,math.radians(1.2)*(1 if i%2 else -1)),(121,0),(181,math.radians(-1.2)*(1 if i%2 else -1)),(241,0)]:root.rotation_euler.y=angle;root.keyframe_insert(data_path='rotation_euler',frame=fr)
# Blossom meshes combine curved petals into reusable sprays, separate from all wood.
def spray_mesh(seed):
 rand=random.Random(seed);verts=[];faces=[];mi=[]
 for f in range(110):
  angle=rand.random()*math.tau;radius=rand.random()**.5;z=rand.uniform(-.42,.42);center=Vector((math.cos(angle)*radius*.58,math.sin(angle)*radius*.4,z));size=rand.uniform(.025,.066)
  rot=Matrix.Rotation(rand.uniform(-.8,.8),3,'X')@Matrix.Rotation(rand.random()*math.tau,3,'Z')
  for petal in range(5):
   a=petal*math.tau/5;inds=[]
   for k in range(8):
    theta=math.tau*k/8;length=size*(.56+.55*math.cos(theta));width=size*.40*math.sin(theta);v=Vector((math.cos(a)*length-math.sin(a)*width,math.sin(a)*length+math.cos(a)*width,size*.23*math.sin(theta)**2));inds.append(len(verts));verts.append(center+rot@v)
   faces.append(tuple(inds));mi.append(rand.randrange(4))
 me=bpy.data.meshes.new('B reusable sakura spray '+str(seed));me.from_pydata(verts,[],faces)
 for mat in petalmats:me.materials.append(mat)
 for p,m in zip(me.polygons,mi):p.material_index=m;p.use_smooth=True
 return me
sprays=[spray_mesh(900+i) for i in range(4)];flower_objects=[]
def spray(name,pos,scale):
 ob=bpy.data.objects.new(name,sprays[len(flower_objects)%4]);cols['flowers'].objects.link(ob);ob.location=pos;ob.scale=(scale,scale,scale);ob.rotation_euler=(rng.uniform(-.5,.5),rng.uniform(-.5,.5),rng.random()*math.tau);ob['independent_from_tree']=True;flower_objects.append(ob);return ob
# Denser overhead canopy, with clear central doorway and mountain sightline.
for idx in range(65):
 x=rng.uniform(-5.6,7.3);y=rng.uniform(1.8,5.6);z=4.4+.16*(x+1)+rng.uniform(-.55,.60)
 spray('B overhead sakura spray %02d'%idx,(x,y,z),rng.uniform(.7,1.55))
for idx in range(20):
 t=idx/19;j=min(len(pts)-2,int(t*(len(pts)-1)));p=pts[j].lerp(pts[j+1],(t*(len(pts)-1))%1);spray('B trunk blossom spray %02d'%idx,p+Vector((rng.uniform(-.48,.48),-.35,rng.uniform(-.28,.28))),rng.uniform(.27,.48))
for i in range(20):
 p=deck((i*R['end_u']/19,0,.10));spray('B rail flower spray '+str(i),p+Vector((0,0,rng.uniform(.01,.06))),.23)
for i in range(10):spray('B foreground flowers '+str(i),(-4.55+rng.uniform(-.7,.4),-2.5+rng.uniform(-.65,.65),rng.uniform(.05,.25)),.4)
# Sparse independent fallen petals and a few editable animated falling petals.
petalmesh=bpy.data.meshes.new('B single loose petal');petalmesh.from_pydata([(-.028,0,0),(0,-.043,.005),(.028,0,0),(.018,.045,.014),(-.018,.045,.014)],[],[(0,1,2,3,4)]);petalmesh.materials.append(petalmats[2])
for i in range(95):
 ob=bpy.data.objects.new('B loose petal %03d'%i,petalmesh);cols['petals'].objects.link(ob);ob.location=deck((rng.uniform(-2.5,6.4),rng.uniform(-6.4,-.1),.008));ob.rotation_euler.z=rng.random()*math.tau
for i in range(9):
 ob=bpy.data.objects.new('B drifting petal '+str(i),petalmesh);cols['petals'].objects.link(ob);x=rng.uniform(-3.7,4.8);y=rng.uniform(-.2,3)
 for fr,z in [(1,4.4),(121,2.2),(241,.08)]:ob.location=(x+(fr/241)*.6,y+math.sin(fr/80)*.2,z);ob.rotation_euler=(fr*.02+i,.4,fr*.011);ob.keyframe_insert(data_path='location',frame=fr);ob.keyframe_insert(data_path='rotation_euler',frame=fr)
# Layered world-space mountains and bright peach sky.
def mesh(name,verts,faces,mat,key='env'):
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.materials.append(mat);o=bpy.data.objects.new(name,me);cols[key].objects.link(o);return o
for layer,(y,base,amp,color) in enumerate([(20,-3.8,2.1,(.46,.22,.36)),(32,-4.7,2.6,(.69,.34,.43)),(50,-6.6,3.4,(.86,.50,.51)),(80,-9.5,5,(.95,.64,.54))]):
 rand=random.Random(803+layer);vs=[];faces=[];centers=[(rand.uniform(-80,80),rand.uniform(.6,1.4),rand.uniform(1.1,4)) for _ in range(35)]
 for i in range(501):
  x=-80+i*.32;peaks=sum(h*math.exp(-((x-c)/w)**4) for c,h,w in centers);z=base+amp*(.20*math.sin(x*.7)+.24*math.sin(x*.28+layer)+.22*peaks);vs.extend([(x,y,-50),(x,y,z),(x,y+2,z-.4)])
 for i in range(500):a=i*3;b=a+3;faces.extend([(a,b,b+1,a+1),(a+1,b+1,b+2,a+2)])
 mesh('B distant ridge '+str(layer),vs,faces,material('B atmospheric ridge '+str(layer),color,.9,.8))
sky=material('B luminous apricot sky',(1,.68,.40));nt=sky.node_tree;nt.nodes.clear();geo=nt.nodes.new('ShaderNodeNewGeometry');sep=nt.nodes.new('ShaderNodeSeparateXYZ');nt.links.new(geo.outputs['Position'],sep.inputs[0]);mp=nt.nodes.new('ShaderNodeMapRange');mp.inputs['From Min'].default_value=-15;mp.inputs['From Max'].default_value=65;nt.links.new(sep.outputs['Z'],mp.inputs['Value']);ramp=nt.nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(1,.64,.35,1);ramp.color_ramp.elements[1].color=(.63,.25,.33,1);e=ramp.color_ramp.elements.new(.35);e.color=(1,.94,.65,1);nt.links.new(mp.outputs[0],ramp.inputs[0]);em=nt.nodes.new('ShaderNodeEmission');em.inputs['Strength'].default_value=2.3;nt.links.new(ramp.outputs[0],em.inputs[0]);out=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(em.outputs[0],out.inputs['Surface']);skyob=mesh('B sunset sky',[(-250,120,-90),(250,120,-90),(250,120,180),(-250,120,180)],[(0,1,2,3)],sky);skyob.visible_diffuse=False;skyob.visible_glossy=False
scene.world=bpy.data.worlds.new('B sheltered violet ambient');scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.26,.16,.28,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.28

def light(name,kind,loc,target,power,color,size):
 d=bpy.data.lights.new(name,kind);d.energy=power;d.color=color
 if kind=='AREA':d.shape='DISK';d.size=size
 elif kind=='SUN':d.angle=size
 o=bpy.data.objects.new(name,d);cols['lights'].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();return o
light('B low peach sun','SUN',(8,10,6),(-2,-3,0),2.3,(1,.63,.43),.12)
light('B open sky bounce','AREA',(4,6,4),(-2,-.5,1),1850,(1,.65,.46),7)
light('B soft rosy foreground','AREA',(-1,-5,4),(-2,2,1),850,(1,.46,.54),6)
light('B cool sheltered bark fill','AREA',(-7,-1,5),(-2,1,2),380,(.47,.50,1),6)
# Actual camera created after all geometry and assets.
def camera(name,loc,target,lens):
 d=bpy.data.cameras.new(name);o=bpy.data.objects.new(name,d);cols['lights'].objects.link(o);o.location=loc;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();d.lens=lens;d.sensor_width=36;d.sensor_fit='HORIZONTAL';return o
C=D['camera'];cam=camera('B beside-tree observer',C['location'],C['target'],C['lens_mm']);cam.data.shift_x=C['shift_x'];cam.data.shift_y=C['shift_y'];scene.camera=cam
scene.frame_start=1;scene.frame_end=241;scene.render.fps=24;scene.frame_set(1)
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.cycles.max_bounces=7;scene.render.resolution_x=1280;scene.render.resolution_y=964;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False;scene.render.use_freestyle=False;scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=.15
# Gentle bloom uses real bright pixels.
comp=bpy.data.node_groups.new('B sunset bloom','CompositorNodeTree');comp.interface.new_socket(name='Image',in_out='OUTPUT',socket_type='NodeSocketColor');rr=comp.nodes.new('CompositorNodeRLayers');glow=comp.nodes.new('CompositorNodeGlare');glow.inputs['Type'].default_value='Fog Glow';glow.inputs['Quality'].default_value='High';glow.inputs['Threshold'].default_value=2.8;glow.inputs['Strength'].default_value=.15;glow.inputs['Size'].default_value=.2;out=comp.nodes.new('NodeGroupOutput');comp.links.new(rr.outputs['Image'],glow.inputs['Image']);comp.links.new(glow.outputs['Image'],out.inputs['Image']);scene.compositing_node_group=comp
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
scene['source']='World-space design.json plus reused A01 alcove and fitted canopy';scene['status']='Assembled scene in progress; not final art or native integration'
scene.render.filepath=str(ROOT/'B01-assembled.png');bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-scene.blend'));bpy.ops.render.render(write_still=True)
print('B01_SCENE_BUILT',len(scene.objects),'objects')
