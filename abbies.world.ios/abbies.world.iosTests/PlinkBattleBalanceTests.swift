import XCTest
@testable import abbies_world_ios

final class PlinkBattleBalanceTests: XCTestCase {
    func testPegsNeverBleedSpeed_neutralIsWorst() {
        let blue = ContinuumPeg(id: 0, position: .zero, kind: .blue)
        let stone = ContinuumPeg(id: 1, position: .zero, kind: .stone)
        let orange = ContinuumPeg(id: 2, position: .zero, kind: .orange)
        XCTAssertEqual(blue.surfaceBounciness, 1.0, accuracy: 0.001)
        XCTAssertEqual(stone.surfaceBounciness, 1.0, accuracy: 0.001)
        XCTAssertEqual(orange.surfaceBounciness, 1.0, accuracy: 0.001)
        XCTAssertEqual(blue.forceKick, 0)
        XCTAssertEqual(stone.forceKick, 0)
        XCTAssertGreaterThan(orange.forceKick, 0)
    }

    func testFlyingAttackersBiteEveryTurn_groundMustApproach() {
        XCTAssertTrue(PlinkAttackerKind.cawScout.isFlying)
        XCTAssertTrue(PlinkAttackerKind.vulture.isFlying)
        XCTAssertFalse(PlinkAttackerKind.raze.isFlying)

        var ground = [
            PlinkBattleFoe(kind: .raze, maxHP: 40, lane: PeglinBattleRules.startingLane)
        ]
        let id = ground[0].id
        // First turns: advance only.
        for expected in stride(from: PeglinBattleRules.startingLane - 1, through: 1, by: -1) {
            let swing = PeglinBattleRules.resolveEnemyTurn(
                roster: &ground,
                frontID: id,
                role: .henchman
            )
            XCTAssertEqual(swing.damage, 0, "Should not melee while marching")
            XCTAssertEqual(ground[0].lane, expected)
        }
        let melee = PeglinBattleRules.resolveEnemyTurn(
            roster: &ground,
            frontID: id,
            role: .henchman
        )
        XCTAssertEqual(ground[0].lane, 0)
        XCTAssertGreaterThan(melee.damage, 0)

        var flyer = [
            PlinkBattleFoe(kind: .cawScout, maxHP: 24, lane: PeglinBattleRules.startingLane)
        ]
        let flyID = flyer[0].id
        let flySwing = PeglinBattleRules.resolveEnemyTurn(
            roster: &flyer,
            frontID: flyID,
            role: .henchman
        )
        XCTAssertEqual(flyer[0].lane, PeglinBattleRules.startingLane, "Flying does not march")
        XCTAssertGreaterThan(flySwing.damage, 0, "Flying bites every turn")
    }

    func testBalanceWinRatesMatchKidCurve() {
        // Headless continuum + approach rules — keep trial count CI-friendly.
        let reports = PlinkBattleBalance.reportClimb(trialsPerRole: 40, seed: 11)
        XCTAssertEqual(reports.count, 3)

        for report in reports {
            guard let band = PlinkBattleBalance.targetBands.first(where: { $0.role == report.role })
            else {
                XCTFail("Missing band for \(report.role)")
                continue
            }
            print(
                "balance \(report.role.rawValue): win=\(String(format: "%.0f%%", report.winRate * 100)) " +
                "rounds=\(String(format: "%.1f", report.meanRounds)) " +
                "hpLeft=\(String(format: "%.0f", report.meanHPLeftWhenWon))"
            )
            XCTAssertGreaterThanOrEqual(
                report.winRate + 0.001,
                band.minWinRate - 0.08,
                "\(report.role) too hard (\(report.winRate))"
            )
            XCTAssertLessThanOrEqual(
                report.winRate - 0.001,
                band.maxWinRate + 0.08,
                "\(report.role) too easy (\(report.winRate))"
            )
        }

        // Monotonic difficulty: hench ≥ mini ≥ boss (allow small noise).
        let hench = reports.first { $0.role == .henchman }!.winRate
        let mini = reports.first { $0.role == .miniBoss }!.winRate
        let boss = reports.first { $0.role == .bigBoss }!.winRate
        XCTAssertGreaterThanOrEqual(hench + 0.05, mini)
        XCTAssertGreaterThanOrEqual(mini + 0.05, boss)
    }
}
