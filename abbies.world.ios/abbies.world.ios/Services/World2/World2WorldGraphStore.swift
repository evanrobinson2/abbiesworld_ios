//
//  World2WorldGraphStore.swift
//  abbies.world.ios
//
//  Owns the overland tunnel graph: which scenes are known, which N/S/E/W slots
//  are open for expansion, and which tunnels are taken.
//
//  Seeded from the shipped world adjacency table, then player / developer edits
//  persist per player. Travel arrows and the minimap both read this store.
//

import Combine
import Foundation

@MainActor
final class World2WorldGraphStore: ObservableObject {
    private static let storeKeyPrefix = "world2.worldGraph.v1"

    @Published private(set) var connectorsByScene: [String: [World2SceneConnector]] = [:]
    @Published private(set) var knownSceneIDs: [String] = []

    private let defaults: UserDefaults
    private var playerScope = "unselected"
    private var worldCatalog: [WorldId: World] = [:]

    private var documentMode = false
    private var documentSceneNames: [String: String] = [:]
    private var documentOriginSceneID: String?

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    private var storeKey: String { "\(Self.storeKeyPrefix).\(playerScope)" }

    // MARK: - Bootstrap

    func configure(worlds: [WorldId: World], playerID: PlayerId?) {
        documentMode = false
        documentSceneNames = [:]
        documentOriginSceneID = nil
        let nextScope = playerID?.rawValue ?? "unselected"
        worldCatalog = worlds
        if nextScope != playerScope {
            playerScope = nextScope
        }
        reloadFromDiskOrSeed()
    }

    /// Replace the compiled overland graph with the signed-in document.
    func loadFromDocument(
        scenes: [World2SceneDefinition],
        places: [World2RemotePlace],
        originSceneID: String?
    ) {
        documentMode = true
        documentSceneNames = Dictionary(uniqueKeysWithValues: scenes.map { ($0.id, $0.name) })
        // Prefer Peglin Crash as origin when present so the chain draws cleanly.
        if let crash = scenes.first(where: { $0.id == PeglinEdition.crashLandSceneID })?.id {
            documentOriginSceneID = originSceneID ?? crash
        } else {
            documentOriginSceneID = originSceneID ?? scenes.map(\.id).sorted().first
        }
        knownSceneIDs = scenes.map(\.id).sorted()
        var built: [String: [World2SceneConnector]] = [:]
        for sceneID in knownSceneIDs {
            built[sceneID] = World2CardinalDirection.allCases.map { direction in
                World2SceneConnector(
                    id: World2SceneConnector.defaultID(sceneID: sceneID, direction: direction),
                    fromSceneID: sceneID,
                    direction: direction,
                    toSceneID: nil
                )
            }
        }
        let destinations = Dictionary(uniqueKeysWithValues: places.compactMap { place -> (String, String)? in
            guard case .travel(let sceneID)? = World2POIRoute.resolved(from: place.behavior) else {
                return nil
            }
            return (place.id, sceneID)
        })
        // Deduplicate A↔B so we only wire each undirected edge once.
        var seenPairs = Set<String>()
        for scene in scenes {
            for instance in scene.poiInstances {
                guard let destination = destinations[instance.archetypeID],
                      knownSceneIDs.contains(destination),
                      destination != scene.id
                else { continue }
                let pairKey = [scene.id, destination].sorted().joined(separator: ">")
                if seenPairs.contains(pairKey) { continue }
                seenPairs.insert(pairKey)

                let preferred = World2MinimapAutoLayout.direction(
                    fromPlateX: instance.transform.position.x,
                    y: instance.transform.position.y
                )
                let direction = firstFreeDirection(
                    on: scene.id,
                    preferring: preferred,
                    in: built
                ) ?? preferred
                setTunnel(
                    from: scene.id,
                    direction: direction,
                    to: destination,
                    reciprocal: true,
                    locked: true,
                    into: &built
                )
            }
        }
        connectorsByScene = built
    }

    private func firstFreeDirection(
        on sceneID: String,
        preferring preferred: World2CardinalDirection,
        in built: [String: [World2SceneConnector]]
    ) -> World2CardinalDirection? {
        let order = [preferred] + World2CardinalDirection.allCases.filter { $0 != preferred }
        for direction in order {
            if let slot = built[sceneID]?.first(where: { $0.direction == direction }),
               slot.toSceneID == nil {
                return direction
            }
        }
        return nil
    }

    /// Scenes that participate in overland travel. Art Garden stays off until
    /// something tunnels it in — teleporter still reaches it.
    private var seedSceneIDs: [String] {
        [
            WorldId.home.sceneID,
            WorldId.work.sceneID,
            WorldId.farm.sceneID,
            WorldId.threeBears.sceneID,
            WorldId.blankSlate.sceneID,
            WorldId.evan.sceneID,
        ]
    }

