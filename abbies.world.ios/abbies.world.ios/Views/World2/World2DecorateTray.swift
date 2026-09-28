//
//  World2DecorateTray.swift
//  abbies.world.ios
//
//  Right-side decorate drawer with an edge handle to minimize. Drag art into
//  the room to place; drag room pieces onto the drawer to put them away.
//  Close (X) only leaves decorate mode — never the place.
//

import SwiftUI
import UniformTypeIdentifiers

enum World2DecorateDragPayload {
    static let utType = UTType.plainText

    static func inventory(_ id: String) -> String { "inv.\(id)" }
    static func catalog(_ id: String) -> String { "cat.\(id)" }

    static func parse(_ raw: String) -> (kind: Kind, id: String)? {
        if raw.hasPrefix("inv.") {
            return (.inventory, String(raw.dropFirst(4)))
        }
        if raw.hasPrefix("cat.") {
            return (.catalog, String(raw.dropFirst(4)))
        }
        // Legacy: bare inventory instance id from older drawers.
        if raw.contains(".") == false, !raw.isEmpty {
            return (.inventory, raw)
        }
        return nil
    }

    enum Kind { case inventory, catalog }
}

/// Which stamp grid the decorate tray offers.
enum World2DecorateCatalogPolicy: Equatable {
    /// Legacy: empty while on a server world doc; else full `storeCatalog`.
    case storeDefault
    /// Always the full furniture store catalog (including Cozy Room kit).
    case storeAlways
    /// Abbie cottage only — CottageDecorKit + Abbie starter bed. No Cozy Room / remote props.
    case abbieCottageOnly
}

struct World2DecorateTray: View {
    let playerName: String
    let selectedCatalogID: String?
    let selectedInventoryID: String?
    let filter: DecorateFilterID
    @Binding var isExpanded: Bool
    /// True while a placed piece is being dragged (glow the return zone).
    var isReturnTargetActive: Bool = false
    /// Cottage rooms use `.abbieCottageOnly` so SF-symbol “unbundled” props never appear.
    var catalogPolicy: World2DecorateCatalogPolicy = .storeDefault
    let onFilterChange: (DecorateFilterID) -> Void
    let onSelectCatalog: (FurnitureItem) -> Void
    let onSelectInventory: (String) -> Void
    /// Drop a placed piece onto the drawer to put it away.
    var onReturnInventoryID: ((String) -> Void)? = nil
    /// Leaves decorate mode only (does not exit the room / map).
    let onDone: () -> Void

    @ObservedObject private var playerService = PlayerStateService.shared
    @ObservedObject private var world = World2WorldSync.shared

    static let expandedWidth: CGFloat = 268
    static let minimizedWidth: CGFloat = 44

    private var catalogItems: [FurnitureItem] {
        let source: [FurnitureItem]
        switch catalogPolicy {
        case .storeDefault:
            guard !world.usesServerDocument else { return [] }
            source = FurnitureItem.storeCatalog
        case .storeAlways:
            source = FurnitureItem.storeCatalog
        case .abbieCottageOnly:
            source = FurnitureItem.abbieCottageDecorCatalog
        }
        return source.filter { filter.matches(item: $0) }
    }

