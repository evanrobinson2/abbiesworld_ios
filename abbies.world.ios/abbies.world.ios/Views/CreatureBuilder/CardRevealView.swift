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
            if ProcessInfo.processInfo.arguments.contains("-autoPlayCreatureBuilder") {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) {
                    flipCard()
                }
            }
        }
    }
    
    private var backgroundGradient: some View {
        ZStack {
            Image("creature_builder_workshop_background")
                .resizable()
                .scaledToFill()
                .ignoresSafeArea()

            LinearGradient(
                colors: [
                    Color.indigo.opacity(0.62),
                    Color(red: 0.04, green: 0.02, blue: 0.12).opacity(0.9)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
        }
    }
    
    private var celebrationHeader: some View {
        VStack(spacing: 8) {
            HStack(spacing: 10) {
                CreatureLabSparkle(color: .yellow, size: 16)
                Text("NEW CREATURE!")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.yellow)
                CreatureLabSparkle(color: .yellow, size: 16)
            }
            
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
        CreatureLabCardBack(
            creature: CreatureBuilderContent.creature(for: card.creatureId),
            outfit: CreatureBuilderContent.outfit(for: card.outfitId),
            buddy: CreatureBuilderContent.buddy(for: card.buddyId)
        )
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
                CreatureLabSparkle(color: particle.color, size: particle.size)
                    .position(
                        x: particle.position.x * geometry.size.width,
                        y: particle.position.y * geometry.size.height
                    )
                    .opacity(particle.opacity)
            }
        }
        .onAppear {
            createParticles()
        }
    }
    
    private func createParticles() {
        let colors: [Color] = [.yellow, .cyan, .pink, .mint, .orange]
        
        for i in 0..<20 {
            let particle = Particle(
                id: i,
                color: colors.randomElement()!,
                position: CGPoint(
                    x: CGFloat.random(in: 0.08...0.92),
                    y: CGFloat.random(in: 0.12...0.88)
                ),
                size: CGFloat.random(in: 12...28),
                opacity: 1.0
            )
            particles.append(particle)
        }
        
        withAnimation(.easeOut(duration: 2)) {
            for i in particles.indices {
                particles[i].position.y -= 0.15
                particles[i].opacity = 0
            }
        }
    }
}

struct Particle: Identifiable {
    let id: Int
    let color: Color
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
