import SwiftUI
import UIKit

struct World2MutableSceneView: View {
    @ObservedObject var viewModel: World2ViewModel
    @ObservedObject private var developerSession = World2DeveloperSession.shared
    @ObservedObject private var backdropStore = World2SceneBackdropStore.shared

    @State private var isAuthoringPlaceholder = false
    @State private var showingBackdropEditor = false
    @State private var layoutAddMode: LayoutAddMode? = nil
    @State private var chromeVisible = true
    @State private var chromeHideTask: Task<Void, Never>?
    @State private var backdropURLDraft = ""
    @State private var backdropStatus: String?
    @State private var showingSceneInvent = false
    @State private var isArrangingFurniture = false
    @State private var selectedFurnitureID: String?
    @State private var selectedCatalogItemID: String?
    @State private var decorateFilter: DecorateFilterID = .mine
    @State private var lookPan: CGSize = .zero
    @GestureState private var livePan: CGSize = .zero

    private enum LayoutAddMode: String, Identifiable {
        case poiHardpoint
        case portalHardpoint
        case portal
        case poi

        var id: String { rawValue }

        var instruction: String {
            switch self {
            case .poiHardpoint: return "Tap to drop a POI hardpoint"
            case .portalHardpoint: return "Tap to drop a portal hardpoint"
            case .portal: return "Tap to place a portal exit"
            case .poi: return "Tap to place the armed inventory POI"
            }
        }
    }

    private var developerMode: Bool { developerSession.isEnabled }
    private var hasArmedInventoryItem: Bool {
        viewModel.selectedPlaceInventoryItemID != nil
    }

    private var scenePalette: World2ScenePalette {
        let custom = backdropStore.image(forSceneID: viewModel.currentMutableSceneID)
        let plate = AssetBootstrapService.shared.image(
            for: viewModel.currentMutableScene.backgroundAsset
        )
        return World2ScenePalette.detect(from: custom ?? plate)
    }

    private var visiblePlaces: [World2PlacedPlaceInstance] {
        guard developerMode else { return viewModel.currentScenePlaces }
        return viewModel.currentScenePlaces.filter { place in
            let isPortalish = place.templateID == .worldSeed && place.seedGrowth == .portal
            if isPortalish {
                return developerSession.showPortals
            }
            return developerSession.showPOIs
        }
    }

    private var visibleExits: [World2SceneExit] {
        guard !isArrangingFurniture else { return [] }
        guard developerMode else { return viewModel.currentSceneExits }
        return developerSession.showPortals ? viewModel.currentSceneExits : []
    }

    private var visibleHardpoints: [World2SceneHardpoint] { [] }