    private var showsRemoteProps: Bool {
        catalogPolicy != .abbieCottageOnly
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
        var tiles: [World2ThumbAction] = []
        // Remote world props often lack bundled art → purple SF Symbol tiles.
        // Abbie's cottage never stamps those; only CottageDecorKit.
        if showsRemoteProps {
            tiles.append(contentsOf: world.props.map { prop in
                World2ThumbAction(
                    id: prop.id,
                    title: World2ChromeContract.shortDecorationLabel(prop.name),
                    icon: "shippingbox",
                    asset: prop.image,
                    accessibilityID: "world2.interior.decorator.prop.\(prop.id)"
                )
            })
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
        HStack(spacing: 0) {
            // Clear lane so the room still receives taps / drops.
            Color.clear
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .allowsHitTesting(false)

            if isExpanded {
                expandedDrawer
                    .transition(.move(edge: .trailing).combined(with: .opacity))
            } else {
                minimizedTab
                    .transition(.move(edge: .trailing).combined(with: .opacity))
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .trailing)
        .animation(.spring(response: 0.34, dampingFraction: 0.86), value: isExpanded)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Decorate \(playerName)")
        .accessibilityIdentifier("world2.interior.decorator.tray")
    }

    private var minimizedTab: some View {
        VStack(spacing: 10) {
            closeButton(compact: true)
            Button {
                withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                    isExpanded = true
                }
            } label: {
                VStack(spacing: 10) {
                    Capsule()
                        .fill(.white.opacity(0.55))
                        .frame(width: 5, height: 36)
                    Image(systemName: "chevron.left")
                        .font(.system(size: 13, weight: .black))
                    Image(systemName: "paintbrush.pointed.fill")
                        .font(.system(size: 16, weight: .black))
                    Text("Art")
                        .font(.system(size: 10, weight: .black, design: .rounded))
                }
                .foregroundStyle(.white)
                .padding(.vertical, 14)
                .padding(.horizontal, 8)
                .frame(width: Self.minimizedWidth)
                .background(
                    (isReturnTargetActive ? Color.red.opacity(0.55) : Color.black.opacity(0.72)),
                    in: UnevenRoundedRectangle(
                        topLeadingRadius: 16,
                        bottomLeadingRadius: 16,
                        bottomTrailingRadius: 4,
                        topTrailingRadius: 4,
                        style: .continuous
                    )
                )
                .overlay(
                    UnevenRoundedRectangle(
                        topLeadingRadius: 16,
                        bottomLeadingRadius: 16,
                        bottomTrailingRadius: 4,
                        topTrailingRadius: 4,
                        style: .continuous
                    )
                    .stroke(
                        isReturnTargetActive ? Color.red : Color.white.opacity(0.28),
                        lineWidth: isReturnTargetActive ? 2 : 1
                    )
                )
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Open decorate drawer")
            .accessibilityIdentifier("world2.interior.decorator.expand")
            .dropDestination(for: String.self) { items, _ in
                acceptReturnDrop(items)
            }
            Spacer(minLength: 0)
        }
        .padding(.trailing, 6)
        .padding(.top, 56)
    }

    private var expandedDrawer: some View {
        HStack(spacing: 0) {
            edgeHandle
            VStack(alignment: .leading, spacing: 0) {
                header
                Text(
                    isReturnTargetActive
                        ? "Drop here to put away"
                        : (selectedTitle.map { "Drag \($0) into the room" }
                            ?? "Drag art into the room — or onto this drawer to put away")
                )
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.92))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(
                    isReturnTargetActive ? Color.red.opacity(0.35) : Color.white.opacity(0.08)
                )
                .accessibilityIdentifier("world2.interior.decorator.hint")
                filterBar
                assetGrid
                Spacer(minLength: 0)
            }
            .frame(width: Self.expandedWidth - 22)
        }
        .frame(width: Self.expandedWidth)
        .frame(maxHeight: .infinity)
        .background(
            UnevenRoundedRectangle(
                topLeadingRadius: 22,
                bottomLeadingRadius: 22,
                bottomTrailingRadius: 0,
                topTrailingRadius: 0,
                style: .continuous
            )
            .fill(isReturnTargetActive ? Color.red.opacity(0.35) : Color.black.opacity(0.78))
            .ignoresSafeArea(edges: .trailing)
        )
        .overlay(alignment: .leading) {
            UnevenRoundedRectangle(
                topLeadingRadius: 22,
                bottomLeadingRadius: 22,
                bottomTrailingRadius: 0,
                topTrailingRadius: 0,
                style: .continuous
            )
            .stroke(
                isReturnTargetActive ? Color.red.opacity(0.9) : Color.white.opacity(0.22),
                lineWidth: isReturnTargetActive ? 2.5 : 1
            )
            .ignoresSafeArea(edges: .trailing)
        }
        .dropDestination(for: String.self) { items, _ in
            acceptReturnDrop(items)
        }
        .accessibilityIdentifier("world2.interior.decorator.drawer")
    }

