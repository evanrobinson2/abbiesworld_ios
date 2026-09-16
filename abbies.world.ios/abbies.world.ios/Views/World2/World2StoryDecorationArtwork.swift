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
        }
    }
}

/// Painted deed from Scene Builder (`world2_deed_reward`), with a soft parchment fallback.
struct World2PropertyDeedToken: View {
    var isAnimated = true
    @State private var shimmer = false

    var body: some View {
        ZStack {
            if let painted = UIImage(named: "world2_deed_reward") {
                Image(uiImage: painted)
                    .resizable()
                    .scaledToFit()
                    .shadow(color: .orange.opacity(shimmer ? 0.55 : 0.2), radius: shimmer ? 10 : 4)
            } else {
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
            }
        }
        .onAppear {
            guard isAnimated else { return }
            withAnimation(.easeInOut(duration: 1.4).repeatForever(autoreverses: true)) {
                shimmer = true
            }
        }
    }
}

/// Stand-in inventory art for the World Teleporter until a painted asset lands.
/// Swap in `world2_item_worldTeleporter` when that imageset is supplied.
struct World2WorldTeleporterToken: View {
    var isAnimated = true
    @State private var pulse = false

    var body: some View {
        ZStack {
            if let painted = UIImage(named: "world2_item_worldTeleporter") {
                Image(uiImage: painted)
                    .resizable()
                    .scaledToFit()
            } else {
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
            }
        }
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
