import XCTest
@testable import abbies_world_ios

final class MarbleVoyageHeroLevelTests: XCTestCase {
    func testFight1WinUsuallyReachesLevel2() {
        let xp = MarbleVoyageHeroLevel.fightWinXP(
            role: .henchman,
            wave: .porcupineBoxer,
            focus: .porcupineBoxer,
            seed: 1
        )
        // Participation 20 + 7×8 ground ≈ 76 (creep wave of 7).
        XCTAssertGreaterThanOrEqual(xp, 70)
        let grant = MarbleVoyageHeroLevel.apply(xp: xp, level: 1, xpIntoLevel: 0)
        XCTAssertGreaterThanOrEqual(grant.newLevel, 2)
        XCTAssertEqual(grant.levelsGained, grant.newLevel - 1)
    }

    func testDamageMultStepsFivePercent() {
        XCTAssertEqual(MarbleVoyageHeroLevel.damageMultiplier(level: 1), 1.0, accuracy: 0.001)
        XCTAssertEqual(MarbleVoyageHeroLevel.damageMultiplier(level: 2), 1.05, accuracy: 0.001)
        XCTAssertEqual(MarbleVoyageHeroLevel.damageMultiplier(level: 10), 1.45, accuracy: 0.001)
    }

    func testOddLevelsGrantMaxHP() {
        XCTAssertEqual(MarbleVoyageHeroLevel.maxHPBonusOnReach(level: 2), 0)
        XCTAssertEqual(MarbleVoyageHeroLevel.maxHPBonusOnReach(level: 3), 8)
        XCTAssertEqual(MarbleVoyageHeroLevel.maxHPBonusOnReach(level: 5), 8)
    }

    func testRunAwardsXPOnFightWin() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 42)
        let fight = run.nodes.first { $0.kind == .fight && $0.gangRole == .henchman }
        XCTAssertNotNil(fight)
        run.currentNodeID = fight!.id
        run.phase = .fight(nodeID: fight!.id)
        run.finishFight(won: true, remainingHP: 100, goldEarned: 20)
        XCTAssertGreaterThanOrEqual(run.heroLevel, 2)
        XCTAssertTrue(run.lastEventLine.contains("XP"))
    }

    func testFightDamageIncludesHeroLevel() {
        let marble = MarbleVoyageOwnedMarble.make(orbID: OrbKind.sparkle.id, level: 1)
        let low = MarbleVoyageMarbleRules.fightDamageMultiplier(
            collection: [marble],
            ballLevel: 1,
            heroLevel: 1
        )
        let high = MarbleVoyageMarbleRules.fightDamageMultiplier(
            collection: [marble],
            ballLevel: 1,
            heroLevel: 5
        )
        XCTAssertGreaterThan(high, low)
        XCTAssertEqual(high / low, MarbleVoyageHeroLevel.damageMultiplier(level: 5), accuracy: 0.001)
    }

    func testEventGrantsXP() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 7)
        let shrine = run.nodes.first { $0.kind == .shrine }
            ?? run.nodes.first { $0.kind == .treasure || $0.kind == .mystery }
        guard let node = shrine else {
            XCTFail("expected an event node")
            return
        }
        run.currentNodeID = node.id
        run.phase = .event(nodeID: node.id)
        let before = run.heroXPIntoLevel + run.heroLevel * 1000
        run.applyEvent(.init(message: "Test", hpDelta: 0, coinDelta: 5))
        let after = run.heroXPIntoLevel + run.heroLevel * 1000
        XCTAssertGreaterThan(after, before)
    }

    func testFinishFightAwardsComboXP() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 42)
        let fight = run.nodes.first { $0.kind == .fight && $0.gangRole == .henchman }
        XCTAssertNotNil(fight)
        run.currentNodeID = fight!.id
        run.phase = .fight(nodeID: fight!.id)
        let before = run.heroXPIntoLevel + run.heroLevel * 1_000
        run.finishFight(won: true, remainingHP: 100, goldEarned: 20, comboXP: 20)
        let after = run.heroXPIntoLevel + run.heroLevel * 1_000
        XCTAssertGreaterThan(after, before)
        XCTAssertTrue(run.lastEventLine.lowercased().contains("combo"))
    }
}
