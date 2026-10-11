//
//  World2MinimapView.swift
//  abbies.world.ios
//
//  Shared overland graph drawing for the HUD chip, Planning Dept, and full map.
//  Nodes are known scenes; lines are travel tunnels. Layout comes from
//  World2MinimapAutoLayout (Peglin chain + BFS, no stacked cells).
//

import SwiftUI

struct World2MinimapView: View {
    let snapshot: World2WorldGraphSnapshot
    var compact: Bool = false
    /// Planning Dept shows open N/S/E/W stubs; the kid minimap hides them.
    var showExpansionStubs: Bool = true
    var onSelectScene: ((String) -> Void)?
    var onSelectOpenConnector: ((World2SceneConnector) -> Void)?

    private var cell: CGFloat { compact ? 44 : 88 }
    private var gap: CGFloat { compact ? 22 : 36 }

    private var bounds: (minX: Int, maxX: Int, minY: Int, maxY: Int) {
        let xs = snapshot.nodes.map(\.gridX)
        let ys = snapshot.nodes.map(\.gridY)
        return (
            xs.min() ?? 0,
            xs.max() ?? 0,
            ys.min() ?? 0,
            ys.max() ?? 0
        )
    }

    private var canvasSize: CGSize {
        let width = CGFloat(bounds.maxX - bounds.minX) * (cell + gap) + cell + gap * 2
        let height = CGFloat(bounds.maxY - bounds.minY) * (cell + gap) + cell + gap * 2
        return CGSize(
            width: max(width, compact ? 120 : 280),
            height: max(height, compact ? 90 : 180)
        )
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: compact ? 14 : 22, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.10, green: 0.22, blue: 0.20),
                            Color(red: 0.06, green: 0.10, blue: 0.16),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            // Edges under nodes so connections stay visible.
            ForEach(uniqueTravelEdges, id: \.id) { edge in
                if let from = snapshot.node(for: edge.from),
                   let to = snapshot.node(for: edge.to) {
                    tunnelLine(from: from, to: to)
                }
            }

            ForEach(snapshot.nodes) { node in
                nodeChip(node)
                    .position(point(for: node))
            }

