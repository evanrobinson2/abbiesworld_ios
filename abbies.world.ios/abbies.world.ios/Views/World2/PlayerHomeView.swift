import SwiftUI

struct World2PlayerHomeView: View {
    let poiId: String
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void
    let onOpenSettings: () -> Void
    let onOpenMusic: () -> Void

    @State private var cozyGlow = false
    @State private var isArrangingFurniture = false
    @State private var selectedFurnitureID: String?
    @State private var awardedStarterPack: FurnitureStarterPack?
    @State private var starterPackBurst = false
    @State private var isRoomDropTargeted = false
    @State private var draggingPlacedFurnitureID: String?
    /// The card the drawer should open on, set when a reward sends us here.
    @State private var highlightedInventoryID: String?

    private var poi: World2POIArchetype? { viewModel.archetype(poiId) }
    private var owner: PlayerId? { poi?.ownerID.flatMap(PlayerId.init(rawValue:)) }
    private var isReadOnly: Bool { viewModel.isReadOnlyVisit(to: poiId) }
    private var roomPlayer: PlayerState? {
        guard let owner else { return PlayerStateService.shared.currentPlayer }
        return PlayerStateService.shared.playerState(for: owner)
    }
    private var placedFurniture: [DecorationInstance] {
        guard let player = roomPlayer else {
            return []
        }
        let placedIDs = Set(
            player.homeLayout.placedDecorations.map(\.decorationInstanceId)
        )
        return player.furnitureInventory
            .filter { placedIDs.contains($0.id) }
            .sorted { $0.zIndex < $1.zIndex }
    }
    var body: some View {
        GeometryReader { room in
            let drawerWidth = min(max(room.size.width * 0.32, 270), 340)
            let canvasWidth = isArrangingFurniture
                ? room.size.width - drawerWidth
                : room.size.width
            let canvasSize = CGSize(width: canvasWidth, height: room.size.height)

            ZStack(alignment: .trailing) {
                ZStack {
                    World2SemanticImage(
                        semanticName: poi?.interiorAsset ?? "\(poiId).interior",
                        fallbackIcon: "house.fill",
                        fallbackLabel: "\(poi?.name ?? "Treehouse") interior artwork is not bundled"
                    )
                    .scaledToFill()
                    .frame(width: canvasWidth, height: room.size.height)
                    .clipped()

                    Color.yellow.opacity(cozyGlow ? 0.18 : 0)
                        .ignoresSafeArea()
                        .allowsHitTesting(false)

                    Color.cyan.opacity(isRoomDropTargeted ? 0.12 : 0)
                        .allowsHitTesting(false)

                    ForEach(placedFurniture) { instance in
                        if instance.decorationId == DecorationInstance.starterJukeboxID,
                           !isArrangingFurniture {
                            World2StarterJukeboxView(
                                instance: instance,
                                canvasSize: canvasSize,
                                onOpenMusic: onOpenMusic
                            )
                        } else if instance.decorationId == World2StoryDecoration.worldTeleporter.id,
                                  !isArrangingFurniture {
                            World2PlacedTeleporterView(
                                instance: instance,
                                canvasSize: canvasSize,
                                onUse: viewModel.openWorldTeleporter
                            )
                        } else if let piece = World2RoomPiece.resolve(
                            instance.decorationId,
                            player: roomPlayer
                        ) {
                            World2PlacedFurnitureView(
                                instance: instance,
                                piece: piece,
                                canvasSize: canvasSize,
                                isArranging: isArrangingFurniture,
                                isSelected: selectedFurnitureID == instance.id,
                                returnZoneMinX: isArrangingFurniture ? canvasWidth : nil,
                                onSelect: {
                                    if selectedFurnitureID != instance.id {
                                        selectedFurnitureID = instance.id
                                        PlayerStateService.shared.bringFurnitureToFront(
                                            instanceId: instance.id
                                        )
                                    }
                                },
                                onMove: { dx, dy in
                                    PlayerStateService.shared.updateFurnitureTransform(
                                        instanceId: instance.id,
                                        x: instance.x + dx,
                                        y: instance.y + dy
                                    )
                                },
                                onScale: { scale in
                                    PlayerStateService.shared.updateFurnitureTransform(
                                        instanceId: instance.id,
                                        scale: scale
                                    )
                                },
                                onRotation: { rotation in
                                    PlayerStateService.shared.updateFurnitureTransform(
                                        instanceId: instance.id,
                                        rotation: rotation
                                    )
                                },
                                onReturnToInventory: {
                                    PlayerStateService.shared.returnFurnitureToInventory(
                                        instanceId: instance.id
                                    )
                                    if selectedFurnitureID == instance.id {
                                        selectedFurnitureID = nil
                                    }
                                },
                                onDragStateChanged: { isDragging in
                                    draggingPlacedFurnitureID = isDragging ? instance.id : nil
                                }
                            )
                        }
                    }

                    VStack {
                        header
                        Spacer()
                        controls
                    }
                    .zIndex(10_000)
                }
                .frame(width: canvasWidth, height: room.size.height)
                .frame(maxWidth: .infinity, alignment: .leading)
                .clipped()
                .dropDestination(for: String.self) { instanceIDs, location in
                    guard isArrangingFurniture,
                          let instanceID = instanceIDs.first else {
                        return false
                    }
                    PlayerStateService.shared.placeFurniture(
                        instanceId: instanceID,
                        x: Double(location.x / canvasWidth),
                        y: Double(location.y / room.size.height)
                    )
                    selectedFurnitureID = instanceID
                    return true
                } isTargeted: { isTargeted in
                    isRoomDropTargeted = isTargeted
                }

                if isArrangingFurniture {
                    World2FurnitureDecoratorDrawer(
                        playerName: owner?.displayName ?? "Player",
                        width: drawerWidth,
                        isReturnTargetActive: draggingPlacedFurnitureID != nil,
                        highlightedInstanceID: highlightedInventoryID,
                        onDone: {
                            // The NEW! ribbons have done their job once she has
                            // had the drawer open, so retire them here.
                            PlayerStateService.shared.markInventorySeen()
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                                isArrangingFurniture = false
                                selectedFurnitureID = nil
                                draggingPlacedFurnitureID = nil
                                highlightedInventoryID = nil
                            }
                        },
                        onPlace: { instanceID in
                            PlayerStateService.shared.placeFurniture(instanceId: instanceID)
                            selectedFurnitureID = instanceID
                            if highlightedInventoryID == instanceID {
                                highlightedInventoryID = nil
                            }
                        },
                        onUse: { instanceID in
                            guard let decorationId = roomPlayer?.decorations
                                .first(where: { $0.id == instanceID })?
                                .decorationId,
                                  let story = World2StoryDecoration.decoration(id: decorationId)
                            else { return }
                            switch story.inventoryAction {
                            case .openWorldTeleporter:
                                viewModel.openWorldTeleporter()
                            case .none:
                                break
                            }
                        }
                    )
                    .frame(width: drawerWidth, height: room.size.height)
                    .transition(.move(edge: .trailing))
                    .zIndex(80)
                }

                if let awardedStarterPack {
                    starterPackCelebration(awardedStarterPack)
                        .frame(width: room.size.width, height: room.size.height)
                        .transition(.scale(scale: 0.7).combined(with: .opacity))
                        .zIndex(20_000)
                }
            }
            .coordinateSpace(name: "world2.room")
            .frame(width: room.size.width, height: room.size.height)
            .clipped()
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.interior.\(poiId)")
        .onAppear {
            World2Diagnostics.log(
                "treehouse_opened",
                [
                    "mode": isReadOnly ? "visitor_read_only" : "owner",
                    "poi": poiId
                ]
            )
            // A reward sent us here to show her the new thing: open the drawer
            // on it rather than leaving her to hunt.
            let rewardID: String? = isReadOnly
                ? nil
                : viewModel.consumeInventoryHighlight()
            if let rewardID {
                highlightedInventoryID = rewardID
                isArrangingFurniture = true
                World2Diagnostics.log(
                    "inventory_highlight_opened",
                    ["instance": rewardID, "poi": poiId]
                )
            }
            if !isReadOnly,
               let owner,
               let pack = PlayerStateService.shared.claimTreehouseStarterPack(for: owner) {
                // Two celebrations at once is one too many. Arriving on the back
                // of a reward, the pack still lands — it just waits in the
                // drawer wearing its STARTER ribbons instead of interrupting.
                if rewardID == nil {
                    awardedStarterPack = pack
                    starterPackBurst = false
                    Task { @MainActor in
                        try? await Task.sleep(for: .milliseconds(120))
                        withAnimation(.spring(response: 0.65, dampingFraction: 0.68)) {
                            starterPackBurst = true
                        }
                    }
                }
                World2Diagnostics.log(
                    "treehouse_starter_pack_awarded",
                    [
                        "celebrated": "\(rewardID == nil)",
                        "item_count": "\(pack.items.count)",
                        "player": owner.rawValue,
                    ]
                )
            }
            if !isReadOnly,
               ProcessInfo.processInfo.arguments.contains("-autoPlaceWorld2Furniture"),
               let instance = PlayerStateService.shared.unplacedFurnitureInventory.first {
                PlayerStateService.shared.placeFurniture(instanceId: instance.id)
                selectedFurnitureID = instance.id
                isArrangingFurniture = true
            }
        }
    }

