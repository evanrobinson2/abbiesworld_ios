//
//  World2SceneInventDecorationsView.swift
//  abbies.world.ios
//
//  Invent props for the open scene: pick a few hints or type your own words.
//  The scene picture colors the result. Recent inventions live in the same sheet.
//

import SwiftUI
import UIKit

private enum World2InventTab: String, CaseIterable, Identifiable {
    case invent
    case recent

    var id: String { rawValue }

    var title: String {
        switch self {
        case .invent: return "Invent"
        case .recent: return "Recent"
        }
    }
}

struct World2SceneInventDecorationsView: View {
    let scene: World2SceneDefinition
    let plateImage: UIImage?
    /// Fired after a successful carve (awards landed). Parent should toast + route.
    let onCarved: (World2SceneInventResult) -> Void
    let onOpenDecorate: () -> Void
    /// Jump to the scene a past invention was made for, and open decorate there.
    var onTravel: (World2SceneInventResult) -> Void = { _ in }
    let onClose: () -> Void

    @StateObject private var invent = World2SceneDecorationInventService.shared
    @State private var tab: World2InventTab = .invent
    @State private var selectedHintIDs: Set<String> = []
    @State private var freeform = ""
    @State private var lastResult: World2SceneInventResult?

    private var canInvent: Bool {
        !selectedHintIDs.isEmpty || !freeform.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 14) {
                if invent.isBusy {
                    generationBanner
                }

                Picker("Invent", selection: $tab) {
                    ForEach(World2InventTab.allCases) { entry in
                        Text(tabTitle(entry)).tag(entry)
                    }
                }
                .pickerStyle(.segmented)
                .accessibilityIdentifier("world2.sceneInvent.tabs")

                if tab == .invent {
                    inventTab
                } else {
                    recentTab
                }
            }
            .padding(18)
            .navigationTitle("Invent Props")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close", action: onClose)
                }
            }
        }
    }

    private var inventTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                referencePlate

                Text("Pick a few, or type your own.")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)

                LazyVGrid(
                    columns: [GridItem(.adaptive(minimum: 108), spacing: 8)],
                    spacing: 8
                ) {
                    ForEach(World2InventHint.catalog) { hint in
                        hintChip(hint)
                    }
                }

                TextField(
                    "Or type your own — a rainbow chair, a tiny cake…",
                    text: $freeform,
                    axis: .vertical
                )
                .lineLimit(2...4)
                .textFieldStyle(.roundedBorder)
                .disabled(invent.isBusy)
                .accessibilityIdentifier("world2.sceneInvent.freeform")

                if invent.isBusy, let live = invent.lastResult, live.sceneID == scene.id, live.addedCount > 0 {
                    carvedPreviewRow(live)
                }

                if let result = lastResult, result.addedCount > 0, !invent.isBusy {
                    Text(invent.statusMessage)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(.green)
                        .accessibilityIdentifier("world2.sceneInvent.status")
                    carvedPreviewRow(result)
                    Button(action: onOpenDecorate) {
                        Label("Put them in \(scene.name)", systemImage: "paintbrush.pointed.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.green)
                    .accessibilityIdentifier("world2.sceneInvent.openDecorate")
                }

                if !invent.isBusy {
                    Button(action: runAutoPack) {
                        Label("Auto pack for scene", systemImage: "sparkles")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(invent.isBusy)
                    .accessibilityIdentifier("world2.sceneInvent.autoPack")

                    Button(action: runInvent) {
                        Label("Invent", systemImage: "wand.and.stars")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .disabled(!canInvent)
                    .accessibilityIdentifier("world2.sceneInvent.mint")
                }
            }
        }
    }

    private var recentTab: some View {
        Group {
            if invent.history.isEmpty {
                ContentUnavailableView(
                    "Nothing yet",
                    systemImage: "clock.arrow.circlepath",
                    description: Text("Inventions show up here. Tap one to jump back and decorate.")
                )
                .accessibilityIdentifier("world2.sceneInvent.recent.empty")
            } else {
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(invent.history) { entry in
                            recentCard(entry)
                        }
                    }
                }
            }
        }
    }

    private var generationBanner: some View {
        Group {
            if let cook = invent.cook, invent.isBusy {
                TimelineView(.periodic(from: cook.startedAt, by: 1)) { context in
                    bannerRow("\(cook.headline) · \(cook.seconds(at: context.date))s")
                }
            } else {
                bannerRow(invent.statusMessage)
            }
        }
    }

    private func bannerRow(_ text: String) -> some View {
        HStack(spacing: 12) {
            ProgressView()
                .controlSize(.regular)
            Text(text)
                .font(.system(size: 18, weight: .black, design: .rounded))
                .monospacedDigit()
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.orange.opacity(0.16), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .accessibilityIdentifier("world2.sceneInvent.progress")
        .accessibilityLabel(text)
    }

    private var referencePlate: some View {
        VStack(alignment: .leading, spacing: 8) {
            plateThumb
            Text(plateImage == nil
                 ? "No picture for \(scene.name) yet — props will still be made."
                 : "Using \(scene.name) as the picture.")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(plateImage == nil ? .orange : .secondary)
        }
    }

    private func hintChip(_ hint: World2InventHint) -> some View {
        let on = selectedHintIDs.contains(hint.id)
        return Button {
            if on {
                selectedHintIDs.remove(hint.id)
            } else {
                selectedHintIDs.insert(hint.id)
            }
        } label: {
            Label(hint.title, systemImage: hint.symbol)
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(on ? .white : .primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(on ? Color.pink : Color.primary.opacity(0.08), in: Capsule())
        }
        .buttonStyle(.plain)
        .disabled(invent.isBusy)
        .accessibilityIdentifier("world2.sceneInvent.hint.\(hint.id)")
        .accessibilityAddTraits(on ? .isSelected : [])
    }

    private func recentCard(_ entry: World2SceneInventHistoryEntry) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(entry.result.sceneName)
                    .font(.system(size: 16, weight: .black, design: .rounded))
                Spacer()
                Text(entry.createdAt, style: .relative)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            if !entry.result.prompt.isEmpty {
                Text(entry.result.prompt)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(entry.result.awarded) { decoration in
                        World2GeneratedDecorationArtwork(decoration: decoration)
                            .frame(width: 56, height: 56)
                            .background(Color.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
                    }
                }
            }
            Button {
                onTravel(entry.result)
            } label: {
                Label("Go to \(entry.result.sceneName)", systemImage: "figure.walk")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.pink)
            .accessibilityIdentifier("world2.sceneInvent.recent.travel.\(entry.id)")
        }
        .padding(12)
        .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private func tabTitle(_ entry: World2InventTab) -> String {
        if entry == .recent, !invent.history.isEmpty {
            return "Recent (\(invent.history.count))"
        }
        return entry.title
    }

    private func runInvent() {
        let hints = selectedHintIDs
        let words = freeform
        Task {
            guard let result = await invent.inventFromPlayer(
                selectedHintIDs: hints,
                freeform: words,
                scene: scene,
                plate: plateImage
            ) else {
                return
            }
            lastResult = result
            if result.picturesReady > 0 {
                onCarved(result)
            }
        }
    }

    private func runAutoPack() {
        let studioLabels = World2WorldSync.shared.pendingAutoDecorLabels(for: scene.id)
        let pack = World2WorldSync.shared.autoDecorPack(for: scene.id)
        Task {
            guard let result = await invent.autoInventPack(
                for: scene,
                plate: plateImage,
                labels: studioLabels
            ) else {
                return
            }
            if let pack {
                World2WorldSync.shared.markAutoDecorCooked(pack)
            }
            lastResult = result
            if result.picturesReady > 0 || result.addedCount > 0 {
                onCarved(result)
            }
        }
    }

    @ViewBuilder
    private func carvedPreviewRow(_ result: World2SceneInventResult) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(result.awarded) { decoration in
                    VStack(spacing: 4) {
                        World2GeneratedDecorationArtwork(decoration: decoration)
                            .frame(width: 64, height: 64)
                            .background(Color.primary.opacity(0.06), in: RoundedRectangle(cornerRadius: 12))
                        Text(World2ChromeContract.shortDecorationLabel(decoration.label))
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .lineLimit(1)
                            .frame(width: 72)
                    }
                    .accessibilityIdentifier("world2.sceneInvent.carved.\(decoration.id)")
                }
            }
        }
        .accessibilityLabel("Invented \(result.addedCount) props")
    }

    @ViewBuilder
    private var plateThumb: some View {
        Group {
            if let plateImage {
                Image(uiImage: plateImage)
                    .resizable()
                    .scaledToFill()
            } else {
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.secondary.opacity(0.2))
                    .overlay {
                        Image(systemName: "photo")
                            .font(.title)
                            .foregroundStyle(.secondary)
                    }
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 150)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(.white.opacity(0.35), lineWidth: 1)
        )
        .accessibilityLabel("Reference picture for \(scene.name)")
        .accessibilityIdentifier("world2.sceneInvent.plate")
    }
}
