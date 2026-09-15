//
//  DecorationRevealView.swift
//  abbies.world.ios
//
//  Animated reveal of a newly created decoration.
//

import SwiftUI

struct DecorationRevealView: View {
    let decoration: Decoration
    let onComplete: () -> Void
    
    @State private var cardFlipped = false
    @State private var showDetails = false
    @State private var celebrationParticles = false
    
    var body: some View {
        ZStack {
            backgroundGradient
            
            celebrationEffects
            
            VStack(spacing: 24) {
                Spacer()
                
                cardContainer
                
                if showDetails {
                    detailsSection
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
                
                Spacer()
                
                if showDetails {
                    addToInventoryButton
                        .transition(.opacity)
                }
            }
            .padding()
        }
        .onAppear {
            performRevealSequence()
        }
    }
    
    private var backgroundGradient: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.1, green: 0.15, blue: 0.25),
                    Color(red: 0.05, green: 0.08, blue: 0.15)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            RadialGradient(
                colors: [
                    Color.teal.opacity(0.3),
                    Color.clear
                ],
                center: .center,
                startRadius: 50,
                endRadius: 400
            )
            .ignoresSafeArea()
        }
    }
    
    private var celebrationEffects: some View {
        ZStack {
            if celebrationParticles {
                ForEach(0..<30, id: \.self) { index in
                    CelebrationParticle(
                        index: index,
                        color: [.yellow, .pink, .cyan, .orange, .green].randomElement() ?? .yellow
                    )
                }
            }
        }
    }
    
    private var cardContainer: some View {
        ZStack {
            if !cardFlipped {
                cardBack
                    .rotation3DEffect(
                        .degrees(0),
                        axis: (x: 0, y: 1, z: 0)
                    )
            } else {
                cardFront
                    .rotation3DEffect(
                        .degrees(0),
                        axis: (x: 0, y: 1, z: 0)
                    )
            }
        }
        .frame(width: 280, height: 360)
        .onTapGesture {
            if !cardFlipped {
                flipCard()
            }
        }
    }
    
    private var cardBack: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24)
                .fill(
                    LinearGradient(
                        colors: [.teal, .cyan.opacity(0.8)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            VStack(spacing: 20) {
                essencePreview
                
                Image(systemName: "gift.fill")
                    .font(.system(size: 64, weight: .bold))
                    .foregroundStyle(.white)
                    .frame(width: 100, height: 100)
                    .background(.white.opacity(0.2), in: Circle())
                
                Text("TAP TO REVEAL")
                    .font(.headline.weight(.black))
                    .tracking(1.5)
                    .foregroundStyle(.white)
                
                Text("DECORATOR MACHINE")
                    .font(.caption.weight(.bold))
                    .tracking(1)
                    .foregroundStyle(.white.opacity(0.7))
            }
            
            RoundedRectangle(cornerRadius: 24)
                .stroke(.yellow.opacity(0.7), lineWidth: 4)
        }
        .shadow(color: .teal.opacity(0.5), radius: 20, y: 10)
    }
    
    private var cardFront: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 24)
                .fill(Color.white)
            
            VStack(spacing: 12) {
                decorationImage
                    .frame(height: 200)
                    .clipShape(
                        UnevenRoundedRectangle(
                            topLeadingRadius: 20,
                            topTrailingRadius: 20
                        )
                    )
                
                VStack(spacing: 8) {
                    Text(decoration.name)
                        .font(.title3.weight(.bold))
                        .foregroundColor(.black)
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                    
                    essencePreviewSmall
                }
                .padding(.horizontal)
                .padding(.bottom, 16)
            }
            
            RoundedRectangle(cornerRadius: 24)
                .stroke(
                    LinearGradient(
                        colors: [.yellow, .orange],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 4
                )
        }
        .shadow(color: .yellow.opacity(0.4), radius: 20, y: 10)
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
                    .font(.system(size: 72))
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
                            .font(.system(size: 48))
                            .foregroundColor(.gray)
                    case .empty:
                        ProgressView()
                    @unknown default:
                        EmptyView()
                    }
                }
            }
        }
    }
    
    private var essencePreview: some View {
        HStack(spacing: 10) {
            ForEach(decoration.recipeEssenceIds.prefix(4), id: \.self) { essenceId in
                if let essence = DecoratorEssenceContent.essence(for: essenceId) {
                    Text(essence.emoji)
                        .font(.system(size: 28))
                        .frame(width: 46, height: 46)
                        .background(.white.opacity(0.2), in: Circle())
                }
            }
        }
    }
    
    private var essencePreviewSmall: some View {
        HStack(spacing: 6) {
            ForEach(decoration.recipeEssenceIds, id: \.self) { essenceId in
                if let essence = DecoratorEssenceContent.essence(for: essenceId) {
                    Text(essence.emoji)
                        .font(.system(size: 18))
                }
            }
        }
    }
    
    private var detailsSection: some View {
        VStack(spacing: 12) {
            Text(decoration.description)
                .font(.subheadline)
                .foregroundColor(.white.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
    }
    
    private var addToInventoryButton: some View {
        Button(action: onComplete) {
            HStack(spacing: 10) {
                Image(systemName: "shippingbox.fill")
                Text("ADD TO INVENTORY")
                    .fontWeight(.bold)
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                LinearGradient(
                    colors: [.teal, .cyan],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .shadow(color: .teal.opacity(0.5), radius: 10, y: 5)
        }
        .padding(.horizontal, 32)
    }
    
    private func performRevealSequence() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            flipCard()
        }
    }
    
    private func flipCard() {
        withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
            cardFlipped = true
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            celebrationParticles = true
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            withAnimation(.spring(response: 0.4)) {
                showDetails = true
            }
        }
    }
}

// MARK: - Celebration Particle

struct CelebrationParticle: View {
    let index: Int
    let color: Color
    
    @State private var yOffset: CGFloat = 0
    @State private var xOffset: CGFloat = 0
    @State private var opacity: Double = 1
    @State private var rotation: Double = 0
    
    var body: some View {
        Image(systemName: ["star.fill", "sparkle", "circle.fill", "heart.fill"].randomElement() ?? "star.fill")
            .font(.system(size: CGFloat.random(in: 8...20)))
            .foregroundColor(color)
            .offset(x: xOffset, y: yOffset)
            .opacity(opacity)
            .rotationEffect(.degrees(rotation))
            .onAppear {
                let startX = CGFloat.random(in: -150...150)
                xOffset = startX
                yOffset = 0
                
                withAnimation(
                    .easeOut(duration: Double.random(in: 1.5...2.5))
                        .delay(Double(index) * 0.02)
                ) {
                    yOffset = CGFloat.random(in: 200...400)
                    xOffset = startX + CGFloat.random(in: -100...100)
                    opacity = 0
                    rotation = Double.random(in: 180...720)
                }
            }
    }
}

#Preview {
    DecorationRevealView(
        decoration: Decoration(
            id: "1",
            generationId: "gen1",
            recipe: DecoratorRecipe(essenceIds: ["cat_whisker", "rainbow_hiccup", "cozy_nap_energy"]),
            name: "Rainbow Kitty Lounger",
            description: "A purr-fect spot that bursts with color when you sit on it!",
            imageURL: "mock://decoration/1",
            promptUsed: "test prompt",
            createdAt: Date(),
            isRevealed: false,
            isFavorite: false
        )
    ) {
        print("Added to inventory")
    }
}
