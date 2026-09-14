//
//  CardFactoryView.swift
//  abbies.world.ios
//
//  Card Factory for Abbie's World - craft creature cards by combining any 3 ingredients.
//  Uses deterministic recipe hashing for caching - same ingredients = same card.
//

import SwiftUI
import CryptoKit

struct World2CardFactoryView: View {
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void
    
    @StateObject private var factoryViewModel = CardFactoryViewModel()
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                backgroundGradient
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    factoryHeader
                    
                    HStack(spacing: 20) {
                        ingredientSelectionPanel
                            .frame(width: geometry.size.width * 0.55)
                        
                        craftingPanel
                            .frame(width: geometry.size.width * 0.35)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
                }
                
                if factoryViewModel.showingCardReveal, let card = factoryViewModel.revealedCard {
                    cardRevealOverlay(card: card)
                }
            }
        }
        .onAppear {
            factoryViewModel.loadAvailableIngredients(from: PlayerStateService.shared)
        }
    }
    
    private var backgroundGradient: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.12, green: 0.08, blue: 0.25),
                    Color(red: 0.08, green: 0.15, blue: 0.35)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            Image(systemName: "sparkles")
                .font(.system(size: 300))
                .foregroundColor(.white.opacity(0.03))
                .rotationEffect(.degrees(-15))
                .offset(x: 100, y: 50)
        }
    }
    
    private var factoryHeader: some View {
        HStack {
            Button(action: onExit) {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.left.circle.fill")
                        .font(.system(size: 28))
                    Text("Back to Map")
                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                }
                .foregroundColor(.white)
            }
            
            Spacer()
            
            VStack(spacing: 4) {
                Text("✨ CARD FACTORY ✨")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                
                Text("Combine any 3 ingredients to craft a creature card!")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.7))
            }
            
            Spacer()
            
            gemCounter
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(Color.black.opacity(0.3))
    }
    
    private var gemCounter: some View {
        HStack(spacing: 8) {
            Image(systemName: "diamond.fill")
                .font(.system(size: 20))
                .foregroundColor(.cyan)
            
            Text("\(viewModel.gems)")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(.white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Capsule()
                .fill(Color.cyan.opacity(0.2))
                .overlay(
                    Capsule()
                        .stroke(Color.cyan.opacity(0.5), lineWidth: 2)
                )
        )
    }
    
    private var ingredientSelectionPanel: some View {
        VStack(spacing: 12) {
            Text("PICK ANY 3 INGREDIENTS")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.white.opacity(0.6))
            
            ScrollView {
                VStack(spacing: 16) {
                    ingredientSection(
                        title: "CREATURES",
                        subtitle: "Who is it?",
                        icon: "pawprint.fill",
                        color: .orange,
                        ingredients: factoryViewModel.availableCreatures
                    )
                    
                    ingredientSection(
                        title: "COSTUMES & POWERS",
                        subtitle: "What can it do?",
                        icon: "bolt.fill",
                        color: .blue,
                        ingredients: factoryViewModel.availableFunctions
                    )
                    
                    ingredientSection(
                        title: "PLACES",
                        subtitle: "Where is it?",
                        icon: "globe",
                        color: .green,
                        ingredients: factoryViewModel.availableContexts
                    )
                }
            }
        }
    }
    
    private func ingredientSection(
        title: String,
        subtitle: String,
        icon: String,
        color: Color,
        ingredients: [IngredientDefinition]
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 36, height: 36)
                    .background(color.gradient)
                    .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text(subtitle)
                        .font(.system(size: 12, design: .rounded))
                        .foregroundColor(color.opacity(0.8))
                }
                
                Spacer()
                
                Text("\(ingredients.count) available")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.5))
            }
            .padding(.horizontal, 12)
            
            if ingredients.isEmpty {
                emptyIngredientMessage(color: color)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(ingredients) { ingredient in
                            IngredientTile(
                                ingredient: ingredient,
                                isSelected: factoryViewModel.isSelected(ingredient),
                                slotNumber: factoryViewModel.slotNumber(for: ingredient),
                                onTap: { factoryViewModel.toggleIngredient(ingredient) }
                            )
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                }
            }
        }
        .padding(.vertical, 12)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(color.opacity(0.1))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(color.opacity(0.3), lineWidth: 1)
                )
        )
    }
    
    private func emptyIngredientMessage(color: Color) -> some View {
        HStack {
            Image(systemName: "exclamationmark.circle")
                .foregroundColor(color.opacity(0.6))
            
            Text("Visit Adventure World to earn ingredients!")
                .font(.system(size: 14, design: .rounded))
                .foregroundColor(.white.opacity(0.6))
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    
    private var craftingPanel: some View {
        VStack(spacing: 20) {
            recipeSlots
            
            recipePreview
            
            craftButton
            
            if factoryViewModel.generationState == .generating {
                generatingIndicator
            }
            
            if let error = factoryViewModel.errorMessage {
                Text(error)
                    .font(.system(size: 14, design: .rounded))
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding()
            }
            
            if factoryViewModel.hasCachedVersion {
                cachedBadge
            }
            
            Spacer()
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.08))
        )
    }
    
    private var recipeSlots: some View {
        VStack(spacing: 8) {
            Text("RECIPE SLOTS")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundColor(.white.opacity(0.5))
            
            HStack(spacing: 12) {
                ForEach(0..<3) { index in
                    RecipeSlot(
                        slotNumber: index + 1,
                        ingredient: factoryViewModel.selectedIngredients.count > index
                            ? factoryViewModel.selectedIngredients[index]
                            : nil,
                        onRemove: {
                            if factoryViewModel.selectedIngredients.count > index {
                                factoryViewModel.removeIngredient(at: index)
                            }
                        }
                    )
                }
            }
        }
    }
    
    private var recipePreview: some View {
        VStack(spacing: 12) {
            if factoryViewModel.canCraft {
                Text(factoryViewModel.recipeDescription)
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundColor(.yellow)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                mysteryCard
            } else {
                Text("Select 3 ingredients to craft a card")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundColor(.white.opacity(0.5))
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.black.opacity(0.3))
        )
    }
    
    private var mysteryCard: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(
                    LinearGradient(
                        colors: [.indigo, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 80, height: 100)
            
            Image(systemName: "sparkles")
                .font(.system(size: 32))
                .foregroundColor(.yellow)
        }
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.yellow, lineWidth: 3)
        )
        .shadow(color: .purple.opacity(0.5), radius: 10)
    }
    
    private var craftButton: some View {
        Button(action: {
            Task {
                await factoryViewModel.craftCard(
                    playerService: PlayerStateService.shared,
                    parentViewModel: viewModel
                )
            }
        }) {
            HStack(spacing: 12) {
                if factoryViewModel.generationState == .generating {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: "diamond.fill")
                        .foregroundColor(.cyan)
                    
                    Text(factoryViewModel.hasCachedVersion ? "CRAFT (CACHED)" : "CRAFT CARD")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                    
                    if !factoryViewModel.hasCachedVersion {
                        Text("(1 gem)")
                            .font(.system(size: 14, weight: .medium, design: .rounded))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                Group {
                    if factoryViewModel.canCraft && (viewModel.gems >= 1 || factoryViewModel.hasCachedVersion) {
                        LinearGradient(
                            colors: factoryViewModel.hasCachedVersion
                                ? [.green, .teal]
                                : [.purple, .pink],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    } else {
                        Color.gray.opacity(0.3)
                    }
                }
            )
            .cornerRadius(16)
        }
        .disabled(!factoryViewModel.canCraft || factoryViewModel.generationState == .generating ||
                  (!factoryViewModel.hasCachedVersion && viewModel.gems < 1))
        .opacity(factoryViewModel.canCraft ? 1 : 0.5)
    }
    
    private var generatingIndicator: some View {
        VStack(spacing: 8) {
            ProgressView()
                .progressViewStyle(CircularProgressViewStyle(tint: .cyan))
                .scaleEffect(1.5)
            
            Text(factoryViewModel.generationStatusText)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundColor(.cyan)
        }
        .padding()
    }
    
    private var cachedBadge: some View {
        HStack(spacing: 6) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundColor(.green)
            Text("Recipe already exists - FREE to craft!")
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundColor(.green)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(Color.green.opacity(0.2))
        )
    }
    
    private func cardRevealOverlay(card: CreatureCard) -> some View {
        ZStack {
            Color.black.opacity(0.9)
                .ignoresSafeArea()
            
            VStack(spacing: 30) {
                Text("✨ NEW CARD! ✨")
                    .font(.system(size: 32, weight: .black, design: .rounded))
                    .foregroundColor(.yellow)
                
                CardRevealCard(card: card)
                
                Button(action: {
                    factoryViewModel.dismissReveal()
                }) {
                    Text("AWESOME!")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .padding(.horizontal, 40)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(
                                colors: [.purple, .pink],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(25)
                }
            }
        }
        .transition(.opacity)
    }
}

struct IngredientTile: View {
    let ingredient: IngredientDefinition
    let isSelected: Bool
    let slotNumber: Int?
    let onTap: () -> Void
    
    private var accentColor: Color {
        switch ingredient.category {
        case .creature: return .orange
        case .function: return .blue
        case .context: return .green
        }
    }
    
    var body: some View {
        Button(action: onTap) {
            ZStack {
                VStack(spacing: 6) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(accentColor.opacity(isSelected ? 0.5 : 0.2))
                            .frame(width: 70, height: 70)
                        
                        Image(systemName: iconFor(ingredient.category))
                            .font(.system(size: 28))
                            .foregroundColor(isSelected ? .white : accentColor)
                    }
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(
                                isSelected ? Color.yellow : accentColor.opacity(0.5),
                                lineWidth: isSelected ? 3 : 1
                            )
                    )
                    
                    Text(ingredient.name)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)
                        .frame(maxWidth: 70)
                    
                    rarityBadge
                }
                
                if let slot = slotNumber {
                    slotIndicator(slot)
                }
            }
        }
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
    
    private var rarityBadge: some View {
        Text(ingredient.rarity.rawValue.uppercased())
            .font(.system(size: 8, weight: .bold))
            .foregroundColor(rarityColor)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(rarityColor.opacity(0.2))
            .cornerRadius(4)
    }
    
    private var rarityColor: Color {
        switch ingredient.rarity {
        case .common: return .gray
        case .uncommon: return .green
        case .rare: return .blue
        case .epic: return .purple
        case .legendary: return .orange
        }
    }
    
    private func slotIndicator(_ slot: Int) -> some View {
        Text("\(slot)")
            .font(.system(size: 14, weight: .black))
            .foregroundColor(.white)
            .frame(width: 24, height: 24)
            .background(Circle().fill(Color.yellow))
            .offset(x: 30, y: -35)
    }
    
    private func iconFor(_ category: IngredientCategory) -> String {
        switch category {
        case .creature: return "pawprint.fill"
        case .function: return "bolt.fill"
        case .context: return "globe"
        }
    }
}

