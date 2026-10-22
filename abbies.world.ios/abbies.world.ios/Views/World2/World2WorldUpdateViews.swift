//
//  World2WorldUpdateViews.swift
//  abbies.world.ios
//
//  Accept a newer /worlds/current in place. NEW badges stay on unseen places.
//

import SwiftUI
import UIKit

struct World2WorldUpdateAcceptCard: View {
    let summary: World2WorldUpdateSummary
    let onAccept: () -> Void

    @State private var locallyDismissed = false

    var body: some View {
        if locallyDismissed {
            EmptyView()
        } else {
            ZStack {
                // Full-screen blocker — must eat every hit so profile badges
                // underneath cannot steal the Accept tap.
                Color.black.opacity(0.55)
                    .ignoresSafeArea()
                    .contentShape(Rectangle())
                    .onTapGesture { commitAccept() }

                VStack(alignment: .leading, spacing: 12) {
                    Text("What's new")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.7))
                    Text(summary.headline)
                        .font(.system(size: 22, weight: .black, design: .rounded))
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(summary.lines, id: \.self) { line in
                            HStack(alignment: .top, spacing: 8) {
                                Image(systemName: "sparkle")
                                    .font(.system(size: 13, weight: .black))
                                    .foregroundStyle(.yellow)
                                Text(line)
                                    .font(.system(size: 15, weight: .bold, design: .rounded))
                            }
                        }
                    }
                    // UIKit button — SwiftUI Button + MainActor method refs
                    // were not firing on the player-select overlay on iPad.
                    World2AcceptUIKitButton(title: "Accept", action: commitAccept)
                        .frame(height: 52)
                        .accessibilityIdentifier("world2.worldUpdate.accept")
                }
                .foregroundStyle(.white)
                .padding(18)
                .frame(maxWidth: 520)
                .background(.black.opacity(0.94), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(.orange.opacity(0.85), lineWidth: 2)
                )
                .padding(.horizontal, 24)
                .padding(.bottom, 36)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .contentShape(Rectangle())
            .allowsHitTesting(true)
            .accessibilityIdentifier("world2.worldUpdate.offer")
        }
    }

    private func commitAccept() {
        guard !locallyDismissed else { return }
        locallyDismissed = true
        World2Diagnostics.log(
            "world_whats_new_accept_tapped",
            ["revision": String(summary.toRevision)]
        )
        onAccept()
    }
}

/// UIKit control so Accept always receives the tap even when SwiftUI overlay
/// hit-testing is fighting the profile badges underneath.
private struct World2AcceptUIKitButton: UIViewRepresentable {
    let title: String
    let action: () -> Void

    func makeUIView(context: Context) -> UIButton {
        var config = UIButton.Configuration.filled()
        config.baseBackgroundColor = .systemOrange
        config.baseForegroundColor = .white
        config.cornerStyle = .medium
        config.title = title
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var out = incoming
            out.font = .systemFont(ofSize: 18, weight: .black)
            return out
        }
        let button = UIButton(configuration: config)
        button.addTarget(context.coordinator, action: #selector(Coordinator.tapped), for: .touchUpInside)
        button.accessibilityIdentifier = "world2.worldUpdate.accept"
        return button
    }

    func updateUIView(_ uiView: UIButton, context: Context) {
        context.coordinator.action = action
        uiView.configuration?.title = title
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(action: action)
    }

    final class Coordinator: NSObject {
        var action: () -> Void
        init(action: @escaping () -> Void) { self.action = action }
        @objc func tapped() { action() }
    }
}

struct World2NewBadge: View {
    var size: CGFloat = 52
    @ObservedObject private var plates = World2GeneratedPlateStore.shared

    var body: some View {
        Group {
            if let image = plates.image(for: World2NewBadgeArtwork.semanticID) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                Text("NEW")
                    .font(.system(size: size * 0.28, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 5)
                    .background(.orange, in: Capsule())
                    .overlay(Capsule().stroke(.white, lineWidth: 2))
            }
        }
        .frame(width: size, height: size)
        .shadow(color: .black.opacity(0.35), radius: 4, y: 2)
        .accessibilityLabel("New")
        .accessibilityIdentifier("world2.newBadge")
    }
}

enum World2NewBadgeArtwork {
    static let semanticID = "ui.newBadge"

    @MainActor
    static func ensure() async {
        if ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] != nil {
            return
        }
        if World2GeneratedPlateStore.shared.image(for: semanticID) != nil {
            return
        }
        do {
            let image = try await HeadDAGService.shared.generatePicture(
                prompt: """
                Safe for young children. One round clay sticker badge. \
                The badge clearly says the word NEW in chunky playful letters. \
                Bright gold and orange, little star sparkles, sticker cutout \
                on a plain flat light-grey background. No people, no frame, no watermark.
                """,
                quality: World2AssetGenerationService.quickQuality,
                imageModel: World2AssetGenerationService.quickModel
            )
            guard let png = image.pngData() else { return }
            let cut = DevAssetCarvingService.spriteCutoutPNG(from: png)
            if let badge = UIImage(data: cut) {
                World2GeneratedPlateStore.shared.store(badge, for: semanticID)
            }
        } catch {
            World2Diagnostics.log(
                "new_badge_generate_failed",
                ["reason": error.localizedDescription]
            )
        }
    }
}
