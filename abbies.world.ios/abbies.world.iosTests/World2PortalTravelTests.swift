import XCTest
@testable import abbies_world_ios

final class World2PortalTravelTests: XCTestCase {
    func testShippedPortalDualsValidateCleanly() {
        let issues = World2SceneCatalog.validateAll()
        XCTAssertTrue(
            issues.isEmpty,
            issues.map(\.description).joined(separator: "\n")
        )
    }

    func testHomeEastAndFarmWestAreDuals() {
        let homeEast = World2SceneCatalog.homeWorld.compassPortal(.east)
        let farmWest = World2SceneCatalog.farmLand.compassPortal(.west)
        XCTAssertEqual(homeEast?.portal?.destinationSceneID, World2SceneCatalog.farmLand.id)
        XCTAssertEqual(farmWest?.portal?.destinationSceneID, World2SceneCatalog.homeWorld.id)
        XCTAssertEqual(homeEast?.portal?.reverseInstanceID, farmWest?.id)
        XCTAssertEqual(farmWest?.portal?.reverseInstanceID, homeEast?.id)
        XCTAssertEqual(homeEast?.portal?.compass?.dual, farmWest?.portal?.compass)
    }

    func testHomeSouthAndWorkNorthAreDuals() {
        let homeSouth = World2SceneCatalog.homeWorld.compassPortal(.south)
        let workNorth = World2SceneCatalog.workLand.compassPortal(.north)
        XCTAssertEqual(homeSouth?.portal?.destinationSceneID, World2SceneCatalog.workLand.id)
        XCTAssertEqual(workNorth?.portal?.destinationSceneID, World2SceneCatalog.homeWorld.id)
        XCTAssertEqual(homeSouth?.portal?.reverseInstanceID, workNorth?.id)
        XCTAssertEqual(workNorth?.portal?.reverseInstanceID, homeSouth?.id)
    }

    func testFarmEastAndThreeBearsWestAreDuals() {
        let farmEast = World2SceneCatalog.farmLand.compassPortal(.east)
        let woodsWest = World2SceneCatalog.threeBears.compassPortal(.west)
        XCTAssertEqual(farmEast?.portal?.destinationSceneID, World2SceneCatalog.threeBears.id)
        XCTAssertEqual(woodsWest?.portal?.destinationSceneID, World2SceneCatalog.farmLand.id)
        XCTAssertEqual(farmEast?.portal?.reverseInstanceID, woodsWest?.id)
    }

    func testEmptyCompassSocketsHaveNoPortalInstance() {
        XCTAssertNil(World2SceneCatalog.homeWorld.compassPortal(.west))
        XCTAssertNil(World2SceneCatalog.homeWorld.compassPortal(.north))
        XCTAssertNil(World2SceneCatalog.workLand.compassPortal(.east))
    }

    func testCompassPortalsDefaultToSwipeAndSlide() {
        let east = World2SceneCatalog.homeWorld.compassPortal(.east)?.portal
        XCTAssertEqual(east?.activation, .swipe(.east))
        XCTAssertEqual(east?.transition, .slide(.east))
        XCTAssertEqual(
            World2PortalActivation.default(compass: .east),
            .swipe(.east)
        )
    }

    func testPointPortalDefaultsToTapAndUsesPortalTransition() {
        let gate = World2SceneCatalog.homeWorld.poiInstances.first {
            $0.id == "instance.home.portal.blankSlate"
        }
        XCTAssertEqual(gate?.portal?.activation, .tap)
        XCTAssertEqual(gate?.portal?.transition, .portal)
        XCTAssertEqual(gate?.portal?.destinationWorldID, .blankSlate)
        XCTAssertFalse(gate?.hidesOnPlayerMap ?? true)
        XCTAssertEqual(World2PortalActivation.default(compass: nil), .tap)
    }

    func testCompassPortalsAreHiddenFromThePlayerMap() {
        let east = World2SceneCatalog.homeWorld.compassPortal(.east)
        XCTAssertEqual(east?.hidesOnPlayerMap, true)
        XCTAssertEqual(east?.isPointPortal, false)
    }

