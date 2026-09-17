import SwiftUI
import UIKit

struct WorldMapView: View {
    @ObservedObject var viewModel: World2ViewModel
    @ObservedObject private var developerSession = World2DeveloperSession.shared

    @State private var editorLayer: World2SceneEditorLayer = .pois
    @State private var selectedInstanceID: String?
    @State private var selectedHardpointID: String?
    @State private var snappingEnabled = true
    @State private var showingEditor = true
    /// The pad lighting up under a live drag, and why it might refuse.
    @State private var candidateHardpointID: String?
    @State private var snapRejection: String?
    /// Art Garden plate is wider than the iPad; drag/pinch to look around.
    @State private var lookZoom: CGFloat = 1
    @State private var lookPan: CGSize = .zero
    @GestureState private var livePan: CGSize = .zero
    @GestureState private var liveZoom: CGFloat = 1

    @ObservedObject private var sceneCook = World2SceneCookService.shared

    private var developerMode: Bool { developerSession.isEnabled }
    private var store: World2SceneGraphStore { viewModel.sceneGraph }
    private var allowsLookAround: Bool {
        viewModel.currentWorld?.id == .artGarden && !developerMode
    }
    private var sceneID: String { (viewModel.currentWorld?.id ?? .home).sceneID }
    private var scene: World2SceneDefinition { store.scene(sceneID) }

    private var isEditingPlaces: Bool {
        developerMode && showingEditor && editorLayer == .pois
    }

    private var isEditingHardpoints: Bool {
        developerMode && showingEditor && editorLayer == .hardpoints
    }

    private var worldSubtitle: String {
        switch viewModel.currentWorld?.id {
        case .work: return "Help the city's magical machines"
        case .farm: return "Discover something new in the meadow"
        case .threeBears: return "Somebody left three bowls out"
        case .artGarden: return "Drag to look around the garden"
        default: return "Choose a place to visit"
        }
    }