struct RecipeSlot: View {
    let slotNumber: Int
    let ingredient: IngredientDefinition?
    let onRemove: () -> Void
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(ingredient != nil ? slotColor.opacity(0.3) : Color.white.opacity(0.1))
                .frame(width: 65, height: 80)
            
            if let ingredient = ingredient {
                VStack(spacing: 4) {
                    Image(systemName: iconFor(ingredient.category))
                        .font(.system(size: 22))
                        .foregroundColor(slotColor)
                    
                    Text(ingredient.name.prefix(6))
                        .font(.system(size: 9, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
                
                Button(action: onRemove) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.white.opacity(0.8))
                }
                .offset(x: 25, y: -32)
            } else {
                VStack(spacing: 4) {
                    Text("\(slotNumber)")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.white.opacity(0.3))
                    
                    Text("Empty")
                        .font(.system(size: 10))
                        .foregroundColor(.white.opacity(0.3))
                }
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(
                    ingredient != nil ? slotColor : Color.white.opacity(0.2),
                    lineWidth: ingredient != nil ? 2 : 1
                )
        )
    }
    
    private var slotColor: Color {
        guard let ingredient = ingredient else { return .gray }
        switch ingredient.category {
        case .creature: return .orange
        case .function: return .blue
        case .context: return .green
        }
    }
    
    private func iconFor(_ category: IngredientCategory) -> String {
        switch category {
        case .creature: return "pawprint.fill"
        case .function: return "bolt.fill"
        case .context: return "globe"
        }
    }
}

