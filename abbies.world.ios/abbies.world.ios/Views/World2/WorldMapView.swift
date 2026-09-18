import SwiftUI

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
    @State private var travelDrag: World2TravelDrag?
    @State private var scriptedTravel: World2ScriptedTravel?
    @State private var showingPocket = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var developerMode: Bool { developerSession.isEnabled }
    private var store: World2SceneGraphStore { viewModel.sceneGraph }
    private var sceneID: String { viewModel.viewingSceneID }
    private var scene: World2SceneDefinition { store.scene(sceneID) }

    private var isEditingPlaces: Bool {
        developerMode && showingEditor && editorLayer == .pois
    }

    private var isEditingHardpoints: Bool {
        developerMode && showingEditor && editorLayer == .hardpoints
    }

    private var worldSubtitle: String {
        if scene.isOrphan {
            return "Not on the world yet — get it ready, then hang it on an open path"
        }
        switch viewModel.currentWorld?.id {
        case .work: return "Help the city's magical machines"
        case .farm: return "Discover something new in the meadow"
        case .threeBears: return "Somebody left three bowls out"
        default: return "Choose a place to visit"
        }
    }

    var body: some View {
        GeometryReader { geometry in
            let mapRect = Self.mapRect(for: scene, in: geometry.size)
            let aspectRatio = mapRect.height > 1 ? mapRect.width / mapRect.height : 4.0 / 3.0

            ZStack {
                mapStage(geometry: geometry, mapRect: mapRect)
                topChrome
                travelNavigation
                minimapOverlay
                orphanBanner
                pocketOverlay
                inspectionOverlay
                snapHintOverlay
                editorOverlay(aspectRatio: aspectRatio)
                if let scriptedTravel {
                    World2PortalFlashOverlay(
                        progress: scriptedTravel.progress,
                        kind: scriptedTravel.kind
                    )
                    .zIndex(90)
                }
            }
            .gesture(mapSwipeGesture(viewSize: geometry.size))
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.homeWorld")
        .onAppear(perform: syncEditorSelection)
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
            travelDrag = nil
            scriptedTravel = nil
            showingPocket = false
            syncEditorSelection()
        }
        .onChange(of: viewModel.viewingSceneID) {
            candidateHardpointID = nil
            snapRejection = nil
            travelDrag = nil
            scriptedTravel = nil
            showingPocket = false
            syncEditorSelection()
        }
        .onChange(of: editorLayer) {
            candidateHardpointID = nil
            snapRejection = nil
        }
        .ignoresSafeArea()
    }

    // MARK: - Background

    /// Painted map plus places, offset together while a slide is in flight so
    /// the chrome (arrows, HUD) stays put.
    @ViewBuilder
    private func mapStage(geometry: GeometryProxy, mapRect: CGRect) -> some View {
        let drag = travelDrag
        let currentOffset = drag.map { session in
            World2SwipeTravel.currentMapOffset(
                compass: session.compass,
                percent: session.percent,
                width: geometry.size.width,
                height: geometry.size.height
            )
        }
        let destinationScene = drag.flatMap { session -> World2SceneDefinition? in
            guard !session.rubberBanding,
                  let destinationID = session.instance?.portal?.destinationSceneID else {
                return nil
            }
            return store.scene(destinationID)
        }

        ZStack {
            mapLayers(geometry: geometry, mapRect: mapRect, scene: scene)
                .offset(
                    x: currentOffset.map { CGFloat($0.x) } ?? 0,
                    y: currentOffset.map { CGFloat($0.y) } ?? 0
                )

            if let drag, let destinationScene {
                let destRect = Self.mapRect(for: destinationScene, in: geometry.size)
                let destOffset = World2SwipeTravel.destinationMapOffset(
                    compass: drag.compass,
                    percent: drag.percent,
                    width: geometry.size.width,
                    height: geometry.size.height
                )
                mapLayers(geometry: geometry, mapRect: destRect, scene: destinationScene)
                    .offset(x: CGFloat(destOffset.x), y: CGFloat(destOffset.y))
                    .allowsHitTesting(false)
                    .accessibilityHidden(true)
            }
        }
    }

    @ViewBuilder
    private func mapLayers(
        geometry: GeometryProxy,
        mapRect: CGRect,
        scene: World2SceneDefinition
    ) -> some View {
        ZStack {
            mapBackground(geometry: geometry, mapRect: mapRect, scene: scene)
            if scene.id == self.scene.id {
                padPlacementLayer(mapRect: mapRect)
                hardpointLayer(mapRect: mapRect)
                placeLayer(
                    mapRect: mapRect,
                    viewSize: geometry.size,
                    aspectRatio: mapRect.height > 1 ? mapRect.width / mapRect.height : 4.0 / 3.0
                )
            }
        }
    }

    @ViewBuilder
    private func mapBackground(
        geometry: GeometryProxy,
        mapRect: CGRect,
        scene: World2SceneDefinition
    ) -> some View {
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

                World2SemanticImage(
                    semanticName: scene.backgroundAsset,
                    fallbackIcon: "tree.fill",
                    fallbackLabel: "\(scene.name) artwork is not bundled"
                )
                .scaledToFit()
                .frame(width: mapRect.width, height: mapRect.height)
                .position(x: mapRect.midX, y: mapRect.midY)
                .shadow(color: .black.opacity(0.45), radius: 18, y: 8)
                .accessibilityIdentifier("world2.map.frame")
            }
        }
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
            if shouldDrawPlace(instance) {
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
                        } else if instance.portal != nil {
                            beginPortalTravel(instance)
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
    }

    private func shouldDrawPlace(_ instance: World2POIInstance) -> Bool {
        if instance.hidesOnPlayerMap {
            return isEditingPlaces || isEditingHardpoints
        }
        return true
    }

    // MARK: - Chrome

    private var topChrome: some View {
        VStack {
            HStack(alignment: .top, spacing: 14) {
                World2WorldIdentity(
                    name: scene.name,
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
        World2CompassNavigation(
            sockets: compassSockets,
            bottomInset: isEditingPlaces || isEditingHardpoints ? 118 : 20,
            onSelect: handleCompassTap
        )
        .zIndex(20)
        .allowsHitTesting(scriptedTravel == nil && !(travelDrag?.isSettling ?? false))
    }

    @ViewBuilder
    private var minimapOverlay: some View {
        World2MinimapView(
            neighborhood: World2MinimapGraph.neighborhood(of: scene, resolve: store.scene),
            onSelect: handleCompassTap
        )
        .padding(.leading, 16)
        .padding(.bottom, isEditingPlaces || isEditingHardpoints ? 118 : 18)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        .zIndex(22)
        .allowsHitTesting(scriptedTravel == nil && !(travelDrag?.isSettling ?? false))
    }

    @ViewBuilder
    private var orphanBanner: some View {
        if scene.isOrphan {
            VStack(spacing: 8) {
                Text("This place is an orphan")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                Text("The kit in your pocket still works. Developer mode adds pads and portals. Connecting to an open path uses the kit up.")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .multilineTextAlignment(.center)
                    .opacity(0.86)
                Button("Leave — keep the kit") {
                    viewModel.visitScene(WorldId.home.sceneID)
                }
                .buttonStyle(.borderedProminent)
                .tint(.mint)
                .accessibilityIdentifier("world2.orphan.leave")
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(.black.opacity(0.62), in: RoundedRectangle(cornerRadius: 18))
            .padding(.top, 92)
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .zIndex(24)
            .accessibilityIdentifier("world2.orphan.banner")
        }
    }

    @ViewBuilder
    private var pocketOverlay: some View {
        VStack {
            Spacer()
            HStack {
                Spacer()
                if showingPocket {
                    World2PlacePocket(
                        items: viewModel.placeInventory,
                        sceneName: { sceneID in viewModel.sceneGraph.scene(sceneID).name },
                        onVisitKit: viewModel.visitSceneKit,
                        onTakeFactoryToBlankSlate: {
                            showingPocket = false
                            viewModel.switchWorld(to: .blankSlate)
                        },
                        onClose: { showingPocket = false }
                    )
                    .padding(.trailing, 16)
                    .padding(.bottom, isEditingPlaces || isEditingHardpoints ? 118 : 18)
                } else {
                    Button {
                        showingPocket = true
                    } label: {
                        Label("\(viewModel.placeInventory.count)", systemImage: "shippingbox.fill")
                            .font(.system(size: 14, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                            .background(.indigo.opacity(0.92), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .padding(.trailing, 16)
                    .padding(.bottom, isEditingPlaces || isEditingHardpoints ? 118 : 88)
                    .accessibilityIdentifier("world2.pocket.open")
                    .accessibilityLabel("Place inventory")
                }
            }
        }
        .zIndex(23)
    }

    private var compassSockets: [World2CompassSocket] {
        World2Compass.allCases.map { compass in
            let instance = scene.compassPortal(compass)
            let portal = instance?.portal
            return World2CompassSocket(
                compass: compass,
                title: portal?.displayName ?? "Nowhere yet",
                destinationSceneID: portal?.destinationSceneID,
                isOpen: portal?.hasDestination == true
            )
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
                onEnter: { viewModel.enterPOI(instance: inspection.instance) },
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
                layer: $editorLayer,
                selectedInstanceID: $selectedInstanceID,
                selectedHardpointID: $selectedHardpointID,
                snappingEnabled: $snappingEnabled,
                aspectRatio: aspectRatio,
                openNodes: scene.isOrphan ? viewModel.openNodesForAttachment : [],
                onConnect: scene.isOrphan
                    ? { node in viewModel.connectCurrentOrphan(to: node) }
                    : nil
            ) {
                store.save()
                withAnimation(.easeOut(duration: 0.2)) {
                    showingEditor = false
                }
            }
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
                Label("Edit Scene", systemImage: "slider.horizontal.3")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(.orange, in: Capsule())
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

    /// The rectangle every normalized coordinate in this scene is measured
    /// against. A painted map gets its own letterboxed frame; a scene drawn by
    /// hand fills the screen, so its pads are laid out against the whole view.
    static func mapRect(for scene: World2SceneDefinition, in viewSize: CGSize) -> CGRect {
        if let image = AssetBootstrapService.shared.image(for: scene.backgroundAsset) {
            return fittedMapRect(imageSize: image.size, in: viewSize)
        }
        if scene.backdropStyle != nil {
            return CGRect(origin: .zero, size: viewSize)
        }
        return fittedMapRect(imageSize: CGSize(width: 4, height: 3), in: viewSize)
    }

    // MARK: - Travel

    private var mapSwipeEnabled: Bool {
        !isEditingPlaces
            && !isEditingHardpoints
            && !viewModel.showingPOISheet
            && scriptedTravel == nil
            && !(travelDrag?.isSettling ?? false)
    }

    private func mapSwipeGesture(viewSize: CGSize) -> some Gesture {
        DragGesture(minimumDistance: 22, coordinateSpace: .local)
            .onChanged { value in
                guard mapSwipeEnabled || travelDrag != nil else { return }
                handleSwipeChanged(value, viewSize: viewSize)
            }
            .onEnded { value in
                handleSwipeEnded(value, viewSize: viewSize)
            }
    }

    private func handleSwipeChanged(_ value: DragGesture.Value, viewSize: CGSize) {
        if travelDrag == nil {
            guard mapSwipeEnabled else { return }
            guard World2SwipeTravel.isInsideSwipeInset(
                x: value.startLocation.x,
                y: value.startLocation.y,
                width: viewSize.width,
                height: viewSize.height
            ) else { return }
            guard let compass = World2Compass.dominant(
                translationX: value.translation.width,
                translationY: value.translation.height
            ) else { return }
            let instance = scene.compassPortal(compass)
            travelDrag = World2TravelDrag(
                compass: compass,
                percent: 0,
                instance: instance,
                rubberBanding: instance?.portal?.hasDestination != true
            )
        }
        guard var drag = travelDrag, !drag.isSettling else { return }
        let raw = World2SwipeTravel.percent(
            translationX: value.translation.width,
            translationY: value.translation.height,
            compass: drag.compass,
            width: viewSize.width,
            height: viewSize.height
        )
        drag.percent = drag.rubberBanding
            ? World2SwipeTravel.rubberBand(raw)
            : min(max(raw, 0), 1)
        travelDrag = drag
    }

    private func handleSwipeEnded(_ value: DragGesture.Value, viewSize: CGSize) {
        guard let drag = travelDrag, !drag.isSettling else { return }
        let percent = World2SwipeTravel.percent(
            translationX: value.translation.width,
            translationY: value.translation.height,
            compass: drag.compass,
            width: viewSize.width,
            height: viewSize.height
        )
        let predicted = World2SwipeTravel.percent(
            translationX: value.predictedEndTranslation.width,
            translationY: value.predictedEndTranslation.height,
            compass: drag.compass,
            width: viewSize.width,
            height: viewSize.height
        )
        let resolution = World2SwipeTravel.resolve(
            percent: percent,
            predictedPercent: predicted,
            hasDestination: !drag.rubberBanding
        )
        settleTravel(drag: drag, resolution: resolution)
    }

    private func handleCompassTap(_ compass: World2Compass) {
        guard scriptedTravel == nil, travelDrag?.isSettling != true else { return }
        let instance = scene.compassPortal(compass)
        if let instance, instance.portal?.hasDestination == true {
            beginPortalTravel(instance)
        } else {
            rubberBandEmptySocket(compass)
        }
    }

    private func beginPortalTravel(_ instance: World2POIInstance) {
        guard let portal = instance.portal, portal.hasDestination else {
            viewModel.travelThroughPortal(instance)
            return
        }
        if reduceMotion {
            viewModel.travelThroughPortal(instance)
            return
        }
        switch portal.transition {
        case .slide(let compass):
            commitSlide(instance: instance, compass: compass)
        case .portal, .dream, .fade:
            playScriptedTravel(instance: instance, kind: portal.transition)
        }
    }

    private func commitSlide(instance: World2POIInstance, compass: World2Compass) {
        var drag = travelDrag ?? World2TravelDrag(
            compass: compass,
            percent: travelDrag?.percent ?? 0,
            instance: instance,
            rubberBanding: false
        )
        drag.instance = instance
        drag.compass = compass
        drag.rubberBanding = false
        drag.isSettling = true
        travelDrag = drag
        withAnimation(.spring(response: 0.32, dampingFraction: 0.88)) {
            updateTravelPercent(1)
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(280))
            viewModel.travelThroughPortal(instance)
            travelDrag = nil
        }
    }

    private func settleTravel(drag: World2TravelDrag, resolution: World2SwipeTravel.Resolution) {
        var next = drag
        next.isSettling = true
        travelDrag = next
        switch resolution {
        case .commit:
            guard let instance = drag.instance else {
                snapBack(drag)
                return
            }
            commitSlide(instance: instance, compass: drag.compass)
        case .cancel:
            snapBack(drag)
        }
    }

    private func snapBack(_ drag: World2TravelDrag) {
        var next = drag
        next.isSettling = true
        travelDrag = next
        withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
            updateTravelPercent(0)
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(260))
            if travelDrag?.isSettling == true {
                travelDrag = nil
            }
        }
    }

    private func rubberBandEmptySocket(_ compass: World2Compass) {
        guard !reduceMotion else { return }
        travelDrag = World2TravelDrag(
            compass: compass,
            percent: 0,
            instance: scene.compassPortal(compass),
            rubberBanding: true,
            isSettling: true
        )
        withAnimation(.spring(response: 0.22, dampingFraction: 0.68)) {
            updateTravelPercent(World2SwipeTravel.emptyRubberBandLimit)
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(180))
            withAnimation(.spring(response: 0.32, dampingFraction: 0.72)) {
                updateTravelPercent(0)
            }
            try? await Task.sleep(for: .milliseconds(280))
            travelDrag = nil
        }
    }

    private func updateTravelPercent(_ percent: Double) {
        guard var drag = travelDrag else { return }
        drag.percent = percent
        travelDrag = drag
    }

    private func playScriptedTravel(
        instance: World2POIInstance,
        kind: World2SceneTransition
    ) {
        scriptedTravel = World2ScriptedTravel(kind: kind, progress: 0, instance: instance)
        withAnimation(.easeIn(duration: kind == .dream ? 0.72 : 0.42)) {
            guard var flash = scriptedTravel else { return }
            flash.progress = 1
            scriptedTravel = flash
        }
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(kind == .dream ? 740 : 440))
            viewModel.travelThroughPortal(instance)
            scriptedTravel = nil
        }
    }
}

private struct World2TravelDrag {
    var compass: World2Compass
    var percent: Double
    var instance: World2POIInstance?
    var rubberBanding: Bool
    var isSettling: Bool = false
}

private struct World2ScriptedTravel {
    var kind: World2SceneTransition
    var progress: Double
    var instance: World2POIInstance
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

    var body: some View {
        if let image = AssetBootstrapService.shared.image(for: semanticName) {
            Image(uiImage: image)
                .resizable()
                .accessibilityLabel(semanticName)
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

private struct World2PlacePocket: View {
    let items: [World2PlaceInventoryItem]
    let sceneName: (String) -> String
    let onVisitKit: (String) -> Void
    let onTakeFactoryToBlankSlate: () -> Void
    let onClose: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("POCKET", systemImage: "shippingbox.fill")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                Spacer()
                Button("Close", action: onClose)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
            }

            if items.isEmpty {
                Text("Nothing to carry yet.")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(.secondary)
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(items) { item in
                            pocketRow(item)
                        }
                    }
                }
                .frame(maxHeight: 240)
            }
        }
        .padding(16)
        .frame(width: 320)
        .background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 22))
        .overlay {
            RoundedRectangle(cornerRadius: 22)
                .stroke(.white.opacity(0.7), lineWidth: 2)
        }
        .accessibilityIdentifier("world2.pocket")
    }

    @ViewBuilder
    private func pocketRow(_ item: World2PlaceInventoryItem) -> some View {
        let template = World2PlaceTemplate.template(for: item.templateID)
        if item.isSceneKit {
            Button {
                onVisitKit(item.id)
            } label: {
                HStack {
                    Image(systemName: "map.fill")
                    VStack(alignment: .leading, spacing: 1) {
                        Text(item.boundSceneID.map(sceneName) ?? template.name)
                            .font(.system(size: 14, weight: .black, design: .rounded))
                        Text("Go there — not used up yet")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .opacity(0.7)
                    }
                    Spacer()
                    Image(systemName: "arrow.right.circle.fill")
                }
                .foregroundStyle(.indigo)
                .padding(10)
                .background(Color.mint.opacity(0.22), in: RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.pocket.kit.\(item.id)")
        } else {
            Button(action: onTakeFactoryToBlankSlate) {
                HStack {
                    Image(systemName: template.fallbackIcon)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(template.name)
                            .font(.system(size: 14, weight: .black, design: .rounded))
                        Text("Take to Blank Slate to place")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .opacity(0.7)
                    }
                    Spacer()
                }
                .foregroundStyle(.indigo)
                .padding(10)
                .background(Color.indigo.opacity(0.10), in: RoundedRectangle(cornerRadius: 14))
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.pocket.item.\(item.id)")
        }
    }
}

#Preview {
    WorldMapView(viewModel: World2ViewModel())
}
