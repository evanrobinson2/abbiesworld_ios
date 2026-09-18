//
//  World2DecorateTray.swift
//  abbies.world.ios
//
//  Mode-locked decorate tray: icon filters + horizontal scroll of placeable art.
//

import SwiftUI

struct World2DecorateTray: View {
    let playerName: String
    let selectedCatalogID: String?
    let selectedInventoryID: String?
    let filter: DecorateFilterID
    let onFilterChange: (DecorateFilterID) -> Void
    let onSelectCatalog: (FurnitureItem) -> Void
    let onSelectInventory: (String) -> Void
    let onDone: () -> Void
    var onInventForScene: (() -> Void)? = nil

    @ObservedObject private var playerService = PlayerStateService.shared

    private var catalogItems: [FurnitureItem] {
        FurnitureItem.storeCatalog.filter { filter.matches(item: $0) }
    }

    private var inventory: [DecorationInstance] {
        playerService.unplacedFurnitureInventory.sorted { lhs, rhs in
            if lhs.isUnseen != rhs.isUnseen { return lhs.isUnseen }
            return lhs.acquiredAt > rhs.acquiredAt
        }
    }

    var body: some View {
        VStack(spacing: 10) {
            HStack(spacing: 10) {
                Label("Decorate", systemImage: "paintbrush.pointed.fill")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundStyle(.white)

                Text(playerName)
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.7))

                Spacer(minLength: 0)

                if let onInventForScene {
                    Button(action: onInventForScene) {
                        Image(systemName: "wand.and.stars")
                            .font(.system(size: 15, weight: .black))
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .background(.orange.opacity(0.92), in: Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Invent props for this room")
                    .accessibilityIdentifier("world2.interior.decorator.invent")
                }

                Button(action: onDone) {
                    Image(systemName: "checkmark")
                        .font(.system(size: 16, weight: .black))
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(.green.opacity(0.92), in: Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Done decorating")
                .accessibilityIdentifier("world2.interior.decorator.done")
            }
            .padding(.horizontal, 14)

            filterRow

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 10) {
                    if filter == .mine {
                        ForEach(inventory) { instance in
                            if let piece = World2RoomPiece.resolve(
                                instance.decorationId,
                                player: playerService.currentPlayer
                            ) {
                                inventoryTile(instance: instance, piece: piece)
                            }
                        }
                        if inventory.isEmpty {
                            emptyMineHint
                        }
                    } else {
                        ForEach(catalogItems) { item in
                            catalogTile(item)
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 4)
            }
            .frame(height: 118)
        }
        .padding(.top, 12)
        .padding(.bottom, 10)
        .background(
            LinearGradient(
                colors: [
                    Color.black.opacity(0.15),
                    Color.black.opacity(0.62),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea(edges: .bottom)
        )
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.interior.decorator.tray")
    }

    private var filterRow: some View {
        HStack(spacing: 8) {
            ForEach(DecorateFilterID.allCases) { entry in
                Button {
                    onFilterChange(entry)
                } label: {
                    Image(systemName: entry.symbolName)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundStyle(filter == entry ? .white : .white.opacity(0.72))
                        .frame(width: 40, height: 40)
                        .background(
                            filter == entry
                                ? Color.pink.opacity(0.92)
                                : Color.white.opacity(0.14),
                            in: Circle()
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(entry.accessibilityLabel)
                .accessibilityAddTraits(filter == entry ? .isSelected : [])
                .accessibilityIdentifier("world2.interior.decorator.filter.\(entry.rawValue)")
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
    }

    private func catalogTile(_ item: FurnitureItem) -> some View {
        let selected = selectedCatalogID == item.id
        return Button {
            onSelectCatalog(item)
        } label: {
            VStack(spacing: 4) {
                Image(item.assetName)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 72, height: 72)
                Text(item.name)
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .frame(width: 78)
            }
            .padding(6)
            .background(
                selected ? Color.pink.opacity(0.35) : Color.white.opacity(0.10),
                in: RoundedRectangle(cornerRadius: 14)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(selected ? Color.yellow : Color.white.opacity(0.2), lineWidth: selected ? 3 : 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(item.name)
        .accessibilityIdentifier("world2.interior.decorator.catalog.\(item.id)")
    }

    private func inventoryTile(instance: DecorationInstance, piece: World2RoomPiece) -> some View {
        let selected = selectedInventoryID == instance.id
        return Button {
            onSelectInventory(instance.id)
        } label: {
            VStack(spacing: 4) {
                piece.artwork
                    .frame(width: 72, height: 72)
                Text(piece.name)
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .frame(width: 78)
            }
            .padding(6)
            .background(
                selected ? Color.indigo.opacity(0.45) : Color.white.opacity(0.10),
                in: RoundedRectangle(cornerRadius: 14)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(selected ? Color.yellow : Color.white.opacity(0.2), lineWidth: selected ? 3 : 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel(piece.name)
        .accessibilityIdentifier("world2.interior.decorator.inventory.\(instance.id)")
    }

    private var emptyMineHint: some View {
        Text("Your drawer is empty — pick something from the other icons!")
            .font(.system(size: 13, weight: .bold, design: .rounded))
            .foregroundStyle(.white.opacity(0.8))
            .frame(width: 220, height: 90)
            .padding(10)
    }
}
