//
//  World2MinimapView.swift
//  abbies.world.ios
//
//  Shared overland graph drawing for the HUD chip and Planning Dept.
//  Nodes are known scenes; stub spokes are open N/S/E/W expansion tunnels.
//

import SwiftUI

struct World2MinimapView: View {
    let snapshot: World2WorldGraphSnapshot
    var compact: Bool = false
    var onSelectScene: ((String) -> Void)?
    var onSelectOpenConnector: ((World2SceneConnector) -> Void)?

    private var cell: CGFloat { compact ? 44 : 72 }
    private var gap: CGFloat { compact ? 18 : 28 }

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
            width: max(width, compact ? 120 : 220),
            height: max(height, compact ? 90 : 160)
        )
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: compact ? 14 : 22, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            Color(red: 0.12, green: 0.18, blue: 0.28),
                            Color(red: 0.08, green: 0.12, blue: 0.20),
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            // Tunnel lines first so nodes sit on top.
            ForEach(snapshot.connectors.filter { !$0.isOpen }) { connector in
                if let from = snapshot.node(for: connector.fromSceneID),
                   let toID = connector.toSceneID,
                   let to = snapshot.node(for: toID),
                   from.sceneID < to.sceneID {
                    tunnelLine(from: from, to: to)
                }
            }

            ForEach(snapshot.nodes) { node in
                nodeChip(node)
                    .position(point(for: node))
            }

            // Open expansion stubs around the current (or first) scene.
            ForEach(openStubsToDraw) { connector in
                if let node = snapshot.node(for: connector.fromSceneID) {
                    expansionStub(connector, from: node)
                }
            }
        }
        .frame(width: canvasSize.width, height: canvasSize.height)
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier(compact ? "world2.minimap.compact" : "world2.minimap")
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

    private func tunnelLine(from: World2WorldGraphNode, to: World2WorldGraphNode) -> some View {
        let a = point(for: from)
        let b = point(for: to)
        return Path { path in
            path.move(to: a)
            path.addLine(to: b)
        }
        .stroke(Color.cyan.opacity(0.55), style: StrokeStyle(lineWidth: compact ? 2 : 3, lineCap: .round))
    }

    private func nodeChip(_ node: World2WorldGraphNode) -> some View {
        let isCurrent = node.sceneID == snapshot.currentSceneID
        return Button {
            onSelectScene?(node.sceneID)
        } label: {
            VStack(spacing: 2) {
                Image(systemName: isCurrent ? "mappin.circle.fill" : "circle.fill")
                    .font(.system(size: compact ? 14 : 18, weight: .black))
                if !compact {
                    Text(node.name)
                        .font(.system(size: 9, weight: .black, design: .rounded))
                        .lineLimit(2)
                        .multilineTextAlignment(.center)
                        .frame(width: cell - 6)
                }
            }
            .foregroundStyle(.white)
            .frame(width: cell, height: compact ? cell * 0.7 : cell)
            .background(
                (isCurrent ? Color.orange : Color.white.opacity(0.14)),
                in: RoundedRectangle(cornerRadius: 12, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(.white.opacity(0.75), lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
        .disabled(onSelectScene == nil)
        .accessibilityLabel(node.name)
        .accessibilityIdentifier("world2.minimap.node.\(node.sceneID)")
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

                World2MinimapView(snapshot: snapshot, compact: true)
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
