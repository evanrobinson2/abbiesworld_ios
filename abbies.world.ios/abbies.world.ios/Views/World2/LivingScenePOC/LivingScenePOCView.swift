//
//  LivingScenePOCView.swift
//  abbies.world.ios
//
//  Temporary developer demo host for LivingSceneRenderer.
//

import SpriteKit
import SwiftUI

struct LivingScenePOCView: View {
    var onClose: () -> Void

    @State private var status = "Loading…"
    @State private var lastHardpoint = "—"
    @State private var fpsText = "--"

    var body: some View {
        ZStack(alignment: .topLeading) {
            LivingSceneSpriteHost(
                onHardpointTap: { id in
                    lastHardpoint = id
                },
                onStats: { fps in
                    fpsText = String(format: "%.0f", fps)
                },
                onStatus: { status = $0 }
            )
            .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Button(action: onClose) {
                        Label("Close", systemImage: "xmark.circle.fill")
                            .font(.headline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(.ultraThinMaterial, in: Capsule())
                    }
                    .accessibilityIdentifier("world2.livingScenePOC.close")

                    Spacer()

                    Text("\(fpsText) fps")
                        .font(.system(.caption, design: .monospaced))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(.ultraThinMaterial, in: Capsule())
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("Living Scene POC")
                        .font(.title3.weight(.bold))
                    Text(status)
                        .font(.caption)
                    Text("Hardpoint: \(lastHardpoint)")
                        .font(.caption.monospaced())
                }
                .padding(12)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
            }
            .padding(16)
        }
        .accessibilityIdentifier("world2.livingScenePOC")
    }
}

private struct LivingSceneSpriteHost: UIViewRepresentable {
    var onHardpointTap: (String) -> Void
    var onStats: (Double) -> Void
    var onStatus: (String) -> Void

    func makeUIView(context: Context) -> SKView {
        let view = SKView(frame: .zero)
        view.ignoresSiblingOrder = true
        view.preferredFramesPerSecond = 60
        view.showsFPS = false
        view.showsNodeCount = false
        context.coordinator.skView = view
        return view
    }

    func updateUIView(_ uiView: SKView, context: Context) {
        let target = uiView.bounds.size
        guard target.width > 1, target.height > 1 else { return }
        if let scene = uiView.scene as? LivingSceneRenderer {
            if abs(scene.size.width - target.width) > 1
                || abs(scene.size.height - target.height) > 1 {
                scene.size = target
            }
            return
        }
        presentScene(on: uiView, size: target, coordinator: context.coordinator)
    }

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    private func presentScene(on view: SKView, size: CGSize, coordinator: Coordinator) {
        do {
            let manifest = try LivingSceneBundle.loadManifest()
            let scene = LivingSceneRenderer(
                size: size,
                manifest: manifest,
                showHardpointDebug: true
            )
            scene.onHardpointTap = onHardpointTap
            scene.onStats = onStats
            view.presentScene(scene)
            onStatus("PNG + masks + JSON · no video · no network")
            coordinator.scene = scene
        } catch {
            onStatus(error.localizedDescription)
        }
    }

    final class Coordinator {
        var skView: SKView?
        var scene: LivingSceneRenderer?
    }
}
