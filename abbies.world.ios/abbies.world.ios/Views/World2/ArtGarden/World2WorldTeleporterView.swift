//
//  World2WorldTeleporterView.swift
//  abbies.world.ios
//
//  Travel screen opened from the World Teleporter inventory item.
//
//  Lists every reachable World 2 scene — including Art Garden, which has no
//  overland adjacency — so a player can hop without walking the map edges.
//

import SwiftUI

struct World2WorldTeleporterView: View {
    let destinations: [World]
    let currentWorldID: WorldId?
    let onTravel: (WorldId) -> Void
    let onClose: () -> Void

    @State private var selectedID: WorldId?

    var body: some View {
        GeometryReader { geo in
            ZStack {
                teleporterBackdrop(size: geo.size)

                VStack(spacing: 0) {
                    topBar
                    Spacer(minLength: 8)
                    destinationGrid
                    Spacer(minLength: 8)
                    travelBar
                }
                .padding(.horizontal, 22)
                .padding(.vertical, 16)
            }
        }
        .ignoresSafeArea()
        .onAppear {
            selectedID = currentWorldID ?? destinations.first?.id
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.teleporter.screen")
    }

    private var topBar: some View {
        HStack {
            Button(action: onClose) {
                Label("Close", systemImage: "xmark")
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(.black.opacity(0.7), in: Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("world2.teleporter.close")

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("World Teleporter")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                Text("Pick a scene, then Travel")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .opacity(0.9)
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 14))
        }
    }

    private var destinationGrid: some View {
        ScrollView {
            LazyVGrid(
                columns: [
                    GridItem(.adaptive(minimum: 160), spacing: 14),
                ],
                spacing: 14
            ) {
                ForEach(destinations) { world in
                    Button {
                        selectedID = world.id
                    } label: {
                        destinationCard(world)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.teleporter.dest.\(world.id.rawValue)")
                }
            }
            .padding(18)
            .background(.black.opacity(0.42), in: RoundedRectangle(cornerRadius: 24))
        }
        .frame(maxHeight: 420)
    }

    private func destinationCard(_ world: World) -> some View {
        let isSelected = selectedID == world.id
        let isHere = currentWorldID == world.id
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: iconName(for: world.id))
                    .font(.system(size: 22, weight: .bold))
                Spacer()
                if isHere {
                    Text("HERE")
                        .font(.system(size: 10, weight: .black, design: .rounded))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(.green.opacity(0.9), in: Capsule())
                }
            }
            Text(world.name)
                .font(.system(size: 16, weight: .black, design: .rounded))
                .multilineTextAlignment(.leading)
            Text(world.description)
                .font(.system(size: 12, weight: .medium, design: .rounded))
                .foregroundStyle(.white.opacity(0.85))
                .lineLimit(3)
                .multilineTextAlignment(.leading)
        }
        .foregroundStyle(.white)
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 128, alignment: .topLeading)
        .background(
            isSelected ? Color.orange.opacity(0.88) : Color.white.opacity(0.16),
            in: RoundedRectangle(cornerRadius: 18)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(isSelected ? Color.yellow : Color.white.opacity(0.25), lineWidth: isSelected ? 3 : 1)
        )
    }

    private var travelBar: some View {
        let canTravel = selectedID != nil && selectedID != currentWorldID
        return Button {
            guard let selectedID else { return }
            onTravel(selectedID)
        } label: {
            Label(
                canTravel
                    ? "Travel to \(destinations.first { $0.id == selectedID }?.name ?? "Scene")"
                    : (selectedID == currentWorldID ? "You are already here" : "Choose a scene"),
                systemImage: "airplane"
            )
            .font(.system(size: 18, weight: .black, design: .rounded))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                canTravel ? Color.orange : Color.gray.opacity(0.7),
                in: RoundedRectangle(cornerRadius: 18)
            )
        }
        .buttonStyle(.plain)
        .disabled(!canTravel)
        .accessibilityIdentifier("world2.teleporter.travel")
        .padding(.bottom, 8)
    }

    @ViewBuilder
    private func teleporterBackdrop(size: CGSize) -> some View {
        // Reuse the Character Studio workshop plate as travel-room chrome until
        // a dedicated teleporter plate is painted.
        if let image = AssetBootstrapService.shared.image(for: "poi.characterStudio.interior")
            ?? UIImage(named: "world2_interior_characterStudio") {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: size.width, height: size.height)
                .clipped()
        } else {
            LinearGradient(
                colors: [
                    Color(red: 0.18, green: 0.22, blue: 0.34),
                    Color(red: 0.42, green: 0.28, blue: 0.16),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private func iconName(for id: WorldId) -> String {
        switch id {
        case .home: return "house.fill"
        case .work: return "wrench.and.screwdriver.fill"
        case .farm: return "leaf.fill"
        case .adventure: return "map.fill"
        case .blankSlate: return "square.dashed"
        case .threeBears: return "house.and.flag.fill"
        case .artGarden: return "paintpalette.fill"
        case .evan: return "building.2.fill"
        }
    }
}

#Preview {
    World2WorldTeleporterView(
        destinations: [
            World(
                id: .home,
                name: "Home World",
                description: "Three welcoming places",
                backgroundAsset: "map.home",
                lightMusicTrack: "music.home.light",
                intenseMusicTrack: "music.home.intense",
                adjacentWorlds: [],
                ambiance: .init(primaryColor: "#56AB2F", secondaryColor: "#A8E063", mood: "welcoming")
            ),
            World(
                id: .artGarden,
                name: "Art Garden",
                description: "Terraced gardens and a Character Studio",
                backgroundAsset: "map.artGarden",
                lightMusicTrack: "music.home.light",
                intenseMusicTrack: "music.home.intense",
                adjacentWorlds: [],
                ambiance: .init(primaryColor: "#6FBF73", secondaryColor: "#F6D365", mood: "painterly")
            ),
        ],
        currentWorldID: .home,
        onTravel: { _ in },
        onClose: {}
    )
}