            if showExpansionStubs {
                ForEach(openStubsToDraw) { connector in
                    if let node = snapshot.node(for: connector.fromSceneID) {
                        expansionStub(connector, from: node)
                    }
                }
            }
        }
        .frame(width: canvasSize.width, height: canvasSize.height)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(compact ? "world2.minimap.compact" : "world2.minimap")
    }

    private struct TravelEdge: Identifiable {
        let id: String
        let from: String
        let to: String
    }

    private var uniqueTravelEdges: [TravelEdge] {
        var seen = Set<String>()
        var edges: [TravelEdge] = []
        for connector in snapshot.connectors {
            guard let to = connector.toSceneID else { continue }
            let key = [connector.fromSceneID, to].sorted().joined(separator: ">")
            if seen.contains(key) { continue }
            seen.insert(key)
            edges.append(TravelEdge(id: key, from: connector.fromSceneID, to: to))
        }
        return edges
    }

    private var openStubsToDraw: [World2SceneConnector] {
        let focus = snapshot.currentSceneID ?? snapshot.nodes.first?.sceneID
        guard let focus else { return [] }
        return snapshot.openConnectors(from: focus)
    }

    private func point(for node: World2WorldGraphNode) -> CGPoint {
        let x = CGFloat(node.gridX - bounds.minX) * (cell + gap) + gap + cell / 2
        let y = CGFloat(node.gridY - bounds.minY) * (cell + gap) + gap + cell / 2
        return CGPoint(x: x, y: y)
    }

    /// Straight segment shortened so it meets node borders, not centers.
    private func tunnelLine(from: World2WorldGraphNode, to: World2WorldGraphNode) -> some View {
        let a = point(for: from)
        let b = point(for: to)
        let dx = b.x - a.x
        let dy = b.y - a.y
        let length = max(hypot(dx, dy), 1)
        let inset = cell * 0.42
        let ux = dx / length
        let uy = dy / length
        let start = CGPoint(x: a.x + ux * inset, y: a.y + uy * inset)
        let end = CGPoint(x: b.x - ux * inset, y: b.y - uy * inset)

        return ZStack {
            Path { path in
                path.move(to: start)
                path.addLine(to: end)
            }
            .stroke(
                Color.cyan.opacity(0.35),
                style: StrokeStyle(lineWidth: compact ? 5 : 8, lineCap: .round)
            )
            Path { path in
                path.move(to: start)
                path.addLine(to: end)
            }
            .stroke(
                Color(red: 0.45, green: 0.95, blue: 0.75),
                style: StrokeStyle(lineWidth: compact ? 2 : 3.5, lineCap: .round)
            )
        }
        .allowsHitTesting(false)
    }

    private func nodeChip(_ node: World2WorldGraphNode) -> some View {
        let isCurrent = node.sceneID == snapshot.currentSceneID
        let isPeglin = node.sceneID.hasPrefix("scene.peglin.")
        return Button {
            onSelectScene?(node.sceneID)
        } label: {
            VStack(spacing: compact ? 2 : 4) {
                Image(systemName: isCurrent ? "figure.walk.circle.fill" : (isPeglin ? "leaf.circle.fill" : "circle.fill"))
                    .font(.system(size: compact ? 14 : 22, weight: .black))
                if !compact {
                    Text(shortName(node.name))
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                        .frame(width: cell - 10)
                }
            }
            .foregroundStyle(.white)
            .frame(width: cell, height: compact ? cell * 0.7 : cell)
            .background(
                (isCurrent ? Color.orange : Color.black.opacity(0.55)),
                in: RoundedRectangle(cornerRadius: 14, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(isCurrent ? Color.white : Color.cyan.opacity(0.65), lineWidth: 2)
            )
            .shadow(color: .black.opacity(0.35), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
        .disabled(onSelectScene == nil)
        .accessibilityLabel(node.name)
        .accessibilityIdentifier("world2.minimap.node.\(node.sceneID)")
    }

    private func shortName(_ name: String) -> String {
        name
            .replacingOccurrences(of: " Land", with: "")
            .replacingOccurrences(of: " World", with: "")
            .replacingOccurrences(of: " Realm", with: "")
    }

    @ViewBuilder
    private func expansionStub(
        _ connector: World2SceneConnector,
        from node: World2WorldGraphNode
    ) -> some View {
        let origin = point(for: node)
        let offset: CGFloat = cell * 0.72
        let stubPoint: CGPoint = {
            switch connector.direction {
            case .north: return CGPoint(x: origin.x, y: origin.y - offset)
            case .south: return CGPoint(x: origin.x, y: origin.y + offset)
            case .east: return CGPoint(x: origin.x + offset, y: origin.y)
            case .west: return CGPoint(x: origin.x - offset, y: origin.y)
            }
        }()

        Path { path in
            path.move(to: origin)
            path.addLine(to: stubPoint)
        }
        .stroke(
            Color.yellow.opacity(0.7),
            style: StrokeStyle(lineWidth: 2, dash: [4, 3])
        )

        Button {
            onSelectOpenConnector?(connector)
        } label: {
            Text(connector.direction.shortLabel)
                .font(.system(size: compact ? 9 : 11, weight: .black, design: .rounded))
                .foregroundStyle(.black)
                .frame(width: compact ? 18 : 22, height: compact ? 18 : 22)
                .background(Color.yellow, in: Circle())
        }
        .buttonStyle(.plain)
        .position(stubPoint)
        .disabled(onSelectOpenConnector == nil)
        .accessibilityLabel("Open \(connector.direction.displayName) expansion")
        .accessibilityIdentifier(
            "world2.minimap.expansion.\(connector.fromSceneID).\(connector.direction.rawValue)"
        )
    }
}

/// Compact HUD chip that opens the full Planning Dept / graph sheet.
struct World2MinimapHUDChip: View {
    let snapshot: World2WorldGraphSnapshot
    let onOpen: () -> Void

    var body: some View {
        Button(action: onOpen) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 10, weight: .black))
                    Text("WORLD")
                        .font(.system(size: 9, weight: .black, design: .rounded))
                }
                .foregroundStyle(.white.opacity(0.85))

                World2MinimapView(
                    snapshot: snapshot,
                    compact: true,
                    showExpansionStubs: false
                )
                .allowsHitTesting(false)
                .scaleEffect(0.92, anchor: .topLeading)
                .frame(width: 118, height: 78, alignment: .topLeading)
                .clipped()
            }
            .padding(8)
            .background(.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(.white.opacity(0.55), lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Open world minimap")
        .accessibilityIdentifier("world2.hud.minimap")
    }
}

/// Full-screen auto-drawn world graph (Peglin chain + travel edges).
struct World2MinimapScreen: View {
    let snapshot: World2WorldGraphSnapshot
    var onSelectScene: ((String) -> Void)?
    let onClose: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.07, green: 0.16, blue: 0.18),
                    Color(red: 0.04, green: 0.07, blue: 0.12),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                HStack {
                    Button(action: onClose) {
                        Label("Back", systemImage: "arrow.left")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 9)
                            .background(.black.opacity(0.45), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world2.minimap.close")

                    Spacer()

                    VStack(spacing: 2) {
                        Text("World map")
                            .font(.system(size: 20, weight: .black, design: .rounded))
                            .foregroundStyle(.white)
                        Text(subtitle)
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundStyle(.white.opacity(0.7))
                    }

                    Spacer()
                    Color.clear.frame(width: 88, height: 1)
                }
                .padding(.horizontal, 16)
                .padding(.top, 14)
                .padding(.bottom, 8)

                ScrollView([.horizontal, .vertical]) {
                    World2MinimapView(
                        snapshot: snapshot,
                        compact: false,
                        showExpansionStubs: false,
                        onSelectScene: { sceneID in
                            onSelectScene?(sceneID)
                            onClose()
                        }
                    )
                    .padding(24)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)

                Text("Tap a land to travel · lines are the paths between them")
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.65))
                    .padding(.bottom, 18)
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("world2.minimap.screen")
    }

    private var subtitle: String {
        let count = snapshot.nodes.count
        if let current = snapshot.nodes.first(where: { $0.sceneID == snapshot.currentSceneID }) {
            return "You are in \(current.name) · \(count) lands"
        }
        return "\(count) lands"
    }
}
