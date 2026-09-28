//
//  World2SceneDecorateLayer.swift
//  abbies.world.ios
//
//  Shared decorate overlay for overland / mutable scenes (not just treehouse POIs).
//

import SwiftUI

/// Stamp + arrange furniture on a scene plate using the same inventory as the treehouse.
struct World2SceneDecorateLayer: View {
    let surfaceKey: String
    let mapRect: CGRect
    let isArranging: Bool
    @Binding var selectedFurnitureID: String?
    @Binding var selectedCatalogItemID: String?
    var coordinateSpaceName: String = "world2.sceneDecorate"
    /// Right-edge strip (drawer) that accepts a drag-to-put-away.
    var returnZoneMinX: CGFloat? = nil

    @ObservedObject private var playerService = PlayerStateService.shared

    private var placedFurniture: [DecorationInstance] {
        playerService.placedFurniture(onSurface: surfaceKey)
    }

    var body: some View {
        ZStack {
            // Positioned stamps are taken out of layout. This filler must stay
            // after Done or the stack collapses and every prop vanishes.
            Color.clear
                .frame(width: mapRect.width, height: mapRect.height)
                .contentShape(Rectangle())
                .allowsHitTesting(isArranging)
                .gesture(
                    DragGesture(minimumDistance: 0, coordinateSpace: .named(coordinateSpaceName))
                        .onEnded { value in
                            guard isArranging,
                                  selectedCatalogItemID != nil || selectedFurnitureID != nil
                            else { return }
                            let travel = hypot(value.translation.width, value.translation.height)
                            guard travel < 10 else { return }
                            stamp(at: value.location)
                        }
                )
                .dropDestination(for: String.self) { items, location in
                    guard isArranging else { return false }
                    return stampDragged(items, at: location)
                }

            ForEach(placedFurniture) { instance in
                if let piece = World2RoomPiece.resolve(
                    instance.decorationId,
                    player: playerService.currentPlayer
                ) {
                    World2PlacedFurnitureView(
                        instance: instance,
                        piece: piece,
                        canvasSize: mapRect.size,
                        isArranging: isArranging,
                        isSelected: selectedFurnitureID == instance.id,
                        returnZoneMinX: returnZoneMinX,
                        coordinateSpaceName: coordinateSpaceName,
                        onSelect: {
                            selectedFurnitureID = instance.id
                            selectedCatalogItemID = nil
                            playerService.bringFurnitureToFront(instanceId: instance.id)
                        },
                        onMove: { dx, dy in
                            playerService.updateFurnitureTransform(
                                instanceId: instance.id,
                                x: instance.x + dx,
                                y: instance.y + dy
                            )
                        },
                        onScale: { scale in
                            playerService.updateFurnitureTransform(
                                instanceId: instance.id,
                                scale: scale
                            )
                        },
                        onRotation: { rotation in
                            playerService.updateFurnitureTransform(
                                instanceId: instance.id,
                                rotation: rotation
                            )
                        },
                        onReturnToInventory: {
                            playerService.returnFurnitureToInventory(instanceId: instance.id)
                            if selectedFurnitureID == instance.id {
                                selectedFurnitureID = nil
                            }
                        },
                        onDragStateChanged: { _ in }
                    )
                }
            }
        }
        .frame(width: mapRect.width, height: mapRect.height)
        .position(x: mapRect.midX, y: mapRect.midY)
        .coordinateSpace(name: coordinateSpaceName)
        .allowsHitTesting(isArranging)
        .accessibilityIdentifier("world2.sceneDecorate.layer.\(surfaceKey)")
    }

