import CoreGraphics
import Foundation

/// Auto gravity rift — after a linger, eases extra pull so the marble finishes the round.
enum PlinkGravityWaveRules {
    /// Flying this long before the rift starts easing in.
    static let armAfterSeconds: TimeInterval = 5
    /// Time to ease extra gravity from 0 → max (no slam).
    static let rampSeconds: TimeInterval = 3.5
    /// Additive downward gravity at full ramp (world units).
    /// Salon base ≈ 11 × orb scale; ~+36 ≈ 4× pull — enough to drain a sticky bounce
    /// without an instant floor slam.
    static let maxExtraGravity: CGFloat = 36
    /// Live-flight hard stop (matches cavern sim ceiling). Prevents orphaned
    /// invisible primaries if a shot somehow never hits the kill floor.
    static let maxShotSeconds: TimeInterval = 14

    /// Ease-in progress 0…1 over the ramp window (smoothstep-ish: t²).
    static func rampProgress(elapsed: TimeInterval) -> CGFloat {
        let t = min(1, max(0, elapsed / rampSeconds))
        return t * t
    }

    static func extraGravity(rampElapsed: TimeInterval) -> CGFloat {
        maxExtraGravity * rampProgress(elapsed: rampElapsed)
    }
}