    func testBrokenDualIsNamedByTheValidator() {
        let broken = World2SceneDefinition(
            id: "scene.a",
            name: "A",
            summary: "",
            poiInstances: [
                World2POIInstance(
                    id: "a.east",
                    archetypeID: World2POIRegistry.scenePortalID,
                    sceneID: "scene.a",
                    transform: World2POITransform(x: 0.9, y: 0.5),
                    portal: World2PortalLink(
                        destinationSceneID: "scene.b",
                        reverseInstanceID: "missing",
                        transition: .slide(.east),
                        activation: .swipe(.east),
                        compass: .east
                    )
                )
            ]
        )
        let destination = World2SceneDefinition(id: "scene.b", name: "B", summary: "")
        XCTAssertEqual(
            World2PortalGraph.validate(scenes: [broken, destination]),
            [
                .portalBrokenDual(
                    instanceID: "a.east",
                    sceneID: "scene.a",
                    reverseInstanceID: "missing",
                    destinationSceneID: "scene.b"
                )
            ]
        )
    }

    func testWorldIdResolvesBlankSlateScene() {
        XCTAssertEqual(WorldId(sceneID: World2SceneDefinition.blankSlateSceneID), .blankSlate)
        XCTAssertEqual(WorldId(sceneID: WorldId.home.sceneID), .home)
        XCTAssertNil(WorldId(sceneID: "scene.unknown"))
    }
}

final class World2SwipeTravelTests: XCTestCase {
    func testDominantAxisPicksEastOverNorthOnAMostlyHorizontalDrag() {
        XCTAssertEqual(
            World2Compass.dominant(translationX: 40, translationY: 8),
            .east
        )
        XCTAssertEqual(
            World2Compass.dominant(translationX: -4, translationY: -40),
            .north
        )
        XCTAssertNil(World2Compass.dominant(translationX: 3, translationY: -2))
    }

    func testPercentIsOneWhenFingerTravelsTheFullWidthEast() {
        XCTAssertEqual(
            World2SwipeTravel.percent(
                translationX: 800,
                translationY: 0,
                compass: .east,
                width: 800,
                height: 600
            ),
            1,
            accuracy: 0.0001
        )
        XCTAssertEqual(
            World2SwipeTravel.percent(
                translationX: -400,
                translationY: 0,
                compass: .west,
                width: 800,
                height: 600
            ),
            0.5,
            accuracy: 0.0001
        )
    }

    func testCommitAtThresholdAndCancelBelowIt() {
        XCTAssertEqual(
            World2SwipeTravel.resolve(
                percent: 0.38,
                predictedPercent: 0.38,
                hasDestination: true
            ),
            .commit
        )
        XCTAssertEqual(
            World2SwipeTravel.resolve(
                percent: 0.20,
                predictedPercent: 0.22,
                hasDestination: true
            ),
            .cancel
        )
    }

    func testVelocitySprintCommitsBelowTheLine() {
        XCTAssertEqual(
            World2SwipeTravel.resolve(
                percent: 0.18,
                predictedPercent: 0.18 + World2SwipeTravel.sprintPredictedJump,
                hasDestination: true
            ),
            .commit
        )
    }

    func testEmptySocketNeverCommits() {
        XCTAssertEqual(
            World2SwipeTravel.resolve(
                percent: 0.95,
                predictedPercent: 1.4,
                hasDestination: false
            ),
            .cancel
        )
    }

    func testRubberBandCapsBelowTheCommitLine() {
        let stretched = World2SwipeTravel.rubberBand(1.0)
        XCTAssertLessThan(stretched, World2SwipeTravel.commitPercent)
        XCTAssertGreaterThan(stretched, 0)
        XCTAssertEqual(World2SwipeTravel.rubberBand(-0.4), 0)
    }

