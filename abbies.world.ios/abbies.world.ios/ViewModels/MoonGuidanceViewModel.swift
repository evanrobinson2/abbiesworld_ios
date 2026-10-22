//
//  MoonGuidanceViewModel.swift
//  abbies.world.ios
//

import Combine
import CoreGraphics
import Foundation
import SwiftUI

@MainActor
final class MoonGuidanceViewModel: ObservableObject {
    @Published private(set) var state = MoonGuidanceState()
    @Published private(set) var coach = MoonGuidanceCoach.ready
    @Published var holdingLeft = false
    @Published var holdingRight = false
    @Published var holdingBrake = false

    private var tickTask: Task<Void, Never>?

    func start() {
        resetApproach(clearAttempts: false)
        state.phase = .flying
        coach = MoonGuidanceCoach.flying
        startTicker()
    }

    func resetApproach(clearAttempts: Bool) {
        tickTask?.cancel()
        tickTask = nil
        let attempts = clearAttempts ? 0 : state.attemptCount
        state = MoonGuidanceState(attemptCount: attempts)
        coach = MoonGuidanceCoach.ready
    }

    func landForMe() {
        tickTask?.cancel()
        tickTask = nil
        state.rocketX = MoonGuidanceState.padCenterX
        state.rocketY = MoonGuidanceState.padTopY + 0.04
        state.velocityX = 0
        state.velocityY = 0
        state.phase = .landed
        coach = MoonGuidanceCoach.landed
    }

    /// Test / debug helper: mark enough misses that Land for me appears.
    func markAttemptsForBypassOffer() {
        state.attemptCount = MoonGuidanceState.bypassAfterAttempts
    }

    func dismissBounceAndRetry() {
        resetApproach(clearAttempts: false)
        start()
    }

    private func startTicker() {
        tickTask?.cancel()
        tickTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 16_000_000) // ~60fps
                await MainActor.run {
                    self?.tick()
                }
            }
        }
    }

    private func tick() {
        guard state.phase == .flying else { return }

        var next = state
        if holdingLeft { next.velocityX -= MoonGuidanceState.thrustSide }
        if holdingRight { next.velocityX += MoonGuidanceState.thrustSide }
        if holdingBrake {
            next.velocityY -= MoonGuidanceState.thrustBrake
            coach = MoonGuidanceCoach.soft
        } else {
            next.velocityY += MoonGuidanceState.gravity
        }

        next.velocityX *= 0.992
        next.velocityY = min(max(next.velocityY, -0.03), MoonGuidanceState.maxFallSpeed)
        next.rocketX = min(max(next.rocketX + next.velocityX, 0.06), 0.94)
        next.rocketY = min(max(next.rocketY + next.velocityY, 0.04), 0.96)

        // Side walls: soft bounce.
        if next.rocketX <= 0.06 || next.rocketX >= 0.94 {
            next.velocityX *= -0.4
        }

        let overPad =
            abs(next.rocketX - MoonGuidanceState.padCenterX) <= MoonGuidanceState.padHalfWidth
            && next.rocketY >= MoonGuidanceState.padTopY
            && next.rocketY <= MoonGuidanceState.padBottomY

        if overPad {
            let softEnough = abs(next.velocityX) < 0.02 && next.velocityY < MoonGuidanceState.softTouchSpeed
            if softEnough {
                next.phase = .landed
                next.velocityX = 0
                next.velocityY = 0
                coach = MoonGuidanceCoach.landed
                tickTask?.cancel()
                tickTask = nil
                state = next
                return
            }
            // Too fast on pad — gentle bounce, count attempt.
            bounce(message: MoonGuidanceCoach.almost)
            return
        }

        if next.rocketY >= 0.94 {
            bounce(message: MoonGuidanceCoach.almost)
            return
        }

        state = next
    }

    private func bounce(message: String) {
        tickTask?.cancel()
        tickTask = nil
        state.attemptCount += 1
        state.phase = .bounced(message: message)
        state.velocityX = 0
        state.velocityY = 0
        coach = message
    }
}
