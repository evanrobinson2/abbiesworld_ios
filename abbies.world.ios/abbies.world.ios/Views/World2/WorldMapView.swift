import SwiftUI

struct WorldMapView: View {
    @ObservedObject var viewModel: World2ViewModel
    @StateObject private var layoutStore = World2POILayoutStore()
    @ObservedObject private var developerSession = World2DeveloperSession.shared
    @State private var selectedDeveloperPOIId: String?
    @State private var showingDeveloperEditor = true

    private var developerMode: Bool { developerSession.isEnabled }

    private var worldSubtitle: String {
        switch viewModel.currentWorld?.id {
        case .work: return "Help the city's magical machines"
        case .farm: return "Discover something new in the meadow"
        default: return "Choose a place to visit"
        }
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                World2SemanticImage(
                    semanticName: viewModel.currentWorld?.backgroundAsset ?? "map.home",
                    fallbackIcon: "tree.fill",
                    fallbackLabel: "\(viewModel.currentWorld?.name ?? "World") artwork is not bundled"
                )
                .scaledToFill()
                .frame(width: geometry.size.width, height: geometry.size.height)
                .clipped()
                .overlay(Color.black.opacity(0.12))
                .ignoresSafeArea()

                if let world = viewModel.currentWorld {
                    ForEach(world.poiPlacements) { placement in
                        if let poi = viewModel.pois[placement.poiId] {
                            let layout = layoutStore.layout(for: placement)
                            World2POIMarker(
                                poi: poi,
                                placement: placement,
                                layout: layout,
                                geometry: geometry,
                                developerMode: developerMode,
                                isDeveloperSelected: selectedDeveloperPOIId == poi.id
                            ) {
                                if developerMode && showingDeveloperEditor {
                                    selectedDeveloperPOIId = poi.id
                                } else {
                                    withAnimation(.spring(response: 0.38, dampingFraction: 0.82)) {
                                        viewModel.inspectPOI(placement: placement)
                                    }
                                }
                            } onMove: { dx, dy in
                                layoutStore.move(poi.id, from: layout, dx: dx, dy: dy)
                            } onScale: { scale in
                                layoutStore.setScale(scale, for: poi.id, fallback: layout)
                            } onRotation: { rotation in
                                layoutStore.setRotation(rotation, for: poi.id, fallback: layout)
                            }
                        }
                    }
                }

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

                if let world = viewModel.currentWorld,
                   !world.adjacentWorlds.isEmpty {
                    World2TravelNavigation(
                        currentWorld: world.id,
                        destinations: world.adjacentWorlds,
                        onTravel: viewModel.switchWorld
                    )
                    .zIndex(20)
                }

                if viewModel.showingPOISheet,
                   let inspection = viewModel.inspectedPOI {
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
                    .frame(maxWidth: 760)
                    .background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 30))
                    .overlay {
                        RoundedRectangle(cornerRadius: 30)
                            .stroke(.white.opacity(0.72), lineWidth: 2)
                    }
                    .shadow(color: .black.opacity(0.32), radius: 24, y: 10)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 18)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(51)
                    .accessibilityIdentifier("world2.poi.drawer")
                }

                if developerMode,
                   showingDeveloperEditor,
                   let world = viewModel.currentWorld {
                    World2POILayoutEditor(
                        placements: world.poiPlacements,
                        pois: viewModel.pois,
                        selectedPOIId: $selectedDeveloperPOIId,
                        store: layoutStore
                    ) {
                        layoutStore.save()
                        withAnimation(.easeOut(duration: 0.2)) {
                            showingDeveloperEditor = false
                            selectedDeveloperPOIId = nil
                        }
                    }
                    .frame(maxWidth: 860)
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
                    .accessibilityIdentifier("world2.developer.layoutEditor")
                }

                if developerMode && !showingDeveloperEditor {
                    Button {
                        showingDeveloperEditor = true
                        selectedDeveloperPOIId =
                            viewModel.currentWorld?.poiPlacements.first?.poiId
                    } label: {
                        Label("Edit Layout", systemImage: "slider.horizontal.3")
                            .font(.system(size: 14, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .background(.orange, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .padding(.leading, 18)
                    .padding(.bottom, 18)
                    .frame(
                        maxWidth: .infinity,
                        maxHeight: .infinity,
                        alignment: .bottomLeading
                    )
                    .zIndex(80)
                    .accessibilityIdentifier("world2.developer.layoutEditor.open")
                }
            }
        }
        .accessibilityIdentifier("world2.homeWorld")
        .onAppear {
            layoutStore.selectPlayer(viewModel.currentPlayerId)
            if developerMode && selectedDeveloperPOIId == nil {
                selectedDeveloperPOIId = viewModel.currentWorld?.poiPlacements.first?.poiId
            }
        }
        .onChange(of: viewModel.currentPlayerId) {
            layoutStore.selectPlayer(viewModel.currentPlayerId)
        }
        .onChange(of: developerSession.isEnabled) {
            showingDeveloperEditor = developerSession.isEnabled
            selectedDeveloperPOIId = developerSession.isEnabled
                ? viewModel.currentWorld?.poiPlacements.first?.poiId
                : nil
        }
        .onChange(of: viewModel.currentWorld?.id) {
            if developerMode {
                selectedDeveloperPOIId = viewModel.currentWorld?.poiPlacements.first?.poiId
            }
        }
        .ignoresSafeArea()
    }
}