    private func starterPackCelebration(_ pack: FurnitureStarterPack) -> some View {
        GeometryReader { geometry in
            ZStack {
                Color.indigo.opacity(0.58)
                    .ignoresSafeArea()

                ForEach(0..<22, id: \.self) { index in
                    Image(systemName: index.isMultiple(of: 2) ? "sparkle" : "star.fill")
                        .font(.system(size: CGFloat(15 + (index % 4) * 5), weight: .black))
                        .foregroundStyle(index.isMultiple(of: 3) ? .yellow : .pink)
                        .position(
                            x: geometry.size.width
                                * (0.08 + Double((index * 37) % 84) / 100),
                            y: starterPackBurst
                                ? geometry.size.height
                                    * (0.08 + Double((index * 29) % 80) / 100)
                                : geometry.size.height * 0.5
                        )
                        .scaleEffect(starterPackBurst ? 1 : 0.05)
                        .rotationEffect(.degrees(starterPackBurst ? Double(index * 43) : 0))
                        .opacity(starterPackBurst ? 0.95 : 0)
                }

                VStack(spacing: 15) {
                    Image(systemName: "gift.fill")
                        .font(.system(size: 48, weight: .black))
                        .foregroundStyle(.yellow)
                        .symbolEffect(.bounce, value: starterPackBurst)

                    Text("A STARTER PACK FOR \(pack.owner.displayName.uppercased())!")
                        .font(.system(size: 25, weight: .black, design: .rounded))

                    Text(pack.title)
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundStyle(.indigo)

                    HStack(spacing: 9) {
                        ForEach(pack.items) { item in
                            VStack(spacing: 4) {
                                Image(item.assetName)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 76, height: 70)
                                Text(item.name)
                                    .font(.system(size: 9, weight: .black, design: .rounded))
                                    .multilineTextAlignment(.center)
                                    .lineLimit(2)
                            }
                            .padding(7)
                            .frame(width: 96, height: 108)
                            .background(.white.opacity(0.86), in: RoundedRectangle(cornerRadius: 16))
                            .rotationEffect(.degrees(starterPackBurst ? 0 : -12))
                            .scaleEffect(starterPackBurst ? 1 : 0.45)
                        }
                    }

                    Text("Five new pieces are waiting in your furniture drawer.")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))

                    Button {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                            starterPackBurst = false
                            awardedStarterPack = nil
                            isArrangingFurniture = true
                        }
                    } label: {
                        Label("LET'S DECORATE!", systemImage: "paintbrush.pointed.fill")
                            .font(.system(size: 16, weight: .black, design: .rounded))
                            .padding(.horizontal, 18)
                            .padding(.vertical, 5)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.indigo)
                    .accessibilityIdentifier("world2.interior.starterPack.openInventory")
                }
                .padding(24)
                .background(.ultraThickMaterial, in: RoundedRectangle(cornerRadius: 30))
                .overlay(
                    RoundedRectangle(cornerRadius: 30)
                        .stroke(.yellow, lineWidth: 4)
                )
                .shadow(color: .purple.opacity(0.45), radius: 24, y: 10)
            }
        }
        .ignoresSafeArea()
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.interior.starterPack.celebration")
    }

    private var header: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 1) {
                Text(poi?.name ?? "Treehouse")
                    .font(.system(size: 27, weight: .black, design: .rounded))
                Text(interiorSubtitle)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.8))
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 9)
            .background(.black.opacity(0.58), in: RoundedRectangle(cornerRadius: 16))
            .shadow(color: .black.opacity(0.28), radius: 7, y: 3)
            .accessibilityIdentifier("world2.interior.title")

            HStack {
                Button(action: onExit) {
                    Label("Home World", systemImage: "arrow.left.circle.fill")
                        .font(.system(size: 17, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 15)
                        .padding(.vertical, 11)
                        .background(.black.opacity(0.65), in: Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("world2.interior.back")

                Spacer()

                HStack(spacing: 8) {
                    interiorMenuButton(
                        systemName: "gearshape.fill",
                        label: "Open settings",
                        identifier: "world2.interior.settings",
                        action: onOpenSettings
                    )
                    interiorMenuButton(
                        systemName: "music.note",
                        label: "Open music player",
                        identifier: "world2.interior.music",
                        action: onOpenMusic
                    )
                }
            }
        }
        .padding(.horizontal, 22)
        .padding(.top, 16)
        .zIndex(20)
    }

    private func interiorMenuButton(
        systemName: String,
        label: String,
        identifier: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.system(size: 20, weight: .bold))
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(.ultraThinMaterial, in: Circle())
                .overlay(Circle().stroke(.white.opacity(0.42), lineWidth: 1.5))
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityIdentifier(identifier)
    }

    @ViewBuilder
    private var controls: some View {
        if isReadOnly {
            Label(
                "You're visiting \(owner?.displayName ?? "a friend"). Looking around is welcome; changes are owner-only.",
                systemImage: "eye.fill"
            )
            .font(.system(size: 16, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .padding(.horizontal, 22)
            .padding(.vertical, 14)
            .background(.indigo.opacity(0.88), in: Capsule())
            .accessibilityIdentifier("world2.interior.readOnly")
            .padding(.bottom, 34)
        } else if !isArrangingFurniture {
            HStack(spacing: 10) {
                Button {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.82)) {
                        isArrangingFurniture = true
                        selectedFurnitureID = placedFurniture.last?.id
                    }
                } label: {
                    Label(
                        "Decorate My Room",
                        systemImage: "paintbrush.pointed.fill"
                    )
                }
                .tint(.indigo)
                .overlay(alignment: .topTrailing) {
                    if viewModel.unseenInventoryCount > 0 {
                        Text("\(viewModel.unseenInventoryCount) NEW!")
                            .font(.system(size: 10, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 7)
                            .padding(.vertical, 4)
                            .background(.pink, in: Capsule())
                            .overlay(Capsule().stroke(.white, lineWidth: 1.5))
                            .offset(x: 12, y: -10)
                            .accessibilityIdentifier("world2.interior.newItemsPip")
                    }
                }
                .accessibilityLabel(
                    viewModel.unseenInventoryCount > 0
                        ? "Decorate my room, \(viewModel.unseenInventoryCount) new items"
                        : "Decorate my room"
                )
                .accessibilityIdentifier("world2.interior.arrangeFurniture")

                Button {
                    cozyGlow.toggle()
                    World2Diagnostics.log(
                        "treehouse_glow_changed",
                        ["enabled": String(cozyGlow), "poi": poiId]
                    )
                } label: {
                    Image(systemName: cozyGlow ? "lightbulb.fill" : "lightbulb")
                        .accessibilityLabel(
                            cozyGlow ? "Turn off cozy glow" : "Turn on cozy glow"
                        )
                }
                .tint(.orange)
            }
            .font(.system(size: 15, weight: .black, design: .rounded))
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.black.opacity(0.58), in: Capsule())
            .padding(.bottom, 34)
        }
    }

    private var interiorSubtitle: String {
        if isReadOnly {
            return "Visitor view — read only"
        }
        return "Your treehouse"
    }
}

