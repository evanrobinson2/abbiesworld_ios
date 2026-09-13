//
//  CardShopView.swift
//  abbies.world.ios
//
//  Card Shop for Abbie's World 2 - sell cards for gems, buy decorations.
//  Core loop: FARM → CRAFT → SELL → DECORATE
//

import SwiftUI

struct World2CardShopView: View {
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void
    
    @State private var selectedTab: ShopTab = .sell
    @State private var selectedCard: World2CreatureCard?
    @State private var showingSellConfirmation = false
    @State private var justSold = false
    @State private var soldAmount = 0
    
    private var playerService: PlayerStateService { PlayerStateService.shared }
    
    private var collection: [World2CreatureCard] {
        playerService.currentPlayer?.cardCollection.acceptedCards ?? []
    }
    
    private var sellableCards: [World2CreatureCard] {
        collection.filter { !$0.inActiveDeck }
    }
    
    enum ShopTab: String, CaseIterable {
        case sell = "SELL CARDS"
        case buy = "BUY DECOR"
    }
    
    var body: some View {
        ZStack {
            backgroundGradient
                .ignoresSafeArea()
            
            VStack(spacing: 0) {
                shopHeader
                
                tabPicker
                
                if selectedTab == .sell {
                    sellCardsView
                } else {
                    buyDecorView
                }
            }
            
            if showingSellConfirmation, let card = selectedCard {
                sellConfirmationOverlay(card: card)
            }
            
            if justSold {
                soldCelebration
            }
        }
    }
    
    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color(red: 0.15, green: 0.10, blue: 0.25),
                Color(red: 0.10, green: 0.15, blue: 0.30)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
    
