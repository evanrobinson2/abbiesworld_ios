import XCTest
import UIKit
@testable import abbies_world_ios

final class MarbleVoyageTests: XCTestCase {
    func testOpeningCampaignEnemyIsPorcupineAcrossSeeds() throws {
        for seed: UInt64 in [0, 1, 42, 999, .max] {
            let run = MarbleVoyageRun.makeCampaign(seed: seed)
            let first = try XCTUnwrap(run.reachableChoices().first)
            XCTAssertEqual(first.id, "land0_fight1")
            XCTAssertEqual(first.waveAttacker, .porcupineBoxer)
            let focus = first.waveAttacker ?? .porcupineBoxer
            let rosterSeed = PeglinBattleRules.rescueRosterSeed(
                wave: focus,
                focus: focus,
                role: first.gangRole,
                climbStage: first.stage
            )
            let roster = PeglinBattleRules.makeRescueRoster(
                wave: focus,
                focus: focus,
                role: first.gangRole,
                seed: rosterSeed
            )
            XCTAssertEqual(roster.first?.kind, .porcupineBoxer)
            XCTAssertEqual(roster.count, PlinkCreepWave.henchmanCount)
            // One creep type — no icon zoo of mixed hench art.
            XCTAssertTrue(roster.allSatisfy { $0.kind == .porcupineBoxer })
            XCTAssertFalse(roster.contains { $0.kind.isNamedCrew })
            XCTAssertFalse(PlinkAttackerKind.porcupineBoxer.isFlying)
            // Soft creeps — bombs one-shot the wave.
            XCTAssertLessThanOrEqual(
                roster.map(\.maxHP).max() ?? 0,
                PlinkCreepWave.bombAOEDamage
            )

            // Versus splash / board share the same pack for a given fight.
            let again = PeglinBattleRules.makeRescueRoster(
                wave: focus,
                focus: focus,
                role: first.gangRole,
                seed: rosterSeed
            )
            XCTAssertEqual(again.map(\.kind), roster.map(\.kind))
            XCTAssertEqual(
                PeglinBattleRules.rescueCastKinds(from: roster).first,
                .porcupineBoxer
            )
        }
    }

    func testBigBossRescueCastHasHonorGuard() throws {
        let run = MarbleVoyageRun.makeCampaign(seed: 7)
        let boss = try XCTUnwrap(run.nodes.first { $0.gangRole == .bigBoss })
        let lead = try XCTUnwrap(boss.waveAttacker ?? run.gang.bigBoss)
        let seed = PeglinBattleRules.rescueRosterSeed(
            wave: lead,
            focus: lead,
            role: .bigBoss,
            climbStage: boss.stage
        )
        let roster = PeglinBattleRules.makeRescueRoster(
            wave: lead,
            focus: lead,
            role: .bigBoss,
            seed: seed
        )
        XCTAssertEqual(roster.count, 1 + PlinkCreepWave.bigBossGuardCount)
        XCTAssertEqual(roster.first?.kind, lead)
        XCTAssertEqual(roster.first?.maxHP, PeglinBattleRules.foeMaxHP(for: lead, role: .bigBoss))
        let guards = Array(roster.dropFirst())
        XCTAssertEqual(Set(guards.map(\.kind)).count, 1, "honor guard should be one creep type")
    }

    func testMiniBossRescueCastIsLeadPlusCreepAdds() throws {
        let run = MarbleVoyageRun.makeCampaign(seed: 11)
        let node = try XCTUnwrap(run.nodes.first { $0.gangRole == .miniBoss })
        let lead = try XCTUnwrap(node.waveAttacker)
        let seed = PeglinBattleRules.rescueRosterSeed(
            wave: lead,
            focus: lead,
            role: .miniBoss,
            climbStage: node.stage
        )
        let roster = PeglinBattleRules.makeRescueRoster(
            wave: lead,
            focus: lead,
            role: .miniBoss,
            seed: seed
        )
        XCTAssertEqual(roster.count, 1 + PlinkCreepWave.miniBossAddCount)
        XCTAssertEqual(roster.first?.kind, lead)
        let adds = Array(roster.dropFirst())
        XCTAssertTrue(adds.allSatisfy { $0.maxHP <= PlinkCreepWave.henchGroundHP })
        XCTAssertEqual(Set(adds.map(\.kind)).count, 1, "mini adds should be one creep type")
    }

