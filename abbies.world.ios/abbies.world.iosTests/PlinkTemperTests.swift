import XCTest
@testable import abbies_world_ios

final class PlinkTemperTests: XCTestCase {
    func testTriangleMatchups() {
        XCTAssertEqual(PlinkTemper.brawl.matchup(against: .swift), .strong)
        XCTAssertEqual(PlinkTemper.brawl.matchup(against: .craft), .soft)
        XCTAssertEqual(PlinkTemper.swift.matchup(against: .craft), .strong)
        XCTAssertEqual(PlinkTemper.craft.matchup(against: .brawl), .strong)
        XCTAssertEqual(PlinkTemper.brawl.matchup(against: .brawl), .normal)
    }

    func testDamageFactors() {
        XCTAssertEqual(PlinkTemper.brawl.damageFactor(against: .swift), 1.35, accuracy: 0.001)
        XCTAssertEqual(PlinkTemper.brawl.damageFactor(against: .craft), 0.75, accuracy: 0.001)
        XCTAssertEqual(PlinkTemper.brawl.damageFactor(against: .brawl), 1.0, accuracy: 0.001)
    }

    func testCrewTempers() {
        XCTAssertEqual(PlinkAttackerKind.raze.temper, .brawl)
        XCTAssertEqual(PlinkAttackerKind.vix.temper, .swift)
        XCTAssertEqual(PlinkAttackerKind.morrow.temper, .craft)
        XCTAssertEqual(PlinkAttackerKind.nib.temper, .swift)
    }

    func testOrbTempers() {
        XCTAssertEqual(OrbKind.pebble.temper, .brawl)
        XCTAssertEqual(OrbKind.zipbolt.temper, .swift)
        XCTAssertEqual(OrbKind.puff.temper, .craft)
        XCTAssertEqual(OrbKind.sparkle.temper, .brawl)
    }

    func testBattleTipsAreNonEmpty() {
        for kind in PlinkAttackerKind.allCases {
            XCTAssertFalse(kind.battleTip.isEmpty, kind.rawValue)
            XCTAssertTrue(kind.temperTipLine.contains("Strong vs"))
        }
    }

    func testShotDamageAppliesTemper() {
        let pebble = MarbleVoyageOwnedMarble.make(orbID: OrbKind.pebble.id, level: 1)
        let vsSwift = MarbleVoyageMarbleRules.shotDamageMultiplier(
            marble: pebble, ballLevel: 1, foeTemper: .swift
        )
        let vsCraft = MarbleVoyageMarbleRules.shotDamageMultiplier(
            marble: pebble, ballLevel: 1, foeTemper: .craft
        )
        XCTAssertGreaterThan(vsSwift, vsCraft)
        XCTAssertEqual(vsSwift / vsCraft, 1.35 / 0.75, accuracy: 0.01)
    }

    func testBoardPicksByRoleAndTemper() {
        XCTAssertEqual(
            PeglinBattleRules.boardID(forAttacker: .raze, role: .bigBoss),
            "peglin.cavernArcs"
        )
        XCTAssertEqual(
            PeglinBattleRules.boardID(forAttacker: .vix, role: .miniBoss),
            "fox.lanternRings"
        )
        XCTAssertEqual(
            PeglinBattleRules.boardID(forAttacker: .porcupineBoxer, role: .henchman),
            "fox.pawPrint"
        )
    }

    func testEconomyRewardsUpgradeOverImpulseBuy() {
        let e = MarbleVoyageEconomyTuning.recommended
        XCTAssertLessThan(e.ballUpgradePrice, e.buyMarblePrice)
        XCTAssertGreaterThan(e.destroyRefund, 10)
        XCTAssertGreaterThanOrEqual(e.goldPegValue, 7)
    }

    func testBagStanceTipMentionsMatchup() {
        let bag = (0..<4).map { _ in MarbleVoyageOwnedMarble.make(orbID: OrbKind.zipbolt.id) }
        let tip = PlinkTemperRules.bagTip(collection: bag, foe: .craft)
        XCTAssertTrue(tip.contains("Strong") || tip.lowercased().contains("strong"))
        let soft = PlinkTemperRules.bagTip(collection: bag, foe: .brawl)
        XCTAssertTrue(soft.lowercased().contains("soft"))
    }
}
