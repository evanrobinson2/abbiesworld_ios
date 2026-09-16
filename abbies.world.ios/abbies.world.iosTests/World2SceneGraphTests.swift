import XCTest
@testable import abbies_world_ios

final class RegistryTests: XCTestCase {
    func testShippedCatalogValidatesCleanly() {
        let issues = World2SceneCatalog.validateAll()
        XCTAssertTrue(
            issues.isEmpty,
            "shipped scenes must validate:\n" + issues.map(\.description).joined(separator: "\n")
        )
    }

    func testEveryArchetypeIsRegisteredUnderItsOwnID() {
        for archetype in World2POIRegistry.all {
            XCTAssertEqual(World2POIRegistry.archetype(archetype.id)?.id, archetype.id)
        }
        XCTAssertEqual(World2POIRegistry.archetypes.count, World2POIRegistry.all.count)
    }

    func testEveryPlacedInstanceResolvesToARegisteredArchetype() {
        for scene in World2SceneCatalog.all {
            for instance in scene.poiInstances {
                XCTAssertNotNil(
                    World2POIRegistry.archetype(instance.archetypeID),
                    "\(instance.archetypeID) in \(scene.id) is not registered"
                )
            }
        }
    }

    func testEveryPlacedInstanceFitsThePadItIsPinnedTo() {
        for scene in World2SceneCatalog.all {
            for instance in scene.poiInstances {
                guard let hardpointID = instance.hardpointID,
                      let hardpoint = scene.hardpoint(hardpointID),
                      let archetype = World2POIRegistry.archetype(instance.archetypeID) else {
                    continue
                }
                XCTAssertTrue(
                    archetype.fits(hardpoint),
                    "\(instance.id) does not fit \(hardpointID)"
                )
            }
        }
    }

    func testAuthoredInstancesSitExactlyOnTheirPads() {
        for scene in World2SceneCatalog.all {
            for instance in scene.poiInstances where instance.isAuthored {
                guard let hardpointID = instance.hardpointID,
                      let hardpoint = scene.hardpoint(hardpointID) else { continue }
                XCTAssertEqual(
                    instance.transform.position.x,
                    hardpoint.position.x,
                    accuracy: 0.0005,
                    "\(instance.id) drifted off \(hardpointID) horizontally"
                )
                XCTAssertEqual(
                    instance.transform.position.y,
                    hardpoint.position.y,
                    accuracy: 0.0005,
                    "\(instance.id) drifted off \(hardpointID) vertically"
                )
            }
        }
    }

    func testEveryMapSceneOffersAtLeastOneOpenHardpointAsProof() {
        let mapScenes = World2SceneCatalog.all.filter { $0.backgroundAsset != "map.blankSlate" }
        XCTAssertFalse(mapScenes.isEmpty)
        for scene in mapScenes {
            XCTAssertFalse(
                scene.openHardpoints.isEmpty,
                "\(scene.id) should show at least one open pad"
            )
        }
    }

    func testThreeBearsSceneHasTheHouseOnAPad() {
        let scene = World2SceneCatalog.threeBears
        let house = scene.poiInstances.first {
            $0.archetypeID == World2POIRegistry.threeBearsHouseID
        }
        XCTAssertNotNil(house)
        XCTAssertNotNil(house?.hardpointID)
        XCTAssertEqual(scene.openHardpoints.count, 2)
    }

    func testThreeBearsHouseContractGrantsThePorridgeToPlayerInventory() {
        let contract = World2POIRegistry.threeBearsHouse.contract
        XCTAssertEqual(
            contract.grants,
            [.storyDecoration(decorationID: World2StoryDecoration.perfectPorridge.id)]
        )
        XCTAssertTrue(contract.grantsPlayerInventory)
        XCTAssertNotNil(contract.completionMilestone)
    }

    func testValidatorCatchesAnInstanceOnAMissingPad() {
        let scene = World2SceneDefinition(
            id: "scene.broken",
            name: "Broken",
            summary: "",
            poiInstances: [
                World2POIInstance(
                    id: "i1",
                    archetypeID: World2POIRegistry.cardFactoryID,
                    sceneID: "scene.broken",
                    transform: World2POITransform(x: 0.5, y: 0.5),
                    hardpointID: "hardpoint.nope"
                )
            ]
        )
        XCTAssertEqual(
            World2POIRegistry.validate(scene: scene),
            [
                .unknownHardpoint(
                    instanceID: "i1",
                    hardpointID: "hardpoint.nope",
                    sceneID: "scene.broken"
                )
            ]
        )
    }

