import unreal,json
from pathlib import Path
roles=['ChefAbbie','ChefDaddy','ChefMommy','Counter','NoodleBowl','BrothPot','Garnish','NoodleHouse'];rows=[]
for role in roles:
 path='/Game/AbbiesRestaurant/M_Artist_'+role;mat=unreal.load_asset(path);assert mat,path;unreal.MaterialEditingLibrary.delete_all_material_expressions(mat)
 for idx in range(3):
  tex=unreal.load_asset('/Game/AbbiesRestaurant/T_Artist_'+role+'_'+str(idx));assert tex
  ex=unreal.MaterialEditingLibrary.create_material_expression(mat,unreal.MaterialExpressionTextureSample);ex.texture=tex
  if idx==0:
   ex.sampler_type=unreal.MaterialSamplerType.SAMPLERTYPE_COLOR;unreal.MaterialEditingLibrary.connect_material_property(ex,'RGB',unreal.MaterialProperty.MP_BASE_COLOR)
  elif idx==1:
   ex.sampler_type=unreal.MaterialSamplerType.SAMPLERTYPE_LINEAR_COLOR;unreal.MaterialEditingLibrary.connect_material_property(ex,'G',unreal.MaterialProperty.MP_ROUGHNESS);unreal.MaterialEditingLibrary.connect_material_property(ex,'B',unreal.MaterialProperty.MP_METALLIC)
  else:
   ex.sampler_type=unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL;unreal.MaterialEditingLibrary.connect_material_property(ex,'RGB',unreal.MaterialProperty.MP_NORMAL)
 unreal.MaterialEditingLibrary.recompile_material(mat);unreal.EditorAssetLibrary.save_loaded_asset(mat);rows.append(path)
Path('C:/Users/Evan Robinson/Documents/Codex/2026-10-14/overcooked-2-deep-study/outputs/noodle-house-multiplayer/material-repair.json').write_text(json.dumps({'materials':rows,'roughness_metallic_sampler':'Linear Color'},indent=2));unreal.log('NOODLE_MATERIALS_REPAIRED '+str(len(rows)))
