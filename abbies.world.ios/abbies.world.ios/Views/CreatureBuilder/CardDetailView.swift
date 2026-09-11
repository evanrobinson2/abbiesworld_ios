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
        LinearGradient(
            colors: [
                Color(red: 0.15, green: 0.1, blue: 0.3),
                Color(red: 0.1, green: 0.15, blue: 0.25)
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
                    .font(.title2)
                    .foregroundColor(.white.opacity(0.7))
            }
            
            Spacer()
            
            Button {
                onFavorite()
            } label: {
                Image(systemName: card.isFavorite ? "heart.fill" : "heart")
                    .font(.title2)
                    .foregroundColor(card.isFavorite ? .pink : .white.opacity(0.7))
            }
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
                    icon: CreatureBuilderContent.creature(for: card.creatureId)?.displayIcon ?? "?",
                    label: CreatureBuilderContent.creature(for: card.creatureId)?.name ?? "Unknown"
                )
                
                ingredientDetail(
                    icon: CreatureBuilderContent.outfit(for: card.outfitId)?.displayIcon ?? "?",
                    label: CreatureBuilderContent.outfit(for: card.outfitId)?.name ?? "Unknown"
                )
                
                ingredientDetail(
                    icon: CreatureBuilderContent.buddy(for: card.buddyId)?.displayIcon ?? "?",
                    label: CreatureBuilderContent.buddy(for: card.buddyId)?.name ?? "Unknown"
                )
            }
            
            if let power = card.powerName {
                HStack {
                    Text("⚡")
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
    
    private func ingredientDetail(icon: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(icon)
                .font(.title2)
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
                Text("🔄")
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
    
    var body: some View {
        VStack(spacing: 0) {
            AsyncImage(url: URL(string: card.imageURL)) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    placeholderImage
                case .empty:
                    ZStack {
                        Color.purple.opacity(0.3)
                        ProgressView()
                            .tint(.white)
                    }
                @unknown default:
                    placeholderImage
                }
            }
            .frame(height: 280)
            .clipped()
            
            VStack(spacing: 8) {
                Text(card.name.uppercased())
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                
                HStack(spacing: 4) {
                    Text(CreatureBuilderContent.creature(for: card.creatureId)?.displayIcon ?? "")
                    Text(CreatureBuilderContent.outfit(for: card.outfitId)?.displayIcon ?? "")
                    Text(CreatureBuilderContent.buddy(for: card.buddyId)?.displayIcon ?? "")
                }
                .font(.title3)
                
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
    
    private var placeholderImage: some View {
        ZStack {
            Color.purple.opacity(0.3)
            Text("🎨")
                .font(.system(size: 60))
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
