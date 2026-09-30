"""Bake B10's actual 3D surfaces for a bounded-camera RealityKit scene.
No camera projection: every atlas is a conventional UV lightmap, including roof shade.
Run with Blender 5.2: blender -b -t 8 --python .../export_runtime.py
"""
import bpy, bmesh, json, math, struct, hashlib, time, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path('/Users/evanrobinson/abbies.world.ios')
SRC=ROOT/'experiments/rooftop_3d/scene_v2/rooftop-current.blend'
OUT=ROOT/'abbies.world.ios/abbies.world.ios/Resources/Rooftop3D'
WORK=ROOT/'experiments/rooftop_3d/runtime'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SRC))
s=bpy.context.scene
s.frame_set(1)
s.render.engine='CYCLES'; s.cycles.device='CPU'; s.cycles.samples=12
s.cycles.use_denoising=True
s.render.bake.margin=5
s.render.bake.use_clear=True
s.render.bake.use_selected_to_active=False
s.render.bake.use_pass_glossy=False
s.render.bake.use_pass_transmission=True
s.render.image_settings.file_format='PNG'; s.render.image_settings.color_mode='RGB'; s.render.image_settings.color_depth='8'
# Volumetric distance is represented by the already colored mountain layers, not a live fog volume.
for o in list(bpy.data.objects):
    if o.hide_render or o.name=='B08 distant sunset haze' or o.name.startswith('B drifting petal'):
        bpy.data.objects.remove(o,do_unlink=True)
for m in bpy.data.materials:
    if hasattr(m,'displacement_method'): m.displacement_method='BUMP'

# Approximate light passing through thin petals in the baked mobile material.
# A small tinted radiance floor avoids black undersides without a live transmission shader.
for m in bpy.data.materials:
    if 'Sakura tone' not in m.name: continue
    nt=m.node_tree
    principled=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
    output=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL')
    previous=output.inputs['Surface'].links[0].from_socket
    emission=nt.nodes.new('ShaderNodeEmission')
    emission.inputs['Color'].default_value=principled.inputs['Base Color'].default_value
    emission.inputs['Strength'].default_value=.32
    addnode=nt.nodes.new('ShaderNodeAddShader')
    nt.links.new(previous,addnode.inputs[0]);nt.links.new(emission.outputs[0],addnode.inputs[1])
    nt.links.new(addnode.outputs[0],output.inputs['Surface'])

# Classify while names/collections still identify the original modular pieces.
groups={}
meta={}
def add(key,o,size=1024,pivot=None,motion='static'):
    groups.setdefault(key,[]).append(o)
    meta[key]={'name':key,'texture':'rooftop-'+key+'.png','mesh':'rooftop-'+key+'.rtmesh','size':size,'motion':motion,'pivot':pivot or [0,0,0]}
for o in list(s.objects):
    if o.type not in {'MESH','CURVE'}: continue
    cs=' '.join(c.name for c in o.users_collection)
    if 'B07 Separate blossoms' in cs or 'B12 Foreground' in cs:
        p=o.matrix_world.translation
        k=0 if 'Foreground' in cs else (1 if p.z<1.5 else 2+min(3,max(0,int((p.x+4)/3))))
        add('foliage_'+str(k),o,1024 if k>=2 else 512,motion='foliage')
    elif 'B04 Living' in cs:
        add('tree' if 'continuous enclosing' in o.name else 'branches',o,2048 if 'continuous enclosing' in o.name else 1024)
    elif 'B06 Suspended' in cs:
        par=o.parent
        while par and 'suspension' not in par.name: par=par.parent
        k=par.name.split()[2] if par else 'fixed'
        add('lantern_'+k,o,256,pivot=list(par.matrix_world.translation) if par else None,motion='lantern' if par else 'static')
    elif 'B09 Mountain' in cs: add('distance',o,1024)
    elif 'B14 Broad' in cs: add('roof',o,1024)
    elif 'B05 Independent' in cs: add('cushions',o,1024)
    elif 'B01 Deck planks' in cs or 'B02 Deck framing' in cs: add('deck',o,2048)
    elif 'B11 Independent' in cs: add('fairylights',o,512)
    else: add('architecture',o,2048)

