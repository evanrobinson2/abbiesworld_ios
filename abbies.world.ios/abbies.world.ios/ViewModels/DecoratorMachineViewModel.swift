//
//  DecoratorMachineViewModel.swift
//  abbies.world.ios
//
//  ViewModel for Decorator Machine minigame.
//

import Foundation
import Combine
import SwiftUI

enum DecoratorMachineTab: String, CaseIterable {
    case create = "CREATE"
    case making = "MAKING"
    case inventory = "INVENTORY"
}

enum MachineAnimationState {
    case idle
    case ingredientsHovering
    case ingredientsDroppingIn
    case processing
    case complete
}

@MainActor
class DecoratorMachineViewModel: ObservableObject {
    
    // MARK: - Published State
    
    @Published var currentTab: DecoratorMachineTab = .create
    
    @Published var selectedEssences: [DecoratorEssence] = []
    
    @Published var activeJobs: [DecoratorJob] = []
    @Published var queuedJobs: [DecoratorJob] = []
    @Published var failedJobs: [DecoratorJob] = []
    @Published var readyToReveal: [Decoration] = []
    @Published var inventory: [Decoration] = []
    
    @Published var isLoading = false
    @Published var isCreating = false
    @Published var errorMessage: String?
    @Published var queueFull = false
    
    @Published var machineState: MachineAnimationState = .idle
    @Published var decorationToReveal: Decoration?
    @Published var showingReveal = false
    @Published var decorationDetail: Decoration?
    @Published var showingDetail = false
    
    // MARK: - Configuration
    
    let minEssences = 2
    let maxEssences = 5
    
    // MARK: - Computed
    
    var canAddMore: Bool {
        selectedEssences.count < maxEssences
    }
    
