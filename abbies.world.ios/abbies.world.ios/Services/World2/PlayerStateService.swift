//
//  PlayerStateService.swift
//  abbies.world.ios
//
//  Player state management service for Abbie's World 2.
//  Handles persistence, syncing, and player progression.
//

import Foundation
import Combine

@MainActor
class PlayerStateService: ObservableObject {
    static let shared = PlayerStateService()
    private static let starterPOIFactoryMilestone = "place_factory_starter_received.v1"
    private static let starterWorldSeedMilestone = "place_world_seed_starter_received.v1"
    private static let worldTeleporterMilestone = "inventory.worldTeleporter.offered.v1"
    private static let playerStateSchemaVersion = 1

    private struct StoredPlayerState: Codable {
        let schemaVersion: Int
        let player: PlayerState
    }

    private enum PlayerLoadResult {
        case missing
        case loaded(PlayerState)
        case corrupt
    }
    
    private let apiClient = APIClient.shared
    private let legacyStateKey = "world2_player_state"
    private var cancellables = Set<AnyCancellable>()
    
    @Published private(set) var currentPlayer: PlayerState?
    @Published private(set) var isLoading = false
    @Published private(set) var isSyncing = false
    @Published var error: String?
    
    private init() {}
    
    var gems: Int { currentPlayer?.gems ?? 0 }
    var creatureIngredients: [IngredientInstance] { currentPlayer?.creatureIngredients ?? [] }
    var functionIngredients: [IngredientInstance] { currentPlayer?.functionIngredients ?? [] }
    var contextIngredients: [IngredientInstance] { currentPlayer?.contextIngredients ?? [] }
    var totalIngredients: Int { currentPlayer?.totalIngredientCount ?? 0 }
    var activeDeckCount: Int { currentPlayer?.activeDeckCount ?? 0 }
    var currentWorldId: WorldId { currentPlayer?.currentWorldId ?? .home }
    var furnitureInventory: [DecorationInstance] {
        currentPlayer?.furnitureInventory ?? []
    }
    var unplacedFurnitureInventory: [DecorationInstance] {
        currentPlayer?.unplacedFurnitureInventory ?? []
    }
    var furnitureIngredients: Int {
        currentPlayer?.availableFurnitureIngredientCount ?? 0
    }
    var placeInventory: [World2PlaceInventoryItem] {
        currentPlayer?.placeInventory ?? []
    }
    var placedPlaces: [World2PlacedPlaceInstance] {
        currentPlayer?.placedPlaces ?? []
    }
    var createdScenes: [World2MutableScene] {
        currentPlayer?.createdScenes ?? []
    }
    var sceneExits: [World2SceneExit] {
        currentPlayer?.sceneExits ?? []
    }

    @discardableResult
    func claimTreehouseStarterPack(for owner: PlayerId) -> FurnitureStarterPack? {
        guard var player = currentPlayer, player.playerId == owner else { return nil }
        let pack = FurnitureStarterPack.pack(for: owner)
        guard !player.progression.achievedMilestones.contains(pack.milestoneID) else {
            return nil
        }

        for (index, item) in pack.items.enumerated()
        where !player.decorations.contains(where: { $0.decorationId == item.id }) {
            player.decorations.append(
                DecorationInstance(
                    id: "starter_pack_\(owner.rawValue)_\(item.id)",
                    decorationId: item.id,
                    x: 0.32 + (Double(index) * 0.09),
                    y: item.placementLayer == .wall ? 0.38 : 0.70,
                    scale: item.defaultScale,
                    zIndex: index + 1,
                    badges: [.starter]
                )
            )
        }
        player.progression.achievedMilestones.append(pack.milestoneID)
        currentPlayer = player
        saveLocalState()
        return pack
    }
    
    @discardableResult
    func selectPlayer(_ playerId: PlayerId) -> Bool {
        let player: PlayerState
        switch loadPlayerState(for: playerId) {
        case .missing:
            player = PlayerState.newPlayer(id: playerId)
        case .loaded(let storedPlayer):
            player = Self.migrated(storedPlayer)
        case .corrupt:
            currentPlayer = nil
            error = "We couldn't safely open \(playerId.displayName)'s saved game. The original save was preserved."
            return false
        }

        var selectedPlayer = player
        error = nil
        selectedPlayer.lastPlayedAt = Date()
        currentPlayer = selectedPlayer
        saveLocalState()
        return true
    }

    func playerState(for playerId: PlayerId) -> PlayerState? {
        if currentPlayer?.playerId == playerId {
            return currentPlayer
        }
        switch loadPlayerState(for: playerId) {
        case .missing:
            return PlayerState.newPlayer(id: playerId)
        case .loaded(let player):
            return Self.migrated(player)
        case .corrupt:
            error = "We couldn't safely display \(playerId.displayName)'s saved treehouse."
            return nil
        }
    }

    func placedPlaces(in sceneID: String) -> [World2PlacedPlaceInstance] {
        placedPlaces
            .filter { $0.sceneID == sceneID }
            .sorted { $0.placedAt < $1.placedAt }
    }

    func scene(_ sceneID: String) -> World2MutableScene? {
        if sceneID == World2MutableScene.blankSlate.id {
            return .blankSlate
        }
        return createdScenes.first { $0.id == sceneID }
    }

    func exits(from sceneID: String) -> [World2SceneExit] {
        sceneExits
            .filter { $0.fromSceneID == sceneID }
            .sorted { $0.createdAt < $1.createdAt }
    }

