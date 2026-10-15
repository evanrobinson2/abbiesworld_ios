import unreal
from pathlib import Path
ats=unreal.AssetToolsHelpers.get_asset_tools();d='/Game/AbbiesRestaurant';name='M_BrothSurface';m=unreal.load_asset(d+'/'+name) or ats.create_asset(name,d,unreal.Material,unreal.MaterialFactoryNew());unreal.MaterialEditingLibrary.delete_all_material_expressions(m)
e=unreal.MaterialEditingLibrary.create_material_expression(m,unreal.MaterialExpressionConstant3Vector);e.constant=unreal.LinearColor(.45,.24,.07);unreal.MaterialEditingLibrary.connect_material_property(e,'',unreal.MaterialProperty.MP_BASE_COLOR)
e=unreal.MaterialEditingLibrary.create_material_expression(m,unreal.MaterialExpressionConstant);e.r=.3;unreal.MaterialEditingLibrary.connect_material_property(e,'',unreal.MaterialProperty.MP_ROUGHNESS);unreal.MaterialEditingLibrary.recompile_material(m);unreal.EditorAssetLibrary.save_loaded_asset(m)
o=unreal.FbxImportUI();o.import_mesh=True;o.import_materials=False;o.import_textures=False;o.import_as_skeletal=False;o.mesh_type_to_import=unreal.FBXImportType.FBXIT_STATIC_MESH;o.static_mesh_import_data.combine_meshes=True;o.static_mesh_import_data.auto_generate_collision=False
t=unreal.AssetImportTask();t.filename='C:/Users/Evan Robinson/Documents/Codex/2026-10-14/overcooked-2-deep-study/outputs/artist-noodle-intake/derived/SM_BrothPot.fbx';t.destination_path=d;t.destination_name='SM_BrothPot';t.automated=True;t.save=True;t.replace_existing=True;t.options=o;ats.import_asset_tasks([t]);mesh=unreal.load_asset(d+'/SM_BrothPot')
for i,s in enumerate(mesh.static_materials):mesh.set_material(i,m if str(s.material_slot_name)=='M_BrothSurface' else unreal.load_asset(d+'/M_Artist_BrothPot'))
unreal.EditorAssetLibrary.save_loaded_asset(mesh);unreal.log('BROTH_SURFACE_REPAIR_OK')
