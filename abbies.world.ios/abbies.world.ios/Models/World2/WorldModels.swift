//
//  WorldModels.swift
//  abbies.world.ios
//
//  Data models for Abbie's World 2 map and navigation system.
//

import Foundation

enum WorldId: String, Codable, CaseIterable, Identifiable {
    case home = "world.home"
    case adventure = "world.adventure"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .home: return "Home World"
        case .adventure: return "Adventure World"
        }
    }
    
    var description: String {
        switch self {
        case .home: return "A cozy, magical place where you can create and collect"
        case .adventure: return "A rugged frontier where you earn ingredients and gems"
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
