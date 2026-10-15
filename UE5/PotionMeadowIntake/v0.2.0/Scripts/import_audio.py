from pathlib import Path
import unreal as u
for source in (Path(__file__).resolve().parents[1]/'OriginalAudio').glob('*.wav'):
    task=u.AssetImportTask();task.filename=str(source);task.destination_path='/Game/PotionMeadow/Audio';task.destination_name=source.stem;task.automated=True;task.save=True;task.replace_existing=False
    u.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    assert u.load_asset('/Game/PotionMeadow/Audio/'+source.stem)