# Apply only a small geometric budget. All high-frequency lighting/detail is baked below.
for key,obs in groups.items():
    for o in obs:
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
        if o.type=='CURVE': o.data.resolution_u=3; o.data.bevel_resolution=min(1,o.data.bevel_resolution)
        for mod in o.modifiers:
            if mod.type=='SUBSURF': mod.levels=0; mod.render_levels=0
            if mod.type=='BEVEL': mod.segments=min(2,mod.segments)
        bpy.ops.object.convert(target='MESH')
        o.data=o.data.copy()
        if key=='tree':
            bm=bmesh.new(); bm.from_mesh(o.data)
            bmesh.ops.delete(bm,geom=[v for v in bm.verts if (o.matrix_world@v.co).z < -1.8],context='VERTS')
            bm.to_mesh(o.data); bm.free()
        # Retain complete five-petal flowers; generic decimation tears these disconnected thin surfaces.
        is_flower=key.startswith('foliage') and len(o.data.vertices)==4400
        if is_flower:
            old=o.data
            vv=[];ff=[];mm=[]
            for poly in old.polygons:
                if (poly.index//5)%4: continue
                ring=list(poly.vertices)
                chosen=ring[::2]
                ff.append(tuple(range(len(vv),len(vv)+len(chosen))))
                vv.extend([old.vertices[i].co.copy() for i in chosen]);mm.append(poly.material_index)
            new=bpy.data.meshes.new(o.name+' complete flowers')
            new.from_pydata(vv,[],ff)
            for mat in old.materials:new.materials.append(mat)
            for poly,mi in zip(new.polygons,mm):poly.material_index=mi;poly.use_smooth=True
            o.data=new
        ratio=.24 if key=='tree' else (.30 if key.startswith('lantern') else (.35 if key.startswith('foliage') and not is_flower else 1))
        if ratio<1:
            mod=o.modifiers.new('mobile silhouette budget','DECIMATE'); mod.ratio=ratio
            bpy.ops.object.modifier_apply(modifier=mod.name)
        # Separate UVs per placement preserve individually baked light/shadow.
        o.data=o.data.copy()
        for slot in o.material_slots:
            if slot.material is None: slot.material=next((m for m in o.data.materials if m),None)
        for uv in list(o.data.uv_layers): o.data.uv_layers.remove(uv)
        o.data.uv_layers.new(name='Lightmap')
    if key.startswith('foliage'):
        pts=[o.matrix_world.translation for o in obs]
        p=sum(pts,Vector())/len(pts)
        meta[key]['pivot']=[p.x,p.y,p.z-.20]
# Preserve object/generated coordinates before joining, so procedural textures do not stretch.
for key,obs in groups.items():
    for o in obs:
        mesh=o.data
        lo=Vector(tuple(min(v.co[i] for v in mesh.vertices) for i in range(3)))
        hi=Vector(tuple(max(v.co[i] for v in mesh.vertices) for i in range(3)))
        for name in ['RuntimeGenerated','RuntimeObject']:
            attr=mesh.attributes.new(name,'FLOAT_VECTOR','POINT')
            for v in mesh.vertices:
                attr.data[v.index].vector=tuple((v.co[i]-lo[i])/max(1e-6,hi[i]-lo[i]) for i in range(3)) if name=='RuntimeGenerated' else v.co
for mat in bpy.data.materials:
    if not mat.node_tree: continue
    nt=mat.node_tree
    for node in list(nt.nodes):
        if node.type!='TEX_COORD': continue
        for output,attrname in [('Generated','RuntimeGenerated'),('Object','RuntimeObject')]:
            for link in list(node.outputs[output].links):
                a=nt.nodes.new('ShaderNodeAttribute'); a.attribute_name=attrname
                nt.links.new(a.outputs['Vector'],link.to_socket)
for key,obs in groups.items():
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]
    bpy.ops.object.join()
    joined=bpy.context.view_layer.objects.active
    joined.name='Runtime '+key
    groups[key]=[joined]
print('PREPARED',[(k,len(v),sum(len(o.data.polygons) for o in v)) for k,v in groups.items()],flush=True)

manifest={'version':1,'sourceSHA256':hashlib.sha256(SRC.read_bytes()).hexdigest(),
 'coordinates':'meters, Y up; converted from Blender (x,z,-y)',
 'camera':{'position':[-3.1,2.65,5.8],'target':[.7,1.3,-3],'verticalFOV':2*math.degrees(math.atan((36/24/2)*(964/1280))),'aspect':1280/964},
 'lighting':'UV baked Cycles direct/indirect sunset and roof shade; no projected reference image, live shadows or volume',
 'parts':[]}
if '--foliage-only' in sys.argv:
    old=json.loads((OUT/'rooftop-manifest.json').read_text())
    manifest['parts']=[p for p in old['parts'] if not p['name'].startswith('foliage')]
    groups={k:v for k,v in groups.items() if k.startswith('foliage')}