struct CardRevealCard: View {
    let card: CreatureCard
    
    var body: some View {
        VStack(spacing: 16) {
            ZStack {
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        LinearGradient(
                            colors: [.indigo, .purple, .pink],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 200, height: 280)
                
                VStack(spacing: 12) {
                    if let imageUrl = card.generatedImageUrl, let url = URL(string: imageUrl) {
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 160, height: 160)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                            default:
                                placeholderImage
                            }
                        }
                    } else {
                        placeholderImage
                    }
                    
                    Text(card.prompt ?? "Mystery Creature")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                        .padding(.horizontal, 12)
                    
                    rarityBadge
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.yellow, lineWidth: 4)
            )
            .shadow(color: .purple.opacity(0.5), radius: 20)
        }
    }
    
    private var placeholderImage: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.2))
                .frame(width: 160, height: 160)
            
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundColor(.yellow)
        }
    }
    
    private var rarityBadge: some View {
        Text(card.rarity.rawValue.uppercased())
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 4)
            .background(rarityColor.opacity(0.8))
            .cornerRadius(8)
    }
    
    private var rarityColor: Color {
        switch card.rarity {
        case .common: return .gray
        case .uncommon: return .green
        case .rare: return .blue
        case .epic: return .purple
        case .legendary: return .orange
        }
    }
}


