//
//  MoonGuidanceModels.swift
//  abbies.world.ios
//
//  Kid-friendly Lunar Lander approach for Moon Base MVP.
//  Failure philosophy: zero punishment — bounce, retry, or Land for me.
//

import CoreGraphics
import Foundation

enum MoonGuidancePhase: Equatable, Sendable {
    case ready
    case flying
    case bounced(message: String)
    case landed
}

struct MoonGuidanceState: Equatable, Sendable {
    /// Normalized playfield: x 0...1, y 0...1 (0 = top, 1 = bottom).
    var rocketX: CGFloat = 0.5
    var rocketY: CGFloat = 0.12
    var velocityX: CGFloat = 0
    var velocityY: CGFloat = 0.04
    var phase: MoonGuidancePhase = .ready
    var attemptCount: Int = 0
    /// After this many misses, offer Land for me.
    static let bypassAfterAttempts = 3

    var showsLandForMe: Bool {
        attemptCount >= Self.bypassAfterAttempts && phase != .landed
    }

    /// Large forgiving pad in the lower center.
    static let padCenterX: CGFloat = 0.5
    static let padHalfWidth: CGFloat = 0.22
    static let padTopY: CGFloat = 0.78
    static let padBottomY: CGFloat = 0.92

    static let gravity: CGFloat = 0.0018
    static let thrustSide: CGFloat = 0.0024
    static let thrustBrake: CGFloat = 0.0032
    static let maxFallSpeed: CGFloat = 0.055
    static let softTouchSpeed: CGFloat = 0.045
}

enum MoonGuidanceCoach {
    static let ready = "Mission Control: nudge left or right, tap soft land near the pad."
    static let flying = "You're flying — easy does it."
    static let almost = "Almost! Try again — no hurry."
    static let soft = "Nice and soft… you've got this."
    static let landed = "Touchdown! Moon Base unlocked."
    static let bypass = "Land for me — Mission Control will finish the approach."
}
