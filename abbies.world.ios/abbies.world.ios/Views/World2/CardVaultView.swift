//
//  CardVaultView.swift
//  abbies.world.ios
//
//  Card Vault for Abbie's World 2 - manage card collection and active deck.
//

import SwiftUI

struct World2CardVaultView: View {
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void
    
    @State private var selectedTab: VaultTab = .collection
    @State private var selectedCard: World2CreatureCard?
    @State private var showingCardDetail = false
    
    private var playerService: PlayerStateService { PlayerStateService.shared }
    
    private var collection: [World2CreatureCard] {
        playerService.currentPlayer?.cardCollection.acceptedCards ?? []
    }
    
    private var activeDeck: [World2CreatureCard] {
        playerService.currentPlayer?.cardCollection.activeDeckCards ?? []
    }
    
    enum VaultTab: String, CaseIterable {
        case collection = "ALL CARDS"
        case deck = "ACTIVE DECK"
    }
    
    var body: some View {
        ZStack {
            backgroundGradient
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                vaultHeader
                
                tabPicker
                
                if selectedTab == .collection {
                    collectionView
                } else {
                    deckView
                }
            }
        }
        .sheet(isPresented: $showingCardDetail) {
            if let card = selectedCard {
                CardDetailSheet(
                    card: card,
                    isInDeck: activeDeck.contains { $0.id == card.id },
                    onToggleDeck: {
                        toggleDeckStatus(card)
                    },
                    onDismiss: {
                        showingCardDetail = false
                    }
                )
                .presentationDetents([.medium, .large])
            }
        }
        .world2InteriorActions(
            exitAccessibilityID: "world2.cardVault.exit",
            onExit: onExit
        )
    }
    
    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color(red: 0.08, green: 0.06, blue: 0.20),
                Color(red: 0.15, green: 0.08, blue: 0.30)
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }
    
    private var vaultHeader: some View {
        HStack {
            Spacer()
            
            VStack(spacing: 4) {
                Text("📚 CARD VAULT 📚")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                
                Text("View your collection and manage your deck")
                    .font(.system(size: 14, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.7))
            }
            
            Spacer()
            
            deckCounter
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 16)
        .background(Color.black.opacity(0.3))
    }
    
    private var deckCounter: some View {
        VStack(spacing: 4) {
            HStack(spacing: 6) {
                Image(systemName: "rectangle.portrait.on.rectangle.portrait.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.purple)
                
                Text("\(activeDeck.count)/5")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }
            
            Text("Active Deck")
                .font(.system(size: 10, weight: .medium))
                .foregroundColor(.white.opacity(0.6))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.purple.opacity(0.2))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.purple.opacity(0.5), lineWidth: 2)
                )
        )
    }
    
    private var tabPicker: some View {
        HStack(spacing: 0) {
            ForEach(VaultTab.allCases, id: \.self) { tab in
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        selectedTab = tab
                    }
                }) {
                    VStack(spacing: 6) {
                        HStack(spacing: 8) {
                            Image(systemName: tab == .collection ? "square.grid.3x3.fill" : "star.fill")
                            Text(tab.rawValue)
                            
                            if tab == .collection {
                                Text("(\(collection.count))")
                                    .foregroundColor(.white.opacity(0.6))
                            } else {
                                Text("(\(activeDeck.count))")
                                    .foregroundColor(.white.opacity(0.6))
                            }
                        }
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        
                        Rectangle()
                            .fill(selectedTab == tab ? Color.purple : Color.clear)
                            .frame(height: 3)
                    }
                    .foregroundColor(selectedTab == tab ? .white : .white.opacity(0.5))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
            }
        }
        .background(Color.white.opacity(0.05))
    }
    
    private var collectionView: some View {
        Group {
            if collection.isEmpty {
                emptyCollectionMessage
            } else {
                ScrollView {
                    LazyVGrid(
                        columns: [
                            GridItem(.adaptive(minimum: 150, maximum: 200), spacing: 16)
                        ],
                        spacing: 16
                    ) {
                        ForEach(collection) { card in
                            CardTile(
                                card: card,
                                isInDeck: activeDeck.contains { $0.id == card.id },
                                onTap: {
                                    selectedCard = card
                                    showingCardDetail = true
                                }
                            )
                        }
                    }
                    .padding()
                }
            }
        }
    }
    
    private var deckView: some View {
        VStack(spacing: 20) {
            if activeDeck.isEmpty {
                emptyDeckMessage
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 20) {
                        ForEach(activeDeck) { card in
                            DeckCardTile(
                                card: card,
                                onTap: {
                                    selectedCard = card
                                    showingCardDetail = true
                                },
                                onRemove: {
                                    toggleDeckStatus(card)
                                }
                            )
                        }
                        
                        ForEach(0..<(5 - activeDeck.count), id: \.self) { _ in
                            emptyDeckSlot
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 20)
                }
            }
            
            Text("Your active deck is used in battles and special events!")
                .font(.system(size: 14, design: .rounded))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Spacer()
        }
        .padding(.top, 20)
    }
    
    private var emptyCollectionMessage: some View {
        VStack(spacing: 20) {
            Spacer()
            
            Image(systemName: "archivebox")
                .font(.system(size: 60))
                .foregroundColor(.white.opacity(0.3))
            
            Text("No Cards Yet!")
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            
            Text("Visit the Card Factory to create your first creature card!")
                .font(.system(size: 16, design: .rounded))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
        }
    }
    
    private var emptyDeckMessage: some View {
        VStack(spacing: 20) {
            Image(systemName: "star.slash")
                .font(.system(size: 50))
                .foregroundColor(.white.opacity(0.3))
            
            Text("Your deck is empty!")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            
            Text("Tap cards in your collection to add them to your active deck.")
                .font(.system(size: 14, design: .rounded))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)
        }
        .padding()
    }
    
    private var emptyDeckSlot: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .stroke(style: StrokeStyle(lineWidth: 2, dash: [8, 4]))
                .foregroundColor(.white.opacity(0.2))
                .frame(width: 120, height: 160)
            
            VStack(spacing: 8) {
                Image(systemName: "plus.circle")
                    .font(.system(size: 30))
                
                Text("Empty")
                    .font(.system(size: 12, weight: .medium))
            }
            .foregroundColor(.white.opacity(0.3))
        }
    }
    
    private func toggleDeckStatus(_ card: World2CreatureCard) {
        if activeDeck.contains(where: { $0.id == card.id }) {
            _ = playerService.removeFromActiveDeck(card.id)
        } else if activeDeck.count < 5 {
            _ = playerService.addToActiveDeck(card.id)
        }
    }
}

