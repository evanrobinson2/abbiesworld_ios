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
    case threeBearsHouse
    case characterStudio
    case sceneBuilder
    case worldTeleporter
    case whizbang
    case planningDept
    case sceneCreator(instanceID: String)
    case beacon(instanceID: String)
    /// Daddy's Citadel POI — welcome plate + always a candy or hug.
    case daddyWelcome
}

/// A place the player has tapped on the map, paired with the instance they
/// tapped so the drawer can talk about this one rather than the archetype.
struct POIInspection: Identifiable {
    let id: String
    let poi: World2POIArchetype
    let instance: World2POIInstance
}

/// A reward worth interrupting the game for. Presented over everything so a
/// six year old cannot miss that she just earned something.
struct World2RewardCelebration: Identifiable, Equatable {
    let id: String
    let decoration: World2StoryDecoration
    let headline: String
    let earnedPerfectly: Bool
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

    /// Multi-line dumps (registry contracts, scene rigging) go through here so
    /// they stay readable in a console.
    static func report(_ title: String, _ body: String) {
        logger.notice("\(title, privacy: .public)")
        print("[World2] \(title)\n\(body)")
    }
}

@MainActor
final class World2ViewModel: ObservableObject {
    private let assetService = AssetBootstrapService.shared
    private let playerService = PlayerStateService.shared
    private var cancellables = Set<AnyCancellable>()

    /// Placement truth for every scene. Shared with the scene editor.
    let sceneGraph = World2SceneGraphStore()
    /// Overland tunnels (N/S/E/W). Shared with the minimap and Planning Dept.
    let worldGraph = World2WorldGraphStore()
    /// Abbie + Daddy game pieces on the open map.
    let party = World2PartyController()

    @Published private(set) var currentScreen: World2Screen = .loading
    @Published private(set) var currentWorld: World?
    @Published private(set) var currentMutableSceneID =
        World2PlacedPlaceInstance.blankSlateSceneID
    @Published private(set) var isIntroBootstrapReady = false
    @Published var inspectedPOI: POIInspection?
    @Published var showingPOISheet = false
    @Published var toastMessage: String?
    @Published var rewardCelebration: World2RewardCelebration?
    /// Place-inventory item armed for planting on the open map / mutable scene.
    @Published var selectedPlaceInventoryItemID: String?
    /// The inventory item the treehouse drawer should open on next. Set when a
    /// reward lands so "Show me!" can point straight at it.
    @Published private(set) var inventoryHighlightID: String?

    private(set) var worlds: [WorldId: World] = [:]
    private(set) var ingredientCatalog: IngredientCatalog = .factoryCatalog
    private var mutableSceneBackStack: [String] = []

    /// Every registered place, keyed by archetype id.
    var pois: [String: World2POIArchetype] { World2POIRegistry.archetypes }

    func archetype(_ id: String) -> World2POIArchetype? {
        World2POIRegistry.archetype(id)
    }

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
    /// Place-inventory POIs planted on the authored overland map (Home, Farm, …).
    var currentAuthoredMapPlaces: [World2PlacedPlaceInstance] {
        playerService.placedPlaces(in: (currentWorld?.id ?? .home).sceneID)
    }
    var currentSceneExits: [World2SceneExit] {
        playerService.exits(from: currentMutableSceneID)
    }
    var availableSceneHardpoints: [World2SceneHardpoint] {
        playerService.availableHardpoints(in: currentMutableSceneID)
    }
    /// Open scene-graph pads that do not already hold a planted place.
    var plantableAuthoredHardpoints: [World2SceneHardpoint] {
        let occupied = Set(currentAuthoredMapPlaces.compactMap(\.hardpointID))
        return currentScene.openHardpoints.filter { !occupied.contains($0.id) }
    }
    var canReturnToPreviousMutableScene: Bool {
        !mutableSceneBackStack.isEmpty
    }
    /// Sentinel pushed when entering a seedling world from an authored map.
    private static let homeMapReturnToken = "__return_authored_map__"
    var factoryInventoryCount: Int {
        placeInventory.filter { $0.templateID == .selfReplicatingFactory }.count
    }

