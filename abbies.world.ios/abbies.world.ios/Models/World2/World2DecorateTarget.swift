//
//  World2DecorateTarget.swift
//  abbies.world.ios
//
//  Where Invent & Carve props should be placed, and how to get the player back
//  there. Surfaces reuse HomeLayout.roomId as a placement key (treehouse rooms
//  keep their raw values; scenes / POIs use prefixed keys).
//

import Foundation

enum World2DecorateSurface {
    static func key(forScene sceneID: String) -> String { "scene.\(sceneID)" }
    static func key(forPOI poiId: String) -> String {
        poiId.hasPrefix("poi.") ? poiId : "poi.\(poiId)"
    }
    static func key(forRoom room: TreehouseRoomID) -> String { room.rawValue }

    static func sceneID(from key: String) -> String? {
        key.hasPrefix("scene.") ? String(key.dropFirst("scene.".count)) : nil
    }

    static func poiID(from key: String) -> String? {
        guard key.hasPrefix("poi.") else { return nil }
        let rest = String(key.dropFirst("poi.".count))
        return rest.hasPrefix("poi.") ? rest : key
    }
}

/// Destination for "go decorate what you just carved."
enum World2DecorateTarget: Equatable, Sendable {
    case treehouseRoom(TreehouseRoomID)
    /// Authored overland map (Home, Daddy's Citadel, Farm, …).
    case scene(sceneID: String, name: String, worldID: WorldId?)
    /// Player-grown mutable plate (blank slate / seed worlds).
    case mutableScene(sceneID: String, name: String)
    /// POI interior plate (e.g. Daddy welcome) without multi-room support.
    case poiInterior(poiId: String, name: String)

    var surfaceKey: String {
        switch self {
        case .treehouseRoom(let room):
            return World2DecorateSurface.key(forRoom: room)
        case .scene(let sceneID, _, _):
            return World2DecorateSurface.key(forScene: sceneID)
        case .mutableScene(let sceneID, _):
            return World2DecorateSurface.key(forScene: sceneID)
        case .poiInterior(let poiId, _):
            return World2DecorateSurface.key(forPOI: poiId)
        }
    }

    var displayName: String {
        switch self {
        case .treehouseRoom(let room):
            return room.title
        case .scene(_, let name, _), .mutableScene(_, let name), .poiInterior(_, let name):
            return name
        }
    }

    var decorateButtonTitle: String {
        "Decorate \(displayName)"
    }

    /// Resolve invent source scene id → where props should be placed / returned.
    static func fromInvent(sceneID: String, sceneName: String) -> World2DecorateTarget {
        if let room = TreehouseRoomID.allCases.first(where: { sceneID.hasSuffix(".\($0.rawValue)") }) {
            return .treehouseRoom(room)
        }
        if sceneID.hasPrefix("treehouse.") {
            return .treehouseRoom(.default)
        }
        if sceneID.hasPrefix("poi.") {
            return .poiInterior(poiId: sceneID, name: sceneName)
        }
        for worldID in WorldId.allCases {
            if sceneID == worldID.sceneID {
                let isMutable = worldID == .blankSlate
                if isMutable {
                    return .mutableScene(sceneID: sceneID, name: sceneName)
                }
                return .scene(sceneID: sceneID, name: sceneName, worldID: worldID)
            }
        }
        if sceneID.hasPrefix("scene.") {
            return .scene(sceneID: sceneID, name: sceneName, worldID: nil)
        }
        // Seed / custom mutable plates fall through here.
        return .mutableScene(sceneID: sceneID, name: sceneName)
    }
}

/// Household flag: the owner of a scene or POI can open decorate to every player.
@MainActor
final class World2DecorateAccessStore {
    static let shared = World2DecorateAccessStore()
    private let key = "world2.decorateForAll.v1"
    private let defaults: UserDefaults

    private init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func isOpenToAll(_ surfaceKey: String) -> Bool {
        openKeys.contains(surfaceKey)
    }

    func setOpenToAll(_ surfaceKey: String, _ open: Bool) {
        var keys = openKeys
        if open {
            keys.insert(surfaceKey)
        } else {
            keys.remove(surfaceKey)
        }
        defaults.set(Array(keys), forKey: key)
    }

    private var openKeys: Set<String> {
        Set(defaults.stringArray(forKey: key) ?? [])
    }
}
