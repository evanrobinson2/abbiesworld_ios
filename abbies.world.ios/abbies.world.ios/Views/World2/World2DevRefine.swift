//
//  World2DevRefine.swift
//  abbies.world.ios
//
//  Developer-only redo of a picture. Play always uses the fast path and
//  never asks which model to use.
//

import SwiftUI

struct World2DevRefineButton: View {
    let accessibilityID: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: "sparkle.magnifyingglass")
                .font(.system(size: 14, weight: .black))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(Color.orange.opacity(0.95), in: Circle())
                .overlay(Circle().stroke(.white, lineWidth: 2))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Redo this picture")
        .accessibilityIdentifier(accessibilityID)
    }
}

@MainActor
enum World2DevRefine {
    static func decoration(instanceID: String, label: String, placeName: String) {
        let invent = World2SceneDecorationInventService.shared
        invent.beginExternalCook(title: label, sceneName: placeName)
        Task {
            do {
                let raw = try await World2AssetGenerationService.fetchPNG(
                    kind: .decoration,
                    subject: label,
                    placeName: placeName,
                    quality: World2AssetGenerationService.fineQuality
                )
                let carved = World2AssetGenerationService.finish(raw, kind: .decoration)
                let saved = PlayerStateService.shared.applyRefinedPicture(
                    instanceID: instanceID,
                    png: carved,
                    label: label
                )
                invent.noteExternalCook(saved ? .ready : .failed)
            } catch {
                World2Diagnostics.log(
                    "dev_refine_failed",
                    ["kind": "decoration", "reason": error.localizedDescription]
                )
                invent.noteExternalCook(.failed)
            }
        }
    }

    static func poi(assetKey: String, name: String) {
        let invent = World2SceneDecorationInventService.shared
        invent.beginExternalCook(title: name, sceneName: name)
        Task {
            let saved = await World2POIArtwork.generate(
                assetKey: assetKey,
                subject: name,
                placeName: name,
                quality: World2AssetGenerationService.fineQuality
            )
            invent.noteExternalCook(saved ? .ready : .failed)
        }
    }
}