    /// The scene backing the map the player is looking at.
    var currentScene: World2SceneDefinition {
        sceneGraph.scene((currentWorld?.id ?? .home).sceneID)
    }

    var currentSceneInstances: [World2POIInstance] {
        currentScene.instancesInDrawOrder
    }

    var currentSceneOpenHardpoints: [World2SceneHardpoint] {
        currentScene.openHardpoints
    }

    /// Overland graph for the HUD minimap and Planning Dept.
    var worldGraphSnapshot: World2WorldGraphSnapshot {
        worldGraph.snapshot(currentSceneID: currentWorld?.sceneID)
    }

    /// Neighbours from the tunnel graph (falls back to authored adjacency).
    func travelDestinations(from worldID: WorldId) -> [WorldId] {
        let fromGraph = worldGraph.adjacentWorldIDs(from: worldID)
        if !fromGraph.isEmpty { return fromGraph }
        return worlds[worldID]?.adjacentWorlds ?? []
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
        sceneGraph.objectWillChange
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
        worldGraph.objectWillChange
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
        loadWorldMetadata()
        worldGraph.configure(worlds: worlds, playerID: nil)
        auditRegisteredContent()
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
        sceneGraph.selectPlayer(playerId)
        worldGraph.configure(worlds: worlds, playerID: playerId)
        currentMutableSceneID = World2PlacedPlaceInstance.blankSlateSceneID
        mutableSceneBackStack = []
        playerService.setCurrentWorld(.home)
        currentWorld = worlds[.home]
        setScreen(.homeWorld, reason: "player_selected")
        World2Diagnostics.log("player_selected", ["player": playerId.rawValue])
    }

    func returnToProfileSelect() {
        dismissPOIInspection()
        setScreen(.playerSelect, reason: "switch_profile")
    }

    // MARK: - Inspection

    func inspectPOI(instance: World2POIInstance) {
        guard let archetype = World2POIRegistry.archetype(instance.archetypeID) else {
            World2Diagnostics.log(
                "poi_archetype_unregistered",
                ["archetype": instance.archetypeID, "instance": instance.id]
            )
            showToast("That place is not registered yet.")
            return
        }
        inspectedPOI = POIInspection(
            id: instance.id,
            poi: archetype,
            instance: instance
        )
        showingPOISheet = true
        party.walkToPOI(at: instance.transform.position)
        World2Diagnostics.log(
            "poi_inspected",
            ["archetype": archetype.id, "instance": instance.id]
        )
    }

    /// Approach-based drawer: open when the party is near a place, close when they leave.
    func syncProximityInspection(
        lead: World2NormalizedPoint,
        instances: [World2POIInstance],
        aspectRatio: Double
    ) {
        let threshold = 0.085
        var nearest: (instance: World2POIInstance, distance: Double)?
        for instance in instances {
            let distance = lead.distance(to: instance.transform.position, aspectRatio: aspectRatio)
            if nearest == nil || distance < nearest!.distance {
                nearest = (instance, distance)
            }
        }

        guard let nearest, nearest.distance <= threshold else {
            if showingPOISheet {
                dismissPOIInspection()
            }
            return
        }

        if inspectedPOI?.id != nearest.instance.id {
            guard let archetype = World2POIRegistry.archetype(nearest.instance.archetypeID) else {
                return
            }
            inspectedPOI = POIInspection(
                id: nearest.instance.id,
                poi: archetype,
                instance: nearest.instance
            )
            showingPOISheet = true
            World2Diagnostics.log(
                "poi_proximity_opened",
                ["archetype": archetype.id, "distance": String(format: "%.3f", nearest.distance)]
            )
        }
    }

    func dismissPOIInspection() {
        showingPOISheet = false
        inspectedPOI = nil
    }

    /// Gift flight cue after Daddy's Citadel awards candy/hug.
    @Published var flyingGiftDecoration: World2StoryDecoration?

    func presentFlyingGift(_ decoration: World2StoryDecoration) {
        flyingGiftDecoration = decoration
    }

    func clearFlyingGift() {
        flyingGiftDecoration = nil
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
        party.enterScene(.defaultSpawn)
        setScreen(
            worldId == .blankSlate ? .blankSlate : .homeWorld,
            reason: "world_changed"
        )
        World2Diagnostics.log(
            "world_changed",
            [
                "world": worldId.rawValue,
                "open_hardpoints": "\(sceneGraph.openHardpoints(in: worldId.sceneID).count)",
            ]
        )
    }

