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
    /// Daddy's mountain citadel — futuristic scene with his home POI.
    case evan = "world.evan"
    /// Peglin Edition — floating Crash Land hub (reachable after unlock / teleporter).
    case peglinEdition = "world.peglinEdition"
    /// Marble Voyage — unlockable play world (gated until the Home puzzle is solved).
    case marbleVoyage = "world.marbleVoyage"
    /// Abby & Daddy Moon Base — unlocks after a successful rocket landing.
    case moonBase = "world.moonBase"
    
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
        case .evan: return "Daddy's Citadel"
        case .peglinEdition: return "Peglin Edition"
        case .marbleVoyage: return "Marble Voyage"
        case .moonBase: return "Moon Base"
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
        case .evan: return "A glowing white citadel on the mountain, looking out over the water"
        case .peglinEdition: return "Crash World → Bramble → Fox → Stag → Forgotten Realm"
        case .marbleVoyage: return "Climb, fight, and voyage — unlocks from Abbie's World"
        case .moonBase: return "Land the pink rocket and visit Abby & Daddy's Moon Base"
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
        case .evan: return "Daddy's Base"
        case .peglinEdition: return "Peglin Edition"
        case .marbleVoyage: return "Marble Voyage"
        case .moonBase: return "Moon Base"
        }
    }

    /// The scene that holds this world's pads and places.
    var sceneID: String {
        switch self {
        case .blankSlate: return World2SceneDefinition.blankSlateSceneID
        case .peglinEdition, .marbleVoyage: return PeglinEdition.crashLandSceneID
        case .moonBase: return "scene.moonBase"
        default: return rawValue
        }
    }

    /// Worlds that require an explicit unlock before the player can enter.
    var requiresUnlock: Bool {
        switch self {
        case .marbleVoyage, .moonBase: return true
        default: return false
        }
    }

    /// Shown on locked switcher cards — what it is + how to unlock.
    var unlockHint: String? {
        switch self {
        case .marbleVoyage:
            return "Locked — find the messy book in Abbie's Cozy Nook and finish the puzzle."
        case .moonBase:
            return "Locked — tap the pink rocket on Home and land on the Moon."
        default:
            return nil
        }
    }
}

/// One row from `GET /api/v1/worlds`.
struct World2ServerWorldSummary: Codable, Identifiable, Equatable, Sendable {
    var id: String
    var name: String
    var revision: Int
    var updatedAt: Double?
    var isCurrent: Bool

    enum CodingKeys: String, CodingKey {
        case id, name, revision, updatedAt, isCurrent
        case updated_at
        case is_current
        case currentWorldId
    }

    init(id: String, name: String, revision: Int, updatedAt: Double? = nil, isCurrent: Bool) {
        self.id = id
        self.name = name
        self.revision = revision
        self.updatedAt = updatedAt
        self.isCurrent = isCurrent
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        name = try c.decode(String.self, forKey: .name)
        revision = try c.decode(Int.self, forKey: .revision)
        updatedAt = try c.decodeIfPresent(Double.self, forKey: .updatedAt)
            ?? c.decodeIfPresent(Double.self, forKey: .updated_at)
        isCurrent = try c.decodeIfPresent(Bool.self, forKey: .isCurrent)
            ?? c.decodeIfPresent(Bool.self, forKey: .is_current)
            ?? false
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(name, forKey: .name)
        try c.encode(revision, forKey: .revision)
        try c.encodeIfPresent(updatedAt, forKey: .updatedAt)
        try c.encode(isCurrent, forKey: .isCurrent)
    }
}

struct World2WorldListResponse: Codable, Equatable, Sendable {
    var worlds: [World2ServerWorldSummary]
    var currentWorldId: String?

    enum CodingKeys: String, CodingKey {
        case worlds, currentWorldId, current_world_id
    }

    init(worlds: [World2ServerWorldSummary], currentWorldId: String?) {
        self.worlds = worlds
        self.currentWorldId = currentWorldId
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        worlds = try c.decodeIfPresent([World2ServerWorldSummary].self, forKey: .worlds) ?? []
        currentWorldId = try c.decodeIfPresent(String.self, forKey: .currentWorldId)
            ?? c.decodeIfPresent(String.self, forKey: .current_world_id)
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(worlds, forKey: .worlds)
        try c.encodeIfPresent(currentWorldId, forKey: .currentWorldId)
    }
}

/// Switcher row: a server document and/or a well-known client experience.
struct World2SwitcherEntry: Identifiable, Equatable {
    enum Kind: Equatable {
        case serverDocument
        case marbleVoyage
        case moonBase
    }

    var id: String
    var name: String
    var summary: String
    var kind: Kind
    var isCurrent: Bool
    var isUnlocked: Bool
    /// How to unlock — shown when locked so the player knows the path.
    var unlockHint: String?
    var revision: Int?
}

/// Teleporter rows. Compiled worlds use `WorldId.rawValue`; a signed-in
/// document uses its own scene ids (`scene.home`, not `world.home`).
struct World2TeleporterDestination: Identifiable, Equatable {
    var id: String
    var name: String
    var summary: String
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
