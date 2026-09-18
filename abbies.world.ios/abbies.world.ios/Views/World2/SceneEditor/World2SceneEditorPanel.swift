//
//  World2SceneEditorPanel.swift
//  abbies.world.ios
//
//  Minimal translucent scene editor chrome. Finger gestures on the map do the
//  real work — this panel only switches layers and exposes rare tools.
//

import Combine
import SwiftUI

struct World2SceneEditorPanel: View {
    let sceneID: String
    @ObservedObject var store: World2SceneGraphStore
    @ObservedObject var worldGraph: World2WorldGraphStore
    @Binding var layer: World2SceneEditorLayer
    @Binding var selectedInstanceID: String?
    @Binding var selectedHardpointID: String?
    @Binding var snappingEnabled: Bool
    @Binding var isMinimized: Bool
    let aspectRatio: Double
    let onDone: () -> Void
    var onOpenPlanningDept: (() -> Void)? = nil
    var onInventDecorations: (() -> Void)? = nil
    var onDecorateTreehouse: (() -> Void)? = nil

    private var scene: World2SceneDefinition { store.scene(sceneID) }

    private var selectedInstance: World2POIInstance? {
        selectedInstanceID.flatMap { scene.instance($0) }
    }

    private var selectedHardpoint: World2SceneHardpoint? {
        selectedHardpointID.flatMap { scene.hardpoint($0) }
    }

