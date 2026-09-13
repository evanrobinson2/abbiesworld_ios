import Combine
import Foundation
import OSLog

enum World2Screen: Equatable {
    case loading
    case playerSelect
    case homeWorld
    case blankSlate
    case treehouse(poiId: String)
    case cardFactory
    case selfReplicatingFactory(instanceID: String)
    case furnitureStore
    case assetWorkbench
    case creatureLab
    case fallingTargets(configurationID: String)
}

struct POIInspection: Identifiable {
    let id: String
    let poi: POI
    let placement: POIPlacement
}

enum World2Diagnostics {
    private static let logger = Logger(
        subsystem: Bundle.main.bundleIdentifier ?? "abbies.world.ios",
        category: "World2"
    )

    static func log(_ event: String, _ fields: [String: String] = [:]) {
        let details = fields
            .sorted { $0.key < $1.key }
            .map { "\($0.key)=\($0.value)" }
            .joined(separator: " ")
        let message = details.isEmpty ? "event=\(event)" : "event=\(event) \(details)"
        logger.notice("\(message, privacy: .public)")
        print("[World2] \(message)")
    }
}

@MainActor
final class World2ViewModel: ObservableObject {
    private let assetService = AssetBootstrapService.shared
    private let playerService = PlayerStateService.shared
    private var cancellables = Set<AnyCancellable>()

    @Published private(set) var currentScreen: World2Screen = .loading
    @Published private(set) var currentWorld: World?
    @Published private(set) var currentMutableSceneID =
        World2PlacedPlaceInstance.blankSlateSceneID
    @Published private(set) var isIntroBootstrapReady = false
    @Published var inspectedPOI: POIInspection?
    @Published var showingPOISheet = false
    @Published var toastMessage: String?

    private(set) var worlds: [WorldId: World] = [:]
    private(set) var pois: [String: POI] = [:]
    private(set) var ingredientCatalog: IngredientCatalog = .factoryCatalog
    private var mutableSceneBackStack: [String] = []

    var bootstrapProgress: Double { assetService.overallProgress }
    var gems: Int { playerService.gems }
    var totalIngredients: Int { playerService.totalIngredients }
    var activeDeckCount: Int { playerService.activeDeckCount }
    var currentPlayerId: PlayerId? { playerService.currentPlayer?.playerId }
    var placeInventory: [World2PlaceInventoryItem] { playerService.placeInventory }
    var blankSlatePlaces: [World2PlacedPlaceInstance] {
        playerService.placedPlaces(in: World2PlacedPlaceInstance.blankSlateSceneID)
    }
    var currentMutableScene: World2MutableScene {
        playerService.scene(currentMutableSceneID) ?? .blankSlate
    }
    var currentScenePlaces: [World2PlacedPlaceInstance] {
        playerService.placedPlaces(in: currentMutableSceneID)
    }
    var currentSceneExits: [World2SceneExit] {
        playerService.exits(from: currentMutableSceneID)
    }
    var availableSceneHardpoints: [World2SceneHardpoint] {
        playerService.availableHardpoints(in: currentMutableSceneID)
    }
    var canReturnToPreviousMutableScene: Bool {
        !mutableSceneBackStack.isEmpty
    }
    var factoryInventoryCount: Int {
        placeInventory.filter { $0.templateID == .selfReplicatingFactory }.count
    }

    init() {
        assetService.objectWillChange
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
        playerService.objectWillChange
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
        loadTruthfulSliceContent()
    }

    func startGame() async {
        setScreen(.loading, reason: "launch")
        World2MusicService.shared.stop()
        let skipIntro = ProcessInfo.processInfo.arguments.contains("-world2SkipIntro")
        async let minimumVisibleLoading: Void = Task.sleep(
            for: .seconds(skipIntro ? 0 : 10)
        )
        await assetService.bootstrap()
        try? await minimumVisibleLoading
        isIntroBootstrapReady = true
        World2Diagnostics.log("intro_ready_for_player")
    }