    func availableHardpoints(in sceneID: String) -> [World2SceneHardpoint] {
        guard let scene = scene(sceneID) else { return [] }
        let occupied = Set(
            placedPlaces(in: sceneID).compactMap(\.hardpointID)
        )
        return scene.hardpoints.filter { !occupied.contains($0.id) }
    }

    @discardableResult
    func placeInventoryItem(
        _ itemID: String,
        in sceneID: String,
        x: Double,
        y: Double,
        hardpointID: String? = nil
    ) -> World2PlacedPlaceInstance? {
        guard var player = currentPlayer,
              let itemIndex = (player.placeInventory ?? []).firstIndex(
                where: { $0.id == itemID }
              ) else {
            return nil
        }

        var inventory = player.placeInventory ?? []
        let item = inventory[itemIndex]
        let mutable = scene(sceneID)

        // Mutable player scenes take freehand / pad placement. Authored overland
        // maps (Home, Daddy's Citadel, …) accept World Seeds and placeable POIs
        // onto open scene-graph pads — that is how a factory lands in Daddy's world.
        let target: (x: Double, y: Double, hardpointID: String?)
        if let mutable {
            let allowedOnImmutable =
                item.templateID == .worldSeed
                || Self.canPlantOnAuthoredMap(item.templateID)
            guard mutable.isMutableByPlayer || allowedOnImmutable else {
                return nil
            }
            if mutable.hardpoints.isEmpty {
                target = (
                    min(max(x, 0.10), 0.90),
                    min(max(y, 0.24), 0.86),
                    nil
                )
            } else {
                guard let hardpointID,
                      let hardpoint = availableHardpoints(in: sceneID).first(
                        where: { $0.id == hardpointID }
                      ) else {
                    return nil
                }
                target = (hardpoint.x, hardpoint.y, hardpoint.id)
            }
        } else if Self.canPlantOnAuthoredMap(item.templateID) {
            guard let hardpointID else { return nil }
            let alreadyPlanted = (player.placedPlaces ?? []).contains {
                $0.sceneID == sceneID && $0.hardpointID == hardpointID
            }
            guard !alreadyPlanted else { return nil }
            target = (
                min(max(x, 0.05), 0.95),
                min(max(y, 0.10), 0.92),
                hardpointID
            )
        } else {
            return nil
        }

        inventory.remove(at: itemIndex)

        switch item.templateID {
        case .worldSeed:
            return plantWorldSeed(
                item: item,
                in: sceneID,
                at: target,
                player: &player,
                inventory: inventory
            )
        case .sceneKit:
            guard mutable?.isMutableByPlayer == true else { return nil }
            return attachSceneKit(
                item: item,
                in: sceneID,
                at: target,
                player: &player,
                inventory: inventory
            )
        case .selfReplicatingFactory, .sceneCreator, .beacon:
            let instance = World2PlacedPlaceInstance(
                templateID: item.templateID,
                sceneID: sceneID,
                x: target.x,
                y: target.y,
                hardpointID: target.hardpointID,
                placedByPlayerID: player.playerId.rawValue,
                sourceInventoryItemID: item.id,
                linkedSceneID: item.linkedSceneID,
                message: item.message
            )
            var placed = player.placedPlaces ?? []
            placed.append(instance)
            player.placeInventory = inventory
            player.placedPlaces = placed
            player.lastPlayedAt = Date()
            currentPlayer = player
            saveLocalState()
            return instance
        }
    }

    /// Templates that may snap onto authored overland pads (not only blank worlds).
    private static func canPlantOnAuthoredMap(_ template: World2PlaceTemplateID) -> Bool {
        switch template {
        case .worldSeed, .selfReplicatingFactory, .sceneCreator, .beacon:
            return true
        case .sceneKit:
            return false
        }
    }

    /// Plant a World Seed: birth a blank hub world + Scene Creator, leave a seedling POI here.
    private func plantWorldSeed(
        item: World2PlaceInventoryItem,
        in parentSceneID: String,
        at target: (x: Double, y: Double, hardpointID: String?),
        player: inout PlayerState,
        inventory: [World2PlaceInventoryItem]
    ) -> World2PlacedPlaceInstance? {
        let hubID = "scene.world.\(UUID().uuidString)"
        let padA = World2SceneHardpoint(
            id: "\(hubID).pad.a",
            name: "Build Pad",
            position: World2NormalizedPoint(x: 0.50, y: 0.62),
            acceptedSizeClasses: [.medium, .large]
        )
        let padB = World2SceneHardpoint(
            id: "\(hubID).pad.b",
            name: "Side Pad",
            position: World2NormalizedPoint(x: 0.72, y: 0.58),
            acceptedSizeClasses: [.small, .medium]
        )
        let hub = World2MutableScene(
            id: hubID,
            name: "New World",
            summary: "A blank world waiting for its first scenes.",
            backgroundAsset: "map.blankWorld",
            hardpoints: [padA, padB],
            isMutableByPlayer: true,
            showsOpenHardpointsToPlayers: true,
            isDeveloperPlaceholder: false,
            createdAt: Date(),
            createdByPlayerID: player.playerId.rawValue
        )
        let creator = World2PlacedPlaceInstance(
            templateID: .sceneCreator,
            sceneID: hubID,
            x: 0.32,
            y: 0.55,
            hardpointID: nil,
            placedByPlayerID: player.playerId.rawValue,
            sourceInventoryItemID: "seeded_scene_creator",
            linkedSceneID: hubID
        )
        let seedling = World2PlacedPlaceInstance(
            templateID: .worldSeed,
            sceneID: parentSceneID,
            x: target.x,
            y: target.y,
            hardpointID: target.hardpointID,
            placedByPlayerID: player.playerId.rawValue,
            sourceInventoryItemID: item.id,
            linkedSceneID: hubID,
            seedGrowth: .seedling
        )

        var scenes = player.createdScenes ?? []
        scenes.append(hub)
        var placed = player.placedPlaces ?? []
        placed.append(contentsOf: [creator, seedling])
        player.createdScenes = scenes
        player.placedPlaces = placed
        player.placeInventory = inventory
        player.lastPlayedAt = Date()
        currentPlayer = player
        saveLocalState()
        return seedling
    }

