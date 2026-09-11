//
//  CreatureBuilderViewModel.swift
//  abbies.world.ios
//
//  ViewModel for Creature Card Builder minigame.
//

import Foundation
import Combine
import SwiftUI

enum CreatureBuilderTab: String, CaseIterable {
    case build = "BUILD"
    case making = "MAKING"
    case myCards = "MY CARDS"
}

@MainActor
class CreatureBuilderViewModel: ObservableObject {
    
    // MARK: - Published State
    
    @Published var currentTab: CreatureBuilderTab = .build
    
    @Published var selectedCreature: CreatureIngredient?
    @Published var selectedOutfit: CreatureIngredient?
    @Published var selectedBuddy: CreatureIngredient?
    
    @Published var activeJobs: [GenerationJob] = []
    @Published var queuedJobs: [GenerationJob] = []
    @Published var readyToReveal: [CreatureCard] = []
    @Published var collection: [CreatureCard] = []
    
    @Published var isLoading = false
    @Published var isCreating = false
    @Published var errorMessage: String?
    
    @Published var cardToReveal: CreatureCard?
    @Published var showingReveal = false
    @Published var cardDetail: CreatureCard?
    @Published var showingDetail = false
    
    // MARK: - Content
    
    let creatures = CreatureBuilderContent.creatures
    let outfits = CreatureBuilderContent.outfits
    let buddies = CreatureBuilderContent.buddies
    
    // MARK: - Computed
    
    var canCreate: Bool {
        selectedCreature != nil && selectedOutfit != nil && selectedBuddy != nil && !isCreating
    }
    
    var readyCount: Int {
        readyToReveal.count
    }
    
    var makingCount: Int {
        activeJobs.count + queuedJobs.count
    }
    
    var makingBadge: String? {
        let ready = readyCount
        if ready > 0 {
            return "\(ready)!"
        }
        let making = makingCount
        if making > 0 {
            return "\(making)"
        }
        return nil
    }
    
    var favorites: [CreatureCard] {
        collection.filter { $0.isFavorite }
    }
    
    // MARK: - Private
    
    private let apiClient = APIClient.shared
    private var cancellables = Set<AnyCancellable>()
    private var pollTimer: Timer?
    
    // MARK: - Init
    
    init() {
        loadState()
    }
    
    deinit {
        pollTimer?.invalidate()
    }
    
    // MARK: - Selection
    
    func selectCreature(_ creature: CreatureIngredient) {
        selectedCreature = creature
        playSelectionSound()
    }
    
    func selectOutfit(_ outfit: CreatureIngredient) {
        selectedOutfit = outfit
        playSelectionSound()
    }
    
    func selectBuddy(_ buddy: CreatureIngredient) {
        selectedBuddy = buddy
        playSelectionSound()
    }
    
    func clearSelections() {
        selectedCreature = nil
        selectedOutfit = nil
        selectedBuddy = nil
    }
    
    // MARK: - Create Creature
    
    func createCreature() {
        guard let creature = selectedCreature,
              let outfit = selectedOutfit,
              let buddy = selectedBuddy else {
            return
        }
        
        isCreating = true
        errorMessage = nil
        
        let request = CreateCreatureRequest(
            creatureId: creature.id,
            outfitId: outfit.id,
            buddyId: buddy.id
        )
        
        Task {
            do {
                let response = try await createCreatureAsync(request: request)
                
                let job = GenerationJob(
                    id: response.generationId,
                    cardId: response.cardId,
                    creatureId: creature.id,
                    outfitId: outfit.id,
                    buddyId: buddy.id,
                    status: response.status,
                    createdAt: Date(),
                    updatedAt: Date()
                )
                
                if activeJobs.count < 3 {
                    activeJobs.append(job)
                } else {
                    queuedJobs.append(job)
                }
                
                clearSelections()
                playCreateSound()
                
                startPollingIfNeeded()
                
            } catch {
                errorMessage = "Oops! The creature machine got confused."
                print("❌ Create creature error: \(error)")
            }
            
            isCreating = false
        }
    }
    
    // MARK: - Reveal
    
    func revealCard(_ card: CreatureCard) {
        cardToReveal = card
        showingReveal = true
        playReadySound()
    }
    