    var body: some View {
        GeometryReader { geometry in
            let baseRect = Self.mapRect(for: scene, in: geometry.size)
            let mapRect = lookMapRect(base: baseRect, in: geometry.size)
            let aspectRatio = mapRect.height > 1 ? mapRect.width / mapRect.height : 4.0 / 3.0

            ZStack {
                mapBackground(geometry: geometry, mapRect: mapRect)
                padPlacementLayer(mapRect: mapRect)
                hardpointLayer(mapRect: mapRect)
                placeLayer(mapRect: mapRect, viewSize: geometry.size, aspectRatio: aspectRatio)
                plantedPlaceLayer(mapRect: mapRect)
                plantDropTargetLayer(mapRect: mapRect)
                cookingBadgeLayer(mapRect: mapRect)
                World2PartyLayer(party: viewModel.party, mapRect: mapRect)
                    .zIndex(20)
                topChrome
                travelNavigation
                inspectionOverlay
                snapHintOverlay
                editorOverlay(aspectRatio: aspectRatio)
            }
            .gesture(
                lookAroundGesture(fitted: baseRect, in: geometry.size),
                including: allowsLookAround ? .gesture : .subviews
            )
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.homeWorld")
        .onAppear {
            syncEditorSelection()
            viewModel.party.enterScene(.defaultSpawn, aspectRatio: aspectRatioForCurrentMap())
        }
        .onChange(of: viewModel.currentPlayerId) {
            store.selectPlayer(viewModel.currentPlayerId)
            syncEditorSelection()
        }
        .onChange(of: developerSession.isEnabled) {
            showingEditor = developerSession.isEnabled
            syncEditorSelection()
        }
        .onChange(of: viewModel.currentWorld?.id) {
            candidateHardpointID = nil
            snapRejection = nil
            lookZoom = 1
            lookPan = .zero
            viewModel.selectedPlaceInventoryItemID = nil
            syncEditorSelection()
            viewModel.party.enterScene(.defaultSpawn, aspectRatio: aspectRatioForCurrentMap())
        }
        .onChange(of: editorLayer) {
            candidateHardpointID = nil
            snapRejection = nil
        }
        .ignoresSafeArea()
    }

    private func aspectRatioForCurrentMap() -> Double {
        // Approximate; the live GeometryReader aspect is preferred when walking.
        4.0 / 3.0
    }

    private func lookMapRect(base: CGRect, in viewSize: CGSize) -> CGRect {
        guard allowsLookAround || lookZoom > 1.01 || abs(lookPan.width) > 1 else {
            return base
        }
        let zoom = min(max(lookZoom * liveZoom, 1), 2.6)
        let width = base.width * zoom
        let height = base.height * zoom
        var origin = CGPoint(
            x: base.midX - width / 2 + lookPan.width + livePan.width,
            y: base.midY - height / 2 + lookPan.height + livePan.height
        )
        let minX = viewSize.width - width - 40
        let minY = viewSize.height - height - 40
        origin.x = min(40, max(minX, origin.x))
        origin.y = min(40, max(minY, origin.y))
        return CGRect(origin: origin, size: CGSize(width: width, height: height))
    }

    private func lookAroundGesture(fitted: CGRect, in viewSize: CGSize) -> some Gesture {
        SimultaneousGesture(
            DragGesture()
                .updating($livePan) { value, state, _ in
                    state = value.translation
                }
                .onEnded { value in
                    lookPan.width += value.translation.width
                    lookPan.height += value.translation.height
                    lookPan = clampedPan(fitted: fitted, in: viewSize)
                },
            MagnificationGesture()
                .updating($liveZoom) { value, state, _ in
                    state = value
                }
                .onEnded { value in
                    lookZoom = min(max(lookZoom * value, 1), 2.6)
                    lookPan = clampedPan(fitted: fitted, in: viewSize)
                }
        )
    }

    private func clampedPan(fitted: CGRect, in viewSize: CGSize) -> CGSize {
        let zoom = min(max(lookZoom, 1), 2.6)
        let width = fitted.width * zoom
        let height = fitted.height * zoom
        let midOriginX = fitted.midX - width / 2
        let midOriginY = fitted.midY - height / 2
        let minX = viewSize.width - width - 40 - midOriginX
        let maxX = 40 - midOriginX
        let minY = viewSize.height - height - 40 - midOriginY
        let maxY = 40 - midOriginY
        return CGSize(
            width: min(maxX, max(minX, lookPan.width)),
            height: min(maxY, max(minY, lookPan.height))
        )
    }

    @ViewBuilder
    private func cookingBadgeLayer(mapRect: CGRect) -> some View {
        if sceneCook.isCooking,
           let instance = scene.poiInstances.first(where: {
               $0.archetypeID == World2POIRegistry.sceneBuilderID
           }) {
            let point = CGPoint(
                x: mapRect.minX + CGFloat(instance.transform.position.x) * mapRect.width,
                y: mapRect.minY + CGFloat(instance.transform.position.y) * mapRect.height
            )
            Group {
                if let badge = UIImage(named: "world2_scene_builder_cooking_badge") {
                    Image(uiImage: badge)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 88, height: 88)
                } else {
                    Text("COOKING")
                        .font(.system(size: 14, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(10)
                        .background(.orange, in: Capsule())
                }
            }
            .position(x: point.x, y: point.y - 70)
            .accessibilityIdentifier("world2.sceneBuilder.mapCookingBadge")
            .zIndex(90)
        }
    }

    // MARK: - Background

    @ViewBuilder
    private func mapBackground(geometry: GeometryProxy, mapRect: CGRect) -> some View {
        if let backdropStyle = scene.backdropStyle,
           AssetBootstrapService.shared.image(for: scene.backgroundAsset) == nil {
            // A drawn backdrop fills the screen, so no letterbox blur is needed.
            World2SceneBackdrop(style: backdropStyle)
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
                .ignoresSafeArea()
        } else {
            ZStack {
                World2SemanticImage(
                    semanticName: scene.backgroundAsset,
                    fallbackIcon: "tree.fill",
                    fallbackLabel: "\(scene.name) artwork is not bundled"
                )
                .scaledToFill()
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
                .overlay(Color.black.opacity(0.42))
                .ignoresSafeArea()

                mapPlate(mapRect: mapRect)
            }
        }
    }

    @ViewBuilder
    private func mapPlate(mapRect: CGRect) -> some View {
        // Crackware ambient loops (watermarked free-tier exports) stay off the
        // kid surface; developer mode is enough to verify wiring.
        let allowCrackwareAmbient = developerMode
        let plate = Group {
            if allowCrackwareAmbient,
               let ambientID = scene.ambientVideoAsset,
               let url = AssetBootstrapService.shared.videoURL(for: ambientID) {
                World2LoopingVideoView(url: url)
                    .accessibilityLabel("\(scene.name) ambient map (crackware)")
            } else {
                World2SemanticImage(
                    semanticName: scene.backgroundAsset,
                    fallbackIcon: "tree.fill",
                    fallbackLabel: "\(scene.name) artwork is not bundled"
                )
                .scaledToFit()
            }
        }

        plate
            .frame(width: mapRect.width, height: mapRect.height)
            .clipped()
            .position(x: mapRect.midX, y: mapRect.midY)
            .shadow(color: .black.opacity(0.45), radius: 18, y: 8)
            .accessibilityIdentifier("world2.map.frame")
    }

    // MARK: - Hardpoints

    /// In the hardpoint layer, a tap on bare map adds a pad where you tapped.
    /// The pads themselves sit above this, so tapping one still selects it.
    @ViewBuilder
    private func padPlacementLayer(mapRect: CGRect) -> some View {
        if isEditingHardpoints {
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture(coordinateSpace: .local) { location in
                    guard mapRect.width > 1, mapRect.height > 1 else { return }
                    let added = store.addHardpoint(
                        in: sceneID,
                        at: World2NormalizedPoint(
                            x: (location.x - mapRect.minX) / mapRect.width,
                            y: (location.y - mapRect.minY) / mapRect.height
                        )
                    )
                    selectedHardpointID = added.id
                }
                .zIndex(1)
                .accessibilityHidden(true)
        }
    }

    /// Open pads are drawn for players as a quiet promise and for developers as
    /// the full editable target. Occupied pads only appear while editing, so the
    /// map does not grow rings under every building.
    @ViewBuilder
    private func hardpointLayer(mapRect: CGRect) -> some View {
        let occupancy = scene.occupancy
        let visible = scene.hardpoints.filter { hardpoint in
            if isEditingHardpoints { return true }
            if isEditingPlaces { return occupancy[hardpoint.id] == nil || candidateHardpointID == hardpoint.id }
            return occupancy[hardpoint.id] == nil && scene.showsOpenHardpointsToPlayers
        }

        ForEach(visible) { hardpoint in
            World2HardpointMarker(
                hardpoint: hardpoint,
                mode: markerMode(for: hardpoint),
                mapRect: mapRect
            ) {
                selectedHardpointID = hardpoint.id
            } onMove: { position in
                store.moveHardpoint(hardpoint.id, in: sceneID, to: position)
            }
            .zIndex(isEditingHardpoints ? 12 : 2)
        }
    }

    private func markerMode(for hardpoint: World2SceneHardpoint) -> World2HardpointMarkerMode {
        if isEditingHardpoints {
            return .editing(isSelected: selectedHardpointID == hardpoint.id)
        }
        if isEditingPlaces {
            return .snapTarget(isCandidate: candidateHardpointID == hardpoint.id)
        }
        return .playerHint
    }

    // MARK: - Places

    @ViewBuilder
    private func placeLayer(
        mapRect: CGRect,
        viewSize: CGSize,
        aspectRatio: Double
    ) -> some View {
        ForEach(scene.instancesInDrawOrder) { instance in
            if let archetype = World2POIRegistry.archetype(instance.archetypeID) {
                World2POIInstanceMarker(
                    archetype: archetype,
                    instance: instance,
                    mapRect: mapRect,
                    viewSize: viewSize,
                    isEditable: isEditingPlaces,
                    isSelected: selectedInstanceID == instance.id,
                    isDimmed: isEditingHardpoints,
                    onTap: {
                        if isEditingPlaces {
                            selectedInstanceID = instance.id
                        } else {
                            withAnimation(.spring(response: 0.38, dampingFraction: 0.82)) {
                                viewModel.inspectPOI(instance: instance)
                            }
                        }
                    },
                    onDragChanged: { position in
                        let preview = store.previewSnap(
                            instanceID: instance.id,
                            in: sceneID,
                            to: position,
                            snappingEnabled: snappingEnabled,
                            aspectRatio: aspectRatio
                        )
                        candidateHardpointID = preview.highlightedHardpointID
                        snapRejection = preview.rejection?.explanation
                    },
                    onDragEnded: { position in
                        store.moveInstance(
                            instance.id,
                            in: sceneID,
                            to: position,
                            snappingEnabled: snappingEnabled,
                            aspectRatio: aspectRatio
                        )
                        candidateHardpointID = nil
                        snapRejection = nil
                    },
                    onScale: { scale in
                        store.setScale(scale, instanceID: instance.id, in: sceneID)
                    },
                    onRotation: { rotation in
                        store.setRotation(rotation, instanceID: instance.id, in: sceneID)
                    }
                )
            }
        }
    }

    /// Seedlings / portals planted from Place Inventory on this authored map.
    @ViewBuilder
    private func plantedPlaceLayer(mapRect: CGRect) -> some View {
        ForEach(viewModel.currentAuthoredMapPlaces.filter(\.hasSkySpotlight)) { instance in
            World2SkySpotlightEmbellishment(
                sceneSize: mapRect.size,
                anchor: CGPoint(
                    x: mapRect.minX + CGFloat(instance.x) * mapRect.width,
                    y: mapRect.minY + CGFloat(instance.y) * mapRect.height
                )
            )
            .allowsHitTesting(false)
            .zIndex(14)
            .accessibilityHidden(true)
        }

        ForEach(viewModel.currentAuthoredMapPlaces) { instance in
            World2MutableScenePlaceMarker(instance: instance) {
                viewModel.enterPlacedPlace(instance.id)
            }
            .position(
                x: mapRect.minX + CGFloat(instance.x) * mapRect.width,
                y: mapRect.minY + CGFloat(instance.y) * mapRect.height
            )
            .zIndex(16)
            .accessibilityIdentifier("world2.map.planted.\(instance.id)")
        }
    }

    @ViewBuilder
    private func plantDropTargetLayer(mapRect: CGRect) -> some View {
        if viewModel.selectedPlaceInventoryItemID != nil,
           !viewModel.plantableAuthoredHardpoints.isEmpty {
            ForEach(viewModel.plantableAuthoredHardpoints) { hardpoint in
                World2PlaceDropTarget(hardpoint: hardpoint) {
                    plantSelectedInventoryItem(on: hardpoint)
                }
                .position(
                    x: mapRect.minX + CGFloat(hardpoint.x) * mapRect.width,
                    y: mapRect.minY + CGFloat(hardpoint.y) * mapRect.height
                )
                .zIndex(35)
            }
        }
    }

    private func plantSelectedInventoryItem(on hardpoint: World2SceneHardpoint) {
        guard let itemID = viewModel.selectedPlaceInventoryItemID else { return }
        _ = viewModel.placeInventoryItem(
            itemID,
            x: hardpoint.x,
            y: hardpoint.y,
            hardpointID: hardpoint.id,
            in: sceneID
        )
    }

    // MARK: - Chrome

    private var topChrome: some View {
        VStack {
            HStack(alignment: .top, spacing: 14) {
                World2WorldIdentity(
                    name: viewModel.currentWorld?.name ?? "Abbie's World",
                    subtitle: worldSubtitle
                )

                Spacer(minLength: 8)

                World2GameStatusHUD(
                    player: viewModel.currentPlayerId,
                    gems: viewModel.gems,
                    ingredients: viewModel.totalIngredients,
                    deck: viewModel.activeDeckCount
                )
            }
            .padding(.leading, 18)
            .padding(.trailing, 132)
            .padding(.top, 14)
            Spacer()
        }
    }

    @ViewBuilder
    private var travelNavigation: some View {
        if let world = viewModel.currentWorld {
            let destinations = viewModel.travelDestinations(from: world.id)
            if !destinations.isEmpty {
                World2TravelNavigation(
                    currentWorld: world.id,
                    destinations: destinations,
                    onTravel: viewModel.switchWorld
                )
                .zIndex(20)
            }
        }
    }

    @ViewBuilder
    private var inspectionOverlay: some View {
        if viewModel.showingPOISheet, let inspection = viewModel.inspectedPOI {
            Color.black.opacity(0.28)
                .ignoresSafeArea()
                .onTapGesture {
                    withAnimation(.easeOut(duration: 0.2)) {
                        viewModel.dismissPOIInspection()
                    }
                }
                .zIndex(50)

            World2POIInspectionDrawer(
                poi: inspection.poi,
                isReadOnlyVisit: viewModel.isReadOnlyVisit(to: inspection.poi.id),
                onEnter: { viewModel.enterPOI(inspection.poi) },
                onDismiss: {
                    withAnimation(.easeOut(duration: 0.2)) {
                        viewModel.dismissPOIInspection()
                    }
                }
            )
            .frame(width: 332)
            .frame(maxHeight: .infinity)
            .background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 28))
            .overlay {
                RoundedRectangle(cornerRadius: 28)
                    .stroke(.white.opacity(0.72), lineWidth: 2)
            }
            .shadow(color: .black.opacity(0.32), radius: 24, x: -8)
            .padding(.top, 72)
            .padding(.bottom, 16)
            .padding(.trailing, 14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
            .transition(.move(edge: .trailing))
            .zIndex(51)
            .accessibilityElement(children: .contain)
            .accessibilityIdentifier("world2.poi.drawer")
        }
    }

    /// Tells a developer why a drag will not take, instead of failing silently.
    @ViewBuilder
    private var snapHintOverlay: some View {
        if let snapRejection {
            Label(snapRejection, systemImage: "exclamationmark.triangle.fill")
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(.red.opacity(0.9), in: Capsule())
                .padding(.top, 86)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .zIndex(70)
                .accessibilityIdentifier("world2.sceneEditor.snapRejection")
        }
    }

    // MARK: - Editor

    @ViewBuilder
    private func editorOverlay(aspectRatio: Double) -> some View {
        if developerMode, showingEditor {
            World2SceneEditorPanel(
                sceneID: sceneID,
                store: store,
                worldGraph: viewModel.worldGraph,
                layer: $editorLayer,
                selectedInstanceID: $selectedInstanceID,
                selectedHardpointID: $selectedHardpointID,
                snappingEnabled: $snappingEnabled,
                aspectRatio: aspectRatio,
                onDone: {
                    store.save()
                    withAnimation(.easeOut(duration: 0.2)) {
                        showingEditor = false
                    }
                },
                onOpenPlanningDept: {
                    viewModel.openPlanningDept()
                }
            )
            .frame(maxWidth: 980)
            .background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 24))
            .overlay {
                RoundedRectangle(cornerRadius: 24)
                    .stroke(.orange.opacity(0.85), lineWidth: 3)
            }
            .shadow(color: .black.opacity(0.35), radius: 20, y: 8)
            .padding(.horizontal, 18)
            .padding(.bottom, 14)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            .zIndex(80)
        } else if developerMode {
            Button {
                showingEditor = true
                syncEditorSelection()
            } label: {
                Label("Edit", systemImage: "slider.horizontal.3")
                    .font(.system(size: 13, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(.orange.opacity(0.92), in: Capsule())
            }
            .buttonStyle(.plain)
            .padding(.leading, 18)
            .padding(.bottom, 18)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
            .zIndex(80)
            .accessibilityIdentifier("world2.sceneEditor.open")
        }
    }

    private func syncEditorSelection() {
        store.selectPlayer(viewModel.currentPlayerId)
        guard developerMode else {
            selectedInstanceID = nil
            selectedHardpointID = nil
            return
        }
        let current = scene
        if selectedInstanceID == nil || current.instance(selectedInstanceID ?? "") == nil {
            selectedInstanceID = current.instancesInDrawOrder.first?.id
        }
        if selectedHardpointID == nil || current.hardpoint(selectedHardpointID ?? "") == nil {
            selectedHardpointID = current.hardpoints.first?.id
        }
    }

    /// Full painting, centered. Landscape phones used to crop the 4:3 maps, so
    /// markers floated off the painted pads.
    static func fittedMapRect(imageSize: CGSize, in viewSize: CGSize) -> CGRect {
        guard imageSize.width > 1, imageSize.height > 1,
              viewSize.width > 1, viewSize.height > 1 else {
            return CGRect(origin: .zero, size: viewSize)
        }
        let scale = min(viewSize.width / imageSize.width, viewSize.height / imageSize.height)
        let size = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
        return CGRect(
            x: (viewSize.width - size.width) / 2,
            y: (viewSize.height - size.height) / 2,
            width: size.width,
            height: size.height
        )
    }

    /// Cover the screen so a wide overland plate overflows and can be panned.
    static func coveredMapRect(imageSize: CGSize, in viewSize: CGSize) -> CGRect {
        guard imageSize.width > 1, imageSize.height > 1,
              viewSize.width > 1, viewSize.height > 1 else {
            return CGRect(origin: .zero, size: viewSize)
        }
        let scale = max(viewSize.width / imageSize.width, viewSize.height / imageSize.height)
        let size = CGSize(width: imageSize.width * scale, height: imageSize.height * scale)
        return CGRect(
            x: (viewSize.width - size.width) / 2,
            y: (viewSize.height - size.height) / 2,
            width: size.width,
            height: size.height
        )
    }

    /// The rectangle every normalized coordinate in this scene is measured
    /// against. A painted map gets its own letterboxed frame; a scene drawn by
    /// hand fills the screen, so its pads are laid out against the whole view.
    /// Art Garden uses cover so the overland plate is bigger than the iPad.
    static func mapRect(for scene: World2SceneDefinition, in viewSize: CGSize) -> CGRect {
        if let image = AssetBootstrapService.shared.image(for: scene.backgroundAsset) {
            if scene.id == World2SceneCatalog.sceneID(for: .artGarden) {
                return coveredMapRect(imageSize: image.size, in: viewSize)
            }
            return fittedMapRect(imageSize: image.size, in: viewSize)
        }
        if scene.backdropStyle != nil {
            return CGRect(origin: .zero, size: viewSize)
        }
        return fittedMapRect(imageSize: CGSize(width: 4, height: 3), in: viewSize)
    }
}

/// Travel arrows laid out by index so a world can have any number of
/// neighbours without two arrows landing on top of each other.
private struct World2TravelNavigation: View {
    let currentWorld: WorldId
    let destinations: [WorldId]
    let onTravel: (WorldId) -> Void

