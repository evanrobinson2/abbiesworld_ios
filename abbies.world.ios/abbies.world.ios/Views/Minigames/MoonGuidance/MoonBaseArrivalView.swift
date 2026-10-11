//
//  MoonBaseArrivalView.swift
//  abbies.world.ios
//
//  Post-landing Moon Base plate (blueprint OK). Kid-readable arrival.
//

import SwiftUI

struct MoonBaseArrivalView: View {
    var onExit: () -> Void

    var body: some View {
        ZStack {
            World2SemanticImage(
                semanticName: "map.moonBase.exterior",
                fallbackIcon: "building.2.fill",
                fallbackLabel: "Moon Base blueprint"
            )
            .scaledToFill()
            .ignoresSafeArea()

            Color.black.opacity(0.25).ignoresSafeArea()

            VStack(spacing: 18) {
                Spacer()
                Text("Moon Base")
                    .font(.system(size: 40, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .shadow(radius: 4)
                Text("You made it. Blueprint walls for now — the adventure is real.")
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.95))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                Button(action: onExit) {
                    Text("Back to Home")
                        .font(.system(size: 22, weight: .heavy, design: .rounded))
                        .foregroundStyle(Color(red: 0.1, green: 0.2, blue: 0.35))
                        .padding(.horizontal, 28)
                        .padding(.vertical, 14)
                        .background(Capsule().fill(Color.cyan))
                }
                .accessibilityIdentifier("world2.moonBase.leave")
                .padding(.bottom, 48)
            }
        }
        .accessibilityIdentifier("world2.moonBase")
    }
}
