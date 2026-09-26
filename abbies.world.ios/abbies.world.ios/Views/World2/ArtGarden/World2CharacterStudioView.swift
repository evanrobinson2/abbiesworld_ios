//
//  World2CharacterStudioView.swift
//  abbies.world.ios
//
//  Inside Character Studio on the Art Garden map.
//
//  The painted workshop is the room. The large brass circle is the creation
//  viewport: particle energy plays here until a Meshy avatar is bound.
//

import SwiftUI

struct World2CharacterStudioView: View {
    let onExit: () -> Void

    @State private var showingEffectLab = false
    @State private var effect: World2AtelierEffectKind = .creationChamber
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let archetype = World2POIRegistry.characterStudio

    var body: some View {
        GeometryReader { geo in
            ZStack {
                World2SemanticImage(
                    semanticName: archetype.interiorAsset ?? "poi.characterStudio.interior",
                    fallbackIcon: "paintpalette.fill",
                    fallbackLabel: "Character Studio is under construction"
                )
                .scaledToFill()
                .frame(width: geo.size.width, height: geo.size.height)
                .clipped()
                .ignoresSafeArea()

                // Particle energy in the brass viewport — not a Midjourney plate.
                World2AtelierParticleField(
                    kind: effect,
                    intensity: 1.15,
                    palette: World2AtelierParticlePalette.atelier,
                    isAnimated: !reduceMotion
                )
                .frame(
                    width: min(geo.size.width, geo.size.height) * 0.42,
                    height: min(geo.size.width, geo.size.height) * 0.42
                )
                .clipShape(Circle())
                .overlay(
                    Circle()
                        .stroke(Color(red: 0.78, green: 0.58, blue: 0.22).opacity(0.55), lineWidth: 3)
                )
                .position(x: geo.size.width * 0.50, y: geo.size.height * 0.46)
                .accessibilityIdentifier("world2.characterStudio.viewport")

                VStack {
                    HStack {
                        Spacer()

                        Button {
                            showingEffectLab = true
                        } label: {
                            Label("Effects", systemImage: "sparkles")
                                .font(.system(size: 15, weight: .bold, design: .rounded))
                                .foregroundStyle(.white)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(.orange.opacity(0.88), in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("world2.characterStudio.effects")
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 18)

                    Spacer()

                    VStack(spacing: 10) {
                        Text(archetype.name)
                            .font(.system(size: 20, weight: .black, design: .rounded))
                        Text("Particles run here while your avatar is being made.")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .multilineTextAlignment(.center)
                        effectPicker
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 22)
                    .padding(.vertical, 14)
                    .background(.black.opacity(0.62), in: RoundedRectangle(cornerRadius: 18))
                    .padding(.horizontal, 36)
                    .padding(.bottom, 28)
                }
            }
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.characterStudio.interior")
        .fullScreenCover(isPresented: $showingEffectLab) {
            World2AtelierEffectLabView(onClose: { showingEffectLab = false })
        }
        .world2InteriorActions(
            exitAccessibilityID: "world2.characterStudio.exit",
            onExit: onExit
        )
    }

    private var effectPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach([
                    World2AtelierEffectKind.creationChamber,
                    .spiralingSparkles,
                    .transformationRing,
                    .revealAura,
                    .risingBubbles,
                ]) { kind in
                    Button {
                        effect = kind
                    } label: {
                        Text(kind.displayName)
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundStyle(effect == kind ? .black : .white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .background(
                                effect == kind ? Color.yellow : Color.white.opacity(0.18),
                                in: Capsule()
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }
}

#Preview {
    World2CharacterStudioView(onExit: {})
}
