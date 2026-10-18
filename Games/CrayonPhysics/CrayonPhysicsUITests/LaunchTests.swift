import XCTest

final class LaunchTests: XCTestCase {
    @MainActor
    func testStandaloneAndEveryPuzzleCanOpen() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.buttons["Play"].waitForExistence(timeout: 15))
        capture("Title")
        app.buttons["Levels"].tap()
        for number in 1...7 {
            let puzzle = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Puzzle \(number)")).firstMatch
            XCTAssertTrue(puzzle.waitForExistence(timeout: 5))
            puzzle.tap()
            XCTAssertTrue(app.buttons["Menu"].waitForExistence(timeout: 10))
            XCTAssertTrue(app.staticTexts["Puzzle \(number) of 7"].exists)
            XCTAssertFalse(app.staticTexts["Couldnâ€™t open this level"].exists)
            capture("Puzzle-\(number)")
            app.buttons["Reset"].tap()
            app.buttons["Menu"].tap()
            XCTAssertTrue(app.buttons["Resume"].waitForExistence(timeout: 5))
            app.buttons["Levels"].tap()
        }
        app.buttons["Back"].tap()
        app.buttons["Close Game"].tap()
        XCTAssertTrue(app.buttons["Play"].waitForExistence(timeout: 5))
        app.buttons["Play"].tap()
        XCTAssertTrue(app.buttons["Levels"].waitForExistence(timeout: 5))
    }
    @MainActor
    func testLandscapeAndLargeTextControls() {
        continueAfterFailure = false
        let app = XCUIApplication()
        XCUIDevice.shared.orientation = .landscapeLeft
        defer { XCUIDevice.shared.orientation = .portrait }
        app.launch()
        XCTAssertTrue(app.buttons["Play"].waitForExistence(timeout: 15))
        app.buttons["Play"].tap()
        XCTAssertTrue(app.buttons["Menu"].waitForExistence(timeout: 10))
        capture("Landscape-puzzle")
        app.buttons["Menu"].tap()
        capture("Landscape-menu")
        XCTAssertTrue(app.buttons["Resume"].isHittable)
        app.terminate()
        XCUIDevice.shared.orientation = .portrait
        app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
        app.launch()
        XCTAssertTrue(app.buttons["Play"].waitForExistence(timeout: 15))
        capture("Large-text-title")
        app.buttons["Play"].tap()
        XCTAssertTrue(app.buttons["Menu"].waitForExistence(timeout: 10))
        capture("Large-text-puzzle")
        app.buttons["Menu"].tap()
        capture("Large-text-menu")
        XCTAssertTrue(app.buttons["Resume"].isHittable)
    }
    @MainActor private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