    var canCreate: Bool {
        selectedEssences.count >= minEssences && !isCreating
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
    
    var favorites: [Decoration] {
        inventory.filter { $0.isFavorite }
    }
    
    var recipeDescription: String {
        if selectedEssences.isEmpty {
            return "Add essences to create something magical!"
        }
        return selectedEssences.map { $0.emoji }.joined(separator: " + ")
    }
    
    /// Kid-friendly curated set of essences - start simple, unlock more later
    var availableEssences: [DecoratorEssence] {
        // Start with 8 fun, easy-to-understand essences
        // Mix of critters (visual) and feelings (relatable)
        let starterIds = [
            "cat_whisker",      // 🐱 Kids love cats
            "bunny_bounce",     // 🐰 Bouncy bunny
            "rainbow_hiccup",   // 🌈 Colorful!
            "cloud_fluff",      // ☁️ Soft and fluffy
            "giggle_fizz",      // 🤭 Silly!
            "starlight_dust",   // ✨ Sparkly magic
            "cozy_nap_energy",  // 😴 Sleepy time
            "bubblegum_dream",  // 🍬 Sweet treat
        ]
        
        return starterIds.compactMap { DecoratorEssenceContent.essence(for: $0) }
    }
    
    // MARK: - Private
    
    private let apiClient = APIClient.shared
    private var cancellables = Set<AnyCancellable>()
    private var pollTimer: Timer?
    
    private(set) var useMockMode: Bool = true
    
    // MARK: - Init
    
    init() {
        let arguments = ProcessInfo.processInfo.arguments
        useMockMode = !arguments.contains("-useProductionDecorator")
        print("decorator_machine.mode value=\(useMockMode ? "mock" : "production")")
        
        loadState()
    }
    
    deinit {
        pollTimer?.invalidate()
    }
    
    // MARK: - Essence Selection
    
    func toggleEssence(_ essence: DecoratorEssence) {
        if let index = selectedEssences.firstIndex(where: { $0.id == essence.id }) {
            selectedEssences.remove(at: index)
            playDeselectSound()
        } else if canAddMore {
            selectedEssences.append(essence)
            playSelectSound()
        }
        
        updateMachineState()
    }
    
    func isSelected(_ essence: DecoratorEssence) -> Bool {
        selectedEssences.contains { $0.id == essence.id }
    }
    
    func clearSelections() {
        selectedEssences.removeAll()
        machineState = .idle
    }
    
    private func updateMachineState() {
        if selectedEssences.isEmpty {
            machineState = .idle
        } else {
            machineState = .ingredientsHovering
        }
    }
    
    // MARK: - Create Decoration
    
    func createDecoration() {
        guard canCreate else { return }
        
        isCreating = true
        errorMessage = nil
        queueFull = false
        
        withAnimation(.easeInOut(duration: 0.5)) {
            machineState = .ingredientsDroppingIn
        }
        
        Task {
            try? await Task.sleep(for: .milliseconds(800))
            
            withAnimation(.easeInOut(duration: 0.3)) {
                machineState = .processing
            }
            
            if useMockMode {
                await createMockDecoration()
            } else {
                await createProductionDecoration()
            }
        }
    }
    
    private func createMockDecoration() async {
        let recipe = DecoratorRecipe(essenceIds: selectedEssences.map { $0.id })
        let generationId = UUID().uuidString
        let decorationId = UUID().uuidString
        
        let job = DecoratorJob(
            id: generationId,
            decorationId: decorationId,
            recipe: recipe,
            status: .generating,
            createdAt: Date(),
            updatedAt: Date(),
            errorMessage: nil
        )
        
        activeJobs.append(job)
        
        let essencesCopy = selectedEssences
        clearSelections()
        playCreateSound()
        
        withAnimation(.easeInOut(duration: 0.3)) {
            machineState = .idle
        }
        
        isCreating = false
        startPollingIfNeeded()
        
        try? await Task.sleep(for: .seconds(3))
        
        let mockPrompt = composePrompt(from: essencesCopy)
        let mockDecoration = Decoration(
            id: decorationId,
            generationId: generationId,
            recipe: recipe,
            name: generateWhimsicalName(from: essencesCopy),
            description: generateDescription(from: essencesCopy),
            imageURL: "mock://decoration/\(decorationId)",
            promptUsed: mockPrompt,
            createdAt: Date(),
            isRevealed: false,
            isFavorite: false
        )
        
        activeJobs.removeAll { $0.id == generationId }
        readyToReveal.append(mockDecoration)
        playReadySound()
        
        if !shouldPoll {
            stopPolling()
        }
    }
    
    private func createProductionDecoration() async {
        let request = CreateDecorationRequest(
            essenceIds: selectedEssences.map { $0.id },
            requestId: UUID().uuidString
        )
        
        do {
            let response = try await createDecorationAsync(request: request)
            
            let job = DecoratorJob(
                id: response.generationId,
                decorationId: response.decorationId,
                recipe: DecoratorRecipe(essenceIds: request.essenceIds),
                status: response.status,
                createdAt: Date(),
                updatedAt: Date(),
                errorMessage: nil
            )
            
            if response.status == .queued {
                queuedJobs.append(job)
            } else {
                activeJobs.append(job)
            }
            
            print(
                "DECORATOR_MACHINE_EVENT event=generation_accepted " +
                "generation=\(response.generationId) status=\(response.status.rawValue)"
            )
            
            clearSelections()
            playCreateSound()
            
            withAnimation(.easeInOut(duration: 0.3)) {
                machineState = .idle
            }
            
            startPollingIfNeeded()
            
        } catch let error as DecoratorError {
            handleError(error)
        } catch {
            errorMessage = "Oops! The decorator machine got confused."
            print("❌ Create decoration error: \(error)")
        }
        
        isCreating = false
    }
    
    private func handleError(_ error: DecoratorError) {
        switch error {
        case .queueFull:
            queueFull = true
            errorMessage = "The decorator machine is very busy! Try again soon."
        case .invalidEssence(let message):
            errorMessage = message
        case .conflict:
            errorMessage = "Something went wrong. Please try again."
        case .serverError(let message):
            errorMessage = message
        case .networkError:
            errorMessage = "Oops! The decorator machine got confused."
        }
        print("❌ Create decoration error: \(error)")
        
        withAnimation(.easeInOut(duration: 0.3)) {
            machineState = .ingredientsHovering
        }
    }
    
    func retryFailedJob(_ job: DecoratorJob) {
        failedJobs.removeAll { $0.id == job.id }
        
        selectedEssences = job.essenceIds.compactMap { DecoratorEssenceContent.essence(for: $0) }
        createDecoration()
    }
    
    func dismissFailedJob(_ job: DecoratorJob) {
        failedJobs.removeAll { $0.id == job.id }
    }
    
    // MARK: - Prompt Composition (The DAG)
    
    func composePrompt(from essences: [DecoratorEssence]) -> String {
        var promptParts: [String] = []
        
        promptParts.append("whimsical fantasy furniture decoration")
        
        let allTags = essences.flatMap { $0.promptTags }
        let uniqueTags = Array(Set(allTags)).shuffled().prefix(8)
        promptParts.append(contentsOf: uniqueTags)
        
        let critterEssences = essences.filter { $0.category == .critters }
        if !critterEssences.isEmpty {
            let critterNames = critterEssences.map { $0.name.lowercased() }
            promptParts.append("shaped like a \(critterNames.joined(separator: " and "))")
        }
        
        let weatherEssences = essences.filter { $0.category == .weather }
        for essence in weatherEssences {
            switch essence.id {
            case "rainbow_hiccup":
                promptParts.append("bursting with rainbow colors")
            case "moonbeam":
                promptParts.append("glowing with soft moonlight")
            case "starlight_dust":
                promptParts.append("sparkling with stardust")
            default:
                break
            }
        }
        
        promptParts.append("storybook style")
        promptParts.append("cozy fantasy furniture shop aesthetic")
        promptParts.append("digital painting")
        promptParts.append("clean background")
        
        return promptParts.joined(separator: ", ")
    }
    
    private func generateWhimsicalName(from essences: [DecoratorEssence]) -> String {
        let adjectives = ["Cozy", "Magical", "Dreamy", "Snuggly", "Sparkly", "Whimsical", "Bouncy", "Fluffy"]
        let nouns = ["Lounger", "Armchair", "Ottoman", "Sofa", "Throne", "Cushion", "Perch", "Nest"]
        
        let essenceWord = essences.randomElement()?.name.split(separator: " ").first ?? "Magic"
        let adj = adjectives.randomElement() ?? "Cozy"
        let noun = nouns.randomElement() ?? "Chair"
        
        return "\(adj) \(essenceWord) \(noun)"
    }
    
    private func generateDescription(from essences: [DecoratorEssence]) -> String {
        let flavors = essences.map { $0.flavorText }
        let combined = flavors.prefix(2).joined(separator: " meets ")
        return "A furniture piece that embodies: \(combined)."
    }
    
    // MARK: - Reveal
    
    func revealDecoration(_ decoration: Decoration) {
        decorationToReveal = decoration
        showingReveal = true
        playReadySound()
    }
    
    func completeReveal() {
        guard var decoration = decorationToReveal else { return }
        
        decoration.isRevealed = true
        
        readyToReveal.removeAll { $0.id == decoration.id }
        
        if let index = inventory.firstIndex(where: { $0.id == decoration.id }) {
            inventory[index] = decoration
        } else {
            inventory.insert(decoration, at: 0)
        }
        
        decorationToReveal = nil
        showingReveal = false
        
        playRevealSound()
        
        Task {
            if !useMockMode {
                await markDecorationRevealed(decoration.id)
            }
        }
    }
    
    // MARK: - Inventory
    
    func showDecorationDetail(_ decoration: Decoration) {
        decorationDetail = decoration
        showingDetail = true
    }
    
    func toggleFavorite(_ decoration: Decoration) {
        guard let index = inventory.firstIndex(where: { $0.id == decoration.id }) else { return }
        inventory[index].isFavorite.toggle()
        
        let newFavorite = inventory[index].isFavorite
        
        Task {
            if !useMockMode {
                await updateFavorite(decoration.id, isFavorite: newFavorite)
            }
        }
    }
    
    func makeAnotherLikeThis(_ decoration: Decoration) {
        selectedEssences = decoration.recipeEssenceIds.compactMap {
            DecoratorEssenceContent.essence(for: $0)
        }
        currentTab = .create
        showingDetail = false
        updateMachineState()
    }
    
    // MARK: - State Management
    
    func loadState() {
        isLoading = true
        
        Task {
            if useMockMode {
                isLoading = false
                return
            }
            
            do {
                let state = try await fetchStateAsync()
                
                activeJobs = state.active
                queuedJobs = state.queued
                failedJobs = state.failedJobs
                readyToReveal = state.readyToReveal
                inventory = state.inventory.sorted { $0.createdAt > $1.createdAt }
                
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
        guard !useMockMode else { return }
        
        Task {
            do {
                let state = try await fetchStateAsync()
                
                let previousReadyCount = readyToReveal.count
                
                activeJobs = state.active
                queuedJobs = state.queued
                failedJobs = state.failedJobs
                readyToReveal = state.readyToReveal
                
                print(
                    "DECORATOR_MACHINE_EVENT event=state_polled " +
                    "active=\(state.active.count) queued=\(state.queued.count) " +
                    "failed=\(state.failedJobs.count) ready=\(state.readyToReveal.count)"
                )
                
                for decoration in state.inventory where decoration.isRevealed {
                    if !inventory.contains(where: { $0.id == decoration.id }) {
                        inventory.insert(decoration, at: 0)
                    }
                }
                
                if state.readyToReveal.count > previousReadyCount {
                    playReadySound()
                }
                
                if !state.shouldPoll {
                    stopPolling()
                }
            } catch {
                print("❌ Poll error: \(error)")
            }
        }
    }
    
    // MARK: - Audio
    
    private func playSelectSound() {
        // TODO: Play bubbly select sound
    }
    
    private func playDeselectSound() {
        // TODO: Play soft pop sound
    }
    
    private func playCreateSound() {
        // TODO: Play magical machine whirr
    }
    
    private func playReadySound() {
        // TODO: Play ready chime
    }
    
    private func playRevealSound() {
        // TODO: Play celebration fanfare
    }
    
    // MARK: - API Calls
    
    private func createDecorationAsync(request: CreateDecorationRequest) async throws -> CreateDecorationResponse {
        guard let url = URL(string: "\(apiClient.baseURL)/api/games/decorator-machine/generations") else {
            throw DecoratorError.networkError
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw DecoratorError.networkError
        }
        
        switch httpResponse.statusCode {
        case 200, 201:
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(CreateDecorationResponse.self, from: data)
        case 400:
            if let serverError = try? JSONDecoder().decode(ServerError.self, from: data) {
                if serverError.code == "invalid_essence" {
                    throw DecoratorError.invalidEssence(serverError.error)
                }
                throw DecoratorError.serverError(serverError.error)
            }
            throw DecoratorError.serverError("Bad request")
        case 409:
            throw DecoratorError.conflict
        case 429:
            throw DecoratorError.queueFull
        default:
            if let serverError = try? JSONDecoder().decode(ServerError.self, from: data) {
                throw DecoratorError.serverError(serverError.error)
            }
            throw DecoratorError.networkError
        }
    }
    
    private func fetchStateAsync() async throws -> DecoratorState {
        guard let url = URL(string: "\(apiClient.baseURL)/api/games/decorator-machine/state") else {
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
        return try decoder.decode(DecoratorState.self, from: data)
    }
    
    private func markDecorationRevealed(_ decorationId: String) async {
        guard let url = URL(string: "\(apiClient.baseURL)/api/games/decorator-machine/decorations/\(decorationId)/reveal") else {
            return
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        
        _ = try? await URLSession.shared.data(for: urlRequest)
    }
    
    private func updateFavorite(_ decorationId: String, isFavorite: Bool) async {
        guard let url = URL(string: "\(apiClient.baseURL)/api/games/decorator-machine/decorations/\(decorationId)/favorite") else {
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

enum DecoratorError: LocalizedError {
    case networkError
    case queueFull
    case conflict
    case invalidEssence(String)
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .networkError:
            return "Network error"
        case .queueFull:
            return "Queue is full"
        case .conflict:
            return "Request conflict"
        case .invalidEssence(let message):
            return message
        case .serverError(let message):
            return message
        }
    }
}
