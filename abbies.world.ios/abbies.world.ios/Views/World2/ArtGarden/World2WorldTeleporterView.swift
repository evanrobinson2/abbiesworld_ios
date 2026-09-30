//
//  World2WorldTeleporterView.swift
//  abbies.world.ios
//
//  Travel screen opened from the World Teleporter inventory item.
//
//  Lists every reachable scene — compiled worlds, or the signed-in document.
//

import SwiftUI
import UIKit

struct World2WorldTeleporterView: View {
    let destinations: [World2TeleporterDestination]
    let currentSceneID: String?
    let onTravel: (String) -> Void
    let onClose: () -> Void

    @State private var selectedID: String?

    var body: some View {
        GeometryReader { geo in
            ZStack {
                teleporterBackdrop(size: geo.size)

                VStack(spacing: 0) {
                    topBar
                    Spacer(minLength: 8)
                    destinationGrid
                    Spacer(minLength: 8)
                }
                .padding(.horizontal, 22)
                .padding(.vertical, 16)
            }
        }
        .ignoresSafeArea()
        .onAppear {
            selectedID = currentSceneID ?? destinations.first?.id
        }
        .world2InteriorActions(
            destinations.map { destination in
                World2ThumbAction(
                    id: destination.id,
                    title: destination.name,
                    icon: "globe",
                    accessibilityID: "world2.teleporter.destination.\(destination.id)"
                )
            },
            selectedID: selectedID,
            exitTitle: "Exit",
            exitAccessibilityID: "world2.teleporter.close",
            onExit: onClose
        ) { id in
            selectedID = id
            onTravel(id)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.teleporter.screen")
    }

    private var topBar: some View {
        HStack {
            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("World Teleporter")
                    .font(.system(size: 20, weight: .black, design: .rounded))
                Text("Tap a land to go")
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
                ForEach(destinations) { destination in
                    Button {
                        selectedID = destination.id
                    } label: {
                        destinationCard(destination)
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.teleporter.dest.\(destination.id)")
                }
            }
            .padding(18)
            .background(.black.opacity(0.42), in: RoundedRectangle(cornerRadius: 24))
        }
        .frame(maxHeight: 420)
    }

    private func destinationCard(_ destination: World2TeleporterDestination) -> some View {
        let isSelected = selectedID == destination.id
        let isHere = currentSceneID == destination.id
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: iconName(for: destination.id))
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
            Text(destination.name)
                .font(.system(size: 16, weight: .black, design: .rounded))
                .multilineTextAlignment(.leading)
            Text(destination.summary)
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

    @ViewBuilder
    private func teleporterBackdrop(size: CGSize) -> some View {
        if let image = AssetBootstrapService.shared.image(for: "poi.characterStudio.interior") {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .frame(width: size.width, height: size.height)
                .clipped()
        } else if let placeholder = UIImage(named: "under_construction_scene")
            ?? UIImage(named: "under_construction") {
            Image(uiImage: placeholder)
                .resizable()
                .scaledToFill()
                .frame(width: size.width, height: size.height)
                .clipped()
                .opacity(0.55)
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

    private func iconName(for id: String) -> String {
        switch WorldId(rawValue: id) {
        case .home: return "house.fill"
        case .work: return "wrench.and.screwdriver.fill"
        case .farm: return "leaf.fill"
        case .adventure: return "map.fill"
        case .blankSlate: return "square.dashed"
        case .threeBears: return "house.and.flag.fill"
        case .artGarden: return "paintpalette.fill"
        case .evan: return "building.2.fill"
        case .peglinEdition: return "circle.grid.cross.fill"
        case .none:
            if id.contains("spooky") { return "moon.fill" }
            if id.contains("home") { return "house.fill" }
            return "globe.americas.fill"
        }
    }
}

#Preview {
    World2WorldTeleporterView(
        destinations: [
            World2TeleporterDestination(
                id: "scene.home",
                name: "Abbie's World",
                summary: "The live world"
            ),
            World2TeleporterDestination(
                id: "scene.spookyLand",
                name: "Spooky Land",
                summary: "A second scene on the document"
            ),
        ],
        currentSceneID: "scene.home",
        onTravel: { _ in },
        onClose: {}
    )
}