    private static let slots: [(alignment: Alignment, insets: EdgeInsets)] = [
        (.bottomLeading, EdgeInsets(top: 0, leading: 18, bottom: 20, trailing: 0)),
        (.trailing, EdgeInsets(top: 95, leading: 0, bottom: 95, trailing: 18)),
        (.bottomTrailing, EdgeInsets(top: 0, leading: 0, bottom: 20, trailing: 18)),
        (.topLeading, EdgeInsets(top: 92, leading: 18, bottom: 0, trailing: 0)),
    ]

    /// Home sits at the origin of the map, so the way back always occupies the
    /// bottom-left slot no matter which world you are standing in.
    private var ordered: [WorldId] {
        destinations.sorted { lhs, rhs in
            if lhs == .home { return true }
            if rhs == .home { return false }
            return lhs.rawValue < rhs.rawValue
        }
    }

    var body: some View {
        ZStack {
            ForEach(Array(ordered.enumerated()), id: \.element) { index, destination in
                let slot = Self.slots[index % Self.slots.count]
                World2TravelArrow(
                    title: destination.displayName,
                    direction: destination == .home
                        ? "BACK HOME"
                        : (destination.direction?.uppercased() ?? "EXPLORE"),
                    systemName: icon(for: slot.alignment, destination: destination),
                    tint: tint(for: destination)
                ) {
                    onTravel(destination)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: slot.alignment)
                .padding(slot.insets)
                .accessibilityIdentifier("world2.world.\(destination.rawValue)")
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.world.travelArrows")
    }

    private func tint(for destination: WorldId) -> Color {
        switch destination {
        case .farm: return .green
        case .threeBears: return .brown
        case .blankSlate: return .cyan
        default: return .orange
        }
    }

    private func icon(for alignment: Alignment, destination: WorldId) -> String {
        if destination == .home { return "arrow.uturn.left" }
        switch alignment {
        case .trailing: return "arrow.right"
        case .bottomTrailing: return "arrow.down.right"
        case .topLeading: return "arrow.up.left"
        default: return "arrow.down.left"
        }
    }
}

private struct World2TravelArrow: View {
    let title: String
    let direction: String
    let systemName: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: systemName)
                    .font(.system(size: 25, weight: .black))
                    .frame(width: 34, height: 34)
                    .background(.white.opacity(0.20), in: Circle())

                VStack(alignment: .leading, spacing: 0) {
                    Text(direction)
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .foregroundStyle(.white.opacity(0.72))
                    Text(title)
                        .font(.system(size: 16, weight: .black, design: .rounded))
                }
            }
            .foregroundStyle(.white)
            .padding(.leading, 9)
            .padding(.trailing, 15)
            .padding(.vertical, 8)
            .background(tint.opacity(0.94), in: Capsule())
            .overlay(Capsule().stroke(.white.opacity(0.72), lineWidth: 2))
            .shadow(color: tint.opacity(0.75), radius: 13)
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Travel \(direction.lowercased()) to \(title)")
        .accessibilityHint("Opens \(title)")
    }
}

