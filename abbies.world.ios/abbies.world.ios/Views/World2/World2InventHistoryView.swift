//
//  World2InventHistoryView.swift
//  abbies.world.ios
//
//  Completions gallery — every generated prop image in one place.
//  Invent runs, auto packs, and workbench awards all land here as pictures.
//

import SwiftUI

struct World2InventHistoryView: View {
    @ObservedObject private var invent = World2SceneDecorationInventService.shared
    @ObservedObject private var playerService = PlayerStateService.shared
    @ObservedObject private var imageStore = World2GeneratedDecorationImageStore.shared

    let onDecorate: (World2SceneInventResult) -> Void
    let onClose: () -> Void

    @State private var selected: World2GeneratedDecoration?
    @State private var filterSceneID: String? = nil

    private var allDecorations: [World2GeneratedDecoration] {
        let inventory = playerService.currentPlayer?.availableGeneratedDecorations ?? []
        if !inventory.isEmpty {
            return inventory.sorted { $0.awardedAt > $1.awardedAt }
        }
        // Fallback before inventory hydrate: invent history awards.
        return invent.history
            .flatMap(\.result.awarded)
            .sorted { $0.awardedAt > $1.awardedAt }
    }

    private var filtered: [World2GeneratedDecoration] {
        guard let filterSceneID else { return allDecorations }
        return allDecorations.filter { decoration in
            decoration.packID.contains(filterSceneID)
                || decoration.registryKey.contains(filterSceneID)
                || invent.history.contains {
                    $0.result.sceneID == filterSceneID
                        && $0.result.awarded.contains(where: { $0.id == decoration.id })
                }
        }
    }

    private var sceneFilters: [(id: String, name: String)] {
        var seen = Set<String>()
        var rows: [(id: String, name: String)] = []
        for entry in invent.history {
            if seen.insert(entry.result.sceneID).inserted {
                rows.append((entry.result.sceneID, entry.result.sceneName))
            }
        }
        return rows
    }

    private let columns = [
        GridItem(.adaptive(minimum: 108), spacing: 12),
    ]

    var body: some View {
        NavigationStack {
            Group {
                if filtered.isEmpty {
                    ContentUnavailableView(
                        "No completions yet",
                        systemImage: "photo.on.rectangle.angled",
                        description: Text("Auto props and Invent cook pictures land here. Open a scene, let a pack finish, then come back.")
                    )
                    .accessibilityIdentifier("world2.completions.empty")
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 14) {
                            filterBar
                            LazyVGrid(columns: columns, spacing: 12) {
                                ForEach(filtered) { decoration in
                                    completionTile(decoration)
                                }
                            }
                            if !invent.history.isEmpty {
                                runsSection
                            }
                        }
                        .padding(18)
                    }
                }
            }
            .navigationTitle("Completions")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close", action: onClose)
                }
                ToolbarItem(placement: .principal) {
                    Text("\(filtered.count) pictures")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(.secondary)
                        .accessibilityIdentifier("world2.completions.count")
                }
            }
            .accessibilityIdentifier("world2.completions")
            .sheet(item: $selected) { decoration in
                completionLightbox(decoration)
            }
            .task {
                for decoration in allDecorations.prefix(40) {
                    await imageStore.loadIfNeeded(decoration)
                }
            }
        }
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filterChip(title: "All", selected: filterSceneID == nil) {
                    filterSceneID = nil
                }
                ForEach(sceneFilters, id: \.id) { row in
                    filterChip(title: row.name, selected: filterSceneID == row.id) {
                        filterSceneID = row.id
                    }
                }
            }
        }
        .accessibilityIdentifier("world2.completions.filters")
    }

    private func filterChip(title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(World2ChromeContract.ellipsized(title, budget: 16))
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(selected ? Color.purple.opacity(0.9) : Color.primary.opacity(0.08), in: Capsule())
                .foregroundStyle(selected ? .white : .primary)
        }
        .buttonStyle(.plain)
    }

    private func completionTile(_ decoration: World2GeneratedDecoration) -> some View {
        Button {
            selected = decoration
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(Color.primary.opacity(0.06))
                    World2GeneratedDecorationArtwork(decoration: decoration)
                        .padding(8)
                    if imageStore.generatingIDs.contains(decoration.id) {
                        ProgressView()
                    }
                }
                .frame(height: 108)
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.primary.opacity(0.08), lineWidth: 1)
                )
                Text(World2ChromeContract.shortDecorationLabel(decoration.label))
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .lineLimit(1)
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(decoration.label)
        .accessibilityIdentifier("world2.completions.tile.\(decoration.id)")
    }

    private var runsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Invent runs")
                .font(.system(size: 14, weight: .black, design: .rounded))
            ForEach(invent.history.prefix(12)) { entry in
                HStack(spacing: 10) {
                    Text(entry.result.sceneName)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                    Text("· \(entry.result.awarded.count)")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button("Decorate") {
                        onDecorate(entry.result)
                    }
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .buttonStyle(.bordered)
                    .controlSize(.mini)
                    .accessibilityIdentifier("world2.completions.decorate.\(entry.id)")
                }
                .padding(.vertical, 4)
            }
        }
        .padding(.top, 8)
    }

    private func completionLightbox(_ decoration: World2GeneratedDecoration) -> some View {
        NavigationStack {
            VStack(spacing: 16) {
                World2GeneratedDecorationArtwork(decoration: decoration)
                    .frame(maxWidth: .infinity)
                    .frame(height: 320)
                    .background(Color.primary.opacity(0.05), in: RoundedRectangle(cornerRadius: 20))
                    .padding(.horizontal, 20)
                Text(World2ChromeContract.shortDecorationLabel(decoration.label))
                    .font(.system(size: 22, weight: .black, design: .rounded))
                Text(decoration.awardedAt.formatted(date: .abbreviated, time: .shortened))
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
                if let run = invent.history.first(where: { $0.result.awarded.contains(where: { $0.id == decoration.id }) }) {
                    Button {
                        selected = nil
                        onDecorate(run.result)
                    } label: {
                        Label("Decorate \(run.result.sceneName)", systemImage: "paintbrush.pointed.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.pink)
                    .padding(.horizontal, 20)
                }
                Spacer()
            }
            .padding(.top, 20)
            .navigationTitle("Completion")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { selected = nil }
                }
            }
            .accessibilityIdentifier("world2.completions.lightbox")
        }
        .presentationDetents([.large])
    }
}
