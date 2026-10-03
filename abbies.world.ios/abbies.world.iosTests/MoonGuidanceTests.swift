//
//  MoonGuidanceTests.swift
//  abbies.world.iosTests
//

import XCTest
@testable import abbies_world_ios

final class MoonGuidanceTests: XCTestCase {
    func testRouteResolves() {
        XCTAssertEqual(World2POIRoute.resolved(from: "moonGuidance"), .moonGuidance)
        XCTAssertEqual(World2POIRoute.resolved(from: "moonBase"), .moonBase)
        XCTAssertEqual(World2POIRoute.moonGuidance.minigameConfigurationID, "moon_guidance")
    }

    func testMoonBaseWorldGate() {
        XCTAssertTrue(WorldId.moonBase.requiresUnlock)
        XCTAssertNotNil(WorldId.moonBase.unlockHint)
        XCTAssertEqual(WorldId.moonBase.sceneID, "scene.moonBase")
    }

    func testRegistryAndCatalog() {
        XCTAssertNotNil(World2POIRegistry.archetype(World2POIRegistry.moonRocketID))
        XCTAssertEqual(
            World2POIRegistry.archetype(World2POIRegistry.moonRocketID)?.contract.route,
            .moonGuidance
        )
        let home = World2SceneCatalog.scene(for: .home)
        XCTAssertTrue(
            home?.poiInstances.contains { $0.archetypeID == World2POIRegistry.moonRocketID } == true
        )
        XCTAssertNotNil(World2SceneCatalog.scene(for: .moonBase))
    }

    @MainActor
    func testLandForMeCompletesWithoutPunishment() {
        let model = MoonGuidanceViewModel()
        model.start()
        model.markAttemptsForBypassOffer()
        XCTAssertTrue(model.state.showsLandForMe)
        model.landForMe()
        XCTAssertEqual(model.state.phase, .landed)
    }

    @MainActor
    func testResetKeepsReadyPhase() {
        let model = MoonGuidanceViewModel()
        model.start()
        model.resetApproach(clearAttempts: true)
        XCTAssertEqual(model.state.phase, .ready)
        XCTAssertEqual(model.state.attemptCount, 0)
    }
}
