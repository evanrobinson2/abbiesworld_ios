//
//  KidFriendlyInventoryView.swift
//  abbies.world.ios
//
//  Simple visual inventory for kids - big cards, no text filters.
//

import SwiftUI

struct KidFriendlyInventoryView: View {
    @ObservedObject var viewModel: DecoratorMachineViewModel
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [
                    Color(red: 0.15, green: 0.12, blue: 0.25),
                    Color(red: 0.08, green: 0.06, blue: 0.15)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 16) {
                // Header
                header
                
                if viewModel.inventory.isEmpty {
                    emptyState
                } else {
                    inventoryGrid
                }
            }
        }
    }
    
    private var header: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.largeTitle)
                    .foregroundColor(.white.opacity(0.6))
            }
            
            Spacer()
            
            HStack(spacing: 8) {
                Image(systemName: "shippingbox.fill")
                    .font(.title)
                Text("\(viewModel.inventory.count)")
                    .font(.title.bold())
            }
            .foregroundColor(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Color.teal.opacity(0.5), in: Capsule())
            
            Spacer()
            
            // Invisible spacer for balance
            Color.clear
                .frame(width: 44, height: 44)
        }
        .padding()
    }
    
    private var emptyState: some View {
        VStack(spacing: 24) {
            Spacer()
            
            // Sad empty box
            ZStack {
                Image(systemName: "shippingbox")
                    .font(.system(size: 100))
                    .foregroundColor(.teal.opacity(0.4))
                
                // Sad face on box
                VStack(spacing: 4) {
                    HStack(spacing: 20) {
                        Circle().fill(.white).frame(width: 10, height: 10)
                        Circle().fill(.white).frame(width: 10, height: 10)
                    }
                    Capsule()
                        .fill(.white)
                        .frame(width: 20, height: 6)
                        .offset(y: 5)
                }
                .offset(y: 10)
            }
            
            Text("Nothing here yet!")
                .font(.title2.bold())
                .foregroundColor(.white)
            
            // Arrow pointing to make more
            VStack(spacing: 8) {
                Text("Make something!")
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.7))
                
                Image(systemName: "arrow.down")
                    .font(.title)
                    .foregroundColor(.yellow)
            }
            
            Button {
                dismiss()
            } label: {
                HStack {
                    Image(systemName: "wand.and.sparkles")
                    Text("GO MAKE!")
                }
                .font(.title3.bold())
                .foregroundColor(.white)
                .padding(.horizontal, 32)
                .padding(.vertical, 16)
                .background(Color.teal, in: Capsule())
                .shadow(color: .teal.opacity(0.5), radius: 8)
            }
            
            Spacer()
        }
    }
    
    private var inventoryGrid: some View {
        ScrollView {
            LazyVGrid(
                columns: [
                    GridItem(.adaptive(minimum: 140, maximum: 180), spacing: 16)
                ],
                spacing: 16
            ) {
                ForEach(viewModel.inventory) { decoration in
                    KidDecorationCard(
                        decoration: decoration,
                        onFavorite: { viewModel.toggleFavorite(decoration) }
                    )
                }
            }
            .padding()
        }
    }
}

// MARK: - Kid Decoration Card

struct KidDecorationCard: View {
    let decoration: MachineDecoration
    let onFavorite: () -> Void
    
    @State private var isPressed = false
    
    var body: some View {
        VStack(spacing: 8) {
            // Image area
            ZStack(alignment: .topTrailing) {
                decorationImage
                
                // Heart button
                Button(action: onFavorite) {
                    Image(systemName: decoration.isFavorite ? "heart.fill" : "heart")
                        .font(.title2)
                        .foregroundColor(decoration.isFavorite ? .pink : .white)
                        .frame(width: 40, height: 40)
                        .background(
                            Circle()
                                .fill(Color.black.opacity(0.4))
                        )
                }
                .padding(8)
            }
            
            // Recipe emojis
            HStack(spacing: 4) {
                ForEach(decoration.recipeEssenceIds.prefix(4), id: \.self) { essenceId in
                    if let essence = DecoratorEssenceContent.essence(for: essenceId) {
                        Text(essence.emoji)
                            .font(.system(size: 18))
                    }
                }
            }
            .padding(.bottom, 8)
        }
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20)
                .stroke(
                    decoration.isFavorite ? Color.pink : Color.white.opacity(0.2),
                    lineWidth: decoration.isFavorite ? 3 : 1
                )
        }
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .onTapGesture {
            withAnimation(.spring(response: 0.2)) {
                isPressed = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation(.spring(response: 0.2)) {
                    isPressed = false
                }
            }
        }
    }
    
    private var decorationImage: some View {
        ZStack {
            // Background
            LinearGradient(
                colors: [.teal.opacity(0.4), .cyan.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            if decoration.imageURL.hasPrefix("mock://") {
                // Mock placeholder
                Image(systemName: "sofa.fill")
                    .font(.system(size: 50))
                    .foregroundColor(.teal.opacity(0.6))
            } else {
                AsyncImage(url: URL(string: decoration.imageURL)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        Image(systemName: "photo")
                            .font(.system(size: 40))
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
        .clipShape(
            UnevenRoundedRectangle(
                topLeadingRadius: 20,
                topTrailingRadius: 20
            )
        )
    }
}

#Preview {
    KidFriendlyInventoryView(viewModel: {
        let vm = DecoratorMachineViewModel()
        vm.inventory = [
            MachineDecoration(
                id: "1",
                generationId: "gen1",
                recipe: DecoratorRecipe(essenceIds: ["cat_whisker", "rainbow_hiccup"]),
                name: "Rainbow Cat Chair",
                description: "Meow!",
                imageURL: "mock://1",
                promptUsed: "",
                createdAt: Date(),
                isRevealed: true,
                isFavorite: true
            ),
            MachineDecoration(
                id: "2",
                generationId: "gen2",
                recipe: DecoratorRecipe(essenceIds: ["bunny_bounce", "cloud_fluff", "giggle_fizz"]),
                name: "Bouncy Cloud Sofa",
                description: "Boing!",
                imageURL: "mock://2",
                promptUsed: "",
                createdAt: Date(),
                isRevealed: true,
                isFavorite: false
            ),
            MachineDecoration(
                id: "3",
                generationId: "gen3",
                recipe: DecoratorRecipe(essenceIds: ["moonbeam", "owl_wisdom"]),
                name: "Wise Moon Perch",
                description: "Hoo!",
                imageURL: "mock://3",
                promptUsed: "",
                createdAt: Date(),
                isRevealed: true,
                isFavorite: false
            ),
        ]
        return vm
    }())
}
