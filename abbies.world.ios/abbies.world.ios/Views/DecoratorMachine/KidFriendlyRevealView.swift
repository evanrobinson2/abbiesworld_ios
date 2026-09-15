//
//  KidFriendlyRevealView.swift
//  abbies.world.ios
//
//  Simple, celebratory reveal for kids - big visuals, lots of excitement!
//

import SwiftUI

struct KidFriendlyRevealView: View {
    let decoration: Decoration
    let onComplete: () -> Void
    
    @State private var phase: RevealPhase = .shaking
    @State private var giftShake: CGFloat = 0
    @State private var giftScale: CGFloat = 1.0
    @State private var showDecoration = false
    @State private var confettiActive = false
    @State private var starBurst = false
    
    enum RevealPhase {
        case shaking, opening, revealed
    }
    
    var body: some View {
        ZStack {
            // Background
            Color(red: 0.15, green: 0.1, blue: 0.25)
                .ignoresSafeArea()
            
            // Star burst background
            if starBurst {
                StarBurstView()
            }
            
            // Confetti
            if confettiActive {
                ConfettiView()
            }
            
            VStack(spacing: 30) {
                Spacer()
                
                // The gift box / revealed decoration
                ZStack {
                    if phase == .revealed {
                        revealedContent
                            .transition(.scale.combined(with: .opacity))
                    } else {
                        giftBox
                    }
                }
                .frame(height: 300)
                
                // Recipe icons
                recipeIcons
                
                Spacer()
                
                // Action button
                actionButton
                    .padding(.bottom, 40)
            }
            .padding()
        }
        .onAppear {
            startRevealSequence()
        }
    }
    
    private var giftBox: some View {
        VStack(spacing: 0) {
            // Gift box
            ZStack {
                // Box body
                RoundedRectangle(cornerRadius: 20)
                    .fill(
                        LinearGradient(
                            colors: [.teal, .cyan],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 200, height: 160)
                
                // Ribbon horizontal
                Rectangle()
                    .fill(Color.yellow)
                    .frame(width: 200, height: 30)
                
                // Ribbon vertical
                Rectangle()
                    .fill(Color.yellow)
                    .frame(width: 30, height: 160)
                
                // Question mark
                Text("?")
                    .font(.system(size: 80, weight: .black))
                    .foregroundColor(.white.opacity(0.5))
            }
            .overlay {
                RoundedRectangle(cornerRadius: 20)
                    .stroke(Color.yellow, lineWidth: 4)
            }
            .shadow(color: .teal.opacity(0.5), radius: 20)
            
            // Bow
            Image(systemName: "gift.fill")
                .font(.system(size: 50))
                .foregroundColor(.yellow)
                .offset(y: -30)
        }
        .scaleEffect(giftScale)
        .rotationEffect(.degrees(giftShake))
    }
    
    private var revealedContent: some View {
        VStack(spacing: 16) {
            // The decoration image
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [.yellow.opacity(0.3), .clear],
                            center: .center,
                            startRadius: 50,
                            endRadius: 150
                        )
                    )
                    .frame(width: 250, height: 250)
                
                if decoration.imageURL.hasPrefix("mock://") {
                    // Mock mode - show fun placeholder
                    ZStack {
                        Circle()
                            .fill(Color.teal.opacity(0.3))
                            .frame(width: 180, height: 180)
                        
                        Image(systemName: "sofa.fill")
                            .font(.system(size: 80))
                            .foregroundColor(.teal)
                    }
                } else {
                    AsyncImage(url: URL(string: decoration.imageURL)) { phase in
                        switch phase {
                        case .success(let image):
                            image
                                .resizable()
                                .scaledToFit()
                                .frame(width: 180, height: 180)
                                .clipShape(RoundedRectangle(cornerRadius: 20))
                        default:
                            ProgressView()
                                .frame(width: 180, height: 180)
                        }
                    }
                }
            }
            
