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
        inspectMusicPicker(app, name: "Landscape")
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
        inspectMusicPicker(app, name: "Large-text-portrait")
        XCUIDevice.shared.orientation = .landscapeLeft
        inspectMusicPicker(app, name: "Large-text-landscape")
    }
    @MainActor
    func testMusicStylesAndPersistence() {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launch()
        XCTAssertTrue(app.buttons["Play"].waitForExistence(timeout: 15))
        app.buttons["Play"].tap()
        XCTAssertTrue(app.buttons["Menu"].waitForExistence(timeout: 10))
        app.buttons["Menu"].tap()
        let picker = app.buttons["music-style-picker"]
        XCTAssertTrue(picker.waitForExistence(timeout: 5))
        for style in ["Normal", "Tense", "French House", "Pop"] {
            picker.tap()
            let choice = app.buttons[style]
            XCTAssertTrue(choice.waitForExistence(timeout: 5), app.debugDescription)
            choice.tap()
            XCTAssertTrue(picker.waitForExistence(timeout: 5))
            XCTAssertTrue(picker.label.contains(style) || String(describing: picker.value).contains(style), picker.debugDescription)
        }
        capture("Music-style-Pop")
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Play"].waitForExistence(timeout: 15))
        app.buttons["Play"].tap()
        XCTAssertTrue(app.buttons["Menu"].waitForExistence(timeout: 10))
        app.buttons["Menu"].tap()
        XCTAssertTrue(picker.waitForExistence(timeout: 5))
        XCTAssertTrue(picker.label.contains("Pop") || String(describing: picker.value).contains("Pop"), picker.debugDescription)
        capture("Music-style-restored")
    }

    @MainActor private func inspectMusicPicker(_ app: XCUIApplication, name: String) {
        let picker = app.buttons["music-style-picker"]
        if !picker.isHittable { app.swipeUp() }
        XCTAssertTrue(picker.isHittable)
        picker.tap()
        XCTAssertTrue(app.buttons["French House"].waitForExistence(timeout: 5))
        capture("\(name)-music-options")
        app.buttons["French House"].tap()
        capture("\(name)-French-House")
        let exit = app.buttons["Close Game"]
        if !exit.isHittable { app.swipeUp() }
        XCTAssertTrue(exit.isHittable, app.debugDescription)
    }

    @MainActor private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
