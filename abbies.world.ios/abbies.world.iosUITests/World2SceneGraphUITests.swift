//
//  World2SceneGraphUITests.swift
//  abbies.world.iosUITests
//
//  Proof, on a device, of the two things the scene graph claims: open hardpoints
//  are visible to players on the shipped maps, and the Three Bears' house pays
//  out into the player's inventory in a way a child cannot miss.
//

import XCTest

final class World2SceneGraphUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .landscapeLeft
        app = XCUIApplication()
        app.launchArguments = ["-world2SkipIntro"]
    }

    /// The pads the scene catalog leaves open should shimmer on the painted maps
    /// a player already knows, not only inside the editor.
    func testOpenHardpointsAreVisibleToPlayersOnShippedMaps() throws {
        app.launch()
        enterAsAbbie()

        assertExists("world2.hardpoint.hardpoint.home.creekPad", "Home creekside pad")
        assertExists("world2.hardpoint.hardpoint.home.hilltopPad", "Home hilltop pad")
        // Rigged places stand on their pads, so those pads stay quiet.
        assertMissing("world2.hardpoint.hardpoint.home.abbiePad", "Occupied pad")
        saveShot("hardpoints-home")

        travel("world.work")
        assertExists("world2.hardpoint.hardpoint.work.cornerLot", "Work Land corner lot")
        saveShot("hardpoints-work")

        travel("world.home")
        travel("world.farm")
        assertExists("world2.hardpoint.hardpoint.farm.orchardPad", "Farm orchard pad")
        assertExists("world2.hardpoint.hardpoint.farm.gatePad", "Farm gatepost pad")
        saveShot("hardpoints-farm")
    }

    /// Farm Land now has a path into the woods, and the cottage stands on the
    /// clearing the scene authored for it.
    func testThreeBearsSceneIsReachableAndRigged() throws {
        app.launch()
        enterAsAbbie()
        travel("world.farm")
        travel("world.threeBears")

        assertExists("world2.poi.poi.threeBearsHouse", "The bears' house")
        assertExists("world2.hardpoint.hardpoint.threeBears.berryPatch", "Berry patch pad")
        assertExists("world2.hardpoint.hardpoint.threeBears.woodshedPad", "Woodshed pad")
        saveShot("three-bears-map")

        tap("world2.poi.poi.threeBearsHouse")
        assertExists("world2.poi.rewardSummary", "Reward promise in the drawer")
        tap("world2.poi.enter")
        assertExists("world2.threeBears.house", "The tasting room")
        saveShot("three-bears-room")
    }

    /// The whole payout: win, celebrate, then find the thing in the drawer.
    func testJustRightAwardsPorridgeIntoPlayerInventory() throws {
        app.launchArguments = ["-world2SkipIntro", "-launchWorld2JustRight"]
        app.launch()
        continueFromIntro()

        assertExists("world2.threeBears.house", "The tasting room")

        // Three rounds, each won by the bowl that is neither too much nor too
        // little. The identifier carries the level so the test can be honest
        // about what it is tapping.
        for round in 1...3 {
            let bowl = app.descendants(matching: .any)["world2.threeBears.bowl.justRight"]
            XCTAssertTrue(
                bowl.waitForExistence(timeout: 8),
                "Round \(round) never offered a just-right bowl\n\(app.debugDescription.prefix(1200))"
            )
            if bowl.isHittable {
                bowl.tap()
            } else {
                bowl.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
            }
            assertExists("world2.threeBears.feedback", "Bear feedback for round \(round)")
        }

        let celebration = app.descendants(matching: .any)["world2.reward.celebration"]
        XCTAssertTrue(
            celebration.waitForExistence(timeout: 10),
            "Winning did not make a fuss\n\(app.debugDescription.prefix(1200))"
        )
        assertExists("world2.reward.itemName", "The reward's name")
        assertExists("world2.reward.inventoryNotice", "Where it went")
        assertExists("world2.reward.badges", "The ribbon row")
        // Chips are drawn as combined labels; query by the words a child sees.
        for ribbon in ["NEW!", "ONE OF A KIND", "STORY TREASURE"] {
            XCTAssertTrue(
                app.staticTexts[ribbon].waitForExistence(timeout: 4)
                    || celebration.staticTexts[ribbon].exists
                    || app.descendants(matching: .any)
                        .matching(NSPredicate(format: "label CONTAINS %@", ribbon))
                        .firstMatch
                        .exists,
                "Missing ribbon \(ribbon)\n\(app.debugDescription.prefix(2000))"
            )
        }
        saveShot("porridge-celebration")

        tap("world2.reward.showMe")

        assertExists("world2.interior.poi.abbieTreehouse", "Abbie's treehouse")
        assertExists("world2.interior.decorator.drawer", "The drawer, already open")
        let card = app.descendants(matching: .any).matching(
            NSPredicate(
                format: "identifier CONTAINS 'inventory.item.story_' AND identifier CONTAINS 'perfectPorridge'"
            )
        ).firstMatch
        XCTAssertTrue(
            card.waitForExistence(timeout: 6),
            "The porridge never reached the player's drawer\n\(app.debugDescription.prefix(1600))"
        )
        saveShot("porridge-in-drawer")

        // And it survives leaving: the reward is inventory, not a screen.
        tap("world2.interior.decorator.done")
        tap("world2.interior.arrangeFurniture")
        XCTAssertTrue(
            card.waitForExistence(timeout: 6),
            "The porridge did not persist in the drawer"
        )
    }

    // MARK: - Helpers

    private func assertExists(_ identifier: String, _ what: String) {
        XCTAssertTrue(
            app.descendants(matching: .any)[identifier].waitForExistence(timeout: 8),
            "\(what) is missing (\(identifier))\n\(app.debugDescription.prefix(1200))"
        )
    }

    private func assertMissing(_ identifier: String, _ what: String) {
        XCTAssertFalse(
            app.descendants(matching: .any)[identifier].exists,
            "\(what) should not be drawn for players (\(identifier))"
        )
    }

    private func continueFromIntro() {
        let continueButton = app.buttons["world2.loading.continue"]
        XCTAssertTrue(continueButton.waitForExistence(timeout: 10), "Intro never finished")
        continueButton.tap()
    }

    private func enterAsAbbie() {
        continueFromIntro()
        let player = app.buttons["Play as Abbie"]
        XCTAssertTrue(player.waitForExistence(timeout: 8), "Player select did not appear")
        player.tap()
        assertExists("world2.homeWorld", "Home world")
    }

    private func travel(_ worldID: String) {
        tap("world2.world.\(worldID)")
    }

    private func tap(_ identifier: String) {
        let element = app.descendants(matching: .any)[identifier]
        XCTAssertTrue(
            element.waitForExistence(timeout: 8),
            "Missing \(identifier)\n\(app.debugDescription.prefix(1600))"
        )
        if element.isHittable {
            element.tap()
        } else {
            element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        }
    }

    private func saveShot(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        try? shot.pngRepresentation.write(to: URL(fileURLWithPath: "/tmp/abbies-\(name).png"))
        let attachment = XCTAttachment(screenshot: shot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
