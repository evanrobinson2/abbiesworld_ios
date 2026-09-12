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
    
    private let apiClient = APIClient.shared
    private let stateKey = "world2_player_state"
    private var cancellables = Set<AnyCancellable>()
    
    @Published private(set) var currentPlayer: PlayerState?
    @Published private(set) var isLoading = false
    @Published private(set) var isSyncing = false
    @Published var error: String?
    
    private init() {
        loadLocalState()
    }
    
    var gems: Int { currentPlayer?.gems ?? 0 }
    var creatureIngredients: [IngredientInstance] { currentPlayer?.creatureIngredients ?? [] }
    var functionIngredients: [IngredientInstance] { currentPlayer?.functionIngredients ?? [] }
    var contextIngredients: [IngredientInstance] { currentPlayer?.contextIngredients ?? [] }
    var totalIngredients: Int { currentPlayer?.totalIngredientCount ?? 0 }
    var activeDeckCount: Int { currentPlayer?.activeDeckCount ?? 0 }
    var currentWorldId: WorldId { currentPlayer?.currentWorldId ?? .home }
    
    func selectPlayer(_ playerId: PlayerId) {
        if var player = loadPlayerState(for: playerId) {
            player.lastPlayedAt = Date()
            currentPlayer = player
        } else {
            currentPlayer = PlayerState.newPlayer(id: playerId)
        }
        saveLocalState()
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
    
    func addCardToCollection(_ card: CreatureCard) {
        currentPlayer?.cardCollection.cards.append(card)
        currentPlayer?.progression.totalCardsCreated += 1
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
            let serverState = try decoder.decode(PlayerState.self, from: data)
            
            if serverState.lastPlayedAt > player.lastPlayedAt {
                currentPlayer = serverState
                saveLocalState()
                print("✅ PlayerStateService: Updated with server state")
            } else {
                print("✅ PlayerStateService: Local state is current")
            }
            
        } catch {
            print("❌ PlayerStateService: Sync error: \(error)")
        }
    }
    
    private func loadLocalState() {
        guard let data = UserDefaults.standard.data(forKey: stateKey),
              let state = try? JSONDecoder().decode(PlayerState.self, from: data) else {
            return
        }
        currentPlayer = state
    }
    
    private func saveLocalState() {
        guard let player = currentPlayer,
              let data = try? JSONEncoder().encode(player) else {
            return
        }
        UserDefaults.standard.set(data, forKey: stateKey)
    }
    
    private func loadPlayerState(for playerId: PlayerId) -> PlayerState? {
        let key = "world2_player_\(playerId.rawValue)"
        guard let data = UserDefaults.standard.data(forKey: key),
              let state = try? JSONDecoder().decode(PlayerState.self, from: data) else {
            return nil
        }
        return state
    }
    
    func resetProgress() {
        guard let playerId = currentPlayer?.playerId else { return }
        currentPlayer = PlayerState.newPlayer(id: playerId)
        saveLocalState()
    }
}
