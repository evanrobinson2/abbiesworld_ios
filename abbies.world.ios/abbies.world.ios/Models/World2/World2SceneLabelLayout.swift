//
//  World2SceneLabelLayout.swift
//  abbies.world.ios
//
//  Late scene pass: place name pills so they do not cover each other,
//  the artwork they belong to, exits, or the corner chrome.
//

import CoreGraphics
import Foundation

struct World2SceneLabelItem: Identifiable, Equatable, Sendable {
    let id: String
    let text: String
    var preferredCenter: CGPoint
    var size: CGSize
    /// Higher priority stays closer to its anchor. Party names outrank place pills.
    var priority: Int
    var emphasized: Bool = false

    static func capsuleSize(text: String, fontSize: CGFloat = 14) -> CGSize {
        let width = min(240, max(72, CGFloat(text.count) * fontSize * 0.58 + 28))
        return CGSize(width: width, height: fontSize + 16)
    }
}

enum World2SceneLabelLayout {
    /// Returns a center for each item id. Items that cannot fit stay as close
    /// to `preferredCenter` as the padding allows.
    static func resolve(
        items: [World2SceneLabelItem],
        obstacles: [CGRect] = [],
        bounds: CGRect,
        padding: CGFloat = 8,
        maxDrift: CGFloat = 160,
        iterations: Int = 16
    ) -> [String: CGPoint] {
        guard bounds.width > 8, bounds.height > 8, !items.isEmpty else {
            return Dictionary(uniqueKeysWithValues: items.map { ($0.id, $0.preferredCenter) })
        }

        var centers = items.map(\.preferredCenter)
        let homes = centers
        let inset = bounds.insetBy(dx: 8, dy: 8)

        for _ in 0..<iterations {
            for index in items.indices {
                var rect = box(center: centers[index], size: items[index].size)
                for obstacle in obstacles {
                    rect = push(
                        rect,
                        outOf: obstacle.insetBy(dx: -padding, dy: -padding),
                        home: homes[index]
                    )
                }
                for other in items.indices where other != index {
                    let blocker = box(center: centers[other], size: items[other].size)
                        .insetBy(dx: -padding / 2, dy: -padding / 2)
                    let fraction: CGFloat = {
                        if items[index].priority < items[other].priority { return 1 }
                        if items[index].priority > items[other].priority { return 0 }
                        return index > other ? 1 : 0
                    }()
                    guard fraction > 0 else { continue }
                    rect = push(rect, outOf: blocker, home: homes[index], fraction: fraction)
                }
                rect = clamp(rect, to: inset)
                centers[index] = limited(
                    CGPoint(x: rect.midX, y: rect.midY),
                    toward: homes[index],
                    maxDrift: maxDrift
                )
            }
        }

        var resolved: [String: CGPoint] = [:]
        for (index, item) in items.enumerated() {
            resolved[item.id] = centers[index]
        }
        return resolved
    }

    /// True when no two resolved boxes overlap and none sit inside an obstacle.
    static func isClear(
        items: [World2SceneLabelItem],
        centers: [String: CGPoint],
        obstacles: [CGRect] = [],
        padding: CGFloat = 8
    ) -> Bool {
        let rects: [CGRect] = items.compactMap { item in
            guard let center = centers[item.id] else { return nil }
            return box(center: center, size: item.size)
        }
        for index in rects.indices {
            for other in rects.indices where other > index {
                if rects[index].insetBy(dx: padding / 2, dy: padding / 2)
                    .intersects(rects[other]) {
                    return false
                }
            }
            for obstacle in obstacles where rects[index].intersects(obstacle) {
                return false
            }
        }
        return true
    }

    private static func box(center: CGPoint, size: CGSize) -> CGRect {
        CGRect(
            x: center.x - size.width / 2,
            y: center.y - size.height / 2,
            width: size.width,
            height: size.height
        )
    }

