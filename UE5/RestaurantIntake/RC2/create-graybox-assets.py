# Unreal Editor Python. Engine-provided primitives only; no extracted media.
import unreal
roles={"Floor":"Cube","Counter":"Cube","Chef":"Sphere","Fish":"Sphere","FishChopped":"Cube","Cucumber":"Cylinder","CucumberChopped":"Cube","Rice":"Sphere","RiceCooked":"Sphere","Plate":"Cylinder","Board":"Cube","Pot":"Cylinder","Sink":"Cube","Crate":"Cube","Cooker":"Cube","Pass":"Cube","Bin":"Cube"}
for role,shape in roles.items():
 path="/Game/AbbiesRestaurant/SM_"+role
 if not unreal.EditorAssetLibrary.does_asset_exist(path):
  assert unreal.EditorAssetLibrary.duplicate_asset("/Engine/BasicShapes/"+shape,path)
  unreal.EditorAssetLibrary.save_asset(path)
