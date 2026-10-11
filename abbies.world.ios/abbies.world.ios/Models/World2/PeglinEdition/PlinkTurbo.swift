import CoreGraphics
import Foundation

/// Trackpad turbo boost — pull down to arm; first peg hit spawns a one-contact echo ball.
enum PlinkTurboRules {
    /// Full meter.
    static let maxCharge: CGFloat = 1
    /// One armed shot spends the whole bar.
    static let useCost: CGFloat = 1
    /// Refill when foes fall (front or bomb splash).
    static let regenPerKill: CGFloat = 0.25
    /// Normalized downward pull on the aim pad (0 top … 1 full down) to arm turbo.
    static let pullThreshold: CGFloat = 0.55
    /// Echo sibling angle offset from primary velocity (~±degrees in radians).
    static let echoAngleRadians: CGFloat = 0.38
    /// Echo ball lives for this many peg contacts, then vanishes.
    static let echoContacts: Int = 1

    static func canArm(charge: CGFloat, pull: CGFloat) -> Bool {
        pull >= pullThreshold && charge >= useCost - 0.001
    }

    static func afterUse(charge: CGFloat) -> CGFloat {
        max(0, charge - useCost)
    }

    static func afterKills(charge: CGFloat, kills: Int) -> CGFloat {
        guard kills > 0 else { return min(maxCharge, max(0, charge)) }
        return min(maxCharge, charge + regenPerKill * CGFloat(kills))
    }
}
