//
//  World2SceneCreatorView.swift
//  abbies.world.ios
//
//  Interior of the Scene Creator POI — packs a Scene Kit into Place Inventory.
//

import SwiftUI

struct World2SceneCreatorView: View {
    let instanceID: String
    let onTakeKit: () -> Void
    let onExit: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.10, green: 0.16, blue: 0.28),
                    Color(red: 0.18, green: 0.12, blue: 0.30),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 22) {
                Spacer()

                World2SemanticImage(
                    semanticName: "poi.sceneCreator.exterior",
                    fallbackIcon: "hammer.fill",
                    fallbackLabel: "Scene Creator"
                )
                .scaledToFit()
                .frame(maxWidth: 280, maxHeight: 240)

                Text("Scene Creator")
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(.white)

                Text("Pack a Scene Kit, then plant it on a hardpoint in this world to attach a brand-new scene.")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 36)

                Spacer()
            }
            .padding(24)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.sceneCreator.interior")
        .world2InteriorActions(
            [
                World2ThumbAction(
                    id: "take-kit",
                    title: "Take Scene Kit",
                    icon: "shippingbox.fill",
                    accessibilityID: "world2.sceneCreator.takeKit"
                )
            ],
            exitAccessibilityID: "world2.sceneCreator.exit",
            onExit: onExit
        ) { id in
            if id == "take-kit" {
                onTakeKit()
            }
        }
    }
}

struct World2BeaconView: View {
    let message: String
    let onExit: () -> Void

    var body: some View {
        ZStack {
            Color(red: 0.12, green: 0.18, blue: 0.22).ignoresSafeArea()

            VStack(spacing: 20) {
                Spacer()

                Image(systemName: "light.beacon.max.fill")
                    .font(.system(size: 72, weight: .bold))
                    .foregroundStyle(.yellow)

                Text("Beacon")
                    .font(.system(size: 32, weight: .black, design: .rounded))
                    .foregroundStyle(.white)

                Text(message)
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.92))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
                    .accessibilityIdentifier("world2.beacon.message")

                Spacer()
            }
            .padding(24)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.beacon.interior")
        .world2InteriorActions(
            exitAccessibilityID: "world2.beacon.exit",
            onExit: onExit
        )
    }
}
