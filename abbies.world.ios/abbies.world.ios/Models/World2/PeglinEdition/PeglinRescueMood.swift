import Foundation
import CoreGraphics

/// Maps remaining cage HP fraction → hostage emotion for the rescue arc.
enum PeglinRescueMood {
    /// Fraction remaining in 0…1 (1 = full cage, 0 = freed).
    static func state(cageFractionRemaining: CGFloat) -> PeglinCharacterState {
        let f = max(0, min(1, cageFractionRemaining))
        if f <= 0.001 { return .happy }
        if f > 0.70 { return .defeated }
        if f > 0.40 { return .hurt }
        if f > 0.15 { return .idle }
        return .sneakyWink
    }

    static func cageLabel(fractionRemaining: CGFloat) -> String {
        let f = max(0, min(1, fractionRemaining))
        if f <= 0.001 { return "Free!" }
        if f > 0.70 { return "Cage locked" }
        if f > 0.40 { return "Cage cracking" }
        if f > 0.15 { return "Almost free" }
        return "Breaking free!"
    }
}