private struct World2WorldIdentity: View {
    let name: String
    let subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(name)
                .font(.system(size: 24, weight: .black, design: .rounded))
            Text(subtitle)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.8))
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 15)
        .padding(.vertical, 10)
        .background(.black.opacity(0.54), in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(.white.opacity(0.28), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.22), radius: 8, y: 3)
    }
}

private struct World2GameStatusHUD: View {
    let player: PlayerId?
    let gems: Int
    let ingredients: Int
    let deck: Int

    var body: some View {
        HStack(spacing: 0) {
            if let player {
                Label(
                    player.displayName,
                    systemImage: player == .abbie ? "sparkles" : "moon.stars.fill"
                )
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(player == .abbie ? .pink : .purple)
                .padding(.horizontal, 11)
                .accessibilityLabel("Playing as \(player.displayName)")
                .accessibilityIdentifier("world2.hud.player")

                Divider()
                    .overlay(.white.opacity(0.22))
                    .frame(height: 30)
            }

            World2HUDStat(
                value: gems,
                label: "Gems",
                icon: "diamond.fill",
                identifier: "world2.hud.gems"
            )
            World2HUDStat(
                value: ingredients,
                label: "Items",
                icon: "shippingbox.fill",
                identifier: "world2.hud.ingredients"
            )
            World2HUDStat(
                value: deck,
                label: "Deck",
                icon: "rectangle.stack.fill",
                identifier: "world2.hud.deck"
            )
        }
        .padding(.vertical, 7)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(.white.opacity(0.38), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.25), radius: 10, y: 4)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.hud.gameStatus")
    }
}

