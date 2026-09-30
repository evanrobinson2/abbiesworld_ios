//
//  World2StoryDecorationArtwork.swift
//  abbies.world.ios
//
//  Draws a story reward wherever the room and the drawer need it.
//
//  Story rewards are hand-drawn rather than loaded from the asset registry, so
//  the one place that knows which renderer belongs to which art style is here.
//

import SwiftUI
import UIKit

struct World2StoryDecorationArtwork: View {
    let decoration: World2StoryDecoration
    /// Cards in the drawer are small and numerous; settle the motion down there.
    var isAnimated = true

    var body: some View {
        content
            .accessibilityLabel(decoration.name)
            .accessibilityIdentifier("world2.story.artwork.\(decoration.artStyle.rawValue)")
    }

    @ViewBuilder
    private var content: some View {
        switch decoration.artStyle {
        case .perfectPorridge:
            World2PorridgeBowl(isMagical: true, isAnimated: isAnimated)
        case .worldTeleporter:
            World2WorldTeleporterToken(isAnimated: isAnimated)
        case .propertyDeed:
            World2PropertyDeedToken(isAnimated: isAnimated)
        case .daddyCandy:
            World2DaddyCandyToken(isAnimated: isAnimated)
        case .daddyHug:
            World2DaddyHugToken(isAnimated: isAnimated)
        case .foxTrophy:
            World2FoxTrophyToken(isAnimated: isAnimated)
        case .wreckPowerUp:
            World2WreckPowerUpToken(isAnimated: isAnimated)
        }
    }
}

private struct World2WreckPowerUpToken: View {
    var isAnimated = true
    @State private var pulse = false

    var body: some View {
        Group {
            if UIImage(named: "world2_orb_peglin_bounceberry") != nil {
                Image("world2_orb_peglin_bounceberry")
                    .resizable()
                    .scaledToFit()
            } else if UIImage(named: "world2_token_peglin_orb") != nil {
                Image("world2_token_peglin_orb")
                    .resizable()
                    .scaledToFit()
            } else {
                Image(systemName: "sparkle")
                    .font(.system(size: 40, weight: .black))
                    .foregroundStyle(.cyan)
            }
        }
        .frame(width: 56, height: 56)
        .scaleEffect(pulse && isAnimated ? 1.1 : 1.0)
        .shadow(color: .cyan.opacity(pulse ? 0.65 : 0.3), radius: pulse ? 10 : 4)
        .onAppear {
            guard isAnimated else { return }
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                pulse = true
            }
        }
    }
}

private struct World2FoxTrophyToken: View {
    var isAnimated = true
    @State private var shine = false

    var body: some View {
        Image(systemName: "trophy.fill")
            .font(.system(size: 42, weight: .black))
            .foregroundStyle(
                LinearGradient(
                    colors: [
                        Color(red: 1.0, green: 0.92, blue: 0.35),
                        Color(red: 1.0, green: 0.62, blue: 0.18),
                        Color(red: 0.85, green: 0.45, blue: 0.12),
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .shadow(color: .orange.opacity(shine ? 0.7 : 0.35), radius: shine ? 12 : 5)
            .scaleEffect(shine && isAnimated ? 1.08 : 1.0)
            .onAppear {
                guard isAnimated else { return }
                withAnimation(.easeInOut(duration: 0.85).repeatForever(autoreverses: true)) {
                    shine = true
                }
            }
    }
}

private struct World2DaddyCandyToken: View {
    var isAnimated = true
    @State private var bounce = false

    var body: some View {
        ZStack {
            Image(systemName: "birthday.cake.fill")
                .font(.system(size: 36, weight: .black))
                .foregroundStyle(
                    LinearGradient(
                        colors: [.pink, .orange, .yellow],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .scaleEffect(bounce && isAnimated ? 1.08 : 1.0)
            Text("🍬")
                .font(.system(size: 28))
                .offset(y: 2)
        }
        .onAppear {
            guard isAnimated else { return }
            withAnimation(.easeInOut(duration: 0.7).repeatForever(autoreverses: true)) {
                bounce = true
            }
        }
    }
}

private struct World2DaddyHugToken: View {
    var isAnimated = true
    @State private var pulse = false

    var body: some View {
        Image(systemName: "heart.fill")
            .font(.system(size: 40, weight: .black))
            .foregroundStyle(
                LinearGradient(
                    colors: [.pink, .red.opacity(0.85)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .scaleEffect(pulse && isAnimated ? 1.12 : 1.0)
            .shadow(color: .pink.opacity(0.45), radius: pulse ? 10 : 4)
            .onAppear {
                guard isAnimated else { return }
                withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) {
                    pulse = true
                }
            }
    }
}

/// Drawn deed token. World art is registry-only; this is local UI chrome.
struct World2PropertyDeedToken: View {
    var isAnimated = true
    @State private var shimmer = false

    var body: some View {
        RoundedRectangle(cornerRadius: 10)
            .fill(Color(red: 0.93, green: 0.86, blue: 0.68))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Color(red: 0.72, green: 0.55, blue: 0.22), lineWidth: 3)
            )
            .overlay(
                Image(systemName: "scroll.fill")
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(Color(red: 0.55, green: 0.32, blue: 0.12))
            )
            .shadow(color: .orange.opacity(shimmer ? 0.55 : 0.2), radius: shimmer ? 10 : 4)
            .onAppear {
                guard isAnimated else { return }
                withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) {
                    shimmer = true
                }
            }
    }
}

/// Drawn teleporter inventory token. World art is registry-only.
struct World2WorldTeleporterToken: View {
    var isAnimated = true
    @State private var pulse = false

    var body: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [
                        Color(red: 0.95, green: 0.82, blue: 0.35),
                        Color(red: 0.55, green: 0.32, blue: 0.12),
                    ],
                    center: .center,
                    startRadius: 4,
                    endRadius: 54
                )
            )
            .overlay(
                Circle()
                    .stroke(Color(red: 0.78, green: 0.58, blue: 0.18), lineWidth: 5)
            )
            .overlay(
                Circle()
                    .stroke(
                        Color.white.opacity(pulse ? 0.85 : 0.35),
                        lineWidth: 2
                    )
                    .padding(10)
            )
            .overlay(
                Image(systemName: "globe.americas.fill")
                    .font(.system(size: 28, weight: .black))
                    .foregroundStyle(.white)
                    .shadow(color: .black.opacity(0.35), radius: 2, y: 1)
            )
            .shadow(color: .orange.opacity(0.55), radius: pulse ? 12 : 4)
            .onAppear {
                guard isAnimated else { return }
                withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
                    pulse = true
                }
            }
    }
}

#Preview("Porridge") {
    World2StoryDecorationArtwork(decoration: .perfectPorridge)
        .frame(width: 200, height: 200)
        .background(.brown)
}

#Preview("Teleporter") {
    World2StoryDecorationArtwork(decoration: .worldTeleporter)
        .frame(width: 200, height: 200)
        .background(.indigo.opacity(0.4))
}

#Preview("Deed") {
    World2StoryDecorationArtwork(decoration: .propertyDeed)
        .frame(width: 200, height: 200)
        .background(.brown.opacity(0.35))
}