    /// Attach a Scene Kit to a hardpoint: birth a child scene + exit, grant a Beacon, mature seedling.
    private func attachSceneKit(
        item: World2PlaceInventoryItem,
        in parentSceneID: String,
        at target: (x: Double, y: Double, hardpointID: String?),
        player: inout PlayerState,
        inventory: [World2PlaceInventoryItem]
    ) -> World2PlacedPlaceInstance? {
        let childID = "scene.kit.\(UUID().uuidString)"
        let childPad = World2SceneHardpoint(
            id: "\(childID).pad",
            name: "Beacon Pad",
            position: World2NormalizedPoint(x: 0.50, y: 0.60),
            acceptedSizeClasses: [.small, .medium]
        )
        let child = World2MutableScene(
            id: childID,
            name: "New Scene",
            summary: "A freshly attached scene from a Scene Kit.",
            backgroundAsset: "map.blankWorld",
            hardpoints: [childPad],
            isMutableByPlayer: true,
            showsOpenHardpointsToPlayers: true,
            createdAt: Date(),
            createdByPlayerID: player.playerId.rawValue
        )
        let exit = World2SceneExit(
            id: "exit.\(UUID().uuidString)",
            fromSceneID: parentSceneID,
            toSceneID: childID,
            name: "Scene Portal",
            summary: "Walk through to the scene you just attached.",
            x: target.x,
            y: target.y,
            createdAt: Date(),
            createdByPlayerID: player.playerId.rawValue,
            partyLanding: World2PartyLandingContract(
                landing: .init(x: 0.12, y: 0.86),
                approach: .init(x: 0.48, y: 0.60)
            )
        )
        // Marker left on the pad so the kit "becomes" the door — use a seedling
        // visual until we have dedicated kit-placed art; exit marker also shows.
        let kitMarker = World2PlacedPlaceInstance(
            templateID: .sceneKit,
            sceneID: parentSceneID,
            x: target.x,
            y: max(0.12, target.y - 0.08),
            hardpointID: target.hardpointID,
            placedByPlayerID: player.playerId.rawValue,
            sourceInventoryItemID: item.id,
            linkedSceneID: childID
        )

        var scenes = player.createdScenes ?? []
        scenes.append(child)
        var exits = player.sceneExits ?? []
        exits.append(exit)
        var placed = player.placedPlaces ?? []
        placed.append(kitMarker)
        // Mature every seedling that points at this hub (or parent) into a portal.
        for index in placed.indices {
            guard placed[index].templateID == .worldSeed,
                  placed[index].seedGrowth == .seedling else { continue }
            let linked = placed[index].linkedSceneID
            if linked == parentSceneID || linked == item.linkedSceneID {
                placed[index].seedGrowth = .portal
            }
        }
        var nextInventory = inventory
        nextInventory.append(.beacon())

        player.createdScenes = scenes
        player.sceneExits = exits
        player.placedPlaces = placed
        player.placeInventory = nextInventory
        player.lastPlayedAt = Date()
        currentPlayer = player
        saveLocalState()
        return kitMarker
    }

    @discardableResult
    func birthPlaceholderScene(
        from sceneID: String,
        name: String,
        summary: String,
        exitName: String,
        hardpoints: [World2SceneHardpoint]
    ) -> World2SceneExit? {
        guard var player = currentPlayer,
              scene(sceneID) != nil,
              exits(from: sceneID).isEmpty else {
            return nil
        }

        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedExitName = exitName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty, !trimmedExitName.isEmpty else { return nil }

        let destination = World2MutableScene(
            id: "scene.\(UUID().uuidString)",
            name: trimmedName,
            summary: summary.trimmingCharacters(in: .whitespacesAndNewlines),
            hardpoints: hardpoints,
            isMutableByPlayer: true,
            showsOpenHardpointsToPlayers: true,
            isDeveloperPlaceholder: true,
            createdAt: Date(),
            createdByPlayerID: player.playerId.rawValue
        )
        let exit = World2SceneExit(
            id: "exit.\(UUID().uuidString)",
            fromSceneID: sceneID,
            toSceneID: destination.id,
            name: trimmedExitName,
            summary: "Placeholder exit to \(destination.name)",
            x: 0.82,
            y: 0.50,
            createdAt: Date(),
            createdByPlayerID: player.playerId.rawValue,
            // Arrive bottom-left, then walk toward the scene center.
            partyLanding: World2PartyLandingContract(
                landing: .init(x: 0.10, y: 0.88),
                approach: .init(x: 0.50, y: 0.62)
            )
        )
        var scenes = player.createdScenes ?? []
        scenes.append(destination)
        var exits = player.sceneExits ?? []
        exits.append(exit)
        player.createdScenes = scenes
        player.sceneExits = exits
        player.lastPlayedAt = Date()
        currentPlayer = player
        saveLocalState()
        return exit
    }

