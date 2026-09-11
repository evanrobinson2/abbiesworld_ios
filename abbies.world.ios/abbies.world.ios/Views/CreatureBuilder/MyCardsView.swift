//
//  MyCardsView.swift
//  abbies.world.ios
//
//  Collection grid showing all created creature cards.
//

import SwiftUI

struct MyCardsView: View {
    @ObservedObject var viewModel: CreatureBuilderViewModel
    @State private var showFavoritesOnly = false
    
    private var displayedCards: [CreatureCard] {
        if showFavoritesOnly {
            return viewModel.favorites
        }
        return viewModel.collection
    }
    
    var body: some View {
        VStack(spacing: 16) {
            filterBar
            
            if displayedCards.isEmpty {
                emptyState
            } else {
                cardGrid
            }
        }
    }
    
    private var filterBar: some View {
        HStack {
            Text("\(displayedCards.count) Cards")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.7))
            
            Spacer()
            
            Button {
                withAnimation {
                    showFavoritesOnly.toggle()
                }
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: showFavoritesOnly ? "heart.fill" : "heart")
                    Text("Favorites")
                }
                .font(.subheadline)
                .foregroundColor(showFavoritesOnly ? .pink : .white.opacity(0.7))
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(showFavoritesOnly ? Color.pink.opacity(0.2) : Color.white.opacity(0.1))
                .clipShape(Capsule())
            }
        }
        .padding(.horizontal)
    }
    
    private var cardGrid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 140))], spacing: 16) {
                ForEach(displayedCards) { card in
                    CardThumbnail(card: card) {
                        viewModel.showCardDetail(card)
                    }
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 40)
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            
            Text("🃏")
                .font(.system(size: 60))
            
            if showFavoritesOnly {
                Text("No favorites yet")
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.7))
                
                Text("Tap ❤️ on a card to add it!")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.5))
            } else {
                Text("No cards yet")
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.7))
                
                Text("Create your first creature!")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.5))
                
                Button {
                    viewModel.currentTab = .build
                } label: {
                    Text("Start Building")
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color.purple)
                        .clipShape(Capsule())
                }
            }
            
            Spacer()
        }
    }
}

// MARK: - Card Thumbnail

struct CardThumbnail: View {
    let card: CreatureCard
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                ZStack {
                    AsyncImage(url: URL(string: card.imageURL)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        case .failure:
                            placeholderImage
                        case .empty:
                            ProgressView()
                                .tint(.white)
                        @unknown default:
                            placeholderImage
                        }
                    }
                    .frame(width: 140, height: 140)
                    .clipped()
                    
                    if card.isFavorite {
                        VStack {
                            HStack {
                                Spacer()
                                Image(systemName: "heart.fill")
                                    .foregroundColor(.pink)
                                    .padding(6)
                                    .background(Color.black.opacity(0.5))
                                    .clipShape(Circle())
                            }
                            Spacer()
                        }
                        .padding(4)
                    }
                }
                
                VStack(spacing: 2) {
                    Text(card.name)
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    HStack(spacing: 2) {
                        Text(CreatureBuilderContent.creature(for: card.creatureId)?.displayIcon ?? "")
                        Text(CreatureBuilderContent.outfit(for: card.outfitId)?.displayIcon ?? "")
                        Text(CreatureBuilderContent.buddy(for: card.buddyId)?.displayIcon ?? "")
                    }
                    .font(.caption2)
                }
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(Color.black.opacity(0.3))
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
        }
    }
    
    private var placeholderImage: some View {
        ZStack {
            Color.purple.opacity(0.3)
            Text("🎨")
                .font(.largeTitle)
        }
    }
}

#Preview {
    ZStack {
        Color(red: 0.1, green: 0.1, blue: 0.2)
            .ignoresSafeArea()
        MyCardsView(viewModel: CreatureBuilderViewModel())
    }
}