private struct World2HUDStat: View {
    let value: Int
    let label: String
    let icon: String
    let identifier: String

    var body: some View {
        VStack(spacing: 0) {
            Label("\(value)", systemImage: icon)
                .font(.system(size: 13, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Text(label.uppercased())
                .font(.system(size: 8, weight: .black, design: .rounded))
                .foregroundStyle(.white.opacity(0.62))
        }
        .frame(minWidth: 52)
        .padding(.horizontal, 3)
        .accessibilityIdentifier(identifier)
    }
}

private struct World2POIInspectionDrawer: View {
    let poi: World2POIArchetype
    let isReadOnlyVisit: Bool
    let onEnter: () -> Void
    let onDismiss: () -> Void

    private var actionTitle: String {
        if poi.kind == .home && isReadOnlyVisit {
            return "Look Around"
        }
        return poi.callToAction
    }

    private var activityDescription: String {
        if poi.kind == .home && isReadOnlyVisit {
            return "Step inside and explore this cozy treehouse."
        }
        return poi.activityDescription
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            previewButton

            VStack(alignment: .leading, spacing: 8) {
                Text("WHAT'S INSIDE")
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundStyle(.secondary)
                Text(poi.name)
                    .font(.system(size: 26, weight: .black, design: .rounded))
                Text(activityDescription)
                    .font(.system(size: 15, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
                if let lore = poi.lore {
                    Text(lore)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.tertiary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            rewardSummary

            Spacer(minLength: 8)

            if isReadOnlyVisit {
                Label(
                    "Visiting — look around, but only the owner can make changes.",
                    systemImage: "eye.fill"
                )
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(.indigo)
                .multilineTextAlignment(.center)
                .accessibilityIdentifier("world2.poi.visitorNotice")
            }

            VStack(spacing: 12) {
                Button("Not Yet", action: onDismiss)
                    .buttonStyle(.bordered)
                    .accessibilityIdentifier("world2.poi.dismiss")

                Button(action: onEnter) {
                    Label(actionTitle, systemImage: poi.icon)
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .accessibilityIdentifier("world2.poi.enter")
            }
        }
        .padding(24)
    }

    @ViewBuilder
    private var exteriorPreview: some View {
        if let drawnArtStyle = poi.drawnArtStyle,
           AssetBootstrapService.shared.image(for: poi.exteriorAsset) == nil {
            World2POIDrawnArtwork(style: drawnArtStyle)
        } else {
            World2SemanticImage(
                semanticName: poi.exteriorAsset,
                fallbackIcon: poi.icon,
                fallbackLabel: "\(poi.name) artwork is not bundled"
            )
            .scaledToFit()
        }
    }

    private var previewButton: some View {
        Button(action: onEnter) {
            ZStack(alignment: .bottom) {
                exteriorPreview
                    .frame(maxWidth: .infinity)
                    .frame(height: 168)

                Label("Tap to start", systemImage: "play.fill")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.black.opacity(0.68), in: Capsule())
                    .padding(.bottom, 8)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(actionTitle) at \(poi.name)")
        .accessibilityIdentifier("world2.poi.preview.start")
    }

    /// The contract, in child-readable form. A place that gives something says so
    /// before you walk in.
    @ViewBuilder
    private var rewardSummary: some View {
        if let grant = poi.contract.grants.first {
            Label(rewardText(for: grant), systemImage: "gift.fill")
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(.orange.opacity(0.92), in: Capsule())
                .accessibilityIdentifier("world2.poi.rewardSummary")
        }
    }

    private func rewardText(for grant: World2POIGrant) -> String {
        switch grant {
        case .storyDecoration(let decorationID):
            let name = World2StoryDecoration.decoration(id: decorationID)?.name
                ?? "a treasure"
            return "Win: \(name)"
        case .gems(let upTo):
            return "Win up to \(upTo) gems"
        case .furnitureIngredients(let upTo):
            return "Earn up to \(upTo) ingredients"
        case .generatedDecorations(let count):
            return "Keep \(count) new creations"
        case .creatureCards(let count):
            return "Make \(count) new card"
        case .placeInventoryItem:
            return "Take home a new place"
        }
    }
}

struct World2SemanticImage: View {
    let semanticName: String
    let fallbackIcon: String
    let fallbackLabel: String

    /// Cake-tower construction plate for POIs that have not been qualified yet.
    private static let poiPlaceholderCatalogName = "under_construction"

    var body: some View {
        if let image = AssetBootstrapService.shared.image(for: semanticName) {
            Image(uiImage: image)
                .resizable()
                .accessibilityLabel(semanticName)
        } else if usesPOIConstructionPlaceholder,
                  let placeholder = UIImage(named: Self.poiPlaceholderCatalogName) {
            Image(uiImage: placeholder)
                .resizable()
                .scaledToFit()
                .accessibilityLabel(fallbackLabel)
                .accessibilityIdentifier("world2.asset.placeholder.\(semanticName)")
        } else {
            ZStack {
                LinearGradient(
                    colors: [.indigo.opacity(0.9), .purple.opacity(0.75)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                VStack(spacing: 8) {
                    Image(systemName: fallbackIcon)
                        .font(.system(size: 38, weight: .semibold))
                    Text(fallbackLabel)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }
                .foregroundStyle(.white)
            }
            .accessibilityLabel(fallbackLabel)
            .accessibilityIdentifier("world2.asset.placeholder.\(semanticName)")
        }
    }

    /// Drawn-art POIs still take the nil path above this view; everything else
    /// under `poi.*` shows the shared under-construction plate.
    private var usesPOIConstructionPlaceholder: Bool {
        semanticName.hasPrefix("poi.")
    }
}

#Preview {
    WorldMapView(viewModel: World2ViewModel())
}