    private static func push(
        _ rect: CGRect,
        outOf blocker: CGRect,
        home: CGPoint,
        fraction: CGFloat = 1
    ) -> CGRect {
        guard fraction > 0, rect.intersects(blocker) else { return rect }
        let overlapX = min(rect.maxX, blocker.maxX) - max(rect.minX, blocker.minX)
        let overlapY = min(rect.maxY, blocker.maxY) - max(rect.minY, blocker.minY)
        guard overlapX > 0.5, overlapY > 0.5 else { return rect }

        var dx: CGFloat = 0
        var dy: CGFloat = 0
        let wantsBelow = home.y >= blocker.midY - 8
        if wantsBelow, overlapY <= overlapX * 1.6 {
            dy = blocker.maxY - rect.minY + 1
        } else if overlapX < overlapY {
            dx = rect.midX < blocker.midX ? -(overlapX + 1) : overlapX + 1
        } else if wantsBelow {
            dy = blocker.maxY - rect.minY + 1
        } else {
            dy = rect.midY < blocker.midY ? -(overlapY + 1) : overlapY + 1
        }
        return rect.offsetBy(dx: dx * fraction, dy: dy * fraction)
    }

    private static func clamp(_ rect: CGRect, to bounds: CGRect) -> CGRect {
        var moved = rect
        if moved.width > bounds.width {
            moved.origin.x = bounds.midX - moved.width / 2
        } else if moved.minX < bounds.minX {
            moved.origin.x = bounds.minX
        } else if moved.maxX > bounds.maxX {
            moved.origin.x = bounds.maxX - moved.width
        }
        if moved.height > bounds.height {
            moved.origin.y = bounds.midY - moved.height / 2
        } else if moved.minY < bounds.minY {
            moved.origin.y = bounds.minY
        } else if moved.maxY > bounds.maxY {
            moved.origin.y = bounds.maxY - moved.height
        }
        return moved
    }

    private static func limited(_ point: CGPoint, toward home: CGPoint, maxDrift: CGFloat) -> CGPoint {
        let dx = point.x - home.x
        let dy = point.y - home.y
        let distance = hypot(dx, dy)
        guard distance > maxDrift, distance > 0 else { return point }
        let scale = maxDrift / distance
        return CGPoint(x: home.x + dx * scale, y: home.y + dy * scale)
    }
}

/// Builds the label list and the solid things those labels must not cover.
struct World2SceneLabelBuild: Equatable {
    var items: [World2SceneLabelItem] = []
    var obstacles: [CGRect] = []

    mutating func addChrome(viewSize: CGSize, includeBottomTray: Bool) {
        obstacles.append(CGRect(x: 0, y: 0, width: viewSize.width, height: 88))
        obstacles.append(CGRect(x: 0, y: 64, width: 78, height: max(0, viewSize.height - 120)))
        if includeBottomTray {
            // Bottom filmstrip dock (~130pt) — keep labels clear of it.
            obstacles.append(
                CGRect(x: 0, y: viewSize.height - 140, width: viewSize.width, height: 140)
            )
        }
    }

    mutating func addArtworkObstacle(_ rect: CGRect) {
        obstacles.append(rect)
    }

    mutating func addLabel(
        id: String,
        text: String,
        preferredCenter: CGPoint,
        priority: Int,
        emphasized: Bool = false
    ) {
        items.append(
            World2SceneLabelItem(
                id: id,
                text: World2ChromeContract.ellipsized(
                    text,
                    budget: World2ChromeContract.sceneLabelBudget
                ),
                preferredCenter: preferredCenter,
                size: World2SceneLabelItem.capsuleSize(
                    text: World2ChromeContract.ellipsized(
                        text,
                        budget: World2ChromeContract.sceneLabelBudget
                    )
                ),
                priority: priority,
                emphasized: emphasized
            )
        )
    }

    /// Building footprint plus the pill that wants to sit just under it.
    mutating func addAnchoredLabel(
        id: String,
        text: String,
        anchor: CGPoint,
        footprint: CGSize,
        priority: Int,
        emphasized: Bool = false
    ) {
        let art = CGRect(
            x: anchor.x - footprint.width / 2,
            y: anchor.y - footprint.height * 0.58,
            width: footprint.width,
            height: footprint.height
        )
        obstacles.append(art)
        addLabel(
            id: id,
            text: text,
            preferredCenter: CGPoint(x: anchor.x, y: art.maxY + 16),
            priority: priority,
            emphasized: emphasized
        )
    }
}
