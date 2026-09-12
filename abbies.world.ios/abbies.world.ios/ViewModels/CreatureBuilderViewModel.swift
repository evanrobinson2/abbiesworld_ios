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
    @Published var failedJobs: [GenerationJob] = []
    @Published var readyToReveal: [CreatureCard] = []
    @Published var collection: [CreatureCard] = []
    
    @Published var isLoading = false
    @Published var isCreating = false
    @Published var errorMessage: String?
    @Published var queueFull = false
    
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
    
    var failedCount: Int {
        failedJobs.count
    }
    
    var makingBadge: String? {
        let making = makingCount
        if making > 0 {
            return "\(making)"
        }
        return nil
    }
    
    var shouldPoll: Bool {
        !activeJobs.isEmpty || !queuedJobs.isEmpty
    }
    
    var favorites: [CreatureCard] {
        collection.filter { $0.isFavorite }
    }
    
    // MARK: - Private
    
    private let apiClient = APIClient.shared
    private let mockService = MockCreatureBuilderService.shared
    private var cancellables = Set<AnyCancellable>()
    private var pollTimer: Timer?
    private var automatedGenerationID: String?
    
    private(set) var useMockMode: Bool = false
    
    // MARK: - Init
    
    init() {
        let arguments = ProcessInfo.processInfo.arguments
        useMockMode = arguments.contains("-useMockCreatureBuilder")
        print("creature_builder.mode value=\(useMockMode ? "mock" : "production")")

        if arguments.contains("-verifyCreatureLabReady") {
            currentTab = .making
            readyToReveal = [
                CreatureCard(
                    id: "ready-verification-card",
                    generationId: "ready-verification-generation",
                    recipe: CreatureRecipe(
                        creatureId: "cat",
                        outfitId: "superhero",
                        buddyId: "fox"
                    ),
                    name: "Starshield Cat",
                    personality: "Brave, curious, and always ready to help.",
                    powerName: "Friendly Force Field",
                    imageURL: "mock://creature/cat_superhero_fox",
                    createdAt: Date(),
                    isFavorite: false,
                    isRevealed: false
                )
            ]
        } else {
            loadState()
        }

        if arguments.contains("-autoPlayCreatureBuilder") {
            Task { @MainActor [weak self] in
                try? await Task.sleep(for: .seconds(1))
                guard let self,
                      let creature = CreatureBuilderContent.creature(for: "cat"),
                      let outfit = CreatureBuilderContent.outfit(for: "superhero"),
                      let buddy = CreatureBuilderContent.buddy(for: "fox") else {
                    return
                }
                selectCreature(creature)
                selectOutfit(outfit)
                selectBuddy(buddy)
                print("CREATURE_BUILDER_EVENT event=automated_recipe_selected recipe=cat/superhero/fox")
                createCreature()
            }
        }
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
        queueFull = false
        
        Task {
            if useMockMode {
                let response = await mockService.createGeneration(
                    creatureId: creature.id,
                    outfitId: outfit.id,
                    buddyId: buddy.id
                )
                
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
                
                queuedJobs.append(job)
                clearSelections()
                playCreateSound()
                if ProcessInfo.processInfo.arguments.contains("-autoPlayCreatureBuilder") {
                    automatedGenerationID = response.generationId
                    currentTab = .making
                }
                startPollingIfNeeded()
                isCreating = false
                return
            }
            
            let request = CreateCreatureRequest(
                creatureId: creature.id,
                outfitId: outfit.id,
                buddyId: buddy.id,
                requestId: ProcessInfo.processInfo.arguments.contains("-autoPlayCreatureBuilder")
                    ? "ios-creature-builder-premium-uat-v1"
                    : UUID().uuidString
            )
            
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
                
                if response.status == .queued {
                    queuedJobs.append(job)
                } else {
                    activeJobs.append(job)
                }
                print(
                    "CREATURE_BUILDER_EVENT event=generation_accepted " +
                    "generation=\(response.generationId) status=\(response.status.rawValue)"
                )
                if ProcessInfo.processInfo.arguments.contains("-autoPlayCreatureBuilder") {
                    automatedGenerationID = response.generationId
                    currentTab = .making
                }
                
                clearSelections()
                playCreateSound()
                
                startPollingIfNeeded()
                
            } catch let error as CreatureBuilderError {
                switch error {
                case .queueFull:
                    queueFull = true
                    errorMessage = "The creature machine is very busy! Try again soon."
                case .invalidIngredient(let message):
                    errorMessage = message
                case .conflict:
                    errorMessage = "Something went wrong. Please try again."
                case .serverError(let message):
                    errorMessage = message
                case .networkError:
                    errorMessage = "Oops! The creature machine got confused."
                }
                print("❌ Create creature error: \(error)")
            } catch {
                errorMessage = "Oops! The creature machine got confused."
                print("❌ Create creature error: \(error)")
            }
            
            isCreating = false
        }
    }
    
    func retryFailedJob(_ job: GenerationJob) {
        failedJobs.removeAll { $0.id == job.id }
        
        selectedCreature = CreatureBuilderContent.creature(for: job.creatureId)
        selectedOutfit = CreatureBuilderContent.outfit(for: job.outfitId)
        selectedBuddy = CreatureBuilderContent.buddy(for: job.buddyId)
        
        createCreature()
    }
    
    func dismissFailedJob(_ job: GenerationJob) {
        failedJobs.removeAll { $0.id == job.id }
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
            if useMockMode {
                _ = mockService.revealCard(cardId: card.id)
            } else {
                await markCardRevealed(card.id)
            }
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
        
        let newFavorite = collection[index].isFavorite
        
        Task {
            if useMockMode {
                mockService.setFavorite(cardId: card.id, isFavorite: newFavorite)
            } else {
                await updateFavorite(card.id, isFavorite: newFavorite)
            }
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
            if useMockMode {
                let state = mockService.getState()
                activeJobs = state.active
                queuedJobs = state.queued
                failedJobs = state.failedJobs
                readyToReveal = state.readyToReveal
                collection = state.collection.sorted { $0.createdAt > $1.createdAt }
                print(
                    "CREATURE_BUILDER_EVENT event=state_loaded " +
                    "active=\(state.active.count) queued=\(state.queued.count) " +
                    "ready=\(state.readyToReveal.count) collection=\(state.collection.count)"
                )
                
                if state.shouldPoll {
                    startPollingIfNeeded()
                }
                isLoading = false
                return
            }
            
            do {
                let state = try await fetchStateAsync()
                
                activeJobs = state.active
                queuedJobs = state.queued
                failedJobs = state.failedJobs
                readyToReveal = state.readyToReveal
                collection = state.collection.sorted { $0.createdAt > $1.createdAt }
                
                if state.shouldPoll {
                    startPollingIfNeeded()
                }
                
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
        guard pollTimer == nil, shouldPoll else { return }
        
        pollTimer = Timer.scheduledTimer(
            withTimeInterval: 3.0,
            repeats: true
        ) { [weak self] _ in
            MainActor.assumeIsolated {
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
            let state: CreatureBuilderState
            
            if useMockMode {
                state = mockService.getState()
            } else {
                do {
                    state = try await fetchStateAsync()
                } catch {
                    print("❌ Poll error: \(error)")
                    return
                }
            }
            
            let previousReadyCount = readyToReveal.count
            
            activeJobs = state.active
            queuedJobs = state.queued
            failedJobs = state.failedJobs
            readyToReveal = state.readyToReveal
            print(
                "CREATURE_BUILDER_EVENT event=state_polled " +
                "active=\(state.active.count) queued=\(state.queued.count) " +
                "failed=\(state.failedJobs.count) ready=\(state.readyToReveal.count)"
            )

            if let generationID = automatedGenerationID,
               let card = state.readyToReveal.first(where: {
                   $0.generationId == generationID
               }) {
                automatedGenerationID = nil
                currentTab = .making
                print(
                    "CREATURE_BUILDER_EVENT event=automated_card_ready " +
                    "card=\(card.id)"
                )
                revealCard(card)
            }
            
            for card in state.collection where card.isRevealed {
                if !collection.contains(where: { $0.id == card.id }) {
                    collection.insert(card, at: 0)
                }
            }
            
            if state.readyToReveal.count > previousReadyCount {
                playReadySound()
            }
            
            if !state.shouldPoll {
                stopPolling()
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
            throw CreatureBuilderError.networkError
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw CreatureBuilderError.networkError
        }
        
        switch httpResponse.statusCode {
        case 200, 201:
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(CreateCreatureResponse.self, from: data)
        case 400:
            if let serverError = try? JSONDecoder().decode(ServerError.self, from: data) {
                if serverError.code == "invalid_ingredient" {
                    throw CreatureBuilderError.invalidIngredient(serverError.error)
                }
                throw CreatureBuilderError.serverError(serverError.error)
            }
            throw CreatureBuilderError.serverError("Bad request")
        case 409:
            throw CreatureBuilderError.conflict
        case 429:
            throw CreatureBuilderError.queueFull
        default:
            if let serverError = try? JSONDecoder().decode(ServerError.self, from: data) {
                throw CreatureBuilderError.serverError(serverError.error)
            }
            throw CreatureBuilderError.networkError
        }
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

// MARK: - Errors

enum CreatureBuilderError: LocalizedError {
    case networkError
    case queueFull
    case conflict
    case invalidIngredient(String)
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .networkError:
            return "Network error"
        case .queueFull:
            return "Queue is full"
        case .conflict:
            return "Request conflict"
        case .invalidIngredient(let message):
            return message
        case .serverError(let message):
            return message
        }
    }
}