private struct World2TravelNavigation: View {
    let currentWorld: WorldId
    let destinations: [WorldId]
    let onTravel: (WorldId) -> Void

    var body: some View {
        ZStack {
            ForEach(destinations) { destination in
                World2TravelArrow(
                    title: destination.displayName,
                    direction: directionLabel(to: destination),
                    systemName: arrowIcon(to: destination),
                    tint: destination == .farm ? .green : .orange
                ) {
                    onTravel(destination)
                }
                .frame(
                    maxWidth: .infinity,
                    maxHeight: .infinity,
                    alignment: alignment(to: destination)
                )
                .padding(edgeInsets(to: destination))
                .accessibilityIdentifier("world2.world.\(destination.rawValue)")
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.world.travelArrows")
    }

    private func alignment(to destination: WorldId) -> Alignment {
        if currentWorld == .home {
            switch destination {
            case .farm: return .trailing
            case .work: return .bottomLeading
            default: return .top
            }
        }
        return .bottomLeading
    }

    private func edgeInsets(to destination: WorldId) -> EdgeInsets {
        if currentWorld == .home && destination == .farm {
            return EdgeInsets(top: 95, leading: 0, bottom: 95, trailing: 18)
        }
        return EdgeInsets(top: 0, leading: 18, bottom: 20, trailing: 0)
    }

    private func arrowIcon(to destination: WorldId) -> String {
        if currentWorld == .home {
            switch destination {
            case .farm: return "arrow.right"
            case .work: return "arrow.down.left"
            default: return "arrow.up"
            }
        }
        switch currentWorld {
        case .farm: return "arrow.left"
        case .work: return "arrow.up.right"
        default: return "arrow.left"
        }
    }

    private func directionLabel(to destination: WorldId) -> String {
        if destination == .home { return "BACK HOME" }
        return destination.direction?.uppercased() ?? "EXPLORE"
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

private struct World2POIMarker: View {
    let poi: POI
    let placement: POIPlacement
    let layout: World2POILayout
    let geometry: GeometryProxy
    let developerMode: Bool
    let isDeveloperSelected: Bool
    let onTap: () -> Void
    let onMove: (Double, Double) -> Void
    let onScale: (Double) -> Void
    let onRotation: (Double) -> Void
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isPulsing = false
    @GestureState private var dragOffset = CGSize.zero
    @GestureState private var gestureScale = 1.0
    @GestureState private var gestureRotation = Angle.zero

    private var glowColor: Color {
        if developerMode && isDeveloperSelected { return .orange }
        if poi.type == .minigame { return .cyan }
        return poi.type == .cardFactory
            ? .yellow
            : (poi.ownerId == PlayerId.ani.rawValue ? .purple : .pink)
    }

    var body: some View {
        Group {
            if developerMode {
                markerContent
                    .contentShape(Rectangle())
                    .onTapGesture(perform: onTap)
                    .gesture(dragGesture)
                    .simultaneousGesture(scaleGesture)
                    .simultaneousGesture(rotationGesture)
            } else {
                Button(action: onTap) {
                    markerContent
                }
                .buttonStyle(.plain)
            }
        }
        .position(
            x: geometry.size.width * layout.x,
            y: geometry.size.height * layout.y
        )
        .offset(dragOffset)
        .zIndex(Double(placement.zIndex))
        .onAppear {
            isPulsing = !reduceMotion
        }
        .onDisappear {
            isPulsing = false
        }
        .accessibilityLabel("Explore \(poi.name)")
        .accessibilityHint(
            developerMode
                ? "Drag to move, pinch to resize, or rotate with two fingers"
                : "Opens details about what is inside"
        )
        .accessibilityValue(
            developerMode
                ? String(
                    format: "x %.3f, y %.3f, scale %.2f, rotation %.1f degrees",
                    layout.x,
                    layout.y,
                    layout.scale,
                    layout.rotationDegrees
                )
                : ""
        )
        .accessibilityIdentifier("world2.poi.\(poi.id)")
    }

    private var markerContent: some View {
        VStack(spacing: 7) {
            ZStack {
                Ellipse()
                    .fill(glowColor.opacity((isPulsing || isDeveloperSelected) ? 0.58 : 0.28))
                    .frame(width: 180 * layout.scale, height: 100 * layout.scale)
                    .blur(radius: (isPulsing || isDeveloperSelected) ? 22 : 14)

                World2SemanticImage(
                    semanticName: poi.exteriorAsset,
                    fallbackIcon: poi.icon ?? "building.2.fill",
                    fallbackLabel: "\(poi.name) artwork is not bundled"
                )
                .scaledToFit()
                .frame(width: 230 * layout.scale, height: 205 * layout.scale)
                .shadow(
                    color: glowColor.opacity((isPulsing || isDeveloperSelected) ? 0.95 : 0.58),
                    radius: (isPulsing || isDeveloperSelected) ? 20 : 12
                )
                .shadow(color: .black.opacity(0.38), radius: 10, y: 6)

                if developerMode && isDeveloperSelected {
                    RoundedRectangle(cornerRadius: 22)
                        .stroke(.orange, style: StrokeStyle(lineWidth: 3, dash: [8, 6]))
                        .frame(width: 230 * layout.scale, height: 205 * layout.scale)
                }
            }
            .rotationEffect(.degrees(layout.rotationDegrees) + gestureRotation)
            .scaleEffect(
                (developerMode || reduceMotion ? 1 : (isPulsing ? 1.06 : 0.98))
                    * gestureScale
            )
            .animation(
                developerMode || reduceMotion
                    ? nil
                    : .easeInOut(duration: 1.15).repeatForever(autoreverses: true),
                value: isPulsing
            )

            Label(
                poi.name,
                systemImage: developerMode ? "move.3d" : "hand.tap.fill"
            )
            .font(.system(size: 16, weight: .black, design: .rounded))
            .foregroundStyle(.white)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(developerMode ? .orange.opacity(0.88) : .black.opacity(0.62), in: Capsule())
        }
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .updating($dragOffset) { value, state, _ in
                state = value.translation
            }
            .onEnded { value in
                guard geometry.size.width > 0, geometry.size.height > 0 else { return }
                onMove(
                    value.translation.width / geometry.size.width,
                    value.translation.height / geometry.size.height
                )
            }
    }

    private var scaleGesture: some Gesture {
        MagnificationGesture()
            .updating($gestureScale) { value, state, _ in
                state = value
            }
            .onEnded { value in
                onScale(layout.scale * value)
            }
    }

    private var rotationGesture: some Gesture {
        RotationGesture()
            .updating($gestureRotation) { value, state, _ in
                state = value
            }
            .onEnded { value in
                onRotation(layout.rotationDegrees + value.degrees)
            }
    }
}

private struct World2POILayoutEditor: View {
    let placements: [POIPlacement]
    let pois: [String: POI]
    @Binding var selectedPOIId: String?
    @ObservedObject var store: World2POILayoutStore
    let onDone: () -> Void

    private var selectedPlacement: POIPlacement? {
        placements.first { $0.poiId == selectedPOIId }
    }

    var body: some View {
        VStack(spacing: 10) {
            HStack {
                Label("WORLD 2 LAYOUT MODE", systemImage: "hammer.fill")
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .foregroundStyle(.orange)
                Text("Drag • pinch • rotate")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
                Spacer()
                Text(store.saveMessage)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(store.hasUnsavedChanges ? .orange : .green)
                    .accessibilityIdentifier("world2.developer.saveStatus")
            }

            HStack(spacing: 8) {
                ForEach(placements) { placement in
                    Button(pois[placement.poiId]?.name ?? placement.poiId) {
                        selectedPOIId = placement.poiId
                    }
                    .buttonStyle(.bordered)
                    .tint(selectedPOIId == placement.poiId ? .orange : .gray)
                }
                Spacer()
            }

            if let placement = selectedPlacement {
                let layout = store.layout(for: placement)
                HStack(spacing: 14) {
                    Text(
                        String(
                            format: "x %.3f  y %.3f  scale %.2f  rotation %.1f°",
                            layout.x,
                            layout.y,
                            layout.scale,
                            layout.rotationDegrees
                        )
                    )
                    .font(.system(.body, design: .monospaced, weight: .bold))
                    .accessibilityIdentifier("world2.developer.layoutValues")

                    Text("Scale")
                        .font(.caption.bold())
                    Slider(
                        value: Binding(
                            get: { store.layout(for: placement).scale },
                            set: {
                                store.setScale(
                                    $0,
                                    for: placement.poiId,
                                    fallback: store.layout(for: placement)
                                )
                            }
                        ),
                        in: 0.45...2.25
                    )
                    .frame(maxWidth: 150)
                    .accessibilityIdentifier("world2.developer.scale")

                    Text("Rotate")
                        .font(.caption.bold())
                    Slider(
                        value: Binding(
                            get: { store.layout(for: placement).rotationDegrees },
                            set: {
                                store.setRotation(
                                    $0,
                                    for: placement.poiId,
                                    fallback: store.layout(for: placement)
                                )
                            }
                        ),
                        in: -180...180
                    )
                    .frame(maxWidth: 150)
                    .accessibilityIdentifier("world2.developer.rotation")
                }

                HStack(spacing: 10) {
                    Button("Reset Selected", systemImage: "arrow.counterclockwise") {
                        store.reset(placement)
                    }
                    .buttonStyle(.bordered)

                    Button("Discard Unsaved", systemImage: "trash") {
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
                    .accessibilityIdentifier("world2.developer.save")

                    ShareLink(
                        item: store.exportJSON(),
                        subject: Text("World 2 POI Layout"),
                        message: Text("Bake this JSON into the app for reinstall-safe defaults.")
                    ) {
                        Label("Export JSON", systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.bordered)
                    .accessibilityIdentifier("world2.developer.export")

                    Spacer()

                    Button("Done", action: onDone)
                        .buttonStyle(.bordered)
                        .accessibilityIdentifier("world2.developer.done")
                }
            }

            Text(
                "Changes save automatically and survive launches and app updates. Export the JSON to bake it into reinstall-safe defaults."
            )
            .font(.system(size: 11, weight: .medium, design: .rounded))
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
    }
}

private struct World2POIInspectionDrawer: View {
    let poi: POI
    let isReadOnlyVisit: Bool
    let onEnter: () -> Void
    let onDismiss: () -> Void

    private var actionTitle: String {
        switch poi.type {
        case .home:
            return isReadOnlyVisit ? "Look Around" : "Decorate My Space"
        case .cardFactory:
            return "Create a Card"
        case .minigame:
            return poi.minigameType == "furniture_store"
                ? "Make Furniture"
                : "Save the Vowels"
        default:
            return "Start"
        }
    }

    private var actionIcon: String {
        switch poi.type {
        case .cardFactory: return "wand.and.stars"
        case .minigame:
            return poi.minigameType == "furniture_store"
                ? "hammer.fill"
                : "character.book.closed.fill"
        default: return "paintbrush.fill"
        }
    }

    private var activityDescription: String {
        switch poi.type {
        case .home:
            return isReadOnlyVisit
                ? "Step inside and explore this cozy treehouse."
                : "Step inside your treehouse and add a cozy touch to make the space feel like yours."
        case .cardFactory:
            return "Choose a Creature, Function, and Context, then reveal the magical card they make together."
        case .minigame:
            if poi.minigameType == "furniture_store" {
                return "Solve friendly little math tasks to earn ingredients. Any three ingredients can make any one furniture piece you choose for your treehouse."
            }
            return "Letters are escaping from the ceiling hoppers. Choose how wild the storm should be, then tap A, E, I, O, and U to send them safely into the collection tanks."
        default:
            return poi.description
        }
    }

    var body: some View {
        VStack(spacing: 14) {
            HStack(alignment: .top, spacing: 18) {
                Button(action: onEnter) {
                    ZStack(alignment: .bottom) {
                        World2SemanticImage(
                            semanticName: poi.exteriorAsset,
                            fallbackIcon: poi.icon ?? "building.2.fill",
                            fallbackLabel: "\(poi.name) artwork is not bundled"
                        )
                        .scaledToFit()
                        .frame(width: 150, height: 140)

                        Label("Tap to start", systemImage: "play.fill")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(.black.opacity(0.68), in: Capsule())
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(actionTitle) at \(poi.name)")
                .accessibilityIdentifier("world2.poi.preview.start")

                VStack(alignment: .leading, spacing: 8) {
                    Text("WHAT'S INSIDE")
                        .font(.system(size: 12, weight: .black, design: .rounded))
                        .foregroundStyle(.secondary)
                    Text(poi.name)
                        .font(.system(size: 28, weight: .black, design: .rounded))
                    Text(activityDescription)
                        .font(.system(size: 16, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            if isReadOnlyVisit {
                Label("Visiting — look around, but only the owner can make changes.", systemImage: "eye.fill")
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundStyle(.indigo)
                    .multilineTextAlignment(.center)
                    .accessibilityIdentifier("world2.poi.visitorNotice")
            }

            HStack(spacing: 16) {
                Button("Not Yet", action: onDismiss)
                    .buttonStyle(.bordered)
                    .accessibilityIdentifier("world2.poi.dismiss")

                Button(action: onEnter) {
                    Label(actionTitle, systemImage: actionIcon)
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .accessibilityIdentifier("world2.poi.enter")
            }
        }
        .padding(24)
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

#Preview {
    WorldMapView(viewModel: World2ViewModel())
}
