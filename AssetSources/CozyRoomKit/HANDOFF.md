# Minigame integration handoff

The bundled `cozy_room_asset_manifest` contains two filterable roles:

- `placeable-room-prop`: 66 finished furniture and decoration assets using the
  `cozy_room_` catalog prefix.
- `furniture-store-ingredient`: 22 build materials using the
  `furniture_ingredient_` catalog prefix.

Load the manifest with `NSDataAsset(name: "cozy_room_asset_manifest")`, decode its
`assets` array, and filter by `role`, `category`, or `tags`. Render any selected item
with `Image(asset.assetCatalogName)`. Furniture-store minigames should award or spend
the ingredient role; completed recipes should unlock a placeable room prop.

The source labels, descriptions, hashes, and extraction bounds are preserved in
`AssetSources/CozyRoomKit/manifest.json`.