    func continueFromIntro() {
        guard currentScreen == .loading, isIntroBootstrapReady else { return }
        routeAfterBootstrap()
    }

    func selectPlayer(_ playerId: PlayerId) {
        guard playerService.selectPlayer(playerId) else {
            showToast(
                playerService.error
                    ?? "That saved game could not be opened safely."
            )
            return
        }
        dismissPOIInspection()
        currentMutableSceneID = World2PlacedPlaceInstance.blankSlateSceneID
        mutableSceneBackStack = []
        playerService.setCurrentWorld(.home)
        currentWorld = worlds[.home]
        setScreen(.homeWorld, reason: "player_selected")
        World2Diagnostics.log("player_selected", ["player": playerId.rawValue])
    }

    func inspectPOI(placement: POIPlacement) {
        guard let poi = pois[placement.poiId] else {
            World2Diagnostics.log("poi_missing", ["poi": placement.poiId])
            return
        }
        inspectedPOI = POIInspection(id: placement.id, poi: poi, placement: placement)
        showingPOISheet = true
        World2Diagnostics.log("poi_inspected", ["poi": poi.id])
    }

    func dismissPOIInspection() {
        showingPOISheet = false
        inspectedPOI = nil
    }

    func switchWorld(to worldId: WorldId) {
        guard let world = worlds[worldId] else {
            showToast("That world is still being built.")
            return
        }
        dismissPOIInspection()
        currentWorld = world
        playerService.setCurrentWorld(worldId)
        if worldId == .blankSlate {
            currentMutableSceneID = World2PlacedPlaceInstance.blankSlateSceneID
            mutableSceneBackStack = []
        }
        setScreen(
            worldId == .blankSlate ? .blankSlate : .homeWorld,
            reason: "world_changed"
        )
        World2Diagnostics.log("world_changed", ["world": worldId.rawValue])
    }

    @discardableResult
    func placeInventoryItem(
        _ itemID: String,
        x: Double,
        y: Double,
        hardpointID: String? = nil
    ) -> World2PlacedPlaceInstance? {
        guard let instance = playerService.placeInventoryItem(
            itemID,
            in: currentMutableSceneID,
            x: x,
            y: y,
            hardpointID: hardpointID
        ) else {
            showToast("That place could not be placed there.")
            return nil
        }
        World2Diagnostics.log(
            "place_instance_placed",
            [
                "instance": instance.id,
                "scene": instance.sceneID,
                "template": instance.templateID.rawValue
            ]
        )
        showToast("POI Factory placed. Tap it to go inside!")
        return instance
    }

    func enterPlacedPlace(_ instanceID: String) {
        guard let instance = currentScenePlaces.first(where: { $0.id == instanceID }) else {
            showToast("That place could not be found.")
            return
        }
        switch instance.templateID {
        case .selfReplicatingFactory:
            setScreen(
                .selfReplicatingFactory(instanceID: instance.id),
                reason: "placed_poi_entered"
            )
        }
        World2Diagnostics.log(
            "placed_poi_entered",
            ["instance": instance.id, "template": instance.templateID.rawValue]
        )
    }

    @discardableResult
    func fabricateFactoryCopy(from instanceID: String) -> World2PlaceInventoryItem? {
        guard let item = playerService.fabricatePlaceCopy(from: instanceID) else {
            showToast("This factory could not make a copy.")
            return nil
        }
        World2Diagnostics.log(
            "place_inventory_item_fabricated",
            [
                "item": item.id,
                "source_instance": instanceID,
                "template": item.templateID.rawValue
            ]
        )
        showToast("A new POI Factory is in your inventory!")
        return item
    }