    @discardableResult
    func addHardpoint(
        to sceneID: String,
        purpose: World2HardpointPurpose,
        x: Double,
        y: Double
    ) -> World2SceneHardpoint? {
        guard var player = currentPlayer else { return nil }
        var scenes = player.createdScenes ?? []
        guard let index = scenes.firstIndex(where: { $0.id == sceneID }) else {
            return nil
        }
        let pad = World2SceneHardpoint(
            id: "\(sceneID).pad.\(UUID().uuidString.prefix(8))",
            name: purpose == .portal ? "Portal Pad" : "Build Pad",
            position: World2NormalizedPoint(x: x, y: y),
            purpose: purpose
        )
        scenes[index].hardpoints.append(pad)
        player.createdScenes = scenes
        player.lastPlayedAt = Date()
        currentPlayer = player
        saveLocalState()
        return pad
    }

    /// Quick portal exit + blank destination (uses globe art on the exit marker).
    @discardableResult
    func addPortalExit(
        from sceneID: String,
        x: Double,
        y: Double,
        name: String = "New Portal"
    ) -> World2SceneExit? {
        guard var player = currentPlayer,
              scene(sceneID) != nil else {
            return nil
        }
        let destination = World2MutableScene(
            id: "scene.\(UUID().uuidString)",
            name: "New Scene",
            summary: "A scene waiting for its first backdrop.",
            backgroundAsset: "map.blankWorld",
            isMutableByPlayer: true,
            showsOpenHardpointsToPlayers: true,
            createdAt: Date(),
            createdByPlayerID: player.playerId.rawValue
        )
        let exit = World2SceneExit(
            id: "exit.\(UUID().uuidString)",
            fromSceneID: sceneID,
            toSceneID: destination.id,
            name: name,
            summary: "Walk through to \(destination.name).",
            x: x,
            y: y,
            createdAt: Date(),
            createdByPlayerID: player.playerId.rawValue,
            partyLanding: World2PartyLandingContract(
                landing: .init(x: 0.12, y: 0.86),
                approach: .init(x: 0.48, y: 0.60)
            )
        )
        var scenes = player.createdScenes ?? []
        scenes.append(destination)
        var exits = player.sceneExits ?? []
        exits.append(exit)
        player.createdScenes = scenes
        player.sceneExits = exits
        player.lastPlayedAt = Date()
        currentPlayer = player
        saveLocalState()
        return exit
    }

    @discardableResult
    func fabricatePlaceCopy(
        from sourcePlaceInstanceID: String
    ) -> World2PlaceInventoryItem? {
        guard var player = currentPlayer,
              let source = (player.placedPlaces ?? []).first(
                where: { $0.id == sourcePlaceInstanceID }
              ) else {
            return nil
        }

        let item = World2PlaceInventoryItem(
            templateID: source.templateID,
            sourcePlaceInstanceID: sourcePlaceInstanceID,
            linkedSceneID: source.linkedSceneID,
            message: source.message
        )
        var inventory = player.placeInventory ?? []
        inventory.append(item)
        player.placeInventory = inventory
        player.lastPlayedAt = Date()
        currentPlayer = player
        saveLocalState()
        return item
    }
    
    func addGems(_ amount: Int) {
        currentPlayer?.addGems(amount)
        currentPlayer?.progression.totalGemsEarned += amount
        saveLocalState()
    }
    
    func spendGems(_ amount: Int) -> Bool {
        guard let player = currentPlayer, player.gems >= amount else {
            return false
        }
        let success = currentPlayer?.spendGems(amount) ?? false
        if success {
            saveLocalState()
        }
        return success
    }
    
    func addIngredient(id: String, category: IngredientCategory, source: String? = nil) {
        let instance = IngredientInstance(
            ingredientId: id,
            category: category,
            source: source
        )
        currentPlayer?.addIngredient(instance)
        saveLocalState()
    }
    
    func useIngredient(instanceId: String, category: IngredientCategory) -> Bool {
        guard var player = currentPlayer else { return false }
        
        let ingredients: [IngredientInstance]
        switch category {
        case .creature: ingredients = player.creatureIngredients
        case .function: ingredients = player.functionIngredients
        case .context: ingredients = player.contextIngredients
        }
        
        guard let index = ingredients.firstIndex(where: { $0.id == instanceId && !$0.used }) else {
            return false
        }
        
        switch category {
        case .creature:
            player.creatureIngredients[index].used = true
        case .function:
            player.functionIngredients[index].used = true
        case .context:
            player.contextIngredients[index].used = true
        }
        
        currentPlayer = player
        saveLocalState()
        return true
    }
    
    func hasIngredient(id: String, category: IngredientCategory) -> Bool {
        currentPlayer?.hasIngredient(id: id, category: category) ?? false
    }
    
    func availableIngredients(for category: IngredientCategory) -> [IngredientInstance] {
        guard let player = currentPlayer else { return [] }
        
        switch category {
        case .creature:
            return player.creatureIngredients.filter { !$0.used }
        case .function:
            return player.functionIngredients.filter { !$0.used }
        case .context:
            return player.contextIngredients.filter { !$0.used }
        }
    }
    
