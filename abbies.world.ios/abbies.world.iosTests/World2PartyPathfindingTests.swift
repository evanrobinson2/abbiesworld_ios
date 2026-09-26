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
        XCTAssertGreaterThanOrEqual(near, 0.85)
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
        XCTAssertLessThan(facingLeft[.daddy]?.x ?? 1, 0.5)
        XCTAssertEqual(
            facingLeft[.daddy]?.x ?? 0,
            facingRight[.daddy]?.x ?? 1,
            accuracy: 0.0001
        )
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

    func testClipsMatchTheirGaitNames() {
        XCTAssertEqual(World2PartyActorID.abbie.idleUSDZResourceName, "abbie_idle")
        XCTAssertEqual(World2PartyActorID.abbie.walkUSDZResourceName, "abbie")
        XCTAssertEqual(World2PartyActorID.abbie.walkClipHints.first, "Casual_Walk")
        XCTAssertEqual(World2PartyActorID.abbie.runUSDZResourceName, "abbie_run")
        XCTAssertEqual(World2PartyActorID.abbie.runClipHints.first, "Run_02")
        XCTAssertEqual(
            World2ActorSceneCoordinator.gait(forPresentedName: "Idle", actor: .abbie),
            .idle
        )
        XCTAssertEqual(
            World2ActorSceneCoordinator.gait(forPresentedName: "Casual_Walk", actor: .abbie),
            .walk
        )
        XCTAssertEqual(
            World2ActorSceneCoordinator.gait(forPresentedName: "Run_02", actor: .daddy),
            .run
        )
    }

    func testLeftStickMovesLeadAndPicksGait() {
        let start = World2PartyLandingContract.bottomLeftStaging
        let walked = World2PartyPathfinding.stickStep(
            lead: start,
            facingRight: true,
            heading: 0.72,
            move: World2StickVector(x: 0.4, y: 0),
            face: .zero,
            dt: 0.4
        )
        XCTAssertEqual(walked.gait, .walk)
        XCTAssertGreaterThan(walked.lead.x, start.x)
        XCTAssertLessThan(walked.stride, 1)

        let pushed = World2PartyPathfinding.stickStep(
            lead: start,
            facingRight: true,
            heading: 0.72,
            move: World2StickVector(x: 1, y: 0),
            face: World2StickVector(x: -1, y: 0),
            dt: 0.4
        )
        XCTAssertEqual(pushed.gait, .run)
        XCTAssertGreaterThan(pushed.lead.x - start.x, walked.lead.x - start.x)
        XCTAssertEqual(
            pushed.heading,
            World2PartyPathfinding.headingForTravel(dx: 1, dy: 0),
            accuracy: 0.05
        )

        let stopped = World2PartyPathfinding.stickStep(
            lead: pushed.lead,
            facingRight: pushed.facingRight,
            heading: pushed.heading,
            move: .zero,
            face: .zero,
            dt: 0.2
        )
        XCTAssertEqual(stopped.gait, .idle)
        XCTAssertEqual(stopped.lead.x, pushed.lead.x, accuracy: 0.0001)
    }
}
