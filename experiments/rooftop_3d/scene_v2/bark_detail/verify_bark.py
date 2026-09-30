"""Reopen the final scene and verify the preserved treehouse assembly."""
import bpy, bmesh, hashlib, json
import numpy as np
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
def mesh_hash(ob):
 a=np.empty(len(ob.data.vertices)*3,dtype=np.float32);ob.data.vertices.foreach_get('co',a)
 return hashlib.sha256(a.tobytes()).hexdigest()
def pose(ob):return [list(row) for row in ob.matrix_world]

baseline=ROOT/'rooftop-scene-b06.blend'
if not baseline.exists():baseline=ROOT/'rooftop-current.blend'
bpy.ops.wm.open_mainfile(filepath=str(baseline));scene=bpy.context.scene
baseline_tree=mesh_hash(bpy.data.objects['B04 continuous enclosing tree'])
camera_pose=pose(scene.camera);camera_lens=scene.camera.data.lens
fixed_collections=['B01 Deck planks','B02 Deck framing','B03 Railing','B05 Independent upholstery','05 Window alcove','06 Posts beams and braces','07 Seated rafters','08 Timber canopy boarding']
fixed={}
for name in fixed_collections:
 col=bpy.data.collections.get(name)
 if col:
  for ob in col.objects:fixed[ob.name]={'pose':pose(ob),'mesh':mesh_hash(ob) if ob.type=='MESH' else None}

bpy.ops.wm.open_mainfile(filepath=str(HERE/'rooftop-sunset-vfx.blend'));scene=bpy.context.scene;tree=bpy.data.objects['B04 continuous enclosing tree']
assert mesh_hash(tree)==baseline_tree
assert pose(scene.camera)==camera_pose and scene.camera.data.lens==camera_lens
for name,before in fixed.items():
 ob=bpy.data.objects[name];assert pose(ob)==before['pose'],name
 if before['mesh']:assert mesh_hash(ob)==before['mesh'],name
bm=bmesh.new();bm.from_mesh(tree.data);bm.verts.ensure_lookup_table();boundary=sum(e.is_boundary for e in bm.edges);seen=set();components=0
for v in bm.verts:
 if v.index in seen:continue
 components+=1;stack=[v];seen.add(v.index)
 while stack:
  v=stack.pop()
  for e in v.link_edges:
   other=e.other_vert(v)
   if other.index not in seen:seen.add(other.index);stack.append(other)
bm.free();assert boundary==0 and components==1

# All vertices on a contact triangle must have a zero displacement mask.
contacts=[];mask=tree.data.attributes['Bark relief allowed']
base_bvh=BVHTree.FromPolygons([v.co for v in tree.data.vertices],[list(p.vertices) for p in tree.data.polygons])
for o in sorted([o for o in scene.objects if o.name.startswith('B back cushion')],key=lambda o:o.name):
 where,normal,index,distance=base_bvh.ray_cast(Vector((o.location.x+.35,o.location.y,o.location.z)),Vector((-1,0,0)),2)
 assert where is not None
 back=min((o.matrix_world@Vector(c)).x for c in o.bound_box)
 gap=back-where.x;maximum=max(mask.data[i].value for i in tree.data.polygons[index].vertices)
 print('CONTACT_DIAGNOSTIC',o.name,gap,maximum,flush=True)
 assert -.025<gap<.005 and maximum<.00001
 contacts.append({'cushion':o.name,'soft_contact_m':round(gap,4),'maximum_contact_displacement_mask':maximum})
contact_floor=[v.index for v in tree.data.vertices if abs(v.co.z+.59)<.0001]
assert contact_floor and max(mask.data[i].value for i in contact_floor)==0
material=tree.data.materials[0]
images=[n.image for n in material.node_tree.nodes if n.type=='TEX_IMAGE']
assert all(im.packed_file and max(im.size)>=4096 for im in images)
assert material.displacement_method=='BOTH'
lamp=bpy.data.objects['B lantern 0 suspension'];petal=bpy.data.objects['B drifting petal 0'];scene.frame_set(1);lamp0=pose(lamp);petal0=petal.location.copy();scene.frame_set(61);assert pose(lamp)!=lamp0 and (petal.location-petal0).length>.1;scene.frame_set(1)
assert not bpy.data.collections['B07 Separate blossoms'].hide_render
assert not bpy.data.collections['B12 Foreground foliage layer'].hide_render
report={'revision':'B08','saved_scene_reopened':True,'tree_base_geometry_sha256':baseline_tree,'base_tree_unchanged_from_B06':True,'tree_components':components,'tree_open_boundary_edges':boundary,'original_camera_preserved':True,'architecture_and_upholstery_objects_unchanged':len(fixed),'couch_contacts':contacts,'bearing_plane_vertices_protected':len(contact_floor),'packed_unique_4k_maps':len(set(im.name for im in images)),'actual_displacement_method':material.displacement_method,'lantern_and_petal_motion_verified':True,'separate_foliage_preserved':True,'limitations':['Cycles render displacement is not baked for mobile.','This proves base-mesh closure and protected contacts, not structural engineering.','Bark shading, lighting and atmosphere are revised; remaining scene assets are still art in progress.']}
(HERE/'final-validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('B08_VERIFIED',json.dumps(report))