    func testValidatorCatchesADoubleBookedPad() {
        let pad = World2SceneHardpoint(
            id: "hp",
            name: "Pad",
            position: .center
        )
        let scene = World2SceneDefinition(
            id: "scene.double",
            name: "Double",
            summary: "",
            hardpoints: [pad],
            poiInstances: [
                World2POIInstance(
                    id: "i1",
                    archetypeID: World2POIRegistry.cardFactoryID,
                    sceneID: "scene.double",
                    transform: World2POITransform(x: 0.5, y: 0.5),
                    hardpointID: "hp"
                ),
                World2POIInstance(
                    id: "i2",
                    archetypeID: World2POIRegistry.creatureLabID,
                    sceneID: "scene.double",
                    transform: World2POITransform(x: 0.5, y: 0.5),
                    hardpointID: "hp"
                ),
            ]
        )
        XCTAssertTrue(
            World2POIRegistry.validate(scene: scene).contains(
                .hardpointDoubleBooked(
                    hardpointID: "hp",
                    sceneID: "scene.double",
                    instanceIDs: ["i1", "i2"]
                )
            )
        )
    }

    func testValidatorCatchesAnUnregisteredArchetype() {
        let scene = World2SceneDefinition(
            id: "scene.ghost",
            name: "Ghost",
            summary: "",
            poiInstances: [
                World2POIInstance(
                    id: "i1",
                    archetypeID: "poi.doesNotExist",
                    sceneID: "scene.ghost",
                    transform: World2POITransform(x: 0.5, y: 0.5)
                )
            ]
        )
        XCTAssertEqual(
            World2POIRegistry.validate(scene: scene),
            [
                .unknownArchetype(
                    instanceID: "i1",
                    archetypeID: "poi.doesNotExist",
                    sceneID: "scene.ghost"
                )
            ]
        )
    }

    func testTreehousesAreOwnerOnlyAndNotOfferedInTheEditorMenu() {
        XCTAssertTrue(World2POIRegistry.treehouse(for: .abbie).contract.requiresOwnership)
        XCTAssertFalse(
            World2POIRegistry.placeableInEditor.contains { $0.kind == .home }
        )
    }

    func testReportsAreNonEmptyForTextInspection() {
        XCTAssertTrue(World2POIRegistry.contractReport().contains("poi.threeBearsHouse"))
        XCTAssertTrue(World2SceneCatalog.riggingReport().contains("open  hardpoint."))
    }
}

// MARK: - Codable migration

final class SceneGraphCodableTests: XCTestCase {
    func testHardpointDecodesLegacyFlatXY() throws {
        let legacy = Data(
            #"{"id":"hardpoint.left","name":"Left clearing","x":0.27,"y":0.58}"#.utf8
        )
        let hardpoint = try JSONDecoder().decode(World2SceneHardpoint.self, from: legacy)
        XCTAssertEqual(hardpoint.position, World2NormalizedPoint(x: 0.27, y: 0.58))
        XCTAssertEqual(hardpoint.acceptedSizeClasses, World2SceneHardpoint.anySizeClass)
        XCTAssertEqual(hardpoint.snapRadius, World2SceneHardpoint.defaultSnapRadius)
        XCTAssertFalse(hardpoint.isLocked)
    }

    func testHardpointRoundTrips() throws {
        let original = World2SceneHardpoint(
            id: "hp",
            name: "Pad",
            position: World2NormalizedPoint(x: 0.4, y: 0.7),
            acceptedSizeClasses: [.small, .medium],
            snapRadius: 0.11,
            isLocked: true,
            notes: "note"
        )
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(World2SceneHardpoint.self, from: data)
        XCTAssertEqual(decoded, original)
    }

    func testSceneDecodesLegacyMutableSceneWithoutInstances() throws {
        let legacy = Data(
            """
            {"id":"scene.abc","name":"Old Scene","summary":"made before the graph",
             "isMutableByPlayer":true,"isDeveloperPlaceholder":true,
             "hardpoints":[{"id":"hardpoint.center","name":"Center","x":0.5,"y":0.48}]}
            """.utf8
        )
        let scene = try JSONDecoder().decode(World2SceneDefinition.self, from: legacy)
        XCTAssertEqual(scene.id, "scene.abc")
        XCTAssertTrue(scene.isMutableByPlayer)
        XCTAssertTrue(scene.poiInstances.isEmpty)
        XCTAssertEqual(scene.hardpoints.count, 1)
        XCTAssertEqual(scene.openHardpoints.count, 1)
    }

    func testHardpointSnapRadiusIsClampedToSaneRange() {
        let tiny = World2SceneHardpoint(
            id: "a",
            name: "a",
            position: .center,
            snapRadius: -5
        )
        let huge = World2SceneHardpoint(
            id: "b",
            name: "b",
            position: .center,
            snapRadius: 99
        )
        XCTAssertGreaterThan(tiny.snapRadius, 0)
        XCTAssertLessThanOrEqual(huge.snapRadius, 0.30)
    }

