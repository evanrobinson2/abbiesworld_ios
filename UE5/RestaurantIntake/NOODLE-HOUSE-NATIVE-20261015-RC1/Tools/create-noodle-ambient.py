import unreal
src='/Engine/EngineResources/GrayLightTextureCube';dst='/Game/AbbiesRestaurant/T_AmbientCube';assert unreal.load_asset(src)
if not unreal.load_asset(dst):assert unreal.EditorAssetLibrary.duplicate_asset(src,dst)
unreal.EditorAssetLibrary.save_asset(dst);unreal.log('NEUTRAL_AMBIENT_CUBE_READY')
