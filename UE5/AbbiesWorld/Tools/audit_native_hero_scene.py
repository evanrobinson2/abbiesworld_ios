import unreal,json,os
from pathlib import Path
unreal.EditorLoadingAndSavingUtils.load_map('/Game/AbbiesWorld/Overland/Maps/AmberVale_Papercraft')
rows=[]
for actor in unreal.get_editor_subsystem(unreal.EditorActorSubsystem).get_all_level_actors():
 name=actor.get_actor_label();tags=[str(x)for x in actor.tags]
 if 'Atmosphere'in tags or any(x in name.lower()for x in ['fog','mist','haze','bunker','cafe']):
  rows.append({'name':name,'class':actor.get_class().get_name(),'tags':tags,'components':[x.get_class().get_name()for x in actor.get_components_by_class(unreal.ActorComponent)]})
Path(os.environ['ABBIES_SCENE_AUDIT']).write_text(json.dumps(rows,indent=2))
