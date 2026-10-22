//
//  World2WaterfallStrokeEditor.swift
//  abbies.world.ios
//
//  Build-mode overlay: draw / drag the waterfall stroke the FX follows.
//

import SwiftUI

struct World2WaterfallStrokeEditor: View {
    let sceneID: String
    let mapRect: CGRect
    @ObservedObject var store: World2WaterfallStrokeStore
    @State private var selectedID: String?

    private var stroke: World2WaterfallStroke { store.stroke(for: sceneID) }

    var body: some View {
        ZStack {
            // Tap empty plate to append a control point.
            Color.clear
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0, coordinateSpace: .named("waterfallStroke"))
                        .onEnded { value in
                            let n = normalize(value.location)
                            // Ignore taps that land on an existing handle.
                            if stroke.points.contains(where: { hypot($0.x - n.x, $0.y - n.y) < 0.035 }) {
                                return
                            }
                            store.addPoint(at: n, for: sceneID)
                        }
                )

            // Polyline preview
            Path { path in
                let pts = stroke.points
                guard let first = pts.first else { return }
                path.move(to: denormalize(first.point))
                for p in pts.dropFirst() {
                    path.addLine(to: denormalize(p.point))
                }
            }
            .stroke(
                Color.cyan.opacity(0.85),
                style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round, dash: [8, 6])
            )
            .allowsHitTesting(false)

            // Width band ghost
            Path { path in
                let pts = stroke.points
                guard pts.count >= 2 else { return }
                path.move(to: denormalize(CGPoint(x: pts[0].x - pts[0].halfWidth, y: pts[0].y)))
                for p in pts.dropFirst() {
                    path.addLine(to: denormalize(CGPoint(x: p.x - p.halfWidth, y: p.y)))
                }
                for p in pts.reversed() {
                    path.addLine(to: denormalize(CGPoint(x: p.x + p.halfWidth, y: p.y)))
                }
                path.closeSubpath()
            }
            .fill(Color.cyan.opacity(0.12))
            .allowsHitTesting(false)

            ForEach(stroke.points) { point in
                Circle()
                    .fill(selectedID == point.id ? Color.orange : Color.cyan)
                    .frame(width: 22, height: 22)
                    .overlay(Circle().stroke(.white, lineWidth: 2))
                    .position(denormalize(point.point))
                    .gesture(
                        DragGesture(coordinateSpace: .named("waterfallStroke"))
                            .onChanged { value in
                                selectedID = point.id
                                let n = normalize(value.location)
                                store.updatePoint(
                                    World2WaterfallStrokePoint(
                                        id: point.id,
                                        x: n.x,
                                        y: n.y,
                                        halfWidth: point.halfWidth
                                    ),
                                    for: sceneID
                                )
                            }
                    )
                    .onLongPressGesture {
                        store.removePoint(id: point.id, for: sceneID)
                        if selectedID == point.id { selectedID = nil }
                    }
                    .accessibilityIdentifier("world2.waterfallStroke.point.\(point.id)")
            }
        }
        .frame(width: mapRect.width, height: mapRect.height)
        .coordinateSpace(name: "waterfallStroke")
        .accessibilityIdentifier("world2.waterfallStroke.editor")
    }

    private func normalize(_ p: CGPoint) -> CGPoint {
        CGPoint(
            x: min(1, max(0, p.x / max(mapRect.width, 1))),
            y: min(1, max(0, p.y / max(mapRect.height, 1)))
        )
    }

    private func denormalize(_ p: CGPoint) -> CGPoint {
        CGPoint(x: p.x * mapRect.width, y: p.y * mapRect.height)
    }
}
