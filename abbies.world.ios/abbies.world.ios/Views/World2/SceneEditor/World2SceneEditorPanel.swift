//
//  World2SceneEditorPanel.swift
//  abbies.world.ios
//
//  The scene editor, formerly the layout editor.
//
//  Two layers, one live at a time, which is the pattern RTS and ship-builder
//  editors settled on: you are either editing the pads or the things standing on
//  them, never both, so a single drag is never ambiguous.
//
//  Developer mode only. Nothing here is reachable by a player.
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
    let aspectRatio: Double
    let onDone: () -> Void
    var onOpenPlanningDept: (() -> Void)? = nil

    @State private var hardpointNameDraft = ""

    private var scene: World2SceneDefinition { store.scene(sceneID) }

    private var selectedInstance: World2POIInstance? {
        selectedInstanceID.flatMap { scene.instance($0) }
    }

    private var selectedHardpoint: World2SceneHardpoint? {
        selectedHardpointID.flatMap { scene.hardpoint($0) }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            header
            layerPicker

            switch layer {
            case .pois:
                poiLayerControls
            case .hardpoints:
                hardpointLayerControls
            case .tunnels:
                tunnelsLayerControls
            }

            validationRow
            footer
        }
        .padding(16)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.sceneEditor")
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 12) {
            Label("SCENE EDITOR", systemImage: "hammer.fill")
                .font(.system(size: 15, weight: .black, design: .rounded))
                .foregroundStyle(.orange)

            Text(scene.name)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.secondary)

            Text(
                "\(scene.poiInstances.count) placed · \(scene.openHardpoints.count) pads open"
            )
            .font(.system(size: 12, weight: .semibold, design: .rounded))
            .foregroundStyle(.secondary)
            .accessibilityIdentifier("world2.sceneEditor.counts")

            Spacer()

            Text(store.saveMessage)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(store.hasUnsavedChanges ? .orange : .green)
                .accessibilityIdentifier("world2.sceneEditor.saveStatus")
        }
    }

    private var layerPicker: some View {
        HStack(spacing: 12) {
            Picker("Edit layer", selection: $layer) {
                ForEach(World2SceneEditorLayer.allCases) { option in
                    Label(option.title, systemImage: option.symbolName)
                        .tag(option)
                }
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: 260)
            .accessibilityIdentifier("world2.sceneEditor.layerPicker")

            Text(layer.instruction)
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            Spacer(minLength: 0)
        }
    }

    // MARK: - Places layer

    private var poiLayerControls: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                ForEach(scene.instancesInDrawOrder) { instance in
                    Button(instanceLabel(instance)) {
                        selectedInstanceID = instance.id
                    }
                    .buttonStyle(.bordered)
                    .tint(selectedInstanceID == instance.id ? .orange : .gray)
                    .accessibilityIdentifier("world2.sceneEditor.place.\(instance.id)")
                }

                addPlaceMenu

                Spacer(minLength: 0)

                Toggle("Snapping", isOn: $snappingEnabled)
                    .toggleStyle(.switch)
                    .fixedSize()
                    .accessibilityIdentifier("world2.sceneEditor.snapToggle")
            }

            if let instance = selectedInstance {
                instanceTransformRow(instance)
                instanceActionRow(instance)
            } else {
                Text("Choose a place, or add one.")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
    }

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
                    Label(
                        "\(archetype.name) (\(archetype.sizeClass.displayName))",
                        systemImage: archetype.icon
                    )
                }
            }
        } label: {
            Label("Add Place", systemImage: "plus.circle.fill")
        }
        .buttonStyle(.bordered)
        .accessibilityIdentifier("world2.sceneEditor.addPlace")
    }

    private func instanceLabel(_ instance: World2POIInstance) -> String {
        let name = World2POIRegistry.archetype(instance.archetypeID)?.name
            ?? instance.archetypeID
        return instance.isSnapped ? name : "\(name) ⚓︎"
    }

    private func instanceTransformRow(_ instance: World2POIInstance) -> some View {
        HStack(spacing: 14) {
            Text(instance.transform.debugSummary)
                .font(.system(.footnote, design: .monospaced, weight: .bold))
                .accessibilityIdentifier("world2.sceneEditor.place.transform")

            Text(
                instance.hardpointID.map { "on \($0)" } ?? "freehand"
            )
            .font(.system(size: 12, weight: .black, design: .rounded))
            .foregroundStyle(instance.isSnapped ? .green : .orange)
            .accessibilityIdentifier("world2.sceneEditor.place.pinState")

            Text("Scale")
                .font(.caption.bold())
            Slider(
                value: Binding(
                    get: { store.scene(sceneID).instance(instance.id)?.transform.scale ?? 1 },
                    set: { store.setScale($0, instanceID: instance.id, in: sceneID) }
                ),
                in: World2POITransform.scaleRange
            )
            .frame(maxWidth: 140)
            .accessibilityIdentifier("world2.sceneEditor.place.scale")

            Text("Rotate")
                .font(.caption.bold())
            Slider(
                value: Binding(
                    get: {
                        store.scene(sceneID)
                            .instance(instance.id)?
                            .transform
                            .rotationDegrees ?? 0
                    },
                    set: { store.setRotation($0, instanceID: instance.id, in: sceneID) }
                ),
                in: World2POITransform.rotationRange
            )
            .frame(maxWidth: 140)
            .accessibilityIdentifier("world2.sceneEditor.place.rotation")
        }
    }

    private func instanceActionRow(_ instance: World2POIInstance) -> some View {
        HStack(spacing: 10) {
            if instance.isSnapped {
                Button("Unsnap", systemImage: "pin.slash.fill") {
                    store.unsnapInstance(instance.id, in: sceneID)
                }
                .buttonStyle(.bordered)
                .accessibilityIdentifier("world2.sceneEditor.place.unsnap")
            } else {
                Button("Snap to Nearest Pad", systemImage: "pin.fill") {
                    let pad = store.snapInstanceToNearestHardpoint(
                        instance.id,
                        in: sceneID,
                        aspectRatio: aspectRatio
                    )
                    if pad == nil {
                        store.objectWillChange.send()
                    }
                }
                .buttonStyle(.bordered)
                .accessibilityIdentifier("world2.sceneEditor.place.snap")
            }

            Menu {
                ForEach(World2POIRegistry.placeableInEditor) { archetype in
                    Button(archetype.name) {
                        store.replaceArchetype(
                            of: instance.id,
                            in: sceneID,
                            with: archetype.id
                        )
                    }
                }
            } label: {
                Label("Replace With", systemImage: "arrow.triangle.2.circlepath")
            }
            .buttonStyle(.bordered)
            .accessibilityIdentifier("world2.sceneEditor.place.replace")

            Button("Front", systemImage: "square.3.layers.3d.top.filled") {
                store.bringInstanceToFront(instance.id, in: sceneID)
            }
            .buttonStyle(.bordered)

            Button("Remove", systemImage: "trash") {
                if store.removeInstance(instance.id, in: sceneID) {
                    selectedInstanceID = nil
                }
            }
            .buttonStyle(.bordered)
            .tint(.red)
            .disabled(instance.isAuthored)
            .accessibilityIdentifier("world2.sceneEditor.place.remove")

            if instance.isAuthored {
                Text("Shipped place — move or swap it, but it cannot be deleted.")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)
        }
    }

    // MARK: - Tunnel layer (overland N/S/E/W connectors)

    private var tunnelsLayerControls: some View {
        let connectors = worldGraph.connectors(from: sceneID)
        return VStack(alignment: .leading, spacing: 10) {
            Text("Scene tunnels — expansion doors on the world graph, not POI pads.")
                .font(.system(size: 13, weight: .semibold, design: .rounded))
                .foregroundStyle(.secondary)

            HStack(spacing: 8) {
                ForEach(connectors) { connector in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(connector.direction.displayName)
                            .font(.system(size: 12, weight: .black, design: .rounded))
                        Text(
                            connector.isOpen
                                ? "Open"
                                : (worldGraph.snapshot(currentSceneID: sceneID)
                                    .node(for: connector.toSceneID ?? "")?
                                    .name ?? connector.toSceneID ?? "?")
                        )
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundStyle(connector.isOpen ? .yellow : .cyan)

                        if connector.isLocked {
                            Text("Locked")
                                .font(.caption2.bold())
                                .foregroundStyle(.orange)
                        }

                        HStack(spacing: 6) {
                            Button(connector.isLocked ? "Unlock" : "Lock") {
                                worldGraph.setConnectorLocked(
                                    from: sceneID,
                                    direction: connector.direction,
                                    locked: !connector.isLocked
                                )
                            }
                            .buttonStyle(.bordered)
                            .controlSize(.small)

                            if !connector.isOpen {
                                Button("Clear") {
                                    _ = worldGraph.clearConnector(
                                        from: sceneID,
                                        direction: connector.direction
                                    )
                                }
                                .buttonStyle(.bordered)
                                .tint(.red)
                                .controlSize(.small)
                                .disabled(connector.isLocked)
                            }
                        }
                    }
                    .padding(8)
                    .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 10))
                    .accessibilityIdentifier(
                        "world2.sceneEditor.tunnel.\(connector.direction.rawValue)"
                    )
                }
                Spacer(minLength: 0)
            }

            Button("Open Planning Department") {
                onOpenPlanningDept?()
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
            .accessibilityIdentifier("world2.sceneEditor.openPlanningDept")
        }
    }

    // MARK: - Hardpoint layer

    private var hardpointLayerControls: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                ForEach(scene.hardpoints) { hardpoint in
                    Button(hardpointLabel(hardpoint)) {
                        selectedHardpointID = hardpoint.id
                        hardpointNameDraft = hardpoint.name
                    }
                    .buttonStyle(.bordered)
                    .tint(selectedHardpointID == hardpoint.id ? .cyan : .gray)
                    .accessibilityIdentifier("world2.sceneEditor.pad.\(hardpoint.id)")
                }

                Button("Add Pad", systemImage: "plus.viewfinder") {
                    let added = store.addHardpoint(in: sceneID, at: .center)
                    selectedHardpointID = added.id
                    hardpointNameDraft = added.name
                }
                .buttonStyle(.bordered)
                .accessibilityIdentifier("world2.sceneEditor.addPad")

                Spacer(minLength: 0)
            }

            if let hardpoint = selectedHardpoint {
                hardpointDetailRow(hardpoint)
                hardpointSizeRow(hardpoint)
            } else {
                Text("Choose a pad, or add one and drag it onto the painting.")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func hardpointLabel(_ hardpoint: World2SceneHardpoint) -> String {
        let occupied = scene.occupancy[hardpoint.id] != nil
        let lock = hardpoint.isLocked ? " 🔒" : ""
        return "\(hardpoint.name)\(occupied ? "" : " ○")\(lock)"
    }

    private func hardpointDetailRow(_ hardpoint: World2SceneHardpoint) -> some View {
        HStack(spacing: 14) {
            TextField("Pad name", text: $hardpointNameDraft)
                .textFieldStyle(.roundedBorder)
                .frame(maxWidth: 190)
                .onSubmit {
                    store.renameHardpoint(
                        hardpoint.id,
                        in: sceneID,
                        to: hardpointNameDraft
                    )
                }
                .accessibilityIdentifier("world2.sceneEditor.pad.name")

            Text(
                String(
                    format: "x %.3f  y %.3f  pull %.3f",
                    hardpoint.position.x,
                    hardpoint.position.y,
                    hardpoint.snapRadius
                )
            )
            .font(.system(.footnote, design: .monospaced, weight: .bold))
            .accessibilityIdentifier("world2.sceneEditor.pad.values")

            Text("Pull")
                .font(.caption.bold())
            Slider(
                value: Binding(
                    get: { store.scene(sceneID).hardpoint(hardpoint.id)?.snapRadius ?? 0.085 },
                    set: { store.setSnapRadius($0, hardpointID: hardpoint.id, in: sceneID) }
                ),
                in: 0.02...0.30
            )
            .frame(maxWidth: 150)
            .accessibilityIdentifier("world2.sceneEditor.pad.pull")

            Toggle("Locked", isOn: lockedBinding(hardpoint))
                .toggleStyle(.switch)
                .fixedSize()
                .accessibilityIdentifier("world2.sceneEditor.pad.locked")

            Spacer(minLength: 0)
        }
    }

    private func lockedBinding(_ hardpoint: World2SceneHardpoint) -> Binding<Bool> {
        Binding(
            get: { store.scene(sceneID).hardpoint(hardpoint.id)?.isLocked ?? false },
            set: { store.setHardpointLocked($0, hardpointID: hardpoint.id, in: sceneID) }
        )
    }

    private func hardpointSizeRow(_ hardpoint: World2SceneHardpoint) -> some View {
        HStack(spacing: 10) {
            Text("ACCEPTS")
                .font(.system(size: 11, weight: .black, design: .rounded))
                .foregroundStyle(.secondary)

            ForEach(World2POISizeClass.allCases, id: \.self) { sizeClass in
                let isOn = hardpoint.accepts(sizeClass)
                Button(sizeClass.displayName) {
                    var updated = hardpoint.acceptedSizeClasses
                    if isOn {
                        updated.remove(sizeClass)
                    } else {
                        updated.insert(sizeClass)
                    }
                    store.setAcceptedSizeClasses(
                        updated,
                        hardpointID: hardpoint.id,
                        in: sceneID
                    )
                }
                .buttonStyle(.bordered)
                .tint(isOn ? .cyan : .gray)
                .accessibilityIdentifier(
                    "world2.sceneEditor.pad.size.\(sizeClass.rawValue)"
                )
            }

            Button("Delete Pad", systemImage: "trash") {
                if store.removeHardpoint(hardpoint.id, in: sceneID) {
                    selectedHardpointID = nil
                }
            }
            .buttonStyle(.bordered)
            .tint(.red)
            .disabled(hardpoint.isLocked)
            .accessibilityIdentifier("world2.sceneEditor.pad.delete")

            if hardpoint.isLocked {
                Text("Locked pads hold shipped art in place. Unlock to move or delete.")
                    .font(.system(size: 11, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)
        }
    }

    // MARK: - Validation and footer

    private var validationRow: some View {
        let issues = store.validationIssues(for: sceneID)
        return Group {
            if issues.isEmpty {
                Label("Scene validates against the POI registry", systemImage: "checkmark.seal.fill")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.green)
                    .accessibilityIdentifier("world2.sceneEditor.validation.ok")
            } else {
                VStack(alignment: .leading, spacing: 3) {
                    ForEach(issues.map(\.description), id: \.self) { detail in
                        Label(detail, systemImage: "exclamationmark.triangle.fill")
                            .font(.system(size: 11, weight: .bold, design: .monospaced))
                            .foregroundStyle(.red)
                    }
                }
                .accessibilityIdentifier("world2.sceneEditor.validation.issues")
            }
        }
    }

    private var footer: some View {
        HStack(spacing: 10) {
            Button("Reset Scene", systemImage: "arrow.counterclockwise") {
                store.resetScene(sceneID)
                selectedInstanceID = nil
                selectedHardpointID = nil
            }
            .buttonStyle(.bordered)
            .disabled(!store.isOverridden(sceneID))
            .accessibilityIdentifier("world2.sceneEditor.reset")

            Button("Discard Unsaved", systemImage: "trash.slash") {
                store.discardChanges()
            }
            .buttonStyle(.bordered)
            .disabled(!store.hasUnsavedChanges)

            Button("Save Locally", systemImage: "internaldrive.fill") {
                store.save()
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
            .disabled(!store.hasUnsavedChanges)
            .accessibilityIdentifier("world2.sceneEditor.save")

            ShareLink(
                item: store.exportJSON(sceneID: sceneID),
                subject: Text("World 2 Scene Graph"),
                message: Text("Bake this into World2SceneCatalog for reinstall-safe defaults.")
            ) {
                Label("Export JSON", systemImage: "square.and.arrow.up")
            }
            .buttonStyle(.bordered)
            .accessibilityIdentifier("world2.sceneEditor.export")

            Button("Log Rigging", systemImage: "text.alignleft") {
                World2Diagnostics.report(
                    "scene_rigging",
                    store.riggingReport(sceneID: sceneID)
                )
            }
            .buttonStyle(.bordered)
            .accessibilityIdentifier("world2.sceneEditor.logRigging")

            Spacer(minLength: 0)

            Button("Done", action: onDone)
                .buttonStyle(.bordered)
                .accessibilityIdentifier("world2.sceneEditor.done")
        }
    }
}