private struct World2StarterJukeboxView: View {
    let instance: DecorationInstance
    let canvasSize: CGSize
    let onOpenMusic: () -> Void

    var body: some View {
        Button(action: onOpenMusic) {
            VStack(spacing: 6) {
                Image(systemName: "music.note.house.fill")
                    .font(.system(size: 42, weight: .black))
                Text("JUKEBOX")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .tracking(1)
            }
            .foregroundStyle(.white)
            .frame(width: 92, height: 112)
            .background(.indigo.opacity(0.90), in: RoundedRectangle(cornerRadius: 22))
            .overlay {
                RoundedRectangle(cornerRadius: 22)
                    .stroke(.cyan.opacity(0.90), lineWidth: 4)
            }
        }
        .buttonStyle(.plain)
        .contentShape(RoundedRectangle(cornerRadius: 22))
        .scaleEffect(instance.scale)
        .rotationEffect(.degrees(instance.rotation))
        .position(
            x: canvasSize.width * instance.x,
            y: canvasSize.height * instance.y
        )
        .zIndex(min(Double(instance.zIndex), 1_000))
        .accessibilityLabel("Open the treehouse jukebox")
        .accessibilityIdentifier("world2.interior.jukebox.\(instance.id)")
    }
}

private struct World2RoomPiece {
    let name: String
    let catalogAssetName: String?
    let generated: World2GeneratedDecoration?
    /// Set for story rewards, which are drawn in SwiftUI rather than loaded.
    let story: World2StoryDecoration?
    let category: String
    let defaultScale: Double
    let placementLayer: HomeLayout.PlacedDecoration.PlacementLayer

