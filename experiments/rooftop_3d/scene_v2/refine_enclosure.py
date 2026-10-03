"""B05: sculpt the continuous tree while retaining room and deck contacts."""
import bpy,bmesh,math,json,numpy as np
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'rooftop-scene-b04.blend'));scene=bpy.context.scene;D=json.loads((ROOT/'design-b04.json').read_text());core=bpy.data.objects['B04 continuous enclosing tree']
# Add resolution only across large carved faces; exterior bark is already densely modeled.
bm=bmesh.new();bm.from_mesh(core.data);big=[f for f in bm.faces if f.calc_area()>.10]
bmesh.ops.triangulate(bm,faces=big);long=[e for e in bm.edges if e.calc_length()>.48]
if long:bmesh.ops.subdivide_edges(bm,edges=long,cuts=4,use_grid_fill=True)
bm.to_mesh(core.data);bm.free()
coords=np.empty(len(core.data.vertices)*3,dtype=np.float32);core.data.vertices.foreach_get('co',coords);P=coords.reshape(-1,3).copy();old=P.copy();x,y,z=old.T
# A broad, gentle waist above the cushions and an arch above the room.
profile=np.interp(z,[-12,1.12,1.9,2.6,3.5,4.3,8.2],[0,0,-.32,-.22,.30,.42,0]);front=np.clip((1.9-y)/2.1,0,1);across=np.exp(-((x+3.85)/1.3)**4);P[:,0]+=profile*front*across
# Relieve the bulbous front of the upper trunk while preserving the living arm's centerline.
points=np.array(D['tree']['foreground_path']);radii=np.array(D['tree']['foreground_radii']);distance=np.full(len(P),100.,dtype=np.float64)
for j in range(len(points)-1):
 a,b=points[j:j+2];v=b-a;t=np.clip(((old-a)@v)/(v@v),0,1);r=radii[j]*(1-t)+radii[j+1]*t;d=np.linalg.norm(old-a-t[:,None]*v,axis=1)-r;distance=np.minimum(distance,d)
protect=np.clip(distance/.35,0,1);weight=np.clip((z-3.55)/1.2,0,1)*np.clip((2.2-y)/3.5,0,1)*np.clip((x+4.5)/2.0,0,1)*protect
P[:,1]+=weight*2.0
core.data.vertices.foreach_set('co',P.astype(np.float32).ravel());core.data.update()
# Put each cushion just against the bark: a small soft overlap, no open gap or deep burial.
bpy.context.view_layer.update();contacts=[]
for ob in sorted([o for o in scene.objects if o.name.startswith('B back cushion')],key=lambda o:o.name):
 start=Vector((ob.location.x+.35,ob.location.y,ob.location.z));hit,where,normal,index=core.ray_cast(start,Vector((-1,0,0)),distance=2);assert hit
 back=min((ob.matrix_world@Vector(c)).x for c in ob.bound_box);gap=back-where.x;ob.location.x+=-.012-gap;bpy.context.view_layer.update()
 newback=min((ob.matrix_world@Vector(c)).x for c in ob.bound_box);newgap=newback-where.x;assert -.025<newgap<.005;contacts.append({'cushion':ob.name,'soft_contact_m':round(newgap,4)})
# Fine procedural relief across the newly carved wood without changing its architectural shape.
tex=bpy.data.textures.new('B05 irregular carved bark relief',type='CLOUDS');tex.noise_scale=.18;tex.noise_depth=2;dis=core.modifiers.new('Fine bark relief','DISPLACE');dis.texture=tex;dis.strength=.020;dis.mid_level=.5;dis.texture_coords='GLOBAL'
# Final connectivity / closure proof after sculpting.
bm=bmesh.new();bm.from_mesh(core.data);boundary=sum(e.is_boundary for e in bm.edges);seen=set();groups=[]
for v in bm.verts:
 if v in seen:continue
 group=[];stack=[v];seen.add(v)
 while stack:
  q=stack.pop();group.append(q)
  for e in q.link_edges:
   n=e.other_vert(q)
   if n not in seen:seen.add(n);stack.append(n)
 groups.append(group)
bm.free();assert boundary==0;assert len(groups)==1
D['revision']='B05';D['tree']['sculpt']='World-space softened waist and overhead relief, preserving the integral arm and support volume; camera unchanged';(ROOT/'design-b05.json').write_text(json.dumps(D,indent=2)+'\n')
report=json.loads((ROOT/'tree-enclosure-validation.json').read_text());report.update(revision='B05',one_continuous_tree_component=True,tree_open_boundary_edges=boundary,couch_back_contacts=contacts,geometry_vertices=len(core.data.vertices));(ROOT/'tree-enclosure-validation-b05.json').write_text(json.dumps(report,indent=2)+'\n')
scene['revision']='B05';scene.cycles.samples=48;scene.render.filepath=str(ROOT/'B05-assembled.png');scene.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'rooftop-scene-b05.blend'));bpy.ops.render.render(write_still=True)
# Small camera displacement uses identical geometry and lighting.
cam=scene.camera;initial=cam.matrix_world.copy();cam.location+=Vector((.28,.10,0));scene.cycles.samples=20;scene.render.filepath=str(ROOT/'B05-depth.png');bpy.ops.render.render(write_still=True);cam.matrix_world=initial
print('B05_COMPLETE',json.dumps(report))