    func testCreepWaveComboPayoffs() {
        XCTAssertEqual(PlinkCreepWave.comboBonusXP(kills: 1), 0)
        XCTAssertEqual(PlinkCreepWave.comboBonusXP(kills: 3), 12)
        XCTAssertEqual(PlinkCreepWave.comboLabel(kills: 2), "DOUBLE! ×2")
        XCTAssertEqual(PlinkCreepWave.comboLabel(kills: 5), "CREEP WAVE! ×5")
        XCTAssertEqual(PlinkCreepWave.comboDamageBonus(kills: 4), 8)
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
        // Branching chart: more edges than a linear path.
        XCTAssertGreaterThan(run.edges.count, run.nodes.count - 1)

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

        let hench = run.node("land0_fight1")!
        XCTAssertEqual(hench.gangRole, .henchman)
        XCTAssertEqual(hench.miniArcIndex, 0)
        XCTAssertFalse(hench.waveAttacker?.isNamedCrew == true)
        XCTAssertTrue(MarbleVoyageGangRun.henchmenPool.contains(hench.waveAttacker!))
        XCTAssertEqual(hench.waveAttacker, MarbleVoyageGangRun.openerHenchman)

        // No duplicate henchmen on the chart until the production pool is exhausted.
        let henchKinds = run.nodes.compactMap { node -> PlinkAttackerKind? in
            guard node.gangRole == .henchman else { return nil }
            return node.waveAttacker
        }
        let unique = Set(henchKinds)
        XCTAssertEqual(
            unique.count,
            min(henchKinds.count, MarbleVoyageGangRun.henchmenPool.count),
            "henchmen should be unique until pool exhausted; got \(henchKinds.map(\.rawValue))"
        )
        XCTAssertEqual(
            henchKinds.filter { $0 == .porcupineBoxer }.count,
            1,
            "Porcupine opener must appear exactly once before pool wraps"
        )

        XCTAssertEqual(hench.title, "Trail scrap")
        let gift = run.node("land0_gift1")!
        XCTAssertTrue([MarbleVoyageNodeKind.treasure, .mystery, .shrine].contains(gift.kind))
        XCTAssertFalse(gift.awardsHeroXP)
        XCTAssertEqual(run.node("land0_fight2")?.title, "Bridge scrap")
        XCTAssertTrue(run.node("land0_fight2")?.grantsTreasureOnWin == true)
        XCTAssertEqual(landBoss.title, "\(run.gang.miniBossOrder[0].displayName)’s gate")
        XCTAssertNotNil(run.node("land0_rest"))
        XCTAssertEqual(run.node("land1_fight1")?.title, "Canal scrap")
        XCTAssertEqual(
            run.node("land2_boss")?.title,
            "\(run.gang.miniBossOrder[2].displayName)’s gate"
        )
        XCTAssertEqual(boss.title, "Summit · \(run.gang.bigBoss.displayName)")

        // Fight vs gift at the dock.
        let choices = run.reachableChoices()
        XCTAssertEqual(choices.count, 2)
        XCTAssertEqual(Set(choices.map(\.id)), Set(["land0_fight1", "land0_gift1"]))
    }

