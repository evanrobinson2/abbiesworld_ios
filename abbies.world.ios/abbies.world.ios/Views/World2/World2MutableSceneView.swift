import SwiftUI

struct World2MutableSceneView: View {
    @ObservedObject var viewModel: World2ViewModel
    @ObservedObject private var developerSession = World2DeveloperSession.shared

    @State private var isDrawerOpen = false
    @State private var selectedInventoryItemID: String?
    @State private var isAuthoringPlaceholder = false

    private var developerMode: Bool { developerSession.isEnabled }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                sceneGround
                    .contentShape(Rectangle())
                    .gesture(
                        SpatialTapGesture()
                            .onEnded { tap in
                                placeFreeformItem(
                                    at: tap.location,
                                    in: geometry.size
                                )
                            }
                    )

                ForEach(viewModel.currentScenePlaces) { instance in
                    World2MutableScenePlaceMarker(instance: instance) {
                        viewModel.enterPlacedPlace(instance.id)
                    }
                    .position(
                        x: geometry.size.width * instance.x,
                        y: geometry.size.height * instance.y
                    )
                    .zIndex(10)
                }

                ForEach(viewModel.currentSceneExits) { exit in
                    World2PlaceholderExitMarker(exit: exit) {
                        viewModel.traverseSceneExit(exit.id)
                    }
                    .position(
                        x: geometry.size.width * exit.x,
                        y: geometry.size.height * exit.y
                    )
                    .zIndex(12)
                }

                if selectedInventoryItemID != nil,
                   !viewModel.currentMutableScene.hardpoints.isEmpty {
                    ForEach(viewModel.availableSceneHardpoints) { hardpoint in
                        World2PlaceDropTarget(hardpoint: hardpoint) {
                            placeSelectedItem(on: hardpoint)
                        }
                        .position(
                            x: geometry.size.width * hardpoint.x,
                            y: geometry.size.height * hardpoint.y
                        )
                        .zIndex(30)
                    }
                }

                header
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                    .padding(.horizontal, 20)
                    .padding(.top, 14)
                    .zIndex(50)

                if viewModel.currentMutableScene.isMutableByPlayer {
                    drawerLayer
                        .frame(
                            maxWidth: .infinity,
                            maxHeight: .infinity,
                            alignment: .trailing
                        )
                        .padding(.trailing, 18)
                        .zIndex(60)
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.mutableScene")
        .sheet(isPresented: $isAuthoringPlaceholder) {
            World2PlaceholderSceneForm { name, summary, exitName, usesHardpoints in
                guard viewModel.birthPlaceholderScene(
                    name: name,
                    summary: summary,
                    exitName: exitName,
                    usesHardpoints: usesHardpoints
                ) != nil else {
                    return
                }
                isAuthoringPlaceholder = false
            }
        }
        .onAppear {
            logSceneState()
        }
        .onChange(of: viewModel.currentMutableSceneID) {
            selectedInventoryItemID = nil
            isDrawerOpen = false
            logSceneState()
        }
        .onChange(of: viewModel.placeInventory) {
            guard let selectedInventoryItemID,
                  viewModel.placeInventory.contains(
                    where: { $0.id == selectedInventoryItemID }
                  ) else {
                self.selectedInventoryItemID = nil
                return
            }
        }
    }

    private var sceneGround: some View {
        ZStack {
            LinearGradient(
                colors: viewModel.currentMutableScene.isDeveloperPlaceholder
                    ? [.gray.opacity(0.72), .indigo.opacity(0.58)]
                    : [
                        Color(red: 0.82, green: 0.95, blue: 1.00),
                        Color(red: 0.91, green: 0.98, blue: 0.91),
                    ],
                startPoint: .top,
                endPoint: .bottom
            )

            Canvas { context, size in
                var path = Path()
                let spacing: CGFloat = 48
                stride(from: CGFloat.zero, through: size.width, by: spacing).forEach { x in
                    path.move(to: CGPoint(x: x, y: 0))
                    path.addLine(to: CGPoint(x: x, y: size.height))
                }
                stride(from: CGFloat.zero, through: size.height, by: spacing).forEach { y in
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: size.width, y: y))
                }
                context.stroke(
                    path,
                    with: .color(.white.opacity(0.18)),
                    lineWidth: 1
                )
            }

