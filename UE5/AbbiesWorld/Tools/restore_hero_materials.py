"""Restore source glTF PBR channels omitted by FBX import; run inside Unreal Editor.
Set ABBIES_HERO_MATERIAL_JOBS to a JSON list of id, folder, maps (normal/orm).
This preserves existing meshes, base-color materials, and package identities.
"""
import json,os
from pathlib import Path
import unreal
job_file=Path(os.environ['ABBIES_HERO_MATERIAL_JOBS']);jobs=json.loads(job_file.read_text());report=[]
for job in jobs:
 material=unreal.load_asset(job['folder']+'/'+job.get('material','Material_0'))
 if not material:material=unreal.load_asset(job['folder']+'/M_'+job['id'].replace('-','_'))
 if not isinstance(material,unreal.Material):
  report.append({'id':job['id'],'status':'missing material'});continue
 row={'id':job['id'],'material':material.get_path_name(),'channels':[]}
 required=[unreal.MaterialProperty.MP_ROUGHNESS,unreal.MaterialProperty.MP_METALLIC]+([unreal.MaterialProperty.MP_NORMAL]if'normal'in job['maps']else[])
 if all(unreal.MaterialEditingLibrary.get_material_property_input_node(material,prop)for prop in required):
  row['status']='already connected';report.append(row);continue
 for kind,source in job['maps'].items():
  source=str((job_file.parent/source).resolve())if not Path(source).is_absolute()else source
  task=unreal.AssetImportTask();task.filename=source;task.destination_path=job['folder'];task.destination_name='T_Hero_'+kind.upper();task.automated=True;task.replace_existing=True;task.save=True
  unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
  texture=unreal.load_asset(job['folder']+'/'+task.destination_name)
  if not texture:raise RuntimeError('Texture import failed for '+job['id'])
  texture.set_editor_property('srgb',False)
  texture.set_editor_property('compression_settings',unreal.TextureCompressionSettings.TC_NORMALMAP if kind=='normal' else unreal.TextureCompressionSettings.TC_MASKS)
  if kind=='normal':texture.set_editor_property('flip_green_channel',True)
  texture.modify();unreal.EditorAssetLibrary.save_loaded_asset(texture)
  prop=unreal.MaterialProperty.MP_NORMAL if kind=='normal' else unreal.MaterialProperty.MP_ROUGHNESS
  sample=unreal.MaterialEditingLibrary.get_material_property_input_node(material,prop)
  if not isinstance(sample,unreal.MaterialExpressionTextureSample):sample=unreal.MaterialEditingLibrary.create_material_expression(material,unreal.MaterialExpressionTextureSample,-500,300 if kind=='normal' else 600)
  sample.set_editor_property('texture',texture)
  sample.set_editor_property('sampler_type',unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL if kind=='normal'else unreal.MaterialSamplerType.SAMPLERTYPE_MASKS)
  if kind=='normal':unreal.MaterialEditingLibrary.connect_material_property(sample,'RGB',unreal.MaterialProperty.MP_NORMAL)
  else:
   unreal.MaterialEditingLibrary.connect_material_property(sample,'G',unreal.MaterialProperty.MP_ROUGHNESS)
   unreal.MaterialEditingLibrary.connect_material_property(sample,'B',unreal.MaterialProperty.MP_METALLIC)
  row['channels'].append(kind)
 unreal.MaterialEditingLibrary.recompile_material(material);unreal.EditorAssetLibrary.save_loaded_asset(material)
 row['status']='restored';report.append(row)
Path(os.environ['ABBIES_HERO_MATERIAL_REPORT']).write_text(json.dumps(report,indent=2));unreal.log('HERO_PBR_RESTORED '+str(len(report)))