    init(
        name: String,
        catalogAssetName: String? = nil,
        generated: World2GeneratedDecoration? = nil,
        story: World2StoryDecoration? = nil,
        category: String,
        defaultScale: Double,
        placementLayer: HomeLayout.PlacedDecoration.PlacementLayer
    ) {
        self.name = name
        self.catalogAssetName = catalogAssetName
        self.generated = generated
        self.story = story
        self.category = category
        self.defaultScale = defaultScale
        self.placementLayer = placementLayer
    }

    static func resolve(
        _ decorationId: String,
        player: PlayerState?
    ) -> World2RoomPiece? {
        if decorationId == DecorationInstance.starterJukeboxID {
            return World2RoomPiece(
                name: "Treehouse Jukebox",
                category: "Jukebox",
                defaultScale: 1.0,
                placementLayer: .floor
            )
        }
        if let item = FurnitureItem.item(id: decorationId) {
            return World2RoomPiece(
                name: item.name,
                catalogAssetName: item.assetName,
                category: item.category,
                defaultScale: item.defaultScale,
                placementLayer: item.placementLayer
            )
        }
        if let story = World2StoryDecoration.decoration(id: decorationId) {
            return World2RoomPiece(
                name: story.name,
                story: story,
                category: story.category,
                defaultScale: story.defaultScale,
                placementLayer: story.placementLayer.homeLayer
            )
        }
        if let generated = player?.generatedDecoration(id: decorationId) {
            return World2RoomPiece(
                name: generated.label,
                generated: generated,
                category: "Workbench",
                defaultScale: 0.82,
                placementLayer: generated.placementLayer.homeLayer
            )
        }
        return nil
    }