    func testSlideOffsetsSwapTheMapsAtCommit() {
        let current = World2SwipeTravel.currentMapOffset(
            compass: .east,
            percent: 1,
            width: 800,
            height: 600
        )
        let destination = World2SwipeTravel.destinationMapOffset(
            compass: .east,
            percent: 1,
            width: 800,
            height: 600
        )
        XCTAssertEqual(current.x, -800, accuracy: 0.001)
        XCTAssertEqual(destination.x, 0, accuracy: 0.001)
        XCTAssertEqual(current.y, 0, accuracy: 0.001)
        XCTAssertEqual(destination.y, 0, accuracy: 0.001)
    }

    func testSwipeIgnoresTheSystemEdge() {
        XCTAssertFalse(
            World2SwipeTravel.isInsideSwipeInset(x: 8, y: 200, width: 800, height: 600)
        )
        XCTAssertTrue(
            World2SwipeTravel.isInsideSwipeInset(x: 40, y: 200, width: 800, height: 600)
        )
    }
}

final class World2MinimapTests: XCTestCase {
    func testEveryShippedSceneRegistersAMinimapIcon() {
        for scene in World2SceneCatalog.all {
            XCTAssertFalse(
                scene.minimapIcon.isEmpty,
                "\(scene.id) needs a minimap_icon"
            )
            XCTAssertNotNil(
                scene.minimapIconStyle,
                "\(scene.id) needs a drawn minimap stand-in until the tile is painted"
            )
        }
    }

    func testHomeNeighborhoodShowsFarmEastWorkSouthAndEmptyWest() {
        let map = World2MinimapGraph.neighborhood(
            of: World2SceneCatalog.homeWorld,
            resolve: { World2SceneCatalog.scene($0) }
        )
        XCTAssertEqual(map.here.minimapIcon, "minimap.home")
        XCTAssertEqual(map.here.isHere, true)
        XCTAssertEqual(map.east.sceneID, World2SceneCatalog.farmLand.id)
        XCTAssertEqual(map.east.minimapIcon, "minimap.farm")
        XCTAssertEqual(map.south.sceneID, World2SceneCatalog.workLand.id)
        XCTAssertEqual(map.south.minimapIcon, "minimap.workLand")
        XCTAssertFalse(map.west.isOpen)
        XCTAssertFalse(map.north.isOpen)
        XCTAssertEqual(map.west.compass, .west)
    }

    func testFarmNeighborhoodReadsThreeBearsIconFromThatScene() {
        let map = World2MinimapGraph.neighborhood(
            of: World2SceneCatalog.farmLand,
            resolve: { World2SceneCatalog.scene($0) }
        )
        XCTAssertEqual(map.west.minimapIcon, "minimap.home")
        XCTAssertEqual(map.east.minimapIcon, "minimap.threeBears")
        XCTAssertEqual(map.east.minimapIconStyle, .woodsCottage)
    }

    func testMissingMinimapIconIsANamedCatalogIssue() {
        let scene = World2SceneDefinition(id: "scene.lost", name: "Lost", summary: "")
        XCTAssertEqual(scene.minimapIcon, "")
        XCTAssertEqual(scene.resolvedMinimapIcon, "minimap.placeholder")
        XCTAssertEqual(
            World2POIRegistryIssue.sceneMissingMinimapIcon(sceneID: scene.id).description,
            "scene=scene.lost has no minimap_icon"
        )
    }
}

final class World2SceneAttachmentTests: XCTestCase {
    func testShippedMapsStillHaveOpenCompassNodes() {
        let nodes = World2SceneAttachment.openNodes(in: World2SceneCatalog.all)
        XCTAssertTrue(nodes.contains { $0.hostSceneID == World2SceneCatalog.homeWorld.id && $0.compass == .west })
        XCTAssertTrue(nodes.contains { $0.hostSceneID == World2SceneCatalog.homeWorld.id && $0.compass == .north })
        XCTAssertFalse(nodes.contains { $0.hostSceneID == World2SceneCatalog.homeWorld.id && $0.compass == .east })
        XCTAssertFalse(nodes.contains { $0.hostSceneID == World2SceneCatalog.homeWorld.id && $0.compass == .south })
    }

