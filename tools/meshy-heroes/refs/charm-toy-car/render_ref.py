import bpy, math, sys
from mathutils import Vector
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='tools/stl-pilot/car-racer/car-racer.glb')
ms=[o for o in bpy.data.objects if o.type=='MESH']
print([(o.name,len(o.data.polygons),[m.name for m in o.data.materials]) for o in ms])
def mat(name,col,rough,metal=0.0):
    m=bpy.data.materials.new(name); m.use_nodes=True; b=m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value=(*col,1); b.inputs['Roughness'].default_value=rough; b.inputs['Metallic'].default_value=metal
    if 'Coat Weight' in b.inputs: b.inputs['Coat Weight'].default_value=0.6
    return m
red=mat('red',(0.6,0.02,0.02),0.22); cream=mat('cream',(0.92,0.82,0.6),0.3); gold=mat('gold',(0.9,0.62,0.18),0.25,1.0)
for o in ms:
    for b in o.modifiers: pass
    o.data.materials.clear(); o.data.materials.append(red if o.name=='body' else cream)
    if o.name!='body': bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.shade_smooth()
    if o.name=='body':
        s=o.modifiers.new('s','SUBSURF'); s.levels=1; s.render_levels=1
        bpy.context.view_layer.objects.active=o; o.select_set(True); bpy.ops.object.shade_smooth()
# frame
lo=Vector((min(min((o.matrix_world@v.co)[i] for v in o.data.vertices) for o in ms) for i in range(3)))
hi=Vector((max(max((o.matrix_world@v.co)[i] for v in o.data.vertices) for o in ms) for i in range(3)))
c=(lo+hi)/2; size=max(hi-lo); print('bounds',lo,hi)
sc=bpy.context.scene; sc.render.engine='CYCLES'; sc.cycles.samples=96; sc.cycles.device='CPU'
sc.render.resolution_x=sc.render.resolution_y=1024; sc.render.film_transparent=False
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(1,1,1,1); w.node_tree.nodes['Background'].inputs[1].default_value=0.35
cd=bpy.data.cameras.new('c'); cd.lens=70; cam=bpy.data.objects.new('c',cd); sc.collection.objects.link(cam); sc.camera=cam
up=2 if (hi-lo)[2]<(hi-lo)[1] else 1  # glTF import is Z up
d=size*2.3; a=math.radians(35); el=math.radians(22)
cam.location=c+Vector((d*math.cos(el)*math.sin(a),-d*math.cos(el)*math.cos(a),d*math.sin(el)))
cam.rotation_euler=(c-cam.location).to_track_quat('-Z','Y').to_euler()
for loc,e in [((3,-3,5),220),((-4,-1,3),90),((0,4,4),120)]:
    ld=bpy.data.lights.new('l','AREA'); ld.energy=e*size*size; ld.size=size*2; l=bpy.data.objects.new('l',ld); sc.collection.objects.link(l)
    l.location=c+Vector(loc)*size; l.rotation_euler=(c-l.location).to_track_quat('-Z','Y').to_euler()
sc.view_settings.view_transform='Standard'
sc.render.filepath=sys.argv[-1]; bpy.ops.render.render(write_still=True)
