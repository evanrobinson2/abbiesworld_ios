//
//  WorldModels.swift
//  abbies.world.ios
//
//  Data models for Abbie's World 2 map and navigation system.
//

import Foundation

enum WorldId: String, Codable, CaseIterable, Identifiable {
    case home = "world.home"
    case work = "world.work"
    case farm = "world.farm"
    case adventure = "world.adventure"
    case blankSlate = "world.blankSlate"
    case threeBears = "world.threeBears"
    /// Unconnected garden scene with Character Studio. Reach it with the World Teleporter.
    case artGarden = "world.artGarden"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .home: return "Home World"
        case .work: return "Work Land"
        case .farm: return "Farm Land"
        case .adventure: return "Adventure World"
        case .blankSlate: return "Blank Slate"
        case .threeBears: return "Three Bears Woods"
        case .artGarden: return "Art Garden"
        }
    }
    
    var description: String {
        switch self {
        case .home: return "A cozy, magical place where you can create and collect"
        case .work: return "A playful concrete jungle where mysterious machines keep the world running"
        case .farm: return "A sunny open place for growing ideas and finding furniture"
        case .adventure: return "A rugged frontier where you earn ingredients and gems"
        case .blankSlate: return "An empty scene waiting for player-made places"
        case .threeBears: return "A hushed clearing in the woods where somebody is cooking"
        case .artGarden: return "A terraced garden of easels and paths, with a studio for dressing up"
        }
    }
    
    var direction: String? {
        switch self {
        case .home: return nil
        case .work: return "Downtown"
        case .farm: return "East"
        case .adventure: return "North"
        case .blankSlate: return "Through the Portal"
        case .threeBears: return "Into the Woods"
        case .artGarden: return nil
        }
    }

    /// The scene that holds this world's pads and places.
    var sceneID: String {
        switch self {
        case .blankSlate: return World2SceneDefinition.blankSlateSceneID
        default: return rawValue
        }
    }
}

/// World-level metadata: what this map is called, how it sounds, and where you
/// can walk from here.
///
/// Placement used to live here as `poiPlacements`. It belongs to the scene graph
/// now — see World2SceneCatalog and World2SceneGraphStore — so a world and its
/// contents can be edited independently.
struct World: Codable, Identifiable {
    let id: WorldId
    let name: String
    let description: String
    let backgroundAsset: String
    let lightMusicTrack: String
    let intenseMusicTrack: String
    let adjacentWorlds: [WorldId]
    let ambiance: WorldAmbiance

    var sceneID: String { id.sceneID }
    
    struct WorldAmbiance: Codable {
        let primaryColor: String
        let secondaryColor: String
        let mood: String
    }
}

struct MapTransition: Codable, Identifiable {
    let id: String
    let fromWorldId: WorldId
    let toWorldId: WorldId
    let triggerArea: TriggerArea
    let transitionType: TransitionType
    
    struct TriggerArea: Codable {
        let x: Double
        let y: Double
        let width: Double
        let height: Double
    }
    
    enum TransitionType: String, Codable {
        case fade
        case slide
        case portal
    }
}