    // MARK: - Player-made places

    @discardableResult
    func placeInventoryItem(
        _ itemID: String,
        x: Double,
        y: Double,
        hardpointID: String? = nil,
        in sceneID: String? = nil
    ) -> World2PlacedPlaceInstance? {
        let targetSceneID = sceneID ?? currentMutableSceneID
        guard let instance = playerService.placeInventoryItem(
            itemID,
            in: targetSceneID,
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
        showToast(placementToast(for: instance.templateID, growth: instance.seedGrowth))
        if selectedPlaceInventoryItemID == itemID {
            selectedPlaceInventoryItemID = nil
        }
        return instance
    }

    func togglePlaceInventorySelection(_ itemID: String) {
        selectedPlaceInventoryItemID =
            selectedPlaceInventoryItemID == itemID ? nil : itemID
    }

    private func placementToast(
        for template: World2PlaceTemplateID,
        growth: World2WorldSeedGrowth?
    ) -> String {
        switch template {
        case .selfReplicatingFactory:
            return "POI Factory placed. Tap it to go inside!"
        case .worldSeed:
            return growth == .portal
                ? "World portal ready — tap to enter your world."
                : "World Seed planted! Tap the seedling to enter your blank world."
        case .sceneKit:
            return "New scene attached! Walk through the exit — a Beacon is in your inventory."
        case .sceneCreator:
            return "Scene Creator placed."
        case .beacon:
            return "Beacon placed. Tap it to read the message."
        }
    }

    func enterPlacedPlace(_ instanceID: String) {
        guard let instance = playerService.placedPlaces.first(where: { $0.id == instanceID }) else {
            showToast("That place could not be found.")
            return
        }
        switch instance.templateID {
        case .selfReplicatingFactory:
            setScreen(
                .selfReplicatingFactory(instanceID: instance.id),
                reason: "placed_poi_entered"
            )
        case .worldSeed:
            guard let hubID = instance.linkedSceneID,
                  playerService.scene(hubID) != nil else {
                showToast("That world is still sprouting.")
                return
            }
            if currentScreen == .homeWorld || currentWorld?.id != .blankSlate {
                mutableSceneBackStack.append(Self.homeMapReturnToken)
            } else {
                mutableSceneBackStack.append(currentMutableSceneID)
            }
            currentMutableSceneID = hubID
            currentWorld = worlds[.blankSlate]
            playerService.setCurrentWorld(.blankSlate)
            setScreen(.blankSlate, reason: "world_seed_entered")
            party.enterScene(.defaultSpawn)
            showToast(
                instance.seedGrowth == .portal
                    ? "Stepped through the world portal."
                    : "Entered your seedling world."
            )
        case .sceneCreator:
            setScreen(
                .sceneCreator(instanceID: instance.id),
                reason: "placed_poi_entered"
            )
        case .sceneKit:
            if let childID = instance.linkedSceneID,
               let exit = currentSceneExits.first(where: { $0.toSceneID == childID }) {
                traverseSceneExit(exit.id)
            } else {
                showToast("That scene door is not ready yet.")
            }
        case .beacon:
            setScreen(
                .beacon(instanceID: instance.id),
                reason: "placed_poi_entered"
            )
        }
        World2Diagnostics.log(
            "placed_poi_entered",
            ["instance": instance.id, "template": instance.templateID.rawValue]
        )
    }

    /// Scene Creator hands the player a Scene Kit bound to this hub.
    @discardableResult
    func takeSceneKit(fromCreatorInstanceID instanceID: String) -> World2PlaceInventoryItem? {
        guard let instance = playerService.placedPlaces.first(where: { $0.id == instanceID }),
              instance.templateID == .sceneCreator,
              let hubID = instance.linkedSceneID ?? Optional(instance.sceneID) else {
            showToast("The Scene Creator could not pack a kit.")
            return nil
        }
        guard let item = playerService.grantPlaceInventoryItem(.sceneKit(forHub: hubID)) else {
            showToast("Choose a player first.")
            return nil
        }
        showToast("Scene Kit added to Place Inventory!")
        World2Diagnostics.log(
            "scene_kit_granted",
            ["item": item.id, "hub": hubID]
        )
        return item
    }

    func beaconMessage(for instanceID: String) -> String {
        playerService.placedPlaces.first(where: { $0.id == instanceID })?.message
            ?? "You made it! This beacon marks your new scene."
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
        party.enterScene(exit.arrivalContract)
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
        if previous == Self.homeMapReturnToken {
            returnToHomeWorld()
            return
        }
        currentMutableSceneID = previous
        party.enterScene(.defaultSpawn)
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

    // MARK: - Entering registered places

    /// Route by contract. Every registered place declares the screen it opens,
    /// so adding a place never means editing a pile of `if` statements.
    func enterPOI(_ archetype: World2POIArchetype) {
        dismissPOIInspection()
        switch archetype.route {
        case .playerHome:
            if archetype.id == World2POIRegistry.evanHomeID {
                setScreen(.daddyWelcome, reason: "poi_entered_daddy_welcome")
            } else {
                setScreen(.treehouse(poiId: archetype.id), reason: "poi_entered")
            }
        case .cardFactory:
            setScreen(.cardFactory, reason: "poi_entered")
        case .furnitureStore:
            setScreen(.furnitureStore, reason: "poi_entered")
        case .assetWorkbench:
            setScreen(.assetWorkbench, reason: "poi_entered")
        case .creatureLab:
            setScreen(.creatureLab, reason: "poi_entered")
        case .fallingTargets(let configurationID):
            setScreen(
                .fallingTargets(configurationID: configurationID),
                reason: "poi_entered"
            )
        case .threeBearsHouse:
            setScreen(.threeBearsHouse, reason: "poi_entered")
        case .characterStudio:
            setScreen(.characterStudio, reason: "poi_entered")
        case .sceneBuilder:
            setScreen(.sceneBuilder, reason: "poi_entered")
        case .whizbang:
            setScreen(.whizbang, reason: "poi_entered")
        case .planningDept:
            setScreen(.planningDept, reason: "poi_entered")
        case .placeFactory:
            // Factories are entered through their placed instance, which knows
            // which copy the player tapped.
            showToast("Tap the factory on the map to go inside.")
        }
    }

    /// Open the World Teleporter travel screen from inventory (or a placed token).
    func openWorldTeleporter() {
        setScreen(.worldTeleporter, reason: "inventory_use_teleporter")
    }

    /// Destinations the teleporter can send you to — every authored world with
    /// metadata, including unconnected scenes like Art Garden.
    var teleporterDestinations: [World] {
        WorldId.allCases.compactMap { worlds[$0] }
    }

    func travelViaTeleporter(to worldId: WorldId) {
        guard worlds[worldId] != nil else {
            showToast("That world is still being built.")
            return
        }
        switchWorld(to: worldId)
        World2Diagnostics.log(
            "teleporter_travel",
            ["world": worldId.rawValue]
        )
    }

    func exitPOI() {
        setScreen(
            currentWorld?.id == .blankSlate ? .blankSlate : .homeWorld,
            reason: "poi_exit"
        )
    }

    @discardableResult
    func awardDaddyVisitGift(_ decoration: World2StoryDecoration) -> DecorationInstance? {
        playerService.awardRepeatableStoryDecoration(decoration)
    }

    /// When true, opening a treehouse should jump straight into Decorate mode.
    @Published var shouldStartDecorating = false

    func openCurrentPlayerTreehouse(startDecorating: Bool = false) {
        guard let playerId = currentPlayerId else { return }
        shouldStartDecorating = startDecorating
        currentWorld = worlds[.home]
        playerService.setCurrentWorld(.home)
        setScreen(
            .treehouse(poiId: playerId.homePoiId),
            reason: startDecorating ? "decorate_owned_treehouse" : "open_owned_treehouse"
        )
    }

    func consumeStartDecoratingFlag() -> Bool {
        let value = shouldStartDecorating
        shouldStartDecorating = false
        return value
    }

    func openCreatureLab() {
        dismissPOIInspection()
        currentWorld = worlds[.work] ?? currentWorld
        playerService.setCurrentWorld(.work)
        setScreen(.creatureLab, reason: "classic_games")
    }

    func openWhizbang() {
        dismissPOIInspection()
        currentWorld = worlds[.work] ?? currentWorld
        playerService.setCurrentWorld(.work)
        setScreen(.whizbang, reason: "classic_games")
    }

    func openPlanningDept() {
        dismissPOIInspection()
        currentWorld = worlds[.home] ?? currentWorld
        playerService.setCurrentWorld(.home)
        setScreen(.planningDept, reason: "hud_minimap")
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
        guard let ownerID = World2POIRegistry.archetype(poiId)?.ownerID else {
            return false
        }
        return ownerID != currentPlayerId?.rawValue
    }

    func completeMinigame(
        configurationID: String,
        score: Int,
        rewardGems: Int
    ) {
        playerService.addGems(rewardGems)
        if let completed = World2POIRegistry.all.first(
            where: { $0.minigameConfigurationID == configurationID }
        ) {
            playerService.markPOICompleted(completed.id)
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

    // MARK: - Three Bears reward

    /// Hand over the Bowl of Perfect Porridge and make a fuss about it.
    func completeJustRightPorridge(tastedPerfectly: Bool) {
        let porridge = World2StoryDecoration.perfectPorridge
        guard let instance = playerService.awardStoryDecoration(porridge) else {
            showToast("Choose a player before playing.")
            return
        }
        if let milestone = World2POIRegistry.threeBearsHouse.contract.completionMilestone {
            playerService.markPOICompleted(World2POIRegistry.threeBearsHouseID)
            World2Diagnostics.log("milestone_reached", ["milestone": milestone])
        }
        inventoryHighlightID = instance.id
        rewardCelebration = World2RewardCelebration(
            id: instance.id,
            decoration: porridge,
            headline: tastedPerfectly
                ? "PERFECT TASTING!"
                : "JUST RIGHT!",
            earnedPerfectly: tastedPerfectly
        )
        World2Diagnostics.log(
            "just_right_completed",
            [
                "instance": instance.id,
                "perfect": "\(tastedPerfectly)",
                "player": currentPlayerId?.rawValue ?? "none",
            ]
        )
    }

    // MARK: - Scene Builder reward

    func completeSceneBuilderDeed(_ decoration: World2StoryDecoration = .propertyDeed) {
        guard let instance = playerService.awardStoryDecoration(decoration) else {
            showToast("Choose a player before cooking a land.")
            return
        }
        playerService.markPOICompleted(World2POIRegistry.sceneBuilderID)
        inventoryHighlightID = instance.id
        rewardCelebration = World2RewardCelebration(
            id: instance.id,
            decoration: decoration,
            headline: "LAND DEED READY!",
            earnedPerfectly: true
        )
        World2Diagnostics.log(
            "scene_builder_deed_awarded",
            [
                "instance": instance.id,
                "player": currentPlayerId?.rawValue ?? "none",
            ]
        )
    }

    /// "Keep playing" leaves the place that just paid out. Its game is finished,
    /// so dropping her back on the table with no bowls left would be a dead end.
    func dismissRewardCelebration() {
        rewardCelebration = nil
        if currentScreen == .threeBearsHouse {
            exitPOI()
        }
    }

    /// "Show me" on the celebration: walk straight into the treehouse with the
    /// drawer open so the new thing is visible, not merely awarded.
    func openTreehouseForReward() {
        rewardCelebration = nil
        openCurrentPlayerTreehouse()
    }

    /// Read once, by the treehouse, when it decides whether to open the drawer.
    func consumeInventoryHighlight() -> String? {
        guard let highlight = inventoryHighlightID else { return nil }
        inventoryHighlightID = nil
        return highlight
    }

    /// Items still wearing a NEW! ribbon, for the pip on the decorate button.
    var unseenInventoryCount: Int { playerService.unseenInventoryCount }

    func showToast(_ message: String) {
        toastMessage = message
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(3))
            if self?.toastMessage == message {
                self?.toastMessage = nil
            }
        }
    }

    // MARK: - Launch routing

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
        } else if arguments.contains("-launchWorld2ThreeBears") {
            selectPlayer(directPlayer)
            switchWorld(to: .threeBears)
        } else if arguments.contains("-launchWorld2ArtGarden") {
            selectPlayer(directPlayer)
            switchWorld(to: .artGarden)
        } else if arguments.contains("-launchWorld2SceneBuilder") {
            selectPlayer(directPlayer)
            switchWorld(to: .artGarden)
            setScreen(.sceneBuilder, reason: "direct_launch")
        } else if arguments.contains("-launchWorld2Teleporter") {
            selectPlayer(directPlayer)
            setScreen(.worldTeleporter, reason: "direct_launch")
        } else if arguments.contains("-launchWorld2JustRight")
                    || arguments.contains("-autoPlayWorld2JustRight") {
            selectPlayer(directPlayer)
            switchWorld(to: .threeBears)
            setScreen(.threeBearsHouse, reason: "direct_launch")
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
        } else if arguments.contains("-launchWhizbang")
                    || arguments.contains("-autoPlayWhizbang")
                    || arguments.contains("-launchWorld2Whizbang") {
            selectPlayer(directPlayer)
            switchWorld(to: .work)
            setScreen(.whizbang, reason: "direct_launch")
        } else if arguments.contains("-launchWorld2PlanningDept")
                    || arguments.contains("-openWorld2Minimap") {
            selectPlayer(directPlayer)
            switchWorld(to: .home)
            setScreen(.planningDept, reason: "direct_launch")
        } else if let inspectionFlag = processArguments.firstIndex(of: "-inspectWorld2POI"),
           processArguments.indices.contains(inspectionFlag + 1),
           let archetype = World2POIRegistry.archetype(
               processArguments[inspectionFlag + 1]
           ),
           let world = worlds.values.first(
               where: { sceneGraph.scene($0.sceneID).poiInstances.contains {
                   $0.archetypeID == archetype.id
               } }
           ),
           let instance = sceneGraph.scene(world.sceneID).poiInstances.first(
               where: { $0.archetypeID == archetype.id }
           ) {
            selectPlayer(directPlayer)
            switchWorld(to: world.id)
            inspectPOI(instance: instance)
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
        case .blankSlate, .selfReplicatingFactory, .sceneCreator, .beacon:
            songID = worldSongID(.blankSlate)
        case .treehouse(let poiId):
            songID = World2POIRegistry.archetype(poiId)?.musicTrackID
        case .cardFactory:
            songID = World2POIRegistry.cardFactory.musicTrackID
        case .furnitureStore:
            songID = World2POIRegistry.furnitureStore.musicTrackID
        case .assetWorkbench:
            songID = World2POIRegistry.assetWorkbench.musicTrackID
        case .creatureLab:
            songID = World2POIRegistry.creatureLab.musicTrackID
        case .fallingTargets:
            songID = World2POIRegistry.letterWorks.musicTrackID
        case .threeBearsHouse:
            songID = World2POIRegistry.threeBearsHouse.musicTrackID
        case .characterStudio:
            songID = World2POIRegistry.characterStudio.musicTrackID
        case .sceneBuilder:
            songID = World2POIRegistry.sceneBuilder.musicTrackID
        case .whizbang:
            songID = World2POIRegistry.whizbang.musicTrackID
        case .planningDept:
            songID = World2POIRegistry.planningDept.musicTrackID
        case .worldTeleporter:
            songID = "world2_cliffside_morning"
        case .daddyWelcome:
            songID = World2POIRegistry.treehouse(for: .evan).musicTrackID
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
        case .threeBears: return "world2_family_adventure"
        case .artGarden: return "world2_joyful_bounce"
        default: return "world2_joyful_bounce"
        }
    }

