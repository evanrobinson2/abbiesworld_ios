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
    case figurineExplorer
    case sceneBuilder
    case worldTeleporter
    case whizbang
    case planningDept
    case plink
    /// Peg Monastery — math challenge for Plink power-ups.
    case pegMonastery
    /// FTL-style Marble Voyage — branching map + Plink fights, HP only from heals.
    case marbleVoyage
    case sceneCreator(instanceID: String)
    case beacon(instanceID: String)
    /// Daddy's Citadel POI — welcome plate + always a candy or hug.
    case daddyWelcome
    /// Interior plates named by the world document for one place.
    case rooms(poiId: String)
}

/// A place the player has tapped on the map, paired with the instance they
/// tapped so the drawer can talk about this one rather than the archetype.
struct POIInspection: Identifiable {
    let id: String
    let poi: World2POIArchetype
    let instance: World2POIInstance
}

/// One thing the player can do in the current zone. Tiles stack by the
/// right thumb; tapping a tile goes there.
struct World2ZoneInteraction: Identifiable, Equatable {
    enum Kind: Equatable {
        case poi(archetypeID: String)
        case planted(instanceID: String)
        case world(WorldId)
        /// Cardinal exit to another document / Peglin scene (not a map POI).
        case documentTravel(sceneID: String)
    }

    let id: String
    let title: String
    let actionTitle: String
    let asset: String
    let icon: String
    let kind: Kind
}

/// A reward worth interrupting the game for. Presented over everything so a
/// six year old cannot miss that she just earned something.
struct World2RewardCelebration: Identifiable, Equatable {
    let id: String
    let decoration: World2StoryDecoration
    let headline: String
    let earnedPerfectly: Bool
}

/// Invent & Carve finished: toast + sticky CTA to open decorate for that scene.
struct World2InventReadyPrompt: Identifiable, Equatable {
    let id: String
    let sceneName: String
    let sceneID: String
    let count: Int
    let highlightInstanceID: String?
    let target: World2DecorateTarget

    var toastLine: String {
        "\(count) ready for \(sceneName)"
    }

