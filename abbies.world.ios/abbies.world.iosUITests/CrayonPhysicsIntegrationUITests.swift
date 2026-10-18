import XCTest

final class CrayonPhysicsIntegrationUITests: XCTestCase {
    @MainActor
    func testCrayonBoxReturnsToSameRoom() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-world2SkipIntro", "-launchWorld2AbbieTreehouse", "-world2SkipAuth"]
        app.launch()
        let proceed = app.buttons["world2.loading.continue"]
        XCTAssertTrue(proceed.waitForExistence(timeout: 30))
        proceed.tap()
        let box = app.buttons["world2.crayonPhysics.box"]
        XCTAssertTrue(box.waitForExistence(timeout: 20), app.debugDescription)
        capture("Abbie-room-crayon-box")
        box.tap()
        XCTAssertTrue(app.buttons["Play"].waitForExistence(timeout: 15))
        app.buttons["Play"].tap()
        XCTAssertTrue(app.buttons["Menu"].waitForExistence(timeout: 10))
        capture("Integrated-puzzle")
        app.buttons["Menu"].tap()
        app.buttons["Back to Playroom"].tap()
        XCTAssertTrue(box.waitForExistence(timeout: 10))
        XCTAssertTrue(box.isHittable)
        capture("Returned-to-Abbie-room")
        box.tap()
        XCTAssertTrue(app.buttons["Play"].waitForExistence(timeout: 10))
    }
    @MainActor private func capture(_ name: String) {
        let shot = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }
}