    @ViewBuilder
    var artwork: some View {
        if let story {
            World2StoryDecorationArtwork(decoration: story)
        } else if let generated {
            World2GeneratedDecorationArtwork(decoration: generated)
        } else if catalogAssetName == nil && category == "Jukebox" {
            VStack(spacing: 4) {
                Image(systemName: "music.note.house.fill")
                    .font(.system(size: 28, weight: .black))
                Text("JUKEBOX")
                    .font(.system(size: 8, weight: .black, design: .rounded))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(.indigo.opacity(0.9), in: RoundedRectangle(cornerRadius: 12))
        } else if let catalogAssetName {
            Image(catalogAssetName)
                .resizable()
                .scaledToFit()
        }
    }
}

private struct World2PlacedFurnitureView: View {
    let instance: DecorationInstance
    let piece: World2RoomPiece
    let canvasSize: CGSize
    let isArranging: Bool
    let isSelected: Bool
    let returnZoneMinX: CGFloat?
    let onSelect: () -> Void
    let onMove: (Double, Double) -> Void
    let onScale: (Double) -> Void
    let onRotation: (Double) -> Void
    let onReturnToInventory: () -> Void
    let onDragStateChanged: (Bool) -> Void

    @GestureState private var dragOffset = CGSize.zero
    @GestureState private var gestureScale = 1.0
    @GestureState private var gestureRotation = Angle.zero
    @State private var isDragging = false

