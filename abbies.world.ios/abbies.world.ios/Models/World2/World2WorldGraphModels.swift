//
//  World2WorldGraphModels.swift
//  abbies.world.ios
//
//  Overland world graph: scenes connected by cardinal tunnels, not POI pads.
//
//  A *connector* (scene tunnel) is an N/S/E/W slot on a scene. Empty slots are
//  expansion hardpoints — places a new land can attach. Occupied slots point at
//  another known scene. These are deliberately separate from World2SceneHardpoint
//  (in-map pads where places stand).
//

import Foundation

/// Compass edge of a scene on the overland graph.
enum World2CardinalDirection: String, Codable, CaseIterable, Identifiable, Sendable {
    case north
    case south
    case east
    case west

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .north: return "North"
        case .south: return "South"
        case .east: return "East"
        case .west: return "West"
        }
    }

    var shortLabel: String {
        switch self {
        case .north: return "N"
        case .south: return "S"
        case .east: return "E"
        case .west: return "W"
        }
    }

    var symbolName: String {
        switch self {
        case .north: return "arrow.up"
        case .south: return "arrow.down"
        case .east: return "arrow.right"
        case .west: return "arrow.left"
        }
    }

    var opposite: World2CardinalDirection {
        switch self {
        case .north: return .south
        case .south: return .north
        case .east: return .west
        case .west: return .east
        }
    }

    /// Grid step used by the minimap layout.
    var gridDelta: (dx: Int, dy: Int) {
        switch self {
        case .north: return (0, -1)
        case .south: return (0, 1)
        case .east: return (1, 0)
        case .west: return (-1, 0)
        }
    }
}

/// One N/S/E/W tunnel on a scene. `toSceneID == nil` means the slot is open for
/// expansion — the default for every cardinal that is not yet taken.
struct World2SceneConnector: Codable, Identifiable, Equatable, Sendable {
    let id: String
    let fromSceneID: String
    var direction: World2CardinalDirection
    /// Nil = open expansion hardpoint. Set = tunnel to that scene.
    var toSceneID: String?
    var isLocked: Bool
    var notes: String?

    init(
        id: String,
        fromSceneID: String,
        direction: World2CardinalDirection,
        toSceneID: String? = nil,
        isLocked: Bool = false,
        notes: String? = nil
    ) {
        self.id = id
        self.fromSceneID = fromSceneID
        self.direction = direction
        self.toSceneID = toSceneID
        self.isLocked = isLocked
        self.notes = notes
    }

    var isOpen: Bool { toSceneID == nil }

    static func defaultID(sceneID: String, direction: World2CardinalDirection) -> String {
        "connector.\(sceneID).\(direction.rawValue)"
    }
}

/// A known place on the overland graph, laid out for the minimap.
struct World2WorldGraphNode: Identifiable, Equatable, Sendable {
    var id: String { sceneID }
    let sceneID: String
    let worldID: WorldId?
    let name: String
    /// Integer lattice position used only for drawing the minimap.
    var gridX: Int
    var gridY: Int
}

/// Snapshot the minimap and Planning Dept both render.
struct World2WorldGraphSnapshot: Equatable, Sendable {
    let nodes: [World2WorldGraphNode]
    let connectors: [World2SceneConnector]
    let currentSceneID: String?

    func connectors(from sceneID: String) -> [World2SceneConnector] {
        connectors
            .filter { $0.fromSceneID == sceneID }
            .sorted { $0.direction.rawValue < $1.direction.rawValue }
    }

    func openConnectors(from sceneID: String) -> [World2SceneConnector] {
        connectors(from: sceneID).filter(\.isOpen)
    }

    func node(for sceneID: String) -> World2WorldGraphNode? {
        nodes.first { $0.sceneID == sceneID }
    }
}
