//
//  CardDetailView.swift
//  abbies.world.ios
//
//  Full-size card detail view.
//

import SwiftUI

struct CardDetailView: View {
    let card: CreatureCard
    let onFavorite: () -> Void
    let onMakeAnother: () -> Void
    
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            backgroundGradient
            
            VStack(spacing: 20) {
                header
                
                cardView
                
                detailsSection
                
                actionsSection
                
                Spacer()
            }
            .padding()
        }
    }
    
    private var backgroundGradient: some View {
        ZStack {
            Image("creature_builder_workshop_background")
                .resizable()
                .scaledToFill()
                .ignoresSafeArea()
            Color.indigo.opacity(0.72)
                .ignoresSafeArea()
        }
    }
    
    private var header: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                CreatureLabGlyph(symbol: "xmark", tint: .indigo, size: 38)
            }
            .accessibilityLabel("Close card")
            
            Spacer()
            
            Button {
                onFavorite()
            } label: {
                CreatureLabGlyph(
                    symbol: card.isFavorite ? "heart.fill" : "heart",
                    tint: card.isFavorite ? .pink : .purple,
                    size: 38
                )
            }
            .accessibilityLabel(card.isFavorite ? "Remove favorite" : "Favorite card")
        }
    }
    
    private var cardView: some View {
        CreatureCardView(card: card)
            .frame(maxWidth: 320)
    }
    
    private var detailsSection: some View {
        VStack(spacing: 12) {
            HStack(spacing: 24) {
                ingredientDetail(
                    ingredient: CreatureBuilderContent.creature(for: card.creatureId),
                    label: CreatureBuilderContent.creature(for: card.creatureId)?.name ?? "Unknown",
                    accent: .purple
                )
                
                ingredientDetail(
                    ingredient: CreatureBuilderContent.outfit(for: card.outfitId),
                    label: CreatureBuilderContent.outfit(for: card.outfitId)?.name ?? "Unknown",
                    accent: .orange
                )
                
                ingredientDetail(
                    ingredient: CreatureBuilderContent.buddy(for: card.buddyId),
                    label: CreatureBuilderContent.buddy(for: card.buddyId)?.name ?? "Unknown",
                    accent: .green
                )
            }
            
            if let power = card.powerName {
                HStack(spacing: 8) {
                    CreatureLabGlyph(symbol: "bolt.fill", tint: .orange, size: 30)
                    Text("Power: \(power)")
                        .font(.subheadline)
                        .foregroundColor(.yellow)
                }
            }
            
            Text("Created \(formattedDate)")
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
    
    private func ingredientDetail(
        ingredient: CreatureIngredient?,
        label: String,
        accent: Color
    ) -> some View {
        VStack(spacing: 4) {
            IngredientArtworkChip(
                ingredient: ingredient,
                size: 44,
                accent: accent
            )
            Text(label)
                .font(.caption2)
                .foregroundColor(.white.opacity(0.7))
        }
    }
    
    private var actionsSection: some View {
        Button {
            onMakeAnother()
        } label: {
            HStack {
                Image(systemName: "arrow.clockwise")
                    .font(.headline.weight(.bold))
                Text("Make Another Like This")
                    .fontWeight(.medium)
            }
            .foregroundColor(.white)
            .padding(.horizontal, 24)
            .padding(.vertical, 14)
            .background(Color.purple)
            .clipShape(Capsule())
        }
    }
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: card.createdAt)
    }
}

// MARK: - Creature Card View (Canonical Layout)

struct CreatureCardView: View {
    let card: CreatureCard
    
    private var isMockURL: Bool {
        card.imageURL.hasPrefix("mock://")
    }
    
    var body: some View {
        VStack(spacing: 0) {
            if isMockURL {
                mockCreatureImage
                    .frame(height: 280)
            } else {
                AuthenticatedAsyncImage(url: URL(string: card.imageURL)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: { failed in
                    if failed {
                        mockCreatureImage
                    } else {
                        ZStack {
                            Color.purple.opacity(0.3)
                            ProgressView()
                                .tint(.white)
                        }
                    }
                }
                .frame(height: 280)
                .clipped()
            }
            
            VStack(spacing: 8) {
                Text(card.name.uppercased())
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                
                HStack(spacing: 4) {
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.creature(for: card.creatureId),
                        size: 28,
                        accent: .purple
                    )
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.outfit(for: card.outfitId),
                        size: 28,
                        accent: .orange
                    )
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.buddy(for: card.buddyId),
                        size: 28,
                        accent: .green
                    )
                }
                
                Text("\"\(card.personality)\"")
                    .font(.caption)
                    .italic()
                    .foregroundColor(.white.opacity(0.8))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            .padding()
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(
                    colors: [Color(red: 0.2, green: 0.15, blue: 0.35), Color(red: 0.15, green: 0.1, blue: 0.25)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
        }
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(
                    LinearGradient(
                        colors: [.yellow.opacity(0.6), .orange.opacity(0.4)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 3
                )
        )
        .shadow(color: .purple.opacity(0.5), radius: 20, y: 10)
    }
    
    private var mockCreatureImage: some View {
        ZStack {
            if let creature = CreatureBuilderContent.creature(for: card.creatureId) {
                Image(creature.artworkName)
                    .resizable()
                    .scaledToFill()
                    .scaleEffect(1.08)
            } else {
                Image("creature_builder_workshop_background")
                    .resizable()
                    .scaledToFill()
            }

            LinearGradient(
                colors: [.clear, Color.indigo.opacity(0.78)],
                startPoint: .top,
                endPoint: .bottom
            )

            VStack {
                Spacer()
                HStack(spacing: 10) {
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.outfit(for: card.outfitId),
                        size: 58,
                        accent: .orange
                    )
                    IngredientArtworkChip(
                        ingredient: CreatureBuilderContent.buddy(for: card.buddyId),
                        size: 58,
                        accent: .green
                    )
                }
                .padding(.bottom, 18)
            }
        }
    }
}

#Preview {
    CardDetailView(
        card: CreatureCard(
            id: "preview",
            generationId: "gen_1",
            recipe: CreatureRecipe(creatureId: "dragon", outfitId: "lightning-racer", buddyId: "bat"),
            name: "Nightbolt Dragon",
            personality: "Mischievous, fearless, and happiest after dark.",
            powerName: "Midnight Lightning",
            imageURL: "",
            createdAt: Date(),
            isFavorite: true,
            isRevealed: true
        ),
        onFavorite: {},
        onMakeAnother: {}
    )
}
