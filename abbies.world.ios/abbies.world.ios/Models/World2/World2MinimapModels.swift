//
//  World2MinimapModels.swift
//  abbies.world.ios
//
//  Every scene registers a minimap icon. The viewer is a compass rose of those
//  icons: you in the middle, NESW neighbours around you, empty sockets left
//  blank so the missing path is obvious.
//

import Foundation

/// Drawn stand-in for a scene whose painted minimap tile is not in the bundle
/// yet. Same idea as `World2SceneBackdropStyle`: the map should still read as
/// somewhere, not as a missing-asset card.
enum World2MinimapIconStyle: String, Codable, Sendable {
    case homeGrove
    case workMeadow
    case farmMeadow
    case woodsCottage
    case blankGrid
    case placeholder
    case orphanClearing
}

struct World2MinimapTile: Equatable, Identifiable, Sendable {
    var compass: World2Compass?
    var sceneID: String?
    var name: String
    var minimapIcon: String
    var minimapIconStyle: World2MinimapIconStyle?
    var isHere: Bool

    var id: String { compass?.rawValue ?? "here" }
    var isOpen: Bool { sceneID != nil }

    static func here(_ scene: World2SceneDefinition) -> World2MinimapTile {
        World2MinimapTile(
            compass: nil,
            sceneID: scene.id,
            name: scene.name,
            minimapIcon: scene.resolvedMinimapIcon,
            minimapIconStyle: scene.minimapIconStyle,
            isHere: true
        )
    }

    static func empty(_ compass: World2Compass) -> World2MinimapTile {
        World2MinimapTile(
            compass: compass,
            sceneID: nil,
            name: "Nowhere yet",
            minimapIcon: "",
            minimapIconStyle: nil,
            isHere: false
        )
    }
}

struct World2MinimapNeighborhood: Equatable, Sendable {
    var here: World2MinimapTile
    var north: World2MinimapTile
    var east: World2MinimapTile
    var south: World2MinimapTile
    var west: World2MinimapTile

    func tile(_ compass: World2Compass) -> World2MinimapTile {
        switch compass {
        case .north: return north
        case .south: return south
        case .east: return east
        case .west: return west
        }
    }

    var neighbors: [World2MinimapTile] { [north, east, south, west] }
}

enum World2MinimapGraph {
    static func neighborhood(
        of scene: World2SceneDefinition,
        resolve: (String) -> World2SceneDefinition?
    ) -> World2MinimapNeighborhood {
        func neighbor(_ compass: World2Compass) -> World2MinimapTile {
            guard let destinationID = scene.compassPortal(compass)?.portal?.destinationSceneID,
                  let destination = resolve(destinationID) else {
                return .empty(compass)
            }
            return World2MinimapTile(
                compass: compass,
                sceneID: destination.id,
                name: destination.name,
                minimapIcon: destination.resolvedMinimapIcon,
                minimapIconStyle: destination.minimapIconStyle,
                isHere: false
            )
        }

        return World2MinimapNeighborhood(
            here: .here(scene),
            north: neighbor(.north),
            east: neighbor(.east),
            south: neighbor(.south),
            west: neighbor(.west)
        )
    }
}
