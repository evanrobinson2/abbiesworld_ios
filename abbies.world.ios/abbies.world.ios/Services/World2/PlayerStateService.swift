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
                    zIndex: index + 1
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
              let scene = scene(sceneID),
              scene.isMutableByPlayer,
              let itemIndex = (player.placeInventory ?? []).firstIndex(
                where: { $0.id == itemID }
              ) else {
            return nil
        }

        let target: (x: Double, y: Double, hardpointID: String?)
        if scene.hardpoints.isEmpty {
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

        var inventory = player.placeInventory ?? []
        let item = inventory.remove(at: itemIndex)
        let instance = World2PlacedPlaceInstance(
            templateID: item.templateID,
            sceneID: sceneID,
            x: target.x,
            y: target.y,
            hardpointID: target.hardpointID,
            placedByPlayerID: player.playerId.rawValue,
            sourceInventoryItemID: item.id
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
            isMutableByPlayer: true,
            hardpoints: hardpoints,
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
            createdByPlayerID: player.playerId.rawValue
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
            sourcePlaceInstanceID: sourcePlaceInstanceID
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
                        scale: 0.82
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
            scale: item.defaultScale
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
        y requestedY: Double? = nil
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

        let placedCount = player.homeLayout.placedDecorations.count
        let defaultX = 0.22 + (Double(placedCount % 3) * 0.20)
        let defaultY = placement.layer == .wall
            ? 0.34
            : (placedCount.isMultiple(of: 2) ? 0.58 : 0.74)
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
                layer: placement.layer
            )
        )
        currentPlayer = player
        saveLocalState()
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
    
    func resetProgress() {
        guard let playerId = currentPlayer?.playerId else { return }
        currentPlayer = PlayerState.newPlayer(id: playerId)
        saveLocalState()
    }
}
