import unreal,json
from pathlib import Path
root=Path('C:/Users/Evan Robinson/Documents/Codex/2026-10-14/overcooked-2-deep-study/outputs/artist-noodle-intake');src=root/'derived';dest='/Game/AbbiesRestaurant';ats=unreal.AssetToolsHelpers.get_asset_tools();results=[]
def imp(path,name,options=None):
 t=unreal.AssetImportTask();t.filename=str(path);t.destination_path=dest;t.destination_name=name;t.automated=True;t.save=True;t.replace_existing=True
 if options:t.options=options
 ats.import_asset_tasks([t]);ob=unreal.load_asset(dest+'/'+name);assert ob,name;return ob
for a in json.loads((root/'derived-manifest.json').read_text()):
 role=a['role'];mname='M_Artist_'+role;mat=unreal.load_asset(dest+'/'+mname) or ats.create_asset(mname,dest,unreal.Material,unreal.MaterialFactoryNew());unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
 for idx in range(3):
  name='T_Artist_'+role+'_'+str(idx);tex=imp(src/(name+'.png'),name)
  if idx>0:tex.set_editor_property('srgb',False)
  if idx==2:tex.set_editor_property('compression_settings',unreal.TextureCompressionSettings.TC_NORMALMAP);tex.set_editor_property('flip_green_channel',True)
  unreal.EditorAssetLibrary.save_loaded_asset(tex)
  ex=unreal.MaterialEditingLibrary.create_material_expression(mat,unreal.MaterialExpressionTextureSample);ex.texture=tex
  if idx==0:unreal.MaterialEditingLibrary.connect_material_property(ex,'RGB',unreal.MaterialProperty.MP_BASE_COLOR)
  elif idx==1:
   unreal.MaterialEditingLibrary.connect_material_property(ex,'G',unreal.MaterialProperty.MP_ROUGHNESS);unreal.MaterialEditingLibrary.connect_material_property(ex,'B',unreal.MaterialProperty.MP_METALLIC)
  else:
   ex.sampler_type=unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL;unreal.MaterialEditingLibrary.connect_material_property(ex,'RGB',unreal.MaterialProperty.MP_NORMAL)
 unreal.MaterialEditingLibrary.recompile_material(mat);unreal.EditorAssetLibrary.save_loaded_asset(mat)
 opt=unreal.FbxImportUI();opt.import_mesh=True;opt.import_materials=False;opt.import_textures=False;opt.import_as_skeletal=False;opt.mesh_type_to_import=unreal.FBXImportType.FBXIT_STATIC_MESH;opt.static_mesh_import_data.combine_meshes=True;opt.static_mesh_import_data.auto_generate_collision=False
 mesh=imp(src/a['fbx'],'SM_'+role,opt)
 for idx in range(len(mesh.static_materials)):mesh.set_material(idx,mat)
 if role.startswith('Chef'):
  old=mesh.find_socket('Carry')
  if old:mesh.remove_socket(old)
  sock=unreal.StaticMeshSocket(outer=mesh);sock.set_editor_property('socket_name','Carry');sock.relative_location=unreal.Vector(32,0,55);mesh.add_socket(sock)
 if role=='Counter':
  old=mesh.find_socket('Worktop')
  if old:mesh.remove_socket(old)
  sock=unreal.StaticMeshSocket(outer=mesh);sock.set_editor_property('socket_name','Worktop');sock.relative_location=unreal.Vector(0,0,77.635467);mesh.add_socket(sock)
 unreal.EditorAssetLibrary.save_loaded_asset(mesh);b=mesh.get_bounds();results.append({'role':role,'asset':dest+'/SM_'+role,'dimensions_cm':[b.box_extent.x*2,b.box_extent.y*2,b.box_extent.z*2],'carry_socket':bool(mesh.find_socket('Carry')),'status':'imported_awaiting_native_visual_and_attachment_calibration'})
(root/'unreal-import-results.json').write_text(json.dumps(results,indent=2));unreal.log('FF_ARTIST_IMPORT_OK '+str(len(results)))