    func testEmptyAcceptedSizesFallsBackToAnySizeRatherThanAcceptingNothing() {
        let hardpoint = World2SceneHardpoint(
            id: "a",
            name: "a",
            position: .center,
            acceptedSizeClasses: []
        )
        XCTAssertEqual(hardpoint.acceptedSizeClasses, World2SceneHardpoint.anySizeClass)
    }

    func testTransformClampingKeepsScaleInRange() {
        let clamped = World2POITransform(x: 0.5, y: 0.5, scale: 99).clamped()
        XCTAssertEqual(clamped.scale, World2POITransform.scaleRange.upperBound)
    }
}

// MARK: - Just Right minigame

final class JustRightGameTests: XCTestCase {
    func testGameHasThreeRoundsEachWithThreeBowls() {
        let game = World2JustRightGame.make(seed: 7)
        XCTAssertEqual(game.rounds.count, World2JustRightGame.roundCount)
        for round in game.rounds {
            XCTAssertEqual(round.bowls.count, 3)
            XCTAssertEqual(round.bowls.filter(\.isJustRight).count, 1)
        }
        XCTAssertEqual(
            game.rounds.map(\.attribute),
            World2JustRightGame.attributeOrder
        )
    }

    func testTastingTheJustRightBowlAdvancesTheRound() {
        var game = World2JustRightGame.make(seed: 1)
        let first = game.currentRound!
        let outcome = game.taste(bowlID: first.justRightBowlID!)
        XCTAssertTrue(outcome.isProgress)
        XCTAssertEqual(game.roundNumber, 2)
        XCTAssertFalse(game.isComplete)
    }

    func testAWrongTasteIsForgivingAndKeepsTheRoundOpen() {
        var game = World2JustRightGame.make(seed: 3)
        let round = game.currentRound!
        let wrong = round.bowls.first { !$0.isJustRight }!
        let outcome = game.taste(bowlID: wrong.id)
        guard case .tryAgain(let bear, let message) = outcome else {
            return XCTFail("expected a kind try-again, got \(outcome)")
        }
        XCTAssertNotEqual(bear, .baby)
        XCTAssertTrue(message.contains("Try another"))
        XCTAssertEqual(game.roundNumber, 1, "round must stay open")
        XCTAssertFalse(game.isComplete)
        XCTAssertEqual(game.wrongTastes, 1)
    }

    func testItIsImpossibleToLose() {
        var game = World2JustRightGame.make(seed: 11)
        // Taste every wrong bowl in every round, repeatedly, then the right one.
        for _ in 0..<World2JustRightGame.roundCount {
            let round = game.currentRound!
            for wrong in round.bowls where !wrong.isJustRight {
                _ = game.taste(bowlID: wrong.id)
                _ = game.taste(bowlID: wrong.id)
            }
            _ = game.taste(bowlID: round.justRightBowlID!)
        }
        XCTAssertTrue(game.isComplete)
        XCTAssertFalse(game.tastedPerfectly)
        XCTAssertEqual(game.progress, 1.0)
    }

    func testFinishingCleanlyIsAPerfectTasting() {
        var game = World2JustRightGame.make(seed: 5)
        var last: World2JustRightOutcome = .ignored
        for _ in 0..<World2JustRightGame.roundCount {
            last = game.taste(bowlID: game.currentRound!.justRightBowlID!)
        }
        guard case .finished(let bear, _, let perfectly) = last else {
            return XCTFail("expected finished, got \(last)")
        }
        XCTAssertEqual(bear, .baby)
        XCTAssertTrue(perfectly)
        XCTAssertTrue(game.isComplete)
    }

    func testTastingAfterTheGameEndsIsIgnored() {
        var game = World2JustRightGame.make(seed: 9)
        for _ in 0..<World2JustRightGame.roundCount {
            _ = game.taste(bowlID: game.currentRound!.justRightBowlID!)
        }
        XCTAssertEqual(game.taste(bowlID: "bowl.temperature.justRight"), .ignored)
    }

    func testUnknownBowlIsIgnoredRatherThanCountedWrong() {
        var game = World2JustRightGame.make(seed: 13)
        XCTAssertEqual(game.taste(bowlID: "bowl.nope"), .ignored)
        XCTAssertEqual(game.wrongTastes, 0)
    }

    func testSeedShufflesBowlPositionsButNotTheirMeaning() {
        let a = World2JustRightGame.make(seed: 1)
        let b = World2JustRightGame.make(seed: 99)
        XCTAssertEqual(a.rounds.count, b.rounds.count)
        // Same ids exist in both; only their order on the table differs.
        for index in a.rounds.indices {
            XCTAssertEqual(
                Set(a.rounds[index].bowls.map(\.id)),
                Set(b.rounds[index].bowls.map(\.id))
            )
        }
        let orders = (0..<24).map { seed in
            World2JustRightGame.make(seed: UInt64(seed)).rounds[0].bowls.map(\.id)
        }
        XCTAssertGreaterThan(Set(orders).count, 1, "seeding should vary the table")
    }

