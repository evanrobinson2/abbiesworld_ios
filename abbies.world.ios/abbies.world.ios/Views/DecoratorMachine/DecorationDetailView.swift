//
//  DecorationDetailView.swift
//  abbies.world.ios
//
//  Detail view for a decoration in the inventory.
//

import SwiftUI

struct DecorationDetailView: View {
    let decoration: Decoration
    let onFavorite: () -> Void
    let onMakeAnother: () -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var showingPrompt = false
    
    var body: some View {
        ZStack {
            backgroundGradient
            
            ScrollView {
                VStack(spacing: 24) {
                    header
                    
                    decorationImageSection
                    
                    detailsSection
                    
                    recipeSection
                    
                    actionButtons
                    
                    if showingPrompt {
                        promptSection
                    }
                    
                    Spacer(minLength: 40)
                }
                .padding()
            }
        }
    }
    
    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color(red: 0.1, green: 0.12, blue: 0.2),
                Color(red: 0.05, green: 0.06, blue: 0.12)
            ],
            startPoint: .top,
            endPoint: .bottom
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
                    .foregroundColor(.white.opacity(0.6))
            }
            
            Spacer()
            
            Button(action: onFavorite) {
                Image(systemName: decoration.isFavorite ? "heart.fill" : "heart")
                    .font(.title2)
                    .foregroundColor(decoration.isFavorite ? .pink : .white.opacity(0.6))
            }
        }
    }
    
    private var decorationImageSection: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24)
                .fill(
                    LinearGradient(
                        colors: [.teal.opacity(0.3), .cyan.opacity(0.2)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            if decoration.imageURL.hasPrefix("mock://") {
                VStack(spacing: 12) {
                    Image(systemName: "sofa.fill")
                        .font(.system(size: 80))
                        .foregroundColor(.teal.opacity(0.6))
                    Text("(Preview placeholder)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.5))
                }
            } else {
                AsyncImage(url: URL(string: decoration.imageURL)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFit()
                    case .failure:
                        VStack {
                            Image(systemName: "photo")
                                .font(.system(size: 48))
                            Text("Image unavailable")
                                .font(.caption)
                        }
                        .foregroundColor(.white.opacity(0.5))
                    case .empty:
                        ProgressView()
                            .tint(.white)
                    @unknown default:
                        EmptyView()
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .padding(8)
            }
        }
        .frame(height: 280)
        .overlay {
            RoundedRectangle(cornerRadius: 24)
                .stroke(Color.white.opacity(0.2), lineWidth: 1)
        }
    }
    
    private var detailsSection: some View {
        VStack(spacing: 12) {
            Text(decoration.name)
                .font(.title2.weight(.bold))
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
            
            Text(decoration.description)
                .font(.body)
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
            
            Text("Created \(decoration.createdAt.formatted(date: .abbreviated, time: .shortened))")
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))
        }
    }
    
    private var recipeSection: some View {
        VStack(spacing: 12) {
            Text("RECIPE")
                .font(.caption.weight(.bold))
                .tracking(1)
                .foregroundColor(.white.opacity(0.5))
            
            HStack(spacing: 12) {
                ForEach(decoration.recipeEssenceIds, id: \.self) { essenceId in
                    if let essence = DecoratorEssenceContent.essence(for: essenceId) {
                        VStack(spacing: 4) {
                            Text(essence.emoji)
                                .font(.system(size: 32))
                                .frame(width: 56, height: 56)
                                .background(essence.category.tint.opacity(0.3), in: Circle())
                            
                            Text(essence.name)
                                .font(.system(size: 9, weight: .medium))
                                .foregroundColor(.white.opacity(0.7))
                                .lineLimit(2)
                                .multilineTextAlignment(.center)
                                .frame(width: 60)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
    
    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button(action: onMakeAnother) {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.clockwise")
                    Text("Make Another Like This")
                }
                .font(.headline)
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.teal)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            
            Button {
                withAnimation {
                    showingPrompt.toggle()
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: showingPrompt ? "chevron.up" : "chevron.down")
                    Text(showingPrompt ? "Hide Prompt" : "Show Prompt Used")
                }
                .font(.subheadline.weight(.medium))
                .foregroundColor(.white.opacity(0.7))
            }
        }
    }
    
    private var promptSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("IMAGE GENERATION PROMPT")
                .font(.caption.weight(.bold))
                .tracking(1)
                .foregroundColor(.teal)
            
            Text(decoration.promptUsed)
                .font(.system(.caption, design: .monospaced))
                .foregroundColor(.white.opacity(0.8))
                .padding()
                .background(Color.black.opacity(0.3))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            
            Button {
                UIPasteboard.general.string = decoration.promptUsed
            } label: {
                HStack {
                    Image(systemName: "doc.on.doc")
                    Text("Copy Prompt")
                }
                .font(.caption.weight(.medium))
                .foregroundColor(.teal)
            }
        }
        .padding()
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .transition(.opacity.combined(with: .move(edge: .top)))
    }
}

#Preview {
    DecorationDetailView(
        decoration: Decoration(
            id: "1",
            generationId: "gen1",
            recipe: DecoratorRecipe(essenceIds: ["cat_whisker", "rainbow_hiccup", "cozy_nap_energy"]),
            name: "Rainbow Kitty Lounger",
            description: "A purr-fect spot that bursts with color when you sit on it! The ultimate in cozy cat-inspired furniture.",
            imageURL: "mock://decoration/1",
            promptUsed: "whimsical fantasy furniture decoration, cat-like, curious, elegant, whiskers, feline, rainbow, colorful, prismatic, cozy, sleepy, soft, shaped like a cat, bursting with rainbow colors, storybook style, cozy fantasy furniture shop aesthetic, digital painting, clean background",
            createdAt: Date(),
            isRevealed: true,
            isFavorite: true
        ),
        onFavorite: {},
        onMakeAnother: {}
    )
}