    func traverseSceneExit(_ exitID: String) {
        guard let exit = currentSceneExits.first(where: { $0.id == exitID }),
              playerService.scene(exit.toSceneID) != nil else {
            showToast("That destination is not ready.")
            return
        }
        mutableSceneBackStack.append(currentMutableSceneID)
        currentMutableSceneID = exit.toSceneID
        World2Diagnostics.log(
            "scene_exit_traversed",
            [
                "exit": exit.id,
                "from_scene": exit.fromSceneID,
                "to_scene": exit.toSceneID
            ]
        )
    }

    func returnFromMutableScene() {
        guard let previous = mutableSceneBackStack.popLast() else {
            returnToHomeWorld()
            return
        }
        currentMutableSceneID = previous
        World2Diagnostics.log(
            "mutable_scene_back",
            ["to_scene": previous]
        )
    }

    @discardableResult
    func birthPlaceholderScene(
        name: String,
        summary: String,
        exitName: String,
        usesHardpoints: Bool
    ) -> World2SceneExit? {
        let hardpoints = usesHardpoints
            ? World2SceneHardpoint.threePointLayout
            : []
        guard let exit = playerService.birthPlaceholderScene(
            from: currentMutableSceneID,
            name: name,
            summary: summary,
            exitName: exitName,
            hardpoints: hardpoints
        ) else {
            showToast("This scene already has an exit, or its metadata is incomplete.")
            return nil
        }
        World2Diagnostics.log(
            "developer_placeholder_scene_birthed",
            [
                "exit": exit.id,
                "from_scene": exit.fromSceneID,
                "to_scene": exit.toSceneID,
                "hardpoint_count": "\(hardpoints.count)"
            ]
        )
        showToast("The placeholder scene is now part of the world.")
        return exit
    }

    func returnToHomeWorld() {
        currentMutableSceneID = World2PlacedPlaceInstance.blankSlateSceneID
        mutableSceneBackStack = []
        switchWorld(to: .home)
    }

    func enterPOI(_ poi: POI) {
        dismissPOIInspection()
        switch poi.type {
        case .home:
            setScreen(.treehouse(poiId: poi.id), reason: "poi_entered")
        case .cardFactory:
            setScreen(.cardFactory, reason: "poi_entered")
        case .minigame:
            guard let configurationID = poi.minigameType else {
                showToast("This game is still being tuned.")
                return
            }
            if configurationID == "furniture_store" {
                setScreen(.furnitureStore, reason: "poi_entered")
            } else if configurationID == "asset_workbench" {
                setScreen(.assetWorkbench, reason: "poi_entered")
            } else if configurationID == "creature_lab" {
                setScreen(.creatureLab, reason: "poi_entered")
            } else {
                setScreen(
                    .fallingTargets(configurationID: configurationID),
                    reason: "poi_entered"
                )
            }
        case .cardVault, .cardShop, .creatureIngredient, .functionIngredient,
             .contextIngredient, .gemReward, .farmPlot:
            World2Diagnostics.log("poi_not_in_slice", ["poi": poi.id, "type": poi.type.rawValue])
            showToast("That place is not open in this slice.")
        }
    }

    func exitPOI() {
        setScreen(
            currentWorld?.id == .blankSlate ? .blankSlate : .homeWorld,
            reason: "poi_exit"
        )
    }

    func openCurrentPlayerTreehouse() {
        guard let playerId = currentPlayerId else { return }
        currentWorld = worlds[.home]
        playerService.setCurrentWorld(.home)
        setScreen(
            .treehouse(poiId: playerId.homePoiId),
            reason: "decorate_owned_treehouse"
        )
    }

    func openCreatureLab() {
        dismissPOIInspection()
        currentWorld = worlds[.work] ?? currentWorld
        playerService.setCurrentWorld(.work)
        setScreen(.creatureLab, reason: "classic_games")
    }

    func awardWorkbenchPack(
        _ award: World2AssetWorkbenchAward,
        images: [String: Data]
    ) {
        let added = playerService.awardWorkbenchDecorations(
            award.decorations,
            images: images
        )
        World2Diagnostics.log(
            "asset_workbench_pack_awarded",
            [
                "added": "\(added)",
                "pack": award.packID,
                "player": currentPlayerId?.rawValue ?? "none",
            ]
        )
        if added > 0 {
            showToast("\(added) new creations are in your furniture drawer.")
        }
    }

