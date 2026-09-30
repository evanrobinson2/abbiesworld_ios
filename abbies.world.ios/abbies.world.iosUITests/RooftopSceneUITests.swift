import XCTest

final class RooftopSceneUITests: XCTestCase {
    func testNativeSceneLoadsAndCameraAndBreezeControlsWork() {
        let app = XCUIApplication()
        app.launchArguments = ["-launchRooftop3D", "-rooftopDiagnostics"]
        XCUIDevice.shared.orientation = .landscapeLeft
        app.launch()
        let wind = app.buttons["rooftop3d.breeze"]
        XCTAssertTrue(wind.waitForExistence(timeout: 90))
        capture(app, "Rooftop 3D native resting camera")
        let from = app.coordinate(withNormalizedOffset: CGVector(dx: 0.45, dy: 0.5))
        let to = app.coordinate(withNormalizedOffset: CGVector(dx: 0.72, dy: 0.6))
        let before = app.staticTexts["rooftop3d.camera"].label
        from.press(forDuration: 0.1, thenDragTo: to)
        XCTAssertNotEqual(app.staticTexts["rooftop3d.camera"].label, before, "Pan must actually change the camera")
        capture(app, "Rooftop 3D small camera turn")
        app.buttons["rooftop3d.center"].tap()
        XCTAssertTrue(app.staticTexts["rooftop3d.camera"].label.contains("Zoom 1.000"))
        wind.tap()
        XCTAssertTrue(wind.label.contains("Still air"))
        wind.tap()
        XCTAssertTrue(wind.label.contains("Breeze"))
        app.buttons["rooftop3d.tilt"].tap()
        XCTAssertTrue(app.buttons["rooftop3d.tilt"].label.contains("off"))
        // Leaving the foreground must not trigger a large catch-up movement on return.
        XCUIDevice.shared.press(.home)
        app.activate()
        XCTAssertTrue(wind.waitForExistence(timeout: 10))
        capture(app, "Rooftop 3D resumed")
    }

    func testLightingStudyComparisonAndCameraReset() {
        let app = XCUIApplication()
        app.launchArguments = ["-launchRooftop3D", "-rooftopDiagnostics", "-rooftopLightingProof"]
        XCUIDevice.shared.orientation = .landscapeLeft
        app.launch()
        let shadows = app.buttons["rooftop3d.shadows"]
        XCTAssertTrue(shadows.waitForExistence(timeout: 90))
        // Disable automatic movement for a repeatable shadow comparison.
        app.buttons["rooftop3d.breeze"].tap()
        app.buttons["rooftop3d.tilt"].tap()
        Thread.sleep(forTimeInterval: 1) // Allow the changed material/shadow pipeline to present a frame.
        capture(app, "Lighting study shadows on")
        shadows.tap()
        XCTAssertTrue(shadows.label.contains("off"))
        Thread.sleep(forTimeInterval: 1)
        capture(app, "Lighting study shadows off")
        shadows.tap()
        let from = app.coordinate(withNormalizedOffset: CGVector(dx: 0.4, dy: 0.45))
        from.press(forDuration: 0.1, thenDragTo: app.coordinate(withNormalizedOffset: CGVector(dx: 0.8, dy: 0.65)))
        XCTAssertNotEqual(app.staticTexts["rooftop3d.camera"].label, "Look 0.000 / 0.000 · Zoom 1.000")
        capture(app, "Lighting study large camera turn")
        app.buttons["rooftop3d.center"].tap()
        XCTAssertEqual(app.staticTexts["rooftop3d.camera"].label, "Look 0.000 / 0.000 · Zoom 1.000")
        app.buttons["rooftop3d.study"].tap()
        XCTAssertTrue(app.buttons["rooftop3d.breeze"].waitForExistence(timeout: 60))
        XCTAssertFalse(shadows.exists)
        capture(app, "Original prototype comparison")
    }

    func testTreehouseEntryAndReturn() {
        let app = XCUIApplication()
        app.launchArguments = ["-world2SkipIntro", "-launchWorld2AbbieTreehouse", "-world2SkipAuth"]
        XCUIDevice.shared.orientation = .landscapeLeft
        app.launch()
        let proceed = app.buttons["world2.loading.continue"]
        if proceed.waitForExistence(timeout: 3) { proceed.tap() }
        let pack = app.buttons["world2.interior.starterPack.openInventory"]
        if pack.waitForExistence(timeout: 3) {
            pack.tap()
            app.buttons["world2.interior.decorator.done"].tap()
        }
        let room = app.buttons["world2.interior.room.rooftopLookout"]
        XCTAssertTrue(room.waitForExistence(timeout: 15)); room.tap()
        let enter = app.buttons["rooftop3d.enter"]
        XCTAssertTrue(enter.waitForExistence(timeout: 10)); enter.tap()
        XCTAssertTrue(app.buttons["rooftop3d.breeze"].waitForExistence(timeout: 60))
        app.buttons["rooftop3d.close"].tap()
        XCTAssertTrue(enter.waitForExistence(timeout: 10))
    }

    private func capture(_ app: XCUIApplication, _ name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name; shot.lifetime = .keepAlways
        add(shot)
    }
}
