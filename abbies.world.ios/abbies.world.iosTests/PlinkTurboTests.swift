import XCTest
@testable import abbies_world_ios

final class PlinkTurboTests: XCTestCase {
    func testArmRequiresFullChargeAndPull() {
        XCTAssertFalse(PlinkTurboRules.canArm(charge: 1, pull: 0.2))
        XCTAssertFalse(PlinkTurboRules.canArm(charge: 0.5, pull: 0.9))
        XCTAssertTrue(PlinkTurboRules.canArm(charge: 1, pull: PlinkTurboRules.pullThreshold))
        XCTAssertTrue(PlinkTurboRules.canArm(charge: 1, pull: 1))
    }

    func testUseSpendsFullBar() {
        XCTAssertEqual(PlinkTurboRules.afterUse(charge: 1), 0, accuracy: 0.001)
        XCTAssertEqual(PlinkTurboRules.afterUse(charge: 0.25), 0, accuracy: 0.001)
    }

    func testKillRegenQuarterSteps() {
        var charge: CGFloat = 0
        charge = PlinkTurboRules.afterKills(charge: charge, kills: 1)
        XCTAssertEqual(charge, 0.25, accuracy: 0.001)
        charge = PlinkTurboRules.afterKills(charge: charge, kills: 1)
        XCTAssertEqual(charge, 0.5, accuracy: 0.001)
        charge = PlinkTurboRules.afterKills(charge: charge, kills: 2)
        XCTAssertEqual(charge, 1.0, accuracy: 0.001)
        charge = PlinkTurboRules.afterKills(charge: charge, kills: 3)
        XCTAssertEqual(charge, 1.0, accuracy: 0.001)
    }

    func testEchoContactBudget() {
        XCTAssertEqual(PlinkTurboRules.echoContacts, 1)
    }
}
