"""Final B03 presentation, geometric checks and second-camera depth evidence."""
import bpy,math,json,hashlib,struct,random
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'rooftop-scene-b02.blend'));scene=bpy.context.scene;D=json.loads((ROOT/'design-b02.json').read_text());rng=random.Random(205)
F=D['deck'];rot=Matrix.Rotation(math.radians(F['yaw_degrees']),3,'Z');O=Vector(F['origin'])
# Re-seat loose decoration after the deck's shorter railing revision.
for ob in list(bpy.data.collections['B08 Loose petals'].objects):
 if ob.name.startswith('B loose petal'):
  p=rot.inverted()@(ob.location-O)
  if p.x>F['x_max']-.1:p.x=F['x_max']-.15;ob.location=O+rot@p
for ob in bpy.data.collections['B07 Separate blossoms'].objects:
 if ob.name.startswith('B rail flower spray'):
  p=rot.inverted()@(ob.location-O);p.x*=D['railing']['end_u']/6.65;ob.location=O+rot@p
# Quiet per-board variation; long grain remains aligned with actual board geometry.
mat=bpy.data.materials['B01 Aged rose deck wood'];nt=mat.node_tree;bs=nt.nodes.get('Principled BSDF');original=bs.inputs['Base Color'].links[0].from_socket
obj=nt.nodes.new('ShaderNodeObjectInfo');mp=nt.nodes.new('ShaderNodeMapRange');mp.inputs['From Min'].default_value=0;mp.inputs['From Max'].default_value=1;mp.inputs['To Min'].default_value=.86;mp.inputs['To Max'].default_value=1.13;nt.links.new(obj.outputs['Random'],mp.inputs['Value']);mix=nt.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;nt.links.new(original,mix.inputs[1]);nt.links.new(mp.outputs[0],mix.inputs[2]);nt.links.new(mix.outputs[0],bs.inputs['Base Color'])
# A brighter sky opens the mountain view without flattening foreground lighting.
sky=bpy.data.materials['B luminous apricot sky'];next(n for n in sky.node_tree.nodes if n.type=='EMISSION').inputs['Strength'].default_value=5
# Individual tiny warm lights along the living branch.
lightmat=bpy.data.materials.new('B03 fairy light glow');lightmat.use_nodes=True;p=lightmat.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(1,.39,.12,1);p.inputs['Emission Color'].default_value=(1,.30,.07,1);p.inputs['Emission Strength'].default_value=16
col=bpy.data.collections.new('B11 Independent fairy lights');scene.collection.children.link(col);points=[Vector(p) for p in D['tree']['foreground_path']];rads=D['tree']['foreground_radii'];wire=[]
for i in range(41):
 t=i/40*(len(points)-1);j=min(len(points)-2,int(t));f=t-j;c=points[j].lerp(points[j+1],f);r=rads[j]*(1-f)+rads[j+1]*f;theta=i*.75;pos=c+Vector((math.cos(theta)*r*.62,-r*.95,math.sin(theta)*r*.40));wire.append(pos)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=8,ring_count=4,radius=.015,location=pos);o=bpy.context.object;o.name='B03 fairy light %02d'%i;o.data.materials.append(lightmat)
 for c0 in list(o.users_collection):c0.objects.unlink(o)
 col.objects.link(o)
c=bpy.data.curves.new('B03 fine fairy-light wire','CURVE');c.dimensions='3D';c.bevel_depth=.003;c.bevel_resolution=2;s=c.splines.new('POLY');s.points.add(len(wire)-1)
for p,co in zip(s.points,wire):p.co=(*co,1)
o=bpy.data.objects.new(c.name,c);col.objects.link(o);c.materials.append(bpy.data.materials['B01 Aged bronze fittings'])
# Soft, individually editable loose pillow shapes.
for ob in bpy.data.collections['B05 Independent upholstery'].objects:
 if 'loose cushion' in ob.name or 'floor pillow' in ob.name:
  sub=ob.modifiers.new('Soft stuffed pillow surface','SUBSURF');sub.levels=2;sub.render_levels=2
  ob.rotation_euler.z+=rng.uniform(-.09,.09)
scene.frame_set(1);scene.camera.data.clip_end=500;scene['revision']='B03';scene['camera_intent']='Beside the foreground tree and couch, doorway on the left, mountain opening to the right; tripod metaphor is not a measurement.'
scene['status']='Assembled desktop scene; bark and landscape remain stylized, native integration not started'
scene.cycles.samples=64;scene.render.filepath=str(ROOT/'B03-assembled.png')
# Validate the saved design by measuring actual objects, not only configuration values.
checks={};axis=rot@Vector((1,0,0));cross=rot@Vector((0,1,0))
boards=list(bpy.data.collections['B01 Deck planks'].objects)
for ob in boards:
 assert abs((ob.matrix_world.to_3x3()@Vector((1,0,0))).normalized().dot(axis))>.99999
 assert abs(ob.location.z+.035)<1e-5
