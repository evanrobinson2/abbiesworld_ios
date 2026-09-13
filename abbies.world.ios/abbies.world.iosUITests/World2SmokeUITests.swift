import XCTest

final class World2SmokeUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .landscapeLeft
        app = XCUIApplication()
        app.launchArguments = ["-world2SkipIntro"]
    }

    func testSplashContinueAppearsWithoutAuth() throws {
        app.launchArguments = []
        app.launch()

        let intro = app.descendants(matching: .any)["world2.loading"]
        XCTAssertTrue(intro.waitForExistence(timeout: 8), "Intro never appeared")

        let login = app.descendants(matching: .any).matching(
            NSPredicate(format: "label CONTAINS[c] 'sign in' OR label CONTAINS[c] 'log in' OR identifier CONTAINS[c] 'auth0'")
        )
        XCTAssertEqual(login.count, 0, "Auth0 or another login gate blocked launch")

        let continueButton = app.descendants(matching: .any)["world2.loading.continue"]
        XCTAssertTrue(
            continueButton.waitForExistence(timeout: 16),
            "Intro never offered ENTER ABBIE'S WORLD"
        )
    }

    func testMainPlacesAreReachable() throws {
        app.launch()
        enterAsAbbie()

        openPOI("poi.abbieTreehouse", expecting: "world2.interior.poi.abbieTreehouse")
        XCTAssertTrue(
            app.buttons["Open the treehouse jukebox"].waitForExistence(timeout: 4)
                || app.descendants(matching: .any)
                    .matching(NSPredicate(format: "identifier BEGINSWITH 'world2.interior.jukebox.'"))
                    .firstMatch
                    .exists,
            "Starter jukebox was not rendered in Abbie's treehouse\n\(app.debugDescription.prefix(1600))"
        )
        tap("world2.interior.back")

        openPOI("poi.aniTreehouse", expecting: "world2.interior.poi.aniTreehouse")
        XCTAssertTrue(
            app.descendants(matching: .any)["world2.interior.readOnly"].waitForExistence(timeout: 4),
            "Visiting Ani was not read-only"
        )
        tap("world2.interior.back")

        openPOI("poi.cardFactory", expecting: "world2.factory")
        tap("world2.factory.back")

        travel("world.work")
        openPOI("poi.letterWorks", expecting: "world2.fallingTargets.save_the_vowels")
        tap("world2.fallingTargets.exit")

        openPOI("poi.creatureLab", expecting: "creatureBuilder.root")
        tap("creatureLab.backToCity")
        tap("creatureLab.closeCity")

        openPOI("poi.assetWorkbench", expecting: "world2.assetWorkbench")
        tap("world2.assetWorkbench.exit")

        travel("world.home")
        tap("world2.hud.classicGames")
        XCTAssertTrue(
            app.descendants(matching: .any)["classicGames.Dino Picnic"].waitForExistence(timeout: 4)
        )
        XCTAssertTrue(app.descendants(matching: .any)["classicGames.Creature Lab"].exists)
    }

    func testInventoryFactoryAndFurnitureStoreOpen() throws {
        app.launchArguments = ["-world2SkipIntro", "-launchWorld2BlankSlate"]
        app.launch()
        let continueButton = app.buttons["world2.loading.continue"]
        XCTAssertTrue(continueButton.waitForExistence(timeout: 8))
        continueButton.tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["world2.mutableScene"].waitForExistence(timeout: 8)
        )
        tap("world2.mutableScene.drawerButton")
        XCTAssertTrue(
            app.descendants(matching: .any).matching(
                NSPredicate(format: "identifier BEGINSWITH 'world2.placeInventory.item.'")
            ).firstMatch.waitForExistence(timeout: 4),
            "Starter POI factory was missing from place inventory"
        )

        app.terminate()
        app.launchArguments = ["-world2SkipIntro", "-launchWorld2FurnitureStore"]
        app.launch()
        let continueAgain = app.buttons["world2.loading.continue"]
        XCTAssertTrue(continueAgain.waitForExistence(timeout: 8))
        continueAgain.tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["world2.furnitureStore"].waitForExistence(timeout: 8),
            "Furniture store did not open from the farm launch path\n\(app.debugDescription.prefix(800))"
        )

        app.terminate()
        app.launchArguments = ["-world2SkipIntro", "-launchWorld2Home"]
        app.launch()
        let continueHome = app.buttons["world2.loading.continue"]
        XCTAssertTrue(continueHome.waitForExistence(timeout: 8))
        continueHome.tap()
        tap("world2.hud.classicGames")
        XCTAssertTrue(
            app.descendants(matching: .any)["classicGames.Dino Picnic"].waitForExistence(timeout: 4)
        )
        XCTAssertTrue(app.descendants(matching: .any)["classicGames.Creature Lab"].exists)
    }

    func testDecoratingPlacesMovesAndKeepsFurniture() throws {
        app.launchArguments = ["-world2SkipIntro", "-launchWorld2AbbieTreehouse"]
        app.launch()
        let continueButton = app.buttons["world2.loading.continue"]
        XCTAssertTrue(continueButton.waitForExistence(timeout: 8))
        continueButton.tap()

        let decorateFromPack = app.descendants(matching: .any)["world2.interior.starterPack.openInventory"]
        if decorateFromPack.waitForExistence(timeout: 6) {
            decorateFromPack.tap()
        } else {
            tap("world2.interior.arrangeFurniture")
        }
        XCTAssertTrue(
            app.descendants(matching: .any)["world2.interior.decorator.drawer"].waitForExistence(timeout: 4),
            "Decorating drawer never opened"
        )

        let items = app.descendants(matching: .any).matching(
            NSPredicate(format: "identifier BEGINSWITH 'world2.interior.inventory.item.'")
        )
        XCTAssertGreaterThan(items.count, 0, "Starter furniture never reached the drawer")
        let item = items.firstMatch
        let instanceID = item.identifier.replacingOccurrences(
            of: "world2.interior.inventory.item.",
            with: ""
        )
        item.tap()

        let placed = app.descendants(matching: .any)["world2.interior.placedFurniture.\(instanceID)"].firstMatch
        XCTAssertTrue(placed.waitForExistence(timeout: 4), "Placed piece did not appear in the room")
        saveShot("decorate-placed")

        let before = placed.value as? String ?? ""
        let start = placed.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.4))
        let shifted = start.withOffset(CGVector(dx: 0, dy: -56))
        start.press(forDuration: 0.4, thenDragTo: shifted)
        XCTAssertTrue(placed.waitForExistence(timeout: 3), "Drag put the piece away instead of moving it. before=\(before)")
        let after = placed.value as? String ?? ""
        XCTAssertNotEqual(before, after, "Drag did not move the piece. before=\(before)")
        saveShot("decorate-moved")

        tap("world2.interior.furniture.remove.\(instanceID)")
        XCTAssertTrue(
            app.descendants(matching: .any)["world2.interior.inventory.item.\(instanceID)"]
                .waitForExistence(timeout: 4),
            "Put-away did not return the piece to the drawer"
        )
        tap("world2.interior.inventory.item.\(instanceID)")
        XCTAssertTrue(placed.waitForExistence(timeout: 4), "Could not place the piece a second time")
        saveShot("decorate-replaced")

        tap("world2.interior.decorator.done")
        tap("world2.interior.back")
        openPOI("poi.abbieTreehouse", expecting: "world2.interior.poi.abbieTreehouse")
        XCTAssertTrue(
            app.descendants(matching: .any)["world2.interior.placedFurniture.\(instanceID)"]
                .waitForExistence(timeout: 4),
            "Furniture did not stay in the room after leaving"
        )
        saveShot("decorate-kept")
    }

    func testMapPOIsSitOnPaintedPads() throws {
        app.launch()
        enterAsAbbie()
        assertOnPaintedSpot("poi.abbieTreehouse", x: 0.326, y: 0.311)
        assertOnPaintedSpot("poi.aniTreehouse", x: 0.722, y: 0.443)
        assertOnPaintedSpot("poi.cardFactory", x: 0.440, y: 0.685)
        saveShot("map-home")

        travel("world.work")
        assertOnPaintedSpot("poi.letterWorks", x: 0.198, y: 0.371)
        assertOnPaintedSpot("poi.assetWorkbench", x: 0.690, y: 0.694)
        assertOnPaintedSpot("poi.creatureLab", x: 0.430, y: 0.220)
        saveShot("map-work")

        travel("world.home")
        travel("world.farm")
        assertOnPaintedSpot("poi.furnitureStore", x: 0.538, y: 0.480)
        saveShot("map-farm")
        openPOI("poi.furnitureStore", expecting: "world2.furnitureStore")
    }

    private func assertOnPaintedSpot(_ poiID: String, x: Double, y: Double) {
        let map = app.descendants(matching: .any)["world2.map.frame"]
        let marker = app.descendants(matching: .any)["world2.poi.\(poiID)"]
        XCTAssertTrue(map.waitForExistence(timeout: 6), "Map frame missing")
        XCTAssertTrue(marker.waitForExistence(timeout: 6), "Missing marker \(poiID)")
        let mapFrame = map.frame
        let markerFrame = marker.frame
        XCTAssertGreaterThan(mapFrame.width, 40)
        XCTAssertGreaterThan(mapFrame.height, 40)
        let actualX = (markerFrame.midX - mapFrame.minX) / mapFrame.width
        let actualY = (markerFrame.midY - mapFrame.minY) / mapFrame.height
        XCTAssertEqual(
            actualX,
            x,
            accuracy: 0.08,
            "\(poiID) x \(actualX) is off the painted spot \(x)"
        )
        XCTAssertEqual(
            actualY,
            y,
            accuracy: 0.08,
            "\(poiID) y \(actualY) is off the painted spot \(y)"
        )
    }

    private func saveShot(_ name: String) {
        let shot = XCUIScreen.main.screenshot()
        try? shot.pngRepresentation.write(to: URL(fileURLWithPath: "/tmp/abbies-\(name).png"))
        let attachment = XCTAttachment(screenshot: shot)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func enterAsAbbie() {
        let continueButton = app.buttons["world2.loading.continue"]
        XCTAssertTrue(continueButton.waitForExistence(timeout: 8))
        waitUntilHittable(continueButton)
        continueButton.tap()

        let player = app.buttons["Play as Abbie"]
        if !player.waitForExistence(timeout: 8) {
            XCTFail("Player select did not appear.\n\(app.debugDescription)")
            return
        }
        waitUntilHittable(player)
        player.tap()
        XCTAssertTrue(
            app.descendants(matching: .any)["world2.homeWorld"].waitForExistence(timeout: 8),
            "Home world did not appear.\n\(app.debugDescription)"
        )
    }

    private func waitUntilHittable(_ element: XCUIElement) {
        let hittable = NSPredicate(format: "isHittable == true")
        let expectation = XCTNSPredicateExpectation(predicate: hittable, object: element)
        _ = XCTWaiter.wait(for: [expectation], timeout: 5)
    }

    private func openPOI(_ poiID: String, expecting screenID: String) {
        tap("world2.poi.\(poiID)")
        tap("world2.poi.enter")
        XCTAssertTrue(
            app.descendants(matching: .any)[screenID].waitForExistence(timeout: 8),
            "Expected \(screenID) after entering \(poiID)\n\(app.debugDescription)"
        )
    }

    private func travel(_ worldID: String) {
        tap("world2.world.\(worldID)")
    }

    private func tap(_ identifier: String) {
        let element = app.descendants(matching: .any)[identifier]
        XCTAssertTrue(
            element.waitForExistence(timeout: 8),
            "Missing \(identifier)\n\(app.debugDescription.prefix(1800))"
        )
        if element.isHittable {
            element.tap()
        } else {
            element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        }
    }

    private func tapBackControl(named label: String) {
        let button = app.buttons[label]
        if button.waitForExistence(timeout: 4), button.isHittable {
            button.tap()
            return
        }
        let matching = app.descendants(matching: .any).matching(
            NSPredicate(format: "label == %@", label)
        ).firstMatch
        XCTAssertTrue(matching.waitForExistence(timeout: 4), "Missing \(label)")
        matching.tap()
    }
}
