import XCTest
@testable import abbies_world_ios

final class PlinkTiltMathTests: XCTestCase {
    func testFlatRelativeAttitudePullsStraightDown() {
        let g = PlinkTiltMath.gravityVector(pitchRadians: 0, rollRadians: 0, magnitude: 100)
        XCTAssertEqual(g.dx, 0, accuracy: 0.01)
        XCTAssertEqual(g.dy, -100, accuracy: 0.01)
    }

    func testDeadzoneIgnoresTinyTips() {
        let tiny = 2.0 * .pi / 180
        let g = PlinkTiltMath.gravityVector(pitchRadians: tiny, rollRadians: tiny, magnitude: 100)
        XCTAssertEqual(g.dx, 0, accuracy: 0.01)
        XCTAssertEqual(g.dy, -100, accuracy: 0.01)
    }

    func testRollTipsGravitySideways() {
        let roll = 25.0 * .pi / 180
        let g = PlinkTiltMath.gravityVector(pitchRadians: 0, rollRadians: roll, magnitude: 100)
        XCTAssertGreaterThan(g.dx, 20)
        XCTAssertLessThan(g.dy, -50)
    }

    func testPowerUpTiltMetadata() {
        XCTAssertEqual(PlinkPowerUp.tilt.title, "Tilt")
        XCTAssertEqual(PlinkPowerUp.tilt.catalogIconName, "world2_plink_power_icon_tilt")
        XCTAssertEqual(PlinkPowerUp.tilt.chipAssetID, "ui.plink.power.icon.tilt")
    }
}
