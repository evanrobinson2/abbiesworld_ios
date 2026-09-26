import Foundation

/// Grid layout for the overland minimap.
/// Prefers known land chains (Peglin), then BFS along tunnel directions,
/// and never stacks two nodes on the same cell.
enum World2MinimapAutoLayout {
    struct Edge: Equatable {
        let from: String
        let to: String
        let direction: World2CardinalDirection?
    }

    static func positions(
        sceneIDs: [String],
        edges: [Edge],
        originSceneID: String?,
        preferredChain: [String] = PeglinEdition.allSceneIDs
    ) -> [String: (x: Int, y: Int)] {
        let ids = Set(sceneIDs)
        guard !ids.isEmpty else { return [:] }

        var positions: [String: (x: Int, y: Int)] = [:]

        // 1) Preferred chain (Crash → Bramble → Fox → Stag → Forgotten) on a row.
        let chain = preferredChain.filter { ids.contains($0) }
        if chain.count >= 2 {
            for (index, sceneID) in chain.enumerated() {
                positions[sceneID] = (index, 0)
            }
        }

        let origin = originSceneID.flatMap { ids.contains($0) ? $0 : nil }
            ?? chain.first
            ?? sceneIDs.sorted().first!
        if positions[origin] == nil {
            positions[origin] = (0, 0)
        }

        // Adjacency with optional preferred step.
        var neighbors: [String: [(to: String, direction: World2CardinalDirection?)]] = [:]
        for edge in edges {
            guard ids.contains(edge.from), ids.contains(edge.to) else { continue }
            neighbors[edge.from, default: []].append((edge.to, edge.direction))
            neighbors[edge.to, default: []].append((edge.from, edge.direction?.opposite))
        }

        // 2) BFS from placed nodes / origin — respect cardinal when free.
        var queue = positions.keys.sorted()
        var visited = Set(positions.keys)
        if !visited.contains(origin) {
            queue.insert(origin, at: 0)
            visited.insert(origin)
        }

        while let sceneID = queue.first {
            queue.removeFirst()
            let here = positions[sceneID] ?? (0, 0)
            let outs = neighbors[sceneID] ?? []
            for (next, direction) in outs.sorted(by: { $0.to < $1.to }) {
                if visited.contains(next) { continue }
                let preferred = direction.map {
                    (here.x + $0.gridDelta.dx, here.y + $0.gridDelta.dy)
                }
                let cell = firstFreeCell(
                    preferred: preferred,
                    around: here,
                    occupied: Set(positions.values.map { "\($0.x),\($0.y)" })
                )
                positions[next] = cell
                visited.insert(next)
                queue.append(next)
            }
        }

        // 3) Disconnected leftovers sit on a shelf below.
        let leftovers = sceneIDs.filter { positions[$0] == nil }.sorted()
        if !leftovers.isEmpty {
            let shelfY = (positions.values.map(\.y).max() ?? 0) + 2
            for (index, sceneID) in leftovers.enumerated() {
                positions[sceneID] = (index, shelfY)
            }
        }

        return positions
    }

    /// Spiral outward from `around` until an empty grid cell is found.
    static func firstFreeCell(
        preferred: (x: Int, y: Int)?,
        around: (x: Int, y: Int),
        occupied: Set<String>
    ) -> (x: Int, y: Int) {
        if let preferred, !occupied.contains("\(preferred.x),\(preferred.y)") {
            return preferred
        }
        if !occupied.contains("\(around.x),\(around.y)") {
            return around
        }
        for radius in 1...24 {
            for dy in -radius...radius {
                for dx in -radius...radius {
                    if max(abs(dx), abs(dy)) != radius { continue }
                    let x = around.x + dx
                    let y = around.y + dy
                    if !occupied.contains("\(x),\(y)") {
                        return (x, y)
                    }
                }
            }
        }
        return (around.x + occupied.count, around.y)
    }

    /// Cardinal from a travel pad's plate position (0…1).
    static func direction(fromPlateX x: Double, y: Double) -> World2CardinalDirection {
        let dx = x - 0.5
        let dy = y - 0.5
        if abs(dy) >= abs(dx) {
            return dy < 0 ? .north : .south
        }
        return dx < 0 ? .west : .east
    }
}
