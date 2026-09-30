"""Authored branching tree with an irregular silhouette, root flare and modeled bark flutes."""
import bpy, bmesh, math, json, hashlib
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parent;TRIAL=ROOT/'meshy_bark_trial';TRIAL.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'meshy-material-study.blend'))
scene=bpy.context.scene;scene.camera=bpy.data.objects['CAM 05 · Sunset from the balcony']
old=next(o for o in scene.objects if o.get('asset_id')=='tree.bare')
old.hide_render=True;old.hide_viewport=True
col=bpy.data.collections.new('ASSET · sculpted bare tree');scene.collection.children.link(col)
col['asset_id']='tree.bare.refined';col.asset_mark();col.asset_data.description='Flared roots, irregular trunk and woody branches only; vegetation remains separate.'
mat=bpy.data.materials.new('Bark form · neutral dark plum');mat.use_nodes=True
bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.095,.040,.055,1);bsdf.inputs['Roughness'].default_value=.92

def catmull(p0,p1,p2,p3,t):
    return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)

def sweep(name,coords,radii,radial=48,steps=18,seed=0):
    points=[Vector(p) for p in coords];centers=[];sizes=[]
    for i in range(len(points)-1):
        for j in range(steps):
            t=j/steps
            centers.append(catmull(points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)],t))
            sizes.append(max(.008,catmull(radii[max(0,i-1)],radii[i],radii[i+1],radii[min(len(radii)-1,i+2)],t)))
    centers.append(points[-1]);sizes.append(radii[-1])
    verts=[];faces=[];normal=None
    length=0
    for i,(center,radius) in enumerate(zip(centers,sizes)):
        tangent=(centers[min(i+1,len(centers)-1)]-centers[max(0,i-1)]).normalized()
        if normal is None:normal=tangent.cross(Vector((0,1,0))).normalized()
        else:normal=(normal-tangent*normal.dot(tangent)).normalized()
        binormal=tangent.cross(normal).normalized()
        if i:length+=(center-centers[i-1]).length
        u=i/(len(centers)-1)
        for j in range(radial):
            a=math.tau*j/radial
            twist=.8*math.sin(u*4+seed)+u*1.3
            # Irregular broad lobes and long bark flutes affect the actual silhouette.
            fluting=.09*math.sin(a*5+twist)+.045*math.sin(a*11+twist*1.5+length*.4)+.021*math.sin(a*19-twist)
            bulge=.10*math.sin(a*2+seed+.7*math.sin(length))
            if name.startswith('Main'):
                knot=math.exp(-((u-.28)/.06)**2)*math.exp(-((math.sin((a-2.8)/2))/.33)**2)
                bulge+=.26*knot
            r=radius*(1+fluting+bulge)
            verts.append(tuple(center+r*(math.cos(a)*normal+math.sin(a)*binormal)))
        if i:
            for j in range(radial):
                a0=(i-1)*radial+j;b0=(i-1)*radial+(j+1)%radial
                faces.append((a0,b0,b0+radial,a0+radial))
    faces.append(tuple(range(radial-1,-1,-1)))
    faces.append(tuple((len(centers)-1)*radial+j for j in range(radial)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(mat)
    ob=bpy.data.objects.new(name,mesh);col.objects.link(ob)
    for f in mesh.polygons:f.use_smooth=True
    return ob

large=[]
large.append(sweep('Main old sheltering trunk',[
    (-3.28,-2.32,-.75),(-3.16,-2.13,.1),(-3.3,-1.96,1.08),(-3.45,-1.58,1.91),
    (-3.15,-1.18,2.73),(-2.87,-.65,3.51),(-2.43,.02,4.13),(-1.42,.64,4.49),
    (-.30,1.06,4.47),(1.1,1.32,4.50),(2.63,1.68,4.27),(3.5,1.94,4.08)],
    [.72,.65,.48,.53,.45,.46,.38,.31,.235,.16,.085,.018],steps=17,radial=64))
large.append(sweep('Door side living trunk',[
    (-.79,2.72,-.22),(-.81,2.77,.48),(-.98,2.71,1.35),(-.78,2.66,2.25),
    (-.84,2.64,3.00),(-1.06,2.56,3.83),(-1.84,1.95,4.29)],
    [.39,.31,.24,.27,.26,.25,.06],seed=2))
large.append(sweep('Roof fork',[
    (-2.73,-.2,3.88),(-2.45,.86,3.98),(-1.54,2.4,4.08),(.05,2.86,4.22),(1.96,3.19,4.5),(3.45,3.21,4.35)],
    [.32,.23,.205,.145,.08,.012],seed=4))
large.append(sweep('Upper left fork',[
    (-3.25,-1.32,2.52),(-3.75,-.50,3.33),(-3.77,.50,4.0),(-3.35,1.8,4.71),(-2.66,2.25,4.82)],
    [.26,.19,.15,.085,.018],seed=5))
large.append(sweep('Front root buttress',[
    (-3.23,-2.06,.77),(-3.15,-2.35,.34),(-2.99,-2.74,.01),(-2.38,-3.09,-.22)],
    [.31,.25,.16,.01],radial=32,seed=8))
large.append(sweep('Outer root buttress',[
    (-3.23,-2.04,.82),(-3.64,-2.15,.29),(-3.92,-2.76,-.35)],
    [.30,.29,.015],radial=32,seed=9))
large.append(sweep('Rear root buttress',[
    (-3.25,-1.94,.83),(-3.47,-1.42,.25),(-3.59,-.66,-.10)],
    [.26,.23,.01],radial=32,seed=10))

# Merge coarse branch junctions so forks grow into the trunk instead of ending as tubes.
bpy.ops.object.select_all(action='DESELECT')
for ob in large:ob.select_set(True)
bpy.context.view_layer.objects.active=large[0];bpy.ops.object.join();tree=bpy.context.object
tree.name='Bare tree · roots, knots and fluted trunk'
remesh=tree.modifiers.new('Blend grown branch junctions','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.033
remesh.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=tree.modifiers.new('Ease branch junctions','SMOOTH');smooth.factor=.45;smooth.iterations=3;bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate=tree.modifiers.new('Study geometry budget','DECIMATE');decimate.ratio=.64;bpy.ops.object.modifier_apply(modifier=decimate.name)

# Preserve the existing small woody branches; their blossoms stay in separate linked collections.
dg=bpy.context.evaluated_depsgraph_get();small=[]
for source in old.instance_collection.objects:
    if not source.name.startswith('Blossom branch'):continue
    mesh=bpy.data.meshes.new_from_object(source.evaluated_get(dg),depsgraph=dg)
    o=bpy.data.objects.new(source.name,mesh);col.objects.link(o);o.matrix_world=old.matrix_world @ source.matrix_world
    small.append(o)
bpy.ops.object.select_all(action='DESELECT');tree.select_set(True)
for ob in small:ob.select_set(True)
bpy.context.view_layer.objects.active=tree;bpy.ops.object.join()
tree.data.materials.clear();tree.data.materials.append(mat)
for f in tree.data.polygons:f.material_index=0;f.use_smooth=True
tree['asset_id']='tree.bare.refined';tree['vegetation_included']=False
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
bm=bmesh.from_edit_mesh(tree.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bmesh.update_edit_mesh(tree.data)
bpy.ops.uv.smart_project(angle_limit=math.radians(72),island_margin=.008)
bpy.ops.object.mode_set(mode='OBJECT')

scene['milestone']='3b / authored tree form awaiting bark texture'
scene.render.filepath=str(ROOT/'renders'/'09-tree-form.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'tree-form-study.blend'))
bpy.data.libraries.write(str(ROOT/'assets'/'rooftop-tree-form.blend'),{col},fake_user=True,compress=True)

# Export a centered copy; retain the in-scene world coordinates in the saved study above.
center=Vector((0,0,0))
for v in tree.bound_box:center+=tree.matrix_world @ Vector(v)
center/=8
world=tree.matrix_world.copy()
tree.data=tree.data.copy();tree.data.transform(Matrix.Translation(-center) @ world);tree.matrix_world=Matrix.Identity(4)
path=TRIAL/'tree-bark-input.glb'
bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
tree.data.calc_loop_triangles();bounds=[Vector(v) for v in tree.bound_box]
record={'input_model':path.name,'input_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'origin_blender_z_up':list(center),'triangles':len(tree.data.loop_triangles),
        'bounds_local':{'min':[min(v[i] for v in bounds) for i in range(3)],'max':[max(v[i] for v in bounds) for i in range(3)]},
        'scope':'Bare tree, woody branches and roots only; all flowers stay independent',
        'uv':'Smart Project on merged sculpted form with padded islands'}
(TRIAL/'input-manifest.json').write_text(json.dumps(record,indent=2)+'\n')
# Reopen the untouched saved arrangement for the form comparison.
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'tree-form-study.blend'))
bpy.context.scene.cycles.samples=32;bpy.ops.render.render(write_still=True)
print('TREE_FORM_PREPARED',json.dumps({'triangles':record['triangles'],'bytes':path.stat().st_size}))