    func addCardToCollection(_ card: World2CreatureCard) {
        currentPlayer?.cardCollection.cards.append(card)
        currentPlayer?.progression.totalCardsCreated += 1
        saveLocalState()
    }
    
    func hasCardWithRecipeHash(_ hash: String) -> Bool {
        currentPlayer?.cardCollection.hasCardWithRecipeHash(hash) ?? false
    }
    
    func cardWithRecipeHash(_ hash: String) -> World2CreatureCard? {
        currentPlayer?.cardCollection.cardWithRecipeHash(hash)
    }
    
    func sellCard(_ cardId: String) {
        guard var player = currentPlayer else { return }
        
        player.cardCollection.activeDeck.removeAll { $0 == cardId }
        player.cardCollection.cards.removeAll { $0.id == cardId }
        player.progression.totalCardsSold += 1
        
        currentPlayer = player
        saveLocalState()
    }
    
    func addToActiveDeck(_ cardId: String) -> Bool {
        let success = currentPlayer?.cardCollection.addToActiveDeck(cardId) ?? false
        if success {
            saveLocalState()
        }
        return success
    }
    
    func removeFromActiveDeck(_ cardId: String) -> Bool {
        let success = currentPlayer?.cardCollection.removeFromActiveDeck(cardId) ?? false
        if success {
            saveLocalState()
        }
        return success
    }
    
    func addDecoration(_ decoration: DecorationInstance) {
        currentPlayer?.decorations.append(decoration)
        saveLocalState()
    }

    @discardableResult
    func awardWorkbenchDecorations(
        _ decorations: [World2GeneratedDecoration],
        images: [String: Data]
    ) -> Int {
        guard var player = currentPlayer else { return 0 }
        var catalog = player.generatedDecorations ?? []
        var added = 0
        let store = World2GeneratedDecorationImageStore.shared

        for decoration in decorations {
            if catalog.contains(where: { $0.id == decoration.id }) {
                continue
            }
            if let data = images[decoration.id] {
                guard store.store(data, for: decoration) else { continue }
            } else if decoration.registryKey.hasPrefix("preview/") {
                continue
            }

            catalog.append(decoration)
            if !player.decorations.contains(where: { $0.decorationId == decoration.id }) {
                player.decorations.append(
                    DecorationInstance(
                        id: "inventory_\(decoration.id)",
                        decorationId: decoration.id,
                        x: 0.50,
                        y: decoration.placementLayer.homeLayer == .wall ? 0.38 : 0.70,
                        scale: 0.82,
                        badges: [.new, .handmade]
                    )
                )
                added += 1
            }
        }

        player.generatedDecorations = catalog
        if added > 0 {
            player.progression.totalMinigamesCompleted += 1
            if !player.progression.completedPOIs.contains("poi.assetWorkbench") {
                player.progression.completedPOIs.append("poi.assetWorkbench")
            }
        }
        currentPlayer = player
        saveLocalState()
        return added
    }

    /// Always mint a fresh inventory copy (Daddy's candy / hug every visit).
    @discardableResult
    func awardRepeatableStoryDecoration(
        _ decoration: World2StoryDecoration
    ) -> DecorationInstance? {
        guard var player = currentPlayer else { return nil }
        let instanceID = "story_\(player.playerId.rawValue)_\(decoration.id)_\(UUID().uuidString)"
        let instance = DecorationInstance(
            id: instanceID,
            decorationId: decoration.id,
            x: 0.50,
            y: decoration.placementLayer == .wall ? 0.38 : 0.72,
            scale: decoration.defaultScale,
            zIndex: (player.decorations.map(\.zIndex).max() ?? 0) + 1,
            badges: decoration.badges
        )
        player.decorations.append(instance)
        currentPlayer = player
        saveLocalState()
        World2Diagnostics.log(
            "story_decoration_repeat_awarded",
            [
                "decoration": decoration.id,
                "instance": instanceID,
                "player": player.playerId.rawValue,
            ]
        )
        return instance
    }

    /// Put a story reward into the player's inventory.
    ///
    /// Awarding is idempotent: the Three Bears will happily let a child play
    /// again, but they only ever hand over one magic bowl. The returned
    /// instance is what the celebration screen and the drawer highlight.
    @discardableResult
    func awardStoryDecoration(
        _ decoration: World2StoryDecoration
    ) -> DecorationInstance? {
        guard var player = currentPlayer else { return nil }
        let instanceID = "story_\(player.playerId.rawValue)_\(decoration.id)"

        if let existingIndex = player.decorations.firstIndex(where: { $0.id == instanceID }) {
            // Already earned. Re-light the NEW! ribbon so a repeat win still
            // points at the right card in the drawer.
            player.decorations[existingIndex].badges = decoration.badges
            currentPlayer = player
            saveLocalState()
            World2Diagnostics.log(
                "story_decoration_regranted",
                ["decoration": decoration.id, "player": player.playerId.rawValue]
            )
            return player.decorations[existingIndex]
        }

        let instance = DecorationInstance(
            id: instanceID,
            decorationId: decoration.id,
            x: 0.50,
            y: decoration.placementLayer == .wall ? 0.38 : 0.72,
            scale: decoration.defaultScale,
            zIndex: (player.decorations.map(\.zIndex).max() ?? 0) + 1,
            badges: decoration.badges
        )
        player.decorations.append(instance)
        player.progression.totalMinigamesCompleted += 1
        if !player.progression.completedPOIs.contains(decoration.awardedByArchetypeID) {
            player.progression.completedPOIs.append(decoration.awardedByArchetypeID)
        }
        currentPlayer = player
        saveLocalState()
        World2Diagnostics.log(
            "story_decoration_awarded",
            [
                "decoration": decoration.id,
                "instance": instanceID,
                "player": player.playerId.rawValue,
            ]
        )
        return instance
    }

