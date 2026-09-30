import XCTest

final class FairMarblePuzzleUITests: XCTestCase {
    private func launch() -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments = ["-launchFairMarbles"]
        app.launch()
        XCTAssertTrue(app.buttons["fair.tile.0"].waitForExistence(timeout: 20))
        return app
    }

    func testHelpAndGiveUpRetry() {
        let app = launch()
        app.buttons["fair.help"].tap()
        XCTAssertFalse(app.buttons["fair.help"].isEnabled)
        app.buttons["fair.giveUp"].tap()
        app.buttons["Give up this attempt"].tap()
        XCTAssertTrue(app.buttons["fair.retry"].waitForExistence(timeout: 5))
        app.buttons["fair.retry"].tap()
        XCTAssertTrue(app.buttons["fair.help"].isEnabled)
        XCTAssertEqual(app.staticTexts["fair.score"].label, "0 / 10 together")
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "Friendly fair marble board"
        shot.lifetime = .keepAlways
        add(shot)
    }

    func testPlayerAndBuddyReachWinOrHonestDeadBoard() {
        let app = launch()
        playToResult(app)
    }

    private func playToResult(_ app: XCUIApplication) {
        for _ in 0..<6 {
            if app.buttons["fair.enter"].exists || app.buttons["fair.retry"].exists { break }
            let ready = NSPredicate { _, _ in app.buttons["fair.tile.0"].isEnabled }
            XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: ready, object: nil)], timeout: 25), .completed)
            let labels = (0..<36).map { app.buttons["fair.tile.\($0)"].label.components(separatedBy: ", row")[0] }
            guard let move = validMove(labels) else { XCTFail("Interactive board has no move"); return }
            app.buttons["fair.tile.\(move.0)"].tap()
            app.buttons["fair.tile.\(move.1)"].tap()
            let before = app.staticTexts["fair.score"].label
            let progressed = NSPredicate { _, _ in
                app.buttons["fair.enter"].exists || app.buttons["fair.retry"].exists ||
                (app.buttons["fair.tile.0"].isEnabled && app.staticTexts["fair.score"].label != before)
            }
            XCTAssertEqual(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: progressed, object: nil)], timeout: 35), .completed)
        }
        XCTAssertTrue(app.buttons["fair.enter"].exists || app.buttons["fair.retry"].exists)
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "Fair puzzle result"
        shot.lifetime = .keepAlways
        add(shot)
    }

    func testPlayroomToyOpensPuzzle() {
        let app = XCUIApplication()
        app.launchArguments = ["-world2SkipIntro", "-launchWorld2AbbieTreehouse", "-world2SkipAuth"]
        app.launch()
        let proceed = app.buttons["world2.loading.continue"]
        if proceed.waitForExistence(timeout: 3) { proceed.tap() }
        let pack = app.buttons["world2.interior.starterPack.openInventory"]
        if pack.waitForExistence(timeout: 3) {
            pack.tap()
            app.buttons["world2.interior.decorator.done"].tap()
        }
        let playroom = app.buttons["world2.interior.room.playroom"]
        XCTAssertTrue(playroom.waitForExistence(timeout: 10))
        playroom.tap()
        let toy = app.buttons["fair.playroom.toy"]
        XCTAssertTrue(toy.waitForExistence(timeout: 5))
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "Toy fair in the playroom"
        shot.lifetime = .keepAlways
        add(shot)
        toy.tap()
        if !app.buttons["fair.booth.meadow"].waitForExistence(timeout: 2) {
            XCTAssertTrue(app.buttons["fair.tile.0"].waitForExistence(timeout: 10))
            for _ in 0..<3 {
                playToResult(app)
                if app.buttons["fair.enter"].exists { break }
                app.buttons["fair.retry"].tap()
            }
            XCTAssertTrue(app.buttons["fair.enter"].exists)
            app.buttons["fair.enter"].tap()
        }
        XCTAssertTrue(app.buttons["fair.booth.meadow"].waitForExistence(timeout: 5))
        let fairShot = XCTAttachment(screenshot: app.screenshot())
        fairShot.name = "Unlocked fair"
        fairShot.lifetime = .keepAlways
        add(fairShot)
        app.buttons["fair.returnPlayroom"].tap()
        XCTAssertTrue(toy.waitForExistence(timeout: 5))
        toy.tap()
        XCTAssertTrue(app.buttons["fair.booth.meadow"].waitForExistence(timeout: 5))
    }

    private func validMove(_ board: [String]) -> (Int, Int)? {
        for a in 0..<36 {
            for b in [a + 1, a + 6] where b < 36 && abs(a / 6 - b / 6) + abs(a % 6 - b % 6) == 1 {
                var copy = board
                copy.swapAt(a, b)
                for i in 0..<36 {
                    if i % 6 < 4 && copy[i] == copy[i+1] && copy[i] == copy[i+2] { return (a,b) }
                    if i < 24 && copy[i] == copy[i+6] && copy[i] == copy[i+12] { return (a,b) }
                }
            }
        }
        return nil
    }
}
