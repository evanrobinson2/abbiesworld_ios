import Foundation
import simd

/// A fixed-cost, deterministic breeze. All positions are meters in the exported Y-up room.
/// No physics bodies, collision queries, spawning or simulation history are needed.
enum RooftopMotion {
    static let maximumPetals = 32
    static let maximumYaw: Float = 0.44
    static let maximumPitch: Float = 0.26
    static let minimumZoom: Float = 0.85
    static let maximumZoom: Float = 1.6

    struct PetalPose {
        var position: SIMD3<Float>
        var rotation: simd_quatf
        var scale: Float
    }

    static func petal(_ index: Int, time: Double, breeze: Float) -> PetalPose {
        let seed = Float(index)
        let a = fraction(sin(seed * 127.1 + 7) * 43758.5453)
        let b = fraction(sin(seed * 311.7 + 9) * 19341.1337)
        let period: Double = 10 + Double(a) * 7
        let phase = Float((time / period + Double(b)).truncatingRemainder(dividingBy: 1))
        let t = phase * .pi * 2
        // Starts beyond the open right edge. It only drifts inward after falling below the eave.
        // Fade-sized endpoints recycle invisibly; the fixed pool never accumulates on the deck.
        let entryX: Float = 3.7 + a * 2.5
        let x = entryX - phase * (2.4 + breeze * 2.4) + sin(t * 2 + seed) * 0.16
        let y = 3.4 * (1 - phase) + 0.13
        let z = -1.7 + b * 3.8 + phase * 2.0 + sin(t + seed) * 0.22
        let envelope = min(1, min(phase / 0.07, (1 - phase) / 0.10))
        return PetalPose(
            position: [x, y, z],
            rotation: simd_quatf(angle: t * 2 + seed, axis: simd_normalize(SIMD3<Float>(0.4, 1, 0.25))) *
                simd_quatf(angle: sin(t * 3 + seed) * 0.65, axis: [1, 0, 0]),
            scale: max(0.001, envelope) * (0.7 + a * 0.6)
        )
    }

    static func sway(index: Int, time: Double, breeze: Float, lantern: Bool) -> simd_quatf {
        let t = Float(time.truncatingRemainder(dividingBy: 120 * .pi))
        let phase = Float(index) * 1.73
        let amount: Float = lantern ? 0.010 : 0.009
        let angle = (sin(t * 0.72 + phase) + 0.28 * sin(t * 1.31 + phase)) * amount * breeze
        return simd_quatf(angle: angle, axis: lantern ? [0, 0, 1] : [1, 0, 0])
    }

    static func cameraInput(yaw: Float, pitch: Float, zoom: Float) -> SIMD3<Float> {
        [clamp(yaw, -maximumYaw, maximumYaw), clamp(pitch, -maximumPitch, maximumPitch),
         clamp(zoom, minimumZoom, maximumZoom)]
    }

    static func smoothing(delta: Double) -> Float { Float(1 - exp(-min(max(delta, 0), 0.1) * 7)) }
    static func clamp(_ x: Float, _ lo: Float, _ hi: Float) -> Float { min(hi, max(lo, x)) }
    private static func fraction(_ x: Float) -> Float { x - floor(x) }
}
