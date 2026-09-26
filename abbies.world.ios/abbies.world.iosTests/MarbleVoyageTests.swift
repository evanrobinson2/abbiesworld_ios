import XCTest
import UIKit
@testable import abbies_world_ios

final class MarbleVoyageTests: XCTestCase {
    func testCampaignGangChartStructure() {
        let run = MarbleVoyageRun.make(mode: .campaign, seed: 42)
        XCTAssertEqual(run.mode, .campaign)
        XCTAssertEqual(run.currentNodeID, "start")
        XCTAssertEqual(run.playerHP, MarbleVoyageRun.defaultMaxHP)

        // Linear climb: 3 lands × (3 POI fights + land boss) = 12 fight nodes, then the summit boss.
        let fights = run.nodes.filter { $0.kind == .fight }
        let bosses = run.nodes.filter { $0.kind == .boss }
        XCTAssertEqual(fights.count, 12)
        XCTAssertEqual(bosses.count, 1)
        XCTAssertEqual(fights.count + bosses.count, MarbleVoyageRun.campaignTotalFights)
        // One start node plus every fight, chained one after another.
        XCTAssertEqual(run.nodes.count, MarbleVoyageRun.campaignTotalFights + 1)
        XCTAssertEqual(run.edges.count, MarbleVoyageRun.campaignTotalFights)

        XCTAssertEqual(run.gang.miniBossOrder.count, MarbleVoyageRun.gangMiniArcCount)
        XCTAssertFalse(run.gang.miniBossOrder.contains(run.gang.bigBoss))
        XCTAssertTrue(PlinkAttackerKind.namedCrew.contains(run.gang.bigBoss))

        let boss = bosses.first!
        XCTAssertEqual(boss.id, "boss")
        XCTAssertEqual(boss.gangRole, .bigBoss)
        XCTAssertEqual(boss.waveAttacker, run.gang.bigBoss)
        XCTAssertTrue(boss.waveAttacker?.isNamedCrew == true)
        XCTAssertEqual(run.attackerPortraitScale(for: boss), MarbleVoyageGangRun.bigBossPortraitScale)
        XCTAssertEqual(
            run.enemyMaxHP(for: boss),
            (220 + boss.threat * 40) * MarbleVoyageGangRun.bigBossCageHPMultiplier
        )

        let landBoss = run.node("land0_boss")!
        XCTAssertEqual(landBoss.kind, .fight)
        XCTAssertEqual(landBoss.gangRole, .miniBoss)
        XCTAssertEqual(landBoss.waveAttacker, run.gang.miniBossOrder[0])
        XCTAssertEqual(landBoss.miniArcIndex, 0)
        XCTAssertEqual(run.attackerPortraitScale(for: landBoss), 1.25)

        let hench = run.node("land0_poi1")!
        XCTAssertEqual(hench.gangRole, .henchman)
        XCTAssertEqual(hench.miniArcIndex, 0)
        XCTAssertFalse(hench.waveAttacker?.isNamedCrew == true)
        XCTAssertTrue(MarbleVoyageGangRun.henchmenPool.contains(hench.waveAttacker!))

        XCTAssertEqual(hench.title, "L1 POI1 Warmup")
        XCTAssertEqual(run.node("land0_poi2")?.title, "L1 POI2 Battle")
        XCTAssertEqual(run.node("land0_poi3")?.title, "L1 POI3 Hard")
        XCTAssertEqual(landBoss.title, "L1 Boss · \(run.gang.miniBossOrder[0].shortName)")
        XCTAssertEqual(run.node("land1_poi1")?.title, "L2 POI1 Warmup")
        XCTAssertEqual(
            run.node("land2_boss")?.title,
            "L3 Boss · \(run.gang.miniBossOrder[2].shortName)"
        )
        XCTAssertEqual(boss.title, "Summit · \(run.gang.bigBoss.shortName)")

        // Linear: exactly one way forward at every landing.
        let choices = run.reachableChoices()
        XCTAssertEqual(choices.count, 1)
        XCTAssertEqual(choices.first?.id, "land0_poi1")
    }