    var body: some View {
        piece.artwork
            .frame(
                width: piece.category == "Beds" ? 260 : 190,
                height: piece.category == "Beds" ? 210 : 175
            )
            .scaleEffect(instance.scale * gestureScale)
            .rotationEffect(.degrees(instance.rotation) + gestureRotation)
            .shadow(
                color: isSelected ? .yellow.opacity(0.95) : .black.opacity(0.32),
                radius: isSelected ? 16 : 7,
                y: 5
            )
            .accessibilityLabel(piece.name)
            .accessibilityHint(
                isArranging
                    ? "Tap to select, drag to move or put away, pinch to resize, or twist to rotate"
                    : "Placed furniture"
            )
            .accessibilityValue(
                String(
                    format: "x %.2f, y %.2f, size %.2f, rotation %.0f degrees",
                    instance.x,
                    instance.y,
                    instance.scale,
                    instance.rotation
                )
            )
            .accessibilityIdentifier("world2.interior.placedFurniture.\(instance.id)")
            .contentShape(Rectangle())
            .onTapGesture {
                if isArranging {
                    onSelect()
                }
            }
            .gesture(isArranging ? dragGesture : nil)
            .simultaneousGesture(isArranging ? scaleGesture : nil)
            .simultaneousGesture(isArranging ? rotationGesture : nil)
            .overlay {
                if isArranging && isSelected {
                    World2AnimatedSelectionLasso()
                        .allowsHitTesting(false)
                }
            }
            .overlay(alignment: .trailing) {
                if isArranging && isSelected {
                    Button(action: onReturnToInventory) {
                        Image(systemName: "xmark")
                            .font(.system(size: 16, weight: .black))
                            .foregroundStyle(.white)
                            .frame(width: 36, height: 36)
                            .background(.red, in: Circle())
                            .overlay(Circle().stroke(.white, lineWidth: 3))
                            .shadow(color: .black.opacity(0.35), radius: 4, y: 2)
                            .contentShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .offset(x: -4)
                    .accessibilityLabel("Put \(piece.name) back in the drawer")
                    .accessibilityIdentifier(
                        "world2.interior.furniture.remove.\(instance.id)"
                    )
                }
            }
            .position(
                x: canvasSize.width * instance.x,
                y: canvasSize.height * instance.y
            )
            .offset(dragOffset)
            .zIndex(isSelected ? 900 : min(Double(instance.zIndex), 800))
            .accessibilityElement(children: .contain)
            .allowsHitTesting(isArranging)
    }

    private var dragGesture: some Gesture {
        DragGesture(coordinateSpace: .named("world2.room"))
            .onChanged { _ in
                onSelect()
                if !isDragging {
                    isDragging = true
                    onDragStateChanged(true)
                }
            }
            .updating($dragOffset) { value, state, _ in
                state = CGSize(
                    width: value.location.x - value.startLocation.x,
                    height: value.location.y - value.startLocation.y
                )
            }
            .onEnded { value in
                defer {
                    isDragging = false
                    onDragStateChanged(false)
                }
                guard canvasSize.width > 0, canvasSize.height > 0 else { return }
                let travel = CGSize(
                    width: value.location.x - value.startLocation.x,
                    height: value.location.y - value.startLocation.y
                )
                if let returnZoneMinX, value.location.x >= returnZoneMinX {
                    onReturnToInventory()
                    return
                }
                onMove(
                    travel.width / canvasSize.width,
                    travel.height / canvasSize.height
                )
            }
    }

    private var scaleGesture: some Gesture {
        MagnificationGesture()
            .updating($gestureScale) { value, state, _ in
                state = value
            }
            .onChanged { _ in onSelect() }
            .onEnded { value in
                onScale(instance.scale * value)
            }
    }

    private var rotationGesture: some Gesture {
        RotationGesture()
            .updating($gestureRotation) { value, state, _ in
                state = value
            }
            .onChanged { _ in onSelect() }
            .onEnded { value in
                onRotation(instance.rotation + value.degrees)
            }
    }
}

private struct World2AnimatedSelectionLasso: View {
    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
            let phase = timeline.date.timeIntervalSinceReferenceDate
                .truncatingRemainder(dividingBy: 1.0) * 32
            RoundedRectangle(cornerRadius: 18)
                .stroke(
                    .yellow,
                    style: StrokeStyle(
                        lineWidth: 4,
                        lineCap: .round,
                        dash: [10, 7],
                        dashPhase: CGFloat(phase)
                    )
                )
                .padding(-8)
                .shadow(color: .black.opacity(0.5), radius: 2)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

private struct World2PlacedTeleporterView: View {
    let instance: DecorationInstance
    let canvasSize: CGSize
    let onUse: () -> Void

