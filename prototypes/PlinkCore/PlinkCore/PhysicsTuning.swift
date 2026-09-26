import Foundation
import CoreGraphics

/// Abbie's World shot personality — Peglin-inspired physics knobs, original names.
struct OrbKind: Identifiable, Equatable, Hashable {
    let id: String
    let name: String
    let blurb: String
    /// Launch impulse (pt/s).
    let fireForce: Double
    /// Multiplies world gravity for this orb.
    let gravityScale: Double
    /// Restitution personality (0…~1.2). Rubborb-analogue sits high.
    let bounciness: Double
    /// Apparent density. Higher → less energy kept after collisions (cannonball).
    let mass: Double
    /// Collision radius (pt).
    let radius: Double

    static let sparkle = OrbKind(
        id: "sparkle",
        name: "Sparkle",
        blurb: "Peglin default SO — e1 · g1.2 · no drag",
        fireForce: 400, gravityScale: 1.2, bounciness: 1.0, mass: 1.0, radius: 11
    )
    static let bounceberry = OrbKind(
        id: "bounceberry",
        name: "Bounceberry",
        blurb: "Super bouncy lateral chaos",
        fireForce: 380, gravityScale: 1.0, bounciness: 0.95, mass: 1.0, radius: 11
    )
    static let pebble = OrbKind(
        id: "pebble",
        name: "Pebble",
        blurb: "Dense — drops deep, short hops",
        fireForce: 420, gravityScale: 1.15, bounciness: 0.35, mass: 2.0, radius: 12
    )
    static let zipbolt = OrbKind(
        id: "zipbolt",
        name: "Zipbolt",
        blurb: "Huge force · low g · laserish",
        fireForce: 620, gravityScale: 0.35, bounciness: 0.88, mass: 0.9, radius: 9
    )
    static let puff = OrbKind(
        id: "puff",
        name: "Puff",
        blurb: "Big soft catcher — fills gaps",
        fireForce: 340, gravityScale: 0.9, bounciness: 0.78, mass: 0.85, radius: 15
    )

    static let all: [OrbKind] = [sparkle, bounceberry, pebble, zipbolt, puff]
}

/// World + active-orb physics for Abbie Plink (Peglin-compatible vocabulary).
struct PhysicsTuning: Equatable {
    /// World pull magnitude (pt/s²). Default G10.
    var gravity: Double
    /// Board tilt in degrees.
    var tilt: Double
    /// Rail / wall restitution.
    var wallRestitution: Double
    /// Air / wood drag (velocity decay per second-ish).
    var woodDamping: Double
    /// Fixed outward bumper punch (pt/s) added on every peg hit — always adds energy.
    var bumperKick: Double
    var maxBallSpeed: Double
    /// Active orb id — resolves to OrbKind.
    var orbID: String

    static let `default` = PhysicsPreset.salon.tuning

    var orb: OrbKind {
        OrbKind.all.first(where: { $0.id == orbID }) ?? .sparkle
    }

    var gravityCG: CGFloat { CGFloat(gravity) }
    var tiltCG: CGFloat { CGFloat(tilt) }
    var wallRestitutionCG: CGFloat { CGFloat(wallRestitution) }
    var woodDampingCG: CGFloat { CGFloat(woodDamping) }
    var bumperKickCG: CGFloat { CGFloat(bumperKick) }
    var maxBallSpeedCG: CGFloat { CGFloat(maxBallSpeed) }

    var fireForceCG: CGFloat { CGFloat(orb.fireForce) }
    var gravityScaleCG: CGFloat { CGFloat(orb.gravityScale) }
    var bouncinessCG: CGFloat { CGFloat(orb.bounciness) }
    var massCG: CGFloat { CGFloat(orb.mass) }
    var ballRadiusCG: CGFloat { CGFloat(orb.radius) }

    /// Effective gravity for this orb (world × scale, tilted).
    var gravityVector: CGVector {
        let g = gravity * orb.gravityScale
        let rad = tilt * .pi / 180
        return CGVector(
            dx: CGFloat(g * sin(rad)),
            dy: CGFloat(-g * cos(rad))
        )
    }

    /// Passive rubber e (≤ 1). Bumper kick is separate and always adds outward Δv.
    func effectiveRestitution(pegSurface: CGFloat) -> CGFloat {
        min(1.0, max(0.05, bouncinessCG * pegSurface))
    }

    /// Outward punch: base kick × orb bounciness feel; dense orbs get a slightly softer kick.
    var effectiveBumperKick: CGFloat {
        let feel = 0.65 + 0.35 * bouncinessCG
        let density = min(1.15, max(0.7, 1.2 / max(0.5, massCG)))
        return bumperKickCG * CGFloat(feel) * density
    }
}

struct PhysicsPreset: Identifiable, Equatable {
    let id: String
    let name: String
    let blurb: String
    let tuning: PhysicsTuning

    static let salon = PhysicsPreset(
        id: "salon",
        name: "Salon",
        blurb: "Peglin-faithful — zero drag, elastic pegs",
        tuning: PhysicsTuning(
            gravity: 10, tilt: 0,
            wallRestitution: 1.0, woodDamping: 0,
            bumperKick: 0, maxBallSpeed: 1400, orbID: OrbKind.sparkle.id
        )
    )

    static let classic = PhysicsPreset(
        id: "classic",
        name: "Classic",
        blurb: "Steeper board · Sparkle",
        tuning: PhysicsTuning(
            gravity: 22, tilt: 0,
            wallRestitution: 0.65, woodDamping: 0.22,
            bumperKick: 280, maxBallSpeed: 1200, orbID: OrbKind.sparkle.id
        )
    )

    static let slick = PhysicsPreset(
        id: "slick",
        name: "Slick",
        blurb: "Low drag · Bounceberry",
        tuning: PhysicsTuning(
            gravity: 8, tilt: 0,
            wallRestitution: 0.78, woodDamping: 0.08,
            bumperKick: 420, maxBallSpeed: 1600, orbID: OrbKind.bounceberry.id
        )
    )

    static let sticky = PhysicsPreset(
        id: "sticky",
        name: "Sticky",
        blurb: "Heavy drag · Pebble",
        tuning: PhysicsTuning(
            gravity: 14, tilt: 0,
            wallRestitution: 0.50, woodDamping: 0.55,
            bumperKick: 220, maxBallSpeed: 1000, orbID: OrbKind.pebble.id
        )
    )

    static let arcade = PhysicsPreset(
        id: "arcade",
        name: "Arcade",
        blurb: "Zipbolt laser parlor",
        tuning: PhysicsTuning(
            gravity: 12, tilt: 0,
            wallRestitution: 0.72, woodDamping: 0.12,
            bumperKick: 480, maxBallSpeed: 1800, orbID: OrbKind.zipbolt.id
        )
    )

    static let all: [PhysicsPreset] = [salon, classic, slick, sticky, arcade]
}

enum PhysicsSliderRange {
    static let gravity = 0.0...50.0
    static let tilt = -90.0...90.0
    static let wallRestitution = 0.20...1.0
    static let woodDamping = 0.0...1.2
    static let bumperKick = 0.0...900.0
    static let maxBallSpeed = 400.0...2400.0
}

enum PeggleFeel {
    static let pegRadius: CGFloat = 11
}
