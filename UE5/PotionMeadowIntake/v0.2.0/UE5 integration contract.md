# Potion Meadow integration contract

Preserve `/Game/PotionMeadow` on initial intake. The native level `/Game/PotionMeadow/Maps/L_PM_CliffMeadow` names `/Script/AbbiesWorld.AWPotionMode` as its game mode. Merge these owned source files into the canonical **AbbiesWorld** runtime module; do not register a second module with the same name. If the canonical module is named differently, the coordinator must migrate class references in Unreal and revalidate the level before release.

The isolated staging project uses `PotionMeadow` build targets and an `AbbiesWorld` module to preserve those existing references. Its `Config` files make the mini-game the startup destination for standalone testing; **do not replace the parent world's Config or startup map with these files**. The standalone targets and module bootstrap are demonstration scaffolding. The owned gameplay files are `AWPotionMode.h/.cpp`, `PMRules.h`, `PMAdventureModel.h`, and `SPMAdventure.h`.

Recommended canonical project: coordinator-selected Abbie's World UE5 project, proposed `Unreal/AbbiesWorld/AbbiesWorld.uproject`. Recommended content path: retain `/Game/PotionMeadow`. Recommended source: `Source/AbbiesWorld/`. Module dependencies: Core, CoreUObject, Engine, InputCore, Slate, SlateCore, RenderCore, RHI. Runtime needs no external connector, household credentials, Python, third-party plugin or media library. Python and EditorScriptingUtilities are needed only for the included import/inspection scripts.

The parent cliff-region portal can call `UGameplayStatics::OpenLevel` with `/Game/PotionMeadow/Maps/L_PM_CliffMeadow`. Add that map and `/Game/PotionMeadow` to the parent cook list after coordinator review. Do not change the global parent game mode.

`AAWPotionMode.ReturnLevel` is an editable class-default `FName`. A derived Blueprint game mode may set it to the parent cliff-region map, then be assigned as the mini-game level's game-mode override. Alternatively, local standalone launches can pass `-PMReturnMap=/Game/Parent/YourActualMap`. No parent map is guessed. If neither is configured, Back/exit closes the standalone game.

`OnPotionMeadowRunFinished(bool bWon, int32 Difficulty, int32 Seed, int32 Challenges)` is a Blueprint event for host quest/reward integration. Difficulty is 0 Easy, 1 Medium, 2 Hard. It fires once on the authoritative terminal result; automated QA suppresses it. Do not award the parent quest from particle or animation completion. `EndPlay` removes the Slate board from the viewport before the mode is released.

The game owns its fullscreen Slate viewport while its map is active. It uses abstract 16 × 10 grid cells and a 1280 × 960 reference canvas, with centered aspect-preserving scaling. The painted surface is fixed-camera 2D; gameplay is not implemented by moving actors on the optional 100 cm world-grid preview. World composition, Overland camera/tilt-shift, papercraft and Halloween Candyland variant approval are outside this snapshot and remain coordinator/artist decisions.

Local state uses `GameUserSettings.ini`: `PotionMeadow` Sound and Wins0/1/2, and the existing `AbbiesWorld` Motion preference. It saves no household world state and does not persist an unfinished run. Seeded retry is reproducible within this engine/runtime version. Parent input/controller ownership should be retested at the portal boundary.

All included family, goons, ground and board artwork were originally generated for this request. Eight audio cues were synthesized from original sine-wave note recipes. No Desktop Dungeons, Peglin, Overcooked, The Alters, bunker, private study extracts, opener movies or extracted commercial assets belong in this handoff. The clean snapshot is separate from the older mutable local launcher staging project.

Native Windows validation does not establish iOS, touch-device, Metal, Android, multiplayer or final shared-world integration. Human visual approval and the joint 3D Artist/Overland style review remain outstanding; no automatic release or public push is performed here.
