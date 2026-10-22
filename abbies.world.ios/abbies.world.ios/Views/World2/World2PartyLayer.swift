//
//  World2PartyLayer.swift
//  abbies.world.ios
//
//  Draws Abbie and Daddy on top of a map plate as Meshy USDZ avatars.
//  Peglin Edition swaps Abbie to her pixel map sprite.
//

import SwiftUI
import UIKit

struct World2PartyLayer: View {
    @ObservedObject var party: World2PartyController
    let mapRect: CGRect
    /// Optional scene walk profile for near/far scale; falls back to Y-scale.
    var walkProfile: World2SceneWalkProfile? = nil
    /// When false, the scene label pass draws the names so they can move clear.
    var showsNames: Bool = true
    /// Peglin Edition: pixel Abbie on the map instead of Meshy USDZ.
    var usesPeglinPixelAbbie: Bool = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        TimelineView(
            .animation(
                minimumInterval: reduceMotion ? 1.0 / 8.0 : 1.0 / 30.0
            )
        ) { timeline in
            let pieces: [World2PartyPieceState] = {
                party.tickSticks(at: timeline.date)
                return party.pieces(at: timeline.date)
            }()
            ZStack {
                ForEach(pieces) { piece in
                    pieceView(piece)
                        .zIndex(10 + piece.id.zBias + piece.position.y)
                }
            }
        }
        .allowsHitTesting(false)
        .accessibilityElement(children: .ignore)
        .accessibilityIdentifier("world2.party.layer")
    }

    private func pieceView(_ piece: World2PartyPieceState) -> some View {
        let depth = walkProfile?.scale(forY: piece.position.y)
            ?? World2PartyPathfinding.depthScale(forY: piece.position.y)
        let size = baseMarkerSize * depth
        let screen = CGPoint(
            x: mapRect.minX + mapRect.width * piece.position.x,
            y: mapRect.minY + mapRect.height * piece.position.y
        )

        return VStack(spacing: 3) {
            if usesPeglinPixelAbbie, piece.id == .abbie,
               UIImage(named: PeglinAbbieArt.mapCatalogName) != nil {
                Image(PeglinAbbieArt.mapCatalogName)
                    .resizable()
                    .scaledToFit()
                    .frame(width: size * 0.85, height: size)
                    .shadow(color: .black.opacity(0.35), radius: 6, y: 4)
                    .scaleEffect(x: piece.facingRight ? 1 : -1, y: 1)
                    .accessibilityHidden(true)
            } else {
                World2PartyAvatarViewport(
                    actor: piece.id,
                    gait: piece.gait,
                    heading: piece.heading,
                    stride: piece.stride,
                    size: size
                )
            }

            Text(piece.displayName)
                .font(.system(size: max(12, size * 0.14), weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(
                    (piece.isWalking ? Color.orange.opacity(0.85) : Color.black.opacity(0.62)),
                    in: Capsule()
                )
                .opacity(showsNames ? 1 : 0)
                .accessibilityHidden(!showsNames)
        }
        .frame(width: size + 20, height: size + 36)
        .position(x: screen.x, y: screen.y - size * 0.32)
        .accessibilityLabel(piece.displayName)
        .accessibilityValue(piece.gait.rawValue)
        .accessibilityIdentifier("world2.party.\(piece.id.rawValue)")
    }

    private var baseMarkerSize: CGFloat {
        max(128, min(mapRect.width, mapRect.height) * 0.24)
    }
}