    func testOrphanScenesAreNotOpenNodes() {
        let orphan = World2SceneDefinition(
            id: "scene.orphan",
            name: "Orphan",
            summary: "",
            minimapIcon: "minimap.orphan",
            minimapIconStyle: .orphanClearing,
            isOrphan: true
        )
        let nodes = World2SceneAttachment.openNodes(
            in: World2SceneCatalog.all + [orphan]
        )
        XCTAssertFalse(nodes.contains { $0.hostSceneID == orphan.id })
    }

    func testAttachWritesDualsAndClearsOrphanFlag() {
        var host = World2SceneCatalog.homeWorld
        var orphan = World2SceneDefinition(
            id: "scene.kit",
            name: "New Place 1",
            summary: "",
            minimapIcon: "minimap.orphan",
            minimapIconStyle: .orphanClearing,
            isOrphan: true
        )
        XCTAssertTrue(
            World2SceneAttachment.attach(orphan: &orphan, host: &host, compass: .west)
        )
        XCTAssertFalse(orphan.isOrphan)
        let hostWest = host.compassPortal(.west)
        let orphanEast = orphan.compassPortal(.east)
        XCTAssertEqual(hostWest?.portal?.destinationSceneID, orphan.id)
        XCTAssertEqual(orphanEast?.portal?.destinationSceneID, host.id)
        XCTAssertEqual(hostWest?.portal?.reverseInstanceID, orphanEast?.id)
        XCTAssertEqual(orphanEast?.portal?.reverseInstanceID, hostWest?.id)
        XCTAssertEqual(hostWest?.portal?.compass?.dual, orphanEast?.portal?.compass)
        XCTAssertEqual(hostWest?.portal?.name, "New Place 1")
        var scenes = World2SceneCatalog.all
        if let index = scenes.firstIndex(where: { $0.id == host.id }) {
            scenes[index] = host
        }
        scenes.append(orphan)
        let issues = World2PortalGraph.validate(scenes: scenes)
        XCTAssertTrue(
            issues.isEmpty,
            issues.map(\.description).joined(separator: "\n")
        )
    }

    func testAttachRefusesABusySocket() {
        var host = World2SceneCatalog.homeWorld
        var orphan = World2SceneDefinition(
            id: "scene.kit",
            name: "New Place 1",
            summary: "",
            isOrphan: true
        )
        XCTAssertFalse(
            World2SceneAttachment.attach(orphan: &orphan, host: &host, compass: .east)
        )
        XCTAssertTrue(orphan.isOrphan)
        XCTAssertNil(orphan.compassPortal(.west))
    }

    func testSceneKitStaysUntilConsumed() {
        var item = World2PlaceInventoryItem(
            templateID: .newSceneKit,
            boundSceneID: "scene.kit"
        )
        XCTAssertTrue(item.isSceneKit)
        XCTAssertEqual(item.boundSceneID, "scene.kit")
        item.boundSceneID = "scene.kit"
        XCTAssertNotEqual(item.id.isEmpty, true)
    }

    func testHomeRegistersSceneWorksWithoutStealingOpenPads() {
        let home = World2SceneCatalog.homeWorld
        XCTAssertNotNil(home.instance("instance.home.sceneWorks"))
        XCTAssertTrue(home.hardpoints.contains { $0.id == "hardpoint.home.creekPad" })
        XCTAssertTrue(home.hardpoints.contains { $0.id == "hardpoint.home.hilltopPad" })
        XCTAssertTrue(home.openHardpoints.contains { $0.id == "hardpoint.home.creekPad" })
        XCTAssertTrue(home.openHardpoints.contains { $0.id == "hardpoint.home.hilltopPad" })
    }

    func testWorkRegistersPOIFactoryWithoutStealingCornerLot() {
        let work = World2SceneCatalog.workLand
        XCTAssertNotNil(work.instance("instance.work.poiFactory"))
        XCTAssertTrue(work.openHardpoints.contains { $0.id == "hardpoint.work.cornerLot" })
    }
}