    private var shopHeader: some View {
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
                Text("💰 CARD SHOP 💰")
                    .font(.system(size: 28, weight: .black, design: .rounded))
                    .foregroundColor(.white)
                
                Text("Sell cards for gems, buy decorations!")
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
    
    private var tabPicker: some View {
        HStack(spacing: 0) {
            ForEach(ShopTab.allCases, id: \.self) { tab in
                Button(action: {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                        selectedTab = tab
                    }
                }) {
                    VStack(spacing: 6) {
                        HStack(spacing: 8) {
                            Image(systemName: tab == .sell ? "arrow.up.circle.fill" : "cart.fill")
                            Text(tab.rawValue)
                        }
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        
                        Rectangle()
                            .fill(selectedTab == tab ? Color.yellow : Color.clear)
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
    
    private var sellCardsView: some View {
        Group {
            if sellableCards.isEmpty {
                emptyMessage(
                    icon: "creditcard",
                    title: "No Cards to Sell",
                    subtitle: "Cards in your active deck can't be sold. Create more cards at the Card Factory!"
                )
            } else {
                VStack(spacing: 16) {
                    Text("Tap a card to sell it for gems")
                        .font(.system(size: 14, design: .rounded))
                        .foregroundColor(.white.opacity(0.6))
                        .padding(.top, 12)
                    
                    ScrollView {
                        LazyVGrid(
                            columns: [
                                GridItem(.adaptive(minimum: 150, maximum: 200), spacing: 16)
                            ],
                            spacing: 16
                        ) {
                            ForEach(sellableCards) { card in
                                SellableCardTile(
                                    card: card,
                                    onTap: {
                                        selectedCard = card
                                        showingSellConfirmation = true
                                    }
                                )
                            }
                        }
                        .padding()
                    }
                }
            }
        }
    }
    
    private var buyDecorView: some View {
        VStack(spacing: 20) {
            Text("Decorations for your Home")
                .font(.system(size: 14, design: .rounded))
                .foregroundColor(.white.opacity(0.6))
                .padding(.top, 12)
            
            ScrollView {
                LazyVGrid(
                    columns: [
                        GridItem(.adaptive(minimum: 140, maximum: 180), spacing: 16)
                    ],
                    spacing: 16
                ) {
                    ForEach(availableDecorations) { item in
                        DecorationShopTile(
                            decoration: item,
                            canAfford: viewModel.gems >= item.price,
                            onBuy: {
                                buyDecoration(item)
                            }
                        )
                    }
                }
                .padding()
            }
        }
    }
    
    private func sellConfirmationOverlay(card: World2CreatureCard) -> some View {
        ZStack {
            Color.black.opacity(0.8)
                .ignoresSafeArea()
                .onTapGesture {
                    showingSellConfirmation = false
                    selectedCard = nil
                }
            
            VStack(spacing: 24) {
                Text("Sell this card?")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
                
                cardPreview(card)
                
                HStack(spacing: 8) {
                    Image(systemName: "diamond.fill")
                        .foregroundColor(.cyan)
                    Text("You'll receive \(sellPrice(for: card)) gems")
                        .font(.system(size: 18, weight: .semibold, design: .rounded))
                        .foregroundColor(.cyan)
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.cyan.opacity(0.2))
                )
                
                HStack(spacing: 20) {
                    Button(action: {
                        showingSellConfirmation = false
                        selectedCard = nil
                    }) {
                        Text("Keep It")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .frame(width: 140)
                            .padding(.vertical, 16)
                            .background(Color.gray.opacity(0.5))
                            .cornerRadius(16)
                    }
                    
                    Button(action: {
                        sellCard(card)
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "diamond.fill")
                            Text("Sell")
                        }
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(.white)
                        .frame(width: 140)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(
                                colors: [.green, .teal],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(16)
                    }
                }
            }
            .padding(32)
            .background(
                RoundedRectangle(cornerRadius: 24)
                    .fill(Color(red: 0.12, green: 0.10, blue: 0.22))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 24)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
        .transition(.opacity)
    }
    
    private func cardPreview(_ card: World2CreatureCard) -> some View {
        VStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
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
                        .font(.system(size: 36))
                        .foregroundColor(.yellow)
                    
                    HStack(spacing: 4) {
                        ForEach(card.allIngredients, id: \.id) { ref in
                            Circle()
                                .fill(colorFor(ref.category))
                                .frame(width: 12, height: 12)
                        }
                    }
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color(hex: card.rarity.colorHex) ?? .gray, lineWidth: 3)
            )
            
            Text(card.displayName)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            
            Text(card.rarity.displayName)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color(hex: card.rarity.colorHex) ?? .gray)
        }
    }
    
    private var soldCelebration: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)
            
            Text("SOLD!")
                .font(.system(size: 32, weight: .black, design: .rounded))
                .foregroundColor(.white)
            
