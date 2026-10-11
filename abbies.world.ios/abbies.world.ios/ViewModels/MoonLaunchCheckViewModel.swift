//
//  MoonLaunchCheckViewModel.swift
//  abbies.world.ios
//

import Combine
import Foundation
import SwiftUI

@MainActor
final class MoonLaunchCheckViewModel: ObservableObject {
    @Published private(set) var state = MoonLaunchCheckState()

    private var demoTask: Task<Void, Never>?
    private var rng = SystemRandomNumberGenerator()

    func startRound() {
        demoTask?.cancel()
        if state.sequence.isEmpty {
            state.sequence = MoonLaunchCheckLogic.makeInitialSequence(
                length: state.config.startLength,
                rng: &rng
            )
        }
        state.playerInput = []
        state.showsRetryOverlay = false
        state.scrubIndex = 0
        state.houstonHighlightIndex = nil
        runDemonstration()
    }

    func setDemoSpeed(_ speed: MoonLaunchDemoSpeed) {
        state.demoSpeed = speed
    }

    /// Demo-only scrubber. Never touches playerInput.
    func scrub(to index: Int) {
        guard state.phase == .demonstrating || state.phase == .input || state.phase == .retryOverlay else { return }
        let highlight = MoonLaunchCheckLogic.scrubHighlight(
            sequenceCount: state.sequence.count,
            scrubIndex: index
        )
        state.scrubIndex = min(max(index, 0), state.sequence.count)
        // Only move highlight while not mid auto-demo playhead (allowed help).
        if state.phase != .demonstrating || demoTask == nil {
            state.houstonHighlightIndex = highlight
        }
    }

    func tapCommand(_ command: MoonLaunchCommand) {
        guard state.phase == .input else { return }
        var player = state.playerInput
        player.append(command)
        state.playerInput = player

        switch MoonLaunchCheckLogic.evaluateInput(sequence: state.sequence, player: player) {
        case .partial:
            break
        case .match:
            handleMatch()
        case .miss:
            handleMiss()
        }
    }

    func dismissRetryAndReplay() {
        state.showsRetryOverlay = false
        state.playerInput = []
        runDemonstration()
    }

    private func handleMatch() {
        demoTask?.cancel()
        demoTask = nil
        state.consecutiveMisses = 0
        if state.sequence.count >= state.config.targetLength {
            state.phase = .complete
            state.coach = MoonLaunchCheckCoach.complete
            state.houstonHighlightIndex = nil
            return
        }
        state.sequence = MoonLaunchCheckLogic.appendNextCommand(to: state.sequence, rng: &rng)
        state.playerInput = []
        state.coach = "Nice! Houston adds one more…"
        runDemonstration()
    }

    private func handleMiss() {
        demoTask?.cancel()
        demoTask = nil
        state.consecutiveMisses += 1
        state.showsRetryOverlay = true
        state.phase = .retryOverlay
        state.coach = state.shouldSpeakRetry
            ? MoonLaunchCheckCoach.retrySpoken
            : MoonLaunchCheckCoach.retryQuiet
        // Keep completed sequence; clear only this attempt's player row.
        state.playerInput = []
    }

    private func runDemonstration() {
        demoTask?.cancel()
        state.phase = .demonstrating
        state.coach = MoonLaunchCheckCoach.demo
        state.houstonHighlightIndex = nil
        let sequence = state.sequence
        let speed = state.demoSpeed
        demoTask = Task { [weak self] in
            for (idx, _) in sequence.enumerated() {
                if Task.isCancelled { return }
                await MainActor.run {
                    self?.state.houstonHighlightIndex = idx
                    self?.state.scrubIndex = idx
                }
                try? await Task.sleep(nanoseconds: speed.stepNanoseconds)
            }
            if Task.isCancelled { return }
            await MainActor.run {
                guard let self else { return }
                self.state.houstonHighlightIndex = nil
                self.state.scrubIndex = sequence.count
                self.state.phase = .input
                self.state.coach = MoonLaunchCheckCoach.yourTurn
                self.demoTask = nil
            }
        }
    }
}
