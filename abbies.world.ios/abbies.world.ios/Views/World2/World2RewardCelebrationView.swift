//
//  World2RewardCelebrationView.swift
//  abbies.world.ios
//
//  What happens the moment a story reward is earned.
//
//  Presented over every other screen, because "it went into your inventory"
//  means nothing to a six year old unless somebody makes a fuss. The screen
//  names the thing, shows the thing, shows its ribbons, says where it went, and
//  offers to walk her there.
//

import SwiftUI
import UIKit

struct World2RewardCelebrationView: View {
    let celebration: World2RewardCelebration
    let playerName: String
    let onShowMe: () -> Void
    let onDismiss: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hasLanded = false

    var body: some View {
        ZStack {
            Color.black.opacity(0.72)
                .ignoresSafeArea()

            World2ConfettiBurst(isAnimated: !reduceMotion)
                .ignoresSafeArea()
                .allowsHitTesting(false)

            card
                .scaleEffect(hasLanded ? 1 : 0.72)
                .opacity(hasLanded ? 1 : 0)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.reward.celebration")
        .onAppear {
            withAnimation(.spring(response: 0.52, dampingFraction: 0.68)) {
                hasLanded = true
            }
            if PlayerStateService.shared.currentPlayer?.settings.hapticFeedbackEnabled ?? true {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            }
        }
    }

    private var card: some View {
        VStack(spacing: 16) {
            Text(celebration.headline)
                .font(.system(size: 40, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .shadow(color: .orange.opacity(0.9), radius: 14)
                .accessibilityIdentifier("world2.reward.headline")

            World2PorridgeBowl(isMagical: true)
                .frame(width: 220, height: 220)
                .accessibilityIdentifier("world2.reward.artwork")

            Text(celebration.decoration.name.uppercased())
                .font(.system(size: 26, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .accessibilityIdentifier("world2.reward.itemName")

            badgeRow

            Text(celebration.decoration.shortDescription)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.88))
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: 420)

            inventoryNotice

            buttons
        }
        .padding(.horizontal, 34)
        .padding(.vertical, 30)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.33, green: 0.16, blue: 0.48),
                    Color(red: 0.13, green: 0.09, blue: 0.29),
                ],
                startPoint: .top,
                endPoint: .bottom
            ),
            in: RoundedRectangle(cornerRadius: 36)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 36)
                .stroke(.white.opacity(0.42), lineWidth: 3)
        )
        .shadow(color: .black.opacity(0.5), radius: 30, y: 12)
        .padding(.horizontal, 28)
    }

    private var badgeRow: some View {
        HStack(spacing: 8) {
            ForEach(
                World2InventoryBadge.forDisplay(celebration.decoration.badges, limit: 3),
                id: \.self
            ) { badge in
                World2InventoryBadgeChip(badge: badge, size: .large)
            }
        }
        .accessibilityIdentifier("world2.reward.badges")
    }

    private var inventoryNotice: some View {
        Label(
            "It is in \(playerName)'s treehouse drawer now.",
            systemImage: "shippingbox.fill"
        )
        .font(.system(size: 17, weight: .black, design: .rounded))
        .foregroundStyle(.white)
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .background(.green.opacity(0.85), in: Capsule())
        .overlay(Capsule().stroke(.white.opacity(0.7), lineWidth: 2))
        .accessibilityIdentifier("world2.reward.inventoryNotice")
    }

    private var buttons: some View {
        HStack(spacing: 14) {
            Button(action: onDismiss) {
                Text("Keep Playing")
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 22)
                    .padding(.vertical, 15)
                    .background(.white.opacity(0.18), in: Capsule())
                    .overlay(Capsule().stroke(.white.opacity(0.45), lineWidth: 2))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.reward.dismiss")

            Button(action: onShowMe) {
                Label("SHOW ME!", systemImage: "arrow.right.circle.fill")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 26)
                    .padding(.vertical, 15)
                    .background(.pink.gradient, in: Capsule())
                    .overlay(Capsule().stroke(.white.opacity(0.8), lineWidth: 2.5))
                    .shadow(color: .pink.opacity(0.6), radius: 14, y: 4)
            }
            .buttonStyle(.plain)
            .accessibilityHint("Opens your treehouse drawer")
            .accessibilityIdentifier("world2.reward.showMe")
        }
    }
}

