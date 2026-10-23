# Render every piece of the mannequin on its own, same 3/4 camera, framed to the piece.
import bpy, sys, math
from mathutils import Vector
base=sys.argv[-1]; bpy.ops.wm.open_mainfile(filepath=base+".blend")
sc=bpy.context.scene; sc.render.resolution_x=sc.render.resolution_y=240
sh=sc.display.shading; sh.light='STUDIO'; sh.color_type='MATERIAL'; sh.show_cavity=True; sh.background_type='VIEWPORT'; sh.background_color=(1,1,1)
sc.render.film_transparent=False
cam=sc.camera; cam.data.type='ORTHO'
meshes=[o for o in bpy.data.objects if o.type=='MESH']
d=Vector((0.6,-1,0.35)).normalized()
for o in meshes:
    for m in meshes: m.hide_render=(m!=o)
    pts=[o.matrix_world@v.co for v in o.data.vertices]; c=sum(pts,Vector())/len(pts)
    size=max((p-c).length for p in pts)
    cam.location=c-d*20; cam.rotation_euler=d.to_track_quat('-Z','Y').to_euler()
    cam.data.ortho_scale=size*2.4
    sc.render.filepath=f"{base}_parts/{o.name}.png"; bpy.ops.render.render(write_still=True)
print(len(meshes))