    // MARK: - Content

    /// Worlds carry identity, music, and adjacency. What stands in them lives in
    /// the scene graph.
    private func loadWorldMetadata() {
        let home = World(
            id: .home,
            name: "Home World",
            description: "Three welcoming places to explore",
            backgroundAsset: "map.home",
            lightMusicTrack: "music.home.light",
            intenseMusicTrack: "music.home.intense",
            adjacentWorlds: [.work, .farm, .blankSlate, .evan],
            ambiance: .init(primaryColor: "#56AB2F", secondaryColor: "#A8E063", mood: "welcoming")
        )
        let work = World(
            id: .work,
            name: "Work Land",
            description: "A bright workshop meadow with three empty lots",
            backgroundAsset: "map.workLand",
            lightMusicTrack: "music.work.light",
            intenseMusicTrack: "music.work.intense",
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
            description: "An open meadow with a store, and a path into the woods",
            backgroundAsset: "map.farm",
            lightMusicTrack: "music.farm.light",
            intenseMusicTrack: "music.farm.intense",
            adjacentWorlds: [.home, .threeBears],
            ambiance: .init(
                primaryColor: "#77B255",
                secondaryColor: "#F6D365",
                mood: "sunny and curious"
            )
        )
        let threeBears = World(
            id: .threeBears,
            name: "Three Bears Woods",
            description: "A hushed clearing in the woods where somebody is cooking",
            backgroundAsset: "map.threeBears",
            lightMusicTrack: "music.home.light",
            intenseMusicTrack: "music.home.intense",
            adjacentWorlds: [.farm],
            ambiance: .init(
                primaryColor: "#2F5D3A",
                secondaryColor: "#C9A227",
                mood: "hushed and storybook"
            )
        )
        let blankSlate = World(
            id: .blankSlate,
            name: "Blank Slate",
            description: "A persistent scene for places made by players",
            backgroundAsset: "map.blankSlate",
            lightMusicTrack: "music.home.light",
            intenseMusicTrack: "music.home.intense",
            adjacentWorlds: [.home],
            ambiance: .init(
                primaryColor: "#EAF8FF",
                secondaryColor: "#C8E9D6",
                mood: "open and possible"
            )
        )
        // Art Garden stays off the overland graph on purpose — teleporter only.
        let artGarden = World(
            id: .artGarden,
            name: "Art Garden",
            description: "Terraced gardens, easels, and a Character Studio",
            backgroundAsset: "map.artGarden",
            lightMusicTrack: "music.home.light",
            intenseMusicTrack: "music.home.intense",
            adjacentWorlds: [],
            ambiance: .init(
                primaryColor: "#6FBF73",
                secondaryColor: "#F6D365",
                mood: "painterly and bright"
            )
        )
        let daddyCitadel = World(
            id: .evan,
            name: "Daddy's Citadel",
            description: "A glowing mountain base north of Home",
            backgroundAsset: "map.evan",
            lightMusicTrack: "music.home.light",
            intenseMusicTrack: "music.home.intense",
            adjacentWorlds: [.home],
            ambiance: .init(
                primaryColor: "#1B3A4B",
                secondaryColor: "#4FC3F7",
                mood: "bright and futuristic"
            )
        )
        worlds = [
            .home: home,
            .work: work,
            .farm: farm,
            .threeBears: threeBears,
            .blankSlate: blankSlate,
            .artGarden: artGarden,
            .evan: daddyCitadel,
        ]
        currentWorld = home
    }

