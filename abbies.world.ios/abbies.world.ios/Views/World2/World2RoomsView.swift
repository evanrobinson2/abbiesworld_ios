import SwiftUI

/// Interior plates named by one place in the world document.
struct World2RoomsView: View {
    let placeID: String
    @ObservedObject var viewModel: World2ViewModel
    let onExit: () -> Void

    @ObservedObject private var sync = World2WorldSync.shared
    @State private var selectedRoomID: String?
    @State private var showingSceneInvent = false

    private var place: World2RemotePlace? {
        sync.places.first { $0.id == placeID }
    }

    private var rooms: [World2RemoteRoom] {
        place?.rooms ?? []
    }

    private var currentRoom: World2RemoteRoom? {
        if let selectedRoomID, let match = rooms.first(where: { $0.id == selectedRoomID }) {
            return match
        }
        return rooms.first
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            if let room = currentRoom {
                World2SemanticImage(
                    semanticName: room.image,
                    fallbackIcon: "house.fill",
                    fallbackLabel: room.name
                )
                .scaledToFit()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.bottom, 88)
                .accessibilityLabel(room.image)
            }
            VStack {
                HStack {
                    Text(place?.name ?? "Rooms")
                        .font(.title2.weight(.semibold))
                        .foregroundStyle(.white)
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                Spacer()
            }
        }
        .world2InteriorActions(
            rooms.map { room in
                World2ThumbAction(
                    id: room.id,
                    title: room.name,
                    icon: "photo",
                    asset: room.image,
                    accessibilityID: "world2.rooms.room.\(room.id)"
                )
            },
            selectedID: currentRoom?.id,
            exitAccessibilityID: "world2.rooms.exit",
            onExit: onExit
        ) { id in
            selectedRoomID = id
        }
        .onChange(of: viewModel.sandboxInventTick) { _, _ in
            showingSceneInvent = true
        }
        .sheet(isPresented: $showingSceneInvent) {
            let room = currentRoom
            let scene = World2SceneDefinition(
                id: room.map { "rooms.\(placeID).\($0.id)" } ?? "rooms.\(placeID)",
                name: room?.name ?? place?.name ?? "Room",
                summary: place?.name ?? "Room",
                backgroundAsset: room?.image ?? place?.interiorAsset ?? placeID,
                isMutableByPlayer: true
            )
            World2SceneInventDecorationsView(
                scene: scene,
                plateImage: AssetBootstrapService.shared.image(for: scene.backgroundAsset),
                onCarved: { viewModel.notifySceneInventReady($0) },
                onOpenDecorate: {
                    showingSceneInvent = false
                    viewModel.beginDecoratingCurrentSurface()
                },
                onTravel: { result in
                    showingSceneInvent = false
                    viewModel.reopenInventResult(result)
                },
                onClose: { showingSceneInvent = false }
            )
        }
        .accessibilityIdentifier("world2.rooms")
    }
}
