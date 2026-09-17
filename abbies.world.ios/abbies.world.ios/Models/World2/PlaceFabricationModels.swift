import Foundation

enum World2PlaceTemplateID: String, Codable, CaseIterable {
    case selfReplicatingFactory = "place.selfReplicatingFactory"
    /// Inventory seed. Planting births a blank player world and a seedling POI.
    case worldSeed = "place.worldSeed"
    /// Interior POI that hands out Scene Kits.
    case sceneCreator = "place.sceneCreator"
    /// Inventory kit. Placing on a hardpoint attaches a new scene + exit.
    case sceneKit = "place.sceneKit"
    /// Simple message POI for proving interaction in a player-made scene.
    case beacon = "place.beacon"
}

/// Growth of a planted World Seed on the map.
enum World2WorldSeedGrowth: String, Codable, Equatable {
    /// Just planted — waiting for the world's first attached scene.
    case seedling
    /// First scene exists — acts as a teleporter into that world.
    case portal
}

struct World2PlaceTemplate: Identifiable, Equatable {
    let id: World2PlaceTemplateID
    let name: String
    let description: String
    let exteriorAsset: String
    let interiorAsset: String
    let fallbackIcon: String
    let interactionTemplateID: String

    static let selfReplicatingFactory = World2PlaceTemplate(
        id: .selfReplicatingFactory,
        name: "POI Factory",
        description: "A small factory that makes another small factory.",
        exteriorAsset: "poi.selfReplicatingFactory.exterior",
        interiorAsset: "poi.selfReplicatingFactory.interior",
        fallbackIcon: "building.2.crop.circle.fill",
        interactionTemplateID: "self_replicating_place_factory/v1"
    )

    static let worldSeed = World2PlaceTemplate(
        id: .worldSeed,
        name: "World Seed",
        description: "Plant on a hardpoint to grow a brand-new blank world.",
        exteriorAsset: "poi.worldSeed.inventory",
        interiorAsset: "poi.worldSeed.interior",
        fallbackIcon: "globe.desk.fill",
        interactionTemplateID: "world_seed_plant/v1"
    )

    static let sceneCreator = World2PlaceTemplate(
        id: .sceneCreator,
        name: "Scene Creator",
        description: "A workshop that packs Scene Kits for building new lands.",
        exteriorAsset: "poi.sceneCreator.exterior",
        interiorAsset: "poi.sceneCreator.interior",
        fallbackIcon: "hammer.fill",
        interactionTemplateID: "scene_creator/v1"
    )

    static let sceneKit = World2PlaceTemplate(
        id: .sceneKit,
        name: "Scene Kit",
        description: "Place on a hardpoint to attach a new scene you can walk into.",
        exteriorAsset: "poi.sceneKit.inventory",
        interiorAsset: "poi.sceneKit.interior",
        fallbackIcon: "square.stack.3d.up.fill",
        interactionTemplateID: "scene_kit_attach/v1"
    )

    static let beacon = World2PlaceTemplate(
        id: .beacon,
        name: "Beacon",
        description: "A friendly marker that opens a message when you tap it.",
        exteriorAsset: "poi.beacon.exterior",
        interiorAsset: "poi.beacon.interior",
        fallbackIcon: "light.beacon.max.fill",
        interactionTemplateID: "beacon_message/v1"
    )

    static func template(for id: World2PlaceTemplateID) -> World2PlaceTemplate {
        switch id {
        case .selfReplicatingFactory: return .selfReplicatingFactory
        case .worldSeed: return .worldSeed
        case .sceneCreator: return .sceneCreator
        case .sceneKit: return .sceneKit
        case .beacon: return .beacon
        }
    }

    /// Catalog image for inventory / map by template + optional seed growth.
    func mapCatalogName(growth: World2WorldSeedGrowth?) -> String? {
        switch id {
        case .worldSeed:
            switch growth {
            case .portal: return "world2_world_portal"
            case .seedling, .none: return "world2_world_seedling"
            }
        case .sceneCreator: return "world2_world_portal"
        case .sceneKit: return "world2_world_seed"
        case .beacon: return "world2_world_seedling"
        case .selfReplicatingFactory: return nil
        }
    }

    var inventoryCatalogName: String? {
        switch id {
        case .worldSeed, .sceneKit: return "world2_world_seed"
        case .sceneCreator: return "world2_world_portal"
        case .beacon: return "world2_world_seedling"
        case .selfReplicatingFactory: return nil
        }
    }
}

struct World2PlaceInventoryItem: Codable, Identifiable, Equatable {
    let id: String
    let templateID: World2PlaceTemplateID
    let createdAt: Date
    let sourcePlaceInstanceID: String?
    /// Bound destination scene id (for matured world seeds / kits).
    let linkedSceneID: String?
    /// Optional beacon / kit message payload.
    let message: String?