            if viewModel.currentScenePlaces.isEmpty,
               viewModel.currentSceneExits.isEmpty {
                VStack(spacing: 12) {
                    Image(
                        systemName: viewModel.currentMutableScene.isDeveloperPlaceholder
                            ? "mountain.2.fill"
                            : "square.dashed.inset.filled"
                    )
                    .font(.system(size: 62, weight: .light))
                    Text(
                        viewModel.currentMutableScene.isDeveloperPlaceholder
                            ? "Placeholder scene"
                            : "This scene is waiting for its first place."
                    )
                    .font(.system(size: 22, weight: .black, design: .rounded))
                    Text(emptySceneInstruction)
                        .font(.system(size: 15, weight: .semibold, design: .rounded))
                }
                .foregroundStyle(.white.opacity(0.76))
                .multilineTextAlignment(.center)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
            }

            if selectedInventoryItemID != nil {
                Label(placementInstruction, systemImage: "hand.tap.fill")
                    .font(.system(size: 17, weight: .black, design: .rounded))
                    .foregroundStyle(.indigo)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 11)
                    .background(.white.opacity(0.94), in: Capsule())
                    .shadow(color: .indigo.opacity(0.18), radius: 10, y: 4)
                    .allowsHitTesting(false)
                    .offset(y: -90)
            }
        }
    }

    private var emptySceneInstruction: String {
        if developerMode {
            return "Open the drawer to place a POI or birth a placeholder exit."
        }
        return "Open the drawer to place a POI from your inventory."
    }

    private var placementInstruction: String {
        if viewModel.currentMutableScene.hardpoints.isEmpty {
            return "Tap anywhere on the scene to place"
        }
        if viewModel.availableSceneHardpoints.isEmpty {
            return "All hardpoints are occupied"
        }
        return "Choose a glowing hardpoint"
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 14) {
            Button(action: viewModel.returnFromMutableScene) {
                Label(
                    viewModel.canReturnToPreviousMutableScene ? "Back" : "Home World",
                    systemImage: "arrow.left"
                )
                .font(.system(size: 15, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(.indigo.opacity(0.92), in: Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.mutableScene.back")

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 7) {
                    Text(viewModel.currentMutableScene.name)
                        .font(.system(size: 27, weight: .black, design: .rounded))
                    if viewModel.currentMutableScene.isDeveloperPlaceholder {
                        Text("PLACEHOLDER")
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 4)
                            .background(.orange, in: Capsule())
                    }
                }
                Text(viewModel.currentMutableScene.summary)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 9)
            .background(.white.opacity(0.90), in: RoundedRectangle(cornerRadius: 18))

            Spacer()

            Text(scenePlacementStatus)
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(.indigo)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(.white.opacity(0.90), in: Capsule())
                .padding(.trailing, 116)
                .accessibilityIdentifier("world2.mutableScene.placementMode")
        }
    }

    private var scenePlacementStatus: String {
        if viewModel.currentMutableScene.hardpoints.isEmpty {
            return "Free placement"
        }
        return "\(viewModel.availableSceneHardpoints.count) hardpoints open"
    }

    private var drawerLayer: some View {
        HStack(spacing: 12) {
            if isDrawerOpen {
                placeInventoryDrawer
                    .transition(.move(edge: .trailing).combined(with: .opacity))
            }

            Button {
                withAnimation(.spring(response: 0.38, dampingFraction: 0.82)) {
                    isDrawerOpen.toggle()
                }
            } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: isDrawerOpen ? "xmark" : "shippingbox.fill")
                        .font(.system(size: 24, weight: .black))
                        .foregroundStyle(.white)
                        .frame(width: 58, height: 58)
                        .background(.indigo.gradient, in: Circle())
                        .overlay(Circle().stroke(.white.opacity(0.78), lineWidth: 2))
                        .shadow(color: .black.opacity(0.26), radius: 10, y: 5)

                    if !isDrawerOpen, !viewModel.placeInventory.isEmpty {
                        Text("\(viewModel.placeInventory.count)")
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .frame(minWidth: 23, minHeight: 23)
                            .background(.orange, in: Circle())
                            .offset(x: 3, y: -3)
                    }
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isDrawerOpen ? "Close place inventory" : "Open place inventory")
            .accessibilityIdentifier("world2.mutableScene.drawerButton")
        }
    }

    private var placeInventoryDrawer: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Label("PLACE INVENTORY", systemImage: "shippingbox.fill")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                Spacer()
                Text("\(viewModel.placeInventory.count)")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(.secondary)
            }

            Text(placementInstruction)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(.secondary)

            if viewModel.placeInventory.isEmpty {
                Text("No placeable POIs are ready.")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 86)
            } else {
                ScrollView {
                    LazyVStack(spacing: 10) {
                        ForEach(viewModel.placeInventory) { item in
                            World2PlaceInventoryRow(
                                item: item,
                                isSelected: selectedInventoryItemID == item.id
                            ) {
                                if item.isSceneKit {
                                    viewModel.visitSceneKit(item.id)
                                } else {
                                    selectedInventoryItemID =
                                        selectedInventoryItemID == item.id ? nil : item.id
                                }
                            }
                        }
                    }
                }
                .frame(maxHeight: 260)
            }

            if developerMode, viewModel.currentSceneExits.isEmpty {
                Divider()
                Button {
                    isAuthoringPlaceholder = true
                } label: {
                    Label("Birth Placeholder Exit", systemImage: "door.left.hand.open")
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
                .accessibilityHint("Creates and links a metadata-only destination scene")
                .accessibilityIdentifier("world2.developer.birthPlaceholder")
            }
        }
        .padding(18)
        .frame(width: 330)
        .background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 24))
        .overlay {
            RoundedRectangle(cornerRadius: 24)
                .stroke(.white.opacity(0.76), lineWidth: 2)
        }
        .shadow(color: .black.opacity(0.30), radius: 18, y: 8)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.mutableScene.drawer")
    }

    private func placeSelectedItem(on hardpoint: World2SceneHardpoint) {
        guard let selectedInventoryItemID else { return }
        let placed = viewModel.placeInventoryItem(
            selectedInventoryItemID,
            x: hardpoint.x,
            y: hardpoint.y,
            hardpointID: hardpoint.id
        )
        if placed != nil {
            self.selectedInventoryItemID = nil
        }
    }

    private func placeFreeformItem(at point: CGPoint, in size: CGSize) {
        guard viewModel.currentMutableScene.hardpoints.isEmpty,
              let selectedInventoryItemID,
              size.width > 0,
              size.height > 0 else {
            return
        }
        let placed = viewModel.placeInventoryItem(
            selectedInventoryItemID,
            x: point.x / size.width,
            y: point.y / size.height
        )
        if placed != nil {
            self.selectedInventoryItemID = nil
        }
    }

    private func logSceneState() {
        World2Diagnostics.log(
            "mutable_scene_opened",
            [
                "exit_count": "\(viewModel.currentSceneExits.count)",
                "hardpoint_count": "\(viewModel.currentMutableScene.hardpoints.count)",
                "mutable": "\(viewModel.currentMutableScene.isMutableByPlayer)",
                "placed_count": "\(viewModel.currentScenePlaces.count)",
                "scene": viewModel.currentMutableSceneID
            ]
        )
    }
}

