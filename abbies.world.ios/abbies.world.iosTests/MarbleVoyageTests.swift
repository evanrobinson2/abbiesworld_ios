import XCTest
import UIKit
@testable import abbies_world_ios

final class MarbleVoyageTests: XCTestCase {
    func testOpeningCampaignEnemyIsPorcupineAcrossSeeds() throws {
        for seed: UInt64 in [0, 1, 42, 999, .max] {
            let run = MarbleVoyageRun.makeCampaign(seed: seed)
            let first = try XCTUnwrap(run.reachableChoices().first)
            XCTAssertEqual(first.id, "land0_poi1")
            XCTAssertEqual(first.waveAttacker, .porcupineBoxer)
            let roster = PeglinBattleRules.makeRescueRoster(
                wave: try XCTUnwrap(first.waveAttacker),
                focus: run.gang.miniBoss(arcIndex: 0),
                role: first.gangRole,
                seed: seed
            )
            XCTAssertEqual(roster.first?.kind, .porcupineBoxer)
            XCTAssertEqual(roster.count, 3)
            XCTAssertFalse(roster.contains { $0.kind.isNamedCrew })
            XCTAssertFalse(PlinkAttackerKind.porcupineBoxer.isFlying)
        }
    }

    func testPorcupineBundledArtLoadsForEveryCombatPose() throws {
        for pose in PlinkAttackerPose.allCases {
            let image = try XCTUnwrap(PlinkAttackerKind.porcupineBoxer.catalogImage(for: pose))
            let cgImage = try XCTUnwrap(image.cgImage)
            XCTAssertGreaterThan(cgImage.width, 100)
            XCTAssertTrue([CGImageAlphaInfo.premultipliedFirst, .premultipliedLast, .first, .last].contains(cgImage.alphaInfo))
        }
    }

    func testProductionHenchmenIdleArtIsBundled() throws {
        let kinds: [PlinkAttackerKind] = [
            .crabPincher, .grasshopperKickboxer, .armadilloBlocker, .batDivekicker,
        ]
        for kind in kinds {
            let image = try XCTUnwrap(kind.catalogImage(for: .idle), "\(kind.rawValue) idle")
            XCTAssertGreaterThan(image.size.width, 1)
            XCTAssertTrue(MarbleVoyageGangRun.henchmenPool.contains(kind))
        }
        XCTAssertTrue(PlinkAttackerKind.batDivekicker.isFlying)
    }

    func testClimbDestinationAndBellMarketCatalogBound() throws {
        for kind in [MarbleVoyageNodeKind.treasure, .mystery, .shrine] {
            let name = try XCTUnwrap(MarbleVoyageArt.climbDestinationCatalogName(for: kind))
            XCTAssertNotNil(UIImage(named: name), name)
        }
        XCTAssertNotNil(UIImage(named: MarbleVoyageArt.bellMarketInteriorCatalogName))
        XCTAssertNotNil(UIImage(named: "world2_plink_power_icon_tilt"))
        XCTAssertNotNil(UIImage(named: "world2_plink_power_icon_bounce"))
    }

    func testCampaignGangChartStructure() {
        let run = MarbleVoyageRun.make(mode: .campaign, seed: 42)
        XCTAssertEqual(run.mode, .campaign)
        XCTAssertEqual(run.currentNodeID, "start")
        XCTAssertEqual(run.playerHP, MarbleVoyageRun.defaultMaxHP)

        let fights = run.nodes.filter { $0.kind == .fight }
        let bosses = run.nodes.filter { $0.kind == .boss }
        let events = run.nodes.filter {
            $0.kind == .treasure || $0.kind == .mystery || $0.kind == .shrine
        }
        XCTAssertEqual(fights.count + bosses.count, MarbleVoyageRun.campaignTotalFights)
        XCTAssertEqual(events.count, MarbleVoyageRun.campaignEventBeats)
        // start + combat + event beats
        XCTAssertEqual(
            run.nodes.count,
            1 + MarbleVoyageRun.campaignTotalFights + MarbleVoyageRun.campaignEventBeats
        )
        XCTAssertEqual(run.edges.count, run.nodes.count - 1)

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

        XCTAssertEqual(hench.title, "Trail scrap")
        // Middle scrap is an encounter, not Bridge scrap fight.
        let mid = run.node("land0_poi2")!
        XCTAssertTrue([MarbleVoyageNodeKind.treasure, .mystery, .shrine].contains(mid.kind))
        XCTAssertEqual(run.node("land0_poi3")?.title, "Cliff scrap")
        XCTAssertEqual(landBoss.title, "\(run.gang.miniBossOrder[0].displayName)’s gate")
        XCTAssertNotNil(run.node("land0_rest"))
        XCTAssertEqual(run.node("land1_poi1")?.title, "Canal scrap")
        XCTAssertEqual(
            run.node("land2_boss")?.title,
            "\(run.gang.miniBossOrder[2].displayName)’s gate"
        )
        XCTAssertEqual(boss.title, "Summit · \(run.gang.bigBoss.displayName)")

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

        XCTAssertEqual(run.marbleCollection.count, MarbleVoyageMarbleRules.starterBagCount)
        XCTAssertTrue(run.marbleCollection.allSatisfy { $0.orbID == OrbKind.plainStarterID })

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

    func testShopBuyAndDestroyMarbleMutateBag() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 13)
        run.choose("land0_poi1")
        run.finishFight(won: true, remainingHP: 120, goldEarned: 80)

