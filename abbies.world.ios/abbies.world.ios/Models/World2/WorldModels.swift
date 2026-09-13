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
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .home: return "Home World"
        case .work: return "Work Land"
        case .farm: return "Farm Land"
        case .adventure: return "Adventure World"
        case .blankSlate: return "Blank Slate"
        }
    }
    
    var description: String {
        switch self {
        case .home: return "A cozy, magical place where you can create and collect"
        case .work: return "A playful concrete jungle where mysterious machines keep the world running"
        case .farm: return "A sunny open place for growing ideas and finding furniture"
        case .adventure: return "A rugged frontier where you earn ingredients and gems"
        case .blankSlate: return "An empty scene waiting for player-made places"
        }
    }
    
    var direction: String? {
        switch self {
        case .home: return nil
        case .work: return "Downtown"
        case .farm: return "East"
        case .adventure: return "North"
        case .blankSlate: return "Through the Portal"
        }
    }
}

struct World: Codable, Identifiable {
    let id: WorldId
    let name: String
    let description: String
    let backgroundAsset: String
    let lightMusicTrack: String
    let intenseMusicTrack: String
    let poiPlacements: [POIPlacement]
    let adjacentWorlds: [WorldId]
    let ambiance: WorldAmbiance
    
    struct WorldAmbiance: Codable {
        let primaryColor: String
        let secondaryColor: String
        let mood: String
    }
}

struct POIPlacement: Codable, Identifiable {
    let id: String
    let poiId: String
    let x: Double
    let y: Double
    let scale: Double
    let zIndex: Int
    
    init(id: String? = nil, poiId: String, x: Double, y: Double, scale: Double = 1.0, zIndex: Int = 0) {
        self.id = id ?? UUID().uuidString
        self.poiId = poiId
        self.x = x
        self.y = y
        self.scale = scale
        self.zIndex = zIndex
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