private struct World2PlaceInventoryRow: View {
    let item: World2PlaceInventoryItem
    let isSelected: Bool
    let onSelect: () -> Void

    private var template: World2PlaceTemplate {
        World2PlaceTemplate.template(for: item.templateID)
    }

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 10) {
                World2SemanticImage(
                    semanticName: template.exteriorAsset,
                    fallbackIcon: template.fallbackIcon,
                    fallbackLabel: template.name
                )
                .scaledToFit()
                .frame(width: 62, height: 62)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    Text(template.name)
                        .font(.system(size: 15, weight: .black, design: .rounded))
                    Text(item.isSceneKit
                            ? "Go there — kit stays until connected"
                            : (isSelected ? "Ready to place" : "Tap to choose"))
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .opacity(0.72)
                }

                Spacer()
                Image(systemName: item.isSceneKit
                    ? "arrow.right.circle.fill"
                    : (isSelected ? "checkmark.circle.fill" : "circle"))
                    .font(.title3.bold())
            }
            .foregroundStyle(isSelected ? .white : .indigo)
            .padding(10)
            .background(
                isSelected ? Color.indigo : Color.indigo.opacity(0.10),
                in: RoundedRectangle(cornerRadius: 16)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(item.isSceneKit ? "Visit \(template.name)" : "Place \(template.name)")
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
        .accessibilityIdentifier("world2.placeInventory.item.\(item.id)")
    }
}

/// The big "put it here" ring a player taps in a player-mutable scene. Distinct
/// from the scene editor's World2HardpointMarker, which is a developer tool.
private struct World2PlaceDropTarget: View {
    let hardpoint: World2SceneHardpoint
    let onPlace: () -> Void
    @State private var isPulsing = false

    var body: some View {
        Button(action: onPlace) {
            VStack(spacing: 5) {
                ZStack {
                    Circle()
                        .stroke(
                            .yellow,
                            style: StrokeStyle(lineWidth: 5, dash: [10, 7])
                        )
                        .frame(width: 108, height: 108)
                    Image(systemName: "plus")
                        .font(.system(size: 34, weight: .black))
                }
                .foregroundStyle(.yellow)
                .scaleEffect(isPulsing ? 1.08 : 0.94)

                Text(hardpoint.name)
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(.black.opacity(0.58), in: Capsule())
            }
        }
        .buttonStyle(.plain)
        .onAppear { isPulsing = true }
        .animation(
            .easeInOut(duration: 0.9).repeatForever(autoreverses: true),
            value: isPulsing
        )
        .accessibilityLabel("Place at \(hardpoint.name)")
        .accessibilityIdentifier("world2.mutableScene.hardpoint.\(hardpoint.id)")
    }
}