/// A ribbon on an inventory item.
struct World2InventoryBadgeChip: View {
    enum Size {
        case small
        case large

        var font: CGFloat { self == .small ? 8 : 12 }
        var iconFont: CGFloat { self == .small ? 8 : 12 }
        var horizontalPadding: CGFloat { self == .small ? 5 : 11 }
        var verticalPadding: CGFloat { self == .small ? 3 : 7 }
    }

    let badge: World2InventoryBadge
    var size: Size = .small

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: badge.symbolName)
                .font(.system(size: size.iconFont, weight: .black))
            Text(badge.label)
                .font(.system(size: size.font, weight: .black, design: .rounded))
                .lineLimit(1)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, size.horizontalPadding)
        .padding(.vertical, size.verticalPadding)
        .background {
            background.clipShape(Capsule())
        }
        .overlay(Capsule().stroke(.white.opacity(0.65), lineWidth: 1))
        .shadow(color: .black.opacity(0.25), radius: 3, y: 1)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(badge.label)
        .accessibilityIdentifier("world2.badge.\(badge.rawValue)")
    }

    @ViewBuilder
    private var background: some View {
        switch badge.tint {
        case .gold:
            LinearGradient(
                colors: [Color(red: 0.99, green: 0.76, blue: 0.20), Color(red: 0.85, green: 0.55, blue: 0.10)],
                startPoint: .top,
                endPoint: .bottom
            )
        case .pink:
            Color.pink
        case .teal:
            Color.teal
        case .indigo:
            Color.indigo
        case .rainbow:
            LinearGradient(
                colors: World2PorridgeArtPalette.rainbow,
                startPoint: .leading,
                endPoint: .trailing
            )
        }
    }
}

/// Falling paper confetti. Deterministic so it reads the same every time.
private struct World2ConfettiBurst: View {
    let isAnimated: Bool

    private static let pieces: [(x: Double, delay: Double, spin: Double, colorIndex: Int)] = {
        var generator = World2SeededGenerator(seed: 0xC0FFEE)
        return (0..<70).map { index in
            (
                x: Double.random(in: 0.02...0.98, using: &generator),
                delay: Double.random(in: 0...1.9, using: &generator),
                spin: Double.random(in: -2.2...2.2, using: &generator),
                colorIndex: index % World2PorridgeArtPalette.rainbow.count
            )
        }
    }()

    var body: some View {
        GeometryReader { geometry in
            TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: !isAnimated)) { timeline in
                let time = timeline.date.timeIntervalSinceReferenceDate
                ZStack {
                    ForEach(Self.pieces.indices, id: \.self) { index in
                        let piece = Self.pieces[index]
                        let cycle = ((time + piece.delay) / 3.4)
                            .truncatingRemainder(dividingBy: 1.0)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(World2PorridgeArtPalette.rainbow[piece.colorIndex])
                            .frame(width: 11, height: 16)
                            .rotationEffect(.radians(time * piece.spin + Double(index)))
                            .position(
                                x: geometry.size.width * piece.x
                                    + CGFloat(sin(time * 1.3 + Double(index)) * 22),
                                y: geometry.size.height * (cycle * 1.25 - 0.12)
                            )
                            .opacity(cycle > 0.86 ? (1 - cycle) / 0.14 : 1)
                    }
                }
            }
        }
        .accessibilityHidden(true)
    }
}

#Preview {
    World2RewardCelebrationView(
        celebration: World2RewardCelebration(
            id: "preview",
            decoration: .perfectPorridge,
            headline: "PERFECT TASTING!",
            earnedPerfectly: true
        ),
        playerName: "Abbie",
        onShowMe: {},
        onDismiss: {}
    )
}