    private func stamp(at location: CGPoint) {
        let x = Double(location.x / max(mapRect.width, 1))
        let y = Double(location.y / max(mapRect.height, 1))
        if let catalogID = selectedCatalogItemID,
           let item = Self.catalogItem(id: catalogID) {
            if let id = playerService.placeCatalogFurniture(
                item: item,
                x: x,
                y: y,
                roomId: surfaceKey
            ) {
                selectedFurnitureID = id
                selectedCatalogItemID = nil
                World2Diagnostics.log(
                    "scene_decorate_catalog_stamp",
                    ["item": item.id, "surface": surfaceKey]
                )
            }
            return
        }
        if let inventoryID = selectedFurnitureID {
            playerService.placeFurniture(
                instanceId: inventoryID,
                x: x,
                y: y,
                roomId: surfaceKey
            )
            World2Diagnostics.log(
                "scene_decorate_inventory_stamp",
                ["instance": inventoryID, "surface": surfaceKey]
            )
        }
    }

    private func stampDragged(_ items: [String], at location: CGPoint) -> Bool {
        guard let raw = items.first,
              let parsed = World2DecorateDragPayload.parse(raw)
        else { return false }
        let x = Double(location.x / max(mapRect.width, 1))
        let y = Double(location.y / max(mapRect.height, 1))
        switch parsed.kind {
        case .inventory:
            playerService.placeFurniture(
                instanceId: parsed.id, x: x, y: y, roomId: surfaceKey
            )
            selectedFurnitureID = parsed.id
            selectedCatalogItemID = nil
            return true
        case .catalog:
            guard let item = Self.catalogItem(id: parsed.id) else { return false }
            if let id = playerService.placeCatalogFurniture(
                item: item, x: x, y: y, roomId: surfaceKey
            ) {
                selectedFurnitureID = id
                selectedCatalogItemID = nil
                return true
            }
            return false
        }
    }

    private static func catalogItem(id: String) -> FurnitureItem? {
        resolvedCatalogItem(id: id)
    }

    static func resolvedCatalogItem(id: String) -> FurnitureItem? {
        if let item = FurnitureItem.item(id: id) { return item }
        guard let prop = World2WorldSync.shared.props.first(where: { $0.id == id }) else {
            return nil
        }
        return FurnitureItem(
            id: prop.id,
            name: prop.name,
            category: "Props",
            assetName: prop.image,
            price: 0,
            defaultScale: 0.8,
            placementLayer: .floor
        )
    }
}

/// Decorate tray + stamp layer for any screen that isn't an overland map
/// (Daddy's home, shops, minigames).
struct World2AnywhereDecorateOverlay: View {
    let title: String
    let surfaceKey: String
    var isArranging: Bool = true
    @Binding var selectedFurnitureID: String?
    @Binding var selectedCatalogItemID: String?
    @Binding var filter: DecorateFilterID
    let onDone: () -> Void

    @State private var drawerExpanded = true

    var body: some View {
        GeometryReader { geo in
            let rect = CGRect(origin: .zero, size: geo.size)
            let drawerW = drawerExpanded
                ? World2DecorateTray.expandedWidth
                : World2DecorateTray.minimizedWidth
            ZStack(alignment: .trailing) {
                World2SceneDecorateLayer(
                    surfaceKey: surfaceKey,
                    mapRect: rect,
                    isArranging: isArranging,
                    selectedFurnitureID: $selectedFurnitureID,
                    selectedCatalogItemID: $selectedCatalogItemID,
                    returnZoneMinX: isArranging ? max(0, rect.width - drawerW) : nil
                )
                if isArranging {
                    World2DecorateTray(
                        playerName: title,
                        selectedCatalogID: selectedCatalogItemID,
                        selectedInventoryID: selectedFurnitureID,
                        filter: filter,
                        isExpanded: $drawerExpanded,
                        onFilterChange: { filter = $0 },
                        onSelectCatalog: { item in
                            selectedCatalogItemID = item.id
                            selectedFurnitureID = nil
                        },
                        onSelectInventory: { id in
                            selectedFurnitureID = id
                            selectedCatalogItemID = nil
                        },
                        onReturnInventoryID: { id in
                            PlayerStateService.shared.returnFurnitureToInventory(instanceId: id)
                            if selectedFurnitureID == id { selectedFurnitureID = nil }
                        },
                        onDone: onDone
                    )
                }
            }
        }
        .allowsHitTesting(isArranging)
        .accessibilityIdentifier("world2.decorateAnywhere")
    }
}