    private func reloadFromDiskOrSeed() {
        if let saved = decode(defaults.data(forKey: storeKey)), !saved.connectors.isEmpty {
            knownSceneIDs = saved.knownSceneIDs
            connectorsByScene = Dictionary(grouping: saved.connectors, by: \.fromSceneID)
            ensureCardinalsPresent()
            ensureAuthoredScenesAndTunnels()
            return
        }
        seedFromAuthoredAdjacency()
        persist()
    }

    /// Ship new lands (like Daddy's Citadel north of Home) onto existing saves.
    private func ensureAuthoredScenesAndTunnels() {
        var changed = false
        for sceneID in seedSceneIDs where !knownSceneIDs.contains(sceneID) {
            knownSceneIDs.append(sceneID)
            changed = true
        }
        ensureCardinalsPresent()
        var built = connectorsByScene
        let before = built
        applySeedTunnel(from: .home, .north, to: .evan, into: &built)
        if built != before {
            connectorsByScene = built
            changed = true
        }
        if changed {
            persist()
        }
    }

    /// Default graph: every known scene gets N/S/E/W; taken slots come from the
    /// authored world table; the rest stay open expansion hardpoints.
    private func seedFromAuthoredAdjacency() {
        knownSceneIDs = seedSceneIDs
        var built: [String: [World2SceneConnector]] = [:]

        for sceneID in knownSceneIDs {
            built[sceneID] = World2CardinalDirection.allCases.map { direction in
                World2SceneConnector(
                    id: World2SceneConnector.defaultID(sceneID: sceneID, direction: direction),
                    fromSceneID: sceneID,
                    direction: direction,
                    toSceneID: nil
                )
            }
        }

        // Authored tunnels (one direction each; reciprocal filled below).
        applySeedTunnel(from: .home, .west, to: .work, into: &built)
        applySeedTunnel(from: .home, .east, to: .farm, into: &built)
        applySeedTunnel(from: .home, .south, to: .blankSlate, into: &built)
        applySeedTunnel(from: .home, .north, to: .evan, into: &built)
        applySeedTunnel(from: .farm, .east, to: .threeBears, into: &built)

        connectorsByScene = built
    }

    private func applySeedTunnel(
        from: WorldId,
        _ direction: World2CardinalDirection,
        to: WorldId,
        into built: inout [String: [World2SceneConnector]]
    ) {
        setTunnel(
            from: from.sceneID,
            direction: direction,
            to: to.sceneID,
            reciprocal: true,
            locked: true,
            into: &built
        )
    }

    private func setTunnel(
        from sceneID: String,
        direction: World2CardinalDirection,
        to destinationID: String,
        reciprocal: Bool,
        locked: Bool,
        into built: inout [String: [World2SceneConnector]]
    ) {
        guard var list = built[sceneID] else { return }
        if let index = list.firstIndex(where: { $0.direction == direction }) {
            list[index].toSceneID = destinationID
            list[index].isLocked = locked
            list[index].notes = locked ? "Shipped overland path" : nil
            built[sceneID] = list
        }
        guard reciprocal else { return }
        setTunnel(
            from: destinationID,
            direction: direction.opposite,
            to: sceneID,
            reciprocal: false,
            locked: locked,
            into: &built
        )
    }

    private func ensureCardinalsPresent() {
        for sceneID in knownSceneIDs {
            var list = connectorsByScene[sceneID] ?? []
            for direction in World2CardinalDirection.allCases {
                guard !list.contains(where: { $0.direction == direction }) else { continue }
                list.append(
                    World2SceneConnector(
                        id: World2SceneConnector.defaultID(sceneID: sceneID, direction: direction),
                        fromSceneID: sceneID,
                        direction: direction
                    )
                )
            }
            connectorsByScene[sceneID] = list.sorted { $0.direction.rawValue < $1.direction.rawValue }
        }
    }

    // MARK: - Queries

    func connectors(from sceneID: String) -> [World2SceneConnector] {
        (connectorsByScene[sceneID] ?? []).sorted {
            $0.direction.rawValue < $1.direction.rawValue
        }
    }

    func connectedSceneIDs(from sceneID: String) -> [String] {
        connectors(from: sceneID).compactMap(\.toSceneID)
    }

    func adjacentWorldIDs(from worldID: WorldId) -> [WorldId] {
        connectedSceneIDs(from: worldID.sceneID).compactMap { sceneID in
            WorldId.allCases.first { $0.sceneID == sceneID }
        }
    }

    func snapshot(currentSceneID: String?) -> World2WorldGraphSnapshot {
        let layout = layoutNodes()
        let allConnectors = knownSceneIDs.flatMap { connectors(from: $0) }
        return World2WorldGraphSnapshot(
            nodes: layout,
            connectors: allConnectors,
            currentSceneID: currentSceneID
        )
    }