    func hasStoryDecoration(_ decoration: World2StoryDecoration) -> Bool {
        currentPlayer?.decorations.contains { $0.decorationId == decoration.id } ?? false
    }

    /// Number of inventory items still wearing a NEW! ribbon, for the drawer badge.
    var unseenInventoryCount: Int {
        currentPlayer?.decorations.filter(\.isUnseen).count ?? 0
    }

    /// Retire the NEW! ribbons once the player has actually looked at the drawer.
    func markInventorySeen() {
        guard var player = currentPlayer else { return }
        var changed = false
        for index in player.decorations.indices where player.decorations[index].isUnseen {
            player.decorations[index].markSeen()
            changed = true
        }
        guard changed else { return }
        currentPlayer = player
        saveLocalState()
    }

    func earnFurnitureIngredient() {
        guard var player = currentPlayer else { return }
        player.furnitureIngredients = player.availableFurnitureIngredientCount + 1
        currentPlayer = player
        saveLocalState()
    }

    @discardableResult
    func craftFurniture(_ item: FurnitureItem) -> DecorationInstance? {
        guard var player = currentPlayer,
              player.availableFurnitureIngredientCount >= FurnitureItem.ingredientCost else {
            return nil
        }
        let furniture = DecorationInstance(
            decorationId: item.id,
            x: 0.5,
            y: item.placementLayer == .wall ? 0.38 : 0.70,
            scale: item.defaultScale,
            badges: [.new, .questReward]
        )
        player.furnitureIngredients =
            player.availableFurnitureIngredientCount - FurnitureItem.ingredientCost
        player.decorations.append(furniture)
        player.progression.totalMinigamesCompleted += 1
        if !player.progression.completedPOIs.contains("poi.furnitureStore") {
            player.progression.completedPOIs.append("poi.furnitureStore")
        }
        currentPlayer = player
        saveLocalState()
        return furniture
    }

    func placeFurniture(
        instanceId: String,
        x requestedX: Double? = nil,
        y requestedY: Double? = nil,
        roomId: String = "cozyNook"
    ) {
        guard var player = currentPlayer,
              let instanceIndex = player.decorations.firstIndex(where: { $0.id == instanceId }),
              let placement = Self.roomPlacement(
                for: player.decorations[instanceIndex].decorationId,
                player: player
              ),
              !player.homeLayout.placedDecorations.contains(
                where: { $0.decorationInstanceId == instanceId }
              ) else {
            return
        }

        let roomPlacedCount = player.homeLayout.placedDecorations
            .filter { $0.resolvedRoomId == roomId }
            .count
        let defaultX = 0.22 + (Double(roomPlacedCount % 3) * 0.20)
        let defaultY = placement.layer == .wall
            ? 0.34
            : (roomPlacedCount.isMultiple(of: 2) ? 0.58 : 0.74)
        let x = min(max(requestedX ?? defaultX, 0.06), 0.94)
        let y = min(max(requestedY ?? defaultY, 0.16), 0.90)
        let zIndex = (player.decorations.map(\.zIndex).max() ?? 9) + 1
        player.decorations[instanceIndex].x = x
        player.decorations[instanceIndex].y = y
        player.decorations[instanceIndex].scale = placement.scale
        player.decorations[instanceIndex].zIndex = zIndex
        player.homeLayout.placedDecorations.append(
            HomeLayout.PlacedDecoration(
                id: "placed_\(instanceId)",
                decorationInstanceId: instanceId,
                position: .init(x: x, y: y),
                layer: placement.layer,
                roomId: roomId
            )
        )
        currentPlayer = player
        saveLocalState()
    }

    /// Decorate-mode catalogue stamp: mint a free instance and drop it in the room.
    @discardableResult
    func placeCatalogFurniture(
        item: FurnitureItem,
        x: Double,
        y: Double,
        roomId: String
    ) -> String? {
        let furniture = DecorationInstance(
            decorationId: item.id,
            x: min(max(x, 0.06), 0.94),
            y: min(max(y, 0.16), 0.90),
            scale: item.defaultScale,
            zIndex: (currentPlayer?.decorations.map(\.zIndex).max() ?? 9) + 1,
            badges: nil
        )
        guard var player = currentPlayer else { return nil }
        player.decorations.append(furniture)
        player.homeLayout.placedDecorations.append(
            HomeLayout.PlacedDecoration(
                id: "placed_\(furniture.id)",
                decorationInstanceId: furniture.id,
                position: .init(x: furniture.x, y: furniture.y),
                layer: item.placementLayer,
                roomId: roomId
            )
        )
        currentPlayer = player
        saveLocalState()
        return furniture.id
    }

