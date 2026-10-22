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

    /// Rest clip. Each gait is its own file. RealityKit only plays animationSource.
    var idleUSDZResourceName: String? {
        switch self {
        case .abbie: return "abbie_idle"
        case .daddy: return "daddy"
        }
    }

    var walkUSDZResourceName: String {
        switch self {
        case .abbie: return "abbie"
        case .daddy: return "daddy_walk"
        }
    }

    var runUSDZResourceName: String {
        switch self {
        case .abbie: return "abbie_run"
        case .daddy: return "daddy_run"
        }
    }

    /// Kept for older call sites. Settled mesh is the walk file for Abbie.
    var usdzResourceName: String { walkUSDZResourceName }

    var idleClipHints: [String] {
        ["Idle"]
    }

    /// Prim names inside each gait's USDZ.
    var walkClipHints: [String] {
        ["Casual_Walk", "Casual Walk"]
    }

    var runClipHints: [String] {
        ["Run_02", "Run 2"]
    }

    /// Draw order: Daddy slightly behind Abbie so she reads as the lead.
    var zBias: Double {
        switch self {
        case .abbie: return 1
        case .daddy: return 0
        }
    }

    /// Formation offset from the party's lead point, in normalized map space.
    /// Daddy trails a little so the two never stack (scaled for big figurines).
    var formationOffset: World2NormalizedPoint {
        switch self {
        case .abbie: return World2NormalizedPoint(x: 0, y: 0)
        case .daddy: return World2NormalizedPoint(x: -0.07, y: 0.04)
        }
    }

    /// Radians to subtract from the shared travel yaw. Daddy's chest is +Z.
    /// Abbie's bind-pose chest is 21.7° toward +X, so the same yaw leaves her
    /// looking off the stick.
    var chestYawBias: Float {
        switch self {
        case .abbie: return 0.378
        case .daddy: return 0
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

/// Pure path math. Deliberate stroll — not a dash across the plate.
enum World2PartyPathfinding {
    /// Map-heights per second for a tap-to-walk march. Matched to a figurine
    /// stride so the feet are not left behind the slide.
    static let walkSpeed: Double = 0.075
    /// Full left-stick deflection. A lighter push scales down from these.
    static let stickWalkSpeed: Double = 0.055
    static let stickRunSpeed: Double = 0.15
    static let stickDeadzone: Double = 0.16
    static let stickRunThreshold: Double = 0.62

    static func duration(
        from: World2NormalizedPoint,
        to: World2NormalizedPoint,
        aspectRatio: Double = 4.0 / 3.0
    ) -> TimeInterval {
        let distance = from.distance(to: to, aspectRatio: aspectRatio)
        return max(0.85, distance / walkSpeed)
    }

    static func interpolate(
        from: World2NormalizedPoint,
        to: World2NormalizedPoint,
        progress: Double
    ) -> World2NormalizedPoint {
        let t = min(max(progress, 0), 1)
        // Smoothstep — soft start/stop so the stroll feels intentional.
        let eased = t * t * (3 - 2 * t)
        return World2NormalizedPoint(
            x: from.x + (to.x - from.x) * eased,
            y: from.y + (to.y - from.y) * eased
        )
    }

    /// One frame of dual-stick motion. Left stick moves (Y up) and the body
    /// turns to face that travel. The right stick only turns them while they
    /// are standing — it does not strafe. Speed scales with how far the stick
    /// is pushed, and `stride` is the clip playback rate so the feet keep up.
    static func stickStep(
        lead: World2NormalizedPoint,
        facingRight: Bool,
        heading: Float,
        move: World2StickVector,
        face: World2StickVector,
        dt: TimeInterval
    ) -> (lead: World2NormalizedPoint, facingRight: Bool, gait: World2PartyGait, heading: Float, stride: Double) {
        let magnitude = move.magnitude
        let bounded = min(max(dt, 0), 0.05)
        if magnitude < stickDeadzone {
            if face.magnitude >= stickDeadzone {
                return (
                    lead,
                    facingRight,
                    .idle,
                    headingForTravel(dx: face.x, dy: -face.y),
                    1
                )
            }
            return (lead, facingRight, .idle, heading, 1)
        }
        let gait: World2PartyGait = magnitude >= stickRunThreshold ? .run : .walk
        let cruise = gait == .run ? stickRunSpeed : stickWalkSpeed
        // Do not normalize. `move` already carries magnitude, so a light push
        // is a short step instead of a full glide with a walking clip.
        let next = World2NormalizedPoint(
            x: lead.x + move.x * cruise * bounded,
            y: lead.y - move.y * cruise * bounded
        ).clamped()
        let travelHeading = headingForTravel(dx: next.x - lead.x, dy: next.y - lead.y)
        let stride = min(1, max(0.72, magnitude))
        return (next, next.x >= lead.x, gait, travelHeading, stride)
    }

    /// Yaw for a chest that points along +Z at yaw 0.
    /// The party camera sits at (2.6, 2.4, 2.6) looking at the figurine.
    /// Measured in the movement lab: stick-right is 135°, stick-down is 51°.
    /// `dy` is map-down (stick up is negative). Abbie subtracts `chestYawBias`
    /// because her bind-pose chest is not +Z.
    static func headingForTravel(dx: Double, dy: Double) -> Float {
        let wx = 0.7071 * dx + 0.7771 * dy
        let wz = -0.7071 * dx + 0.6293 * dy
        if hypot(wx, wz) < 0.0001 { return 0.72 }
        return atan2(Float(wx), Float(wz))
    }

    /// Lead point for a party approaching a POI: stand a little south of the
    /// landmark so Abbie does not cover the token she is walking toward.
    static func approachPoint(
        forPOI position: World2NormalizedPoint
    ) -> World2NormalizedPoint {
        // Peglin landmark tokens are small — stand closer than full building POIs.
        let southBias = 0.055
        return World2NormalizedPoint(
            x: position.x,
            y: min(0.95, position.y + southBias)
        ).clamped()
    }

    /// Classic adventure-game depth: higher on the plate (smaller y) reads farther
    /// and draws smaller; lower on the plate reads nearer.
    static func depthScale(forY y: Double) -> Double {
        let t = min(max(y, 0.05), 0.97)
        return 0.58 + 0.62 * t
    }

    /// Always face "into" the painted scene (isometric into the plate), not
    /// mirrored left/right with every stroll. Keeps the party readable as
    /// figurines standing in the world.
    static func isometricFacingRight(
        from: World2NormalizedPoint,
        to: World2NormalizedPoint
    ) -> Bool {
        // Prefer a gentle bias toward the destination so they don't moonwalk,
        // but default into-scene (right/forward) when the step is mostly vertical.
        let dx = to.x - from.x
        let dy = to.y - from.y
        if abs(dx) < 0.02 { return true }
        if abs(dy) > abs(dx) * 1.4 { return true }
        return dx >= 0
    }

    static func facingRight(
        from: World2NormalizedPoint,
        to: World2NormalizedPoint
    ) -> Bool {
        isometricFacingRight(from: from, to: to)
    }

    /// Daddy stays on Abbie's trailing side. `facingRight` is ignored so a
    /// leftward step cannot swap him to the other side.
    static func formation(
        around lead: World2NormalizedPoint,
        facingRight: Bool
    ) -> [World2PartyActorID: World2NormalizedPoint] {
        _ = facingRight
        var result: [World2PartyActorID: World2NormalizedPoint] = [:]
        for actor in World2PartyActorID.allCases {
            let offset = actor.formationOffset
            result[actor] = World2NormalizedPoint(
                x: lead.x + offset.x,
                y: lead.y + offset.y
            ).clamped()
        }
        return result
    }
}

/// How hard the party is moving. Drives which USDZ clip plays.
enum World2PartyGait: String, Equatable, Hashable, Sendable {
    case idle
    case walk
    case run
}

/// Left stick moves, right stick aims. Y is up, matching a thumbstick.
struct World2StickVector: Equatable, Sendable {
    var x: Double
    var y: Double

    static let zero = World2StickVector(x: 0, y: 0)

    var magnitude: Double { min(1, hypot(x, y)) }
}

/// One actor's live pose on the current scene.
struct World2PartyPieceState: Equatable, Identifiable, Sendable {
    let id: World2PartyActorID
    var position: World2NormalizedPoint
    var facingRight: Bool
    var gait: World2PartyGait
    /// Radians around Y. Points the chest along travel so the walk is not a strafe.
    var heading: Float = 0.72
    /// Clip playback rate. Tracks how hard the stick is pushed.
    var stride: Double = 1

    var isWalking: Bool { gait != .idle }
    var imageAssetName: String { id.imageAssetName }
    var displayName: String { id.displayName }
}
