//
//  World2SceneInventDecorationsView.swift
//  abbies.world.ios
//
//  Developer sheet: invent carved decorations from the exact open scene plate,
//  then send the player to Decorate My Room to place them.
//

import SwiftUI
import UIKit

struct World2SceneInventDecorationsView: View {
    let scene: World2SceneDefinition
    let plateImage: UIImage?
    let onOpenDecorate: () -> Void
    let onClose: () -> Void

    @StateObject private var invent = World2SceneDecorationInventService.shared
    @State private var selectedIDs: Set<String> = []
    @State private var proposals: [World2SceneInventProposal] = []

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 14) {
                Text("From this exact scene")
                    .font(.system(size: 22, weight: .black, design: .rounded))

                HStack(alignment: .top, spacing: 12) {
                    plateThumb
                    VStack(alignment: .leading, spacing: 4) {
                        Text(scene.name)
                            .font(.system(size: 16, weight: .black, design: .rounded))
                        Text(scene.summary.isEmpty ? scene.id : scene.summary)
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(plateImage == nil ? "Plate missing — using scene text cues" : "Carving from this plate’s colors & scale")
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                            .foregroundStyle(plateImage == nil ? .orange : .cyan)
                    }
                }

                Text(invent.statusMessage)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.orange)

                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(proposals) { proposal in
                            Button {
                                if selectedIDs.contains(proposal.id) {
                                    selectedIDs.remove(proposal.id)
                                } else {
                                    selectedIDs.insert(proposal.id)
                                }
                            } label: {
                                HStack(alignment: .top, spacing: 12) {
                                    Image(systemName: selectedIDs.contains(proposal.id)
                                          ? "checkmark.circle.fill"
                                          : "circle")
                                        .font(.title2)
                                        .foregroundStyle(selectedIDs.contains(proposal.id) ? .green : .secondary)

                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(proposal.label)
                                            .font(.system(size: 16, weight: .black, design: .rounded))
                                            .foregroundStyle(.primary)
                                        Text(proposal.reason)
                                            .font(.system(size: 13, weight: .medium, design: .rounded))
                                            .foregroundStyle(.secondary)
                                        Text(proposal.placementLayer == .wall ? "Wall" : "Floor")
                                            .font(.system(size: 11, weight: .bold, design: .rounded))
                                            .foregroundStyle(.cyan)
                                    }
                                    Spacer(minLength: 0)
                                }
                                .padding(12)
                                .background(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .fill(selectedIDs.contains(proposal.id)
                                              ? Color.green.opacity(0.12)
                                              : Color.primary.opacity(0.05))
                                )
                            }
                            .buttonStyle(.plain)
                            .accessibilityIdentifier("world2.sceneInvent.proposal.\(proposal.id)")
                        }
                    }
                }

                HStack(spacing: 10) {
                    Button {
                        let chosen = proposals.filter { selectedIDs.contains($0.id) }
                        _ = invent.invent(proposals: chosen, scene: scene, plate: plateImage)
                    } label: {
                        Label(
                            invent.isBusy ? "Carving…" : "Invent & Carve",
                            systemImage: "wand.and.stars"
                        )
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .disabled(selectedIDs.isEmpty || invent.isBusy)
                    .accessibilityIdentifier("world2.sceneInvent.mint")

                    Button {
                        onOpenDecorate()
                    } label: {
                        Label("Decorate Room", systemImage: "paintbrush.pointed.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .accessibilityIdentifier("world2.sceneInvent.openDecorate")
                }
            }
            .padding(18)
            .navigationTitle("Invent Props")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close", action: onClose)
                }
                ToolbarItem(placement: .primaryAction) {
                    Button("All") {
                        selectedIDs = Set(proposals.map(\.id))
                    }
                }
            }
            .onAppear {
                proposals = invent.proposals(for: scene, plate: plateImage)
                selectedIDs = Set(proposals.prefix(3).map(\.id))
            }
        }
    }

    @ViewBuilder
    private var plateThumb: some View {
        Group {
            if let plateImage {
                Image(uiImage: plateImage)
                    .resizable()
                    .scaledToFill()
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.secondary.opacity(0.2))
                    .overlay {
                        Image(systemName: "photo")
                            .foregroundStyle(.secondary)
                    }
            }
        }
        .frame(width: 96, height: 72)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(.white.opacity(0.35), lineWidth: 1)
        )
        .accessibilityLabel("Reference plate for \(scene.name)")
    }
}
