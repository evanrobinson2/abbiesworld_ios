//
//  MoonGuidanceUITests.swift
//  abbies.world.iosUITests
//

import XCTest

final class MoonGuidanceUITests: XCTestCase {
    private func launch() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-launchMoonGuidance"]
        app.launch()
        return app
    }

    func testMoonGuidanceStartAndLeaveExist() {
        let app = launch()
        let root = app.descendants(matching: .any)["world2.moonGuidance"]
        XCTAssertTrue(root.waitForExistence(timeout: 8))
        XCTAssertTrue(app.buttons["world2.moonGuidance.start"].waitForExistence(timeout: 4))
        XCTAssertTrue(app.buttons["world2.moonGuidance.leave"].exists)
    }
}
