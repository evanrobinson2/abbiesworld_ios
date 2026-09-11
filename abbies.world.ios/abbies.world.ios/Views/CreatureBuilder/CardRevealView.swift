//
//  CardRevealView.swift
//  abbies.world.ios
//
//  Dramatic card reveal animation.
//

import SwiftUI

struct CardRevealView: View {
    let card: CreatureCard
    let onComplete: () -> Void
    
    @State private var isFlipped = false
    @State private var showCelebration = false
    @State private var cardScale: CGFloat = 0.8
    @State private var sparkleOpacity: Double = 0
    
    var body: some View {
        ZStack {
            backgroundGradient
            
            VStack(spacing: 24) {
                Spacer()
                
                if showCelebration {
                    celebrationHeader
                }
                
                cardFlipView
                    .onTapGesture {
                        if !isFlipped {
                            flipCard()
                        }
                    }
                
                if !isFlipped {
                    Text("TAP TO REVEAL!")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.yellow)
                        .opacity(sparkleOpacity)
                } else {
                    doneButton
                }
                
                Spacer()
            }
            
            if showCelebration {
                CelebrationParticles()
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.5)) {
                cardScale = 1.0
            }
            withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) {
                sparkleOpacity = 1
            }
        }
    }
    
    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color(red: 0.1, green: 0.05, blue: 0.2),
                Color(red: 0.05, green: 0.1, blue: 0.15)
            ],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }
    
    private var celebrationHeader: some View {
        VStack(spacing: 8) {
            Text("✨ NEW CREATURE! ✨")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.yellow)
            
            Text(card.name.uppercased())
                .font(.title)
                .fontWeight(.heavy)
                .foregroundColor(.white)
        }
        .transition(.scale.combined(with: .opacity))
    }
    
    private var cardFlipView: some View {
        ZStack {
            cardBack
                .opacity(isFlipped ? 0 : 1)
                .rotation3DEffect(
                    .degrees(isFlipped ? 180 : 0),
                    axis: (x: 0, y: 1, z: 0)
                )
            
            cardFront
                .opacity(isFlipped ? 1 : 0)
                .rotation3DEffect(
                    .degrees(isFlipped ? 0 : -180),
                    axis: (x: 0, y: 1, z: 0)
                )
        }
        .frame(width: 280, height: 400)
        .scaleEffect(cardScale)
    }
    
    private var cardBack: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 20)
                .fill(
                    LinearGradient(
                        colors: [.purple, .indigo],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
            
            VStack(spacing: 16) {
                Text("?")
                    .font(.system(size: 100, weight: .bold))
                    .foregroundColor(.white.opacity(0.5))
                
                HStack(spacing: 8) {
                    Text(CreatureBuilderContent.creature(for: card.creatureId)?.displayIcon ?? "")
                    Text("+")
                        .foregroundColor(.white.opacity(0.5))
                    Text(CreatureBuilderContent.outfit(for: card.outfitId)?.displayIcon ?? "")
                    Text("+")
                        .foregroundColor(.white.opacity(0.5))
                    Text(CreatureBuilderContent.buddy(for: card.buddyId)?.displayIcon ?? "")
                }
                .font(.title)
            }
            
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.yellow.opacity(0.5), lineWidth: 4)
        }
    }
    
    private var cardFront: some View {
        CreatureCardView(card: card)
    }
    
    private var doneButton: some View {
        Button {
            onComplete()
        } label: {
            Text("Add to Collection!")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .padding(.horizontal, 32)
                .padding(.vertical, 16)
                .background(
                    LinearGradient(
                        colors: [.green, .teal],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(Capsule())
                .shadow(color: .green.opacity(0.5), radius: 10, y: 5)
        }
        .transition(.scale.combined(with: .opacity))
    }
    
    private func flipCard() {
        withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
            isFlipped = true
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            withAnimation(.spring()) {
                showCelebration = true
            }
        }
    }
}

// MARK: - Celebration Particles

struct CelebrationParticles: View {
    @State private var particles: [Particle] = []
    
    var body: some View {
        GeometryReader { geometry in
            ForEach(particles) { particle in
                Text(particle.emoji)
                    .font(.system(size: particle.size))
                    .position(particle.position)
                    .opacity(particle.opacity)
            }
        }
        .onAppear {
            createParticles()
        }
    }
    
    private func createParticles() {
        let emojis = ["✨", "⭐", "🌟", "💫", "🎉", "🎊"]
        
        for i in 0..<20 {
            let particle = Particle(
                id: i,
                emoji: emojis.randomElement()!,
                position: CGPoint(
                    x: CGFloat.random(in: 50...350),
                    y: CGFloat.random(in: 100...700)
                ),
                size: CGFloat.random(in: 20...40),
                opacity: 1.0
            )
            particles.append(particle)
        }
        
        withAnimation(.easeOut(duration: 2)) {
            for i in particles.indices {
                particles[i].position.y -= 100
                particles[i].opacity = 0
            }
        }
    }
}

struct Particle: Identifiable {
    let id: Int
    let emoji: String
    var position: CGPoint
    let size: CGFloat
    var opacity: Double
}

#Preview {
    CardRevealView(
        card: CreatureCard(
            id: "preview",
            generationId: "gen_1",
            recipe: CreatureRecipe(creatureId: "dragon", outfitId: "lightning-racer", buddyId: "bat"),
            name: "Nightbolt Dragon",
            personality: "Mischievous, fearless, and happiest after dark.",
            powerName: "Midnight Lightning",
            imageURL: "",
            createdAt: Date(),
            isFavorite: false,
            isRevealed: false
        ),
        onComplete: {}
    )
}