struct CardTile: View {
    let card: World2CreatureCard
    let isInDeck: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                ZStack(alignment: .topTrailing) {
                    cardArt
                    
                    if isInDeck {
                        Image(systemName: "star.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.yellow)
                            .padding(8)
                            .background(Circle().fill(Color.black.opacity(0.6)))
                            .padding(6)
                    }
                }
                
                VStack(spacing: 4) {
                    Text(card.displayName)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    Text(card.rarity.displayName)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(Color(hex: card.rarity.colorHex) ?? .gray)
                }
            }
            .padding(8)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.white.opacity(0.08))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(
                        isInDeck ? Color.yellow.opacity(0.5) : Color.white.opacity(0.1),
                        lineWidth: isInDeck ? 2 : 1
                    )
            )
        }
    }
    
    private var cardArt: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12)
                .fill(
                    LinearGradient(
                        colors: [.indigo, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(height: 140)
            
            VStack(spacing: 8) {
                HStack(spacing: 4) {
                    ForEach(card.allIngredients, id: \.id) { ref in
                        ingredientIcon(ref.category, color: colorFor(ref.category))
                    }
                }
                
                Image(systemName: "sparkles")
                    .font(.system(size: 32))
                    .foregroundColor(.yellow)
            }
        }
    }
    
    private func colorFor(_ category: IngredientCategory) -> Color {
        switch category {
        case .creature: return .orange
        case .function: return .blue
        case .context: return .green
        }
    }
    
    private func ingredientIcon(_ category: IngredientCategory, color: Color) -> some View {
        Image(systemName: iconFor(category))
            .font(.system(size: 14, weight: .bold))
            .foregroundColor(color)
            .frame(width: 28, height: 28)
            .background(Circle().fill(color.opacity(0.2)))
    }
    
    private func iconFor(_ category: IngredientCategory) -> String {
        switch category {
        case .creature: return "pawprint.fill"
        case .function: return "bolt.fill"
        case .context: return "globe"
        }
    }
}

struct DeckCardTile: View {
    let card: World2CreatureCard
    let onTap: () -> Void
    let onRemove: () -> Void
    
    var body: some View {
        VStack(spacing: 8) {
            ZStack(alignment: .topTrailing) {
                cardArt
                
                Button(action: onRemove) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.red)
                        .background(Circle().fill(Color.white))
                }
                .padding(4)
            }
            
