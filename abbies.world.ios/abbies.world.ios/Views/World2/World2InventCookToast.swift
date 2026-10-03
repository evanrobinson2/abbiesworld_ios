//
//  World2InventCookToast.swift
//  abbies.world.ios
//
//  Self-updating cook timer. gpt-image-2.5-flare does not stream status, so
//  the seconds are local. Stays on the scene or POI after the invent sheet closes.
//

import SwiftUI

struct World2InventCookToast: View {
    let cook: World2InventCook
    let now: Date

    var body: some View {
        let seconds = cook.seconds(at: now)
        let pulse = cook.phase == .ready || cook.phase == .failed
            ? 1.0
            : 0.45 + 0.55 * abs(sin(now.timeIntervalSince(cook.startedAt) * .pi * 1.6))
        HStack(spacing: 10) {
            Image(systemName: symbol)
                .font(.system(size: 18, weight: .black))
                .foregroundStyle(tint)
                .opacity(pulse)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 1) {
                Text(cook.headline)
                    .font(.system(size: 15, weight: .black, design: .rounded))
                Text(subtitle(seconds: seconds))
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .monospacedDigit()
            }
            .foregroundStyle(.white)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(.black.opacity(0.88), in: Capsule())
        .overlay(Capsule().stroke(tint.opacity(0.85), lineWidth: cook.phase == .ready ? 2 : 0))
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("world2.inventCook.toast")
        .accessibilityLabel(cook.headline)
        .accessibilityValue("\(seconds) seconds")
    }

    private var symbol: String {
        switch cook.phase {
        case .drawing: return "flame.fill"
        case .carving: return "scissors"
        case .ready: return "checkmark.circle.fill"
        case .failed: return "exclamationmark.triangle.fill"
        }
    }

    private var tint: Color {
        switch cook.phase {
        case .failed: return .yellow
        case .ready: return .green
        case .drawing, .carving: return .orange
        }
    }

    private func subtitle(seconds: Int) -> String {
        switch cook.phase {
        case .ready:
            return cook.sceneName
        case .failed:
            return "Placeholder is staying · \(cook.sceneName)"
        case .drawing, .carving:
            return "\(seconds)s · \(cook.sceneName)"
        }
    }
}