    /// Lattice layout: Peglin chain on a row, then BFS with collision fill.
    private func layoutNodes() -> [World2WorldGraphNode] {
        guard !knownSceneIDs.isEmpty else { return [] }
        let edges: [World2MinimapAutoLayout.Edge] = knownSceneIDs.flatMap { sceneID in
            connectors(from: sceneID).compactMap { connector in
                guard let to = connector.toSceneID else { return nil }
                // One undirected edge — keep lexicographic half to reduce bias.
                guard sceneID < to else { return nil }
                return World2MinimapAutoLayout.Edge(
                    from: sceneID,
                    to: to,
                    direction: connector.direction
                )
            }
        }
        let origin = documentOriginSceneID
            ?? (knownSceneIDs.contains(PeglinEdition.crashLandSceneID)
                ? PeglinEdition.crashLandSceneID
                : nil)
            ?? (knownSceneIDs.contains(WorldId.home.sceneID) ? WorldId.home.sceneID : knownSceneIDs[0])
        let positions = World2MinimapAutoLayout.positions(
            sceneIDs: knownSceneIDs,
            edges: edges,
            originSceneID: origin
        )
        return knownSceneIDs.compactMap { sceneID in
            guard let pos = positions[sceneID] else { return nil }
            let worldID = WorldId.allCases.first { $0.sceneID == sceneID }
            let name = documentSceneNames[sceneID]
                ?? worldID?.displayName
                ?? worldCatalog[worldID ?? .home]?.name
                ?? sceneID
            return World2WorldGraphNode(
                sceneID: sceneID,
                worldID: worldID,
                name: name,
                gridX: pos.x,
                gridY: pos.y
            )
        }
    }

    // MARK: - Mutations (Planning Dept + developer tunnels)

    @discardableResult
    func connect(
        from sceneID: String,
        direction: World2CardinalDirection,
        to destinationID: String,
        reciprocal: Bool = true
    ) -> Bool {
        guard knownSceneIDs.contains(sceneID),
              destinationID != sceneID
        else { return false }
        if !knownSceneIDs.contains(destinationID) {
            knownSceneIDs.append(destinationID)
            ensureCardinalsPresent()
        }
        var built = connectorsByScene
        guard var list = built[sceneID],
              let index = list.firstIndex(where: { $0.direction == direction })
        else { return false }
        if list[index].isLocked { return false }
        list[index].toSceneID = destinationID
        built[sceneID] = list
        if reciprocal {
            setTunnel(
                from: destinationID,
                direction: direction.opposite,
                to: sceneID,
                reciprocal: false,
                locked: false,
                into: &built
            )
        }
        connectorsByScene = built
        persist()
        World2Diagnostics.log(
            "world_graph_connected",
            [
                "from": sceneID,
                "direction": direction.rawValue,
                "to": destinationID,
            ]
        )
        return true
    }

    @discardableResult
    func clearConnector(
        from sceneID: String,
        direction: World2CardinalDirection,
        clearReciprocal: Bool = true
    ) -> Bool {
        guard var list = connectorsByScene[sceneID],
              let index = list.firstIndex(where: { $0.direction == direction })
        else { return false }
        if list[index].isLocked { return false }
        let former = list[index].toSceneID
        list[index].toSceneID = nil
        connectorsByScene[sceneID] = list
        if clearReciprocal, let former {
            _ = clearConnector(
                from: former,
                direction: direction.opposite,
                clearReciprocal: false
            )
        }
        persist()
        World2Diagnostics.log(
            "world_graph_connector_cleared",
            ["from": sceneID, "direction": direction.rawValue]
        )
        return true
    }

    /// Developer unlock so a shipped tunnel can be rewired during editing.
    func setConnectorLocked(
        from sceneID: String,
        direction: World2CardinalDirection,
        locked: Bool
    ) {
        guard var list = connectorsByScene[sceneID],
              let index = list.firstIndex(where: { $0.direction == direction })
        else { return }
        list[index].isLocked = locked
        connectorsByScene[sceneID] = list
        persist()
    }

    func addKnownScene(_ sceneID: String, nameIgnored _: String = "") {
        guard !knownSceneIDs.contains(sceneID) else { return }
        knownSceneIDs.append(sceneID)
        ensureCardinalsPresent()
        persist()
    }

    func resetToShippedGraph() {
        defaults.removeObject(forKey: storeKey)
        seedFromAuthoredAdjacency()
        persist()
        World2Diagnostics.log("world_graph_reset")
    }

    // MARK: - Persistence

    private struct PersistedGraph: Codable {
        var knownSceneIDs: [String]
        var connectors: [World2SceneConnector]
    }

    private func persist() {
        guard !documentMode else { return }
        let payload = PersistedGraph(
            knownSceneIDs: knownSceneIDs,
            connectors: knownSceneIDs.flatMap { connectors(from: $0) }
        )
        guard let data = try? JSONEncoder().encode(payload) else { return }
        defaults.set(data, forKey: storeKey)
    }

    private func decode(_ data: Data?) -> PersistedGraph? {
        guard let data else { return nil }
        return try? JSONDecoder().decode(PersistedGraph.self, from: data)
    }
}