    private func sceneLabelPass(mapRect: CGRect, viewSize: CGSize) -> some View {
        TimelineView(.animation(minimumInterval: 1.0 / 20.0)) { timeline in
            var build = World2SceneLabelBuild()
            build.addChrome(viewSize: viewSize, includeBottomTray: isArrangingFurniture)
            for instance in visiblePlaces {
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
            for exit in visibleExits {
                let anchor = CGPoint(
                    x: mapRect.minX + mapRect.width * exit.x,
                    y: mapRect.minY + mapRect.height * exit.y
                )
                build.addArtworkObstacle(
                    CGRect(x: anchor.x - 100, y: anchor.y - 28, width: 200, height: 56)
                )
            }
            for piece in viewModel.party.pieces(at: timeline.date) {
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
            return World2SceneLabelPass(
                items: build.items,
                obstacles: build.obstacles,
                bounds: CGRect(origin: .zero, size: viewSize)
            )
        }
        .zIndex(22)
        .allowsHitTesting(false)
    }

    var body: some View {
        GeometryReader { geometry in
            let plateSize = plateImageSize()
            let covered = WorldMapView.coveredMapRect(imageSize: plateSize, in: geometry.size)
            let fitted = WorldMapView.fittedMapRect(imageSize: plateSize, in: geometry.size)
            let overflows = covered.width > geometry.size.width + 2
                || covered.height > geometry.size.height + 2
            let baseRect = overflows ? covered : fitted
            let mapRect = Self.pannedRect(
                base: baseRect,
                pan: CGSize(
                    width: lookPan.width + livePan.width,
                    height: lookPan.height + livePan.height
                ),
                in: geometry.size
            )

            ZStack {
                // Letterbox fill behind the fitted plate (not a cropped cover).
                Color.black.opacity(0.88).ignoresSafeArea()

                sceneGround(mapRect: mapRect)
                    .frame(width: mapRect.width, height: mapRect.height)
                    .clipped()
                    .position(x: mapRect.midX, y: mapRect.midY)
                    .contentShape(Rectangle())
                    .gesture(
                        SpatialTapGesture()
                            .onEnded { tap in
                                bumpChrome()
                                handleSceneTap(
                                    at: tap.location,
                                    in: mapRect.size
                                )
                            }
                    )
                    .simultaneousGesture(
                        DragGesture()
                            .updating($livePan) { value, state, _ in
                                guard overflows else { return }
                                state = value.translation
                            }
                            .onEnded { value in
                                guard overflows else { return }
                                lookPan.width += value.translation.width
                                lookPan.height += value.translation.height
                                lookPan = Self.clampedPan(
                                    lookPan,
                                    base: baseRect,
                                    in: geometry.size
                                )
                            }
                    )

                ForEach(visiblePlaces.filter(\.hasSkySpotlight)) { instance in
                    World2SkySpotlightEmbellishment(
                        sceneSize: mapRect.size,
                        anchor: CGPoint(
                            x: mapRect.width * instance.x,
                            y: mapRect.height * instance.y
                        )
                    )
                    .frame(width: mapRect.width, height: mapRect.height)
                    .position(x: mapRect.midX, y: mapRect.midY)
                    .allowsHitTesting(false)
                    .zIndex(8)
                    .accessibilityHidden(true)
                }

                ForEach(visiblePlaces) { instance in
                    World2MutableScenePlaceMarker(
                        instance: instance,
                        onEnter: {
                            bumpChrome()
                            viewModel.enterPlacedPlace(instance.id)
                        },
                        showsTitle: false,
                        showsNewBadge: World2WorldSync.shared.showsNewBadge(for: instance.id)
                    )
                    .position(
                        x: mapRect.minX + mapRect.width * instance.x,
                        y: mapRect.minY + mapRect.height * instance.y
                    )
                    .zIndex(10)
                }

                ForEach(visibleExits) { exit in
                    World2PlaceholderExitMarker(exit: exit) {
                        bumpChrome()
                        viewModel.traverseSceneExit(exit.id)
                    }
                    .position(
                        x: mapRect.minX + mapRect.width * exit.x,
                        y: mapRect.minY + mapRect.height * exit.y
                    )
                    .zIndex(12)
                }

                World2SceneDecorateLayer(
                    surfaceKey: World2DecorateSurface.key(forScene: viewModel.currentMutableSceneID),
                    mapRect: mapRect,
                    isArranging: isArrangingFurniture,
                    selectedFurnitureID: $selectedFurnitureID,
                    selectedCatalogItemID: $selectedCatalogItemID
                )
                .zIndex(16)

                if World2WorldSync.shared.presentsParty {
                    World2PartyLayer(
                        party: viewModel.party,
                        mapRect: mapRect,
                        showsNames: false
                    )
                    .zIndex(18)
                }

                sceneLabelPass(mapRect: mapRect, viewSize: geometry.size)

                // Ephemeral chrome — fades after idle so the scene can breathe.
                VStack(spacing: 8) {
                    if chromeVisible {
                        header
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    if developerMode, developerSession.layoutToolbarVisible {
                        devToolsStrip
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    if let banner = contextualBanner {
                        Label(banner.text, systemImage: banner.symbol)
                            .font(.system(size: 14, weight: .black, design: .rounded))
                            .foregroundStyle(banner.tint)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(.black.opacity(0.72), in: Capsule())
                            .transition(.opacity)
                    }

                    Spacer(minLength: 0)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .padding(.horizontal, 20)
                .padding(.top, 14)
                .animation(.easeOut(duration: 0.25), value: chromeVisible)
                .animation(.easeOut(duration: 0.2), value: developerSession.activeDevTool)
                .animation(.easeOut(duration: 0.2), value: developerSession.layoutDiagMode)
                .zIndex(50)
            }
            .overlay(alignment: .bottom) {
                if World2WorldSync.shared.presentsParty, !isArrangingFurniture {
                    World2DualStickControls(party: viewModel.party)
                }
            }
            .overlay(alignment: .bottom) {
                if isArrangingFurniture {
                    World2DecorateTray(
                        playerName: viewModel.currentMutableScene.name,
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
                    .zIndex(90)
                }
            }
            .frame(width: geometry.size.width, height: geometry.size.height)
        }
        .ignoresSafeArea()
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
        .sheet(isPresented: $showingBackdropEditor) {
            backdropEditorSheet
        }
        .sheet(isPresented: $showingSceneInvent) {
            let mutable = viewModel.currentMutableScene
            let plate = backdropStore.image(forSceneID: viewModel.currentMutableSceneID)
                ?? AssetBootstrapService.shared.image(for: mutable.backgroundAsset)
            World2SceneInventDecorationsView(
                scene: mutable,
                plateImage: plate,
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
        .onAppear {
            logSceneState()
            bumpChrome()
            if viewModel.party.sceneVisitID == 0 {
                viewModel.party.enterScene(.defaultSpawn)
            }
            if viewModel.consumeStartSceneDecoratingFlag() {
                beginDecoratingThisScene()
            }
        }
        .onChange(of: viewModel.sceneDecorateTick) { _, _ in
            beginDecoratingThisScene()
        }
        .onChange(of: viewModel.sandboxInventTick) { _, _ in
            showingSceneInvent = true
        }
        .onChange(of: viewModel.currentMutableSceneID) {
            viewModel.selectedPlaceInventoryItemID = nil
            layoutAddMode = nil
            isArrangingFurniture = false
            logSceneState()
            bumpChrome()
        }
        .onChange(of: viewModel.placeInventory) {
            guard let selected = viewModel.selectedPlaceInventoryItemID,
                  viewModel.placeInventory.contains(where: { $0.id == selected }) else {
                viewModel.selectedPlaceInventoryItemID = nil
                return
            }
        }
        .onChange(of: hasArmedInventoryItem) { _, armed in
            if armed { bumpChrome() }
        }
        .onDisappear {
            chromeHideTask?.cancel()
        }
    }

    private func beginDecoratingThisScene() {
        decorateFilter = .mine
        if let highlight = viewModel.consumeInventoryHighlight() {
            selectedFurnitureID = highlight
        }
        isArrangingFurniture = true
        bumpChrome()
        viewModel.dismissInventReadyPrompt()
        _ = viewModel.consumePendingDecorateTarget()
        _ = viewModel.consumeStartSceneDecoratingFlag()
        World2Diagnostics.log(
            "scene_decorate_opened",
            [
                "scene": viewModel.currentMutableSceneID,
                "surface": World2DecorateSurface.key(forScene: viewModel.currentMutableSceneID),
            ]
        )
    }

    private var contextualBanner: (text: String, symbol: String, tint: Color)? {
        if hasArmedInventoryItem {
            return (placementInstruction, "hand.tap.fill", .yellow)
        }
        if let layoutAddMode {
            return (layoutAddMode.instruction, "hand.tap.fill", .orange)
        }
        return nil
    }

    private static func pannedRect(base: CGRect, pan: CGSize, in viewSize: CGSize) -> CGRect {
        var origin = CGPoint(
            x: base.origin.x + pan.width,
            y: base.origin.y + pan.height
        )
        let minX = min(40, viewSize.width - base.width - 40)
        let maxX = 40.0
        let minY = min(40, viewSize.height - base.height - 40)
        let maxY = 40.0
        origin.x = min(maxX, max(minX, origin.x))
        origin.y = min(maxY, max(minY, origin.y))
        return CGRect(origin: origin, size: base.size)
    }

    private static func clampedPan(_ pan: CGSize, base: CGRect, in viewSize: CGSize) -> CGSize {
        let minX = min(40, viewSize.width - base.width - 40) - base.origin.x
        let maxX = 40 - base.origin.x
        let minY = min(40, viewSize.height - base.height - 40) - base.origin.y
        let maxY = 40 - base.origin.y
        return CGSize(
            width: min(maxX, max(minX, pan.width)),
            height: min(maxY, max(minY, pan.height))
        )
    }

    private func plateImageSize() -> CGSize {
        if let custom = backdropStore.image(forSceneID: viewModel.currentMutableSceneID) {
            return custom.size
        }
        if let painted = AssetBootstrapService.shared.image(
            for: viewModel.currentMutableScene.backgroundAsset
        ) {
            return painted.size
        }
        return CGSize(width: 16, height: 9)
    }

    private func bumpChrome() {
        chromeHideTask?.cancel()
        withAnimation(.easeOut(duration: 0.2)) { chromeVisible = true }
        chromeHideTask = Task { @MainActor in
            try? await Task.sleep(for: .seconds(3.5))
            guard !Task.isCancelled else { return }
            // Keep chrome up while actively placing / editing layout.
            if hasArmedInventoryItem || layoutAddMode != nil
                || developerSession.activeDevTool != .play {
                bumpChrome()
                return
            }
            withAnimation(.easeOut(duration: 0.35)) { chromeVisible = false }
        }
    }

    private func sceneGround(mapRect: CGRect) -> some View {
        ZStack {
            if let custom = backdropStore.image(forSceneID: viewModel.currentMutableSceneID) {
                Image(uiImage: custom)
                    .resizable()
                    .scaledToFit()
            } else if let painted = AssetBootstrapService.shared.image(
                for: viewModel.currentMutableScene.backgroundAsset
            ) {
                Image(uiImage: painted)
                    .resizable()
                    .scaledToFit()
            } else {
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
            }

            if viewModel.currentScenePlaces.isEmpty,
               viewModel.currentSceneExits.isEmpty,
               backdropStore.image(forSceneID: viewModel.currentMutableSceneID) == nil {
                VStack(spacing: 10) {
                    Image(systemName: "square.dashed.inset.filled")
                        .font(.system(size: 48, weight: .light))
                    Text("Waiting for its first place")
                        .font(.system(size: 18, weight: .black, design: .rounded))
                    Text(emptySceneInstruction)
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                }
                .foregroundStyle(.white.opacity(0.72))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
            }
        }
        .frame(width: mapRect.width, height: mapRect.height)
    }

    private var emptySceneInstruction: String {
        if developerMode {
            return "Use the layout toolbar, or open your avatar menu to place a POI."
        }
        return "Open your avatar menu to place a POI from inventory."
    }

    private var placementInstruction: String {
        "Tap anywhere on the scene to place"
    }

    /// Flexible title slot + one optional action. Placement status lives in the
    /// ephemeral contextual banner, not a permanent right-side pill.
    private var header: some View {
        HStack(alignment: .center, spacing: 10) {
            Button(action: viewModel.returnFromMutableScene) {
                Label(
                    viewModel.canReturnToPreviousMutableScene ? "Back" : "Home",
                    systemImage: "arrow.left"
                )
                .font(.system(size: 14, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 9)
                .background(scenePalette.accent.opacity(0.92), in: Capsule())
            }
            .buttonStyle(.plain)
            .fixedSize()
            .accessibilityIdentifier("world2.mutableScene.back")

            VStack(alignment: .leading, spacing: 2) {
                Text(viewModel.currentMutableScene.name)
                    .font(.system(size: 20, weight: .black, design: .rounded))
                    .foregroundStyle(scenePalette.titleInk)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)
                Text(viewModel.currentMutableScene.summary)
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(scenePalette.subtitleInk)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(scenePalette.chromeFill, in: RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(scenePalette.chromeStroke, lineWidth: 1)
            )
            .layoutPriority(-1)

            if developerMode {
                Button {
                    showingBackdropEditor = true
                    bumpChrome()
                } label: {
                    Image(systemName: "photo.on.rectangle.angled")
                        .font(.system(size: 13, weight: .black))
                        .foregroundStyle(.white)
                        .padding(9)
                        .background(scenePalette.accent.opacity(0.92), in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Change scene image")
                .accessibilityIdentifier("world2.mutableScene.changeBackdrop")
            }
        }
    }

    private var layoutToolbar: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text("LAYOUT")
                    .font(.system(size: 11, weight: .black, design: .rounded))
                    .foregroundStyle(.orange)
                visibilityChip("POIs", on: developerSession.showPOIs) {
                    developerSession.showPOIs.toggle()
                }
                visibilityChip("Portals", on: developerSession.showPortals) {
                    developerSession.showPortals.toggle()
                }
                Spacer(minLength: 0)
            }

            HStack(spacing: 8) {
                addModeChip("Add portal", mode: .portal, symbol: "globe.desk.fill")
                addModeChip("Place POI", mode: .poi, symbol: "building.2.fill")
                Button {
                    isAuthoringPlaceholder = true
                    bumpChrome()
                } label: {
                    Label("Birth Exit", systemImage: "door.left.hand.open")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                }
                .buttonStyle(.bordered)
                .tint(.orange)
                .accessibilityIdentifier("world2.developer.birthPlaceholder")
                Spacer(minLength: 0)
            }
        }
        .padding(10)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(.orange.opacity(0.55), lineWidth: 1.5)
        )
        .accessibilityIdentifier("world2.mutableScene.layoutToolbar")
    }

    private var devToolsStrip: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Text("DEV")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .foregroundStyle(.orange.opacity(0.9))

                ForEach(World2DevTool.allCases) { tool in
                    Button {
                        bumpChrome()
                        withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                            developerSession.activeDevTool = tool
                            if tool == .play {
                                layoutAddMode = nil
                            }
                        }
                    } label: {
                        Label(
                            tool == .play ? "Interact" : tool.title,
                            systemImage: tool == .play ? "figure.walk" : tool.symbolName
                        )
                            .font(.system(size: 11, weight: .black, design: .rounded))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 7)
                            .background(
                                developerSession.activeDevTool == tool
                                    ? (tool == .play ? Color.green.opacity(0.92) : Color.orange.opacity(0.9))
                                    : Color.black.opacity(0.35),
                                in: Capsule()
                            )
                            .foregroundStyle(.white)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.mutableScene.devTool.\(tool.rawValue)")
                }

                if developerSession.activeDevTool == .layout {
                    World2DevRefineButton(accessibilityID: "world2.dev.refine.layout") {
                        guard let id = selectedFurnitureID,
                              let player = PlayerStateService.shared.currentPlayer,
                              let instance = player.decorations.first(where: { $0.id == id })
                        else { return }
                        let label = World2RoomPiece.resolve(
                            instance.decorationId,
                            player: player
                        )?.name ?? "prop"
                        World2DevRefine.decoration(
                            instanceID: id,
                            label: label,
                            placeName: viewModel.currentMutableScene.name
                        )
                    }
                }

                Spacer(minLength: 0)

                if developerSession.activeDevTool == .layout {
                    ForEach(World2LayoutDiagMode.allCases) { mode in
                        Button {
                            bumpChrome()
                            developerSession.layoutDiagMode = mode
                        } label: {
                            Text(mode.title)
                                .font(.system(size: 10, weight: .black, design: .rounded))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 6)
                                .background(
                                    developerSession.layoutDiagMode == mode
                                        ? Color.cyan.opacity(0.85)
                                        : Color.black.opacity(0.3),
                                    in: Capsule()
                                )
                                .foregroundStyle(.white)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("world2.mutableScene.layoutDiag.\(mode.rawValue)")
                    }
                }
            }

            if developerSession.activeDevTool == .layout {
                switch developerSession.layoutDiagMode {
                case .full:
                    layoutToolbar
                case .min:
                    HStack(spacing: 8) {
                        addModeChip("Add portal", mode: .portal, symbol: "globe.desk.fill")
                        addModeChip("Place POI", mode: .poi, symbol: "building.2.fill")
                        Spacer(minLength: 0)
                    }
                case .off:
                    EmptyView()
                }
            } else if developerSession.activeDevTool == .invent {
                HStack(spacing: 8) {
                    Button {
                        bumpChrome()
                        showingSceneInvent = true
                    } label: {
                        Label("Invent props", systemImage: "wand.and.stars")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.purple.opacity(0.9), in: Capsule())
                            .foregroundStyle(.white)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.mutableScene.inventOpen")

                    Button {
                        bumpChrome()
                        beginDecoratingThisScene()
                    } label: {
                        Label("Decorate scene", systemImage: "paintbrush.pointed.fill")
                            .font(.system(size: 12, weight: .black, design: .rounded))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.pink.opacity(0.9), in: Capsule())
                            .foregroundStyle(.white)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.mutableScene.decorateOpen")

                    Spacer(minLength: 0)
                }
            }
        }
        .accessibilityIdentifier("world2.mutableScene.devTools")
    }

    private func visibilityChip(
        _ title: String,
        on: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 11, weight: .black, design: .rounded))
                .padding(.horizontal, 9)
                .padding(.vertical, 6)
                .background(on ? Color.orange.opacity(0.85) : Color.black.opacity(0.35), in: Capsule())
                .foregroundStyle(.white)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.layout.visibility.\(title)")
    }

    private func addModeChip(
        _ title: String,
        mode: LayoutAddMode,
        symbol: String
    ) -> some View {
        let selected = layoutAddMode == mode
        return Button {
            layoutAddMode = selected ? nil : mode
        } label: {
            Label(title, systemImage: symbol)
                .font(.system(size: 11, weight: .black, design: .rounded))
                .padding(.horizontal, 9)
                .padding(.vertical, 6)
                .background(selected ? Color.yellow.opacity(0.9) : Color.black.opacity(0.35), in: Capsule())
                .foregroundStyle(selected ? Color.black : Color.white)
        }
        .buttonStyle(.plain)
        .accessibilityIdentifier("world2.layout.add.\(mode.rawValue)")
    }

    private var backdropEditorSheet: some View {
        NavigationStack {
            Form {
                Section("Paste a picture") {
                    Button("Use image from clipboard") {
                        pasteBackdropFromClipboard()
                    }
                    .accessibilityIdentifier("world2.mutableScene.backdrop.clipboard")
                }
                Section("Or load from HTTPS URL") {
                    TextField("https://…", text: $backdropURLDraft)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.URL)
                        .accessibilityIdentifier("world2.mutableScene.backdrop.url")
                    Button("Fetch URL") {
                        Task { await fetchBackdropFromURL() }
                    }
                    .disabled(backdropURLDraft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                if backdropStore.image(forSceneID: viewModel.currentMutableSceneID) != nil {
                    Section {
                        Button("Clear custom backdrop", role: .destructive) {
                            backdropStore.clear(sceneID: viewModel.currentMutableSceneID)
                            backdropStatus = "Cleared — blank plate restored."
                        }
                    }
                }
                if let backdropStatus {
                    Section {
                        Text(backdropStatus)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle("Scene Image")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { showingBackdropEditor = false }
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func placeSelectedItem(on hardpoint: World2SceneHardpoint) {
        guard let itemID = viewModel.selectedPlaceInventoryItemID else { return }
        _ = viewModel.placeInventoryItem(
            itemID,
            x: hardpoint.x,
            y: hardpoint.y,
            hardpointID: hardpoint.id
        )
    }

    private func handleSceneTap(at point: CGPoint, in size: CGSize) {
        guard size.width > 0, size.height > 0 else { return }
        let x = Double(point.x / size.width)
        let y = Double(point.y / size.height)

        if let layoutAddMode, developerMode {
            switch layoutAddMode {
            case .poiHardpoint, .portalHardpoint:
                // POI hardpoints retired — treat pad taps as freehand place.
                placeFreeformItem(at: point, in: size)
            case .portal:
                _ = PlayerStateService.shared.addPortalExit(
                    from: viewModel.currentMutableSceneID,
                    x: x,
                    y: y
                )
            case .poi:
                if viewModel.selectedPlaceInventoryItemID != nil {
                    placeFreeformItem(at: point, in: size)
                } else {
                    viewModel.showToast("Pick a POI from your avatar menu inventory first.")
                }
            }
            self.layoutAddMode = nil
            return
        }

        placeFreeformItem(at: point, in: size)
    }

    private func placeFreeformItem(at point: CGPoint, in size: CGSize) {
        guard let itemID = viewModel.selectedPlaceInventoryItemID,
              size.width > 0,
              size.height > 0 else {
            return
        }
        _ = viewModel.placeInventoryItem(
            itemID,
            x: point.x / size.width,
            y: point.y / size.height
        )
    }

    private func pasteBackdropFromClipboard() {
        if let image = UIPasteboard.general.image {
            if backdropStore.store(image, forSceneID: viewModel.currentMutableSceneID) {
                backdropStatus = "Backdrop set from clipboard."
                showingBackdropEditor = false
            } else {
                backdropStatus = "Could not save that clipboard image."
            }
            return
        }
        if let urlString = UIPasteboard.general.string,
           let url = URL(string: urlString),
           url.scheme?.lowercased() == "https" {
            backdropURLDraft = urlString
            Task { await fetchBackdropFromURL() }
            return
        }
        backdropStatus = "Clipboard has no image (or HTTPS link)."
    }

    private func fetchBackdropFromURL() async {
        let trimmed = backdropURLDraft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed), url.scheme?.lowercased() == "https" else {
            backdropStatus = "Need a full https:// image URL."
            return
        }
        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
                backdropStatus = "Download failed (\(http.statusCode))."
                return
            }
            if backdropStore.store(data: data, forSceneID: viewModel.currentMutableSceneID) {
                backdropStatus = "Backdrop set from URL."
                showingBackdropEditor = false
            } else {
                backdropStatus = "URL did not decode as an image."
            }
        } catch {
            backdropStatus = "Could not fetch that URL."
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

struct World2PlaceInventoryRow: View {
    let item: World2PlaceInventoryItem
    let isSelected: Bool
    let onSelect: () -> Void

    private var template: World2PlaceTemplate {
        World2PlaceTemplate.template(for: item.templateID)
    }

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 10) {
                placeInventoryIcon(for: item)
                    .frame(width: 62, height: 62)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 3) {
                    Text(template.name)
                        .font(.system(size: 15, weight: .black, design: .rounded))
                    Text(isSelected ? "Ready to place" : "Tap to choose")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .opacity(0.72)
                }

                Spacer()
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
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
        .accessibilityLabel("Place \(template.name)")
        .accessibilityValue(isSelected ? "Selected" : "Not selected")
        .accessibilityIdentifier("world2.placeInventory.item.\(item.id)")
    }

    @ViewBuilder
    private func placeInventoryIcon(for item: World2PlaceInventoryItem) -> some View {
        let template = World2PlaceTemplate.template(for: item.templateID)
        World2SemanticImage(
            semanticName: template.inventorySemanticName,
            fallbackIcon: template.fallbackIcon,
            fallbackLabel: template.name
        )
        .scaledToFit()
    }
}

/// The big "put it here" ring a player taps in a player-mutable scene. Distinct
/// from the scene editor's World2HardpointMarker, which is a developer tool.
struct World2PlaceDropTarget: View {
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
        World2ExitMarker(
            title: exit.name,
            subtitle: "EXIT",
            edge: .trailing,
            tint: .orange,
            compact: true,
            action: onEnter
        )
        .accessibilityHint(exit.summary)
        .accessibilityIdentifier("world2.mutableScene.exit.\(exit.id)")
    }
}

struct World2MutableScenePlaceMarker: View {
    let instance: World2PlacedPlaceInstance
    let onEnter: () -> Void
    /// False when the scene label pass draws the title instead.
    var showsTitle: Bool = true
    var showsNewBadge: Bool = false
    @State private var isPulsing = false

    var body: some View {
        Button(action: onEnter) {
            VStack(spacing: 6) {
                ZStack {
                    Ellipse()
                        .fill(.orange.opacity(isPulsing ? 0.45 : 0.24))
                        .frame(width: 164, height: 90)
                        .blur(radius: 18)

                    World2PlaceMapArt(instance: instance)
                    .scaledToFit()
                    .frame(width: 185, height: 150)
                    .shadow(color: .orange.opacity(0.55), radius: 14, y: 6)

                    if showsNewBadge {
                        World2NewBadge(size: 52)
                            .offset(x: 62, y: -58)
                    }
                }
                .scaleEffect(isPulsing ? 1.04 : 0.98)

                Label(instance.mapLabel, systemImage: "door.left.hand.open")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 11)
                    .padding(.vertical, 6)
                    .background(.orange.opacity(0.94), in: Capsule())
                    .opacity(showsTitle ? 1 : 0)
                    .accessibilityHidden(!showsTitle)
            }
        }
        .buttonStyle(.plain)
        .onAppear { isPulsing = true }
        .animation(
            .easeInOut(duration: 1.1).repeatForever(autoreverses: true),
            value: isPulsing
        )
        .accessibilityLabel("Enter \(instance.mapLabel)")
        .accessibilityHint("Go inside to use this place")
        .accessibilityIdentifier("world2.placedPlace.\(instance.id)")
    }
}

struct World2SkySpotlightEmbellishment: View {
    let sceneSize: CGSize
    /// Center of the placed place marker in scene coordinates.
    let anchor: CGPoint

    /// How far above the marker center the beam starts (crown of the art).
    private let crownOffset: CGFloat = 78
    private let baseHalfWidth: CGFloat = 36
    private let topHalfWidth: CGFloat = 120

    var body: some View {
        let crown = CGPoint(x: anchor.x, y: max(0, anchor.y - crownOffset))
        Canvas { context, _ in
            var beam = Path()
            beam.move(to: CGPoint(x: crown.x - baseHalfWidth, y: crown.y))
            beam.addLine(to: CGPoint(x: crown.x + baseHalfWidth, y: crown.y))
            beam.addLine(to: CGPoint(x: crown.x + topHalfWidth, y: 0))
            beam.addLine(to: CGPoint(x: crown.x - topHalfWidth, y: 0))
            beam.closeSubpath()

            context.fill(
                beam,
                with: .linearGradient(
                    Gradient(stops: [
                        .init(color: Color.cyan.opacity(0.55), location: 0),
                        .init(color: Color.white.opacity(0.22), location: 0.45),
                        .init(color: Color.white.opacity(0.02), location: 1),
                    ]),
                    startPoint: crown,
                    endPoint: CGPoint(x: crown.x, y: 0)
                )
            )

            // Soft core so the beam reads as light, not a hard triangle.
            var core = Path()
            core.move(to: CGPoint(x: crown.x - baseHalfWidth * 0.35, y: crown.y))
            core.addLine(to: CGPoint(x: crown.x + baseHalfWidth * 0.35, y: crown.y))
            core.addLine(to: CGPoint(x: crown.x + topHalfWidth * 0.35, y: 0))
            core.addLine(to: CGPoint(x: crown.x - topHalfWidth * 0.35, y: 0))
            core.closeSubpath()
            context.fill(core, with: .color(Color.white.opacity(0.28)))
        }
        .frame(width: sceneSize.width, height: sceneSize.height)
        .blendMode(.screen)
        .accessibilityIdentifier("world2.embellishment.skySpotlight")
    }
}

private struct World2PlaceMapArt: View {
    let instance: World2PlacedPlaceInstance

    private var template: World2PlaceTemplate {
        World2PlaceTemplate.template(for: instance.templateID)
    }

    var body: some View {
        World2SemanticImage(
            semanticName: template.mapSemanticName(growth: instance.seedGrowth),
            fallbackIcon: template.fallbackIcon,
            fallbackLabel: template.name
        )
        .scaledToFit()
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
