//
//  World2PartyLayer.swift
//  abbies.world.ios
//
//  Draws Abbie and Daddy on top of a map plate as Meshy USDZ avatars.
//  They run to a selected POI and idle (or freeze) when settled.
//

import SwiftUI

struct World2PartyLayer: View {
    @ObservedObject var party: World2PartyController
    let mapRect: CGRect
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(
            .animation(
                minimumInterval: reduceMotion ? 1.0 / 8.0 : 1.0 / 30.0
            )
        ) { timeline in
            let pieces = party.pieces(at: timeline.date)
            ZStack {
                ForEach(pieces) { piece in
                    pieceView(piece)
                        .zIndex(10 + piece.id.zBias)
                }
            }
        }
        .allowsHitTesting(false)
        .accessibilityElement(children: .ignore)
        .accessibilityIdentifier("world2.party.layer")
    }

    @ViewBuilder
    private func pieceView(_ piece: World2PartyPieceState) -> some View {
        let size = markerSize
        let screen = CGPoint(
            x: mapRect.minX + mapRect.width * piece.position.x,
            y: mapRect.minY + mapRect.height * piece.position.y
        )

        VStack(spacing: 2) {
            World2PartyAvatarViewport(
                actor: piece.id,
                isWalking: piece.isWalking,
                facingRight: piece.facingRight,
                size: size
            )
            .shadow(color: .black.opacity(0.35), radius: 4, y: 3)

            if piece.isWalking {
                Text(piece.displayName)
                    .font(.system(size: 11, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(.black.opacity(0.62), in: Capsule())
                    .transition(.opacity)
            }
        }
        .frame(width: size + 12, height: size + 22)
        .position(x: screen.x, y: screen.y - size * 0.28)
        .accessibilityLabel(piece.displayName)
        .accessibilityIdentifier("world2.party.\(piece.id.rawValue)")
    }

    private var markerSize: CGFloat {
        max(72, min(mapRect.width, mapRect.height) * 0.13)
    }
}
