import XCTest
@testable import abbies_world_ios

final class MoonLaunchCheckTests: XCTestCase {
    func testRouteResolves() {
        XCTAssertEqual(World2POIRoute.resolved(from: "moonLaunchCheck"), .moonLaunchCheck)
        XCTAssertEqual(World2POIRoute.moonLaunchCheck.minigameConfigurationID, "moon_launch_check")
    }

    func testEvaluateInputMatchMissPartial() {
        let seq: [MoonLaunchCommand] = [.thruster, .radio, .lights]
        XCTAssertEqual(
            MoonLaunchCheckLogic.evaluateInput(sequence: seq, player: [.thruster]),
            .partial
        )
        XCTAssertEqual(
            MoonLaunchCheckLogic.evaluateInput(sequence: seq, player: [.thruster, .radio, .lights]),
            .match
        )
        XCTAssertEqual(
            MoonLaunchCheckLogic.evaluateInput(sequence: seq, player: [.thruster, .hatch]),
            .miss
        )
    }

    func testScrubNeverNeedsPlayerMutation() {
        // Highlight helpers are demo-only; scrub index clamps without touching a player array.
        XCTAssertEqual(MoonLaunchCheckLogic.scrubHighlight(sequenceCount: 3, scrubIndex: 1), 1)
        XCTAssertNil(MoonLaunchCheckLogic.scrubHighlight(sequenceCount: 3, scrubIndex: 3))
        XCTAssertNil(MoonLaunchCheckLogic.scrubHighlight(sequenceCount: 0, scrubIndex: 0))
    }

    func testSpokenRetryWindow() {
        var state = MoonLaunchCheckState()
        state.consecutiveMisses = 1
        XCTAssertTrue(state.shouldSpeakRetry)
        state.consecutiveMisses = 2
        XCTAssertTrue(state.shouldSpeakRetry)
        state.consecutiveMisses = 3
        XCTAssertFalse(state.shouldSpeakRetry)
    }

    func testGrowSequencePreservesPrefix() {
        var rng = SplitMix64(seed: 42)
        let start = MoonLaunchCheckLogic.makeInitialSequence(length: 2, rng: &rng)
        let grown = MoonLaunchCheckLogic.appendNextCommand(to: start, rng: &rng)
        XCTAssertEqual(grown.count, 3)
        XCTAssertEqual(Array(grown.prefix(2)), start)
    }
}

/// Tiny deterministic RNG for tests.
private struct SplitMix64: RandomNumberGenerator {
    private var state: UInt64
    init(seed: UInt64) { state = seed }
    mutating func next() -> UInt64 {
        state &+= 0x9E3779B97F4A7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58476D1CE4E5B9
        z = (z ^ (z >> 27)) &* 0x94D049BB133111EB
        return z ^ (z >> 31)
    }
}
