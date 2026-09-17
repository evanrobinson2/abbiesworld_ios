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

            if let plate = UIImage(named: "world2_blank_world") {
                Image(uiImage: plate)
                    .resizable()
                    .scaledToFill()
                    .opacity(0.35)
                    .ignoresSafeArea()
            }

            VStack(spacing: 22) {
                HStack {
                    Button(action: onExit) {
                        Label("Leave Workshop", systemImage: "arrow.left")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(.black.opacity(0.55), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.sceneCreator.exit")
                    Spacer()
                }

                Spacer()

                if let seed = UIImage(named: "world2_world_portal") {
                    Image(uiImage: seed)
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: 280, maxHeight: 240)
                }

                Text("Scene Creator")
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(.white)

                Text("Pack a Scene Kit, then plant it on a hardpoint in this world to attach a brand-new scene.")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.9))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 36)

                Button(action: onTakeKit) {
                    Label("Take Scene Kit", systemImage: "shippingbox.fill")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                        .frame(maxWidth: 320)
                        .padding(.vertical, 16)
                }
                .buttonStyle(.borderedProminent)
                .tint(.cyan)
                .accessibilityIdentifier("world2.sceneCreator.takeKit")

                Spacer()
            }
            .padding(24)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.sceneCreator.interior")
    }
}

struct World2BeaconView: View {
    let message: String
    let onExit: () -> Void

    var body: some View {
        ZStack {
            Color(red: 0.12, green: 0.18, blue: 0.22).ignoresSafeArea()

            VStack(spacing: 20) {
                HStack {
                    Button(action: onExit) {
                        Label("Back", systemImage: "arrow.left")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(.black.opacity(0.55), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.beacon.exit")
                    Spacer()
                }

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
    }
}