    var body: some View {
        Group {
            if isMinimized {
                minimizedChrome
            } else {
                expandedChrome
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.sceneEditor")
    }

    // MARK: - Minimized

    private var minimizedChrome: some View {
        HStack(spacing: 10) {
            Image(systemName: layer.symbolName)
                .font(.system(size: 13, weight: .black))
            Text(layer.title)
                .font(.system(size: 13, weight: .black, design: .rounded))
            Text("· fingers edit")
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)

            if store.hasUnsavedChanges {
                Circle()
                    .fill(Color.orange)
                    .frame(width: 8, height: 8)
                    .accessibilityLabel("Unsaved changes")
            }

            Spacer(minLength: 8)

            Button {
                withAnimation(.easeOut(duration: 0.18)) {
                    isMinimized = false
                }
            } label: {
                Label("Expand", systemImage: "chevron.up")
                    .labelStyle(.iconOnly)
                    .font(.system(size: 14, weight: .bold))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.sceneEditor.expand")

            if onInventDecorations != nil {
                Button {
                    onInventDecorations?()
                } label: {
                    Image(systemName: "wand.and.stars")
                        .font(.system(size: 14, weight: .bold))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Invent decorations for this scene")
                .accessibilityIdentifier("world2.sceneEditor.invent")
            }

            if onDecorateTreehouse != nil {
                Button {
                    onDecorateTreehouse?()
                } label: {
                    Image(systemName: "paintbrush.pointed.fill")
                        .font(.system(size: 14, weight: .bold))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Decorate treehouse")
                .accessibilityIdentifier("world2.sceneEditor.decorate")
            }

            toolsMenu
        }
        .foregroundStyle(.primary)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().stroke(.white.opacity(0.28), lineWidth: 1))
        .shadow(color: .black.opacity(0.22), radius: 10, y: 4)
    }

    // MARK: - Expanded (still tiny)

    private var expandedChrome: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Label("Edit", systemImage: "hammer.fill")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(.orange)

                Picker("Layer", selection: $layer) {
                    ForEach(World2SceneEditorLayer.allCases) { option in
                        Text(option.title).tag(option)
                    }
                }
                .pickerStyle(.segmented)
                .frame(maxWidth: 280)
                .accessibilityIdentifier("world2.sceneEditor.layerPicker")

                Spacer(minLength: 0)

                if store.hasUnsavedChanges {
                    Text("unsaved")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(.orange)
                        .accessibilityIdentifier("world2.sceneEditor.saveStatus")
                }

                Button {
                    withAnimation(.easeOut(duration: 0.18)) {
                        isMinimized = true
                    }
                } label: {
                    Label("Minimize", systemImage: "chevron.down")
                        .labelStyle(.iconOnly)
                        .font(.system(size: 14, weight: .bold))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("world2.sceneEditor.minimize")

                toolsMenu

                Button("Done", action: onDone)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .accessibilityIdentifier("world2.sceneEditor.done")
            }

            switch layer {
            case .pois:
                placesStrip
            case .hardpoints:
                hardpointsStrip
            case .tunnels:
                tunnelsStrip
            }

            if !store.validationIssues(for: sceneID).isEmpty {
                validationStrip
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(.orange.opacity(0.45), lineWidth: 1.5)
        )
        .shadow(color: .black.opacity(0.2), radius: 12, y: 5)
    }

    // MARK: - Layer strips (finger-first)

    private var placesStrip: some View {
        HStack(spacing: 8) {
            Text("Drag · pinch · twist on the map")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
                .lineLimit(1)

            Spacer(minLength: 0)

            Toggle("Snap", isOn: $snappingEnabled)
                .toggleStyle(.switch)
                .labelsHidden()
                .accessibilityLabel("Snapping")
                .accessibilityIdentifier("world2.sceneEditor.snapToggle")

            addPlaceMenu

            if let instance = selectedInstance {
                if instance.isSnapped {
                    Button("Unsnap", systemImage: "pin.slash") {
                        store.unsnapInstance(instance.id, in: sceneID)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                    .accessibilityIdentifier("world2.sceneEditor.place.unsnap")
                }

                Button("Remove", systemImage: "trash") {
                    if store.removeInstance(instance.id, in: sceneID) {
                        selectedInstanceID = nil
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .tint(.red)
                .disabled(instance.isAuthored)
                .accessibilityIdentifier("world2.sceneEditor.place.remove")
            }
        }
    }

    private var hardpointsStrip: some View {
        HStack(spacing: 8) {
            Text("Tap map to add · drag pads")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)
                .lineLimit(1)

            Spacer(minLength: 0)

            Button("Add Pad", systemImage: "plus.viewfinder") {
                let added = store.addHardpoint(in: sceneID, at: .center)
                selectedHardpointID = added.id
            }
            .buttonStyle(.bordered)
            .controlSize(.small)
            .accessibilityIdentifier("world2.sceneEditor.addPad")

            if let hardpoint = selectedHardpoint {
                Toggle("Lock", isOn: lockedBinding(hardpoint))
                    .toggleStyle(.switch)
                    .labelsHidden()
                    .accessibilityLabel("Locked")
                    .accessibilityIdentifier("world2.sceneEditor.pad.locked")

                Button("Delete", systemImage: "trash") {
                    if store.removeHardpoint(hardpoint.id, in: sceneID) {
                        selectedHardpointID = nil
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .tint(.red)
                .disabled(hardpoint.isLocked)
                .accessibilityIdentifier("world2.sceneEditor.pad.delete")
            }
        }
    }

    private var tunnelsStrip: some View {
        let connectors = worldGraph.connectors(from: sceneID)
        return HStack(spacing: 6) {
            ForEach(connectors) { connector in
                Menu {
                    Button(connector.isLocked ? "Unlock" : "Lock") {
                        worldGraph.setConnectorLocked(
                            from: sceneID,
                            direction: connector.direction,
                            locked: !connector.isLocked
                        )
                    }
                    if !connector.isOpen {
                        Button("Clear", role: .destructive) {
                            _ = worldGraph.clearConnector(
                                from: sceneID,
                                direction: connector.direction
                            )
                        }
                        .disabled(connector.isLocked)
                    }
                    if onOpenPlanningDept != nil {
                        Button("Planning Dept") {
                            onOpenPlanningDept?()
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Text(connector.direction.shortLabel)
                            .font(.system(size: 11, weight: .black, design: .rounded))
                        Circle()
                            .fill(connector.isOpen ? Color.yellow : Color.cyan)
                            .frame(width: 7, height: 7)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 6)
                    .background(.white.opacity(0.12), in: Capsule())
                }
                .accessibilityIdentifier(
                    "world2.sceneEditor.tunnel.\(connector.direction.rawValue)"
                )
            }

            Spacer(minLength: 0)

            if onOpenPlanningDept != nil {
                Button("Plan", systemImage: "map") {
                    onOpenPlanningDept?()
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .accessibilityIdentifier("world2.sceneEditor.openPlanningDept")
            }
        }
    }

    private var validationStrip: some View {
        let issues = store.validationIssues(for: sceneID)
        return VStack(alignment: .leading, spacing: 2) {
            ForEach(issues.prefix(2).map(\.description), id: \.self) { detail in
                Label(detail, systemImage: "exclamationmark.triangle.fill")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(.red)
                    .lineLimit(1)
            }
        }
        .accessibilityIdentifier("world2.sceneEditor.validation.issues")
    }

    // MARK: - Shared controls

    private var addPlaceMenu: some View {
        Menu {
            ForEach(World2POIRegistry.placeableInEditor) { archetype in
                Button {
                    let added = store.addInstance(
                        archetypeID: archetype.id,
                        in: sceneID,
                        aspectRatio: aspectRatio
                    )
                    selectedInstanceID = added?.id
                } label: {
                    Label(archetype.name, systemImage: archetype.icon)
                }
            }
        } label: {
            Label("Add", systemImage: "plus")
                .font(.system(size: 12, weight: .bold, design: .rounded))
        }
        .buttonStyle(.bordered)
        .controlSize(.small)
        .accessibilityIdentifier("world2.sceneEditor.addPlace")
    }

    private var toolsMenu: some View {
        Menu {
            if onInventDecorations != nil {
                Button("Invent Props for Scene", systemImage: "wand.and.stars") {
                    onInventDecorations?()
                }
            }
            if onDecorateTreehouse != nil {
                Button("Decorate Treehouse", systemImage: "paintbrush.pointed.fill") {
                    onDecorateTreehouse?()
                }
            }
            Button("Save Locally", systemImage: "internaldrive.fill") {
                store.save()
            }
            .disabled(!store.hasUnsavedChanges)
            .accessibilityIdentifier("world2.sceneEditor.save")

            Button("Discard Unsaved", systemImage: "trash.slash") {
                store.discardChanges()
            }
            .disabled(!store.hasUnsavedChanges)

            Button("Reset Scene", systemImage: "arrow.counterclockwise") {
                store.resetScene(sceneID)
                selectedInstanceID = nil
                selectedHardpointID = nil
            }
            .disabled(!store.isOverridden(sceneID))
            .accessibilityIdentifier("world2.sceneEditor.reset")

            ShareLink(
                item: store.exportJSON(sceneID: sceneID),
                subject: Text("World 2 Scene Graph"),
                message: Text("Bake this into World2SceneCatalog for reinstall-safe defaults.")
            ) {
                Label("Export JSON", systemImage: "square.and.arrow.up")
            }

            Button("Log Rigging", systemImage: "text.alignleft") {
                World2Diagnostics.report(
                    "scene_rigging",
                    store.riggingReport(sceneID: sceneID)
                )
            }
            .accessibilityIdentifier("world2.sceneEditor.logRigging")

            if let selectedInstance, selectedInstance.isSnapped == false {
                Button("Snap to Nearest Pad", systemImage: "pin.fill") {
                    _ = store.snapInstanceToNearestHardpoint(
                        selectedInstance.id,
                        in: sceneID,
                        aspectRatio: aspectRatio
                    )
                }
                .accessibilityIdentifier("world2.sceneEditor.place.snap")
            }

            if let selectedInstance {
                Menu("Replace With") {
                    ForEach(World2POIRegistry.placeableInEditor) { archetype in
                        Button(archetype.name) {
                            store.replaceArchetype(
                                of: selectedInstance.id,
                                in: sceneID,
                                with: archetype.id
                            )
                        }
                    }
                }
            }
        } label: {
            Image(systemName: "ellipsis.circle")
                .font(.system(size: 16, weight: .semibold))
        }
        .accessibilityIdentifier("world2.sceneEditor.tools")
    }

    private func lockedBinding(_ hardpoint: World2SceneHardpoint) -> Binding<Bool> {
        Binding(
            get: { store.scene(sceneID).hardpoint(hardpoint.id)?.isLocked ?? false },
            set: { store.setHardpointLocked($0, hardpointID: hardpoint.id, in: sceneID) }
        )
    }
}
