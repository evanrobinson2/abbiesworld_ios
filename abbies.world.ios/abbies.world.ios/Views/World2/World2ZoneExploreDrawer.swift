//
//  World2ZoneExploreDrawer.swift
//  abbies.world.ios
//
//  Right-thumb choices, stacked top to bottom. Tap a tile to go. Exit sits
//  at the bottom of a POI stack so a small thumb can leave.
//

import SwiftUI

struct World2ThumbAction: Identifiable, Equatable {
    let id: String
    let title: String
    let icon: String
    var asset: String? = nil
    var accessibilityID: String? = nil

    static let exitID = "exit"

    static func exit(title: String = "Exit", accessibilityID: String) -> World2ThumbAction {
        World2ThumbAction(
            id: exitID,
            title: title,
            icon: "door.left.hand.open",
            accessibilityID: accessibilityID
        )
    }
}

struct World2ThumbActionStack: View {
    let actions: [World2ThumbAction]
    var selectedID: String? = nil
    var liftsForStick: Bool = false
    var footer: World2ThumbAction? = nil
    var padsEdges: Bool = true
    let onPick: (String) -> Void

    @State private var page = 0

    private var pageCount: Int {
        max(1, (actions.count + World2ThumbChoicePad.pageSize - 1)
            / World2ThumbChoicePad.pageSize)
    }

    private var pageItems: [World2ThumbAction] {
        World2ThumbChoicePad.page(of: actions, page: page)
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            if !pageItems.isEmpty || footer != nil {
                VStack(spacing: 8) {
                    ForEach(Array(pageItems.enumerated()), id: \.element.id) { offset, item in
                        tile(item, slot: offset)
                    }
                    if let footer {
                        tile(footer, slot: pageItems.count, isFooter: true)
                    }
                }
                .frame(width: 208)
                if pageCount > 1 {
                    pageDots
                }
            }
        }
        .padding(.trailing, padsEdges ? 14 : 0)
        .padding(.bottom, padsEdges ? (liftsForStick ? 154 : 22) : 0)
        .onChange(of: actions.map(\.id)) { _, _ in
            page = min(page, pageCount - 1)
        }
        .onChange(of: selectedID) { _, id in
            guard let id,
                  let index = actions.firstIndex(where: { $0.id == id }) else {
                return
            }
            page = index / World2ThumbChoicePad.pageSize
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.zoneExplorer")
    }

    private var pageDots: some View {
        HStack(spacing: 6) {
            ForEach(0..<pageCount, id: \.self) { index in
                Circle()
                    .fill(index == page ? Color.white : Color.white.opacity(0.35))
                    .frame(width: 7, height: 7)
                    .onTapGesture { page = index }
            }
        }
        .padding(.top, 2)
        .accessibilityIdentifier("world2.zoneExplorer.page")
    }

    private func tile(_ item: World2ThumbAction, slot: Int, isFooter: Bool = false) -> some View {
        let isSelected = selectedID == item.id
        let isExit = item.id == World2ThumbAction.exitID
        let accent: Color = {
            if isFooter { return Color(red: 0.28, green: 0.78, blue: 0.42) }
            if isExit { return Color.white.opacity(0.85) }
            return World2ThumbChoicePad.color(slot)
        }()
        return Button {
            onPick(item.id)
        } label: {
            HStack(spacing: 10) {
                if let asset = item.asset, !asset.isEmpty {
                    World2SemanticImage(
                        semanticName: asset,
                        fallbackIcon: item.icon,
                        fallbackLabel: item.title
                    )
                    // Map plates fill the thumb; landmark tokens still fit.
                    .scaledToFill()
                    .frame(width: 72, height: 72)
                    .clipped()
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                } else {
                    Image(systemName: item.icon)
                        .font(.system(size: 22, weight: .black))
                        .frame(width: 72, height: 72)
                }
                Text(item.title)
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, minHeight: 72)
            .background(
                isSelected ? accent.opacity(0.92) : Color.black.opacity(0.72),
                in: RoundedRectangle(cornerRadius: 16, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(isSelected ? Color.white : accent.opacity(0.9), lineWidth: isSelected ? 3 : 2)
            )
        }
        .buttonStyle(.plain)
        .foregroundStyle(.white)
        .accessibilityLabel(item.title)
        .accessibilityIdentifier(item.accessibilityID ?? "world2.zoneExplorer.tile.\(item.id)")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

extension View {
    /// POI interiors: extras paginate; Exit is a sticky footer so it never
    /// hides behind room / decorate tiles (page size is 4).
    func world2InteriorActions(
        _ extras: [World2ThumbAction] = [],
        selectedID: String? = nil,
        exitTitle: String = "Exit",
        exitAccessibilityID: String,
        enabled: Bool = true,
        onExit: @escaping () -> Void,
        onPick: @escaping (String) -> Void = { _ in }
    ) -> some View {
        overlay(alignment: .bottomTrailing) {
            if enabled {
                World2ThumbActionStack(
                    actions: extras,
                    selectedID: selectedID,
                    footer: .exit(title: exitTitle, accessibilityID: exitAccessibilityID),
                    onPick: { id in
                        if id == World2ThumbAction.exitID {
                            onExit()
                        } else {
                            onPick(id)
                        }
                    }
                )
                .zIndex(46)
            }
        }
    }
}

struct World2ZoneExploreDrawer: View {
    let interactions: [World2ZoneInteraction]
    @Binding var selectedID: String?
    /// First tap: highlight + walk Abbie to the landmark.
    var onSelect: ((String) -> Void)? = nil
    /// Confirm / Place-badge Enter: actually go inside.
    let onGo: () -> Void
    var liftsForStick: Bool = false

    var body: some View {
        World2ThumbActionStack(
            actions: interactions.map { item in
                World2ThumbAction(
                    id: item.id,
                    title: item.title,
                    icon: item.icon,
                    asset: item.asset,
                    accessibilityID: "world2.zoneExplorer.tile.\(item.id)"
                )
            },
            selectedID: selectedID,
            liftsForStick: liftsForStick,
            onPick: { id in
                let alreadySelected = selectedID == id
                selectedID = id
                if alreadySelected {
                    // Second tap on the same tile enters.
                    onGo()
                } else {
                    onSelect?(id)
                }
            }
        )
    }
}

enum World2ThumbChoicePad {
    static let pageSize = 4

    static func page<T>(of items: [T], page: Int) -> [T] {
        guard !items.isEmpty else { return [] }
        let clamped = min(max(page, 0), max(0, (items.count - 1) / pageSize))
        let start = clamped * pageSize
        return Array(items[start..<min(start + pageSize, items.count)])
    }

    static func color(_ index: Int) -> Color {
        switch index % pageSize {
        case 0: return .orange
        case 1: return .yellow
        case 2: return Color(red: 0.35, green: 0.86, blue: 0.72)
        default: return Color(red: 1.0, green: 0.55, blue: 0.78)
        }
    }
}
