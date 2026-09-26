import SwiftUI
import UIKit
import Combine

struct WorldMapView: View {
    @ObservedObject var viewModel: World2ViewModel
    @ObservedObject private var developerSession = World2DeveloperSession.shared
    @ObservedObject private var assets = AssetBootstrapService.shared

    @State private var editorLayer: World2SceneEditorLayer = .pois
    @State private var selectedInstanceID: String?
    @State private var selectedHardpointID: String?
    @State private var snappingEnabled = true
    /// Panel chrome visible (false = fully dismissed via Done).
    @State private var showingEditor = false
    @State private var editorMinimized = true
    @State private var showingSceneInvent = false
    @State private var isArrangingFurniture = false
    @State private var selectedFurnitureID: String?
    @State private var selectedCatalogItemID: String?
    @State private var decorateFilter: DecorateFilterID = .mine
    /// Sandbox Edit from the tool rail (works even without developer session).
    @State private var sandboxEditing = false
    /// The pad lighting up under a live drag, and why it might refuse.
    @State private var candidateHardpointID: String?
    @State private var snapRejection: String?
    @State private var selectedZoneInteractionID: String?
    /// Art Garden plate is wider than the iPad; drag/pinch to look around.
    @State private var lookZoom: CGFloat = 1
    @State private var lookPan: CGSize = .zero
    @GestureState private var livePan: CGSize = .zero
    @GestureState private var liveZoom: CGFloat = 1

    @ObservedObject private var sceneCook = World2SceneCookService.shared

    private var developerMode: Bool { developerSession.isEnabled }
    private var store: World2SceneGraphStore { viewModel.sceneGraph }
    private var plateImageSize: CGSize {
        _ = assets.registryGeneration
        return assets.image(for: scene.backgroundAsset)?.size
            ?? CGSize(width: 4, height: 3)
    }

    /// Plate is bigger than the viewport (cover), so the player can look around.
    private func plateOverflowsViewport(in viewSize: CGSize) -> Bool {
        let covered = Self.coveredMapRect(imageSize: plateImageSize, in: viewSize)
        return covered.width > viewSize.width + 2 || covered.height > viewSize.height + 2
    }

    private var decorateSurfaceKey: String {
        World2DecorateSurface.key(forScene: sceneID)
    }

    private var allowsLookAround: Bool {
        !isBuildMode && !isArrangingFurniture
    }

    /// Compiled worlds use `world.home`. A signed-in document uses `scene.home`.
    /// The plate has to follow the document, or the map is empty Open ground.
    private var sceneID: String { viewModel.currentScene.id }
    private var scene: World2SceneDefinition { viewModel.currentScene }

    /// Overland is either Interact (play / march) or Build (scene editor).
    private var isBuildMode: Bool {
        viewModel.isSandboxBuilding
    }

    private var isEditingPlaces: Bool {
        isBuildMode && editorLayer == .pois
    }

    private var isEditingHardpoints: Bool {
        false
    }

    private var showsThumbControls: Bool {
        !isBuildMode
            && !isArrangingFurniture
            && viewModel.selectedPlaceInventoryItemID == nil
    }