    init(
        id: String = UUID().uuidString,
        templateID: World2PlaceTemplateID,
        createdAt: Date = Date(),
        sourcePlaceInstanceID: String? = nil,
        linkedSceneID: String? = nil,
        message: String? = nil
    ) {
        self.id = id
        self.templateID = templateID
        self.createdAt = createdAt
        self.sourcePlaceInstanceID = sourcePlaceInstanceID
        self.linkedSceneID = linkedSceneID
        self.message = message
    }

    static func starterFactory(for playerID: PlayerId) -> World2PlaceInventoryItem {
        World2PlaceInventoryItem(
            id: "starter_poi_factory_\(playerID.rawValue)",
            templateID: .selfReplicatingFactory
        )
    }

    static func starterWorldSeed(for playerID: PlayerId) -> World2PlaceInventoryItem {
        World2PlaceInventoryItem(
            id: "starter_world_seed_\(playerID.rawValue)",
            templateID: .worldSeed
        )
    }

    static func sceneKit(forHub hubSceneID: String) -> World2PlaceInventoryItem {
        World2PlaceInventoryItem(
            id: "scene_kit_\(UUID().uuidString)",
            templateID: .sceneKit,
            linkedSceneID: hubSceneID
        )
    }

    static func beacon(message: String = "You made it! This beacon marks your new scene.") -> World2PlaceInventoryItem {
        World2PlaceInventoryItem(
            id: "beacon_\(UUID().uuidString)",
            templateID: .beacon,
            message: message
        )
    }
}

struct World2PlacedPlaceInstance: Codable, Identifiable, Equatable {
    static let blankSlateSceneID = World2SceneDefinition.blankSlateSceneID

    let id: String
    let templateID: World2PlaceTemplateID
    let sceneID: String
    var x: Double
    var y: Double
    var scale: Double
    var rotationDegrees: Double
    let hardpointID: String?
    let placedAt: Date
    let placedByPlayerID: String
    let sourceInventoryItemID: String
    /// Hub / destination scene for world seeds and scene kits.
    var linkedSceneID: String?
    /// Seedling → portal once the first attached scene exists.
    var seedGrowth: World2WorldSeedGrowth?
    /// Beacon message (and similar small payloads).
    var message: String?
    /// Optional per-instance embellishment override. Nil = use template defaults.
    var embellishments: [World2PlaceEmbellishment]?

    init(
        id: String = UUID().uuidString,
        templateID: World2PlaceTemplateID,
        sceneID: String = Self.blankSlateSceneID,
        x: Double,
        y: Double,
        scale: Double = 1,
        rotationDegrees: Double = 0,
        hardpointID: String? = nil,
        placedAt: Date = Date(),
        placedByPlayerID: String,
        sourceInventoryItemID: String,
        linkedSceneID: String? = nil,
        seedGrowth: World2WorldSeedGrowth? = nil,
        message: String? = nil,
        embellishments: [World2PlaceEmbellishment]? = nil
    ) {
        self.id = id
        self.templateID = templateID
        self.sceneID = sceneID
        self.x = x
        self.y = y
        self.scale = scale
        self.rotationDegrees = rotationDegrees
        self.hardpointID = hardpointID
        self.placedAt = placedAt
        self.placedByPlayerID = placedByPlayerID
        self.sourceInventoryItemID = sourceInventoryItemID
        self.linkedSceneID = linkedSceneID
        self.seedGrowth = seedGrowth
        self.message = message
        self.embellishments = embellishments
    }
}

struct World2SceneExit: Codable, Identifiable, Equatable {
    let id: String
    let fromSceneID: String
    let toSceneID: String
    var name: String
    var summary: String
    let x: Double
    let y: Double
    let createdAt: Date
    let createdByPlayerID: String
    var partyLanding: World2PartyLandingContract?

    init(
        id: String,
        fromSceneID: String,
        toSceneID: String,
        name: String,
        summary: String,
        x: Double,
        y: Double,
        createdAt: Date,
        createdByPlayerID: String,
        partyLanding: World2PartyLandingContract? = nil
    ) {
        self.id = id
        self.fromSceneID = fromSceneID
        self.toSceneID = toSceneID
        self.name = name
        self.summary = summary
        self.x = x
        self.y = y
        self.createdAt = createdAt
        self.createdByPlayerID = createdByPlayerID
        self.partyLanding = partyLanding
    }

    var arrivalContract: World2PartyLandingContract {
        partyLanding ?? .defaultSpawn
    }
}
