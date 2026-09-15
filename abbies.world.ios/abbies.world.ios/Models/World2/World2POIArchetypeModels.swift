//
//  World2POIArchetypeModels.swift
//  abbies.world.ios
//
//  The POI registration vocabulary for Abbie's World 2.
//
//  An *archetype* is a registered kind of place: its art, its footprint, and —
//  most importantly — its contract with the game. The contract is what makes a
//  place safe to drop into any scene: it declares which screen the place opens
//  and exactly which inventory transactions it is allowed to perform. Nothing
//  else in the app has to know what a Furniture Store is.
//
//  An *instance* (World2POIInstance, in World2SceneGraphModels) is one placement
//  of an archetype in one scene.
//

import Foundation

/// Broad family of a place. Drives marker styling and the kind of language the
/// inspection drawer uses; it deliberately does not drive behaviour, because
/// behaviour belongs to the contract.
enum World2POIKind: String, Codable, CaseIterable, Sendable {
    case home
    case cardFactory
    case minigame
    case factory
    case story

    var displayName: String {
        switch self {
        case .home: return "Home"
        case .cardFactory: return "Card Factory"
        case .minigame: return "Game"
        case .factory: return "Factory"
        case .story: return "Story Place"
        }
    }

    var fallbackIcon: String {
        switch self {
        case .home: return "house.fill"
        case .cardFactory: return "wand.and.stars"
        case .minigame: return "gamecontroller.fill"
        case .factory: return "building.2.crop.circle.fill"
        case .story: return "book.closed.fill"
        }
    }
}

/// Which screen a place opens. Adding a place means adding a case here and
/// handling it in one `switch`, so the compiler names every site that needs
/// updating.
enum World2POIRoute: Codable, Equatable, Sendable {
    case playerHome
    case cardFactory
    case furnitureStore
    case assetWorkbench
    case creatureLab
    case fallingTargets(configurationID: String)
    case placeFactory
    case threeBearsHouse

    var diagnosticName: String {
        switch self {
        case .playerHome: return "player_home"
        case .cardFactory: return "card_factory"
        case .furnitureStore: return "furniture_store"
        case .assetWorkbench: return "asset_workbench"
        case .creatureLab: return "creature_lab"
        case .fallingTargets(let configurationID): return "falling_targets:\(configurationID)"
        case .placeFactory: return "place_factory"
        case .threeBearsHouse: return "three_bears_house"
        }
    }

    /// The id `completeMinigame` matches on when a round is scored.
    var minigameConfigurationID: String? {
        switch self {
        case .fallingTargets(let configurationID): return configurationID
        case .furnitureStore: return "furniture_store"
        case .assetWorkbench: return "asset_workbench"
        case .creatureLab: return "creature_lab"
        case .threeBearsHouse: return "just_right_porridge"
        case .playerHome, .cardFactory, .placeFactory: return nil
        }
    }
}

/// Something a place is allowed to put into the player's inventory. Declaring it
/// up front means a reward can be audited without reading the minigame.
enum World2POIGrant: Codable, Equatable, Sendable {
    case gems(upTo: Int)
    case furnitureIngredients(upTo: Int)
    case generatedDecorations(count: Int)
    case creatureCards(count: Int)
    case storyDecoration(decorationID: String)
    case placeInventoryItem(templateID: String)

    var summary: String {
        switch self {
        case .gems(let amount): return "up to \(amount) gems"
        case .furnitureIngredients(let amount): return "up to \(amount) furniture ingredients"
        case .generatedDecorations(let count): return "\(count) generated decorations"
        case .creatureCards(let count): return "\(count) creature cards"
        case .storyDecoration(let decorationID): return "the \(decorationID) decoration"
        case .placeInventoryItem(let templateID): return "a \(templateID) for your inventory"
        }
    }
}

/// Something a place is allowed to take from the player.
enum World2POICost: Codable, Equatable, Sendable {
    case gems(Int)
    case furnitureIngredients(Int)

    var summary: String {
        switch self {
        case .gems(let amount): return "\(amount) gems"
        case .furnitureIngredients(let amount): return "\(amount) furniture ingredients"
        }
    }
}

/// The agreement between a place and the game.
struct World2POIContract: Codable, Equatable, Sendable {
    let route: World2POIRoute
    let grants: [World2POIGrant]
    let costs: [World2POICost]
    /// Recorded in player progression the first time the place pays out.
    let completionMilestone: String?
    /// True for treehouses: visitors may look but only the owner may change things.
    let requiresOwnership: Bool