    func testCampaignShopOpensAfterEveryNonSummitFight() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 11)
        run.choose("land0_poi1")
        run.finishFight(won: true, remainingHP: 100, goldEarned: 40)

        XCTAssertEqual(run.phase, .shop(afterNodeID: "land0_poi1"))
        XCTAssertEqual(run.coins, 40)
        XCTAssertNotNil(run.shop)
        XCTAssertEqual(run.shopVisitCount, 1)

        XCTAssertEqual(run.applyShop(.heal), .ok(message: "Bell balm · +20 HP"))
        XCTAssertEqual(run.playerHP, 120)
        XCTAssertEqual(run.coins, 15)

        XCTAssertEqual(run.applyShop(.heal), .alreadyMaxed)
        XCTAssertEqual(run.applyShop(.ballUpgrade), .cannotAfford)

        run.leaveShop()
        XCTAssertEqual(run.phase, .map)
        XCTAssertNil(run.shop)
        XCTAssertEqual(run.record.shops.count, 1)
        XCTAssertEqual(run.record.shops[0].walletBefore, 40)
        XCTAssertEqual(run.record.shops[0].walletAfter, 15)
    }

    func testShopBallUpgradeRaisesLowestMarble() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 12)
        run.choose("land0_poi1")
        run.finishFight(won: true, remainingHP: 120, goldEarned: 60)

        let before = run.marbleCollection.map(\.clampedLevel)
        XCTAssertEqual(run.applyShop(.ballUpgrade), .ok(
            message: "\(run.marbleCollection[0].orb.name) is now Lv2"
        ))
        XCTAssertEqual(run.ballLevel, 2)
        XCTAssertEqual(run.marbleCollection[0].clampedLevel, 2)
        XCTAssertEqual(Array(run.marbleCollection.dropFirst()).map(\.clampedLevel),
                       Array(before.dropFirst()))
        XCTAssertGreaterThan(run.fightDamageMultiplier, 1.0)
    }

    func testGangRunSeedIsDeterministicAndCoversCrew() {
        let a = MarbleVoyageGangRun.make(seed: 99)
        let b = MarbleVoyageGangRun.make(seed: 99)
        XCTAssertEqual(a, b)
        let crew = Set(PlinkAttackerKind.namedCrew)
        XCTAssertEqual(Set([a.bigBoss] + a.miniBossOrder), crew)

        let other = MarbleVoyageGangRun.make(seed: 100)
        // Different seeds usually pick a different boss; tolerate rare collision.
        XCTAssertEqual(Set([other.bigBoss] + other.miniBossOrder), crew)
    }

    func testEndlessStartsWithFightChoicesAndGrows() {
        var run = MarbleVoyageRun.make(mode: .endless, seed: 7)
        XCTAssertEqual(run.mode, .endless)
        let first = run.reachableChoices()
        XCTAssertEqual(first.count, 2)
        XCTAssertEqual(Set(first.map(\.kind)), [.fight])
        XCTAssertEqual(first[0].gangRole, .henchman)
        run.choose(first[0].id)
        run.finishFight(won: true, remainingHP: 90)
        XCTAssertEqual(run.phase, .shop(afterNodeID: first[0].id))
        run.leaveShop()
        XCTAssertEqual(run.phase, .map)
        XCTAssertEqual(run.fightsCleared, 1)
        let next = run.reachableChoices()
        XCTAssertFalse(next.isEmpty)
        XCTAssertEqual(Set(next.map(\.kind)).intersection([.treasure, .mystery, .shrine]).count, next.count)
    }

    func testFightWinCarriesHPWithoutHeal() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 1)
        run.choose("land0_poi1")
        XCTAssertEqual(run.phase, .fight(nodeID: "land0_poi1"))
        XCTAssertEqual(run.pathTaken.count, 1)
        XCTAssertEqual(run.pathTaken.first?.from, "start")
        XCTAssertEqual(run.pathTaken.first?.to, "land0_poi1")
        XCTAssertTrue(run.didTraverse(from: "start", to: "land0_poi1"))
        XCTAssertFalse(run.didTraverse(from: "start", to: "land0_poi2"))
        run.finishFight(won: true, remainingHP: 77)
        XCTAssertEqual(run.playerHP, 77)
        XCTAssertTrue(run.lastEventLine.contains("77"))
        // Shop first, then back on the chart — the fight never free-heals.
        XCTAssertEqual(run.phase, .shop(afterNodeID: "land0_poi1"))
        run.leaveShop()
        XCTAssertEqual(run.phase, .map)
        XCTAssertEqual(run.playerHP, 77)
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
        run.choose("land0_poi1")
        run.finishFight(won: false, remainingHP: 0)
        XCTAssertEqual(run.phase, .defeat)
        XCTAssertEqual(run.playerHP, 0)
    }

    func testBossVictoryEndsCampaign() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 4)
        run.currentNodeID = "boss"
        run.visited.insert("boss")
        run.phase = .fight(nodeID: "boss")
        run.fightsCleared = 12
        run.finishFight(won: true, remainingHP: 20, goldEarned: 30)
        XCTAssertEqual(run.phase, .victory)
        XCTAssertEqual(run.fightsCleared, 13)
        XCTAssertEqual(run.coins, 30)
        XCTAssertTrue(run.lastEventLine.contains(run.gang.bigBoss.displayName))
        XCTAssertEqual(run.record.outcome, .victory)
    }

    func testEnemyHPAndAttackScaleWithThreat() {
        let run = MarbleVoyageRun.make(mode: .campaign, seed: 5)
        let easy = run.node("land0_poi1")!
        let mid = run.node("land1_boss")!
        let boss = run.node("boss")!
        XCTAssertLessThan(run.enemyMaxHP(for: easy), run.enemyMaxHP(for: mid))
        XCTAssertLessThan(run.enemyMaxHP(for: mid), run.enemyMaxHP(for: boss))
        XCTAssertLessThanOrEqual(run.enemyAttack(for: easy), run.enemyAttack(for: mid))
        XCTAssertLessThanOrEqual(run.enemyAttack(for: mid), run.enemyAttack(for: boss))
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
        // Art-leads tall aspect, but must use most of the landscape width (no huge side gutters).
        XCTAssertGreaterThanOrEqual(content.width, 1180 * 0.70)
        XCTAssertLessThanOrEqual(content.width, 1180 * 0.92)
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

    func testPlayerAndGameStatsAccumulateSeparately() {
        UserDefaults.standard.removeObject(forKey: "marbleVoyage.stats.v1")
        defer { UserDefaults.standard.removeObject(forKey: "marbleVoyage.stats.v1") }

        MarbleVoyagePlayerStats.recordFightWin(
            playerKey: "profile.abbie",
            isMiniBoss: true,
            isBigBoss: false,
            fightsClearedAfter: 3,
            mode: .campaign
        )
        MarbleVoyagePlayerStats.recordFightWin(
            playerKey: "profile.abbie",
            isMiniBoss: false,
            isBigBoss: true,
            fightsClearedAfter: 10,
            mode: .campaign
        )
        MarbleVoyagePlayerStats.recordHeal(playerKey: "profile.evan")

        let abbie = MarbleVoyagePlayerStats.load(playerKey: "profile.abbie")
        let evan = MarbleVoyagePlayerStats.load(playerKey: "profile.evan")
        let game = MarbleVoyagePlayerStats.loadGame()

        XCTAssertEqual(abbie.fightsWon, 2)
        XCTAssertEqual(abbie.miniBossesBeaten, 1)
        XCTAssertEqual(abbie.bigBossesBeaten, 1)
        XCTAssertEqual(abbie.campaignClears, 1)
        XCTAssertEqual(evan.healsFound, 1)
        XCTAssertEqual(evan.fightsWon, 0)
        XCTAssertEqual(game.fightsWon, 2)
        XCTAssertEqual(game.healsFound, 1)
        XCTAssertEqual(game.bigBossesBeaten, 1)
    }
}