private struct World2PlaceholderExitMarker: View {
    let exit: World2SceneExit
    let onEnter: () -> Void

    var body: some View {
        Button(action: onEnter) {
            VStack(spacing: 7) {
                Image(systemName: "door.left.hand.open")
                    .font(.system(size: 68, weight: .bold))
                    .foregroundStyle(.white, .orange)
                    .frame(width: 116, height: 136)
                    .background(.black.opacity(0.30), in: RoundedRectangle(cornerRadius: 24))
                    .overlay {
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(.orange, style: StrokeStyle(lineWidth: 4, dash: [9, 6]))
                    }

                Text(exit.name)
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 11)
                    .padding(.vertical, 6)
                    .background(.orange.opacity(0.94), in: Capsule())
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Take exit \(exit.name)")
        .accessibilityHint(exit.summary)
        .accessibilityIdentifier("world2.mutableScene.exit.\(exit.id)")
    }
}

private struct World2MutableScenePlaceMarker: View {
    let instance: World2PlacedPlaceInstance
    let onEnter: () -> Void
    @State private var isPulsing = false

    private var template: World2PlaceTemplate {
        World2PlaceTemplate.template(for: instance.templateID)
    }

    var body: some View {
        Button(action: onEnter) {
            VStack(spacing: 6) {
                ZStack {
                    Ellipse()
                        .fill(.orange.opacity(isPulsing ? 0.45 : 0.24))
                        .frame(width: 164, height: 90)
                        .blur(radius: 18)

                    World2SemanticImage(
                        semanticName: template.exteriorAsset,
                        fallbackIcon: template.fallbackIcon,
                        fallbackLabel: template.name
                    )
                    .scaledToFit()
                    .frame(width: 185, height: 150)
                    .shadow(color: .orange.opacity(0.55), radius: 14, y: 6)
                }
                .scaleEffect(isPulsing ? 1.04 : 0.98)

                Label(template.name, systemImage: "door.left.hand.open")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 11)
                    .padding(.vertical, 6)
                    .background(.orange.opacity(0.94), in: Capsule())
            }
        }
        .buttonStyle(.plain)
        .onAppear { isPulsing = true }
        .animation(
            .easeInOut(duration: 1.1).repeatForever(autoreverses: true),
            value: isPulsing
        )
        .accessibilityLabel("Enter \(template.name)")
        .accessibilityHint("Go inside to use this place")
        .accessibilityIdentifier("world2.placedPlace.\(instance.id)")
    }
}

private struct World2PlaceholderSceneForm: View {
    let onBirth: (String, String, String, Bool) -> Void
    @Environment(\.dismiss) private var dismiss

    @State private var sceneName = ""
    @State private var sceneSummary = ""
    @State private var exitName = ""
    @State private var usesHardpoints = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Destination") {
                    TextField("Scene name", text: $sceneName)
                        .accessibilityIdentifier("world2.developer.placeholder.name")
                    TextField("Short description", text: $sceneSummary, axis: .vertical)
                        .lineLimit(2...4)
                        .accessibilityIdentifier("world2.developer.placeholder.summary")
                }

                Section("Exit from this scene") {
                    TextField("Exit label", text: $exitName)
                        .accessibilityIdentifier("world2.developer.placeholder.exitName")
                }

                Section("POI placement") {
                    Toggle("Use three POI hardpoints", isOn: $usesHardpoints)
                        .accessibilityIdentifier("world2.developer.placeholder.hardpoints")
                    Text(
                        usesHardpoints
                            ? "POIs must snap to one of three authored clearings."
                            : "With no hardpoints, the player can place POIs anywhere."
                    )
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                }

                Section {
                    Button {
                        onBirth(sceneName, sceneSummary, exitName, usesHardpoints)
                    } label: {
                        Label("Birth Into the Game", systemImage: "sparkles")
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(
                        sceneName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            || exitName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    )
                    .accessibilityIdentifier("world2.developer.placeholder.birth")
                }
            }
            .navigationTitle("New Placeholder Scene")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .accessibilityIdentifier("world2.developer.placeholder.form")
    }
}

#Preview("Mutable Scene") {
    World2MutableSceneView(viewModel: World2ViewModel())
}
