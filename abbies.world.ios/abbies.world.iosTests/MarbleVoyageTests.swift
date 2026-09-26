import XCTest
import UIKit
@testable import abbies_world_ios

final class MarbleVoyageTests: XCTestCase {
    func testCampaignHasShortChartAndBizarroBoss() {
        let run = MarbleVoyageRun.make(mode: .campaign, seed: 42)
        XCTAssertEqual(run.mode, .campaign)
        XCTAssertEqual(run.currentNodeID, "start")
        XCTAssertEqual(run.playerHP, MarbleVoyageRun.defaultMaxHP)
        let fights = run.nodes.filter { $0.kind == .fight }
        let bosses = run.nodes.filter { $0.kind == .boss }
        // 2 branched fight columns (4) + 1 mixed fight = 5
        XCTAssertEqual(fights.count, 5)
        XCTAssertEqual(bosses.count, 1)
        XCTAssertEqual(bosses.first?.enemyKind, .bizarroAbbie)
        XCTAssertEqual(bosses.first?.title, "Bizarro Abbie")
        let choices = run.reachableChoices()
        XCTAssertEqual(choices.count, 2)
        XCTAssertEqual(Set(choices.map(\.kind)), [.fight])
    }

    func testEndlessStartsWithFightChoicesAndGrows() {
        var run = MarbleVoyageRun.make(mode: .endless, seed: 7)
        XCTAssertEqual(run.mode, .endless)
        let first = run.reachableChoices()
        XCTAssertEqual(first.count, 2)
        XCTAssertEqual(Set(first.map(\.kind)), [.fight])
        run.choose(first[0].id)
        run.finishFight(won: true, remainingHP: 90)
        XCTAssertEqual(run.phase, .map)
        XCTAssertEqual(run.fightsCleared, 1)
        let next = run.reachableChoices()
        XCTAssertFalse(next.isEmpty)
        XCTAssertEqual(Set(next.map(\.kind)).intersection([.treasure, .mystery, .shrine]).count, next.count)
    }