            HStack(spacing: 8) {
                Image(systemName: "diamond.fill")
                    .foregroundColor(.cyan)
                Text("+\(soldAmount) gems")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(.cyan)
            }
        }
        .padding(40)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(Color.black.opacity(0.9))
        )
        .transition(.scale.combined(with: .opacity))
    }
    
    private func emptyMessage(icon: String, title: String, subtitle: String) -> some View {
        VStack(spacing: 20) {
            Spacer()
            
            Image(systemName: icon)
                .font(.system(size: 60))
                .foregroundColor(.white.opacity(0.3))
            
            Text(title)
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            
            Text(subtitle)
                .font(.system(size: 16, design: .rounded))
                .foregroundColor(.white.opacity(0.6))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Spacer()
        }
    }
    
    private func colorFor(_ category: IngredientCategory) -> Color {
        switch category {
        case .creature: return .orange
        case .function: return .blue
        case .context: return .green
        }
    }
    
    private func sellPrice(for card: World2CreatureCard) -> Int {
        switch card.rarity {
        case .common: return 1
        case .uncommon: return 2
        case .rare: return 4
        case .epic: return 8
        case .legendary: return 15
        }
    }
    
    private func sellCard(_ card: World2CreatureCard) {
        let price = sellPrice(for: card)
        
        playerService.sellCard(card.id)
        playerService.addGems(price)
        
        showingSellConfirmation = false
        selectedCard = nil
        soldAmount = price
        
        withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
            justSold = true
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            withAnimation {
                justSold = false
            }
        }
    }
    
    private var availableDecorations: [ShopDecoration] {
        [
            ShopDecoration(id: "decor.plant", name: "Magic Plant", icon: "leaf.fill", price: 3, color: .green),
            ShopDecoration(id: "decor.lamp", name: "Glowing Lamp", icon: "lightbulb.fill", price: 5, color: .yellow),
            ShopDecoration(id: "decor.star", name: "Star Mobile", icon: "star.fill", price: 8, color: .purple),
            ShopDecoration(id: "decor.globe", name: "Snow Globe", icon: "globe", price: 10, color: .cyan),
            ShopDecoration(id: "decor.trophy", name: "Gold Trophy", icon: "trophy.fill", price: 15, color: .orange),
            ShopDecoration(id: "decor.rainbow", name: "Rainbow Arc", icon: "rainbow", price: 20, color: .pink)
        ]
    }
    
    private func buyDecoration(_ decoration: ShopDecoration) {
        guard playerService.spendGems(decoration.price) else {
            viewModel.showToast("Not enough gems!")
            return
        }
        
        let instance = DecorationInstance(decorationId: decoration.id, x: 0.5, y: 0.5)
        playerService.addDecoration(instance)
        
        viewModel.showToast("Bought \(decoration.name)!")
    }
}

struct ShopDecoration: Identifiable {
    let id: String
    let name: String
    let icon: String
    let price: Int
    let color: Color
}

struct SellableCardTile: View {
    let card: World2CreatureCard
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                ZStack(alignment: .topTrailing) {
                    cardArt
                    
                    priceBadge
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
                    .stroke(Color.green.opacity(0.3), lineWidth: 1)
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
                        ingredientIcon(ref.category)
                    }
                }
                
                Image(systemName: "sparkles")
                    .font(.system(size: 32))
                    .foregroundColor(.yellow)
            }
        }
    }
    
    private var priceBadge: some View {
        HStack(spacing: 4) {
            Image(systemName: "diamond.fill")
                .font(.system(size: 12))
            Text("\(sellPrice)")
                .font(.system(size: 14, weight: .bold))
        }
        .foregroundColor(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(Color.green.gradient)
        )
        .padding(6)
    }
    
    private var sellPrice: Int {
        switch card.rarity {
        case .common: return 1
        case .uncommon: return 2
        case .rare: return 4
        case .epic: return 8
        case .legendary: return 15
        }
    }
    
    private func ingredientIcon(_ category: IngredientCategory) -> some View {
        let color: Color = {
            switch category {
            case .creature: return .orange
            case .function: return .blue
            case .context: return .green
            }
        }()
        
        return Image(systemName: iconFor(category))
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

struct DecorationShopTile: View {
    let decoration: ShopDecoration
    let canAfford: Bool
    let onBuy: () -> Void
    
    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                RoundedRectangle(cornerRadius: 16)
                    .fill(decoration.color.opacity(0.2))
                    .frame(height: 100)
                
                Image(systemName: decoration.icon)
                    .font(.system(size: 40))
                    .foregroundColor(decoration.color)
            }
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(decoration.color.opacity(0.5), lineWidth: 2)
            )
            
            Text(decoration.name)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.white)
            
            Button(action: onBuy) {
                HStack(spacing: 6) {
                    Image(systemName: "diamond.fill")
                        .font(.system(size: 12))
                    Text("\(decoration.price)")
                        .font(.system(size: 14, weight: .bold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(canAfford ? Color.green : Color.gray)
                .cornerRadius(10)
            }
            .disabled(!canAfford)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(Color.white.opacity(0.05))
        )
    }
}

#Preview {
    World2CardShopView(
        viewModel: World2ViewModel(),
        onExit: {}
    )
}
