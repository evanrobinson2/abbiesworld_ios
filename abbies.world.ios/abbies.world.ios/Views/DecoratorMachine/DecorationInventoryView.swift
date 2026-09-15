//
//  DecorationInventoryView.swift
//  abbies.world.ios
//
//  Shows the user's collection of created decorations.
//

import SwiftUI

struct DecorationInventoryView: View {
    @ObservedObject var viewModel: DecoratorMachineViewModel
    
    @State private var filterFavorites = false
    
    private var displayedDecorations: [Decoration] {
        if filterFavorites {
            return viewModel.favorites
        }
        return viewModel.inventory
    }
    
    var body: some View {
        VStack(spacing: 16) {
            filterBar
            
            if displayedDecorations.isEmpty {
                emptyState
            } else {
                decorationGrid
            }
        }
    }
    
    private var filterBar: some View {
        HStack(spacing: 12) {
            FilterChip(
                title: "All",
                count: viewModel.inventory.count,
                isSelected: !filterFavorites
            ) {
                filterFavorites = false
            }
            
            FilterChip(
                title: "Favorites",
                count: viewModel.favorites.count,
                isSelected: filterFavorites,
                symbol: "heart.fill"
            ) {
                filterFavorites = true
            }
            
            Spacer()
        }
        .padding(.horizontal)
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Spacer()
            
            DecoratorGlyph(
                symbol: filterFavorites ? "heart.slash" : "shippingbox",
                tint: .teal,
                size: 68
            )
            
            Text(filterFavorites ? "No favorites yet" : "No decorations yet")
                .font(.headline)
                .foregroundColor(.white.opacity(0.7))
            
            Text(filterFavorites
                 ? "Tap the heart on decorations you love!"
                 : "Create some decorations to fill your inventory!")
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.5))
                .multilineTextAlignment(.center)
            
            if !filterFavorites {
                Button {
                    viewModel.currentTab = .create
                } label: {
                    Text("Start Creating")
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .background(Color.teal)
                        .clipShape(Capsule())
                }
            }
            
            Spacer()
        }
        .padding()
    }
    
    private var decorationGrid: some View {
        ScrollView {
            LazyVGrid(
                columns: [
                    GridItem(.adaptive(minimum: 150, maximum: 200), spacing: 16)
                ],
                spacing: 16
            ) {
                ForEach(displayedDecorations) { decoration in
                    DecorationCard(decoration: decoration) {
                        viewModel.showDecorationDetail(decoration)
                    }
                }
            }
            .padding()
        }
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let title: String
    let count: Int
    let isSelected: Bool
    var symbol: String? = nil
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                if let symbol {
                    Image(systemName: symbol)
                        .font(.caption.weight(.bold))
                }
                Text(title)
                    .font(.subheadline.weight(.semibold))
                Text("\(count)")
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.white.opacity(0.2), in: Capsule())
            }
            .foregroundColor(isSelected ? .white : .white.opacity(0.6))
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                isSelected
                    ? Color.teal.opacity(0.5)
                    : Color.white.opacity(0.1)
            )
            .clipShape(Capsule())
            .overlay {
                Capsule()
                    .stroke(
                        isSelected ? Color.teal : Color.white.opacity(0.2),
                        lineWidth: 1
                    )
            }
        }
    }
}

// MARK: - Decoration Card

struct DecorationCard: View {
    let decoration: Decoration
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 8) {
                ZStack(alignment: .topTrailing) {
                    decorationImage
                    
                    if decoration.isFavorite {
                        Image(systemName: "heart.fill")
                            .font(.caption.weight(.bold))
                            .foregroundColor(.pink)
                            .padding(6)
                            .background(.black.opacity(0.5), in: Circle())
                            .padding(8)
                    }
                }
                
                VStack(spacing: 4) {
                    Text(decoration.name)
                        .font(.caption.weight(.bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    
                    essenceIcons
                }
                .padding(.horizontal, 8)
                .padding(.bottom, 8)
            }
            .background(Color.white.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay {
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color.white.opacity(0.15), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }
    
    private var decorationImage: some View {
        ZStack {
            LinearGradient(
                colors: [.teal.opacity(0.3), .cyan.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            if decoration.imageURL.hasPrefix("mock://") {
                Image(systemName: "sofa.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.white.opacity(0.5))
            } else {
                AsyncImage(url: URL(string: decoration.imageURL)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        Image(systemName: "photo")
                            .font(.system(size: 32))
                            .foregroundColor(.white.opacity(0.3))
                    case .empty:
                        ProgressView()
                            .tint(.white)
                    @unknown default:
                        EmptyView()
                    }
                }
            }
        }
        .frame(height: 120)
        .clipped()
    }
    
    private var essenceIcons: some View {
        HStack(spacing: 4) {
            ForEach(decoration.recipeEssenceIds.prefix(3), id: \.self) { essenceId in
                if let essence = DecoratorEssenceContent.essence(for: essenceId) {
                    Text(essence.emoji)
                        .font(.system(size: 14))
                }
            }
            if decoration.recipeEssenceIds.count > 3 {
                Text("+\(decoration.recipeEssenceIds.count - 3)")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white.opacity(0.5))
            }
        }
    }
}

#Preview {
    DecorationInventoryView(viewModel: {
        let vm = DecoratorMachineViewModel()
        vm.inventory = [
            Decoration(
                id: "1",
                generationId: "gen1",
                recipe: DecoratorRecipe(essenceIds: ["cat_whisker", "rainbow_hiccup", "cozy_nap_energy"]),
                name: "Cozy Cat Lounger",
                description: "A purr-fect spot for napping",
                imageURL: "mock://decoration/1",
                promptUsed: "test prompt",
                createdAt: Date(),
                isRevealed: true,
                isFavorite: true
            ),
            Decoration(
                id: "2",
                generationId: "gen2",
                recipe: DecoratorRecipe(essenceIds: ["bunny_bounce", "cloud_fluff"]),
                name: "Bouncy Cloud Ottoman",
                description: "Floaty and hoppy",
                imageURL: "mock://decoration/2",
                promptUsed: "test prompt",
                createdAt: Date(),
                isRevealed: true,
                isFavorite: false
            )
        ]
        return vm
    }())
    .background(Color(red: 0.1, green: 0.08, blue: 0.18))
}