    func updateFurnitureTransform(
        instanceId: String,
        x: Double? = nil,
        y: Double? = nil,
        scale: Double? = nil,
        rotation: Double? = nil
    ) {
        guard var player = currentPlayer,
              let instanceIndex = player.decorations.firstIndex(where: { $0.id == instanceId }),
              let layoutIndex = player.homeLayout.placedDecorations.firstIndex(
                where: { $0.decorationInstanceId == instanceId }
              ) else {
            return
        }

        if let x {
            player.decorations[instanceIndex].x = min(max(x, 0.06), 0.94)
        }
        if let y {
            player.decorations[instanceIndex].y = min(max(y, 0.16), 0.90)
        }
        if let scale {
            player.decorations[instanceIndex].scale = min(max(scale, 0.32), 1.80)
        }
        if let rotation {
            player.decorations[instanceIndex].rotation = rotation
        }
        player.homeLayout.placedDecorations[layoutIndex].position = .init(
            x: player.decorations[instanceIndex].x,
            y: player.decorations[instanceIndex].y
        )
        currentPlayer = player
        saveLocalState()
    }

    func bringFurnitureToFront(instanceId: String) {
        guard var player = currentPlayer,
              let index = player.decorations.firstIndex(where: { $0.id == instanceId }) else {
            return
        }
        player.decorations[index].zIndex = (player.decorations.map(\.zIndex).max() ?? 0) + 1
        currentPlayer = player
        saveLocalState()
    }

    func returnFurnitureToInventory(instanceId: String) {
        guard var player = currentPlayer else { return }
        player.homeLayout.placedDecorations.removeAll {
            $0.decorationInstanceId == instanceId
        }
        currentPlayer = player
        saveLocalState()
    }
    
    func updateHomeLayout(_ layout: HomeLayout) {
        currentPlayer?.homeLayout = layout
        saveLocalState()
    }
    
    func setCurrentWorld(_ worldId: WorldId) {
        currentPlayer?.currentWorldId = worldId
        saveLocalState()
    }
    
    func unlockWorld(_ worldId: WorldId) {
        if currentPlayer?.progression.unlockedWorlds.contains(worldId) == false {
            currentPlayer?.progression.unlockedWorlds.append(worldId)
            saveLocalState()
        }
    }
    
    func markPOICompleted(_ poiId: String) {
        if currentPlayer?.progression.completedPOIs.contains(poiId) == false {
            currentPlayer?.progression.completedPOIs.append(poiId)
            saveLocalState()
        }
    }
    
    func incrementMinigamesCompleted() {
        currentPlayer?.progression.totalMinigamesCompleted += 1
        saveLocalState()
    }
    
    func unlockMusic(_ trackId: String) {
        if currentPlayer?.unlockedMusic.contains(trackId) == false {
            currentPlayer?.unlockedMusic.append(trackId)
            saveLocalState()
        }
    }
    
    func syncWithServer() async {
        guard let player = currentPlayer else { return }
        
        isSyncing = true
        defer { isSyncing = false }
        
        guard let url = URL(string: "\(apiClient.baseURL)/api/world2/player/sync") else {
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            request.httpBody = try encoder.encode(player)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  (200..<300).contains(httpResponse.statusCode) else {
                print("⚠️ PlayerStateService: Sync failed with server error")
                return
            }
            
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            let serverState = Self.migrated(
                try decoder.decode(PlayerState.self, from: data)
            )
            
            if serverState.lastPlayedAt > player.lastPlayedAt {
                currentPlayer = serverState
                saveLocalState(touchLastPlayedAt: false)
                print("✅ PlayerStateService: Updated with server state")
            } else {
                print("✅ PlayerStateService: Local state is current")
            }
            
        } catch {
            print("❌ PlayerStateService: Sync error: \(error)")
        }
    }
    
    private func saveLocalState(touchLastPlayedAt: Bool = true) {
        guard var player = currentPlayer else {
            return
        }
        if touchLastPlayedAt {
            player.lastPlayedAt = Date()
            currentPlayer = player
        }
        let stored = StoredPlayerState(
            schemaVersion: Self.playerStateSchemaVersion,
            player: player
        )
        do {
            let data = try JSONEncoder().encode(stored)
            UserDefaults.standard.set(
                data,
                forKey: playerStateKey(for: player.playerId)
            )
            UserDefaults.standard.removeObject(forKey: legacyStateKey)
        } catch {
            self.error = "Your latest progress could not be saved."
            print("PLAYER_STATE_SAVE_FAILED error=\(error.localizedDescription)")
        }
    }
    
    private func playerStateKey(for playerId: PlayerId) -> String {
        "world2_player_\(playerId.rawValue)"
    }

    private func loadPlayerState(for playerId: PlayerId) -> PlayerLoadResult {
        let defaults = UserDefaults.standard
        let key = playerStateKey(for: playerId)
        if let data = defaults.data(forKey: key) {
            guard let player = decodePlayerState(data),
                  player.playerId == playerId else {
                preserveCorruptSave(data, key: key)
                return .corrupt
            }
            return .loaded(player)
        }

        guard let legacyData = defaults.data(forKey: legacyStateKey) else {
            return .missing
        }
        guard let legacyPlayer = decodePlayerState(legacyData) else {
            preserveCorruptSave(legacyData, key: legacyStateKey)
            return .corrupt
        }
        guard legacyPlayer.playerId == playerId else {
            return .missing
        }
        return .loaded(legacyPlayer)
    }

    private func decodePlayerState(_ data: Data) -> PlayerState? {
        let decoder = JSONDecoder()
        if let stored = try? decoder.decode(StoredPlayerState.self, from: data),
           stored.schemaVersion <= Self.playerStateSchemaVersion {
            return stored.player
        }
        return try? decoder.decode(PlayerState.self, from: data)
    }

