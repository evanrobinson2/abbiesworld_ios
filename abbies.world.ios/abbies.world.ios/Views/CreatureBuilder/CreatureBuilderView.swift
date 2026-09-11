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
            VStack(spacing: 20) {
                CreaturePicker(
                    ingredients: viewModel.creatures,
                    selected: viewModel.selectedCreature
                ) { viewModel.selectCreature($0) }
                
                OutfitPicker(
                    ingredients: viewModel.outfits,
                    selected: viewModel.selectedOutfit
                ) { viewModel.selectOutfit($0) }
                
                BuddyPicker(
                    ingredients: viewModel.buddies,
                    selected: viewModel.selectedBuddy
                ) { viewModel.selectBuddy($0) }
                
                if viewModel.canCreate {
                    recipePreview
                    makeItButton
                }
                
                if viewModel.queueFull {
                    queueFullMessage
                }
                
                if let error = viewModel.errorMessage {
                    errorMessage(error)
                }
                
                Spacer(minLength: 40)
            }
            .padding(.vertical)
        }
    }
    
    private var recipePreview: some View {
        VStack(spacing: 16) {
            Text("YOUR CREATURE")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white.opacity(0.7))
            
            HStack(spacing: 12) {
                if let creature = viewModel.selectedCreature {
                    CreatureTile(ingredient: creature, isSelected: false, size: 70)
                }
                Text("+")
                    .font(.title)
                    .foregroundColor(.white.opacity(0.5))
                if let outfit = viewModel.selectedOutfit {
                    OutfitTile(ingredient: outfit, isSelected: false, size: 70)
                }
                Text("+")
                    .font(.title)
                    .foregroundColor(.white.opacity(0.5))
                if let buddy = viewModel.selectedBuddy {
                    BuddyTile(ingredient: buddy, isSelected: false, size: 70)
                }
            }
            
            Text("= ???")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.yellow)
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .padding(.horizontal)
    }
    
    private var makeItButton: some View {
        Button {
            viewModel.createCreature()
        } label: {
            HStack(spacing: 12) {
                if viewModel.isCreating {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("✨")
                        .font(.title)
                }
                Text(viewModel.isCreating ? "MAKING..." : "MAKE IT!")
                    .font(.title2)
                    .fontWeight(.bold)
                if !viewModel.isCreating {
                    Text("✨")
                        .font(.title)
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(
                LinearGradient(
                    colors: viewModel.isCreating ? [.gray, .gray.opacity(0.7)] : [.purple, .pink],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 24))
            .shadow(color: viewModel.isCreating ? .clear : .purple.opacity(0.5), radius: 10, y: 5)
        }
        .disabled(viewModel.isCreating)
        .padding(.horizontal, 32)
    }
    
    private var queueFullMessage: some View {
        HStack {
            Text("⏳")
            Text("The creature machine is very busy! Try again soon.")
                .font(.subheadline)
        }
        .foregroundColor(.orange)
        .padding()
        .background(Color.orange.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
    
    private func errorMessage(_ message: String) -> some View {
        HStack {
            Text("😢")
            Text(message)
                .font(.subheadline)
        }
        .foregroundColor(.red)
        .padding()
        .background(Color.red.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

#Preview {
    CreatureBuilderView()
}