    var body: some View {
        GeometryReader { geometry in
            let baseRect = Self.mapRect(
                for: scene,
                in: geometry.size,
                preferCover: scene.id == World2SceneCatalog.sceneID(for: .artGarden)
            )
            let displayedOverflows = baseRect.width > geometry.size.width + 2
                || baseRect.height > geometry.size.height + 2
            let canLook = allowsLookAround && displayedOverflows
            let mapRect = lookMapRect(base: baseRect, in: geometry.size, enabled: canLook)
            let aspectRatio = mapRect.height > 1 ? mapRect.width / mapRect.height : 4.0 / 3.0

            ZStack {
                mapBackground(geometry: geometry, mapRect: mapRect)
                if World2WorldSync.shared.presentsParty {
                    marchTapLayer(mapRect: mapRect)
                }
                placeLayer(mapRect: mapRect, viewSize: geometry.size, aspectRatio: aspectRatio)
                plantedPlaceLayer(mapRect: mapRect)
                freehandPlantLayer(mapRect: mapRect)
                cookingBadgeLayer(mapRect: mapRect)
                World2SceneDecorateLayer(
                    surfaceKey: decorateSurfaceKey,
                    mapRect: mapRect,
                    isArranging: isArrangingFurniture,
                    selectedFurnitureID: $selectedFurnitureID,
                    selectedCatalogItemID: $selectedCatalogItemID
                )
                .zIndex(18)
                if World2WorldSync.shared.presentsParty {
                    World2PartyLayer(
                        party: viewModel.party,
                        mapRect: mapRect,
                        showsNames: false,
                        usesPeglinPixelAbbie: viewModel.playSceneID.hasPrefix("scene.peglin.")
                    )
                        .zIndex(20)
                }
                sceneLabelPass(mapRect: mapRect, viewSize: geometry.size)
                if !isArrangingFurniture {
                    travelExitLayer(viewSize: geometry.size)
                }
                topChrome
                snapHintOverlay
                editorOverlay(aspectRatio: aspectRatio)
                selectedPOIToolbar(mapRect: mapRect)
            }
            .gesture(
                lookAroundGesture(fitted: baseRect, in: geometry.size),
                including: canLook ? .gesture : .subviews
            )
            .overlay(alignment: .bottom) {
                if showsThumbControls, World2WorldSync.shared.presentsParty {
                    World2DualStickControls(party: viewModel.party) {
                        confirmSelectedZoneInteraction()
                    }
                    .zIndex(45)
                }
            }
            .overlay(alignment: .bottom) {
                if isArrangingFurniture {
                    World2DecorateTray(
                        playerName: scene.name,
                        selectedCatalogID: selectedCatalogItemID,
                        selectedInventoryID: selectedFurnitureID,
                        filter: decorateFilter,
                        onFilterChange: { decorateFilter = $0 },
                        onSelectCatalog: { item in
                            selectedCatalogItemID = item.id
                            selectedFurnitureID = nil
                        },
                        onSelectInventory: { id in
                            selectedFurnitureID = id
                            selectedCatalogItemID = nil
                        },
                        onDone: {
                            isArrangingFurniture = false
                            selectedFurnitureID = nil
                            selectedCatalogItemID = nil
                        }
                    )
                    .zIndex(46)
                    .accessibilityIdentifier("world2.map.decorateTray")
                }
            }
            .overlay(alignment: .bottomTrailing) {
                if !isArrangingFurniture, showsThumbControls, !viewModel.zoneInteractions.isEmpty {
                    World2ZoneExploreDrawer(
                        interactions: viewModel.zoneInteractions,
                        selectedID: $selectedZoneInteractionID,
                        onSelect: { id in
                            guard let item = viewModel.zoneInteractions.first(where: { $0.id == id }) else {
                                return
                            }
                            viewModel.selectZoneInteraction(item)
                        },
                        onGo: confirmSelectedZoneInteraction,
                        liftsForStick: World2WorldSync.shared.presentsParty
                    )
                    .zIndex(46)
                }
            }
            .onReceive(Timer.publish(every: 0.25, on: .main, in: .common).autoconnect()) { date in
                guard !isBuildMode, World2WorldSync.shared.presentsParty else { return }
                let lead = viewModel.party.pieces(at: date)
                    .first(where: { $0.id == .abbie })?.position
                    ?? viewModel.party.leadPosition
                viewModel.syncProximityInspection(
                    lead: lead,
                    instances: scene.instancesInDrawOrder,
                    aspectRatio: aspectRatio
                )
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.homeWorld")
        .onAppear {
            syncEditorSelection()
            if viewModel.isSandboxBuilding {
                showingEditor = true
                sandboxEditing = true
            }
            viewModel.party.enterScene(
                PeglinEdition.partyLanding(for: viewModel.playSceneID),
                aspectRatio: aspectRatioForCurrentMap()
            )
            if viewModel.consumeStartSceneDecoratingFlag() {
                beginDecoratingThisScene()
            }
        }
        .onChange(of: viewModel.currentPlayerId) {
            store.selectPlayer(viewModel.currentPlayerId)
            syncEditorSelection()
        }
        .onChange(of: developerSession.isEnabled) {
            // Developer mode starts in Interact so play is obvious; Build is opt-in.
            showingEditor = false
            editorMinimized = true
            viewModel.isSandboxBuilding = false
            syncEditorSelection()
        }
        .onChange(of: viewModel.playSceneID) {
            candidateHardpointID = nil
            snapRejection = nil
            lookZoom = 1
            lookPan = .zero
            selectedZoneInteractionID = nil
            World2WorldSync.shared.markSeen(viewModel.playSceneID)
            viewModel.dismissPOIInspection()
            viewModel.party.enterScene(
                PeglinEdition.partyLanding(for: viewModel.playSceneID),
                aspectRatio: aspectRatioForCurrentMap()
            )
        }
        .onChange(of: viewModel.inspectedPOI?.id) { _, id in
            if let id {
                selectedZoneInteractionID = id
            }
        }
        .onChange(of: editorLayer) {
            candidateHardpointID = nil
            snapRejection = nil
        }
        .sheet(isPresented: $showingSceneInvent) {
            World2SceneInventDecorationsView(
                scene: scene,
                plateImage: AssetBootstrapService.shared.image(for: scene.backgroundAsset),
                onCarved: { result in
                    viewModel.notifySceneInventReady(result)
                },
                onOpenDecorate: {
                    showingSceneInvent = false
                    beginDecoratingThisScene()
                },
                onTravel: { result in
                    showingSceneInvent = false
                    viewModel.reopenInventResult(result)
                },
                onClose: { showingSceneInvent = false }
            )
        }
        .onChange(of: viewModel.sceneDecorateTick) { _, _ in
            beginDecoratingThisScene()
        }
        .onChange(of: viewModel.isSandboxBuilding) { _, building in
            showingEditor = building
            editorMinimized = true
            sandboxEditing = building
            if building {
                syncEditorSelection()
            }
        }
        .onChange(of: viewModel.sandboxInventTick) { _, _ in
            showingSceneInvent = true
        }
        .ignoresSafeArea()
    }

    private func beginDecoratingThisScene() {
        showingEditor = false
        decorateFilter = .mine
        if let highlight = viewModel.consumeInventoryHighlight() {
            selectedFurnitureID = highlight
        }
        isArrangingFurniture = true
        viewModel.dismissInventReadyPrompt()
        _ = viewModel.consumePendingDecorateTarget()
        _ = viewModel.consumeStartSceneDecoratingFlag()
        World2Diagnostics.log(
            "scene_decorate_opened",
            ["scene": sceneID, "surface": decorateSurfaceKey]
        )
    }

    private func aspectRatioForCurrentMap() -> Double {
        // Approximate; the live GeometryReader aspect is preferred when walking.
        4.0 / 3.0
    }

    private func lookMapRect(base: CGRect, in viewSize: CGSize, enabled: Bool) -> CGRect {
        guard enabled || lookZoom > 1.01 || abs(lookPan.width) > 1 else {
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
                Text("COOKING")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(10)
                    .background(.orange, in: Capsule())
            }
            .position(x: point.x, y: point.y - 70)
            .accessibilityIdentifier("world2.sceneBuilder.mapCookingBadge")
            .zIndex(90)
        }
    }

    // MARK: - Interact: march anywhere

    /// Tap bare ground to send Abbie + Daddy marching (Interact only).
    @ViewBuilder
    private func marchTapLayer(mapRect: CGRect) -> some View {
        if !isBuildMode, viewModel.selectedPlaceInventoryItemID == nil {
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture(coordinateSpace: .local) { location in
                    guard mapRect.width > 1, mapRect.height > 1 else { return }
                    let point = World2NormalizedPoint(
                        x: (location.x - mapRect.minX) / mapRect.width,
                        y: (location.y - mapRect.minY) / mapRect.height
                    ).clamped()
                    viewModel.party.walkToward(point)
                }
                .frame(width: mapRect.width, height: mapRect.height)
                .position(x: mapRect.midX, y: mapRect.midY)
                .zIndex(1)
                .accessibilityLabel("March here")
                .accessibilityIdentifier("world2.map.marchTap")
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
                    fallbackLabel: "\(scene.name) is under construction"
                )
                .scaledToFill()
                .frame(width: geometry.size.width, height: geometry.size.height, alignment: .center)
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
                    fallbackLabel: "\(scene.name) is under construction"
                )
                .scaledToFit()
            }
        }

        plate
            .frame(width: mapRect.width, height: mapRect.height, alignment: .center)
            .clipped()
            .position(x: mapRect.midX, y: mapRect.midY)
            .shadow(color: .black.opacity(0.45), radius: 18, y: 8)
            .accessibilityIdentifier("world2.map.frame")
    }

    // MARK: - Freehand plant (no POI hardpoints)

    /// Armed inventory item: tap anywhere on the plate to plant it.
    @ViewBuilder
    private func freehandPlantLayer(mapRect: CGRect) -> some View {
        if viewModel.selectedPlaceInventoryItemID != nil, !isBuildMode {
            Color.clear
                .contentShape(Rectangle())
                .onTapGesture(coordinateSpace: .local) { location in
                    guard mapRect.width > 1, mapRect.height > 1 else { return }
                    let point = World2NormalizedPoint(
                        x: (location.x - mapRect.minX) / mapRect.width,
                        y: (location.y - mapRect.minY) / mapRect.height
                    ).clamped()
                    plantSelectedInventoryItem(at: point)
                }
                .frame(width: mapRect.width, height: mapRect.height)
                .position(x: mapRect.midX, y: mapRect.midY)
                .zIndex(35)
                .accessibilityLabel("Plant here")
                .accessibilityIdentifier("world2.map.freehandPlant")
        }
    }

    private func plantSelectedInventoryItem(at point: World2NormalizedPoint) {
        guard let itemID = viewModel.selectedPlaceInventoryItemID else { return }
        _ = viewModel.placeInventoryItem(
            itemID,
            x: point.x,
            y: point.y,
            hardpointID: nil,
            in: sceneID
        )
    }

    private func sceneLabelPass(mapRect: CGRect, viewSize: CGSize) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 20.0)) { timeline in
            let build = sceneLabelBuild(
                mapRect: mapRect,
                viewSize: viewSize,
                date: timeline.date
            )
            World2SceneLabelPass(
                items: build.items,
                obstacles: build.obstacles,
                bounds: CGRect(origin: .zero, size: viewSize)
            )
        }
        .zIndex(24)
        .allowsHitTesting(false)
    }

    private func sceneLabelBuild(
        mapRect: CGRect,
        viewSize: CGSize,
        date: Date
    ) -> World2SceneLabelBuild {
        var build = World2SceneLabelBuild()
        build.addChrome(viewSize: viewSize, includeBottomTray: isArrangingFurniture)

        for instance in scene.instancesInDrawOrder {
            guard let archetype = World2POIRegistry.archetype(instance.archetypeID) else { continue }
            let scale = instance.transform.scale * (mapRect.width / max(viewSize.width, 1))
            let anchor = CGPoint(
                x: mapRect.minX + mapRect.width * instance.transform.position.x,
                y: mapRect.minY + mapRect.height * instance.transform.position.y
            )
            let showName = isEditingPlaces || viewModel.inspectedPOI?.id == instance.id
            if showName {
                build.addAnchoredLabel(
                    id: "poi.\(instance.id)",
                    text: archetype.name,
                    anchor: anchor,
                    footprint: CGSize(width: 210 * scale, height: 168 * scale),
                    priority: 2
                )
            } else {
                build.addArtworkObstacle(
                    CGRect(
                        x: anchor.x - 105 * scale,
                        y: anchor.y - 98 * scale,
                        width: 210 * scale,
                        height: 168 * scale
                    )
                )
            }
        }

        for instance in viewModel.currentAuthoredMapPlaces {
            let anchor = CGPoint(
                x: mapRect.minX + mapRect.width * instance.x,
                y: mapRect.minY + mapRect.height * instance.y
            )
            build.addAnchoredLabel(
                id: "place.\(instance.id)",
                text: instance.mapLabel,
                anchor: anchor,
                footprint: CGSize(width: 170, height: 140),
                priority: 2
            )
        }

        if World2WorldSync.shared.presentsParty {
            addPartyLabels(to: &build, mapRect: mapRect, date: date)
        }
        return build
    }

    private func addPartyLabels(
        to build: inout World2SceneLabelBuild,
        mapRect: CGRect,
        date: Date
    ) {
        for piece in viewModel.party.pieces(at: date) {
            let depth = World2PartyPathfinding.depthScale(forY: piece.position.y)
            let size = max(128, min(mapRect.width, mapRect.height) * 0.24) * depth
            let anchor = CGPoint(
                x: mapRect.minX + mapRect.width * piece.position.x,
                y: mapRect.minY + mapRect.height * piece.position.y - size * 0.28
            )
            build.addAnchoredLabel(
                id: "party.\(piece.id.rawValue)",
                text: piece.displayName,
                anchor: anchor,
                footprint: CGSize(width: size * 0.62, height: size * 0.78),
                priority: 4,
                emphasized: piece.isWalking
            )
        }
    }

    // MARK: - Travel exits (cardinal + destination plate)

    @ViewBuilder
    private func travelExitLayer(viewSize: CGSize) -> some View {
        let exits = viewModel.mapTravelExits
        let grouped = Dictionary(grouping: exits, by: \.direction)
        let bottomInset: CGFloat = {
            if showsThumbControls, World2WorldSync.shared.presentsParty { return 168 }
            if showsThumbControls { return 96 }
            return 28
        }()
        ForEach(exits) { exit in
            let edge = World2ExitEdge(cardinal: exit.direction)
            let peers = grouped[exit.direction] ?? [exit]
            let slot = peers.firstIndex(where: { $0.id == exit.id }) ?? 0
            let frame = edge.markerFrame(
                slot: slot,
                count: peers.count,
                in: viewSize,
                topInset: 96,
                bottomInset: bottomInset
            )
            World2ExitMarker(
                title: exit.title,
                subtitle: "TO \(exit.direction.displayName.uppercased())",
                edge: edge,
                plateAsset: exit.plateAsset.isEmpty ? nil : exit.plateAsset,
                compact: true,
                action: {
                    selectedZoneInteractionID = "travel.\(exit.destinationSceneID)"
                    viewModel.travelToDocumentScene(exit.destinationSceneID)
                }
            )
            .frame(width: frame.width, height: frame.height)
            .position(x: frame.midX, y: frame.midY)
            .zIndex(42)
            .accessibilityIdentifier("world2.map.travel.\(exit.destinationSceneID)")
        }
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
                // Travel exits are N/S/E/W edge markers with destination plates — not map POIs.
                if case .travel = archetype.contract.route {
                    EmptyView()
                } else {
                    World2POIInstanceMarker(
                        archetype: archetype,
                        instance: instance,
                        mapRect: mapRect,
                        viewSize: viewSize,
                        isEditable: isEditingPlaces,
                        isSelected: isEditingPlaces
                            ? selectedInstanceID == instance.id
                            : viewModel.inspectedPOI?.id == instance.id,
                        isDimmed: false,
                        showsNameLabel: false,
                        showsNewBadge: false,
                        onTap: {
                            if isEditingPlaces {
                                selectedInstanceID = instance.id
                            } else if viewModel.inspectedPOI?.id == instance.id {
                                // Second tap on the selected POI enters it.
                                confirmSelectedZoneInteraction()
                            } else {
                                withAnimation(.spring(response: 0.38, dampingFraction: 0.82)) {
                                    viewModel.inspectPOI(instance: instance)
                                    selectedZoneInteractionID = instance.id
                                }
                            }
                        },
                        onDragChanged: { _ in
                            candidateHardpointID = nil
                            snapRejection = nil
                        },
                        onDragEnded: { position in
                            store.moveInstance(
                                instance.id,
                                in: sceneID,
                                to: position,
                                snappingEnabled: false,
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
            World2MutableScenePlaceMarker(
                instance: instance,
                onEnter: {
                    if selectedZoneInteractionID == instance.id {
                        viewModel.enterPlacedPlace(instance.id)
                    } else {
                        selectedZoneInteractionID = instance.id
                        World2WorldSync.shared.markSeen(instance.id)
                        viewModel.party.walkToPOI(
                            at: World2NormalizedPoint(x: instance.x, y: instance.y)
                        )
                    }
                },
                showsTitle: false,
                showsNewBadge: World2WorldSync.shared.showsNewBadge(for: instance.id)
            )
            .position(
                x: mapRect.minX + CGFloat(instance.x) * mapRect.width,
                y: mapRect.minY + CGFloat(instance.y) * mapRect.height
            )
            .zIndex(16)
            .accessibilityIdentifier("world2.map.planted.\(instance.id)")
        }
    }

    // MARK: - Chrome

    private var topChrome: some View {
        VStack {
            HStack(alignment: .top, spacing: 12) {
                // Scene chip only — no fake "Open ground" / Go in until a place is selected.
                World2PlaceBadge(
                    sceneName: World2WorldSync.shared.usesServerDocument
                        ? viewModel.currentScene.name
                        : (viewModel.currentWorld?.name ?? viewModel.currentScene.name),
                    sceneAsset: viewModel.currentScene.backgroundAsset,
                    poi: viewModel.inspectedPOI?.poi,
                    isReadOnlyVisit: viewModel.inspectedPOI.map {
                        viewModel.isReadOnlyVisit(to: $0.poi.id)
                    } ?? false,
                    showsNewBadge: false,
                    onEnter: { confirmSelectedZoneInteraction() }
                )

                Spacer(minLength: 8)

                if viewModel.playSceneID.hasPrefix("scene.peglin.") {
                    Button {
                        viewModel.startMarbleVoyage()
                    } label: {
                        Label("Marble Voyage", systemImage: "map.fill")
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(
                                Color(red: 0.18, green: 0.42, blue: 0.72).opacity(0.94),
                                in: Capsule()
                            )
                            .overlay(Capsule().stroke(.white.opacity(0.7), lineWidth: 2))
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.map.marbleVoyage")
                    .accessibilityLabel("Start Marble Voyage — Campaign or Endless")
                }

                // Keep HUD out of Peglin chrome — gems/deck live in the player menu.
                if !viewModel.playSceneID.hasPrefix("scene.peglin.") {
                    World2GameStatusHUD(
                        player: viewModel.currentPlayerId,
                        gems: viewModel.gems,
                        ingredients: viewModel.totalIngredients,
                        deck: viewModel.activeDeckCount
                    )
                }
            }
            .padding(.leading, World2ChromeContract.titleLeading)
            .padding(.trailing, 18)
            .padding(.top, World2ChromeContract.titleTop)
            Spacer()
        }
    }

    private func confirmSelectedZoneInteraction() {
        if let id = selectedZoneInteractionID,
           let item = viewModel.zoneInteractions.first(where: { $0.id == id }) {
            viewModel.performZoneInteraction(item)
            return
        }
        guard let inspection = viewModel.inspectedPOI else { return }
        viewModel.enterPOI(inspection.poi)
    }

    private func enterUnderfootPlace() {
        confirmSelectedZoneInteraction()
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
        if (developerMode || sandboxEditing), showingEditor {
            World2SceneEditorPanel(
                sceneID: sceneID,
                store: store,
                worldGraph: viewModel.worldGraph,
                layer: $editorLayer,
                selectedInstanceID: $selectedInstanceID,
                selectedHardpointID: $selectedHardpointID,
                snappingEnabled: $snappingEnabled,
                isMinimized: $editorMinimized,
                aspectRatio: aspectRatio,
                onDone: {
                    store.save()
                    withAnimation(.easeOut(duration: 0.2)) {
                        showingEditor = false
                        editorMinimized = false
                        sandboxEditing = false
                        viewModel.isSandboxBuilding = false
                    }
                },
                onOpenPlanningDept: {
                    viewModel.openPlanningDept()
                },
                onInventDecorations: {
                    showingSceneInvent = true
                },
                onDecorateScene: {
                    beginDecoratingThisScene()
                },
                onOpenCompletions: {
                    viewModel.openInventHistory()
                }
            )
            .frame(maxWidth: editorMinimized ? 480 : 720)
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .zIndex(80)
            .allowsHitTesting(true)
        }
    }

    @ViewBuilder
    private func selectedPOIToolbar(mapRect: CGRect) -> some View {
        if isEditingPlaces,
           let selectedID = selectedInstanceID,
           let instance = scene.instance(selectedID),
           let archetype = World2POIRegistry.archetype(instance.archetypeID) {
            let point = CGPoint(
                x: mapRect.minX + mapRect.width * instance.transform.position.x,
                y: mapRect.minY + mapRect.height * instance.transform.position.y - 120
            )
            World2SelectedPOIToolbar(
                name: archetype.name,
                presentation: instance.resolvedPresentation,
                onDelete: {
                    if store.removeInstance(instance.id, in: sceneID) {
                        selectedInstanceID = nil
                    }
                },
                onToggleGlow: {
                    var next = instance.resolvedPresentation
                    next.glowEnabled.toggle()
                    store.setPresentation(next, instanceID: instance.id, in: sceneID)
                },
                onToggleSway: {
                    var next = instance.resolvedPresentation
                    next.swayEnabled.toggle()
                    store.setPresentation(next, instanceID: instance.id, in: sceneID)
                },
                onPickSkin: { preset in
                    var next = instance.resolvedPresentation
                    next.tintHue = preset.tintHue
                    store.setPresentation(next, instanceID: instance.id, in: sceneID)
                    let asset = archetype.exteriorAsset
                    let subject = "\(archetype.name), \(preset.title) look"
                    let place = archetype.name
                    Task {
                        await World2POIArtwork.generate(
                            assetKey: asset,
                            subject: subject,
                            placeName: place
                        )
                    }
                },
                onRefine: developerMode ? {
                    World2DevRefine.poi(
                        assetKey: archetype.exteriorAsset,
                        name: archetype.name
                    )
                } : nil,
                onReset: {
                    store.resetInstanceVisuals(instance.id, in: sceneID)
                }
            )
            .position(x: point.x, y: max(60, point.y))
            .zIndex(95)
            .accessibilityIdentifier("world2.poi.selectedToolbar")
        }
    }

    private func syncEditorSelection() {
        store.selectPlayer(viewModel.currentPlayerId)
        guard developerMode || sandboxEditing else {
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
    /// against. Oversized plates use cover so the player can look around;
    /// letterbox when the whole painting already fits.
    static func mapRect(
        for scene: World2SceneDefinition,
        in viewSize: CGSize,
        preferCover: Bool = false
    ) -> CGRect {
        if let image = AssetBootstrapService.shared.image(for: scene.backgroundAsset) {
            if preferCover || scene.id == World2SceneCatalog.sceneID(for: .artGarden) {
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

private struct World2GameStatusHUD: View {
    let player: PlayerId?
    let gems: Int
    let ingredients: Int
    let deck: Int

    var body: some View {
        HStack(spacing: 10) {
            if let player {
                Text(player.displayName)
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(player == .abbie ? Color.pink.opacity(0.9) : Color.purple.opacity(0.9))
                    .accessibilityLabel("Playing as \(player.displayName)")
                    .accessibilityIdentifier("world2.hud.player")
            }

            quietStat(value: gems, icon: "diamond.fill", identifier: "world2.hud.gems")
            quietStat(value: ingredients, icon: "shippingbox.fill", identifier: "world2.hud.ingredients")
            quietStat(value: deck, icon: "rectangle.stack.fill", identifier: "world2.hud.deck")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(Color.black.opacity(0.22), in: Capsule())
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.hud.gameStatus")
    }

    private func quietStat(value: Int, icon: String, identifier: String) -> some View {
        HStack(spacing: 3) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .bold))
            Text("\(value)")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .monospacedDigit()
        }
        .foregroundStyle(.white.opacity(0.82))
        .accessibilityIdentifier(identifier)
    }
}

private struct World2PlaceBadge: View {
    let sceneName: String
    let sceneAsset: String
    let poi: World2POIArchetype?
    let isReadOnlyVisit: Bool
    var showsNewBadge: Bool = false
    let onEnter: () -> Void

    private var placeTitle: String {
        poi?.name ?? ""
    }

    private var actionTitle: String {
        isReadOnlyVisit ? "Peek" : "Go in"
    }

    /// Prefer the place's exterior; for Peglin wreck use the crash plate crop token.
    private var thumbAsset: String {
        if let poi {
            return poi.exteriorAsset
        }
        return sceneAsset
    }

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            logo
            VStack(alignment: .leading, spacing: 1) {
                Text(World2ChromeContract.ellipsized(
                    sceneName,
                    budget: World2ChromeContract.titleBudget
                ))
                    .font(.system(size: 17, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                if let poi {
                    Text(World2ChromeContract.ellipsized(
                        poi.name,
                        budget: World2ChromeContract.placeTitleBudget
                    ))
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white.opacity(0.78))
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if poi != nil {
                Text(actionTitle)
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.white.opacity(0.16), in: Capsule())
                    .accessibilityIdentifier("world2.poi.action")
            }

            if showsNewBadge {
                World2NewBadge(size: 36)
            }
        }
        .padding(.horizontal, 8)
        .frame(
            width: World2ChromeContract.titleSlot.width,
            height: poi == nil ? 56 : World2ChromeContract.titleSlot.height,
            alignment: .leading
        )
        .clipped()
        .background(.black.opacity(0.54), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(.white.opacity(0.28), lineWidth: 1)
        }
        .shadow(color: .black.opacity(0.22), radius: 8, y: 3)
        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .onTapGesture {
            guard poi != nil else { return }
            onEnter()
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(
            poi == nil
                ? sceneName
                : "\(sceneName), \(placeTitle), \(actionTitle)"
        )
        .accessibilityIdentifier(poi == nil ? "world2.place.badge" : "world2.poi.enter")
        .accessibilityAddTraits(poi == nil ? [] : .isButton)
    }

    private var logo: some View {
        World2SemanticImage(
            semanticName: thumbAsset,
            fallbackIcon: poi?.icon ?? "map.fill",
            fallbackLabel: poi?.name ?? sceneName
        )
        .scaledToFill()
        .frame(width: 44, height: 44)
        .clipped()
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .accessibilityHidden(true)
    }
}

struct World2SemanticImage: View {
    let semanticName: String
    let fallbackIcon: String
    let fallbackLabel: String

    @ObservedObject private var plates = World2GeneratedPlateStore.shared
    @ObservedObject private var assets = AssetBootstrapService.shared

    var body: some View {
        let _ = assets.registryGeneration
        if let generated = plates.image(for: semanticName) {
            Image(uiImage: generated)
                .resizable()
                .accessibilityLabel(semanticName)
                .accessibilityIdentifier("world2.asset.generated.\(semanticName)")
        } else if let image = assets.image(for: semanticName) {
            Image(uiImage: image)
                .resizable()
                .accessibilityLabel(semanticName)
        } else if let placeholder = World2ConstructionArt.image(forSemantic: semanticName) {
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
}

#Preview {
    WorldMapView(viewModel: World2ViewModel())
}
