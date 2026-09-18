import Foundation

enum World2PlaceTemplateID: String, Codable, CaseIterable {
    case selfReplicatingFactory = "place.selfReplicatingFactory"
    case newSceneKit = "place.newSceneKit"
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
        description: "A small factory that makes a POI for your inventory.",
        exteriorAsset: "poi.selfReplicatingFactory.exterior",
        interiorAsset: "poi.selfReplicatingFactory.interior",
        fallbackIcon: "building.2.crop.circle.fill",
        interactionTemplateID: "self_replicating_place_factory/v1"
    )

    static let newSceneKit = World2PlaceTemplate(
        id: .newSceneKit,
        name: "Scene Kit",
        description: "A new place that is not on the world yet. Visit it, get it ready, then hang it on an open path.",
        exteriorAsset: "poi.sceneWorks.exterior",
        interiorAsset: "poi.sceneWorks.interior",
        fallbackIcon: "map.fill",
        interactionTemplateID: "new_scene_kit/v1"
    )

    static func template(for id: World2PlaceTemplateID) -> World2PlaceTemplate {
        switch id {
        case .selfReplicatingFactory:
            return .selfReplicatingFactory
        case .newSceneKit:
            return .newSceneKit
        }
    }
}

struct World2PlaceInventoryItem: Codable, Identifiable, Equatable {
    let id: String
    let templateID: World2PlaceTemplateID
    let createdAt: Date
    let sourcePlaceInstanceID: String?
    /// Scene kits point at the orphan they open. Nil for ordinary placeables.
    var boundSceneID: String?

    init(
        id: String = UUID().uuidString,
        templateID: World2PlaceTemplateID,
        createdAt: Date = Date(),
        sourcePlaceInstanceID: String? = nil,
        boundSceneID: String? = nil
    ) {
        self.id = id
        self.templateID = templateID
        self.createdAt = createdAt
        self.sourcePlaceInstanceID = sourcePlaceInstanceID
        self.boundSceneID = boundSceneID
    }

    var isSceneKit: Bool { templateID == .newSceneKit }

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
}
