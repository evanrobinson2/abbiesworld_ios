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
        }
    }
}

#Preview {
    World2StoryDecorationArtwork(decoration: .perfectPorridge)
        .frame(width: 200, height: 200)
        .background(.brown)
}