// MARK: - ViewModel

enum CardGenerationState {
    case idle
    case generating
    case completed
    case failed
}

@MainActor
class CardFactoryViewModel: ObservableObject {
    @Published var availableCreatures: [IngredientDefinition] = []
    @Published var availableFunctions: [IngredientDefinition] = []
    @Published var availableContexts: [IngredientDefinition] = []
    
    @Published var selectedIngredients: [IngredientDefinition] = []
    
    @Published var generationState: CardGenerationState = .idle
    @Published var generationStatusText: String = ""
    @Published var errorMessage: String?
    
    @Published var showingCardReveal = false
    @Published var revealedCard: CreatureCard?
    
    @Published var hasCachedVersion = false
    
    private let apiClient = APIClient.shared
    
    var canCraft: Bool {
        selectedIngredients.count == 3 && generationState != .generating
    }
    
    var recipeDescription: String {
        guard selectedIngredients.count == 3 else { return "" }
        let names = selectedIngredients.map { $0.name }
        return "\(names[0]) + \(names[1]) + \(names[2])"
    }
    
    var recipeHash: String {
        let sortedIds = selectedIngredients.map { $0.id }.sorted()
        let recipeString = sortedIds.joined(separator: "|")
        let digest = SHA256.hash(data: Data(recipeString.utf8))
        return digest.prefix(16).map { String(format: "%02x", $0) }.joined()
    }
    
    func loadAvailableIngredients(from playerService: PlayerStateService) {
        let catalog = IngredientCatalog.sampleCatalog
        
        let ownedCreatureIds = Set(playerService.creatureIngredients.map { $0.ingredientId })
        let ownedFunctionIds = Set(playerService.functionIngredients.map { $0.ingredientId })
        let ownedContextIds = Set(playerService.contextIngredients.map { $0.ingredientId })
        
        availableCreatures = catalog.creatures.filter { ownedCreatureIds.contains($0.id) }
        availableFunctions = catalog.functions.filter { ownedFunctionIds.contains($0.id) }
        availableContexts = catalog.contexts.filter { ownedContextIds.contains($0.id) }
        
        if availableCreatures.isEmpty && availableFunctions.isEmpty && availableContexts.isEmpty {
            availableCreatures = catalog.creatures
            availableFunctions = catalog.functions
            availableContexts = catalog.contexts
        }
    }
    
    func isSelected(_ ingredient: IngredientDefinition) -> Bool {
        selectedIngredients.contains { $0.id == ingredient.id }
    }
    
    func slotNumber(for ingredient: IngredientDefinition) -> Int? {
        guard let index = selectedIngredients.firstIndex(where: { $0.id == ingredient.id }) else {
            return nil
        }
        return index + 1
    }
    
