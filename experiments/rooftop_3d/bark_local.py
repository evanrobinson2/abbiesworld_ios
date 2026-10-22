"""Local bark study, independent of the pending external texture job."""
import bpy, math
from pathlib import Path
from mathutils import Vector, kdtree

ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'tree-form-study.blend'))
scene=bpy.context.scene
tree=next(o for o in scene.objects if o.get('asset_id')=='tree.bare.refined')
tree.data=tree.data.copy()
# Carry a bark coordinate field along the branches, rather than stretching world-Z grain over the arch.
paths=[
 [(-3.28,-2.32,-.75),(-3.16,-2.13,.1),(-3.3,-1.96,1.08),(-3.45,-1.58,1.91),(-3.15,-1.18,2.73),(-2.87,-.65,3.51),(-2.43,.02,4.13),(-1.42,.64,4.49),(-.3,1.06,4.47),(1.1,1.32,4.5),(2.63,1.68,4.27),(3.5,1.94,4.08)],
 [(-.79,2.72,-.22),(-.81,2.77,.48),(-.98,2.71,1.35),(-.78,2.66,2.25),(-.84,2.64,3),(-1.06,2.56,3.83),(-1.84,1.95,4.29)],
 [(-2.73,-.2,3.88),(-2.45,.86,3.98),(-1.54,2.4,4.08),(.05,2.86,4.22),(1.96,3.19,4.5),(3.45,3.21,4.35)],
 [(-3.25,-1.32,2.52),(-3.75,-.5,3.33),(-3.77,.5,4),(-3.35,1.8,4.71),(-2.66,2.25,4.82)],
]
frames=[]
for path in paths:
    points=[Vector(p) for p in path];length=0;normal=None
    for a,b in zip(points,points[1:]):
        tangent=(b-a).normalized();segment=(b-a).length
        if normal is None:normal=tangent.cross(Vector((0,1,0))).normalized()
        else:normal=(normal-tangent*normal.dot(tangent)).normalized()
        binormal=tangent.cross(normal).normalized()
        for i in range(30):frames.append((a.lerp(b,i/30),normal.copy(),binormal,length+segment*i/30))
        length+=segment
kd=kdtree.KDTree(len(frames))
for i,f in enumerate(frames):kd.insert(f[0],i)
kd.balance()
field=tree.data.attributes.new('Bark flow coordinates','FLOAT_VECTOR','POINT')
for v,value in zip(tree.data.vertices,field.data):
    p=tree.matrix_world @ v.co;_,i,_=kd.find(p);center,n,b,length=frames[i];relative=p-center
    value.vector=(relative.dot(n)*2.7,relative.dot(b)*2.7,length*.24)
mat=bpy.data.materials.new('Bark · local flowing fissures');mat.use_nodes=True
nt=mat.node_tree;p=nt.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.91
attribute=nt.nodes.new('ShaderNodeAttribute');attribute.attribute_name='Bark flow coordinates'
noise=nt.nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=8;noise.inputs['Detail'].default_value=5;noise.inputs['Roughness'].default_value=.7
nt.links.new(attribute.outputs['Vector'],noise.inputs['Vector'])
vor=nt.nodes.new('ShaderNodeTexVoronoi');vor.feature='DISTANCE_TO_EDGE';vor.inputs['Scale'].default_value=10
nt.links.new(attribute.outputs['Vector'],vor.inputs['Vector'])
groove=nt.nodes.new('ShaderNodeValToRGB')
groove.color_ramp.elements[0].position=.012;groove.color_ramp.elements[0].color=(.015,.01,.018,1)
groove.color_ramp.elements[1].position=.18;groove.color_ramp.elements[1].color=(.145,.077,.092,1)
mid=groove.color_ramp.elements.new(.055);mid.color=(.045,.027,.04,1)
nt.links.new(vor.outputs['Distance'],groove.inputs[0])
mix=nt.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.45
nt.links.new(groove.outputs['Color'],mix.inputs[1]);nt.links.new(noise.outputs['Fac'],mix.inputs[2]);nt.links.new(mix.outputs[0],p.inputs['Base Color'])
bump=nt.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.65;bump.inputs['Distance'].default_value=.045
nt.links.new(vor.outputs['Distance'],bump.inputs['Height'])
fine=nt.nodes.new('ShaderNodeBump');fine.inputs['Strength'].default_value=.3;fine.inputs['Distance'].default_value=.016
nt.links.new(noise.outputs['Fac'],fine.inputs['Height']);nt.links.new(bump.outputs['Normal'],fine.inputs['Normal']);nt.links.new(fine.outputs['Normal'],p.inputs['Normal'])
tree.data.materials.clear();tree.data.materials.append(mat)
for f in tree.data.polygons:f.material_index=0
scene['milestone']='3b / local bark and refined tree form'
scene.cycles.samples=48
scene.render.filepath=str(ROOT/'renders'/'10-bark-local.png')
# Author a closer view while retaining the same assembled lighting and separate props.
camera_data=bpy.data.cameras.new('CAM 06 · Bark detail');close=bpy.data.objects.new('CAM 06 · Bark detail',camera_data)
scene.collection.objects.link(close);close.location=(.1,-5.6,3.5)
close.rotation_euler=(Vector((-2.0,.5,2.65))-close.location).to_track_quat('-Z','Y').to_euler();camera_data.lens=48
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'bark-local-study.blend'))
bpy.ops.render.render(write_still=True)
scene.camera=close;scene.render.filepath=str(ROOT/'renders'/'11-bark-local-detail.png');bpy.ops.render.render(write_still=True)
print('LOCAL_BARK_STUDY_COMPLETE')