    private func preserveCorruptSave(_ data: Data, key: String) {
        let timestamp = Int(Date().timeIntervalSince1970)
        UserDefaults.standard.set(
            data,
            forKey: "\(key).preserved-corrupt.\(timestamp)"
        )
        print("PLAYER_STATE_CORRUPT_PRESERVED key=\(key)")
    }

    private static func migrated(_ storedPlayer: PlayerState) -> PlayerState {
        var player = storedPlayer
        if player.furnitureIngredients == nil {
            player.furnitureIngredients = 0
        }
        if player.placeInventory == nil {
            player.placeInventory = []
        }
        if player.placedPlaces == nil {
            player.placedPlaces = []
        }
        if player.createdScenes == nil {
            player.createdScenes = []
        }
        if player.sceneExits == nil {
            player.sceneExits = []
        }
        if player.generatedDecorations == nil {
            player.generatedDecorations = []
        }
        ensureStarterPOIFactory(in: &player)
        ensureStarterWorldSeed(in: &player)
        ensureWorldTeleporter(in: &player)
        offerJukeboxAsInventory(in: &player)
        return player
    }

    private static func roomPlacement(
        for decorationId: String,
        player: PlayerState
    ) -> (scale: Double, layer: HomeLayout.PlacedDecoration.PlacementLayer)? {
        if decorationId == DecorationInstance.starterJukeboxID {
            return (1.0, .floor)
        }
        if let item = FurnitureItem.item(id: decorationId) {
            return (item.defaultScale, item.placementLayer)
        }
        if let story = World2StoryDecoration.decoration(id: decorationId) {
            return (story.defaultScale, story.placementLayer.homeLayer)
        }
        if let generated = player.generatedDecoration(id: decorationId) {
            return (0.82, generated.placementLayer.homeLayer)
        }
        return nil
    }

    /// The starter jukebox used to appear already placed. Old saves get it back in inventory once.
    private static func offerJukeboxAsInventory(in player: inout PlayerState) {
        let instanceID = PlayerState.starterJukeboxInstanceID(for: player.playerId)
        if !player.decorations.contains(where: { $0.id == instanceID }) {
            player.decorations.append(.starterJukebox(for: player.playerId))
        }
        guard !player.progression.achievedMilestones.contains(PlayerState.jukeboxQuestOfferedMilestone) else {
            return
        }
        player.homeLayout.placedDecorations.removeAll { placed in
            placed.decorationInstanceId == instanceID
                && placed.position.x == 0.8
                && placed.position.y == 0.7
        }
        player.progression.achievedMilestones.append(PlayerState.jukeboxQuestOfferedMilestone)
    }

    private static func ensureStarterPOIFactory(in player: inout PlayerState) {
        var inventory = player.placeInventory ?? []
        if !player.progression.achievedMilestones.contains(starterPOIFactoryMilestone) {
            let alreadyExists = inventory.contains {
                $0.templateID == .selfReplicatingFactory
            }
            if !alreadyExists {
                inventory.append(.starterFactory(for: player.playerId))
            }
            player.progression.achievedMilestones.append(starterPOIFactoryMilestone)
        }
        player.placeInventory = inventory
        if player.placedPlaces == nil {
            player.placedPlaces = []
        }
        if player.createdScenes == nil {
            player.createdScenes = []
        }
        if player.sceneExits == nil {
            player.sceneExits = []
        }
    }

    private static func ensureStarterWorldSeed(in player: inout PlayerState) {
        var inventory = player.placeInventory ?? []
        let alreadyExists = inventory.contains { $0.templateID == .worldSeed }
        if !alreadyExists {
            inventory.append(.starterWorldSeed(for: player.playerId))
        }
        if !player.progression.achievedMilestones.contains(starterWorldSeedMilestone) {
            player.progression.achievedMilestones.append(starterWorldSeedMilestone)
        }
        player.placeInventory = inventory
    }

    /// Append a placeable inventory item (World Seed, Scene Kit, Beacon, etc.).
    @discardableResult
    func grantPlaceInventoryItem(_ item: World2PlaceInventoryItem) -> World2PlaceInventoryItem? {
        guard var player = currentPlayer else { return nil }
        var inventory = player.placeInventory ?? []
        inventory.append(item)
        player.placeInventory = inventory
        player.lastPlayedAt = Date()
        currentPlayer = player
        saveLocalState()
        return item
    }

    /// Seed the World Teleporter into every player's treehouse drawer once.
    private static func ensureWorldTeleporter(in player: inout PlayerState) {
        let decoration = World2StoryDecoration.worldTeleporter
        let instanceID = "story_\(player.playerId.rawValue)_\(decoration.id)"
        let alreadyOwned = player.decorations.contains {
            $0.decorationId == decoration.id || $0.id == instanceID
        }
        if !alreadyOwned {
            player.decorations.append(
                DecorationInstance(
                    id: instanceID,
                    decorationId: decoration.id,
                    x: 0.50,
                    y: 0.72,
                    scale: decoration.defaultScale,
                    zIndex: (player.decorations.map(\.zIndex).max() ?? 0) + 1,
                    badges: decoration.badges
                )
            )
        }
        if !player.progression.achievedMilestones.contains(worldTeleporterMilestone) {
            player.progression.achievedMilestones.append(worldTeleporterMilestone)
        }
    }
    
    func resetProgress() {
        guard let playerId = currentPlayer?.playerId else { return }
        currentPlayer = PlayerState.newPlayer(id: playerId)
        saveLocalState()
    }
}