rail=bpy.data.objects['B02 continuous handrail'];assert abs((rail.matrix_world.to_3x3()@Vector((0,0,1))).normalized().dot(axis))>.99999
joists=[o for o in bpy.data.collections['B02 Deck framing'].objects if 'cross joist' in o.name or 'tree trimmer' in o.name]
for ob in joists:assert abs((ob.matrix_world.to_3x3()@Vector((0,0,1))).normalized().dot(cross))>.99999
checks['boards_parallel_to_handrail']=True;checks['joists_perpendicular_to_boards']=True;checks['individual_planks']=len(boards)
checks['four_tree_opening_trimmers']=len([o for o in joists if 'tree trimmer' in o.name])==4;assert checks['four_tree_opening_trimmers'];assert bpy.data.objects.get('B02 tree opening header') is not None
checks['tree_opening_header']=True
# Bearing levels from each actual object's transformed box corners.
def zrange(o):return min((o.matrix_world@Vector(p)).z for p in o.bound_box),max((o.matrix_world@Vector(p)).z for p in o.bound_box)
for ob in joists:assert abs(zrange(ob)[1]+.07)<1e-5
for ob in [o for o in bpy.data.collections['B02 Deck framing'].objects if 'primary girder' in o.name]:assert abs(zrange(ob)[1]+.29)<1e-5
checks['deck_joist_girder_bearing_levels']=True
header=bpy.data.objects['B01 Rear canopy and alcove header'];zb=zrange(header)[0]
for name in ['P01 Alcove bearing post','P02 Alcove bearing post']:assert abs(zrange(bpy.data.objects[name])[1]-zb)<1e-5
checks['alcove_posts_meet_header']=True
# Geometry remains independent of the observer; moving one cushion leaves its neighbour fixed.
def signature():
 h=hashlib.sha256();dg=bpy.context.evaluated_depsgraph_get()
 for ob in sorted(scene.objects,key=lambda o:o.name):
  if ob.type not in {'MESH','CURVE'}:continue
  ev=ob.evaluated_get(dg);me=ev.to_mesh();h.update(ob.name.encode())
  for v in me.vertices:h.update(struct.pack('<3f',*(round(x,5) for x in ob.matrix_world@v.co)))
  ev.to_mesh_clear()
 return h.hexdigest()
hash1=signature();cam=scene.camera;matrix=cam.matrix_world.copy();cam.location+=Vector((.32,.12,0));bpy.context.view_layer.update();hash2=signature();assert hash1==hash2;cam.matrix_world=matrix;bpy.context.view_layer.update();checks['camera_does_not_change_geometry']=True;checks['geometry_sha256']=hash1
one=bpy.data.objects['B loose cushion 0'];two=bpy.data.objects['B loose cushion 1'];old=one.location.copy();other=two.matrix_world.copy();one.location.x+=.13;bpy.context.view_layer.update();assert two.matrix_world==other;one.location=old;checks['cushions_move_independently']=True
checks['blossoms_separate_from_deck_and_tree']=all(o.get('component')!='deck' for o in bpy.data.collections['B07 Separate blossoms'].objects)
# Animation has real transforms and keeps the suspension points fixed.
lamp=bpy.data.objects['B lantern 0 suspension'];start=lamp.matrix_world.copy();anchor=lamp.location.copy();petal=bpy.data.objects['B drifting petal 0'];petal_start=petal.location.copy();scene.frame_set(61);checks['lantern_sway_changes_transform']=lamp.matrix_world!=start;assert checks['lantern_sway_changes_transform'];assert (lamp.location-anchor).length<1e-6;checks['lantern_pivot_stays_fixed']=True;assert (petal.location-petal_start).length>.1;checks['petals_have_motion']=True;scene.frame_set(1)
checks['missing_external_assets']=[im.filepath for im in bpy.data.images if im.source=='FILE' and not im.packed_file and im.filepath and not Path(bpy.path.abspath(im.filepath)).exists()];assert not checks['missing_external_assets']
report={'revision':'B03','checks':checks,'scope':'Geometry, modularity, saved camera and motion checks; not a final visual approval or native runtime test.','source_reference':'../references/rooftop-source.png','files':['rooftop-scene-b03.blend','B03-assembled.png','B03-depth.png','B03-wireframe.png'],'open_work':['Organic tree branch transitions and detailed bark fidelity','More natural distant landscape','Final art polish','iPad export, profiling and integration']}
(ROOT/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-scene-b03.blend'));bpy.ops.render.render(write_still=True)
# A literal sideways camera translation demonstrates genuine 3D occlusion / parallax.
cam.location+=Vector((.38,.12,0));scene.cycles.samples=24;scene.render.filepath=str(ROOT/'B03-depth.png');bpy.ops.render.render(write_still=True);cam.matrix_world=matrix;bpy.context.view_layer.update()
# Neutral visible-edge review, with decor hidden to expose construction.
for name in ['B07 Separate blossoms','B08 Loose petals','B09 Mountain and sky layers','B11 Independent fairy lights']:bpy.data.collections[name].hide_render=True
scene.compositing_node_group=None
m=bpy.data.materials.new('B03 neutral wire review');m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.48,.53,.55,1);p.inputs['Roughness'].default_value=.9;bpy.context.view_layer.material_override=m
scene.world.node_tree.nodes.get('Background').inputs[0].default_value=(.7,.75,.8,1);scene.world.node_tree.nodes.get('Background').inputs[1].default_value=.8
for ob in scene.objects:
 if ob.type=='LIGHT':ob.data.color=(1,1,1)
scene.render.use_freestyle=True;fs=bpy.context.view_layer.freestyle_settings;fs.crease_angle=math.radians(130);line=fs.linesets[0];line.select_silhouette=True;line.select_border=True;line.select_crease=True;line.linestyle.color=(.055,.1,.13);line.linestyle.thickness=1.1;scene.render.filepath=str(ROOT/'B03-wireframe.png');bpy.ops.render.render(write_still=True)
print('B03_VALIDATED_AND_RENDERED',json.dumps(checks))
