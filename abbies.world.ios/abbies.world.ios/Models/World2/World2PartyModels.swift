//
//  World2PartyModels.swift
//  abbies.world.ios
//
//  Abbie and Daddy as scene game pieces. They live on whatever map is open,
//  spawn in the bottom-left unless a scene-exit contract says otherwise, and
//  walk (straight line, for now) toward whatever place is selected.
//

import Foundation

/// Who walks the maps as a visible party piece.
enum World2PartyActorID: String, CaseIterable, Codable, Identifiable, Sendable {
    case abbie
    case daddy

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .abbie: return "Abbie"
        case .daddy: return "Daddy"
        }
    }

    /// Asset catalog imageset used as a load fallback.
    var imageAssetName: String {
        switch self {
        case .abbie: return "world2_actor_abbie"
        case .daddy: return "world2_actor_daddy"
        }
    }

    /// Bundled Meshy USDZ under Resources/World2Actors/.
    var usdzResourceName: String {
        switch self {
        case .abbie: return "abbie"
        case .daddy: return "daddy"
        }
    }

    /// Clip name hints for idle. Empty means freeze (Abbie's pack has no true idle).
    var idleClipHints: [String] {
        switch self {
        case .abbie:
            // Observed: "Idle" in this pack is a cautious walk — do not bind.
            return []
        case .daddy:
            return ["Idle"]
        }
    }

    /// Clip name hints for running to a selected POI.
    var runClipHints: [String] {
        switch self {
        case .abbie:
            // Observed remap: Casual_Walk is the run motion in Abbie's pack.
            return ["Casual_Walk", "Casual Walk", "Run_02", "Run 2", "Run"]
        case .daddy:
            return ["Run_02", "Run 2", "Run", "Casual_Walk", "Casual Walk"]
        }
    }

    /// Draw order: Daddy slightly behind Abbie so she reads as the lead.
    var zBias: Double {
        switch self {
        case .abbie: return 1
        case .daddy: return 0
        }
    }

    /// Formation offset from the party's lead point, in normalized map space.
    /// Daddy trails a little so the two never stack.
    var formationOffset: World2NormalizedPoint {
        switch self {
        case .abbie: return World2NormalizedPoint(x: 0, y: 0)
        case .daddy: return World2NormalizedPoint(x: -0.05, y: 0.025)
        }
    }
}

/// Where the party appears when a scene opens, and optionally where they walk
/// next. Scene exits can carry this so a door can drop them somewhere other
/// than the default bottom-left corner.
struct World2PartyLandingContract: Codable, Equatable, Sendable {
    /// Spawn point. Defaults to the scene's bottom-left staging corner.
    var landing: World2NormalizedPoint
    /// If set, the party immediately walks here after landing (e.g. a hardpoint).
    var approach: World2NormalizedPoint?

    static let bottomLeftStaging = World2NormalizedPoint(x: 0.10, y: 0.88)

    static var defaultSpawn: World2PartyLandingContract {
        World2PartyLandingContract(landing: bottomLeftStaging, approach: nil)
    }

    init(
        landing: World2NormalizedPoint = World2PartyLandingContract.bottomLeftStaging,
        approach: World2NormalizedPoint? = nil
    ) {
        self.landing = landing.clamped()
        self.approach = approach?.clamped()
    }
}

/// Pure path math — grotesquely simple on purpose. Straight line only.
enum World2PartyPathfinding {
    /// Map-heights per second. Tuned for a playful run across the map.
    static let walkSpeed: Double = 0.55

    static func duration(
        from: World2NormalizedPoint,
        to: World2NormalizedPoint,
        aspectRatio: Double = 4.0 / 3.0
    ) -> TimeInterval {
        let distance = from.distance(to: to, aspectRatio: aspectRatio)
        return max(0.35, distance / walkSpeed)
    }

    static func interpolate(
        from: World2NormalizedPoint,
        to: World2NormalizedPoint,
        progress: Double
    ) -> World2NormalizedPoint {
        let t = min(max(progress, 0), 1)
        // Ease in/out so starts and stops do not look robotic.
        let eased = t * t * (3 - 2 * t)
        return World2NormalizedPoint(
            x: from.x + (to.x - from.x) * eased,
            y: from.y + (to.y - from.y) * eased
        )
    }

    /// Lead point for a party approaching a POI: stand a little south of the
    /// building so the piece does not cover the painted place.
    static func approachPoint(
        forPOI position: World2NormalizedPoint
    ) -> World2NormalizedPoint {
        World2NormalizedPoint(
            x: position.x,
            y: min(0.95, position.y + 0.08)
        ).clamped()
    }

    static func facingRight(
        from: World2NormalizedPoint,
        to: World2NormalizedPoint
    ) -> Bool {
        to.x >= from.x
    }

    static func formation(
        around lead: World2NormalizedPoint,
        facingRight: Bool
    ) -> [World2PartyActorID: World2NormalizedPoint] {
        var result: [World2PartyActorID: World2NormalizedPoint] = [:]
        let mirror: Double = facingRight ? 1 : -1
        for actor in World2PartyActorID.allCases {
            let offset = actor.formationOffset
            result[actor] = World2NormalizedPoint(
                x: lead.x + offset.x * mirror,
                y: lead.y + offset.y
            ).clamped()
        }
        return result
    }
}

/// One actor's live pose on the current scene.
struct World2PartyPieceState: Equatable, Identifiable, Sendable {
    let id: World2PartyActorID
    var position: World2NormalizedPoint
    var facingRight: Bool
    var isWalking: Bool

    var imageAssetName: String { id.imageAssetName }
    var displayName: String { id.displayName }
}
