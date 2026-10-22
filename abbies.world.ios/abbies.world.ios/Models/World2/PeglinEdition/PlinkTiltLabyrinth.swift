import CoreGraphics
import Foundation
#if canImport(CoreMotion)
import CoreMotion
#endif

// MARK: - Tilt power-up (gravity-only labyrinth)
//
// v1: freeze → 3·2·1 → TILT! → device tip drives gravity for the rest of
// this marble. Board stays upright on screen (not a rotating camera).
// Landscape iPad only. No cancel once armed.

enum PlinkTiltPhase: Equatable, Sendable {
    case arming
    case countdown(digit: Int) // 3, 2, 1
    case stamp
    case labyrinth
}

enum PlinkTiltRules {
    /// How hard we damp velocity while arming (per 60fps-ish frame).
    static let armDampingPerFrame: CGFloat = 0.82
    /// Freeze when speed drops below this (pt/s).
    static let armStopSpeed: CGFloat = 48
    /// Max arming time before hard freeze.
    static let armTimeout: TimeInterval = 0.85
    static let countdownStep: TimeInterval = 0.55
    static let stampDuration: TimeInterval = 0.40
    /// Clamp tip so kids can’t invert the board into chaos.
    static let maxTiltDegrees: Double = 50
    static let deadzoneDegrees: Double = 5
}

/// Pure mapping: relative pitch/roll (radians) → scene gravity. Landscape board;
/// +Y is up on screen, +X is right. Flat (0,0) → straight down.
enum PlinkTiltMath {
    static func gravityVector(
        pitchRadians: Double,
        rollRadians: Double,
        magnitude: CGFloat,
        maxTiltDegrees: Double = PlinkTiltRules.maxTiltDegrees,
        deadzoneDegrees: Double = PlinkTiltRules.deadzoneDegrees
    ) -> CGVector {
        let maxR = maxTiltDegrees * .pi / 180
        let dead = deadzoneDegrees * .pi / 180
        func clampAxis(_ v: Double) -> Double {
            let a = max(-maxR, min(maxR, v))
            if abs(a) < dead { return 0 }
            return a
        }
        let roll = clampAxis(rollRadians)
        let pitch = clampAxis(pitchRadians)
        // Tip right (+roll) → gravity pulls right; tip top of iPad toward you (+pitch)
        // → gravity pulls toward bottom of screen in landscape play.
        var dx = CGFloat(sin(roll))
        var dy = CGFloat(-cos(roll) * cos(pitch))
        let len = hypot(dx, dy)
        if len < 1e-5 {
            return CGVector(dx: 0, dy: -magnitude)
        }
        dx = dx / len * magnitude
        dy = dy / len * magnitude
        return CGVector(dx: dx, dy: dy)
    }
}

#if canImport(CoreMotion)
/// Pulls device motion for landscape labyrinth. Baseline captured at TILT!.
final class PlinkTiltMotionSource {
    private let manager = CMMotionManager()
    private var reference: CMAttitude?

    var isAvailable: Bool { manager.isDeviceMotionAvailable }

    func start() {
        guard manager.isDeviceMotionAvailable else { return }
        manager.deviceMotionUpdateInterval = 1.0 / 60.0
        if !manager.isDeviceMotionActive {
            manager.startDeviceMotionUpdates(using: .xArbitraryZVertical)
        }
    }

    func captureBaseline() {
        reference = manager.deviceMotion?.attitude.copy() as? CMAttitude
    }

    /// Relative pitch/roll since baseline. Nil if motion unavailable / no sample.
    func relativePitchRoll() -> (pitch: Double, roll: Double)? {
        guard let motion = manager.deviceMotion,
              let attitude = motion.attitude.copy() as? CMAttitude
        else { return nil }
        if let reference {
            attitude.multiply(byInverseOf: reference)
        }
        return (attitude.pitch, attitude.roll)
    }

    func stop() {
        if manager.isDeviceMotionActive {
            manager.stopDeviceMotionUpdates()
        }
        reference = nil
    }
}
#else
final class PlinkTiltMotionSource {
    var isAvailable: Bool { false }
    func start() {}
    func captureBaseline() {}
    func relativePitchRoll() -> (pitch: Double, roll: Double)? { nil }
    func stop() {}
}
#endif
