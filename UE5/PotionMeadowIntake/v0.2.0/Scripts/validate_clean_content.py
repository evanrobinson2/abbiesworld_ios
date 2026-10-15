import json
from pathlib import Path
import unreal as u
root=Path(__file__).resolve().parents[1]/'Evidence'
registry=u.AssetRegistryHelpers.get_asset_registry()
registry.scan_paths_synchronous(['/Game/PotionMeadow'],force_rescan=True)
assets=registry.get_assets_by_path('/Game/PotionMeadow',recursive=True)
options=u.AssetRegistryDependencyOptions(include_soft_package_references=True,include_hard_package_references=True)
external=set();packages=[]
for data in assets:
    package=str(data.package_name)
    dependencies=[str(x) for x in registry.get_dependencies(data.package_name,options)]
    for dep in dependencies:
        if dep.startswith('/Game/') and not dep.startswith('/Game/PotionMeadow/'):
            external.add(dep)
    packages.append({'package':package,'class':str(data.asset_class_path),'dependencies':dependencies})
assert not external, sorted(external)
for name in ('Step','Pop','Drink','Brew','Hit','Level','Win','Rest'):
    sound=u.load_asset('/Game/PotionMeadow/Audio/S_PM_'+name)
    assert sound and sound.get_editor_property('duration')>0,name
sub=u.get_editor_subsystem(u.LevelEditorSubsystem)
assert sub.load_level('/Game/PotionMeadow/Maps/L_PM_CliffMeadow')
world=u.get_editor_subsystem(u.UnrealEditorSubsystem).get_editor_world()
assert str(world.get_world_settings().get_editor_property('default_game_mode').get_path_name())=='/Script/AbbiesWorld.AWPotionMode'
report={'passed':True,'engine':'5.4.4','original_content_root':'/Game/PotionMeadow','asset_count':len(packages),'external_game_packages':sorted(external),'allowed_external_roots':['/Engine','/Script'],'audio_count_with_positive_duration':8,'map_reloaded':True,'game_mode':'/Script/AbbiesWorld.AWPotionMode','packages':packages}
(root/'clean-content-validation.json').write_text(json.dumps(report,indent=2))
u.log('PM_CLEAN_CONTENT_PASS')