    func testCampaignShopOpensAfterEveryNonSummitFight() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 11)
        run.choose("land0_fight1")
        run.finishFight(won: true, remainingHP: 100, goldEarned: 40)

        XCTAssertEqual(run.phase, .shop(afterNodeID: "land0_fight1"))
        XCTAssertEqual(run.coins, 40)
        XCTAssertNotNil(run.shop)
        XCTAssertEqual(run.shopVisitCount, 1)

        let hpBeforeHeal = run.playerHP
        let expectedHeal = min(run.shopHealAmount(), run.playerMaxHP - hpBeforeHeal)
        XCTAssertGreaterThan(expectedHeal, 0)
        XCTAssertEqual(run.applyShop(.heal), .ok(message: "Bell balm · +\(expectedHeal) HP"))
        XCTAssertEqual(run.playerHP, hpBeforeHeal + expectedHeal)
        let afterHeal = 40 - MarbleVoyageEconomyTuning.recommended.healPrice
        XCTAssertEqual(run.coins, afterHeal)
        XCTAssertEqual(run.applyShop(.heal), .alreadyMaxed)

        // Gate: purse below upgrade price still refuses.
        run.coins = MarbleVoyageEconomyTuning.recommended.ballUpgradePrice - 1
        XCTAssertEqual(run.applyShop(.ballUpgrade), .cannotAfford)
        run.coins = afterHeal

        run.leaveShop()
        XCTAssertEqual(run.phase, .map)
        XCTAssertNil(run.shop)
        XCTAssertEqual(run.record.shops.count, 1)
        XCTAssertEqual(run.record.shops[0].walletBefore, 40)
        XCTAssertEqual(run.record.shops[0].walletAfter, afterHeal)
    }

    func testShopBallUpgradeRaisesLowestMarble() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 12)
        run.choose("land0_fight1")
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
        run.choose("land0_fight1")
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
        // Linear progression — one next beat, never a branching climb chart.
        XCTAssertEqual(first.count, 1)
        XCTAssertEqual(first[0].kind, .fight)
        XCTAssertEqual(first[0].gangRole, .henchman)
        XCTAssertEqual(first[0].stage, 1)
        XCTAssertEqual(run.endlessDisplayWave, 1)
        run.choose(first[0].id)
        run.finishFight(won: true, remainingHP: 90)
        XCTAssertEqual(run.phase, .shop(afterNodeID: first[0].id))
        run.leaveShop()
        XCTAssertEqual(run.phase, .map)
        XCTAssertEqual(run.fightsCleared, 1)
        let next = run.reachableChoices()
        XCTAssertEqual(next.count, 1)
        // Wave 2 is still a fight (rests land on wave 4, bosses on wave 5).
        XCTAssertEqual(next[0].kind, .fight)
        XCTAssertEqual(next[0].stage, 2)
    }

    func testEndlessRestAndBossWavesAreLinear() {
        var run = MarbleVoyageRun.make(mode: .endless, seed: 11)
        // Advance through waves 1…3 fights via shop, then wave 4 should be a rest.
        for expected in 1...3 {
            let beat = try! XCTUnwrap(run.endlessNextBeat)
            XCTAssertEqual(beat.stage, expected)
            XCTAssertEqual(beat.kind, .fight)
            run.choose(beat.id)
            run.finishFight(won: true, remainingHP: 80)
            run.leaveShop()
        }
        let rest = try! XCTUnwrap(run.endlessNextBeat)
        XCTAssertEqual(rest.stage, 4)
        XCTAssertTrue([MarbleVoyageNodeKind.treasure, .mystery, .shrine].contains(rest.kind))
        run.choose(rest.id)
        run.applyEvent(.init(message: "Rest", hpDelta: 0))
        run.leaveShop()
        let boss = try! XCTUnwrap(run.endlessNextBeat)
        XCTAssertEqual(boss.stage, 5)
        XCTAssertEqual(boss.kind, .boss)
    }

    func testFightWinCarriesHPWithoutHeal() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 1)
        run.choose("land0_fight1")
        XCTAssertEqual(run.phase, .fight(nodeID: "land0_fight1"))
        XCTAssertEqual(run.pathTaken.count, 1)
        XCTAssertEqual(run.pathTaken.first?.from, "start")
        XCTAssertEqual(run.pathTaken.first?.to, "land0_fight1")
        XCTAssertTrue(run.didTraverse(from: "start", to: "land0_fight1"))
        XCTAssertFalse(run.didTraverse(from: "start", to: "land0_gift1"))
        run.finishFight(won: true, remainingHP: 77)
        // Fight sets HP from remaining; win XP may bump max/current HP, but never free-heals to full.
        let carried = run.playerHP
        XCTAssertGreaterThanOrEqual(carried, 77)
        XCTAssertLessThan(carried, run.playerMaxHP)
        XCTAssertTrue(run.lastEventLine.contains("\(carried)"))
        // Shop first, then back on the chart — leaving the shop does not heal.
        XCTAssertEqual(run.phase, .shop(afterNodeID: "land0_fight1"))
        run.leaveShop()
        XCTAssertEqual(run.phase, .map)
        XCTAssertEqual(run.playerHP, carried)
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
        run.choose("land0_fight1")
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
        let easy = run.node("land0_fight1")!
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
        // Bag can grow large; spirit fights recycle forever so this is not a hard fight limit.
        XCTAssertEqual(PeglinBattleRules.maxDeckCount, 99)
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
        XCTAssertEqual(bossFirst.last, "land0_fight1")
        XCTAssertTrue(bossFirst.contains("land0_boss"))
        // Matches map top→bottom scrub: summit first, early-trail scraps last.
        let nibIdx = bossFirst.firstIndex(of: "land0_boss")!
        let land1Idx = bossFirst.firstIndex(of: "land1_boss")!
        XCTAssertGreaterThan(nibIdx, land1Idx)
    }
}