    func completeReveal() {
        guard var card = cardToReveal else { return }
        
        card.isRevealed = true
        
        readyToReveal.removeAll { $0.id == card.id }
        
        if let index = collection.firstIndex(where: { $0.id == card.id }) {
            collection[index] = card
        } else {
            collection.insert(card, at: 0)
        }
        
        cardToReveal = nil
        showingReveal = false
        
        playRevealSound()
        
        Task {
            await markCardRevealed(card.id)
        }
    }
    
    // MARK: - Collection
    
    func showCardDetail(_ card: CreatureCard) {
        cardDetail = card
        showingDetail = true
    }
    
    func toggleFavorite(_ card: CreatureCard) {
        guard let index = collection.firstIndex(where: { $0.id == card.id }) else { return }
        collection[index].isFavorite.toggle()
        
        Task {
            await updateFavorite(card.id, isFavorite: collection[index].isFavorite)
        }
    }
    
    func makeAnotherLikeThis(_ card: CreatureCard) {
        selectedCreature = CreatureBuilderContent.creature(for: card.creatureId)
        selectedOutfit = CreatureBuilderContent.outfit(for: card.outfitId)
        selectedBuddy = CreatureBuilderContent.buddy(for: card.buddyId)
        currentTab = .build
        showingDetail = false
    }
    
    // MARK: - State Management
    
    func loadState() {
        isLoading = true
        
        Task {
            do {
                let state = try await fetchStateAsync()
                
                activeJobs = state.active
                queuedJobs = state.queued
                readyToReveal = state.readyToReveal
                collection = state.collection.sorted { $0.createdAt > $1.createdAt }
                
                startPollingIfNeeded()
                
            } catch {
                print("❌ Load state error: \(error)")
            }
            
            isLoading = false
        }
    }
    
    func refresh() {
        loadState()
    }
    
    // MARK: - Polling
    
    private func startPollingIfNeeded() {
        guard pollTimer == nil, !activeJobs.isEmpty || !queuedJobs.isEmpty else { return }
        
        pollTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.pollForUpdates()
            }
        }
    }
    
    private func stopPolling() {
        pollTimer?.invalidate()
        pollTimer = nil
    }
    
    private func pollForUpdates() {
        Task {
            do {
                let state = try await fetchStateAsync()
                
                let previousReadyCount = readyToReveal.count
                
                activeJobs = state.active
                queuedJobs = state.queued
                readyToReveal = state.readyToReveal
                
                for card in state.collection where card.isRevealed {
                    if !collection.contains(where: { $0.id == card.id }) {
                        collection.insert(card, at: 0)
                    }
                }
                
                if state.readyToReveal.count > previousReadyCount {
                    playReadySound()
                }
                
                if activeJobs.isEmpty && queuedJobs.isEmpty {
                    stopPolling()
                }
                
            } catch {
                print("❌ Poll error: \(error)")
            }
        }
    }
    
    // MARK: - Audio
    
    private func playSelectionSound() {
        // TODO: Play selection tap sound
    }
    
    private func playCreateSound() {
        // TODO: Play magical machine sound
    }
    
    private func playReadySound() {
        // TODO: Play ready chime
    }
    
    private func playRevealSound() {
        // TODO: Play card flip + celebration
    }
    
    // MARK: - API Calls
    
    private func createCreatureAsync(request: CreateCreatureRequest) async throws -> CreateCreatureResponse {
        guard let url = URL(string: "\(apiClient.baseURL)/api/games/creature-builder/generations") else {
            throw URLError(.badURL)
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        return try JSONDecoder().decode(CreateCreatureResponse.self, from: data)
    }
    
    private func fetchStateAsync() async throws -> CreatureBuilderState {
        guard let url = URL(string: "\(apiClient.baseURL)/api/games/creature-builder/state") else {
            throw URLError(.badURL)
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "GET"
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(CreatureBuilderState.self, from: data)
    }
    
    private func markCardRevealed(_ cardId: String) async {
        guard let url = URL(string: "\(apiClient.baseURL)/api/games/creature-builder/cards/\(cardId)/reveal") else {
            return
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        
        _ = try? await URLSession.shared.data(for: urlRequest)
    }
    
    private func updateFavorite(_ cardId: String, isFavorite: Bool) async {
        guard let url = URL(string: "\(apiClient.baseURL)/api/games/creature-builder/cards/\(cardId)/favorite") else {
            return
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        urlRequest.httpBody = try? JSONEncoder().encode(["favorite": isFavorite])
        
        _ = try? await URLSession.shared.data(for: urlRequest)
    }
}
