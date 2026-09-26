#!/usr/bin/env python3
"""Deterministic source-level contract checks for the World 2 vertical slice."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "abbies.world.ios" / "abbies.world.ios"


def read(relative: str) -> str:
    return (APP / relative).read_text(encoding="utf-8")


def require(condition: bool, invariant: str, evidence: str) -> dict[str, str]:
    if not condition:
        raise AssertionError(f"{invariant}: {evidence}")
    return {"invariant": invariant, "status": "pass", "evidence": evidence}


def registry_plan_covers_integrated_assets() -> bool:
    script_dir = ROOT / "scripts" / "world2_assets"
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    import publish_registry

    records = publish_registry.build_records(ROOT)
    keys = [record["key"] for record in records]
    return (
        len(keys) == len(set(keys))
        and "pois/poi-factory/exterior" in keys
        and "pois/poi-factory/interior" in keys
    )


def function_body(source: str, signature: str) -> str:
    start = source.index(signature)
    open_brace = source.index("{", start)
    depth = 0
    for index in range(open_brace, len(source)):
        if source[index] == "{":
            depth += 1
        elif source[index] == "}":
            depth -= 1
            if depth == 0:
                return source[open_brace + 1 : index]
    raise AssertionError(f"Unterminated function: {signature}")


def run_marble_voyage_design_rules() -> dict[str, str]:
    """Asset/source design gates for Marble Voyage / Plink (no Xcode rebuild)."""
    import subprocess

    voyage_script = ROOT / "scripts" / "check_voyage_design_rules.py"
    if not voyage_script.is_file():
        raise AssertionError("marble-voyage-design-rules: check_voyage_design_rules.py missing")
    voyage = subprocess.run(
        [sys.executable, str(voyage_script)],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    if voyage.returncode != 0:
        detail = (voyage.stdout or voyage.stderr or "voyage design rules failed").strip()
        raise AssertionError(f"marble-voyage-design-rules: {detail}")
    return {
        "invariant": "marble-voyage-design-rules",
        "status": "pass",
        "evidence": "preflight design gates (plates, alpha, feed, climb, VS) green",
    }


def main() -> int:
    # Voyage gates first so major-build preflight is always exercised even if
    # older slice file paths drift.
    checks: list[dict[str, str]] = [run_marble_voyage_design_rules()]

    root_view = read("Views/World2/World2RootView.swift")
    map_view = read("Views/World2/WorldMapView.swift")
    home_view = read("Views/World2/PlayerHomeView.swift")
    factory_view = read("Views/World2/CardFactoryView.swift")
    furniture_store = read("Views/World2/FurnitureStoreView.swift")
    furniture_models = read("Models/World2/FurnitureModels.swift")
    place_models = read("Models/World2/PlaceFabricationModels.swift")
    workbench_models = read("Models/World2/AssetWorkbenchModels.swift")
    player_models = read("Models/World2/PlayerModels.swift")
    player_service = read("Services/World2/PlayerStateService.swift")
    falling_targets = read("Views/World2/FallingTargetMinigameView.swift")
    view_model = read("ViewModels/World2ViewModel.swift")
    assets = read("Services/World2/AssetBootstrapService.swift")
    registry = read("Services/World2/GameAssetRegistry.swift")
    workbench_service = read("Services/World2/AssetWorkbenchService.swift")
    layout_store = read("Services/World2/World2POILayoutStore.swift")
    music_service = read("Services/MusicService.swift")
    music_player = read("Views/Components/MusicPlayerView.swift")
    world2_settings = read("Views/World2/World2SettingsView.swift")
    place_factory_views = read("Views/World2/World2PlaceFactoryViews.swift")
    workbench_view = read("Views/World2/AssetWorkbenchView.swift")
    mutable_scene_view = read("Views/World2/World2MutableSceneView.swift")
    app = read("abbies_world_iosApp.swift")
    registry_publisher = (
        ROOT / "scripts" / "world2_assets" / "publish_registry.py"
    ).read_text(encoding="utf-8")
    info_plist = (ROOT / "abbies.world.ios" / "Info.plist").read_text(encoding="utf-8")
    splash_song = APP / "Resources" / "Music" / "World2" / "magical_discovery.m4a"
    intro_video = APP / "Resources" / "World2" / "world2_intro.mp4"
    vowel_config = json.loads(
        read("Resources/World2/save_the_vowels.json")
    )
    runtime_images = json.loads(
        read(
            "Assets.xcassets/world2_runtime_manifest.dataset/"
            "world2_runtime_manifest.json"
        )
    )["assets"]
    expected_music_files = {
        "bright_new_day.m4a",
        "cliffside_morning.m4a",
        "family_adventure.m4a",
        "joyful_bounce.m4a",
        "well_make_a_way.m4a",
        "working_song.m4a",
    }
    bundled_music_files = {
        path.name
        for path in (APP / "Resources" / "Music" / "World2").glob("*.m4a")
        if path.stat().st_size > 0
    }

    slice_loader = function_body(view_model, "private func loadTruthfulSliceContent()")
    start_game = function_body(view_model, "func startGame() async")
    continue_intro = function_body(view_model, "func continueFromIntro()")
    home_loader = slice_loader[
        slice_loader.index("let home = World(") : slice_loader.index("let work = World(")
    ]
    reject = function_body(factory_view, "func reject()")
    checks += [
        require(
            "World2RootView()" in app
            and "case .loading:" in root_view
            and 'accessibilityIdentifier("world2.loading")' in root_view,
            "loading-screen",
            "App root routes through an identified World 2 loading state.",
        ),
        require(
            "Task.sleep(for: .seconds(10))" in view_model
            and "TimelineView(.animation" in root_view
            and '"world2.loading.animatedTitle"' in root_view
            and "introStartedAt" in root_view
            and "/ 10.0" in root_view
            and "displayedProgress" in root_view
            and 'Text("\\(Int(displayedProgress * 100))%")' in root_view
            and "assetService.objectWillChange" in view_model
            and '"world2.loading.status"' in root_view
            and splash_song.exists()
            and intro_video.exists()
            and 'forResource: "magical_discovery"' in root_view
            and 'forResource: "world2_intro"' in root_view
            and "World2IntroVideo" in root_view
            and "AVPlayerLooper(" in root_view
            and "playerLooper?.disableLooping()" in root_view
            and "isBootstrapReady && introAudio.didFinish" in root_view
            and '"world2.loading.continue"' in root_view
            and "routeAfterBootstrap()" not in start_game
            and "isIntroBootstrapReady = true" in start_game
            and "guard currentScreen == .loading, isIntroBootstrapReady" in continue_intro
            and "routeAfterBootstrap()" in continue_intro
            and "introAudio.stop()" in root_view
            and ".onDisappear {" in root_view,
            "ten-second-video-intro",
            "Startup is a non-skippable ten-second video-and-music intro with continuously timed progress whose video loops until the enabled entry button is pressed.",
        ),
        require(
            ".statusBarHidden(true)" in root_view
            and "<key>UIStatusBarHidden</key>" in info_plist
            and "<key>UIViewControllerBasedStatusBarAppearance</key>" in info_plist
            and ".ignoresSafeArea()" in map_view,
            "full-screen-world",
            "The iOS status bar is disabled and the map fills the complete display.",
        ),
        require(
            "case .homeWorld:" in root_view
            and 'accessibilityIdentifier("world2.homeWorld")' in map_view
            and all(
                identifier in map_view
                for identifier in (
                    "world2.hud.gems",
                    "world2.hud.ingredients",
                    "world2.hud.deck",
                    "world2.hud.player",
                )
            ),
            "home-world-hud",
            "Home World exposes player, gems, ingredients, and deck HUD hooks.",
        ),
        require(
            '"world2.world.travelArrows"' in map_view
            and 'case .farm: return "arrow.right"' in map_view
            and 'case .work: return "arrow.down.left"' in map_view
            and 'case .farm: return .trailing' in map_view
            and 'case .work: return .bottomLeading' in map_view
            and "onTravel(destination)" in map_view
            and "adjacentWorlds: [.work, .farm, .blankSlate]" in view_model,
            "directional-world-travel",
            "Home World presents edge-positioned arrows toward Work Land, Farm Land, and the player-made Blank Slate.",
        ),
        require(
            'case blankSlate = "world.blankSlate"'
            in read("Models/World2/WorldModels.swift")
            and 'case selfReplicatingFactory = "place.selfReplicatingFactory"'
            in place_models
            and 'interactionTemplateID: "self_replicating_place_factory/v1"'
            in place_models
            and 'exteriorAsset: "poi.selfReplicatingFactory.exterior"'
            in place_models
            and 'interiorAsset: "poi.selfReplicatingFactory.interior"'
            in place_models
            and any(
                asset["semanticId"] == "poi.selfReplicatingFactory.exterior"
                and asset["assetId"] == "2010"
                for asset in runtime_images
            )
            and any(
                asset["semanticId"] == "poi.selfReplicatingFactory.interior"
                and asset["assetId"] == "2011"
                for asset in runtime_images
            )
            and "var placeInventory: [World2PlaceInventoryItem]?" in player_models
            and "var placedPlaces: [World2PlacedPlaceInstance]?" in player_models
            and "World2PlaceInventoryItem.starterFactory(for: id)" in player_models
            and "func placeInventoryItem(" in player_service
            and "inventory.remove(at: itemIndex)" in player_service
            and "placed.append(instance)" in player_service
            and "func fabricatePlaceCopy(" in player_service
            and "inventory.append(item)" in player_service
            and "case .blankSlate:" in root_view
            and "case .selfReplicatingFactory(let instanceID):" in root_view
            and 'accessibilityIdentifier("world2.mutableScene")' in mutable_scene_view
            and 'accessibilityIdentifier("world2.placeInventory.item.'
            in mutable_scene_view
            and "World2BlankSlateView" not in place_factory_views
            and 'accessibilityIdentifier("world2.poiFactory.fabricate")'
            in place_factory_views
            and ".selfReplicatingFactory" in place_factory_views
            and ".interiorAsset" in place_factory_views
            and "viewModel.fabricateFactoryCopy(from: instanceID)"
            in place_factory_views,
            "recursive-place-factory",
            "Each player owns persistent place inventory, can consume an item to place an enterable factory on Blank Slate, and can fabricate another placeable copy inside it.",
        ),
        require(
            "struct World2SceneHardpoint: Codable" in place_models
            and "struct World2MutableScene: Codable" in place_models
            and "struct World2SceneExit: Codable" in place_models
            and "let hardpointID: String?" in place_models
            and "var createdScenes: [World2MutableScene]?" in player_models
            and "var sceneExits: [World2SceneExit]?" in player_models
            and "func availableHardpoints(in sceneID: String)"
            in player_service
            and "if scene.hardpoints.isEmpty" in player_service
            and "availableHardpoints(in: sceneID).first" in player_service
            and "func birthPlaceholderScene(" in player_service
            and "exits(from: sceneID).isEmpty" in player_service
            and "World2MutableSceneView(viewModel: viewModel)" in root_view
            and 'accessibilityIdentifier("world2.mutableScene.drawerButton")'
            in mutable_scene_view
            and 'accessibilityIdentifier("world2.mutableScene.hardpoint.'
            in mutable_scene_view
            and 'accessibilityIdentifier("world2.developer.birthPlaceholder")'
            in mutable_scene_view
            and 'accessibilityIdentifier("world2.developer.placeholder.birth")'
            in mutable_scene_view
            and "viewModel.currentMutableScene.hardpoints.isEmpty"
            in mutable_scene_view
            and "func traverseSceneExit(" in view_model
            and "func returnFromMutableScene()" in view_model,
            "mutable-scene-authoring",
            "Mutable scenes expose a place-inventory drawer, enforce hardpoints when authored, permit free placement without them, and let developer mode birth persistent metadata-only scene exits.",
        ),
        require(
            home_loader.count("POIPlacement(") == 3
            and all(
                poi in home_loader
                for poi in (
                    '"poi.abbieTreehouse"',
                    '"poi.aniTreehouse"',
                    '"poi.cardFactory"',
                )
            ),
            "exactly-three-pois",
            "The Home World model declares exactly the three agreed placements.",
        ),
        require(
            all(
                affordance in map_view
                for affordance in (
                    "repeatForever(autoreverses: true)",
                    '"hand.tap.fill"',
                    '"world2.poi.drawer"',
                    '"world2.poi.preview.start"',
                    '"Decorate My Space"',
                    '"Create a Card"',
                )
            ),
            "animated-poi-pregame-drawer",
            "Every POI advertises tap affordance and opens a second-tap-or-button pregame drawer.",
        ),
        require(
            all(
                hook in map_view
                for hook in (
                    "MagnificationGesture()",
                    "RotationGesture()",
                    "DragGesture()",
                    '"world2.developer.layoutEditor"',
                    '"world2.developer.layoutValues"',
                    '"world2.developer.save"',
                    '"world2.developer.export"',
                )
            )
            and all(
                contract in layout_store
                for contract in (
                    "UserDefaults",
                    "func save()",
                    "scheduleSave()",
                    "func exportJSON()",
                    "WORLD2_LAYOUT_SAVED",
                )
            ),
            "developer-layout-mode",
            "Developer mode supports direct move/scale/rotation, local persistence, and deterministic JSON export.",
        ),
        require(
            '"world2.hud.gameStatus"' in map_view
            and 'Image(systemName: "music.note")' in root_view
            and ".padding(.trailing, 132)" in map_view,
            "non-overlapping-game-hud",
            "Game status is consolidated into a dedicated HUD with reserved space for eighth-note music and settings controls.",
        ),
        require(
            '"world2.hud.settings"' in root_view
            and all(
                hook in world2_settings
                for hook in (
                    "World2DeveloperSettingsSection",
                    "World2AgeGateView",
                    '"world2.settings.ageGate.open"',
                    '"world2.settings.ageGate.challenge"',
                    '"world2.settings.ageGate.unlock"',
                    '"world2.settings.developerMode"',
                )
            )
            and ".onTapGesture(count: 7)" not in map_view
            and "-world2DeveloperMode" not in map_view
            and "-world2DeveloperMode" not in layout_store,
            "settings-age-gate",
            "Developer mode is reachable through Settings only after the grown-up gate.",
        ),
        require(
            "MusicPlayerView" in root_view
            and 'accessibilityIdentifier("world2.hud.music")' in root_view,
            "legacy-music-player",
            "The global HUD opens the established MusicPlayerView.",
        ),
        require(
            bundled_music_files
            == expected_music_files.union({"magical_discovery.m4a"})
            and all(
                track_id in music_service
                for track_id in (
                    '"bright_new_day"',
                    '"cliffside_morning"',
                    '"family_adventure"',
                    '"joyful_bounce"',
                    '"well_make_a_way"',
                    '"working_song"',
                )
            )
            and "assetsService.getAssets" not in music_service
            and "loadHalloweenPlaylist" not in music_service
            and '"magical_discovery"' not in music_service,
            "exclusive-bundled-music",
            "The player playlist is sourced exclusively from the six bundled World 2 M4A tracks.",
        ),
        require(
            'MusicService.shared.playSong(id: "world2_joyful_bounce")'
            in continue_intro
            and "func playSong(id: String)" in music_service
            and '"world_entry_music_started"' in continue_intro,
            "joyful-world-entry-music",
            "Joyful Bounce starts immediately when the player leaves the gated intro and enters Abbie's World.",
        ),
        require(
            "case .cardFactory:" in view_model
            and 'setScreen(.cardFactory, reason: "poi_entered")' in view_model
            and all(
                hook in factory_view
                for hook in (
                    "world2.factory.carousel.",
                    "world2.factory.create",
                    "world2.factory.keep",
                    "world2.factory.reject",
                )
            )
            and "addCardToCollection" not in reject
            and '"persisted": "false"' in reject
            and ".frame(width: screen.size.width, height: screen.size.height)" in factory_view
            and ".clipped()" in factory_view,
            "factory-creative-round",
            "Factory is screen-bounded, exposes deterministic choose/create/Keep/Reject hooks, and Reject does not save.",
        ),
        require(
            "private(set) var ingredientCatalog: IngredientCatalog = .factoryCatalog"
            in view_model
            and "AnimalAvenueCatalog.animals" in read("Models/World2/IngredientModels.swift")
            and "AnimalAvenueCatalog.outfits" in read("Models/World2/IngredientModels.swift")
            and "AnimalAvenueCatalog.places" in read("Models/World2/IngredientModels.swift")
            and "Carousel(" in factory_view
            and "MediaPackImageLoader.image" in factory_view
            and '"world2.factory.carousel.\\(category.rawValue)"' in factory_view
            and '"world2.factory.historyDrawer"' in factory_view
            and '"world2.factory.historyHandle"' in factory_view
            and "savedCards" in factory_view,
            "factory-real-carousel-history",
            "Card Factory reuses bundled illustrated ingredients, carousel interaction, and a persistent creation-history drawer.",
        ),
        require(
            "case .treehouse(let poiId):" in root_view
            and "case .home:" in view_model
            and ".treehouse(poiId: poi.id)" in view_model
            and 'accessibilityIdentifier("world2.interior.\\(poiId)")' in home_view
            and '"poi.abbieTreehouse"' in slice_loader
            and '"poi.aniTreehouse"' in slice_loader,
            "distinct-treehouse-interiors",
            "Both owner-tagged POIs route by POI ID into the interior screen.",
        ),
        require(
            all(
                identifier in home_view
                for identifier in (
                    '"world2.interior.title"',
                    '"world2.interior.settings"',
                    '"world2.interior.music"',
                )
            )
            and "onOpenSettings" in home_view
            and "onOpenMusic" in home_view
            and "case .loading, .playerSelect, .treehouse, .cardFactory,"
            in root_view,
            "treehouse-centered-chrome",
            "Treehouse title is independently centered and its local settings and music controls own their tap actions.",
        ),
        require(
            "GeometryReader { room in" in home_view
            and ".frame(width: room.size.width, height: room.size.height)" in home_view
            and ".fixedSize(horizontal: false, vertical: true)" in world2_settings
            and "? screen.size.width - drawerWidth - 34" in factory_view
            and 'Label("SWIPE", systemImage: "arrow.left.and.right")' in factory_view
            and 'semanticName: "title.background"' in root_view
            and 'Image("world2_2004_ui_appIcon")' in music_player
            and 'Label("SWIPE TO BROWSE", systemImage: "arrow.left.and.right")'
            in furniture_store,
            "preplaytest-responsive-polish",
            "Treehouse chrome, Factory and Store browsing, the age gate, player selection, and music artwork retain explicit responsive visual contracts.",
        ),
        require(
            ".overlay(alignment: .bottomLeading)" in falling_targets
            and '.accessibilityIdentifier("world2.fallingTargets.exit")' in falling_targets
            and "alignment: .bottomLeading" in factory_view
            and '.accessibilityIdentifier("world2.factory.back")' in factory_view
            and "alignment: .bottomLeading" in furniture_store
            and '.accessibilityIdentifier("world2.furnitureStore.back")' in furniture_store,
            "minigame-bottom-left-exit",
            "Every current minigame exposes its back action at the bottom-left edge.",
        ),
        require(
            "bundledImageAliases" not in assets
            and "qualifiedImageNames[semanticName]" in assets
            and "world2_runtime_manifest" in assets,
            "qualified-assets-only",
            "World 2 image lookup is fail-closed through the generated runtime manifest.",
        ),
        require(
            'world2GameKey = "abbies-world-2"' in registry
            and '["api", "v1", "asset-schema"]' in registry
            and '["api", "v1", "games", gameKey, "assets"]' in registry
            and "case bundled(name: String)" in registry
            and "record.source.type != .external && isSameOrigin" in registry
            and "GameAssetRegistryError.insecureExternalURL" in registry
            and "GameAssetRegistryError.hashMismatch" in registry
            and "asset_registry_unavailable" in assets
            and '["fallback": "bundled"]' in assets
            and "conventionalKey" in assets
            and "asset_registry_remote_accepted" in assets
            and "descriptor.derivativeSha256" not in assets
            and "/api/world2/manifest" not in assets
            and 'DEFAULT_GAME_KEY = "abbies-world-2"' in registry_publisher
            and 'os.environ.get("ASSET_REGISTRY_ADMIN_API_KEY")'
            in registry_publisher
            and '"expectedRevision": expected_revision' in registry_publisher
            and '"type": "bundled"' in registry_publisher
            and registry_plan_covers_integrated_assets(),
            "game-asset-registry-v1",
            "World 2 uses the v1 readiness gate, semantic keys, authenticated same-origin delivery, hash validation, bundled fallback, and an admin-only optimistic-concurrency publisher.",
        ),
        require(
            'case work = "world.work"' in read("Models/World2/WorldModels.swift")
            and '"poi.letterWorks"' in slice_loader
            and 'backgroundAsset: "map.workLand"' in slice_loader
            and "case .fallingTargets" in root_view
            and "switchWorld(to: .work)" in view_model,
            "work-land-letter-works",
            "Work Land is a separate biome whose Letter Works POI routes into its minigame.",
        ),
        require(
            'case farm = "world.farm"' in read("Models/World2/WorldModels.swift")
            and 'name: "Farm Land"' in slice_loader
            and '"poi.furnitureStore"' in slice_loader
            and 'minigameType: "furniture_store"' in slice_loader
            and "setScreen(.furnitureStore" in view_model
            and "if poi.type == .minigame { return .cyan }" in map_view
            and "repeatForever(autoreverses: true)" in map_view
            and 'backgroundAsset: "map.farm"' in slice_loader
            and "World2FarmLandBackdrop" not in map_view
            and "World2SemanticImage(" in map_view
            and 'x: 0.52' in slice_loader
            and 'y: 0.38' in slice_loader
            and 'scale: 1.35' in slice_loader,
            "farm-land-furniture-store-poi",
            "Farm Land uses the qualified woodland path map and places its cyan-glowing, tweening Furniture Store over the central junction.",
        ),
        require(
            "static let ingredientCost = 3" in furniture_models
            and "struct FurnitureMathChallenge" in furniture_models
            and "static let ageSixBank" in furniture_models
            and 'NSDataAsset(name: "cozy_room_asset_manifest")' in furniture_models
            and "manifest.assetCount == manifest.assets.count" in furniture_models
            and "placeableCategoryIDs.contains($0.category)" in furniture_models
            and "placeableAssets.count == 66" in furniture_models
            and "asset.assetCatalogName" in furniture_models
            and '"All \\(FurnitureItem.storeCatalog.count)"' in furniture_store
            and '"world2.furnitureStore.categories"' in furniture_store
            and '"poi.furnitureStore.interior"' in furniture_store
            and all(
                identifier in furniture_store
                for identifier in (
                    '"world2.furnitureStore.ingredients"',
                    '"world2.furnitureStore.catalog"',
                    '"world2.furnitureStore.workshop"',
                    '"world2.furnitureStore.math.question"',
                    '"world2.furnitureStore.math.answer.\\(choice)"',
                    '"world2.furnitureStore.math.feedback"',
                    '"world2.furnitureStore.ingredientMeter"',
                    '"world2.furnitureStore.craft"',
                    '"world2.furnitureStore.craftComplete"',
                )
            )
            and "playerState.earnFurnitureIngredient()" in furniture_store
            and "playerState.craftFurniture(selectedFurniture)" in furniture_store
            and "struct FurnitureIngredientTile" in furniture_store
            and "RoundedRectangle(cornerRadius: size * 0.22)" in furniture_store
            and 'systemImage: "circle.hexagongrid.fill"' not in furniture_store
            and '"Any 3 ingredients can make any 1 piece."' in furniture_store,
            "furniture-earn-and-craft-loop",
            "The store presents age-six addition/subtraction tasks, awards one fungible ingredient per solution, and makes any categorized prop for exactly three ingredients.",
        ),
        require(
            "var furnitureInventory: [DecorationInstance]" in furniture_models
            and "var unplacedFurnitureInventory: [DecorationInstance]" in furniture_models
            and "var furnitureIngredients: Int?" in player_models
            and "func earnFurnitureIngredient()" in player_service
            and "func craftFurniture(_ item: FurnitureItem)" in player_service
            and "player.availableFurnitureIngredientCount >= FurnitureItem.ingredientCost"
            in player_service
            and "saveLocalState()" in function_body(
                player_service, "func craftFurniture(_ item: FurnitureItem)"
            )
            and '"player": viewModel.currentPlayerId?.rawValue' in furniture_store,
            "per-player-furniture-inventory",
            "Earned ingredients and crafted furniture persist independently for the selected player.",
        ),
        require(
            'id: "furniture.abbieStarterBed"' in furniture_models
            and 'assetName: "world2_2008_furniture_abbieStarterBed"' in furniture_models
            and "[abbieStarterBed, aniStarterBed] + loadBundledCatalog()"
            in furniture_models
            and 'id: "furniture.aniStarterBed"' in furniture_models
            and 'assetName: "world2_2009_furniture_aniStarterBed"' in furniture_models
            and "struct FurnitureStarterPack" in furniture_models
            and "static func pack(for owner: PlayerId)" in furniture_models
            and furniture_models.count("itemIDs = [") == 2
            and "assert(items.count == 5" in furniture_models
            and "func claimTreehouseStarterPack(for owner: PlayerId)"
            in player_service
            and "player.playerId == owner" in player_service
            and "achievedMilestones.contains(pack.milestoneID)" in player_service
            and "player.decorations.append(" in player_service
            and "claimTreehouseStarterPack(for: owner)" in home_view
            and "if !isReadOnly" in home_view
            and "starterPackCelebration" in home_view
            and "ForEach(0..<22" in home_view
            and ".symbolEffect(.bounce" in home_view
            and '"world2.interior.starterPack.celebration"' in home_view
            and '"world2.interior.starterPack.openInventory"' in home_view,
            "alias-treehouse-starter-packs",
            "The owner receives one deduplicated five-item alias-specific pack on first treehouse entry, with each custom bed and an animated inventory reveal.",
        ),
        require(
            all(
                contract in home_view
                for contract in (
                    "World2PlacedFurnitureView",
                    "DragGesture()",
                    "MagnificationGesture()",
                    "RotationGesture()",
                    "World2FurnitureDecoratorDrawer",
                    "World2AnimatedSelectionLasso",
                    ".dropDestination(for: String.self)",
                    ".draggable(instance.id)",
                    '"world2.interior.arrangeFurniture"',
                    '"world2.interior.decorator.drawer"',
                    '"world2.interior.furniture.remove.',
                    "returnFurnitureToInventory",
                )
            )
            and "arrangementToolbar" not in home_view
            and "func updateFurnitureTransform(" in player_service
            and "func placeFurniture(" in player_service
            and "x requestedX: Double? = nil" in player_service
            and "if isReadOnly" in home_view
            and ".zIndex(10_000)" in home_view
            and ".zIndex(20_000)" in home_view
            and ".zIndex(min(Double(instance.zIndex), 1_000))" in home_view
            and ".allowsHitTesting(isArranging)" in home_view,
            "owner-treehouse-freeform-furniture",
            "An owner decorates by dragging from a right-side drawer, directly moving, pinching, rotating, or removing pieces; furniture cannot cover or capture the normal treehouse UI, only the selected piece has an animated lasso, and visitor mode remains read-only.",
        ),
        require(
            vowel_config["gameType"] == "fallingTargets"
            and vowel_config["durationSeconds"] == 10
            and vowel_config["targets"]["set"] == ["A", "E", "I", "O", "U"]
            and all(
                key in vowel_config["spawn"]
                for key in (
                    "easyFallSpeed",
                    "hardFallSpeed",
                    "easyMaximumVisible",
                    "hardMaximumVisible",
                    "easyTargetFrequency",
                    "hardTargetFrequency",
                    "easyLetterSize",
                    "hardLetterSize",
                    "lowercaseStartsAtDifficulty",
                )
            )
            and "FallingTargetGameConfig" in falling_targets
            and '"world2.fallingTargets.difficulty"' in falling_targets,
            "declarative-falling-target-engine",
            "Save the Vowels is configuration for a reusable falling-target primitive.",
        ),
        require(
            "ProcessInfo.processInfo.systemUptime" in falling_targets
            and '"world2.fallingTargets.timer"' in falling_targets
            and '"world2.fallingTargets.score"' in falling_targets
            and '"world2.fallingTargets.result"' in falling_targets
            and "bestScoreKey" in falling_targets
            and "gamesPlayedKey" in falling_targets
            and "onRoundCompleted(score, config.reward.amount)" in falling_targets,
            "save-vowels-round-contract",
            "The round uses a monotonic timer, feedback hooks, persistence, replay, and participation reward.",
        ),
        require(
            "👧" not in root_view and "👦" not in root_view,
            "neutral-player-motifs",
            "Player selection uses neutral symbols rather than invented child likenesses.",
        ),
        require(
            'assetClass = "treehouse.generatedDecoration/v1"' in workbench_models
            and "candidateCount = 6" in workbench_models
            and "selectionCount = 3" in workbench_models
            and "finish.pearlescent" in workbench_models
            and "object.furniture" in workbench_models
            and "personality.fancy" in workbench_models
            and "validateForPlayerPresentation()" in workbench_models
            and "qualificationState == .qualified" in workbench_models
            and "selectedCandidateIDs.count == World2AssetWorkbenchContract.selectionCount"
            in workbench_models
            and "protocol World2AssetWorkbenchServing" in workbench_service
            and '"asset-workbench"' in workbench_service
            and "registry.revision(" in workbench_service
            and "World2AssetWorkbenchPreviewService" in workbench_service
            and '"world2.assetWorkbench.carousel.' in workbench_view
            and '"world2.assetWorkbench.candidate.' in workbench_view
            and '"world2.assetWorkbench.confirm"' in workbench_view
            and any(
                asset["semanticId"] == "poi.assetWorkbench.exterior"
                and asset["assetId"] == "2012"
                for asset in runtime_images
            )
            and any(
                asset["semanticId"] == "poi.assetWorkbench.interior"
                and asset["assetId"] == "2013"
                for asset in runtime_images
            )
            and "case .assetWorkbench:" in view_model
            and "case .assetWorkbench:" in root_view
            and '"poi.assetWorkbench"' in slice_loader
            and 'minigameType: "asset_workbench"' in slice_loader
            and "func awardWorkbenchDecorations(" in player_service
            and "func awardWorkbenchPack(" in view_model
            and "World2GeneratedDecorationArtwork" in home_view
            and '"world2.assetWorkbench.award.inventory"' in workbench_view
            and 'accessibilityIdentifier("world2.hud.classicGames")' in root_view
            and "DinoPicnicView()" in root_view
            and "WaypointNavigationView(" in root_view
            and "GoonPopperView(" in root_view
            and "PictureCarverView(" in root_view,
            "standalone-asset-workbench",
            "The Asset Workbench defines three idea carousels, six qualified immutable candidates, an exact choose-three award, pinned registry loading, a mockable generation service, qualified artwork, and a live World 2 route. Classic games remain reachable from World 2.",
        ),
    ]

    print(json.dumps({"schemaVersion": 1, "checks": checks}, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, OSError, ValueError) as error:
        print(
            json.dumps(
                {"schemaVersion": 1, "status": "fail", "error": str(error)},
                indent=2,
            ),
            file=sys.stderr,
        )
        raise SystemExit(1)
