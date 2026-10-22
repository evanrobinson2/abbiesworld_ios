//
//  World2SceneWalkIntake.swift
//  abbies.world.ios
//
//  Authoring checklist for how a painted scene teaches the party to walk,
//  scale, and path — the modern cousin of Sierra walkboxes / SCUMM scale slots.
//

import Foundation

/// How depth (near/far) is authored for a scene plate.
enum World2SceneDepthMode: String, Codable, CaseIterable, Sendable {
    /// Classic adventure: screen Y drives scale (farther up = smaller).
    case yScale
    /// Greyscale depth plate (white = near, black = far) sampled under feet.
    case depthMap
    /// Side-view / platformer: separate ground / wall / hole mask.
    case platformerLayers
}

/// What a pixel means on a platformer navigation mask.
enum World2PlatformerCell: String, Codable, Sendable {
    case ground
    case wall
    case hole
    case climb
    case ignore
}

/// One authored POI approach / staging spot (replaces magnetic hardpoints for
/// walk presentation — where the party should stand when interacting).
struct World2SceneWalkAnchor: Codable, Identifiable, Equatable, Sendable {
    let id: String
    var label: String
    var position: World2NormalizedPoint
    /// Optional linked POI instance or archetype id.
    var linkedPOIInstanceID: String?
    /// Preferred facing when arriving (into-scene isometric bias).
    var preferFacingRight: Bool

    init(
        id: String = UUID().uuidString,
        label: String,
        position: World2NormalizedPoint,
        linkedPOIInstanceID: String? = nil,
        preferFacingRight: Bool = true
    ) {
        self.id = id
        self.label = label
        self.position = position.clamped()
        self.linkedPOIInstanceID = linkedPOIInstanceID
        self.preferFacingRight = preferFacingRight
    }
}

/// Walk / depth profile attached to a scene during intake.
struct World2SceneWalkProfile: Codable, Equatable, Sendable {
    var depthMode: World2SceneDepthMode
    /// Semantic asset for a depth map or platformer mask (optional).
    var depthAsset: String?
    /// Near/far scale multipliers when using `.yScale` or sampled maps.
    var nearScale: Double
    var farScale: Double
    /// Walkable polygons in normalized space (empty = whole plate is walkable).
    var walkBoxes: [[World2NormalizedPoint]]
    var interactionAnchors: [World2SceneWalkAnchor]
    /// Authoring checklist progress (what still needs painting/masking).
    var intakeChecklist: World2SceneWalkIntakeChecklist

    static func `default`(for sceneID: String) -> World2SceneWalkProfile {
        World2SceneWalkProfile(
            depthMode: .yScale,
            depthAsset: nil,
            nearScale: 1.15,
            farScale: 0.55,
            walkBoxes: [],
            interactionAnchors: [],
            intakeChecklist: .fresh
        )
    }

    func scale(forY y: Double) -> Double {
        let t = min(max(y, 0), 1)
        // Invert: top of plate (y→0) uses farScale.
        return farScale + (nearScale - farScale) * t
    }
}

/// Developer intake checklist — tick these while authoring a plate.
struct World2SceneWalkIntakeChecklist: Codable, Equatable, Sendable {
    var markedPOIAnchors: Bool
    var choseDepthMode: Bool
    var paintedWalkBoxes: Bool
    var paintedDepthOrMask: Bool
    var verifiedNearFarScale: Bool
    var verifiedPathToPOI: Bool

    static let fresh = World2SceneWalkIntakeChecklist(
        markedPOIAnchors: false,
        choseDepthMode: false,
        paintedWalkBoxes: false,
        paintedDepthOrMask: false,
        verifiedNearFarScale: false,
        verifiedPathToPOI: false
    )

    var completedCount: Int {
        [
            markedPOIAnchors,
            choseDepthMode,
            paintedWalkBoxes,
            paintedDepthOrMask,
            verifiedNearFarScale,
            verifiedPathToPOI,
        ].filter(\.self).count
    }

    var totalCount: Int { 6 }

    var items: [(key: String, done: Bool, title: String)] {
        [
            ("poi", markedPOIAnchors, "Mark POI stand-points (where the party stops)"),
            ("depthMode", choseDepthMode, "Choose depth mode (Y-scale / depth map / platformer)"),
            ("walkBoxes", paintedWalkBoxes, "Paint walk boxes (or leave open = full plate)"),
            ("depthArt", paintedDepthOrMask, "Add depth map or ground/wall/hole mask if needed"),
            ("scale", verifiedNearFarScale, "Verify near/far player scale on this plate"),
            ("path", verifiedPathToPOI, "Verify pathfinding reaches each POI anchor"),
        ]
    }
}
