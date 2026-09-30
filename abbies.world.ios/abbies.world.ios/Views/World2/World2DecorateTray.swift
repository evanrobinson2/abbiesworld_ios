//
//  World2DecorateTray.swift
//  abbies.world.ios
//
//  Decorate dock — a thin bottom shelf. The room stays visible; pick a thumb,
//  then tap the plate to stamp. Filters + Done live on the same shelf.
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

    @ObservedObject private var playerService = PlayerStateService.shared
    @ObservedObject private var world = World2WorldSync.shared

    private var catalogItems: [FurnitureItem] {
        guard !world.usesServerDocument else { return [] }
        return FurnitureItem.storeCatalog.filter { filter.matches(item: $0) }
    }

    private var inventory: [DecorationInstance] {
        playerService.unplacedFurnitureInventory.sorted { lhs, rhs in
            if lhs.isUnseen != rhs.isUnseen { return lhs.isUnseen }
            return lhs.acquiredAt > rhs.acquiredAt
        }
    }

    private var itemActions: [World2ThumbAction] {
        if filter == .mine {
            let tiles: [World2ThumbAction] = inventory.compactMap { instance in
                guard let piece = World2RoomPiece.resolve(
                    instance.decorationId,
                    player: playerService.currentPlayer
                ) else { return nil }
                return World2ThumbAction(
                    id: "inv.\(instance.id)",
                    title: World2ChromeContract.shortDecorationLabel(piece.name),
                    icon: "shippingbox.fill",
                    asset: piece.catalogAssetName,
                    accessibilityID: "world2.interior.decorator.inventory.\(instance.id)"
                )
            }
            return tiles.isEmpty
                ? [World2ThumbAction(id: "empty", title: "Empty", icon: "tray")]
                : tiles
        }
        var tiles: [World2ThumbAction] = world.props.map { prop in
            World2ThumbAction(
                id: prop.id,
                title: World2ChromeContract.shortDecorationLabel(prop.name),
                icon: "shippingbox",
                asset: prop.image,
                accessibilityID: "world2.interior.decorator.prop.\(prop.id)"
            )
        }
        tiles.append(contentsOf: catalogItems.map { item in
            World2ThumbAction(
                id: item.id,
                title: World2ChromeContract.shortDecorationLabel(item.name),
                icon: "sofa.fill",
                asset: item.assetName,
                accessibilityID: "world2.interior.decorator.catalog.\(item.id)"
            )
        })
        return tiles.isEmpty
            ? [World2ThumbAction(id: "empty", title: "Empty", icon: "tray")]
            : tiles
    }

    private var selectedActionID: String? {
        if let selectedInventoryID { return "inv.\(selectedInventoryID)" }
        return selectedCatalogID
    }

    private var selectedTitle: String? {
        guard let id = selectedActionID else { return nil }
        return itemActions.first(where: { $0.id == id })?.title
    }

    var body: some View {
        VStack(spacing: 0) {
            // Hint chip — only when something is armed to stamp.
            if let selectedTitle {
                Text("Tap the room to place \(selectedTitle)")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.92))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.black.opacity(0.55), in: Capsule())
                    .padding(.bottom, 8)
                    .accessibilityIdentifier("world2.interior.decorator.hint")
            }

            VStack(spacing: 8) {
                filmstrip
                bar
            }
            .padding(.horizontal, 10)
            .padding(.top, 10)
            .padding(.bottom, 12)
            .frame(maxWidth: .infinity)
            .background(
                UnevenRoundedRectangle(
                    topLeadingRadius: 22,
                    bottomLeadingRadius: 0,
                    bottomTrailingRadius: 0,
                    topTrailingRadius: 22,
                    style: .continuous
                )
                .fill(.black.opacity(0.72))
                .overlay(alignment: .top) {
                    UnevenRoundedRectangle(
                        topLeadingRadius: 22,
                        bottomLeadingRadius: 0,
                        bottomTrailingRadius: 0,
                        topTrailingRadius: 22,
                        style: .continuous
                    )
                    .stroke(.white.opacity(0.22), lineWidth: 1)
                }
            )
        }
        .frame(maxWidth: .infinity, alignment: .bottom)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Decorate \(playerName)")
        .accessibilityIdentifier("world2.interior.decorator.tray")
    }

    /// One short row of thumbs — never a mid-screen card wall.
    private var filmstrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(itemActions) { item in
                    compactThumb(item)
                }
            }
            .padding(.horizontal, 4)
        }
        .frame(height: 72)
        .accessibilityIdentifier("world2.interior.decorator.grid")
    }

    private var bar: some View {
        HStack(spacing: 6) {
            ForEach(DecorateFilterID.allCases) { entry in
                Button {
                    onFilterChange(entry)
                } label: {
                    Image(systemName: entry.symbolName)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(filter == entry ? .black : .white)
                        .frame(width: 36, height: 36)
                        .background(
                            filter == entry ? Color.yellow : Color.white.opacity(0.12),
                            in: RoundedRectangle(cornerRadius: 10, style: .continuous)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(entry.accessibilityLabel)
                .accessibilityAddTraits(filter == entry ? .isSelected : [])
                .accessibilityIdentifier("world2.interior.decorator.filter.\(entry.rawValue)")
            }
            Spacer(minLength: 8)
            Button(action: onDone) {
                Label("Done", systemImage: "checkmark.circle.fill")
                    .font(.system(size: 14, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .frame(height: 36)
                    .background(
                        Color(red: 0.28, green: 0.78, blue: 0.42),
                        in: Capsule()
                    )
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Done")
            .accessibilityIdentifier("world2.interior.decorator.done")
        }
        .accessibilityIdentifier("world2.interior.decorator.bar")
    }

    private func compactThumb(_ item: World2ThumbAction) -> some View {
        let isSelected = selectedActionID == item.id
        return Button {
            handlePick(item.id)
        } label: {
            VStack(spacing: 3) {
                Group {
                    if let asset = item.asset, !asset.isEmpty {
                        World2SemanticImage(
                            semanticName: asset,
                            fallbackIcon: item.icon,
                            fallbackLabel: item.title
                        )
                        .scaledToFit()
                    } else {
                        Image(systemName: item.icon)
                            .font(.system(size: 20, weight: .black))
                    }
                }
                .frame(width: 44, height: 44)

                Text(item.title)
                    .font(.system(size: 9, weight: .bold, design: .rounded))
                    .lineLimit(1)
                    .frame(width: 56)
            }
            .padding(.horizontal, 6)
            .padding(.vertical, 5)
            .background(
                isSelected ? Color.yellow.opacity(0.95) : Color.white.opacity(0.10),
                in: RoundedRectangle(cornerRadius: 12, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(isSelected ? Color.white : Color.white.opacity(0.2), lineWidth: isSelected ? 2 : 1)
            )
            .foregroundStyle(isSelected ? .black : .white)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(item.title)
        .accessibilityIdentifier(item.accessibilityID ?? "world2.interior.decorator.tile.\(item.id)")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private func handlePick(_ id: String) {
        if id == "done" {
            onDone()
            return
        }
        if id == "empty" { return }
        if id.hasPrefix("inv.") {
            onSelectInventory(String(id.dropFirst(4)))
            return
        }
        if let prop = world.props.first(where: { $0.id == id }) {
            onSelectCatalog(
                FurnitureItem(
                    id: prop.id,
                    name: prop.name,
                    category: "Props",
                    assetName: prop.image,
                    price: 0,
                    defaultScale: 0.8,
                    placementLayer: .floor
                )
            )
            return
        }
        if let item = FurnitureItem.item(id: id) ?? catalogItems.first(where: { $0.id == id }) {
            onSelectCatalog(item)
        }
    }
}