    func testSeedIsReproducible() {
        XCTAssertEqual(
            World2JustRightGame.make(seed: 42).rounds.map { $0.bowls.map(\.id) },
            World2JustRightGame.make(seed: 42).rounds.map { $0.bowls.map(\.id) }
        )
    }

    func testPapaIsAlwaysTooMuchAndMamaAlwaysTooLittle() {
        XCTAssertEqual(World2Bear.bear(for: .tooMuch), .papa)
        XCTAssertEqual(World2Bear.bear(for: .tooLittle), .mama)
        XCTAssertEqual(World2Bear.bear(for: .justRight), .baby)
    }

    func testEachAttributeHasItsOwnComplaintWording() {
        let messages = World2JustRightAttribute.allCases.map { attribute in
            World2JustRightGame.tryAgainMessage(
                attribute: attribute,
                level: .tooMuch,
                bear: .papa
            )
        }
        XCTAssertEqual(Set(messages).count, World2JustRightAttribute.allCases.count)
        XCTAssertTrue(messages.contains { $0.contains("Too hot!") })
        XCTAssertTrue(messages.contains { $0.contains("Too big!") })
        XCTAssertTrue(messages.contains { $0.contains("Too sweet!") })
    }
}

// MARK: - Badges

final class InventoryBadgeTests: XCTestCase {
    func testNewBadgeAlwaysSortsFirst() {
        let ordered = World2InventoryBadge.forDisplay(
            [.starter, .questReward, .new],
            limit: 3
        )
        XCTAssertEqual(ordered.first, .new)
    }

    func testDisplayDeduplicatesAndLimits() {
        let ordered = World2InventoryBadge.forDisplay(
            [.new, .new, .oneOfAKind, .storyTreasure, .questReward]
        )
        XCTAssertEqual(ordered, [.new, .oneOfAKind])
    }

    func testEveryBadgeHasLabelAndSymbol() {
        for badge in World2InventoryBadge.allCases {
            XCTAssertFalse(badge.label.isEmpty)
            XCTAssertFalse(badge.symbolName.isEmpty)
        }
    }

    func testPorridgeCarriesTheNewAndOneOfAKindRibbons() {
        let porridge = World2StoryDecoration.perfectPorridge
        XCTAssertTrue(porridge.badges.contains(.new))
        XCTAssertTrue(porridge.badges.contains(.oneOfAKind))
        XCTAssertFalse(porridge.settledBadges.contains(.new))
        XCTAssertEqual(
            World2StoryDecoration.decoration(id: porridge.id)?.name,
            "Bowl of Perfect Porridge"
        )
    }

    func testArtGardenIsUnconnectedAndHostsCharacterStudio() {
        let scene = World2SceneCatalog.artGarden
        XCTAssertEqual(scene.id, WorldId.artGarden.sceneID)
        XCTAssertEqual(scene.backgroundAsset, "map.artGarden")
        XCTAssertTrue(
            scene.poiInstances.contains {
                $0.archetypeID == World2POIRegistry.characterStudioID
            }
        )
        XCTAssertTrue(
            scene.poiInstances.contains {
                $0.archetypeID == World2POIRegistry.sceneBuilderID
            }
        )
        XCTAssertEqual(World2POIRegistry.characterStudio.route, .characterStudio)
        XCTAssertEqual(World2POIRegistry.sceneBuilder.route, .sceneBuilder)
        XCTAssertEqual(
            World2POIRegistry.sceneBuilder.contract.grants,
            [.storyDecoration(decorationID: World2StoryDecoration.propertyDeed.id)]
        )
        XCTAssertTrue(
            WorldId.artGarden.direction == nil,
            "Art Garden must not advertise an overland travel direction"
        )
    }

    func testPropertyDeedIsStoryTreasureFromSceneBuilder() {
        let deed = World2StoryDecoration.propertyDeed
        XCTAssertEqual(deed.artStyle, .propertyDeed)
        XCTAssertEqual(deed.awardedByArchetypeID, World2POIRegistry.sceneBuilderID)
        XCTAssertEqual(
            World2StoryDecoration.decoration(id: deed.id)?.name,
            "Property Deed"
        )
    }

    func testWorldTeleporterIsUsableInventoryGear() {
        let teleporter = World2StoryDecoration.worldTeleporter
        XCTAssertEqual(teleporter.inventoryAction, .openWorldTeleporter)
        XCTAssertTrue(teleporter.isUsableFromInventory)
        XCTAssertEqual(
            World2StoryDecoration.decoration(id: teleporter.id)?.artStyle,
            .worldTeleporter
        )
    }
}