            Text(card.displayName)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .lineLimit(1)
        }
        .frame(width: 120)
        .onTapGesture(perform: onTap)
    }
    
    private var cardArt: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 14)
                .fill(
                    LinearGradient(
                        colors: [.indigo, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 120, height: 160)
            
            VStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 40))
                    .foregroundColor(.yellow)
                
                HStack(spacing: 4) {
                    miniIcon(.orange)
                    miniIcon(.blue)
                    miniIcon(.green)
                }
            }
            
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.yellow.opacity(0.5), lineWidth: 2)
                .frame(width: 120, height: 160)
        }
        .shadow(color: .purple.opacity(0.4), radius: 8, y: 4)
    }
    
    private func miniIcon(_ color: Color) -> some View {
        Circle()
            .fill(color)
            .frame(width: 12, height: 12)
    }
}

struct CardDetailSheet: View {
    let card: World2CreatureCard
    let isInDeck: Bool
    let onToggleDeck: () -> Void
    let onDismiss: () -> Void
    
    var body: some View {
        ZStack {
            Color(red: 0.08, green: 0.06, blue: 0.20)
                .ignoresSafeArea()
            
            VStack(spacing: 24) {
                HStack {
                    Button(action: onDismiss) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    Spacer()
                }
                .padding(.horizontal)
                
                cardPreview
                
                VStack(spacing: 8) {
                    Text(card.displayName)
                        .font(.system(size: 28, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                    
                    Text(card.fullDescription)
                        .font(.system(size: 16, design: .rounded))
                        .foregroundColor(.white.opacity(0.7))
                    
                    HStack(spacing: 16) {
                        rarityBadge
                        
                        Text("Created \(formattedDate)")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.5))
                    }
                    .padding(.top, 8)
                }
                
                ingredientBreakdown
                
                Button(action: onToggleDeck) {
                    HStack(spacing: 8) {
                        Image(systemName: isInDeck ? "star.slash.fill" : "star.fill")
                        Text(isInDeck ? "Remove from Deck" : "Add to Deck")
                    }
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(isInDeck ? Color.red.opacity(0.8) : Color.purple)
                    .cornerRadius(16)
                }
                .padding(.horizontal)
                
                Spacer()
            }
            .padding(.top)
        }
    }
    
    private var cardPreview: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [.indigo, .purple],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 200, height: 280)
            
            VStack(spacing: 16) {
                Image(systemName: "sparkles")
                    .font(.system(size: 60))
                    .foregroundColor(.yellow)
                
                HStack(spacing: 8) {
                    ForEach(card.allIngredients, id: \.id) { ref in
                        ingredientChip(ref, color: colorFor(ref.category))
                    }
                }
            }
            
            RoundedRectangle(cornerRadius: 20)
                .stroke(
                    LinearGradient(
                        colors: [.yellow, .orange],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 3
                )
                .frame(width: 200, height: 280)
        }
        .shadow(color: .purple.opacity(0.5), radius: 20, y: 10)
    }
    
    private func colorFor(_ category: IngredientCategory) -> Color {
        switch category {
        case .creature: return .orange
        case .function: return .blue
        case .context: return .green
        }
    }
    
    private func ingredientChip(_ ref: World2CreatureCard.IngredientReference, color: Color) -> some View {
        VStack(spacing: 4) {
            Image(systemName: iconFor(ref.category))
                .font(.system(size: 20))
                .foregroundColor(color)
            
            Text(ref.name.prefix(4))
                .font(.system(size: 8, weight: .bold))
                .foregroundColor(.white)
        }
        .frame(width: 44, height: 50)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(color.opacity(0.2))
        )
    }
    
    private func iconFor(_ category: IngredientCategory) -> String {
        switch category {
        case .creature: return "pawprint.fill"
        case .function: return "bolt.fill"
        case .context: return "globe"
        }
    }
    
    private var rarityBadge: some View {
        Text(card.rarity.displayName.uppercased())
            .font(.system(size: 12, weight: .bold))
            .foregroundColor(.white)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(Color(hex: card.rarity.colorHex) ?? .gray)
            )
    }
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: card.createdAt)
    }
    
    private var ingredientBreakdown: some View {
        VStack(spacing: 12) {
            Text("INGREDIENTS USED")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.white.opacity(0.5))
            
            HStack(spacing: 20) {
                ForEach(card.allIngredients, id: \.id) { ref in
                    ingredientLabel(ref.name, icon: iconFor(ref.category), color: colorFor(ref.category))
                }
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.white.opacity(0.05))
        )
        .padding(.horizontal)
    }
    
    private func ingredientLabel(_ name: String, icon: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundColor(color)
            
            Text(name)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    World2CardVaultView(
        viewModel: World2ViewModel(),
        onExit: {}
    )
}