        XCTAssertEqual(run.marbleCollection.count, 4)
        let offers = try! XCTUnwrap(run.shop?.marbleOffers)
        XCTAssertFalse(offers.isEmpty)
        let orbID = offers[0]
        let beforeCoins = run.coins

        XCTAssertEqual(
            run.applyShop(.buyMarble(orbID: orbID)),
            .ok(message: "\((OrbKind.all.first { $0.id == orbID } ?? .sparkle).name) joined the bag")
        )
        XCTAssertEqual(run.marbleCollection.count, 5)
        XCTAssertEqual(run.marbleCollection.last?.orbID, orbID)
        XCTAssertLessThan(run.coins, beforeCoins)

        let scrapID = run.marbleCollection[0].instanceID
        let scrapName = run.marbleCollection[0].orb.name
        let refund = try! XCTUnwrap(run.shop?.destroyRefund)
        let coinsBeforeScrap = run.coins
        XCTAssertEqual(
            run.applyShop(.destroyMarble(instanceID: scrapID)),
            .ok(message: "Scrapped \(scrapName) · +\(refund) coins")
        )
        XCTAssertEqual(run.marbleCollection.count, 4)
        XCTAssertEqual(run.coins, coinsBeforeScrap + refund)
        XCTAssertFalse(run.marbleCollection.contains { $0.instanceID == scrapID })

        // Floor: cannot scrap below min bag.
        while run.marbleCollection.count > MarbleVoyageMarbleRules.minBagCount {
            let id = run.marbleCollection[0].instanceID
            _ = run.applyShop(.destroyMarble(instanceID: id))
        }
        XCTAssertEqual(run.marbleCollection.count, MarbleVoyageMarbleRules.minBagCount)
        let blocked = run.marbleCollection[0].instanceID
        XCTAssertEqual(run.applyShop(.destroyMarble(instanceID: blocked)), .alreadyMaxed)
    }

    func testFightDeckUsesBagOrder() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 14)
        run.marbleCollection = [
            .make(orbID: OrbKind.sparkle.id),
            .make(orbID: OrbKind.zipbolt.id),
            .make(orbID: OrbKind.pebble.id),
            .make(orbID: OrbKind.sparkle.id),
        ]
        XCTAssertEqual(run.fightDeckOrbIDs, [
            OrbKind.sparkle.id,
            OrbKind.zipbolt.id,
            OrbKind.pebble.id,
            OrbKind.sparkle.id,
        ])
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
        // Full-bleed width — no side letterbox gutters.
        XCTAssertEqual(content.width, 1180, accuracy: 0.5)
        // Tile spacing may stretch the chart taller than the nominal art aspect — still a climb scroll.
        XCTAssertGreaterThan(content.height / content.width, 2.5)
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
        XCTAssertEqual(PlinkPowerUp.tilt.title, "Tilt")
        XCTAssertEqual(PlinkPowerUp.tilt.catalogIconName, "world2_plink_power_icon_tilt")
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

    func testOverlandCastOrderVariants() {
        let run = MarbleVoyageRun.makeCampaign(seed: 42)
        let landIDs = ["land0_boss", "land1_boss", "land2_boss"]
        let summitID = "boss"

        let tarantino = MarbleVoyageOverlandScroll.orderedTourNodes(
            from: run.nodes,
            order: .summitThenLandsDescending
        ).map(\.id)
        XCTAssertEqual(tarantino.first, summitID)
        XCTAssertEqual(Array(tarantino.dropFirst()), landIDs.reversed())

        let beforeAbbie = MarbleVoyageOverlandScroll.orderedTourNodes(
            from: run.nodes,
            order: .landsDescendingThenSummit
        ).map(\.id)
        XCTAssertEqual(beforeAbbie.last, summitID)
        XCTAssertEqual(Array(beforeAbbie.dropLast()), landIDs.reversed())

        let bossFirst = MarbleVoyageOverlandScroll.orderedTourNodes(
            from: run.nodes,
            order: .bossToAbbie
        ).map(\.id)
        XCTAssertEqual(bossFirst.first, summitID)
        XCTAssertEqual(bossFirst.last, "land0_poi1")
        XCTAssertTrue(bossFirst.contains("land0_boss"))
        // Matches map top→bottom scrub: summit first, early-trail scraps last.
        let nibIdx = bossFirst.firstIndex(of: "land0_boss")!
        let land1Idx = bossFirst.firstIndex(of: "land1_boss")!
        XCTAssertGreaterThan(nibIdx, land1Idx)
    }
}