    var body: some View {
        Button(action: onUse) {
            World2WorldTeleporterToken(isAnimated: true)
                .frame(width: 120, height: 120)
        }
        .buttonStyle(.plain)
        .position(
            x: canvasSize.width * instance.x,
            y: canvasSize.height * instance.y
        )
        .zIndex(min(Double(instance.zIndex), 1_000))
        .accessibilityLabel("Use the World Teleporter")
        .accessibilityIdentifier("world2.interior.teleporter.\(instance.id)")
    }
}

private struct World2FurnitureDecoratorDrawer: View {
    let playerName: String
    let width: CGFloat
    let isReturnTargetActive: Bool
    let highlightedInstanceID: String?
    let onDone: () -> Void
    let onPlace: (String) -> Void
    let onUse: (String) -> Void
    @ObservedObject private var playerService = PlayerStateService.shared

    /// New things first, so a just-earned reward is the first card in the drawer
    /// even before anybody scrolls.
    private var inventory: [DecorationInstance] {
        playerService.unplacedFurnitureInventory.sorted { lhs, rhs in
            if lhs.isUnseen != rhs.isUnseen { return lhs.isUnseen }
            return lhs.acquiredAt > rhs.acquiredAt
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 10) {
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 23, weight: .black))
                    .foregroundStyle(.indigo)

                VStack(alignment: .leading, spacing: 1) {
                    Text("DECORATE")
                        .font(.system(size: 19, weight: .black, design: .rounded))
                    Text("\(playerName)'s drawer")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 4)

                Button(action: onDone) {
                    Image(systemName: "checkmark")
                        .font(.system(size: 18, weight: .black))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(.green, in: Circle())
                        .contentShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Done decorating")
                .accessibilityIdentifier("world2.interior.decorator.done")
            }
            .padding(.horizontal, 16)
            .padding(.top, 18)
            .padding(.bottom, 12)

            Text("Drag a piece into the room. Drag a room piece back here to put it away.")
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)

