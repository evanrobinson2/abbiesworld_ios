//
//  CardFactoryView.swift
//  abbies.world.ios
//
//  Card Factory for Abbie's World 2 - create creature cards using ingredients.
//

import SwiftUI

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
                        
                        previewAndCreatePanel
                            .frame(width: geometry.size.width * 0.35)
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 20)
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
                
                Text("Combine ingredients to create magical creature cards!")
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
        VStack(spacing: 16) {
            ingredientSection(
                title: "CREATURE",
                subtitle: "Who is it?",
                icon: "pawprint.fill",
                color: .orange,
                ingredients: factoryViewModel.availableCreatures,
                selectedId: factoryViewModel.selectedCreature?.id,
                onSelect: { factoryViewModel.selectCreature($0) }
            )
            
            ingredientSection(
                title: "COSTUME / POWER",
                subtitle: "What can it do?",
                icon: "bolt.fill",
                color: .blue,
                ingredients: factoryViewModel.availableFunctions,
                selectedId: factoryViewModel.selectedFunction?.id,
                onSelect: { factoryViewModel.selectFunction($0) }
            )
            
            ingredientSection(
                title: "PLACE",
                subtitle: "Where is it?",
                icon: "globe",
                color: .green,
                ingredients: factoryViewModel.availableContexts,
                selectedId: factoryViewModel.selectedContext?.id,
                onSelect: { factoryViewModel.selectContext($0) }
            )
        }
    }
    
    private func ingredientSection(
        title: String,
        subtitle: String,
        icon: String,
        color: Color,
        ingredients: [IngredientDefinition],
        selectedId: String?,
        onSelect: @escaping (IngredientDefinition) -> Void
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
                            IngredientSelectionTile(
                                ingredient: ingredient,
                                isSelected: ingredient.id == selectedId,
                                accentColor: color,
                                onSelect: { onSelect(ingredient) }
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
    
    private var previewAndCreatePanel: some View {
        VStack(spacing: 20) {
            recipePreview
            
            createButton
            
            if factoryViewModel.isCreating {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    .scaleEffect(1.2)
            }
            
            if let error = factoryViewModel.errorMessage {
                Text(error)
                    .font(.system(size: 14, design: .rounded))
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding()
            }
            
            Spacer()
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.08))
        )
    }
    
    private var recipePreview: some View {
        VStack(spacing: 16) {
            Text("YOUR RECIPE")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.white.opacity(0.6))
            
            HStack(spacing: 8) {
                ingredientChip(factoryViewModel.selectedCreature, color: .orange)
                
                Text("+")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white.opacity(0.5))
                
                ingredientChip(factoryViewModel.selectedFunction, color: .blue)
                
                Text("+")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white.opacity(0.5))
                
                ingredientChip(factoryViewModel.selectedContext, color: .green)
            }
            
            HStack(spacing: 4) {
                Text("=")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white.opacity(0.5))
                
                mysteryCard
            }
            
            if factoryViewModel.canCreate {
                Text(factoryViewModel.recipeDescription)
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundColor(.yellow)
                    .multilineTextAlignment(.center)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.black.opacity(0.3))
        )
    }
    
    private func ingredientChip(_ ingredient: IngredientDefinition?, color: Color) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10)
                .fill(color.opacity(ingredient != nil ? 0.3 : 0.1))
                .frame(width: 50, height: 60)
            
            if let ingredient = ingredient {
                VStack(spacing: 4) {
                    Image(systemName: iconFor(ingredient.category))
                        .font(.system(size: 18))
                        .foregroundColor(color)
                    
                    Text(ingredient.name.prefix(6))
                        .font(.system(size: 8, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                }
            } else {
                Text("?")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(color.opacity(0.5))
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(
                    ingredient != nil ? color : color.opacity(0.3),
                    lineWidth: ingredient != nil ? 2 : 1
                )
        )
    }
    
    private func iconFor(_ category: IngredientCategory) -> String {
        switch category {
        case .creature: return "pawprint.fill"
        case .function: return "bolt.fill"
        case .context: return "globe"
        }
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
                .frame(width: 70, height: 90)
            
            if factoryViewModel.canCreate {
                Image(systemName: "sparkles")
                    .font(.system(size: 28))
                    .foregroundColor(.yellow)
            } else {
                Text("?")
                    .font(.system(size: 32, weight: .black))
                    .foregroundColor(.yellow.opacity(0.7))
            }
        }
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(
                    factoryViewModel.canCreate ? Color.yellow : Color.white.opacity(0.3),
                    lineWidth: factoryViewModel.canCreate ? 3 : 1
                )
        )
        .shadow(
            color: factoryViewModel.canCreate ? .purple.opacity(0.5) : .clear,
            radius: 10
        )
    }
    
    private var createButton: some View {
        Button(action: {
            Task {
                await factoryViewModel.createCard(
                    playerService: PlayerStateService.shared
                )
            }
        }) {
            HStack(spacing: 12) {
                if factoryViewModel.isCreating {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                } else {
                    Image(systemName: "diamond.fill")
                        .foregroundColor(.cyan)
                    
                    Text("CREATE CARD")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                    
                    Text("(1 gem)")
                        .font(.system(size: 14, weight: .medium, design: .rounded))
                        .foregroundColor(.white.opacity(0.7))
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                Group {
                    if factoryViewModel.canCreate && viewModel.gems >= 1 {
                        LinearGradient(
                            colors: [.purple, .pink],
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
        .disabled(!factoryViewModel.canCreate || viewModel.gems < 1 || factoryViewModel.isCreating)
        .opacity(factoryViewModel.canCreate && viewModel.gems >= 1 ? 1 : 0.5)
    }
}

struct IngredientSelectionTile: View {
    let ingredient: IngredientDefinition
    let isSelected: Bool
    let accentColor: Color
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            VStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(accentColor.opacity(isSelected ? 0.4 : 0.2))
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
            }
        }
        .scaleEffect(isSelected ? 1.05 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
    
    private func iconFor(_ category: IngredientCategory) -> String {
        switch category {
        case .creature: return "pawprint.fill"
        case .function: return "bolt.fill"
        case .context: return "globe"
        }
    }
}

@MainActor
class CardFactoryViewModel: ObservableObject {
    @Published var availableCreatures: [IngredientDefinition] = []
    @Published var availableFunctions: [IngredientDefinition] = []
    @Published var availableContexts: [IngredientDefinition] = []
    
    @Published var selectedCreature: IngredientDefinition?
    @Published var selectedFunction: IngredientDefinition?
    @Published var selectedContext: IngredientDefinition?
    
    @Published var isCreating = false
    @Published var errorMessage: String?
    
    var canCreate: Bool {
        selectedCreature != nil && selectedFunction != nil && selectedContext != nil && !isCreating
    }
    
    var recipeDescription: String {
        guard let creature = selectedCreature,
              let function = selectedFunction,
              let context = selectedContext else {
            return ""
        }
        return "A \(function.name) \(creature.name) in \(context.name)"
    }
    
    func loadAvailableIngredients(from playerService: PlayerStateService) {
        let catalog = IngredientCatalog.sampleCatalog
        
        let ownedCreatureIds = Set(playerService.creatureIngredients.filter { !$0.used }.map { $0.ingredientId })
        let ownedFunctionIds = Set(playerService.functionIngredients.filter { !$0.used }.map { $0.ingredientId })
        let ownedContextIds = Set(playerService.contextIngredients.filter { !$0.used }.map { $0.ingredientId })
        
        availableCreatures = catalog.creatures.filter { ownedCreatureIds.contains($0.id) }
        availableFunctions = catalog.functions.filter { ownedFunctionIds.contains($0.id) }
        availableContexts = catalog.contexts.filter { ownedContextIds.contains($0.id) }
        
        if availableCreatures.isEmpty && availableFunctions.isEmpty && availableContexts.isEmpty {
            availableCreatures = Array(catalog.creatures.prefix(3))
            availableFunctions = Array(catalog.functions.prefix(3))
            availableContexts = Array(catalog.contexts.prefix(3))
        }
    }
    
    func selectCreature(_ ingredient: IngredientDefinition) {
        selectedCreature = ingredient
    }
    
    func selectFunction(_ ingredient: IngredientDefinition) {
        selectedFunction = ingredient
    }
    
    func selectContext(_ ingredient: IngredientDefinition) {
        selectedContext = ingredient
    }
    
    func createCard(playerService: PlayerStateService) async {
        guard canCreate else { return }
        guard playerService.spendGems(1) else {
            errorMessage = "Not enough gems!"
            return
        }
        
        isCreating = true
        errorMessage = nil
        
        do {
            try await Task.sleep(for: .seconds(2))
            
            let card = CreatureCard(
                id: UUID().uuidString,
                playerId: playerService.currentPlayer?.playerId.rawValue ?? "",
                creatureIngredient: CreatureCard.IngredientReference(
                    id: selectedCreature!.id,
                    name: selectedCreature!.name,
                    category: .creature
                ),
                functionIngredient: CreatureCard.IngredientReference(
                    id: selectedFunction!.id,
                    name: selectedFunction!.name,
                    category: .function
                ),
                contextIngredient: CreatureCard.IngredientReference(
                    id: selectedContext!.id,
                    name: selectedContext!.name,
                    category: .context
                ),
                prompt: recipeDescription,
                generatedImageUrl: nil,
                thumbnailUrl: nil,
                createdAt: Date(),
                accepted: true,
                inActiveDeck: false,
                rarity: .common,
                score: nil,
                generationStatus: .completed
            )
            
            playerService.addCardToCollection(card)
            
            selectedCreature = nil
            selectedFunction = nil
            selectedContext = nil
            
            isCreating = false
            
        } catch {
            isCreating = false
            errorMessage = "Something went wrong. Try again!"
            playerService.addGems(1)
        }
    }
}

#Preview {
    World2CardFactoryView(
        viewModel: World2ViewModel(),
        onExit: {}
    )
}