for key,obs in groups.items():
    start=time.time(); info=meta[key]
    if key.startswith('foliage'): info['size']=256
    bpy.ops.object.select_all(action='DESELECT')
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active=obs[0]
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.006,area_weight=.5)
    bpy.ops.object.mode_set(mode='OBJECT')
    img=bpy.data.images.new(key+'_lightmap',width=info['size'],height=info['size'],alpha=False,float_buffer=True)
    mats=set(m for o in obs for m in o.data.materials if m)
    for m in mats:
        m.use_nodes=True
        for n in m.node_tree.nodes: n.select=False
        n=m.node_tree.nodes.new('ShaderNodeTexImage'); n.image=img; n.select=True; m.node_tree.nodes.active=n
    print('BAKING',key,info['size'],flush=True)
    if key.startswith('foliage'):
        # Tiny disconnected UV islands cannot survive mipmapping. Use large palette cells
        # with per-face baked sun tint instead; every whole petal gets a valid texel.
        import numpy as np
        colors=[(.88,.19,.36),(1,.37,.52),(1,.53,.62),(1,.68,.72),(.36,.07,.17)]
        pix=np.ones((256,256,4),dtype=np.float32)
        def lin(x): return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
        pix[:,:,:3]=[lin(x) for x in colors[1]]
        for row,color in enumerate(colors):
            for col in range(16):
                shade=.62+.38*col/15
                pix[row*16:(row+1)*16,col*16:(col+1)*16,:3]=[lin(v*shade) for v in color]
        img.pixels.foreach_set(pix.ravel())
        img.filepath_raw=str(OUT/info['texture']);img.file_format='PNG';img.save()
        sun=Vector((.60,.50,.62)).normalized()
        for o in obs:
            uv=o.data.uv_layers.active.data
            nm=o.matrix_world.to_3x3().inverted().transposed()
            for poly in o.data.polygons:
                mat=o.data.materials[poly.material_index]
                row=int(mat.name[-1]) if 'Sakura tone' in mat.name else 4
                facing=abs((nm@poly.normal).normalized().dot(sun))
                col=min(15,max(0,round(facing*15)))
                for li in poly.loop_indices:uv[li].uv=((col+.5)/16,(row+.5)/16)
        info['shading']='whole-flower palette with baked directional tint; no tiny UV islands'
    else:
        bpy.ops.object.bake(type='COMBINED')
        img.save_render(str(OUT/info['texture']),scene=s)
    # Keep originals present with original materials until all shadow/light bakes are done.
    # Write indexed mesh with shared vertex records (position, normal, UV). All indices validated natively.
    verts=[]; indices=[]; lookup={}
    pivot=Vector(info['pivot']); nativepivot=Vector((pivot.x,pivot.z,-pivot.y))
    for o in obs:
        mesh=o.data; mesh.calc_loop_triangles(); uv=mesh.uv_layers.active.data
        normalmat=o.matrix_world.to_3x3().inverted().transposed()
        for tri in mesh.loop_triangles:
            for li in tri.loops:
                loop=mesh.loops[li]; pos=o.matrix_world@mesh.vertices[loop.vertex_index].co
                n=(normalmat@mesh.corner_normals[li].vector).normalized(); t=uv[li].uv
                rec=(pos.x-pivot.x,pos.z-pivot.z,-pos.y+pivot.y,n.x,n.z,-n.y,t.x,t.y)
                rec=tuple(round(x,6) for x in rec)
                idx=lookup.get(rec)
                if idx is None: idx=len(verts);lookup[rec]=idx;verts.append(rec)
                indices.append(idx)
    with (OUT/info['mesh']).open('wb') as f:
        f.write(struct.pack('<4sII',b'RTM1',len(verts),len(indices)))
        for v in verts: f.write(struct.pack('<8f',*v))
        f.write(struct.pack('<%sI'%len(indices),*indices))
    info.update({'vertices':len(verts),'triangles':len(indices)//3,'pivot':list(nativepivot),'bakeSeconds':round(time.time()-start,1)})
    manifest['parts'].append(info)
    (WORK/'export-progress.json').write_text(json.dumps(manifest,indent=2))
    # Free float atlas once saved; the unused bake nodes can reference a lightweight file.
    bpy.data.images.remove(img)
    print('EXPORTED',key,info['triangles'],info['bakeSeconds'],flush=True)
manifest['triangles']=sum(p['triangles'] for p in manifest['parts'])
manifest['textureBytesRGBA8']=sum(p['size']**2*4 for p in manifest['parts'])
manifest['meshBytes']=sum((OUT/p['mesh']).stat().st_size for p in manifest['parts'])
(OUT/'rooftop-manifest.json').write_text(json.dumps(manifest,indent=2))
(WORK/'export-report.json').write_text(json.dumps(manifest,indent=2))
print('DONE',manifest['triangles'],manifest['textureBytesRGBA8'],flush=True)
