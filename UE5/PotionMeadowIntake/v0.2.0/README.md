# Potion Meadow v0.2.0 — frozen clean UE5 handoff

Original-only source/native content for coordinator intake. Open `Project/PotionMeadow.uproject` with UE 5.4.4, build the PotionMeadowEditor target, and open `/Game/PotionMeadow/Maps/L_PM_CliffMeadow`. This standalone scaffolding uses the AbbiesWorld module to preserve native class references. Read `UE5 integration contract.md` before merging into the parent project.

Do not replace parent startup maps/configs/targets with standalone scaffolding. Preserve `/Game/PotionMeadow` and `/Script/AbbiesWorld.AWPotionMode` until an editor migration has been reviewed and validated. Configure the parent return map and quest event. Public publication and style approval remain with the coordinator.

`SourceArt` and `OriginalAudio` are the original authored sources; native `.uasset`/`.umap` content is under `Project/Content/PotionMeadow`. No extracted commercial game assets, caches, compiled output, household data or credentials are included. The Windows build is intentionally a separate local deliverable, not part of this source snapshot.

`Evidence` contains dependency checks, seeded-board validation, representative native packaged playthroughs and renders. iOS/Metal, touch-device delivery, parent portal transitions and shared-world style/tilt-shift are not validated here.
