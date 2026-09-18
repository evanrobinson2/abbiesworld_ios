//
//  World2MinimapView.swift
//  abbies.world.ios
//
//  Compass-rose minimap. The current scene sits in the middle; NESW tiles are
//  the registered minimap icons of the scenes those portals lead to. An empty
//  socket stays empty so a child can see that west does not go anywhere yet.
//

import SwiftUI

struct World2MinimapView: View {
    let neighborhood: World2MinimapNeighborhood
    let onSelect: (World2Compass) -> Void

    var body: some View {
        VStack(spacing: 5) {
            tile(neighborhood.north)
            HStack(spacing: 5) {
                tile(neighborhood.west)
                hereTile
                tile(neighborhood.east)
            }
            tile(neighborhood.south)
        }
        .padding(8)
        .background(.black.opacity(0.54), in: RoundedRectangle(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(.white.opacity(0.32), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.28), radius: 10, y: 4)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.minimap")
        .accessibilityLabel("Minimap of \(neighborhood.here.name)")
    }

    private var hereTile: some View {
        World2MinimapTileView(tile: neighborhood.here, size: 56)
            .overlay {
                RoundedRectangle(cornerRadius: 10)
                    .stroke(.white, lineWidth: 2.5)
            }
            .overlay(alignment: .bottom) {
                Text("YOU")
                    .font(.system(size: 8, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 1)
                    .background(.black.opacity(0.72), in: Capsule())
                    .offset(y: 4)
            }
            .accessibilityIdentifier("world2.minimap.here")
            .accessibilityLabel("You are in \(neighborhood.here.name)")
    }

    @ViewBuilder
    private func tile(_ tile: World2MinimapTile) -> some View {
        Button {
            guard let compass = tile.compass else { return }
            onSelect(compass)
        } label: {
            World2MinimapTileView(tile: tile, size: 44)
        }
        .buttonStyle(.plain)
        .disabled(tile.compass == nil)
        .accessibilityIdentifier(
            tile.isOpen
                ? "world2.minimap.\(tile.compass?.rawValue ?? "here")"
                : "world2.minimap.socket.\(tile.compass?.rawValue ?? "empty")"
        )
        .accessibilityLabel(
            tile.isOpen
                ? "\(tile.compass?.label ?? "") \(tile.name)"
                : "\(tile.compass?.label ?? "") is not a path yet"
        )
    }
}

private struct World2MinimapTileView: View {
    let tile: World2MinimapTile
    let size: CGFloat

    var body: some View {
        ZStack {
            if tile.isOpen {
                World2MinimapIcon(
                    semanticName: tile.minimapIcon,
                    style: tile.minimapIconStyle,
                    name: tile.name
                )
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .stroke(.white.opacity(0.35), style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(.white.opacity(0.06))
                    )
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct World2MinimapIcon: View {
    let semanticName: String
    let style: World2MinimapIconStyle?
    let name: String

    var body: some View {
        if let image = AssetBootstrapService.shared.image(for: semanticName) {
            Image(uiImage: image)
                .resizable()
                .scaledToFill()
                .accessibilityLabel(name)
        } else if let style {
            World2MinimapDrawnIcon(style: style)
                .accessibilityLabel(name)
        } else {
            World2SemanticImage(
                semanticName: semanticName,
                fallbackIcon: "map.fill",
                fallbackLabel: name
            )
            .scaledToFill()
        }
    }
}

struct World2MinimapDrawnIcon: View {
    let style: World2MinimapIconStyle

    var body: some View {
        ZStack {
            LinearGradient(colors: sky, startPoint: .top, endPoint: .bottom)
            ground
            emblem
        }
        .accessibilityIdentifier("world2.minimap.icon.\(style.rawValue)")
    }

    private var sky: [Color] {
        switch style {
        case .homeGrove: return [Color(red: 0.55, green: 0.82, blue: 0.95), Color(red: 0.42, green: 0.72, blue: 0.38)]
        case .workMeadow: return [Color(red: 0.78, green: 0.84, blue: 0.90), Color(red: 0.88, green: 0.62, blue: 0.36)]
        case .farmMeadow: return [Color(red: 0.62, green: 0.86, blue: 0.95), Color(red: 0.72, green: 0.86, blue: 0.32)]
        case .woodsCottage: return [Color(red: 0.22, green: 0.38, blue: 0.28), Color(red: 0.42, green: 0.28, blue: 0.14)]
        case .blankGrid: return [Color(red: 0.82, green: 0.95, blue: 1.0), Color(red: 0.91, green: 0.98, blue: 0.91)]
        case .placeholder: return [Color.gray.opacity(0.7), Color.indigo.opacity(0.55)]
        case .orphanClearing: return [Color(red: 0.72, green: 0.88, blue: 0.98), Color(red: 0.62, green: 0.78, blue: 0.48)]
        }
    }

    @ViewBuilder
    private var ground: some View {
        switch style {
        case .blankGrid:
            World2MinimapGrid()
                .stroke(.white.opacity(0.45), lineWidth: 0.8)
        default:
            EmptyView()
        }
    }

    @ViewBuilder
    private var emblem: some View {
        switch style {
        case .homeGrove:
            Image(systemName: "house.fill")
                .font(.system(size: 16, weight: .black))
                .foregroundStyle(.pink)
        case .workMeadow:
            Image(systemName: "gearshape.2.fill")
                .font(.system(size: 16, weight: .black))
                .foregroundStyle(.orange)
        case .farmMeadow:
            Image(systemName: "leaf.fill")
                .font(.system(size: 16, weight: .black))
                .foregroundStyle(.green)
        case .woodsCottage:
            Image(systemName: "tree.fill")
                .font(.system(size: 16, weight: .black))
                .foregroundStyle(.brown)
        case .blankGrid:
            Image(systemName: "square.dashed")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.cyan)
        case .placeholder:
            Image(systemName: "mountain.2.fill")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.white.opacity(0.9))
        case .orphanClearing:
            Image(systemName: "map.fill")
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.white)
        }
    }
}

private struct World2MinimapGrid: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let step = max(rect.width / 4, 6)
        stride(from: rect.minX, through: rect.maxX, by: step).forEach { x in
            path.move(to: CGPoint(x: x, y: rect.minY))
            path.addLine(to: CGPoint(x: x, y: rect.maxY))
        }
        stride(from: rect.minY, through: rect.maxY, by: step).forEach { y in
            path.move(to: CGPoint(x: rect.minX, y: y))
            path.addLine(to: CGPoint(x: rect.maxX, y: y))
        }
        return path
    }
}