    func isReadOnlyVisit(to poiId: String) -> Bool {
        guard let ownerId = pois[poiId]?.ownerId else { return false }
        return ownerId != currentPlayerId?.rawValue
    }

    func completeMinigame(
        configurationID: String,
        score: Int,
        rewardGems: Int
    ) {
        playerService.addGems(rewardGems)
        if let completedPOI = pois.values.first(
            where: { $0.minigameType == configurationID }
        ) {
            playerService.markPOICompleted(completedPOI.id)
        }
        playerService.incrementMinigamesCompleted()
        World2Diagnostics.log(
            "minigame_rewarded",
            [
                "configuration": configurationID,
                "gems": "\(rewardGems)",
                "score": "\(score)"
            ]
        )
    }

    func showToast(_ message: String) {
        toastMessage = message
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(3))
            if self?.toastMessage == message {
                self?.toastMessage = nil
            }
        }
    }

    private func routeAfterBootstrap() {
        let processArguments = ProcessInfo.processInfo.arguments
        let arguments = Set(processArguments)
        let directPlayer: PlayerId = arguments.contains("-world2PlayerAni") ? .ani : .abbie

        if arguments.contains("-launchWorld2WorkLand") {
            selectPlayer(directPlayer)
            switchWorld(to: .work)
        } else if arguments.contains("-launchWorld2FarmLand") {
            selectPlayer(directPlayer)
            switchWorld(to: .farm)
        } else if arguments.contains("-launchWorld2BlankSlate") {
            selectPlayer(directPlayer)
            switchWorld(to: .blankSlate)
        } else if arguments.contains("-launchWorld2POIFactory") {
            selectPlayer(directPlayer)
            switchWorld(to: .blankSlate)
            let instance = blankSlatePlaces.first
                ?? placeInventory.first.flatMap {
                    placeInventoryItem($0.id, x: 0.50, y: 0.56)
                }
            if let instance {
                enterPlacedPlace(instance.id)
            }
        } else if arguments.contains("-launchWorld2FurnitureStore")
                    || arguments.contains("-openWorld2FurnitureStoreCart")
                    || arguments.contains("-autoPlayWorld2FurnitureStore") {
            selectPlayer(directPlayer)
            switchWorld(to: .farm)
            setScreen(.furnitureStore, reason: "direct_launch")
        } else if arguments.contains("-launchWorld2AssetWorkbench") {
            selectPlayer(directPlayer)
            switchWorld(to: .work)
            setScreen(.assetWorkbench, reason: "direct_launch")
        } else if arguments.contains("-launchSaveTheVowels")
                    || arguments.contains("-autoPlaySaveVowels") {
            selectPlayer(directPlayer)
            switchWorld(to: .work)
            setScreen(
                .fallingTargets(configurationID: "save_the_vowels"),
                reason: "direct_launch"
            )
        } else if arguments.contains("-launchWorld2CreatureLab") {
            selectPlayer(directPlayer)
            switchWorld(to: .work)
            setScreen(.creatureLab, reason: "direct_launch")
        } else if let inspectionFlag = processArguments.firstIndex(of: "-inspectWorld2POI"),
           processArguments.indices.contains(inspectionFlag + 1),
           let poi = pois[processArguments[inspectionFlag + 1]],
           let world = worlds[poi.mapId],
           let placement = world.poiPlacements.first(where: { $0.poiId == poi.id }) {
            selectPlayer(directPlayer)
            switchWorld(to: poi.mapId)
            inspectPOI(placement: placement)
        } else if arguments.contains("-launchWorld2Home") {
            selectPlayer(directPlayer)
        } else if arguments.contains("-launchWorld2AbbieTreehouse") {
            selectPlayer(directPlayer)
            setScreen(.treehouse(poiId: PlayerId.abbie.homePoiId), reason: "direct_launch")
        } else if arguments.contains("-launchWorld2AniTreehouse") {
            selectPlayer(directPlayer)
            setScreen(.treehouse(poiId: PlayerId.ani.homePoiId), reason: "direct_launch")
        } else if arguments.contains("-launchWorld2Factory")
                    || arguments.contains("-autoPlayWorld2Factory")
                    || arguments.contains("-autoRejectWorld2Factory") {
            selectPlayer(directPlayer)
            setScreen(.cardFactory, reason: "direct_launch")
        } else {
            // Player choice is intentional on every ordinary launch, even when local state exists.
            setScreen(.playerSelect, reason: "bootstrap_ready")
        }
    }

    private func setScreen(_ screen: World2Screen, reason: String) {
        currentScreen = screen
        applyMusic(for: screen)
        World2Diagnostics.log(
            "screen_changed",
            ["reason": reason, "screen": screen.diagnosticName]
        )
    }

    /// Each place decides its cue. An empty track means this place stays quiet.
    private func applyMusic(for screen: World2Screen) {
        let songID: String?
        switch screen {
        case .loading, .playerSelect:
            return
        case .homeWorld:
            songID = worldSongID(currentWorld?.id ?? .home)
        case .blankSlate, .selfReplicatingFactory:
            songID = worldSongID(.blankSlate)
        case .treehouse(let poiId):
            songID = pois[poiId]?.lightMusicTrack
        case .cardFactory:
            songID = pois["poi.cardFactory"]?.lightMusicTrack
        case .furnitureStore:
            songID = pois["poi.furnitureStore"]?.lightMusicTrack
        case .assetWorkbench:
            songID = pois["poi.assetWorkbench"]?.lightMusicTrack
        case .creatureLab:
            songID = pois["poi.creatureLab"]?.lightMusicTrack
        case .fallingTargets:
            songID = pois["poi.letterWorks"]?.lightMusicTrack
        }
        World2MusicService.shared.stop()
        if let songID, !songID.isEmpty {
            MusicService.shared.playSong(id: songID)
        } else {
            MusicService.shared.stop()
        }
        World2Diagnostics.log(
            "location_music",
            ["screen": screen.diagnosticName, "track": songID ?? "silent"]
        )
    }

    private func worldSongID(_ worldId: WorldId) -> String {
        switch worldId {
        case .work: return "world2_working_song"
        case .farm: return "world2_bright_new_day"
        case .blankSlate: return "world2_cliffside_morning"
        default: return "world2_joyful_bounce"
        }
    }

    private func loadTruthfulSliceContent() {
        let home = World(
            id: .home,
            name: "Home World",
            description: "Three welcoming places to explore",
            backgroundAsset: "map.home",
            lightMusicTrack: "music.home.light",
            intenseMusicTrack: "music.home.intense",
            poiPlacements: [
                // Image-normalized centers of the three painted dirt pads.
                POIPlacement(poiId: "poi.abbieTreehouse", x: 0.326, y: 0.311, scale: 1.0, zIndex: 1),
                POIPlacement(poiId: "poi.aniTreehouse", x: 0.722, y: 0.443, scale: 1.0, zIndex: 1),
                POIPlacement(poiId: "poi.cardFactory", x: 0.440, y: 0.685, scale: 1.05, zIndex: 2)
            ],
            adjacentWorlds: [.work, .farm, .blankSlate],
            ambiance: .init(primaryColor: "#56AB2F", secondaryColor: "#A8E063", mood: "welcoming")
        )
        let work = World(
            id: .work,
            name: "Work Land",
            description: "A bright workshop meadow with three empty lots",
            backgroundAsset: "map.workLand",
            lightMusicTrack: "music.work.light",
            intenseMusicTrack: "music.work.intense",
            poiPlacements: [
                // Empty sand circles on the parent-supplied Work Land painting.
                POIPlacement(poiId: "poi.letterWorks", x: 0.443, y: 0.662, scale: 0.92, zIndex: 1),
                POIPlacement(poiId: "poi.creatureLab", x: 0.693, y: 0.388, scale: 0.88, zIndex: 2),
                POIPlacement(poiId: "poi.assetWorkbench", x: 0.722, y: 0.759, scale: 0.88, zIndex: 3)
            ],
            adjacentWorlds: [.home],
            ambiance: .init(
                primaryColor: "#7B8A97",
                secondaryColor: "#E19B57",
                mood: "busy and welcoming"
            )
        )
        let farm = World(
            id: .farm,
            name: "Farm Land",
            description: "An open meadow with one wonderful new place to explore",
            backgroundAsset: "map.farm",
            lightMusicTrack: "music.farm.light",
            intenseMusicTrack: "music.farm.intense",
            poiPlacements: [
                POIPlacement(
                    poiId: "poi.furnitureStore",
                    x: 0.538,
                    y: 0.480,
                    scale: 1.15,
                    zIndex: 1
                )
            ],
            adjacentWorlds: [.home],
            ambiance: .init(
                primaryColor: "#77B255",
                secondaryColor: "#F6D365",
                mood: "sunny and curious"
            )
        )
        let blankSlate = World(
            id: .blankSlate,
            name: "Blank Slate",
            description: "A persistent scene for places made by players",
            backgroundAsset: "map.blankSlate",
            lightMusicTrack: "music.home.light",
            intenseMusicTrack: "music.home.intense",
            poiPlacements: [],
            adjacentWorlds: [.home],
            ambiance: .init(
                primaryColor: "#EAF8FF",
                secondaryColor: "#C8E9D6",
                mood: "open and possible"
            )
        )
        worlds = [.home: home, .work: work, .farm: farm, .blankSlate: blankSlate]
        currentWorld = home

        pois = [
            "poi.abbieTreehouse": treehousePOI(
                id: "poi.abbieTreehouse",
                name: "Abbie's Treehouse",
                owner: .abbie,
                exterior: "poi.abbieTreehouse.exterior",
                interior: "poi.abbieTreehouse.interior"
            ),
            "poi.aniTreehouse": treehousePOI(
                id: "poi.aniTreehouse",
                name: "Ani's Treehouse",
                owner: .ani,
                exterior: "poi.aniTreehouse.exterior",
                interior: "poi.aniTreehouse.interior"
            ),
            "poi.cardFactory": POI(
                id: "poi.cardFactory",
                name: "Card Factory",
                type: .cardFactory,
                mapId: .home,
                exteriorAsset: "poi.cardFactory.exterior",
                interiorAsset: "poi.cardFactory.interior",
                tapHitbox: .init(x: 0, y: 0, width: 250, height: 300),
                lore: "A gentle workshop for combining three ideas.",
                description: "Combine a Creature, Function, and Context.",
                entryCost: nil,
                rewardConfiguration: nil,
                minigameType: nil,
                lightMusicTrack: "world2_joyful_bounce",
                intenseMusicTrack: "world2_joyful_bounce",
                icon: "wand.and.stars",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.letterWorks": POI(
                id: "poi.letterWorks",
                name: "The Letter Works",
                type: .minigame,
                mapId: .work,
                exteriorAsset: "poi.letterWorks.exterior",
                interiorAsset: "poi.letterWorks.interior",
                tapHitbox: .init(x: 0, y: 0, width: 280, height: 320),
                lore: "This marvelous municipal machine sorts and sends letters all across Abbie's World.",
                description: "Help rescue A, E, I, O, and U from the runaway sorting system.",
                entryCost: nil,
                rewardConfiguration: nil,
                minigameType: "save_the_vowels",
                lightMusicTrack: "world2_working_song",
                intenseMusicTrack: "world2_working_song",
                icon: "character.book.closed.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.furnitureStore": POI(
                id: "poi.furnitureStore",
                name: "Furniture Store",
                type: .minigame,
                mapId: .farm,
                exteriorAsset: "poi.furnitureStore.exterior",
                interiorAsset: "poi.furnitureStore.interior",
                tapHitbox: .init(x: 0, y: 0, width: 320, height: 300),
                lore: "A pink rainbow workshop piled high with cozy possibilities.",
                description: "Solve little math tasks to earn ingredients, then use any three to make any furniture you choose.",
                entryCost: nil,
                rewardConfiguration: nil,
                minigameType: "furniture_store",
                lightMusicTrack: "world2_bright_new_day",
                intenseMusicTrack: "world2_bright_new_day",
                icon: "chair.lounge.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.assetWorkbench": POI(
                id: "poi.assetWorkbench",
                name: "Asset Workbench",
                type: .minigame,
                mapId: .work,
                exteriorAsset: "poi.assetWorkbench.exterior",
                interiorAsset: "poi.assetWorkbench.interior",
                tapHitbox: .init(x: 0, y: 0, width: 320, height: 280),
                lore: "A cozy invention cottage where three little ideas become six magical room creations.",
                description: "Choose a finish, an object, and a personality. Make six ideas, then keep your favorite three.",
                entryCost: nil,
                rewardConfiguration: nil,
                minigameType: "asset_workbench",
                lightMusicTrack: "world2_well_make_a_way",
                intenseMusicTrack: "world2_well_make_a_way",
                icon: "hammer.circle.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.creatureLab": POI(
                id: "poi.creatureLab",
                name: "Creature Lab",
                type: .minigame,
                mapId: .work,
                exteriorAsset: "poi.creatureLab.exterior",
                interiorAsset: nil,
                tapHitbox: .init(x: 0, y: 0, width: 300, height: 300),
                lore: "A bright laboratory where three ideas become a brand-new creature card.",
                description: "Build creatures, watch the machine work, and keep your favorites.",
                entryCost: nil,
                rewardConfiguration: nil,
                minigameType: "creature_lab",
                lightMusicTrack: "world2_cliffside_morning",
                intenseMusicTrack: "world2_cliffside_morning",
                icon: "wand.and.stars",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            )
        ]
    }

    private func treehousePOI(
        id: String,
        name: String,
        owner: PlayerId,
        exterior: String,
        interior: String
    ) -> POI {
        POI(
            id: id,
            name: name,
            type: .home,
            mapId: .home,
            exteriorAsset: exterior,
            interiorAsset: interior,
            tapHitbox: .init(x: 0, y: 0, width: 200, height: 250),
            lore: owner == .abbie ? "A bright place for making and imagining." : "A calm place for stories and stargazing.",
            description: "\(owner.displayName)'s own treehouse",
            entryCost: nil,
            rewardConfiguration: nil,
            minigameType: nil,
            lightMusicTrack: owner == .ani ? "world2_cliffside_morning" : "world2_family_adventure",
            intenseMusicTrack: owner == .ani ? "world2_cliffside_morning" : "world2_family_adventure",
            icon: "house.fill",
            embellishmentSlots: nil,
            interactiveDecorationHooks: nil,
            ownerId: owner.rawValue
        )
    }
}

private extension World2Screen {
    var diagnosticName: String {
        switch self {
        case .loading: return "loading"
        case .playerSelect: return "player_select"
        case .homeWorld: return "home_world"
        case .blankSlate: return "blank_slate"
        case .treehouse(let poiId): return "treehouse:\(poiId)"
        case .cardFactory: return "card_factory"
        case .selfReplicatingFactory(let instanceID):
            return "self_replicating_factory:\(instanceID)"
        case .furnitureStore: return "furniture_store"
        case .assetWorkbench: return "asset_workbench"
        case .creatureLab: return "creature_lab"
        case .fallingTargets(let configurationID):
            return "falling_targets:\(configurationID)"
        }
    }
}
