import XCTest
@testable import abbies_world_ios

final class PlinkCavernSimTests: XCTestCase {
    func testCavernBoardIsDenseForceMajorityWithRails() {
        let level = BoardLevel.level(id: "peglin.cavernArcs")
        XCTAssertNotNil(level)
        guard let level else { return }

        XCTAssertGreaterThan(level.pegs.count, 80, "Peglin cavern should be dense")
        XCTAssertFalse(level.rails.isEmpty)
        XCTAssertEqual(level.buckets.count, 4)
        XCTAssertLessThan(level.pegRadius, 9, "Force pegs are the small ones")

        let oranges = level.pegs.filter { $0.kind == .orange }.count
        let stones = level.pegs.filter { $0.kind == .stone }.count
        XCTAssertGreaterThan(oranges, stones * 2, "Most pegs should be force/orange")
        XCTAssertGreaterThan(oranges, level.pegs.count / 2)
        XCTAssertTrue(level.pegs.contains { $0.kind == .refresh })
        XCTAssertTrue(level.pegs.contains { $0.kind == .bomb })
    }

    func testDefaultFightBoardIsCavern() {
        // Fox uses open paw-print lanes so the ball can shoot through.
        XCTAssertEqual(PeglinBattleRules.boardID(for: .foxSpirit), "fox.pawPrint")
        XCTAssertEqual(PeglinBattleRules.boardID(for: nil), "peglin.cavernArcs")
        XCTAssertEqual(BoardLevel.catalog.first?.id, "peglin.cavernArcs")
    }

    func testSingleShotTouchesRailsAndForcePegs() {
        let level = BoardLevel.level(id: "peglin.cavernArcs")!
        var pack = PlinkContinuum.materialize(
            level: level,
            size: CGSize(width: level.referenceWidth, height: level.referenceHeight),
            tuning: .default
        )
        let shot = PlinkRoundSimulator.simulateShot(
            aimOffset: 0.15,
            pegs: &pack.pegs,
            rails: pack.rails,
            config: pack.config,
            maxSeconds: 10
        )
        XCTAssertTrue(shot.hitFloor || shot.duration > 0.5)
        XCTAssertGreaterThan(shot.pegHits, 0, "Should collide with dense peg field")
        XCTAssertGreaterThan(shot.railHits, 0, "Radical geometry rails must participate")
        XCTAssertGreaterThan(shot.orangesLit, 0)
    }

    func testFullRoundSimulationClearsManyOrangesUnderTenSimSecondsPerShotBudget() {
        let level = BoardLevel.level(id: "peglin.cavernArcs")!
        // Fan aims across the board — enough to exercise a full Peglin-length round.
        var aims: [CGFloat] = []
        for i in 0..<24 {
            let t = CGFloat(i) / 23
            aims.append(-0.95 + 1.9 * t)
        }
        let result = PlinkRoundSimulator.simulateRound(
            level: level,
            aims: aims,
            maxShotSeconds: 10
        )

        XCTAssertGreaterThan(result.orangesCleared, 20)
        XCTAssertGreaterThan(result.totalPegHits, 30)
        XCTAssertLessThan(result.wallClockMs, 8_000, "Headless full round must be fast enough for CI")
        // Peglin play is ~10s/shot ceiling; sim seconds accumulate across shots.
        XCTAssertLessThan(result.simulatedSeconds, CGFloat(aims.count) * 10 + 1)
        print("Cavern round: cleared \(result.orangesCleared)/\(result.orangesCleared + result.orangesRemaining) oranges, \(result.shots.count) shots, \(Int(result.wallClockMs))ms")
    }

    func testRailCollisionPreservesTangentialSpeed() {
        var pos = CGPoint(x: 100, y: 100)
        var vel = CGVector(dx: 200, dy: -50)
        let rails = [
            ContinuumRail(
                points: [CGPoint(x: 0, y: 90), CGPoint(x: 200, y: 90)],
                halfWidth: 8
            )
        ]
        // Place ball overlapping the rail from above.
        pos = CGPoint(x: 100, y: 95)
        let hit = PlinkContinuum.collideRails(
            pos: &pos,
            vel: &vel,
            r: 10,
            rails: rails,
            wallE: 1.0
        )
        XCTAssertTrue(hit)
        XCTAssertGreaterThan(pos.y, 90)
        // Tangential (x) component should survive zero-friction slide.
        XCTAssertGreaterThan(abs(vel.dx), 100)
    }

    func testForcePegKickIsNonZeroWhileWorldBumperIsZero() {
        XCTAssertEqual(PhysicsPreset.salon.tuning.bumperKick, 0)
        let force = ContinuumPeg(id: 0, position: .zero, kind: .orange)
        let stone = ContinuumPeg(id: 1, position: .zero, kind: .stone)
        XCTAssertGreaterThan(force.forceKick, 40)
        XCTAssertEqual(stone.forceKick, 0)
    }

    /// Evan physics rule: head-on under-peg hit must not rebound straight up (+Y).
    func testBounceFromHeadOnUnderPegIsNotStraightUp() {
        let config = ContinuumConfig(
            size: CGSize(width: 400, height: 600),
            pegRadius: 10,
            ballRadius: 8,
            tuning: .default
        )
        let pegPos = CGPoint(x: 200, y: 300)
        // Ball approaching from below along the peg's +Y normal.
        let inbound = CGVector(dx: 0, dy: -400)
        let normal = CGVector(dx: 0, dy: 1)
        let out = PlinkContinuum.bounce(
            ballVel: inbound,
            pegPos: pegPos,
            normal: normal,
            pegSurface: 0.8,
            forceKick: 0,
            config: config
        )
        XCTAssertGreaterThan(out.vel.dy, 0, "Should rebound upward")
        let speed = hypot(out.vel.dx, out.vel.dy)
        XCTAssertGreaterThan(speed, 1)
        let lateralFrac = abs(out.vel.dx) / speed
        XCTAssertGreaterThanOrEqual(
            lateralFrac,
            PlinkContinuum.minUpwardLateralFraction - 0.001,
            "Outbound must leave the straight-up cone (~\(PlinkContinuum.straightUpConeDegrees)°)"
        )
        // Direct clamp unit check: pure +Y gets a lateral kick.
        var pureUp = CGVector(dx: 0, dy: 500)
        PlinkContinuum.avoidStraightUpVelocity(&pureUp, preferredSign: 1)
        XCTAssertGreaterThan(abs(pureUp.dx), 0)
        XCTAssertEqual(hypot(pureUp.dx, pureUp.dy), 500, accuracy: 0.5)
    }
}