    var decorateButtonTitle: String {
        target.decorateButtonTitle
    }
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
        lastEvent = event
        lastDetails = details.isEmpty ? nil : details
        logger.notice("\(message, privacy: .public)")
        print("[World2] \(message)")
    }

    /// Most recent public diagnostic, so a debug ticket can name the last beat.
    static private(set) var lastEvent: String?
    static private(set) var lastDetails: String?

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
    /// Scene the player walked to. Nil means the document's active scene.
    @Published private(set) var walkedSceneID: String?
    @Published private(set) var currentMutableSceneID =
        World2PlacedPlaceInstance.blankSlateSceneID
    @Published private(set) var isIntroBootstrapReady = false
    @Published var inspectedPOI: POIInspection?
    @Published var showingPOISheet = false
    @Published var toastMessage: String?
    /// Set only when a scanned debug ticket asks the root view to open or close a cover.
    @Published var debugPresentationRequest: World2DebugPresentationRequest?
    @Published var rewardCelebration: World2RewardCelebration?
    /// Sticky banner after Invent & Carve — toast alone is too easy to miss.
    @Published var inventReadyPrompt: World2InventReadyPrompt?
    /// Place-inventory item armed for planting on the open map / mutable scene.
    @Published var selectedPlaceInventoryItemID: String?
    /// The inventory item the treehouse drawer should open on next. Set when a
    /// reward lands so "Show me!" can point straight at it.
    @Published private(set) var inventoryHighlightID: String?
    /// Prefer this treehouse room when opening decorate after invent.
    @Published private(set) var pendingTreehouseRoom: TreehouseRoomID?
    /// Full invent→decorate destination (scene, POI, or treehouse room).
    @Published private(set) var pendingDecorateTarget: World2DecorateTarget?
    /// Bumped when decorate-from-invent fires while already inside the treehouse
    /// (setScreen alone won't re-run `onAppear`).
    @Published private(set) var inventDecorateTick: Int = 0
    /// Bumped when decorate should open on whatever screen is up (POI interiors, minigames, …).
    @Published private(set) var anywhereDecorateTick: Int = 0
    /// Daddy's interior listens for this — the root overlay does not cover that plate.
    @Published private(set) var daddyHomeDecorateTick: Int = 0
    @Published var anywhereDecorateSurfaceKey: String?
    @Published var anywhereDecorateName: String = "Here"
    /// Bumped when an overland / mutable scene should enter decorate mode.
    @Published private(set) var sceneDecorateTick: Int = 0
    @Published var shouldStartSceneDecorating = false
    /// Sandbox tool-rail requests (RootView → active map/mutable scene).
    /// True while the sledge on the tool rail has Build turned on.
    @Published var isSandboxBuilding = false
    @Published private(set) var sandboxInventTick: Int = 0
    @Published var showingInventHistory = false
    /// Bumped when an owner toggles decorate-for-all so the rail refreshes.
    @Published private(set) var decorateAccessRevision: Int = 0

    private(set) var worlds: [WorldId: World] = [:]
    private(set) var ingredientCatalog: IngredientCatalog = .factoryCatalog
    private var mutableSceneBackStack: [String] = []
    private var pendingDebugTicket: World2DebugTicket?

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
    /// Place-inventory POIs planted on the map the player is standing in.
    var currentAuthoredMapPlaces: [World2PlacedPlaceInstance] {
        playerService.placedPlaces(in: playSceneID)
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
        sceneGraph.scene(playSceneID)
    }

    /// Compiled worlds use `world.home`. A signed-in document uses `scene.home`.
    var playSceneID: String {
        if World2WorldSync.shared.usesServerDocument {
            return walkedSceneID
                ?? World2WorldSync.shared.activeSceneID
                ?? World2SceneDefinition.blankSlateSceneID
        }
        return (currentWorld?.id ?? .home).sceneID
    }

    var currentSceneInstances: [World2POIInstance] {
        currentScene.instancesInDrawOrder
    }

    /// Places and exits in the zone the player is standing in.
    /// Travel destinations are cardinal exits (destination plate), never POI tiles.
    var zoneInteractions: [World2ZoneInteraction] {
        var items: [World2ZoneInteraction] = []
        for instance in currentSceneInstances {
            guard let archetype = World2POIRegistry.archetype(instance.archetypeID) else {
                continue
            }
            if case .travel = archetype.contract.route {
                continue
            }
            items.append(
                World2ZoneInteraction(
                    id: instance.id,
                    title: archetype.name,
                    actionTitle: archetype.callToAction,
                    asset: archetype.exteriorAsset,
                    icon: archetype.icon,
                    kind: .poi(archetypeID: archetype.id)
                )
            )
        }
        for planted in currentAuthoredMapPlaces {
            let template = World2PlaceTemplate.template(for: planted.templateID)
            items.append(
                World2ZoneInteraction(
                    id: planted.id,
                    title: planted.mapLabel,
                    actionTitle: "Go in",
                    asset: template.exteriorAsset,
                    icon: template.fallbackIcon,
                    kind: .planted(instanceID: planted.id)
                )
            )
        }
        for exit in documentTravelExits {
            items.append(exit)
        }
        if !World2WorldSync.shared.usesServerDocument, let world = currentWorld {
            for worldID in travelDestinations(from: world.id) {
                guard let destination = worlds[worldID] else { continue }
                items.append(
                    World2ZoneInteraction(
                        id: worldID.rawValue,
                        title: destination.name,
                        actionTitle: "Go there",
                        asset: destination.backgroundAsset,
                        icon: "arrow.right.circle.fill",
                        kind: .world(worldID)
                    )
                )
            }
        }
        return items
    }

    /// Cardinal exits on the play map — arrow + destination scene thumbnail.
    var mapTravelExits: [World2MapTravelExit] {
        World2MapTravelExit.build(
            connectors: worldGraph.connectors(from: playSceneID),
            travelPads: travelPadsOnCurrentScene,
            presentation: travelDestinationPresentation(for:)
        )
    }

    /// Cardinal travel exits for the thumb drawer — destination map plate, not path token.
    private var documentTravelExits: [World2ZoneInteraction] {
        mapTravelExits.map { exit in
            World2ZoneInteraction(
                id: "travel.\(exit.destinationSceneID)",
                title: exit.title,
                actionTitle: "Go \(exit.direction.displayName.lowercased())",
                asset: exit.plateAsset,
                icon: exit.direction.symbolName,
                kind: .documentTravel(sceneID: exit.destinationSceneID)
            )
        }
    }

    private var travelPadsOnCurrentScene: [(destinationSceneID: String, x: Double, y: Double)] {
        currentSceneInstances.compactMap { instance in
            guard let archetype = World2POIRegistry.archetype(instance.archetypeID),
                  case .travel(let sceneID) = archetype.contract.route
            else { return nil }
            return (
                destinationSceneID: sceneID,
                x: instance.transform.position.x,
                y: instance.transform.position.y
            )
        }
    }

    /// Title + scene plate for a travel destination (draft world, then catalog).
    func travelDestinationPresentation(for sceneID: String) -> (title: String, plateAsset: String) {
        let scene = sceneGraph.draftScenes[sceneID] ?? World2SceneCatalog.scene(sceneID)
        let land = PeglinEdition.Land.allCases.first { $0.sceneID == sceneID }
        let title = scene?.name
            ?? land?.displayName
            ?? worldGraph.snapshot(currentSceneID: playSceneID).node(for: sceneID)?.name
            ?? sceneID
        let plate = {
            let fromScene = scene?.backgroundAsset.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            if !fromScene.isEmpty { return fromScene }
            if let map = land?.mapAsset, !map.isEmpty { return map }
            // Last resort: travel pad art that already points at this land.
            if let padArt = currentSceneInstances.compactMap({ instance -> String? in
                guard let archetype = World2POIRegistry.archetype(instance.archetypeID),
                      case .travel(let dest) = archetype.contract.route,
                      dest == sceneID
                else { return nil }
                return archetype.exteriorAsset
            }).first, !padArt.isEmpty {
                return padArt
            }
            return ""
        }()
        return (title, plate)
    }

    func performZoneInteraction(_ item: World2ZoneInteraction) {
        switch item.kind {
        case .poi(let archetypeID):
            guard let archetype = World2POIRegistry.archetype(archetypeID) else {
                showToast("That place is not registered yet.")
                return
            }
            enterPOI(archetype)
        case .planted(let instanceID):
            enterPlacedPlace(instanceID)
        case .world(let worldID):
            switchWorld(to: worldID)
        case .documentTravel(let sceneID):
            travelToDocumentScene(sceneID)
        }
    }

    var currentSceneOpenHardpoints: [World2SceneHardpoint] {
        currentScene.openHardpoints
    }

    /// Overland graph for the HUD minimap and Planning Dept.
    var worldGraphSnapshot: World2WorldGraphSnapshot {
        worldGraph.snapshot(currentSceneID: playSceneID)
    }

    /// Neighbours from the tunnel graph (falls back to authored adjacency).
    func travelDestinations(from worldID: WorldId) -> [WorldId] {
        if World2WorldSync.shared.usesServerDocument { return [] }
        let fromGraph = worldGraph.adjacentWorldIDs(from: worldID)
        if !fromGraph.isEmpty { return fromGraph }
        return worlds[worldID]?.adjacentWorlds ?? []
    }

    /// Land on `/worlds/current`. Catalog worlds stay compiled-only.
    func adoptServerDocument() {
        guard World2WorldSync.shared.usesServerDocument else { return }
        let sync = World2WorldSync.shared
        worldGraph.loadFromDocument(
            scenes: Array(sceneGraph.draftScenes.values),
            places: sync.places,
            originSceneID: sync.activeSceneID
        )
        // Keep walked scene if it exists on the document, or is a Peglin compiled
        // scene (catalog fallback until MCP seed). Prefer Crash Land when Peglin
        // Edition is the product default so sync refresh cannot bounce to home.
        let valid = walkedSceneID.flatMap { id -> String? in
            if sceneGraph.draftScenes[id] != nil { return id }
            if id.hasPrefix("scene.peglin."), World2SceneCatalog.scene(id) != nil {
                return id
            }
            return nil
        }
        if PeglinEdition.isDefaultDestination {
            walkedSceneID = valid
                ?? (sceneGraph.draftScenes[PeglinEdition.crashLandSceneID] != nil
                    || World2SceneCatalog.scene(PeglinEdition.crashLandSceneID) != nil
                    ? PeglinEdition.crashLandSceneID
                    : nil)
                ?? sync.activeSceneID
                ?? sceneGraph.draftScenes.keys.sorted().first
        } else {
            walkedSceneID = valid
                ?? sync.activeSceneID
                ?? sceneGraph.draftScenes.keys.sorted().first
        }
        currentWorld = nil
    }

    init() {
        World2SceneGraphStoreHolder.store = sceneGraph
        assetService.objectWillChange
            .sink { [weak self] _ in
                guard let self else { return }
                self.objectWillChange.send()
                if World2WorldSync.shared.usesServerDocument {
                    self.applyMusic(for: self.currentScreen)
                }
            }
            .store(in: &cancellables)
        World2WorldSync.shared.objectWillChange
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
        World2WorldSync.shared.$documentGeneration
            .dropFirst()
            .sink { [weak self] _ in
                guard ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] == nil else {
                    return
                }
                self?.adoptServerDocument()
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
            for: .seconds(skipIntro ? 0 : 7)
        )
        async let worldDocument: Void = World2WorldSync.shared.pull()
        await assetService.bootstrap()
        await worldDocument
        adoptServerDocument()
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
        walkedSceneID = nil
        sceneGraph.selectPlayer(playerId)
        worldGraph.configure(worlds: worlds, playerID: playerId)
        currentMutableSceneID = World2PlacedPlaceInstance.blankSlateSceneID
        mutableSceneBackStack = []
        if World2WorldSync.shared.usesServerDocument {
            adoptServerDocument()
            if PeglinEdition.isDefaultDestination {
                enterPeglinEditionDefault()
            }
        } else {
            let start = PeglinEdition.isDefaultDestination ? WorldId.peglinEdition : .home
            playerService.setCurrentWorld(start)
            currentWorld = worlds[start]
            if start == .peglinEdition {
                PeglinEdition.log("user_entered", ["player": playerId.rawValue, "via": "compiled"])
                PeglinEdition.log("scene_loaded", ["scene": PeglinEdition.crashLandSceneID])
            }
        }
        setScreen(.homeWorld, reason: "player_selected")
        World2Diagnostics.log("player_selected", ["player": playerId.rawValue])
    }

    /// Prefer Crash Land plate (MVP: Peg Monastery → north to Fox).
    private func enterPeglinEditionDefault() {
        let sync = World2WorldSync.shared
        playerService.setCurrentWorld(.peglinEdition)
        currentWorld = worlds[.peglinEdition]
        let startID = sync.activeSceneID
            ?? PeglinEdition.crashLandSceneID
        walkedSceneID = startID
        let via: String
        if sceneGraph.draftScenes[startID] != nil {
            via = "document"
        } else if World2SceneCatalog.scene(startID) != nil {
            via = "catalog_fallback"
        } else {
            via = "missing"
        }
        PeglinEdition.log(
            "user_entered",
            [
                "scene": startID,
                "via": via,
                "server_active": sync.activeSceneID ?? "nil",
            ]
        )
        PeglinEdition.log("scene_loaded", ["scene": startID])
    }

    func acceptPendingWorldUpdate() {
        let applied = World2WorldSync.shared.acknowledgeWorldNotices()
        if applied != nil {
            applyWorldUpdateInPlace()
        }
    }

    func dismissWorldWhatsNew() {
        World2WorldSync.shared.acknowledgeWorldNotices()
    }

    func applyWorldUpdateInPlace() {
        isSandboxBuilding = false
        adoptServerDocument()
        if let inspected = inspectedPOI,
           currentScene.instance(inspected.id) == nil {
            dismissPOIInspection()
            if currentScreen != .homeWorld, currentScreen != .loading, currentScreen != .playerSelect {
                setScreen(.homeWorld, reason: "world_update")
            }
        }
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
        // Travel is a cardinal exit, not a place you "enter".
        if case .travel(let sceneID) = archetype.contract.route {
            travelToDocumentScene(sceneID)
            return
        }
        inspectedPOI = POIInspection(
            id: instance.id,
            poi: archetype,
            instance: instance
        )
        showingPOISheet = true
        World2WorldSync.shared.markSeen(instance.id)
        World2WorldSync.shared.markSeen(instance.archetypeID)
        party.walkToPOI(at: instance.transform.position)
        if archetype.id.hasPrefix("poi.peglin.") {
            PeglinEdition.log(
                "poi_approached",
                [
                    "poi": archetype.id,
                    "token": archetype.exteriorAsset,
                    "x": String(format: "%.3f", instance.transform.position.x),
                    "y": String(format: "%.3f", instance.transform.position.y),
                ]
            )
        }
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
            if let archetype = World2POIRegistry.archetype(instance.archetypeID),
               case .travel = archetype.contract.route {
                continue
            }
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
        if World2WorldSync.shared.usesServerDocument {
            if sceneGraph.draftScenes[worldId.sceneID] != nil {
                travelToDocumentScene(worldId.sceneID)
            } else {
                showToast("That land is not in this world.")
            }
            return
        }
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
        if archetype.id.hasPrefix("poi.peglin.") {
            PeglinEdition.log(
                "poi_entered",
                ["poi": archetype.id, "route": String(describing: archetype.route)]
            )
        }
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
        case .figurineExplorer:
            setScreen(.figurineExplorer, reason: "poi_entered")
        case .sceneBuilder:
            setScreen(.sceneBuilder, reason: "poi_entered")
        case .whizbang:
            setScreen(.whizbang, reason: "poi_entered")
        case .planningDept:
            setScreen(.planningDept, reason: "poi_entered")
        case .plink:
            setScreen(.plink, reason: "poi_entered")
        case .pegMonastery:
            setScreen(.pegMonastery, reason: "poi_entered")
        case .travel(let sceneID):
            travelToDocumentScene(sceneID)
        case .rooms:
            setScreen(.rooms(poiId: archetype.id), reason: "poi_entered")
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

    /// Destinations the teleporter can send you to. Signed-in play lists the
    /// pulled document; otherwise every compiled world, including Art Garden.
    var teleporterDestinations: [World2TeleporterDestination] {
        if World2WorldSync.shared.usesServerDocument {
            var destinations = sceneGraph.draftScenes.values
                .sorted { $0.name < $1.name }
                .map {
                    World2TeleporterDestination(
                        id: $0.id,
                        name: $0.name,
                        summary: $0.summary
                    )
                }
            // Peglin lands ship compiled until MCP seed — still list them.
            for land in PeglinEdition.Land.allCases
            where !destinations.contains(where: { $0.id == land.sceneID }) {
                destinations.append(
                    World2TeleporterDestination(
                        id: land.sceneID,
                        name: land.displayName,
                        summary: land.summary
                    )
                )
            }
            return destinations.sorted { $0.name < $1.name }
        }
        return WorldId.allCases.compactMap { worlds[$0] }.map {
            World2TeleporterDestination(
                id: $0.id.rawValue,
                name: $0.name,
                summary: $0.description
            )
        }
    }

    func travelViaTeleporter(to destinationID: String) {
        if World2WorldSync.shared.usesServerDocument {
            travelToDocumentScene(destinationID)
            World2Diagnostics.log("teleporter_travel", ["scene": destinationID])
            return
        }
        guard let worldId = WorldId(rawValue: destinationID), worlds[worldId] != nil else {
            showToast("That world is still being built.")
            return
        }
        switchWorld(to: worldId)
        World2Diagnostics.log(
            "teleporter_travel",
            ["world": worldId.rawValue]
        )
    }

    /// Walk to a scene that is already in the pulled document.
    func travelToDocumentScene(_ sceneID: String) {
        let onDocument = World2WorldSync.shared.usesServerDocument
            && sceneGraph.draftScenes[sceneID] != nil
        let peglinCatalog = sceneID.hasPrefix("scene.peglin.")
            && World2SceneCatalog.scene(sceneID) != nil
        guard onDocument || peglinCatalog else {
            PeglinEdition.log("scene_transition_failure", ["scene": sceneID, "reason": "missing"])
            showToast("That place is not on the map yet.")
            return
        }
        if sceneID.hasPrefix("scene.peglin.") || playSceneID.hasPrefix("scene.peglin.") {
            PeglinEdition.noteTravel(from: playSceneID, to: sceneID)
        }
        walkedSceneID = sceneID
        dismissPOIInspection()
        PeglinEdition.log("scene_loaded", ["scene": sceneID, "via": "travel"])
        setScreen(.homeWorld, reason: "document_travel")
    }

    /// Thumb-menu / map pick: select the landmark and walk Abbie there.
    /// Entering the place is a separate confirm (second tap / Place badge Enter).
    func selectZoneInteraction(_ item: World2ZoneInteraction) {
        switch item.kind {
        case .poi(let archetypeID):
            if let instance = currentSceneInstances.first(where: { $0.id == item.id })
                ?? currentSceneInstances.first(where: { $0.archetypeID == archetypeID }) {
                inspectPOI(instance: instance)
                return
            }
            showToast("That place is not on this map.")
        case .planted(let instanceID):
            guard let planted = currentAuthoredMapPlaces.first(where: { $0.id == instanceID }) else {
                showToast("That place is not on this map.")
                return
            }
            World2WorldSync.shared.markSeen(instanceID)
            party.walkToPOI(at: World2NormalizedPoint(x: planted.x, y: planted.y))
            World2Diagnostics.log("planted_selected", ["instance": instanceID])
        case .world, .documentTravel:
            // Selection only — second thumb tap / confirm enters.
            World2Diagnostics.log(
                "zone_travel_selected",
                ["id": item.id, "kind": String(describing: item.kind)]
            )
        }
    }

    /// Open the tonight FTL + Peglin voyage mode.
    func startMarbleVoyage() {
        setScreen(.marbleVoyage, reason: "marble_voyage_start")
        PeglinEdition.log("voyage_opened", ["seed": "tonight"])
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

    func consumePendingTreehouseRoom() -> TreehouseRoomID? {
        let room = pendingTreehouseRoom
        pendingTreehouseRoom = nil
        return room
    }

    /// Call after Invent & Carve awards props so the player gets a toast + path back.
    func notifySceneInventReady(_ result: World2SceneInventResult) {
        guard result.addedCount > 0 else {
            showToast(result.awarded.isEmpty
                ? "Carve failed — try Invent again."
                : "Those props didn’t land in inventory.")
            return
        }
        let target = World2DecorateTarget.fromInvent(
            sceneID: result.sceneID,
            sceneName: result.sceneName
        )
        let firstDecorationID = result.awarded.first?.id
        let highlight = playerService.currentPlayer?.decorations
            .first(where: { $0.decorationId == firstDecorationID })?.id
        inventoryHighlightID = highlight
        pendingDecorateTarget = target
        if case .treehouseRoom(let room) = target {
            pendingTreehouseRoom = room
        } else {
            pendingTreehouseRoom = nil
        }
        inventReadyPrompt = World2InventReadyPrompt(
            id: "invent-\(result.sceneID)-\(result.picturesReady)-\(Int(Date().timeIntervalSince1970))",
            sceneName: result.sceneName,
            sceneID: result.sceneID,
            count: max(result.picturesReady, 1),
            highlightInstanceID: highlight,
            target: target
        )
        World2SceneDecorationInventService.shared.acknowledgeCook()
        showToast(inventReadyPrompt?.toastLine ?? "Props ready!", seconds: 5)
        World2Diagnostics.log(
            "scene_invent_ready_prompt",
            [
                "scene": result.sceneID,
                "count": "\(result.picturesReady)",
                "target": target.displayName,
            ]
        )
    }

    func dismissInventReadyPrompt() {
        inventReadyPrompt = nil
    }

    func consumeStartSceneDecoratingFlag() -> Bool {
        let value = shouldStartSceneDecorating
        shouldStartSceneDecorating = false
        return value
    }

    func consumePendingDecorateTarget() -> World2DecorateTarget? {
        let target = pendingDecorateTarget
        pendingDecorateTarget = nil
        return target
    }

    /// CTA from invent toast/banner: open the decorate surface for that carve.
    func openDecorateFromInvent() {
        let target = inventReadyPrompt?.target
            ?? pendingDecorateTarget
            ?? .treehouseRoom(.default)
        inventReadyPrompt = nil
        pendingDecorateTarget = target
        navigateToDecorate(target)
    }

    /// Enter decorate mode for the scene/POI/room currently under the player.
    func beginDecoratingCurrentSurface() {
        switch currentScreen {
        case .treehouse:
            shouldStartDecorating = true
            inventDecorateTick += 1
        case .blankSlate:
            shouldStartSceneDecorating = true
            sceneDecorateTick += 1
        case .homeWorld:
            let scene = currentScene
            pendingDecorateTarget = .scene(
                sceneID: scene.id,
                name: scene.name,
                worldID: currentWorld?.id
            )
            shouldStartSceneDecorating = true
            sceneDecorateTick += 1
        case .daddyWelcome:
            daddyHomeDecorateTick += 1
        default:
            beginDecoratingAnywhere()
        }
    }

    /// Decorate the plate you're standing on. No owner lock, no teleport to Cozy Nook.
    func beginDecoratingAnywhere() {
        let surface = decorateSurface(for: currentScreen)
        anywhereDecorateSurfaceKey = surface.key
        anywhereDecorateName = surface.name
        pendingDecorateTarget = .poiInterior(poiId: surface.key, name: surface.name)
        anywhereDecorateTick += 1
        World2Diagnostics.log(
            "decorate_anywhere",
            ["screen": currentScreen.diagnosticName, "surface": surface.key]
        )
    }

    func decorateSurface(for screen: World2Screen) -> (key: String, name: String) {
        switch screen {
        case .daddyWelcome:
            return (World2DecorateSurface.key(forPOI: World2POIRegistry.evanHomeID), "Daddy's Citadel")
        case .treehouse(let poiId):
            let name = World2POIRegistry.archetype(poiId)?.name ?? "Room"
            return (World2DecorateSurface.key(forPOI: poiId), name)
        case .homeWorld:
            let scene = currentScene
            return (
                World2DecorateSurface.key(forScene: scene.id),
                scene.name
            )
        case .blankSlate:
            return (
                World2DecorateSurface.key(forScene: currentMutableSceneID),
                currentMutableScene.name
            )
        default:
            return (
                World2DecorateSurface.key(forScene: screen.diagnosticName),
                screen.diagnosticName.replacingOccurrences(of: "_", with: " ")
            )
        }
    }

    func inventSceneForCurrentScreen() -> World2SceneDefinition {
        let surface = decorateSurface(for: currentScreen)
        return World2SceneDefinition(
            id: surface.key,
            name: surface.name,
            summary: "Props carved for \(surface.name)",
            backgroundAsset: inventPlateAsset(for: currentScreen),
            isMutableByPlayer: true
        )
    }

    func inventPlateAsset(for screen: World2Screen) -> String {
        switch screen {
        case .daddyWelcome:
            return "poi.evanHome.interior"
        case .treehouse(let poiId):
            return World2POIRegistry.archetype(poiId)?.interiorAsset ?? poiId
        case .rooms(let poiId):
            let place = World2WorldSync.shared.places.first { $0.id == poiId }
            return place?.rooms?.first?.image
                ?? place?.interiorAsset
                ?? currentScene.backgroundAsset
        case .homeWorld, .blankSlate, .loading, .playerSelect:
            return currentScene.backgroundAsset
        default:
            let name = screen.diagnosticName
            return World2POIRegistry.all.first { archetype in
                let route = archetype.contract.route.diagnosticName
                return name == route || name.hasPrefix(route + ":")
            }?.interiorAsset ?? currentScene.backgroundAsset
        }
    }

    func toggleSandboxBuild() {
        isSandboxBuilding.toggle()
    }

    func requestSandboxInvent() {
        sandboxInventTick += 1
    }

    func openInventHistory() {
        showingInventHistory = true
    }

    /// Jump back to decorate for a past invent without re-minting.
    func reopenInventResult(_ result: World2SceneInventResult) {
        let target = World2DecorateTarget.fromInvent(
            sceneID: result.sceneID,
            sceneName: result.sceneName
        )
        pendingDecorateTarget = target
        if case .treehouseRoom(let room) = target {
            pendingTreehouseRoom = room
        }
        let firstDecorationID = result.awarded.first?.id
        inventoryHighlightID = playerService.currentPlayer?.decorations
            .first(where: { $0.decorationId == firstDecorationID })?.id
        inventReadyPrompt = nil
        navigateToDecorate(target)
    }

    private func navigateToDecorate(_ target: World2DecorateTarget) {
        switch target {
        case .treehouseRoom(let room):
            pendingTreehouseRoom = room
            if case .treehouse = currentScreen {
                shouldStartDecorating = true
                inventDecorateTick += 1
            } else {
                openCurrentPlayerTreehouse(startDecorating: true)
            }

        case .scene(let sceneID, _, let worldID):
            if World2WorldSync.shared.usesServerDocument {
                travelToDocumentScene(sceneID)
            } else if let worldID, currentWorld?.id != worldID {
                switchWorld(to: worldID)
            } else if case .homeWorld = currentScreen {
                // Already on an overland map — bump decorate in place.
            } else if let worldID {
                switchWorld(to: worldID)
            } else {
                setScreen(.homeWorld, reason: "decorate_scene_\(sceneID)")
            }
            shouldStartSceneDecorating = true
            sceneDecorateTick += 1

        case .mutableScene(let sceneID, _):
            if currentMutableSceneID != sceneID {
                mutableSceneBackStack.append(currentMutableSceneID)
                currentMutableSceneID = sceneID
            }
            currentWorld = worlds[.blankSlate] ?? currentWorld
            playerService.setCurrentWorld(.blankSlate)
            if currentScreen != .blankSlate {
                setScreen(.blankSlate, reason: "decorate_mutable_\(sceneID)")
            }
            shouldStartSceneDecorating = true
            sceneDecorateTick += 1

        case .poiInterior(let poiId, let name):
            let resolved = poiId == World2POIRegistry.evanHomeID
                || poiId.hasSuffix(World2POIRegistry.evanHomeID)
            if resolved {
                if currentScreen != .daddyWelcome {
                    setScreen(.daddyWelcome, reason: "decorate_daddy_lair")
                }
                daddyHomeDecorateTick += 1
                return
            }
            let key = (poiId.hasPrefix("poi.") || poiId.hasPrefix("scene."))
                ? poiId
                : World2DecorateSurface.key(forPOI: poiId)
            anywhereDecorateSurfaceKey = key
            anywhereDecorateName = name
            anywhereDecorateTick += 1
        }
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
        setScreen(.planningDept, reason: "scene_editor")
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
        _ = poiId
        return false
    }

    var currentDecorateSurfaceKey: String {
        decorateSurface(for: currentScreen).key
    }

    var ownsCurrentDecorateSurface: Bool {
        guard let me = currentPlayerId?.rawValue else { return false }
        return ownerID(forSurface: currentDecorateSurfaceKey) == me
    }

    var isDecorateOpenToAll: Bool {
        _ = decorateAccessRevision
        return World2DecorateAccessStore.shared.isOpenToAll(currentDecorateSurfaceKey)
    }

    func toggleDecorateForAll() {
        guard ownsCurrentDecorateSurface else { return }
        let key = currentDecorateSurfaceKey
        let next = !World2DecorateAccessStore.shared.isOpenToAll(key)
        World2DecorateAccessStore.shared.setOpenToAll(key, next)
        decorateAccessRevision += 1
        showToast(next
            ? "Decorate is open for everyone here."
            : "Decorate is owner-only again.")
        World2Diagnostics.log(
            "decorate_for_all",
            ["surface": key, "open": "\(next)", "player": currentPlayerId?.rawValue ?? "none"]
        )
    }

    func canCurrentPlayerDecorate() -> Bool {
        canDecorate(surfaceKey: currentDecorateSurfaceKey)
    }

    private func canDecorate(surfaceKey: String) -> Bool {
        guard let me = currentPlayerId?.rawValue else { return false }
        guard let owner = ownerID(forSurface: surfaceKey) else {
            return true
        }
        if owner == me { return true }
        return World2DecorateAccessStore.shared.isOpenToAll(surfaceKey)
    }

    private func ownerID(forSurface key: String) -> String? {
        if let poiId = World2DecorateSurface.poiID(from: key) {
            return World2POIRegistry.archetype(poiId)?.ownerID
        }
        guard let sceneID = World2DecorateSurface.sceneID(from: key) else {
            return nil
        }
        if sceneID == WorldId.evan.sceneID { return PlayerId.evan.rawValue }
        if sceneID == WorldId.home.sceneID { return PlayerId.abbie.rawValue }
        if let created = sceneGraph.scene(sceneID).createdByPlayerID, !created.isEmpty {
            return created
        }
        return nil
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

    // MARK: - Fox Land MVP reward

    /// Hand over the Fox Trophy after clearing the Fox Spirit board.
    func completeFoxSpiritVictory() {
        let trophy = World2StoryDecoration.foxTrophy
        guard let instance = playerService.awardStoryDecoration(trophy) else {
            showToast("Choose a player before playing.")
            return
        }
        playerService.markPOICompleted(PeglinEdition.foxGuardianID)
        playerService.incrementMinigamesCompleted()
        playerService.addGems(6)
        inventoryHighlightID = instance.id
        rewardCelebration = World2RewardCelebration(
            id: instance.id,
            decoration: trophy,
            headline: "FOX SPIRIT VANQUISHED!",
            earnedPerfectly: true
        )
        World2Diagnostics.log(
            "peglin_fox_trophy_awarded",
            [
                "instance": instance.id,
                "player": currentPlayerId?.rawValue ?? "none",
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
        switch currentScreen {
        case .threeBearsHouse, .plink:
            exitPOI()
        default:
            break
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

    func showToast(_ message: String, seconds: Double = 3) {
        toastMessage = message
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(seconds))
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
        } else if arguments.contains("-launchMarbleVoyage")
                    || arguments.contains("-launchWorld2MarbleVoyage") {
            selectPlayer(directPlayer)
            setScreen(.marbleVoyage, reason: "direct_launch")
        } else if arguments.contains("-launchPlink")
                    || arguments.contains("-autoPlayPlink")
                    || arguments.contains("-launchWorld2Plink") {
            selectPlayer(directPlayer)
            if World2WorldSync.shared.usesServerDocument {
                travelToDocumentScene("scene.legoCitadel")
            }
            setScreen(.plink, reason: "direct_launch")
        } else if arguments.contains("-launchWorld2PeggleLand") {
            selectPlayer(directPlayer)
            if World2WorldSync.shared.usesServerDocument {
                travelToDocumentScene("scene.legoCitadel")
            }
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
        flushPendingDebugTicket()
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
        case .loading:
            return
        case .playerSelect:
            songID = "world2_abbies_world"
        case .homeWorld:
            if World2WorldSync.shared.usesServerDocument {
                let track = sceneGraph.scene(playSceneID).musicTrackID
                songID = (track?.isEmpty == false) ? track : nil
            } else {
                songID = worldSongID(currentWorld?.id ?? .home)
            }
        case .rooms(let poiId):
            songID = World2WorldSync.shared.places.first { $0.id == poiId }?.musicTrackID
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
        case .figurineExplorer:
            songID = World2POIRegistry.figurineExplorer.musicTrackID
        case .sceneBuilder:
            songID = World2POIRegistry.sceneBuilder.musicTrackID
        case .whizbang:
            songID = World2POIRegistry.whizbang.musicTrackID
        case .planningDept:
            songID = World2POIRegistry.planningDept.musicTrackID
        case .plink:
            // Board fight: rotate the Peglin battle cuts (Cheerful ↔ Electronic).
            songID = "plink_cheerful_khorovod"
        case .pegMonastery:
            songID = World2POIRegistry.peglinPegMonastery.musicTrackID
        case .marbleVoyage:
            songID = "plink_electronic_folk_dance"
        case .worldTeleporter:
            songID = "world2_cliffside_morning"
        case .daddyWelcome:
            songID = World2POIRegistry.treehouse(for: .evan).musicTrackID
        }
        World2MusicService.shared.stop()
        let resolved = resolvedSongID(songID, screen: screen)
        if let resolved, !resolved.isEmpty {
            MusicService.shared.playSong(id: resolved)
        } else {
            MusicService.shared.stop()
        }
        World2Diagnostics.log(
            "location_music",
            ["screen": screen.diagnosticName, "track": resolved ?? "silent"]
        )
    }

    private func resolvedSongID(_ songID: String?, screen: World2Screen) -> String? {
        // Prefer an explicit cue when the bundled/content playlist already knows it
        // (Peglin plink_* tracks + classic world2_*). Empty document songs[] used to
        // force silence for every server world — that was wrong.
        if let songID, !songID.isEmpty,
           MusicService.shared.playlist.contains(where: { $0.id == songID }) {
            return songID
        }
        guard World2WorldSync.shared.usesServerDocument else { return songID }
        let songs = World2WorldSync.shared.songs
        if let songID, songs.contains(where: { $0.id == songID || $0.file == songID }) {
            return songs.first { $0.id == songID || $0.file == songID }?.id
        }
        if let songID, !songID.isEmpty {
            return songID
        }
        switch screen {
        case .homeWorld, .playerSelect, .blankSlate, .daddyWelcome, .worldTeleporter:
            return songs.first?.id
                ?? MusicService.shared.playlist.first(where: { $0.id.hasPrefix("plink_") })?.id
                ?? MusicService.shared.playlist.first?.id
        default:
            return nil
        }
    }

    private func worldSongID(_ worldId: WorldId) -> String {
        switch worldId {
        case .home: return "world2_abbies_world"
        case .work: return "world2_working_song"
        case .farm: return "world2_bright_new_day"
        case .blankSlate: return "world2_cliffside_morning"
        case .threeBears: return "world2_family_adventure"
        case .artGarden: return "world2_joyful_bounce"
        case .evan: return "world2_glassy_bells"
        case .peglinEdition: return "plink_abbies_world"
        case .adventure: return "world2_joyful_bounce"
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
        let peglinEdition = World(
            id: .peglinEdition,
            name: PeglinEdition.displayName,
            description: "Crash-landed on a floating isle — wreck, battle, monastery, and a broken path",
            backgroundAsset: "map.peglin.crashLand",
            lightMusicTrack: "plink_abbies_world",
            intenseMusicTrack: "plink_fell_from_the_blue",
            adjacentWorlds: [],
            ambiance: .init(
                primaryColor: "#3D7A4A",
                secondaryColor: "#A8E063",
                mood: "strange but inviting"
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
            .peglinEdition: peglinEdition,
        ]
        currentWorld = PeglinEdition.isDefaultDestination ? peglinEdition : home
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
        // A signed-in document hides the compiled catalog, so those lookups
        // look missing. That is not a broken catalog, and it must not kill launch.
        guard !World2WorldSync.shared.usesServerDocument else {
            World2Diagnostics.log(
                "scene_catalog_not_authoritative",
                ["issues": "\(issues.count)"]
            )
            return
        }
        assertionFailure(
            "World 2 scene catalog has \(issues.count) issue(s); see the log."
        )
    }
}

extension World2Screen {
    var debugCode: String {
        switch self {
        case .loading: return "ld"
        case .playerSelect: return "ps"
        case .homeWorld: return "hm"
        case .blankSlate: return "bs"
        case .treehouse: return "th"
        case .cardFactory: return "cf"
        case .selfReplicatingFactory: return "srf"
        case .furnitureStore: return "fs"
        case .assetWorkbench: return "aw"
        case .creatureLab: return "cl"
        case .fallingTargets: return "ft"
        case .threeBearsHouse: return "tb"
        case .characterStudio: return "cs"
        case .figurineExplorer: return "fe"
        case .sceneBuilder: return "sb"
        case .worldTeleporter: return "wt"
        case .whizbang: return "wz"
        case .planningDept: return "pd"
        case .plink: return "pk"
        case .pegMonastery: return "pm"
        case .marbleVoyage: return "mv"
        case .sceneCreator: return "sc"
        case .beacon: return "bn"
        case .daddyWelcome: return "dw"
        case .rooms: return "rm"
        }
    }

    var debugRouteID: String? {
        switch self {
        case .treehouse(let poiId): return poiId
        case .selfReplicatingFactory(let instanceID): return instanceID
        case .fallingTargets(let configurationID): return configurationID
        case .sceneCreator(let instanceID): return instanceID
        case .beacon(let instanceID): return instanceID
        case .rooms(let poiId): return poiId
        default: return nil
        }
    }

    static func from(debugCode: String, routeID: String?) -> World2Screen? {
        switch debugCode {
        case "ld": return .loading
        case "ps": return .playerSelect
        case "hm": return .homeWorld
        case "bs": return .blankSlate
        case "th":
            guard let routeID, !routeID.isEmpty else { return nil }
            return .treehouse(poiId: routeID)
        case "cf": return .cardFactory
        case "srf":
            guard let routeID, !routeID.isEmpty else { return nil }
            return .selfReplicatingFactory(instanceID: routeID)
        case "fs": return .furnitureStore
        case "aw": return .assetWorkbench
        case "cl": return .creatureLab
        case "ft":
            guard let routeID, !routeID.isEmpty else { return nil }
            return .fallingTargets(configurationID: routeID)
        case "tb": return .threeBearsHouse
        case "cs": return .characterStudio
        case "fe": return .figurineExplorer
        case "sb": return .sceneBuilder
        case "wt": return .worldTeleporter
        case "wz": return .whizbang
        case "pd": return .planningDept
        case "pk": return .plink
        case "pm": return .pegMonastery
        case "mv": return .marbleVoyage
        case "sc":
            guard let routeID, !routeID.isEmpty else { return nil }
            return .sceneCreator(instanceID: routeID)
        case "bn":
            guard let routeID, !routeID.isEmpty else { return nil }
            return .beacon(instanceID: routeID)
        case "dw": return .daddyWelcome
        case "rm":
            guard let routeID, !routeID.isEmpty else { return nil }
            return .rooms(poiId: routeID)
        default: return nil
        }
    }
}

extension World2ViewModel {
    func debugReport(presentations: [String]) -> World2DebugReport {
        let player = playerService.currentPlayer
        let milestones = player?.progression.achievedMilestones ?? []
        return World2DebugReport(
            screen: currentScreen,
            playerID: player?.playerId,
            worldID: currentWorld?.id ?? player?.currentWorldId,
            sceneID: currentMutableSceneID,
            inspectedPOI: showingPOISheet ? inspectedPOI?.poi.id : nil,
            gems: player?.gems ?? 0,
            quest: milestones.last,
            error: playerService.error,
            toast: toastMessage,
            milestones: milestones,
            completedPOIs: player?.progression.completedPOIs ?? [],
            placeCount: player?.placedPlaces?.count ?? 0,
            createdSceneCount: playerService.createdScenes.count,
            inventoryCount: playerService.placeInventory.count,
            deckCount: player?.cardCollection.activeDeck.count ?? 0,
            presentations: presentations,
            lastEvent: World2Diagnostics.lastEvent,
            lastEventDetails: World2Diagnostics.lastDetails
        )
    }
}

extension World2ViewModel {
    /// Opens the page named by a scanned debug ticket. Does not restore the save.
    func applyDebugTicket(_ ticket: World2DebugTicket) {
        guard World2DebugOverlaySettings.shared.canApplyTickets else { return }
        guard currentScreen != .loading else {
            pendingDebugTicket = ticket
            return
        }
        applyDebugTicketNow(ticket)
    }

    func flushPendingDebugTicket() {
        guard let ticket = pendingDebugTicket else { return }
        pendingDebugTicket = nil
        applyDebugTicketNow(ticket)
    }

    private func applyDebugTicketNow(_ ticket: World2DebugTicket) {
        if let playerID = ticket.playerID, currentPlayerId != playerID {
            selectPlayer(playerID)
        }
        if let worldID = ticket.worldID, currentWorld?.id != worldID {
            switchWorld(to: worldID)
        }
        if ticket.screen == .blankSlate,
           let sceneID = ticket.sceneID,
           (sceneID == World2PlacedPlaceInstance.blankSlateSceneID
            || playerService.scene(sceneID) != nil) {
            currentMutableSceneID = sceneID
            mutableSceneBackStack = []
        }
        if let screen = ticket.screen, screen != .loading {
            dismissPOIInspection()
            setScreen(screen, reason: "debug_ticket")
        }
        if let poiID = ticket.inspectedPOI,
           let instance = currentSceneInstances.first(where: {
               $0.archetypeID == poiID || $0.id == poiID
           }) {
            inspectPOI(instance: instance)
        }
        debugPresentationRequest = World2DebugPresentationRequest(code: ticket.presentation)
    }
}

extension World2Screen {
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
        case .figurineExplorer: return "figurine_explorer"
        case .sceneBuilder: return "scene_builder"
        case .worldTeleporter: return "world_teleporter"
        case .whizbang: return "whizbang"
        case .planningDept: return "planning_dept"
        case .plink: return "plink"
        case .pegMonastery: return "peg_monastery"
        case .marbleVoyage: return "marble_voyage"
        case .sceneCreator(let instanceID): return "scene_creator:\(instanceID)"
        case .beacon(let instanceID): return "beacon:\(instanceID)"
        case .daddyWelcome: return "daddy_welcome"
        case .rooms(let poiId): return "rooms:\(poiId)"
        }
    }
}
