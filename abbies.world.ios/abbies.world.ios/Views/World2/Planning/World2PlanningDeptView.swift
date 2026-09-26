//
//  World2PlanningDeptView.swift
//  abbies.world.ios
//
//  Planning Department — see the known-world graph, inspect open N/S/E/W
//  expansion tunnels, and (in developer mode) rewire connectors.
//

import SwiftUI

struct World2PlanningDeptView: View {
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void

    @ObservedObject private var developerSession = World2DeveloperSession.shared
    @State private var selectedOpen: World2SceneConnector?
    @State private var attachCandidate: String = ""

    private var snapshot: World2WorldGraphSnapshot {
        viewModel.worldGraphSnapshot
    }

    private var focusSceneID: String {
        viewModel.playSceneID
    }

    var body: some View {
        ZStack {
            constructionPlate

            VStack(spacing: 14) {
                header
                connectorLegend
                if developerSession.isEnabled {
                    developerPanel
                } else {
                    playerHint
                }
                Spacer(minLength: 0)
            }
            .padding(.top, 16)
            .padding(.bottom, 12)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.planningDept")
        .sheet(item: $selectedOpen) { connector in
            expansionSheet(connector)
        }
        .world2InteriorActions(
            exitAccessibilityID: "world2.planningDept.exit",
            onExit: onExit
        )
    }

    /// Unqualified room. Server art wins; otherwise the shared construction plate.
    private var constructionPlate: some View {
        let image = AssetBootstrapService.shared.image(
            for: World2POIRegistry.planningDept.exteriorAsset
        ) ?? UIImage(named: "under_construction")
        return ZStack {
            Color.black
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
                    .accessibilityLabel("Planning Department is under construction")
                    .accessibilityIdentifier("world2.planningDept.plate")
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
        .ignoresSafeArea()
    }

    private var header: some View {
        HStack {
            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("Planning Department")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                Text("Known world · expansion tunnels")
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.7))
            }
            .foregroundStyle(.white)
        }
        .padding(.horizontal, 18)
    }

    private var connectorLegend: some View {
        let open = snapshot.openConnectors(from: focusSceneID)
        let taken = snapshot.connectors(from: focusSceneID).filter { !$0.isOpen }
        return VStack(alignment: .leading, spacing: 8) {
            Text("Here: \(snapshot.node(for: focusSceneID)?.name ?? "This land")")
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(.white)

            HStack(spacing: 10) {
                ForEach(taken) { connector in
                    capsule(
                        "\(connector.direction.shortLabel) → \(shortName(connector.toSceneID))",
                        color: .cyan
                    )
                }
                ForEach(open) { connector in
                    Button {
                        selectedOpen = connector
                    } label: {
                        capsule(
                            "\(connector.direction.shortLabel) open",
                            color: .yellow
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.horizontal, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityIdentifier("world2.planningDept.legend")
    }

    private var playerHint: some View {
        Text("This room is still being built. Yellow names are open doors. Cyan names are paths you already know.")
        .font(.system(size: 14, weight: .semibold, design: .rounded))
        .foregroundStyle(.white.opacity(0.82))
        .padding(.horizontal, 18)
    }

    private var developerPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Developer tunnels", systemImage: "wrench.and.screwdriver.fill")
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(.orange)

            Text("Unlock a shipped path, clear a tunnel, or reset the graph to the catalog.")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack(spacing: 10) {
                Button("Reset Graph") {
                    viewModel.worldGraph.resetToShippedGraph()
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .accessibilityIdentifier("world2.planningDept.resetGraph")
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
        .padding(.horizontal, 18)
    }

    private func expansionSheet(_ connector: World2SceneConnector) -> some View {
        NavigationStack {
            Form {
                Section("Expansion tunnel") {
                    Text("From \(shortName(connector.fromSceneID))")
                    Text("Direction \(connector.direction.displayName)")
                    Text(connector.isOpen ? "Open — not taken" : "Taken")
                }

                if developerSession.isEnabled {
                    Section("Attach known scene") {
                        Picker("Destination", selection: $attachCandidate) {
                            Text("Choose…").tag("")
                            ForEach(attachableScenes(excluding: connector.fromSceneID), id: \.self) { sceneID in
                                Text(shortName(sceneID)).tag(sceneID)
                            }
                        }
                        Button("Connect") {
                            guard !attachCandidate.isEmpty else { return }
                            _ = viewModel.worldGraph.connect(
                                from: connector.fromSceneID,
                                direction: connector.direction,
                                to: attachCandidate
                            )
                            selectedOpen = nil
                        }
                        .disabled(attachCandidate.isEmpty || connector.isLocked)
                        .accessibilityIdentifier("world2.planningDept.connect")

                        if !connector.isOpen {
                            Button("Clear tunnel", role: .destructive) {
                                _ = viewModel.worldGraph.clearConnector(
                                    from: connector.fromSceneID,
                                    direction: connector.direction
                                )
                                selectedOpen = nil
                            }
                            .disabled(connector.isLocked)

                            Toggle(
                                "Locked (shipped)",
                                isOn: Binding(
                                    get: { connector.isLocked },
                                    set: {
                                        viewModel.worldGraph.setConnectorLocked(
                                            from: connector.fromSceneID,
                                            direction: connector.direction,
                                            locked: $0
                                        )
                                        selectedOpen = viewModel.worldGraph
                                            .connectors(from: connector.fromSceneID)
                                            .first { $0.direction == connector.direction }
                                    }
                                )
                            )
                        }
                    }
                } else {
                    Section {
                        Text(
                            "A grown-up in Scene Editor Developer Mode can attach a new land here. For now this door is waiting."
                        )
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle(connector.direction.displayName)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { selectedOpen = nil }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func attachableScenes(excluding: String) -> [String] {
        snapshot.nodes.map(\.sceneID).filter { $0 != excluding }
    }

    private func shortName(_ sceneID: String?) -> String {
        guard let sceneID else { return "?" }
        return snapshot.node(for: sceneID)?.name ?? sceneID
    }

    private func capsule(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.system(size: 12, weight: .bold, design: .rounded))
            .foregroundStyle(.black)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(color.opacity(0.9), in: Capsule())
    }
}