            ZStack {
                Color.red.opacity(isReturnTargetActive ? 0.18 : 0)

                if inventory.isEmpty {
                    VStack(spacing: 13) {
                        Image(systemName: isReturnTargetActive ? "arrow.down.to.line" : "sparkles")
                            .font(.system(size: 38, weight: .black))
                            .foregroundStyle(isReturnTargetActive ? .red : .indigo)
                        Text(isReturnTargetActive ? "DROP HERE" : "EVERYTHING IS IN THE ROOM!")
                            .font(.system(size: 15, weight: .black, design: .rounded))
                            .multilineTextAlignment(.center)
                    }
                    .padding(20)
                } else {
                    ScrollViewReader { scroller in
                        ScrollView {
                            LazyVGrid(
                                columns: [
                                    GridItem(.flexible(), spacing: 10),
                                    GridItem(.flexible(), spacing: 10),
                                ],
                                spacing: 10
                            ) {
                                ForEach(inventory) { instance in
                                    if let piece = World2RoomPiece.resolve(
                                        instance.decorationId,
                                        player: playerService.currentPlayer
                                    ) {
                                        card(for: instance, piece: piece)
                                            .id(instance.id)
                                    }
                                }
                            }
                            .padding(12)
                        }
                        .onAppear {
                            guard let highlightedInstanceID else { return }
                            withAnimation(.easeOut(duration: 0.45)) {
                                scroller.scrollTo(highlightedInstanceID, anchor: .center)
                            }
                        }
                    }
                }
            }
            .overlay(alignment: .top) {
                if isReturnTargetActive {
                    Label("DROP HERE TO PUT AWAY", systemImage: "arrow.right")
                        .font(.system(size: 13, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 13)
                        .padding(.vertical, 9)
                        .background(.red, in: Capsule())
                        .padding(.top, 10)
                }
            }
        }
        .frame(width: width)
        .background(.ultraThickMaterial)
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(.white.opacity(0.6))
                .frame(width: 2)
        }
        .shadow(color: .black.opacity(0.28), radius: 18, x: -5)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.interior.decorator.drawer")
    }

    private func card(
        for instance: DecorationInstance,
        piece: World2RoomPiece
    ) -> some View {
        let isHighlighted = highlightedInstanceID == instance.id
        let badges = instance.displayBadges
        let usable = piece.story?.isUsableFromInventory == true

        return VStack(spacing: 6) {
            piece.artwork
                .frame(height: 78)
            Text(piece.name)
                .font(.system(size: 11, weight: .black, design: .rounded))
                .multilineTextAlignment(.center)
                .lineLimit(2)
            if !badges.isEmpty {
                HStack(spacing: 3) {
                    ForEach(badges, id: \.self) { badge in
                        World2InventoryBadgeChip(badge: badge)
                    }
                }
            }
            if usable {
                Button {
                    onUse(instance.id)
                } label: {
                    Text("USE")
                        .font(.system(size: 12, weight: .black, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 7)
                        .background(.orange, in: Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("world2.interior.inventory.use.\(instance.id)")

                Button {
                    onPlace(instance.id)
                } label: {
                    Text("Place in room")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(.indigo)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(8)
        .frame(maxWidth: .infinity)
        .background(
            .white.opacity(0.80),
            in: RoundedRectangle(cornerRadius: 16)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(
                    isHighlighted ? .yellow : .indigo.opacity(0.22),
                    lineWidth: isHighlighted ? 4 : 1.5
                )
        )
        .shadow(
            color: isHighlighted ? .orange.opacity(0.8) : .clear,
            radius: 14
        )
        .contentShape(RoundedRectangle(cornerRadius: 16))
        .onTapGesture {
            if usable {
                onUse(instance.id)
            } else {
                onPlace(instance.id)
            }
        }
        .draggable(instance.id) {
            piece.artwork
                .frame(width: 120, height: 110)
                .padding(8)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18))
        }
        .accessibilityLabel(
            badges.isEmpty
                ? piece.name
                : "\(piece.name), \(badges.map(\.label).joined(separator: ", "))"
        )
        .accessibilityHint(
            usable
                ? "Double tap to use, or drag into the room to place"
                : "Drag into the room, or double tap to place"
        )
        .accessibilityIdentifier("world2.interior.inventory.item.\(instance.id)")
    }
}

#Preview {
    World2PlayerHomeView(
        poiId: "poi.abbieTreehouse",
        viewModel: World2ViewModel(),
        onExit: {},
        onOpenSettings: {},
        onOpenMusic: {}
    )
}