            // Decoration name
            Text(decoration.name)
                .font(.title.bold())
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
        }
    }
    
    private var recipeIcons: some View {
        HStack(spacing: 12) {
            ForEach(decoration.recipeEssenceIds, id: \.self) { essenceId in
                if let essence = DecoratorEssenceContent.essence(for: essenceId) {
                    Text(essence.emoji)
                        .font(.system(size: 36))
                        .frame(width: 56, height: 56)
                        .background(essence.category.tint.opacity(0.3), in: Circle())
                }
            }
        }
    }
    
    private var actionButton: some View {
        Button(action: onComplete) {
            HStack(spacing: 12) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                Text("YAY!")
                    .font(.title.bold())
            }
            .foregroundColor(.white)
            .frame(width: 200, height: 60)
            .background(Color.green, in: Capsule())
            .shadow(color: .green.opacity(0.5), radius: 10)
        }
        .opacity(phase == .revealed ? 1 : 0)
        .scaleEffect(phase == .revealed ? 1 : 0.5)
        .animation(.spring(response: 0.5).delay(0.3), value: phase)
    }
    
    private func startRevealSequence() {
        // Phase 1: Shake the gift
        withAnimation(.easeInOut(duration: 0.1).repeatCount(10, autoreverses: true)) {
            giftShake = 5
        }
        
        // Phase 2: Gift grows
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            withAnimation(.spring(response: 0.3)) {
                giftScale = 1.2
            }
        }
        
        // Phase 3: Pop open!
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.3) {
            withAnimation(.spring(response: 0.5, dampingFraction: 0.6)) {
                phase = .revealed
                starBurst = true
                confettiActive = true
            }
        }
    }
}

// MARK: - Star Burst Background

struct StarBurstView: View {
    @State private var rotation: Double = 0
    
    var body: some View {
        ZStack {
            ForEach(0..<12, id: \.self) { i in
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.yellow.opacity(0.3), .clear],
                            startPoint: .center,
                            endRadius: .trailing
                        )
                    )
                    .frame(width: 400, height: 20)
                    .rotationEffect(.degrees(Double(i) * 30))
            }
        }
        .rotationEffect(.degrees(rotation))
        .onAppear {
            withAnimation(.linear(duration: 20).repeatForever(autoreverses: false)) {
                rotation = 360
            }
        }
    }
}

// MARK: - Confetti View

struct ConfettiView: View {
    var body: some View {
        ZStack {
            ForEach(0..<50, id: \.self) { i in
                ConfettiPiece(
                    color: [.red, .yellow, .green, .blue, .pink, .orange, .purple].randomElement()!,
                    delay: Double(i) * 0.02
                )
            }
        }
    }
}

struct ConfettiPiece: View {
    let color: Color
    let delay: Double
    
    @State private var yOffset: CGFloat = -200
    @State private var xOffset: CGFloat = 0
    @State private var rotation: Double = 0
    @State private var opacity: Double = 1
    
    var body: some View {
        Rectangle()
            .fill(color)
            .frame(width: CGFloat.random(in: 8...15), height: CGFloat.random(in: 8...15))
            .offset(x: xOffset, y: yOffset)
            .rotationEffect(.degrees(rotation))
            .opacity(opacity)
            .onAppear {
                let startX = CGFloat.random(in: -180...180)
                xOffset = startX
                
                withAnimation(
                    .easeOut(duration: Double.random(in: 2...3))
                        .delay(delay)
                ) {
                    yOffset = 500
                    xOffset = startX + CGFloat.random(in: -100...100)
                    rotation = Double.random(in: 360...720)
                    opacity = 0
                }
            }
    }
}

#Preview {
    KidFriendlyRevealView(
        decoration: Decoration(
            id: "1",
            generationId: "gen1",
            recipe: DecoratorRecipe(essenceIds: ["cat_whisker", "rainbow_hiccup", "cozy_nap_energy"]),
            name: "Rainbow Kitty Lounger",
            description: "A cozy spot for napping!",
            imageURL: "mock://decoration/1",
            promptUsed: "test",
            createdAt: Date(),
            isRevealed: false,
            isFavorite: false
        )
    ) {
        print("Complete!")
    }
}