    /// Print the registered contracts and the rigging, and shout about any
    /// scene that does not validate. Cheap, and it turns a silent mis-placement
    /// into a log line.
    private func auditRegisteredContent() {
        World2Diagnostics.report(
            "poi_registry_report",
            World2POIRegistry.contractReport()
        )
        World2Diagnostics.report(
            "scene_catalog_report",
            World2SceneCatalog.riggingReport()
        )
        let issues = World2SceneCatalog.validateAll()
        guard !issues.isEmpty else {
            World2Diagnostics.log("scene_catalog_validated", ["issues": "0"])
            return
        }
        for issue in issues {
            World2Diagnostics.log("scene_catalog_issue", ["detail": issue.description])
        }
        assertionFailure(
            "World 2 scene catalog has \(issues.count) issue(s); see the log."
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
        case .threeBearsHouse: return "three_bears_house"
        case .characterStudio: return "character_studio"
        case .sceneBuilder: return "scene_builder"
        case .worldTeleporter: return "world_teleporter"
        case .whizbang: return "whizbang"
        case .planningDept: return "planning_dept"
        case .sceneCreator(let instanceID): return "scene_creator:\(instanceID)"
        case .beacon(let instanceID): return "beacon:\(instanceID)"
        case .daddyWelcome: return "daddy_welcome"
        }
    }
}