    init(
        route: World2POIRoute,
        grants: [World2POIGrant] = [],
        costs: [World2POICost] = [],
        completionMilestone: String? = nil,
        requiresOwnership: Bool = false
    ) {
        self.route = route
        self.grants = grants
        self.costs = costs
        self.completionMilestone = completionMilestone
        self.requiresOwnership = requiresOwnership
    }

    var grantsPlayerInventory: Bool { !grants.isEmpty }

    /// One-line, human-readable audit of the contract. Printed by the registry
    /// report so the whole catalog can be reviewed as text.
    var auditLine: String {
        var parts: [String] = ["opens \(route.diagnosticName)"]
        if !grants.isEmpty {
            parts.append("grants " + grants.map(\.summary).joined(separator: ", "))
        }
        if !costs.isEmpty {
            parts.append("costs " + costs.map(\.summary).joined(separator: ", "))
        }
        if requiresOwnership {
            parts.append("owner-only edits")
        }
        return parts.joined(separator: "; ")
    }
}

/// A registered kind of place.
struct World2POIArchetype: Identifiable, Equatable, Sendable {
    let id: String
    let name: String
    let kind: World2POIKind
    let sizeClass: World2POISizeClass
    let exteriorAsset: String
    let interiorAsset: String?
    let icon: String
    let lore: String?
    /// Shown in the inspection drawer under the name.
    let activityDescription: String
    /// The label on the big button that walks the player inside.
    let callToAction: String
    let musicTrackID: String?
    let contract: World2POIContract
    /// Set for treehouses. `nil` means the place belongs to everybody.
    let ownerID: String?

    init(
        id: String,
        name: String,
        kind: World2POIKind,
        sizeClass: World2POISizeClass,
        exteriorAsset: String,
        interiorAsset: String? = nil,
        icon: String? = nil,
        lore: String? = nil,
        activityDescription: String,
        callToAction: String,
        musicTrackID: String? = nil,
        contract: World2POIContract,
        ownerID: String? = nil
    ) {
        self.id = id
        self.name = name
        self.kind = kind
        self.sizeClass = sizeClass
        self.exteriorAsset = exteriorAsset
        self.interiorAsset = interiorAsset
        self.icon = icon ?? kind.fallbackIcon
        self.lore = lore
        self.activityDescription = activityDescription
        self.callToAction = callToAction
        self.musicTrackID = musicTrackID
        self.contract = contract
        self.ownerID = ownerID
    }

    var route: World2POIRoute { contract.route }
    var minigameConfigurationID: String? { contract.route.minigameConfigurationID }

    /// Instances of this archetype only snap onto pads that accept this size.
    func fits(_ hardpoint: World2SceneHardpoint) -> Bool {
        hardpoint.accepts(sizeClass)
    }
}

/// A problem found while validating the registry or a scene against it.
enum World2POIRegistryIssue: Equatable, CustomStringConvertible {
    case unknownArchetype(instanceID: String, archetypeID: String, sceneID: String)
    case unknownHardpoint(instanceID: String, hardpointID: String, sceneID: String)
    case hardpointRejectsSize(instanceID: String, hardpointID: String, sceneID: String)
    case hardpointDoubleBooked(hardpointID: String, sceneID: String, instanceIDs: [String])
    case duplicateHardpointID(hardpointID: String, sceneID: String)
    case duplicateInstanceID(instanceID: String, sceneID: String)

    var description: String {
        switch self {
        case .unknownArchetype(let instanceID, let archetypeID, let sceneID):
            return "scene=\(sceneID) instance=\(instanceID) references unregistered archetype=\(archetypeID)"
        case .unknownHardpoint(let instanceID, let hardpointID, let sceneID):
            return "scene=\(sceneID) instance=\(instanceID) pinned to missing hardpoint=\(hardpointID)"
        case .hardpointRejectsSize(let instanceID, let hardpointID, let sceneID):
            return "scene=\(sceneID) instance=\(instanceID) does not fit hardpoint=\(hardpointID)"
        case .hardpointDoubleBooked(let hardpointID, let sceneID, let instanceIDs):
            return "scene=\(sceneID) hardpoint=\(hardpointID) double-booked by \(instanceIDs.joined(separator: ","))"
        case .duplicateHardpointID(let hardpointID, let sceneID):
            return "scene=\(sceneID) duplicate hardpoint id=\(hardpointID)"
        case .duplicateInstanceID(let instanceID, let sceneID):
            return "scene=\(sceneID) duplicate instance id=\(instanceID)"
        }
    }
}