    /// Visible grabber on the leading edge — tap or swipe right to minimize.
    private var edgeHandle: some View {
        VStack {
            Spacer()
            Capsule()
                .fill(.white.opacity(0.65))
                .frame(width: 5, height: 64)
                .padding(.vertical, 8)
                .padding(.horizontal, 8)
                .background(
                    Capsule()
                        .fill(.white.opacity(0.12))
                        .frame(width: 18, height: 88)
                )
            Spacer()
        }
        .frame(width: 22)
        .frame(maxHeight: .infinity)
        .contentShape(Rectangle())
        .gesture(
            DragGesture(minimumDistance: 8)
                .onEnded { value in
                    if value.translation.width > 36 {
                        withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                            isExpanded = false
                        }
                    }
                }
        )
        .onTapGesture {
            withAnimation(.spring(response: 0.34, dampingFraction: 0.86)) {
                isExpanded = false
            }
        }
        .accessibilityLabel("Minimize decorate drawer")
        .accessibilityIdentifier("world2.interior.decorator.handle")
    }

    private var header: some View {
        HStack(spacing: 8) {
            Text("Decorate")
                .font(.system(size: 16, weight: .black, design: .rounded))
                .foregroundStyle(.white)
            Spacer(minLength: 4)
            closeButton(compact: false)
        }
        .padding(.horizontal, 12)
        .padding(.top, 14)
        .padding(.bottom, 10)
        .accessibilityIdentifier("world2.interior.decorator.bar")
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
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
            }
            .padding(.horizontal, 12)
        }
        .padding(.bottom, 8)
    }

    private var assetGrid: some View {
        ScrollView(.vertical, showsIndicators: false) {
            LazyVGrid(
                columns: [
                    GridItem(.flexible(), spacing: 8),
                    GridItem(.flexible(), spacing: 8),
                ],
                spacing: 8
            ) {
                ForEach(itemActions) { item in
                    compactThumb(item)
                }
            }
            .padding(.horizontal, 12)
            .padding(.bottom, 20)
        }
        .accessibilityIdentifier("world2.interior.decorator.grid")
    }

    private func closeButton(compact: Bool) -> some View {
        Button(action: onDone) {
            Image(systemName: "xmark")
                .font(.system(size: compact ? 14 : 15, weight: .black))
                .foregroundStyle(.white)
                .frame(width: 36, height: 36)
                .background(Color.red.opacity(0.85), in: Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Close decorate")
        .accessibilityIdentifier("world2.interior.decorator.done")
    }

    private func compactThumb(_ item: World2ThumbAction) -> some View {
        let isSelected = selectedActionID == item.id
        let dragID: String? = {
            if item.id == "empty" { return nil }
            if item.id.hasPrefix("inv.") { return item.id }
            return World2DecorateDragPayload.catalog(item.id)
        }()

        return Button {
            handlePick(item.id)
        } label: {
            VStack(spacing: 4) {
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
                            .font(.system(size: 22, weight: .black))
                    }
                }
                .frame(width: 56, height: 56)

                Text(item.title)
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .lineLimit(2)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
            }
            .padding(8)
            .frame(maxWidth: .infinity)
            .background(
                isSelected ? Color.yellow.opacity(0.95) : Color.white.opacity(0.10),
                in: RoundedRectangle(cornerRadius: 14, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(
                        isSelected ? Color.white : Color.white.opacity(0.2),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
            .foregroundStyle(isSelected ? .black : .white)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(item.title)
        .accessibilityHint("Drag into the room to place")
        .accessibilityIdentifier(item.accessibilityID ?? "world2.interior.decorator.tile.\(item.id)")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
        .modifier(DecorateThumbDragModifier(payload: dragID, title: item.title, asset: item.asset, icon: item.icon))
    }

    private func handlePick(_ id: String) {
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

    private func acceptReturnDrop(_ items: [String]) -> Bool {
        guard let raw = items.first,
              let parsed = World2DecorateDragPayload.parse(raw),
              parsed.kind == .inventory
        else { return false }
        onReturnInventoryID?(parsed.id)
        return true
    }
}

/// Optional drag payload so empty tiles stay non-draggable.
private struct DecorateThumbDragModifier: ViewModifier {
    let payload: String?
    let title: String
    let asset: String?
    let icon: String

    func body(content: Content) -> some View {
        if let payload {
            content.draggable(payload) {
                VStack(spacing: 4) {
                    if let asset, !asset.isEmpty {
                        World2SemanticImage(
                            semanticName: asset,
                            fallbackIcon: icon,
                            fallbackLabel: title
                        )
                        .scaledToFit()
                        .frame(width: 72, height: 72)
                    } else {
                        Image(systemName: icon)
                            .font(.system(size: 28, weight: .black))
                    }
                    Text(title)
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                }
                .padding(10)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
        } else {
            content
        }
    }
}
