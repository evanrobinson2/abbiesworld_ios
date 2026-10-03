import XCTest
@testable import abbies_world_ios

final class MarbleVoyageCampaignSimTests: XCTestCase {
    func testMarbleLevelTunesPhysicsAndShotMult() {
        let lv1 = MarbleVoyageOwnedMarble.make(orbID: OrbKind.sparkle.id, level: 1)
        let lv3 = MarbleVoyageOwnedMarble.make(orbID: OrbKind.sparkle.id, level: 3)
        XCTAssertGreaterThan(lv3.tunedOrb().fireForce, lv1.tunedOrb().fireForce)
        XCTAssertGreaterThan(lv3.damageMultiplier, lv1.damageMultiplier)
        let m1 = MarbleVoyageMarbleRules.shotDamageMultiplier(marble: lv1, ballLevel: 1)
        let m3 = MarbleVoyageMarbleRules.shotDamageMultiplier(marble: lv3, ballLevel: 2)
        XCTAssertGreaterThan(m3, m1)
    }

    func testCampaignSimCompletesUnderPolicies() {
        // Small trial count — proves the loop terminates and clears sometimes.
        let reports = MarbleVoyageCampaignSim.reportAllPolicies(trials: 24, seed: 19)
        XCTAssertEqual(reports.count, MarbleVoyageCampaignSim.ShopPolicy.allCases.count)
        for report in reports {
            print(
                "campaign \(report.policy.rawValue): clear=\(String(format: "%.0f%%", report.clearRate * 100)) " +
                "fights=\(String(format: "%.1f", report.meanFightsCleared))/" +
                "\(MarbleVoyageRun.campaignTotalFights) " +
                "ballLv=\(String(format: "%.1f", report.meanBallLevel)) " +
                "charms=\(String(format: "%.1f", report.meanCharms)) " +
                "marbleLv=\(String(format: "%.2f", report.meanMarbleLevel))"
            )
            XCTAssertGreaterThan(report.meanFightsCleared, 0)
            XCTAssertLessThanOrEqual(report.clearRate, 1.0)
        }
        let best = reports.map(\.clearRate).max() ?? 0
        XCTAssertGreaterThan(
            best,
            0.15,
            "Expected at least one shop policy to clear ~15%+ of campaigns (got \(best))"
        )
    }

    func testCampaignSimPlayerTypesRamp() {
        let reports = MarbleVoyageCampaignSim.reportAllPlayerTypes(
            trials: 32,
            seed: 23,
            mapMode: .production,
            difficulty: .normal
        )
        XCTAssertEqual(reports.count, 3)
        var byType: [MarbleVoyageCampaignSim.PlayerType: MarbleVoyageCampaignSim.PlayerTypeReport] = [:]
        for report in reports {
            byType[report.player] = report
            print(
                "player \(report.player.rawValue): clear=\(String(format: "%.0f%%", report.clearRate * 100)) " +
                "fights=\(String(format: "%.1f", report.meanFightsCleared))/" +
                "\(MarbleVoyageRun.campaignTotalFights) " +
                "temper×=\(String(format: "%.2f", report.meanTemperFactor)) " +
                "ballLv=\(String(format: "%.1f", report.meanBallLevel)) " +
                "marbleLv=\(String(format: "%.2f", report.meanMarbleLevel))"
            )
            XCTAssertGreaterThan(report.meanFightsCleared, 0)
            XCTAssertLessThanOrEqual(report.clearRate, 1.0)
        }
        let hitPegs = byType[.hitPegs]!
        let meta = byType[.metaAware]!
        let bored = byType[.uninterested]!
        XCTAssertGreaterThan(
            hitPegs.meanBallLevel,
            bored.meanBallLevel,
            "Hit-pegs should push ball upgrades harder than uninterested"
        )
        XCTAssertGreaterThanOrEqual(
            meta.meanBallLevel,
            2.0,
            "Meta-aware should still climb ball level (not heal-starve upgrades)"
        )
        XCTAssertGreaterThan(
            hitPegs.meanFightsCleared,
            bored.meanFightsCleared,
            "Hit-pegs should progress farther than uninterested on Normal"
        )
        _ = meta
    }

