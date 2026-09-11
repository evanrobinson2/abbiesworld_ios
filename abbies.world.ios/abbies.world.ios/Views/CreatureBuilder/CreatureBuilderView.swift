//
//  CreatureBuilderView.swift
//  abbies.world.ios
//
//  Main container for Creature Card Builder minigame.
//

import SwiftUI

struct CreatureBuilderView: View {
    @StateObject private var viewModel = CreatureBuilderViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            backgroundGradient
            
            VStack(spacing: 0) {
                header
                
                tabContent
                
                tabBar
            }
        }
        .sheet(isPresented: $viewModel.showingReveal) {
            if let card = viewModel.cardToReveal {
                CardRevealView(card: card) {
                    viewModel.completeReveal()
                }
            }
        }
        .sheet(isPresented: $viewModel.showingDetail) {
            if let card = viewModel.cardDetail {
                CardDetailView(
                    card: card,
                    onFavorite: { viewModel.toggleFavorite(card) },
                    onMakeAnother: { viewModel.makeAnotherLikeThis(card) }
                )
            }
        }
        .onAppear {
            viewModel.loadState()
        }
    }
    
    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color(red: 0.2, green: 0.1, blue: 0.4),
                Color(red: 0.1, green: 0.2, blue: 0.3)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
    
    private var header: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.title)
                    .foregroundColor(.white.opacity(0.7))
            }
            
            Spacer()
            
            Text("✨ Creature Lab ✨")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.white)
            
            Spacer()
            
            Color.clear.frame(width: 44)
        }
        .padding()
    }
    
    @ViewBuilder
    private var tabContent: some View {
        switch viewModel.currentTab {
        case .build:
            BuilderView(viewModel: viewModel)
        case .making:
            MakingView(viewModel: viewModel)
        case .myCards:
            MyCardsView(viewModel: viewModel)
        }
    }
    
    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(CreatureBuilderTab.allCases, id: \.self) { tab in
                tabButton(tab)
            }
        }
        .padding(.horizontal)
        .padding(.bottom, 8)
    }
    
    private func tabButton(_ tab: CreatureBuilderTab) -> some View {
        Button {
            withAnimation(.spring(response: 0.3)) {
                viewModel.currentTab = tab
            }
        } label: {
            VStack(spacing: 4) {
                ZStack(alignment: .topTrailing) {
                    Text(tabIcon(tab))
                        .font(.title2)
                    
                    if tab == .making, let badge = viewModel.makingBadge {
                        Text(badge)
                            .font(.caption2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(badge.contains("!") ? Color.green : Color.orange)
                            .clipShape(Capsule())
                            .offset(x: 12, y: -8)
                    }
                }
                
                Text(tab.rawValue)
                    .font(.caption)
                    .fontWeight(viewModel.currentTab == tab ? .bold : .regular)
            }
            .foregroundColor(viewModel.currentTab == tab ? .white : .white.opacity(0.5))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                viewModel.currentTab == tab
                    ? Color.white.opacity(0.2)
                    : Color.clear
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
    
    private func tabIcon(_ tab: CreatureBuilderTab) -> String {
        switch tab {
        case .build: return "🔮"
        case .making: return "✨"
        case .myCards: return "🃏"
        }
    }
}

// MARK: - Builder View

struct BuilderView: View {
    @ObservedObject var viewModel: CreatureBuilderViewModel
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                sectionHeader("PICK A CREATURE", subtitle: "Who is it?")
                IngredientPicker(
                    ingredients: viewModel.creatures,
                    selected: viewModel.selectedCreature
                ) { viewModel.selectCreature($0) }
                
                sectionHeader("PICK AN OUTFIT", subtitle: "What powers?")
                IngredientPicker(
                    ingredients: viewModel.outfits,
                    selected: viewModel.selectedOutfit
                ) { viewModel.selectOutfit($0) }
                
                sectionHeader("PICK A BUDDY", subtitle: "What personality?")
                IngredientPicker(
                    ingredients: viewModel.buddies,
                    selected: viewModel.selectedBuddy
                ) { viewModel.selectBuddy($0) }
                
                if viewModel.canCreate {
                    recipePreview
                    makeItButton
                }
                
                Spacer(minLength: 40)
            }
            .padding(.vertical)
        }
    }
    
    private func sectionHeader(_ title: String, subtitle: String) -> some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.white)
            Text(subtitle)
                .font(.caption)
                .foregroundColor(.white.opacity(0.7))
        }
    }
    
    private var recipePreview: some View {
        VStack(spacing: 12) {
            HStack(spacing: 20) {
                if let creature = viewModel.selectedCreature {
                    ingredientBubble(creature)
                }
                Text("+")
                    .font(.title2)
                    .foregroundColor(.white.opacity(0.7))
                if let outfit = viewModel.selectedOutfit {
                    ingredientBubble(outfit)
                }
                Text("+")
                    .font(.title2)
                    .foregroundColor(.white.opacity(0.7))
                if let buddy = viewModel.selectedBuddy {
                    ingredientBubble(buddy)
                }
            }
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal)
    }
    
    private func ingredientBubble(_ ingredient: CreatureIngredient) -> some View {
        VStack(spacing: 4) {
            Text(ingredient.displayIcon)
                .font(.largeTitle)
            Text(ingredient.name)
                .font(.caption2)
                .foregroundColor(.white)
        }
    }
    
    private var makeItButton: some View {
        Button {
            viewModel.createCreature()
        } label: {
            HStack {
                Text("✨")
                Text("MAKE IT!")
                    .fontWeight(.bold)
                Text("✨")
            }
            .font(.title2)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(
                LinearGradient(
                    colors: [.purple, .pink],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .shadow(color: .purple.opacity(0.5), radius: 10, y: 5)
        }
        .disabled(viewModel.isCreating)
        .opacity(viewModel.isCreating ? 0.6 : 1)
        .padding(.horizontal, 40)
    }
}

// MARK: - Ingredient Picker

struct IngredientPicker: View {
    let ingredients: [CreatureIngredient]
    let selected: CreatureIngredient?
    let onSelect: (CreatureIngredient) -> Void
    
    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(ingredients) { ingredient in
                    IngredientTile(
                        ingredient: ingredient,
                        isSelected: selected?.id == ingredient.id,
                        onTap: { onSelect(ingredient) }
                    )
                }
            }
            .padding(.horizontal)
        }
    }
}

struct IngredientTile: View {
    let ingredient: CreatureIngredient
    let isSelected: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                Text(ingredient.displayIcon)
                    .font(.system(size: 48))
                
                Text(ingredient.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .lineLimit(1)
            }
            .frame(width: 90, height: 100)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(isSelected ? Color.white.opacity(0.3) : Color.white.opacity(0.1))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(isSelected ? Color.yellow : Color.clear, lineWidth: 3)
            )
            .scaleEffect(isSelected ? 1.1 : 1.0)
            .animation(.spring(response: 0.3), value: isSelected)
        }
        .accessibilityLabel(ingredient.name)
    }
}

#Preview {
    CreatureBuilderView()
}
