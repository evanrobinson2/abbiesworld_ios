import XCTest
@testable import abbies_world_ios

final class PlinkGravityWaveTests: XCTestCase {
    func testRampEasesInAndCaps() {
        XCTAssertEqual(PlinkGravityWaveRules.extraGravity(rampElapsed: 0), 0, accuracy: 0.01)
        let mid = PlinkGravityWaveRules.extraGravity(rampElapsed: PlinkGravityWaveRules.rampSeconds * 0.5)
        XCTAssertGreaterThan(mid, 0)
        XCTAssertLessThan(mid, PlinkGravityWaveRules.maxExtraGravity)
        XCTAssertEqual(
            PlinkGravityWaveRules.extraGravity(rampElapsed: PlinkGravityWaveRules.rampSeconds),
            PlinkGravityWaveRules.maxExtraGravity,
            accuracy: 0.01
        )
        XCTAssertEqual(
            PlinkGravityWaveRules.extraGravity(rampElapsed: 12),
            PlinkGravityWaveRules.maxExtraGravity,
            accuracy: 0.01
        )
    }

    func testArmThenRampEndsRoundWindow() {
        XCTAssertEqual(PlinkGravityWaveRules.armAfterSeconds, 5, accuracy: 0.01)
        // Full pull by ~8.5s of flight — lingering shots should drain soon after.
        let fullPullAt = PlinkGravityWaveRules.armAfterSeconds + PlinkGravityWaveRules.rampSeconds
        XCTAssertEqual(fullPullAt, 8.5, accuracy: 0.01)
        XCTAssertGreaterThanOrEqual(PlinkGravityWaveRules.maxExtraGravity, 30)
        XCTAssertEqual(PlinkGravityWaveRules.maxShotSeconds, 14, accuracy: 0.01)
    }
}
