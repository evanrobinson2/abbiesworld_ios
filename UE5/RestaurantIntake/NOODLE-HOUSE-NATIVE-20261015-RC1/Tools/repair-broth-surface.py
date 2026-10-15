import bpy,json
from pathlib import Path
r=Path('C:/Users/Evan Robinson/Documents/Codex/2026-10-14/overcooked-2-deep-study/outputs/artist-noodle-intake/derived')
bpy.ops.wm.open_mainfile(filepath=str(r/'BrothPot.blend'));o=bpy.data.objects['SM_BrothPot']
bpy.ops.mesh.primitive_circle_add(vertices=64,radius=1,fill_type='NGON',location=(0,0,.2455));cap=bpy.context.object;cap.name='BrothSurfaceRepair';cap.scale=(.17,.195,1);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
m=bpy.data.materials.new('M_BrothSurface');m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.45,.24,.07,1);bs.inputs['Roughness'].default_value=.3;cap.data.materials.append(m)
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);cap.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.join()
bpy.ops.export_scene.fbx(filepath=str(r/'SM_BrothPot.fbx'),use_selection=True,object_types={'MESH'},global_scale=1,apply_unit_scale=True,bake_anim=False,axis_forward='-Y',axis_up='Z',path_mode='STRIP');bpy.ops.wm.save_as_mainfile(filepath=str(r/'BrothPot.blend'))
(r.parent/'broth-surface-repair.json').write_text(json.dumps({'reason':'cover dark triangular surface artifacts in original generated liquid','raw_source_unchanged':True,'ellipse_radii_m':[.17,.195],'height_m':.2455,'material':'M_BrothSurface','added_triangles':62},indent=2))
