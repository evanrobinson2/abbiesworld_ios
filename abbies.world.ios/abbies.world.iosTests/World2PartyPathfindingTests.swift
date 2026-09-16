import XCTest
@testable import abbies_world_ios

final class World2PartyPathfindingTests: XCTestCase {
    func testDurationScalesWithDistance() {
        let near = World2PartyPathfinding.duration(
            from: .init(x: 0.1, y: 0.9),
            to: .init(x: 0.2, y: 0.9)
        )
        let far = World2PartyPathfinding.duration(
            from: .init(x: 0.1, y: 0.9),
            to: .init(x: 0.9, y: 0.1)
        )
        XCTAssertGreaterThan(far, near)
        XCTAssertGreaterThanOrEqual(near, 0.35)
    }

    func testInterpolateEndsAtDestination() {
        let from = World2NormalizedPoint(x: 0.1, y: 0.9)
        let to = World2NormalizedPoint(x: 0.7, y: 0.3)
        let mid = World2PartyPathfinding.interpolate(from: from, to: to, progress: 0.5)
        let end = World2PartyPathfinding.interpolate(from: from, to: to, progress: 1)
        XCTAssertEqual(end.x, to.x, accuracy: 0.0001)
        XCTAssertEqual(end.y, to.y, accuracy: 0.0001)
        XCTAssertGreaterThan(mid.x, from.x)
        XCTAssertLessThan(mid.x, to.x)
    }

    func testApproachPointStandsSouthOfPOI() {
        let poi = World2NormalizedPoint(x: 0.5, y: 0.4)
        let approach = World2PartyPathfinding.approachPoint(forPOI: poi)
        XCTAssertEqual(approach.x, poi.x, accuracy: 0.0001)
        XCTAssertGreaterThan(approach.y, poi.y)
    }

    func testFormationKeepsDaddyTrailing() {
        let lead = World2NormalizedPoint(x: 0.5, y: 0.5)
        let facingRight = World2PartyPathfinding.formation(around: lead, facingRight: true)
        XCTAssertEqual(facingRight[.abbie]?.x ?? -1, 0.5, accuracy: 0.0001)
        XCTAssertLessThan(facingRight[.daddy]?.x ?? 1, 0.5)

        let facingLeft = World2PartyPathfinding.formation(around: lead, facingRight: false)
        XCTAssertGreaterThan(facingLeft[.daddy]?.x ?? 0, 0.5)
    }

    func testSceneExitFallsBackToDefaultLanding() {
        let exit = World2SceneExit(
            id: "exit.test",
            fromSceneID: "a",
            toSceneID: "b",
            name: "Door",
            summary: "test",
            x: 0.8,
            y: 0.5,
            createdAt: Date(),
            createdByPlayerID: "player.abbie"
        )
        XCTAssertEqual(
            exit.arrivalContract.landing,
            World2PartyLandingContract.bottomLeftStaging
        )
    }
}