    func toggleIngredient(_ ingredient: IngredientDefinition) {
        if let index = selectedIngredients.firstIndex(where: { $0.id == ingredient.id }) {
            selectedIngredients.remove(at: index)
        } else if selectedIngredients.count < 3 {
            selectedIngredients.append(ingredient)
        }
        
        checkForCachedVersion()
    }
    
    func removeIngredient(at index: Int) {
        guard index < selectedIngredients.count else { return }
        selectedIngredients.remove(at: index)
        checkForCachedVersion()
    }
    
    private func checkForCachedVersion() {
        guard selectedIngredients.count == 3 else {
            hasCachedVersion = false
            return
        }
        
        let hash = recipeHash
        let playerService = PlayerStateService.shared
        hasCachedVersion = playerService.hasCardWithRecipeHash(hash)
    }
    
    func craftCard(playerService: PlayerStateService, parentViewModel: World2ViewModel) async {
        guard canCraft else { return }
        
        let hash = recipeHash
        
        if let existingCard = playerService.cardWithRecipeHash(hash) {
            revealedCard = existingCard
            showingCardReveal = true
            selectedIngredients = []
            return
        }
        
        guard playerService.spendGems(1) else {
            errorMessage = "Not enough gems!"
            return
        }
        
        generationState = .generating
        generationStatusText = "Mixing ingredients..."
        errorMessage = nil
        
        do {
            try await Task.sleep(for: .milliseconds(500))
            generationStatusText = "Crafting your creature..."
            
            let prompt = buildPrompt()
            
            try await Task.sleep(for: .milliseconds(500))
            generationStatusText = "Adding magic sparkles..."
            
            let card = try await generateCard(
                prompt: prompt,
                recipeHash: hash,
                playerService: playerService
            )
            
            playerService.addCardToCollection(card)
            
            generationState = .completed
            revealedCard = card
            showingCardReveal = true
            selectedIngredients = []
            
        } catch {
            generationState = .failed
            errorMessage = "Something went wrong. Your gem was refunded!"
            playerService.addGems(1)
        }
    }
    
    private func buildPrompt() -> String {
        let styleInjections = selectedIngredients.map { $0.styleInjection }
        
        return "A magical creature card showing \(styleInjections.joined(separator: ", ")), in a vibrant cartoon style perfect for children"
    }
    
    private func generateCard(
        prompt: String,
        recipeHash: String,
        playerService: PlayerStateService
    ) async throws -> CreatureCard {
        let ingredientRefs = selectedIngredients.map { ingredient in
            CreatureCard.IngredientReference(
                id: ingredient.id,
                name: ingredient.name,
                category: ingredient.category
            )
        }
        
        let highestRarity = selectedIngredients.map { $0.rarity }.max() ?? .common
        let boostedRarity = rollForRarityBoost(base: highestRarity)
        
        let card = CreatureCard(
            id: UUID().uuidString,
            playerId: playerService.currentPlayer?.playerId.rawValue ?? "",
            creatureIngredient: ingredientRefs.count > 0 ? ingredientRefs[0] : nil,
            functionIngredient: ingredientRefs.count > 1 ? ingredientRefs[1] : nil,
            contextIngredient: ingredientRefs.count > 2 ? ingredientRefs[2] : nil,
            prompt: prompt,
            generatedImageUrl: nil,
            thumbnailUrl: nil,
            createdAt: Date(),
            accepted: true,
            inActiveDeck: false,
            rarity: boostedRarity,
            score: nil,
            generationStatus: .pending,
            recipeHash: recipeHash
        )
        
        return card
    }
    
    private func rollForRarityBoost(base: CardRarity) -> CardRarity {
        let roll = Double.random(in: 0...1)
        
        switch base {
        case .common:
            if roll < 0.1 { return .uncommon }
            return .common
        case .uncommon:
            if roll < 0.15 { return .rare }
            return .uncommon
        case .rare:
            if roll < 0.1 { return .epic }
            return .rare
        case .epic:
            if roll < 0.05 { return .legendary }
            return .epic
        case .legendary:
            return .legendary
        }
    }
    
    func dismissReveal() {
        showingCardReveal = false
        revealedCard = nil
        generationState = .idle
        hasCachedVersion = false
    }
}

#Preview {
    World2CardFactoryView(
        viewModel: World2ViewModel(),
        onExit: {}
    )
}
