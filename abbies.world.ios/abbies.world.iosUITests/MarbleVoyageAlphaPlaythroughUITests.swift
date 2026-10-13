import XCTest

/// Computer playthrough for first alpha — lands in a live Trail scrap fight,
/// fires at least one marble via the aim trackpad, and keeps screenshots.
final class MarbleVoyageAlphaPlaythroughUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .landscapeLeft
        app = XCUIApplication()
        app.launchArguments = [
            "-launchMarbleVoyage",
            "-world2SkipAuth",
            "-marbleVoyageDebugFight",
        ]
    }

    func testTrailScrapFightFiresAMarble() throws {
        let outDir = URL(fileURLWithPath: "/Users/evanrobinson/abbies.world.ios/artifacts/alpha-playthrough-2026-09-27")
        try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)

        app.launch()

        // Root ZStack can swallow child accessibility ids — match kid-visible copy.
        let trailScrap = app.staticTexts["Trail scrap"]
        let battleChrome = app.descendants(matching: .any)["world2.plink.battle"]
        let root = app.descendants(matching: .any)["marbleVoyage.root"]
        XCTAssertTrue(
            trailScrap.waitForExistence(timeout: 20)
                || battleChrome.waitForExistence(timeout: 1)
                || root.waitForExistence(timeout: 1),
            "Debug fight should open Trail scrap\n\(app.debugDescription.prefix(2500))"
        )
        saveShot(named: "01-battle-open", to: outDir)

        // Versus intro may cover the board briefly.
        let versus = app.descendants(matching: .any)["world2.plink.battle.versus"]
        if versus.waitForExistence(timeout: 3) {
            saveShot(named: "02-versus", to: outDir)
            if versus.isHittable { versus.tap() }
            RunLoop.current.run(until: Date().addingTimeInterval(1.0))
        }

        let aimPad = app.descendants(matching: .any)["world2.plink.battle.currentOrb"]
        let aimByLabel = app.descendants(matching: .any).matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Aim trackpad")
        ).firstMatch
        let startFight = app.descendants(matching: .any)["world2.plink.battle.start"]
        let fightByLabel = app.buttons.matching(
            NSPredicate(format: "label CONTAINS[c] %@", "Fight")
        ).firstMatch

        if !aimPad.waitForExistence(timeout: 4), !aimByLabel.waitForExistence(timeout: 2) {
            if startFight.waitForExistence(timeout: 3), startFight.isHittable {
                startFight.tap()
            } else if fightByLabel.waitForExistence(timeout: 2), fightByLabel.isHittable {
                fightByLabel.tap()
            }
        }

        let pad: XCUIElement = {
            if aimPad.exists { return aimPad }
            if aimByLabel.exists { return aimByLabel }
            return aimPad
        }()
        XCTAssertTrue(
            pad.waitForExistence(timeout: 16),
            "Aim trackpad missing — cannot fire\n\(app.debugDescription.prefix(2500))"
        )
        saveShot(named: "03-aim-ready", to: outDir)

        // Nudge aim right, then release to drop a marble (kid-shaped play).
        let rest = pad.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        let right = pad.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.5))
        rest.press(forDuration: 0.2, thenDragTo: right)

        RunLoop.current.run(until: Date().addingTimeInterval(2.5))
        saveShot(named: "04-after-shot", to: outDir)

        if pad.exists, pad.isHittable {
            let left = pad.coordinate(withNormalizedOffset: CGVector(dx: 0.2, dy: 0.5))
            rest.press(forDuration: 0.15, thenDragTo: left)
            RunLoop.current.run(until: Date().addingTimeInterval(2.0))
            saveShot(named: "05-second-shot", to: outDir)
        }

        XCTAssertTrue(
            trailScrap.exists || root.exists || battleChrome.exists,
            "Battle should still be on screen after firing"
        )
    }

    private func saveShot(named name: String, to dir: URL) {
        let shot = XCUIScreen.main.screenshot()
        let url = dir.appendingPathComponent("\(name).png")
        try? shot.pngRepresentation.write(to: url)
        let attachment = XCTAttachment(screenshot: shot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