    func testFightWinCarriesHPWithoutHeal() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 1)
        run.choose("s1a")
        XCTAssertEqual(run.phase, .fight(nodeID: "s1a"))
        XCTAssertEqual(run.pathTaken.count, 1)
        XCTAssertEqual(run.pathTaken.first?.from, "start")
        XCTAssertEqual(run.pathTaken.first?.to, "s1a")
        XCTAssertTrue(run.didTraverse(from: "start", to: "s1a"))
        XCTAssertFalse(run.didTraverse(from: "start", to: "s1b"))
        run.finishFight(won: true, remainingHP: 77)
        XCTAssertEqual(run.playerHP, 77)
        XCTAssertEqual(run.phase, .map)
        XCTAssertTrue(run.lastEventLine.contains("77"))
    }

    func testHealOnlyFromEventEffects() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 2)
        run.playerHP = 50
        run.applyEvent(.init(message: "Bell Balm", hpDelta: 24))
        XCTAssertEqual(run.playerHP, 74)
        run.applyEvent(.init(message: "Sting", hpDelta: -16))
        XCTAssertEqual(run.playerHP, 58)
    }

    func testDefeatOnZeroHP() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 3)
        run.choose("s1b")
        run.finishFight(won: false, remainingHP: 0)
        XCTAssertEqual(run.phase, .defeat)
        XCTAssertEqual(run.playerHP, 0)
    }

    func testBossVictoryEndsCampaign() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 4)
        run.currentNodeID = "boss"
        run.visited.insert("boss")
        run.phase = .fight(nodeID: "boss")
        run.fightsCleared = 2
        run.finishFight(won: true, remainingHP: 20)
        XCTAssertEqual(run.phase, .victory)
        XCTAssertEqual(run.fightsCleared, 3)
    }

    func testEnemyHPAndAttackScaleWithThreat() {
        let run = MarbleVoyageRun.make(mode: .campaign, seed: 5)
        let easy = run.node("s1a")!
        let hard = run.node("s3fight")!
        let boss = run.node("boss")!
        XCTAssertLessThan(run.enemyMaxHP(for: easy), run.enemyMaxHP(for: hard))
        XCTAssertLessThan(run.enemyMaxHP(for: hard), run.enemyMaxHP(for: boss))
        XCTAssertLessThanOrEqual(run.enemyAttack(for: easy), run.enemyAttack(for: hard))
        XCTAssertLessThanOrEqual(run.enemyAttack(for: hard), run.enemyAttack(for: boss))
    }

    func testEndlessAttackClimbsWithClears() {
        var run = MarbleVoyageRun.make(mode: .endless, seed: 9)
        let early = run.reachableChoices()[0]
        let atkEarly = run.enemyAttack(for: early)
        run.fightsCleared = 20
        let atkLate = run.enemyAttack(for: early)
        XCTAssertGreaterThan(atkLate, atkEarly)
    }

    func testArtCatalogCoversEnemies() {
        XCTAssertFalse(MarbleVoyageArt.fightPlate(enemy: .foxSpirit).isEmpty)
        XCTAssertEqual(MarbleVoyageArt.eventAccentIcon(.shrine), "cross.circle.fill")
        XCTAssertEqual(MarbleVoyageArt.fullTitle, "Abbie's World · Marble Voyage")
        XCTAssertEqual(MarbleVoyageArt.logoAsset, "logo.abbiesWorld")
        XCTAssertEqual(MarbleVoyageArt.alternateTitleCatalogNames.count, 3)
        XCTAssertEqual(MarbleVoyageArt.fightPlate(enemy: .bizarroAbbie), "map.peglin.crashLand")
        XCTAssertEqual(MarbleVoyageArt.chartBackdrop, "map.marbleVoyage.climb")
        XCTAssertEqual(PeglinBattleRules.boardID(for: .foxSpirit), "fox.pawPrint")
    }

    func testClimbPosterAspectIsTallAndBundled() {
        let image = UIImage(named: MarbleVoyageClimbMap.catalogName)
        XCTAssertNotNil(image, "Climb island poster must be bundled")
        guard let image else { return }
        let ratio = image.size.width / image.size.height
        XCTAssertLessThan(ratio, 0.5, "Climb poster is a tall scroll backdrop, not 4:3")
        let content = MarbleVoyageClimbMap.contentSize(in: CGSize(width: 1180, height: 700))
        // Must stay a tall portrait column — not stretched to full landscape width.
        XCTAssertLessThan(content.width, 1180 * 0.75)
        XCTAssertGreaterThan(content.height / content.width, 2.5)
        XCTAssertEqual(
            content.width / content.height,
            MarbleVoyageClimbMap.aspectWidthOverHeight,
            accuracy: 0.02
        )
    }

    func testRescueMoodLadder() {
        XCTAssertEqual(PeglinRescueMood.state(cageFractionRemaining: 1.0), .defeated)
        XCTAssertEqual(PeglinRescueMood.state(cageFractionRemaining: 0.55), .hurt)
        XCTAssertEqual(PeglinRescueMood.state(cageFractionRemaining: 0.30), .idle)
        XCTAssertEqual(PeglinRescueMood.state(cageFractionRemaining: 0.10), .sneakyWink)
        XCTAssertEqual(PeglinRescueMood.state(cageFractionRemaining: 0), .happy)
    }

    func testPowerIconsAreCircularCatalog() {
        XCTAssertEqual(PlinkPowerUp.refresh.catalogIconName, "world2_plink_power_icon_refresh")
        XCTAssertEqual(PlinkPowerUp.fire.chipAssetID, "ui.plink.power.icon.fire")
        XCTAssertEqual(PlinkPowerUp.split.title, "Split")
        XCTAssertEqual(PlinkPowerUp.fire.title, "Fire")
    }

    func testDeckReadyThresholdAndCap() {
        XCTAssertEqual(PeglinBattleRules.maxDeckCount, 10)
        XCTAssertEqual(PeglinBattleRules.readyDeckCount, 3)
        XCTAssertEqual(PeglinBattleRules.mixFillCount, 10)
    }

    func testGalleryUnlocksTitlePlatesAndTrophies() {
        let key = MarbleVoyageGallery.storageKey
        UserDefaults.standard.removeObject(forKey: key)
        defer { UserDefaults.standard.removeObject(forKey: key) }

        var gallery = MarbleVoyageGallery.starter
        XCTAssertTrue(gallery.isPlateUnlocked(.skyDock))
        XCTAssertTrue(gallery.isPlateUnlocked(.coralCliffs))
        XCTAssertFalse(gallery.isPlateUnlocked(.pinkGrove))

        let first = gallery.recordFightWin(isBoss: false, enemyIsBizarro: false, fightsClearedAfter: 1, mode: .campaign)
        XCTAssertTrue(gallery.isTrophyEarned(.firstSpirit))
        XCTAssertTrue(first.trophies.contains(.firstSpirit))

        _ = gallery.recordFightWin(isBoss: false, enemyIsBizarro: false, fightsClearedAfter: 3, mode: .campaign)
        XCTAssertTrue(gallery.isPlateUnlocked(.pinkGrove))
        XCTAssertTrue(gallery.isTrophyEarned(.threeClear))

        let boss = gallery.recordFightWin(isBoss: true, enemyIsBizarro: true, fightsClearedAfter: 4, mode: .campaign)
        XCTAssertTrue(gallery.isPlateUnlocked(.skyMeadow))
        XCTAssertTrue(gallery.isTrophyEarned(.campaignCrown))
        XCTAssertTrue(gallery.isTrophyEarned(.bizarroMirror))
        XCTAssertTrue(gallery.isTrophyEarned(.titleCollector))
        XCTAssertFalse(boss.plates.isEmpty || boss.trophies.isEmpty)

        let heal = gallery.recordHealEvent()
        XCTAssertTrue(gallery.isTrophyEarned(.blessingBell))
        XCTAssertEqual(heal.trophies.first, .blessingBell)
    }
}
