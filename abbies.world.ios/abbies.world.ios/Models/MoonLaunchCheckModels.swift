//
//  MoonLaunchCheckModels.swift
//  abbies.world.ios
//
//  Cockpit launch-check memory game (Houston demo → player copy → grow to 7).
//

import Foundation

enum MoonLaunchCommand: String, CaseIterable, Equatable, Sendable, Identifiable {
    case thruster
    case antenna
    case hatch
    case radio
    case lights

    var id: String { rawValue }

    var label: String {
        switch self {
        case .thruster: return "Thruster"
        case .antenna: return "Antenna"
        case .hatch: return "Hatch"
        case .radio: return "Radio"
        case .lights: return "Lights"
        }
    }

    var symbolName: String {
        switch self {
        case .thruster: return "flame.fill"
        case .antenna: return "antenna.radiowaves.left.and.right"
        case .hatch: return "door.left.hand.open"
        case .radio: return "waveform"
        case .lights: return "lightbulb.fill"
        }
    }
}

enum MoonLaunchCheckPhase: Equatable, Sendable {
    case ready
    case demonstrating
    case input
    case retryOverlay
    case complete
}

struct MoonLaunchCheckConfig: Equatable, Sendable {
    var startLength: Int = 2
    var targetLength: Int = 7
    /// Spoken cue only for the first N consecutive misses.
    var spokenRetryMaxConsecutive: Int = 2
    var retryOverlayText: String = "Launch check: Retry"
    var successText: String = "All systems ready"
}

struct MoonLaunchCheckState: Equatable, Sendable {
    var phase: MoonLaunchCheckPhase = .ready
    var config: MoonLaunchCheckConfig = .init()
    /// Growing Houston sequence (length = current round goal).
    var sequence: [MoonLaunchCommand] = []
    var houstonHighlightIndex: Int? = nil
    /// Demo scrubber position 0...sequence.count (end = after last).
    var scrubIndex: Int = 0
    var playerInput: [MoonLaunchCommand] = []
    var consecutiveMisses: Int = 0
    var demoSpeed: MoonLaunchDemoSpeed = .slow
    var showsRetryOverlay: Bool = false
    var coach: String = MoonLaunchCheckCoach.ready

    var roundLength: Int { max(sequence.count, config.startLength) }

    var shouldSpeakRetry: Bool {
        consecutiveMisses > 0 && consecutiveMisses <= config.spokenRetryMaxConsecutive
    }
}

enum MoonLaunchDemoSpeed: String, Equatable, Sendable {
    case slow
    case fast

    var stepNanoseconds: UInt64 {
        switch self {
        case .slow: return 700_000_000
        case .fast: return 280_000_000
        }
    }
}

enum MoonLaunchCheckCoach {
    static let ready = "Houston will show the sequence. Watch, then copy."
    static let demo = "Houston is demonstrating…"
    static let yourTurn = "Your turn — match Houston's row."
    static let retryQuiet = "Try again — Houston will show it once more."
    static let retrySpoken = "Almost — watch Houston again."
    static let complete = "All systems ready."
}

/// Pure helpers — unit-testable without SwiftUI.
enum MoonLaunchCheckLogic {
    static func makeInitialSequence(length: Int, rng: inout some RandomNumberGenerator) -> [MoonLaunchCommand] {
        let pool = MoonLaunchCommand.allCases
        guard length > 0 else { return [] }
        return (0..<length).map { _ in pool.randomElement(using: &rng)! }
    }

    static func appendNextCommand(
        to sequence: [MoonLaunchCommand],
        rng: inout some RandomNumberGenerator
    ) -> [MoonLaunchCommand] {
        var next = sequence
        next.append(MoonLaunchCommand.allCases.randomElement(using: &rng)!)
        return next
    }

    /// Returns `.match`, `.partial`, or `.miss`.
    static func evaluateInput(
        sequence: [MoonLaunchCommand],
        player: [MoonLaunchCommand]
    ) -> InputVerdict {
        guard !player.isEmpty else { return .partial }
        for (idx, cmd) in player.enumerated() {
            guard idx < sequence.count else { return .miss }
            if sequence[idx] != cmd { return .miss }
        }
        if player.count == sequence.count { return .match }
        return .partial
    }

    enum InputVerdict: Equatable {
        case partial
        case match
        case miss
    }

    /// Scrubbing must never mutate player input — only demo highlight.
    static func scrubHighlight(sequenceCount: Int, scrubIndex: Int) -> Int? {
        guard sequenceCount > 0 else { return nil }
        let clamped = min(max(scrubIndex, 0), sequenceCount)
        if clamped >= sequenceCount { return nil }
        return clamped
    }
}
