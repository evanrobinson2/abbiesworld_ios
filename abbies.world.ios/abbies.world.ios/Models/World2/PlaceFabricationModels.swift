import Foundation

enum World2PlaceTemplateID: String, Codable, CaseIterable {
    case selfReplicatingFactory = "place.selfReplicatingFactory"
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

    static func template(for id: World2PlaceTemplateID) -> World2PlaceTemplate {
        switch id {
        case .selfReplicatingFactory:
            return .selfReplicatingFactory
        }
    }
}

struct World2PlaceInventoryItem: Codable, Identifiable, Equatable {
    let id: String
    let templateID: World2PlaceTemplateID
    let createdAt: Date
    let sourcePlaceInstanceID: String?

    init(
        id: String = UUID().uuidString,
        templateID: World2PlaceTemplateID,
        createdAt: Date = Date(),
        sourcePlaceInstanceID: String? = nil
    ) {
        self.id = id
        self.templateID = templateID
        self.createdAt = createdAt
        self.sourcePlaceInstanceID = sourcePlaceInstanceID
    }

    static func starterFactory(for playerID: PlayerId) -> World2PlaceInventoryItem {
        World2PlaceInventoryItem(
            id: "starter_poi_factory_\(playerID.rawValue)",
            templateID: .selfReplicatingFactory
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
        sourceInventoryItemID: String
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
    }
}

// World2SceneHardpoint and World2MutableScene used to live here with a flat
// x/y shape. They are part of the scene graph now: see
// World2SceneGraphModels.swift, which also decodes the older saved shape.

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
    /// Optional spawn / approach for Abbie + Daddy when this exit is taken.
    /// Older saves omit it and fall back to the bottom-left staging corner.
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

    /// Contract the party should honor when arriving through this exit.
    var arrivalContract: World2PartyLandingContract {
        partyLanding ?? .defaultSpawn
    }
}
