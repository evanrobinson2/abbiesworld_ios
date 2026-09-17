import SwiftUI
import UIKit

struct World2MutableSceneView: View {
    @ObservedObject var viewModel: World2ViewModel
    @ObservedObject private var developerSession = World2DeveloperSession.shared
    @ObservedObject private var backdropStore = World2SceneBackdropStore.shared

    @State private var isAuthoringPlaceholder = false
    @State private var showingBackdropEditor = false
    @State private var layoutAddMode: LayoutAddMode? = nil
    @State private var layoutToolbarExpanded = false
    @State private var chromeVisible = true
    @State private var chromeHideTask: Task<Void, Never>?
    @State private var backdropURLDraft = ""
    @State private var backdropStatus: String?

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
        let bundled: UIImage? = {
            let asset = viewModel.currentMutableScene.backgroundAsset
            if ["map.blankWorld", "map.blankSlate"].contains(asset) {
                return UIImage(named: "world2_blank_world")
            }
            return AssetBootstrapService.shared.image(for: asset)
        }()
        return World2ScenePalette.detect(from: custom ?? bundled)
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
        guard developerMode else { return viewModel.currentSceneExits }
        return developerSession.showPortals ? viewModel.currentSceneExits : []
    }

    private var visibleHardpoints: [World2SceneHardpoint] {
        let pads = viewModel.currentMutableScene.hardpoints
        guard developerMode else {
            return hasArmedInventoryItem ? viewModel.availableSceneHardpoints : []
        }
        return pads.filter { pad in
            switch pad.purpose {
            case .place: return developerSession.showPOIHardpoints
            case .portal: return developerSession.showPortalHardpoints
            }
        }
    }

    var body: some View {
        GeometryReader { geometry in
            let plateSize = plateImageSize()
            let mapRect = WorldMapView.fittedMapRect(
                imageSize: plateSize,
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
                                // Convert from local plate coords.
                                handleSceneTap(
                                    at: tap.location,
                                    in: mapRect.size
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
                    World2MutableScenePlaceMarker(instance: instance) {
                        bumpChrome()
                        viewModel.enterPlacedPlace(instance.id)
                    }
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

                World2PartyLayer(
                    party: viewModel.party,
                    mapRect: mapRect
                )
                .zIndex(18)

                if shouldShowHardpoints {
                    ForEach(visibleHardpoints) { hardpoint in
                        World2PlaceDropTarget(hardpoint: hardpoint) {
                            bumpChrome()
                            placeSelectedItem(on: hardpoint)
                        }
                        .position(
                            x: mapRect.minX + mapRect.width * hardpoint.x,
                            y: mapRect.minY + mapRect.height * hardpoint.y
                        )
                        .zIndex(30)
                    }
                }

                // Ephemeral chrome — fades after idle so the scene can breathe.
                VStack(spacing: 8) {
                    if chromeVisible {
                        header
                            .transition(.opacity.combined(with: .move(edge: .top)))
                    }

                    if developerMode, developerSession.layoutToolbarVisible {
                        if layoutToolbarExpanded {
                            layoutToolbar
                                .transition(.opacity.combined(with: .move(edge: .top)))
                        } else if chromeVisible {
                            Button {
                                bumpChrome()
                                withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                                    layoutToolbarExpanded = true
                                }
                            } label: {
                                Label("Layout", systemImage: "slider.horizontal.3")
                                    .font(.system(size: 12, weight: .black, design: .rounded))
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(.orange.opacity(0.92), in: Capsule())
                            }
                            .buttonStyle(.plain)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .accessibilityIdentifier("world2.mutableScene.layoutCollapsed")
                        }
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
                .animation(.easeOut(duration: 0.2), value: layoutToolbarExpanded)
                .zIndex(50)
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
        .onAppear {
            logSceneState()
            bumpChrome()
            if viewModel.party.sceneVisitID == 0 {
                viewModel.party.enterScene(.defaultSpawn)
            }
        }
        .onChange(of: viewModel.currentMutableSceneID) {
            viewModel.selectedPlaceInventoryItemID = nil
            layoutAddMode = nil
            layoutToolbarExpanded = false
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

    private var shouldShowHardpoints: Bool {
        hasArmedInventoryItem || (developerMode && layoutAddMode != nil)
            || (developerMode && (developerSession.showPOIHardpoints || developerSession.showPortalHardpoints)
                && layoutToolbarExpanded)
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

    private func plateImageSize() -> CGSize {
        if let custom = backdropStore.image(forSceneID: viewModel.currentMutableSceneID) {
            return custom.size
        }
        if ["map.blankWorld", "map.blankSlate"].contains(
            viewModel.currentMutableScene.backgroundAsset
        ), let plate = UIImage(named: "world2_blank_world") {
            return plate.size
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
            if hasArmedInventoryItem || layoutAddMode != nil || layoutToolbarExpanded {
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
            } else if ["map.blankWorld", "map.blankSlate"].contains(
                viewModel.currentMutableScene.backgroundAsset
               ),
               let plate = UIImage(named: "world2_blank_world") {
                Image(uiImage: plate)
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
        if viewModel.currentMutableScene.hardpoints.isEmpty {
            return "Tap anywhere on the scene to place"
        }
        if viewModel.availableSceneHardpoints.isEmpty {
            return "All hardpoints are occupied"
        }
        return "Choose a glowing hardpoint"
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
                visibilityChip("POI pads", on: developerSession.showPOIHardpoints) {
                    developerSession.showPOIHardpoints.toggle()
                }
                visibilityChip("Portal pads", on: developerSession.showPortalHardpoints) {
                    developerSession.showPortalHardpoints.toggle()
                }
                Spacer(minLength: 0)
                Button {
                    withAnimation(.spring(response: 0.28, dampingFraction: 0.82)) {
                        layoutToolbarExpanded = false
                    }
                    bumpChrome()
                } label: {
                    Image(systemName: "chevron.up")
                        .font(.system(size: 12, weight: .black))
                        .foregroundStyle(.white)
                        .padding(7)
                        .background(.black.opacity(0.4), in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Collapse layout toolbar")
            }

            HStack(spacing: 8) {
                addModeChip("Add POI pad", mode: .poiHardpoint, symbol: "plus.circle")
                addModeChip("Add portal pad", mode: .portalHardpoint, symbol: "plus.diamond")
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
            case .poiHardpoint:
                _ = PlayerStateService.shared.addHardpoint(
                    to: viewModel.currentMutableSceneID,
                    purpose: .place,
                    x: x,
                    y: y
                )
            case .portalHardpoint:
                _ = PlayerStateService.shared.addHardpoint(
                    to: viewModel.currentMutableSceneID,
                    purpose: .portal,
                    x: x,
                    y: y
                )
            case .portal:
                _ = PlayerStateService.shared.addPortalExit(
                    from: viewModel.currentMutableSceneID,
                    x: x,
                    y: y
                )
            case .poi:
                // Arm placement: if inventory selected, free-place; else toast.
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
        guard viewModel.currentMutableScene.hardpoints.isEmpty
                || layoutAddMode == .poi,
              let itemID = viewModel.selectedPlaceInventoryItemID,
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
        if let catalog = template.inventoryCatalogName,
           let image = UIImage(named: catalog) {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
        } else {
            World2SemanticImage(
                semanticName: template.exteriorAsset,
                fallbackIcon: template.fallbackIcon,
                fallbackLabel: template.name
            )
            .scaledToFit()
        }
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
        Button(action: onEnter) {
            VStack(spacing: 7) {
                ZStack {
                    if let portal = UIImage(named: "world2_world_portal") {
                        Image(uiImage: portal)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 128, height: 128)
                    } else if let plate = UIImage(named: "under_construction") {
                        Image(uiImage: plate)
                            .resizable()
                            .scaledToFit()
                            .frame(width: 128, height: 128)
                    } else {
                        Image(systemName: "globe.desk.fill")
                            .font(.system(size: 68, weight: .bold))
                            .foregroundStyle(.white, .orange)
                            .frame(width: 116, height: 136)
                    }
                }
                .shadow(color: .orange.opacity(0.45), radius: 12, y: 4)

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

struct World2MutableScenePlaceMarker: View {
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

                    World2PlaceMapArt(instance: instance)
                    .scaledToFit()
                    .frame(width: 185, height: 150)
                    .shadow(color: .orange.opacity(0.55), radius: 14, y: 6)
                }
                .scaleEffect(isPulsing ? 1.04 : 0.98)

                Label(markerTitle, systemImage: "door.left.hand.open")
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
        .accessibilityLabel("Enter \(markerTitle)")
        .accessibilityHint("Go inside to use this place")
        .accessibilityIdentifier("world2.placedPlace.\(instance.id)")
    }

    private var markerTitle: String {
        switch instance.templateID {
        case .worldSeed:
            return instance.seedGrowth == .portal ? "World Portal" : "Seedling"
        default:
            return template.name
        }
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
        if let catalog = template.mapCatalogName(growth: instance.seedGrowth),
           let image = UIImage(named: catalog) {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
        } else {
            World2SemanticImage(
                semanticName: template.exteriorAsset,
                fallbackIcon: template.fallbackIcon,
                fallbackLabel: template.name
            )
            .scaledToFit()
        }
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