    /// Target bands for the live production chart:
    /// uninterested → lose; hitPegs → clear Normal; meta required on Hard.
    func testSkillLadderClearBands() {
        let trials = 48
        let seed: UInt64 = 41
        let matrix = MarbleVoyageCampaignSim.skillLadderMatrix(
            trials: trials,
            seed: seed,
            mapMode: .production
        )
        var byKey: [String: MarbleVoyageCampaignSim.PlayerTypeReport] = [:]
        for row in matrix {
            let key = "\(row.difficulty.rawValue)/\(row.player.rawValue)"
            byKey[key] = row.report
            print(
                "LADDER \(key): clear=\(String(format: "%.0f%%", row.report.clearRate * 100)) " +
                "fights=\(String(format: "%.1f", row.report.meanFightsCleared))/" +
                "\(MarbleVoyageRun.campaignTotalFights) " +
                "temper×=\(String(format: "%.2f", row.report.meanTemperFactor))"
            )
        }

        let uninterestedNormal = byKey["normal/uninterested"]!.clearRate
        let hitPegsNormal = byKey["normal/hitPegs"]!.clearRate
        let metaNormal = byKey["normal/metaAware"]!.clearRate
        let uninterestedHard = byKey["hard/uninterested"]!.clearRate
        let hitPegsHard = byKey["hard/hitPegs"]!.clearRate
        let metaHard = byKey["hard/metaAware"]!.clearRate

        // Random / uninterested → guaranteed (near) loss on both difficulties.
        XCTAssertLessThan(
            uninterestedNormal,
            0.10,
            "Uninterested should almost never clear Normal (got \(uninterestedNormal))"
        )
        XCTAssertLessThan(
            uninterestedHard,
            0.06,
            "Uninterested should almost never clear Hard (got \(uninterestedHard))"
        )

        // Basic “hit the pegs!” clears Normal.
        XCTAssertGreaterThan(
            hitPegsNormal,
            0.48,
            "Hit-pegs should usually clear Normal (got \(hitPegsNormal))"
        )
        XCTAssertGreaterThan(
            metaNormal,
            0.40,
            "Meta-aware should also clear Normal (got \(metaNormal))"
        )
        XCTAssertGreaterThan(
            hitPegsNormal,
            uninterestedNormal + 0.30,
            "Peg skill must separate from uninterested on Normal"
        )

        // Hard: pegs alone are not enough; meta clears.
        XCTAssertLessThan(
            hitPegsHard,
            0.28,
            "Hit-pegs without meta should struggle on Hard (got \(hitPegsHard))"
        )
        XCTAssertGreaterThan(
            metaHard,
            0.28,
            "Meta-aware should clear Hard often enough to reward Temper (got \(metaHard))"
        )
        XCTAssertGreaterThan(
            metaHard,
            hitPegsHard + 0.14,
            "Meta gap on Hard too small (meta=\(metaHard) pegs=\(hitPegsHard))"
        )
    }

    func testPickFightMarblePrefersStrongWhenSkilled() {
        var rng = SeededGenerator(seed: 9)
        let craft = MarbleVoyageOwnedMarble.make(orbID: OrbKind.puff.id) // Craft
        let brawl = MarbleVoyageOwnedMarble.make(orbID: OrbKind.sparkle.id) // Brawl
        let bag = [craft, brawl]
        // Porcupine is Brawl — Craft is Strong.
        var strongPicks = 0
        for _ in 0..<40 {
            let pick = MarbleVoyageCampaignSim.pickFightMarble(
                collection: bag,
                foeTemper: .brawl,
                strongPickRate: 1.0,
                rng: &rng
            )
            if pick.orb.temper == .craft { strongPicks += 1 }
        }
        XCTAssertEqual(strongPicks, 40)
    }

    func testSingleCampaignTerminates() {
        let trial = MarbleVoyageCampaignSim.playCampaign(seed: 101, player: .metaAware)
        XCTAssertGreaterThanOrEqual(trial.fightsCleared, 0)
        XCTAssertLessThanOrEqual(trial.fightsCleared, MarbleVoyageRun.campaignTotalFights)
    }

    /// Alpha sanity: ladder shape must hold across several seeds (not one lucky matrix).
    func testSkillLadderStableAcrossSeeds() {
        let seeds: [UInt64] = [7, 41, 99, 404, 2026]
        let trials = 24
        var hitPegsNormalRates: [Double] = []
        var uninterestedNormalRates: [Double] = []
        var metaHardRates: [Double] = []
        var hitPegsHardRates: [Double] = []

        for seed in seeds {
            let matrix = MarbleVoyageCampaignSim.skillLadderMatrix(
                trials: trials,
                seed: seed,
                mapMode: .production
            )
            var byKey: [String: Double] = [:]
            for row in matrix {
                byKey["\(row.difficulty.rawValue)/\(row.player.rawValue)"] = row.report.clearRate
                print(
                    "SANITY seed=\(seed) \(row.difficulty.rawValue)/\(row.player.rawValue): " +
                    "clear=\(String(format: "%.0f%%", row.report.clearRate * 100)) " +
                    "fights=\(String(format: "%.1f", row.report.meanFightsCleared))"
                )
            }
            uninterestedNormalRates.append(byKey["normal/uninterested"] ?? -1)
            hitPegsNormalRates.append(byKey["normal/hitPegs"] ?? -1)
            hitPegsHardRates.append(byKey["hard/hitPegs"] ?? -1)
            metaHardRates.append(byKey["hard/metaAware"] ?? -1)
        }

        let mean: ([Double]) -> Double = { $0.reduce(0, +) / Double($0.count) }
        let uN = mean(uninterestedNormalRates)
        let hN = mean(hitPegsNormalRates)
        let hH = mean(hitPegsHardRates)
        let mH = mean(metaHardRates)
        print(
            "SANITY_MEANS uninterestedNormal=\(String(format: "%.0f%%", uN * 100)) " +
            "hitPegsNormal=\(String(format: "%.0f%%", hN * 100)) " +
            "hitPegsHard=\(String(format: "%.0f%%", hH * 100)) " +
            "metaHard=\(String(format: "%.0f%%", mH * 100))"
        )

        XCTAssertLessThan(uN, 0.12, "Uninterested Normal mean too high across seeds (\(uN))")
        XCTAssertGreaterThan(hN, 0.40, "Hit-pegs Normal mean too low across seeds (\(hN))")
        XCTAssertLessThan(hH, 0.25, "Hit-pegs Hard mean too high across seeds (\(hH))")
        XCTAssertGreaterThan(mH, 0.25, "Meta Hard mean too low across seeds (\(mH))")
        XCTAssertGreaterThan(mH, hH + 0.12, "Meta vs hit-pegs Hard gap collapsed across seeds")
        // Every seed: uninterested stays near-loss on Normal.
        for (seed, rate) in zip(seeds, uninterestedNormalRates) {
            XCTAssertLessThan(rate, 0.15, "Seed \(seed) uninterested Normal=\(rate)")
        }
    }
}
