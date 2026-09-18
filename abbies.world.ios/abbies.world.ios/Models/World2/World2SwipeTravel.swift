//
//  World2SwipeTravel.swift
//  abbies.world.ios
//
//  Percent-driven map travel. Pure Foundation so the commit / snapback / empty
//  rubber-band rules can be unit tested without a simulator.
//
//  Finger toward EAST (positive x) pulls the east map in from the right. An
//  empty socket never commits: it stretches a little and springs back.
//

import Foundation

enum World2SwipeTravel {
    static let commitPercent = 0.38
    static let cancelPercent = 0.08
    static let emptyRubberBandLimit = 0.16
    /// How far the predicted end of the gesture has to jump, as a fraction of
    /// the view, before a flick counts as a sprint even below the commit line.
    static let sprintPredictedJump = 0.22
    /// Keep the drag off the iPadOS edge so we do not steal system gestures.
    static let edgeInset = 24.0
    static let minimumDirection = 12.0

    enum Resolution: Equatable, Sendable {
        case commit
        case cancel
    }

    static func isInsideSwipeInset(
        x: Double,
        y: Double,
        width: Double,
        height: Double,
        inset: Double = edgeInset
    ) -> Bool {
        x >= inset
            && x <= width - inset
            && y >= inset
            && y <= height - inset
    }

    /// Progress along the bound compass. Negative means the finger went the
    /// other way; callers clamp or rubber-band.
    static func percent(
        translationX: Double,
        translationY: Double,
        compass: World2Compass,
        width: Double,
        height: Double
    ) -> Double {
        let span = max(compass.isHorizontal ? width : height, 1)
        switch compass {
        case .east: return translationX / span
        case .west: return -translationX / span
        case .south: return translationY / span
        case .north: return -translationY / span
        }
    }

    static func rubberBand(
        _ raw: Double,
        limit: Double = emptyRubberBandLimit
    ) -> Double {
        if raw <= 0 { return 0 }
        let safeLimit = max(limit, 0.001)
        return safeLimit * (1 - 1 / (raw / safeLimit + 1))
    }

    static func resolve(
        percent: Double,
        predictedPercent: Double,
        hasDestination: Bool
    ) -> Resolution {
        guard hasDestination else { return .cancel }
        let sprint = predictedPercent - percent
        if percent >= commitPercent { return .commit }
        if sprint >= sprintPredictedJump, percent >= cancelPercent { return .commit }
        return .cancel
    }

    /// Current map slides off opposite the destination. Destination starts
    /// just off-screen along the compass and lands at zero.
    static func currentMapOffset(
        compass: World2Compass,
        percent: Double,
        width: Double,
        height: Double
    ) -> (x: Double, y: Double) {
        let vector = axisVector(compass: compass, width: width, height: height)
        return (-percent * vector.x, -percent * vector.y)
    }

    static func destinationMapOffset(
        compass: World2Compass,
        percent: Double,
        width: Double,
        height: Double
    ) -> (x: Double, y: Double) {
        let vector = axisVector(compass: compass, width: width, height: height)
        return ((1 - percent) * vector.x, (1 - percent) * vector.y)
    }

    private static func axisVector(
        compass: World2Compass,
        width: Double,
        height: Double
    ) -> (x: Double, y: Double) {
        switch compass {
        case .east: return (width, 0)
        case .west: return (-width, 0)
        case .south: return (0, height)
        case .north: return (0, -height)
        }
    }
}

private extension World2Compass {
    var isHorizontal: Bool {
        self == .east || self == .west
    }
}
