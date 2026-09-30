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
            // At least some policies should clear a non-trivial share.
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
            mapMode: .production
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
        let aggressive = byType[.aggressive]!
        let motivated = byType[.motivated]!
        let casual = byType[.casual]!
        // Behavioral fingerprints — not a forced clear-rate ladder (economy can invert that).
        XCTAssertGreaterThan(
            aggressive.meanBallLevel,
            casual.meanBallLevel,
            "Aggressive should push ball upgrades harder than casual"
        )
        XCTAssertGreaterThan(
            motivated.meanBallLevel,
            2.0,
            "Motivated should still climb ball level (not heal-starve upgrades)"
        )
        // At least one archetype clears often — ramp is not a soft-lock.
        let best = reports.map(\.clearRate).max() ?? 0
        XCTAssertGreaterThan(best, 0.25, "Expected some player type to clear ~25%+ (got \(best))")
        // Casual should not be the only one who can finish; aggressive power path clears.
        XCTAssertGreaterThan(
            aggressive.clearRate,
            0.20,
            "Aggressive clear rate too low — power path broken (got \(aggressive.clearRate))"
        )
        _ = motivated // kept for print / future band asserts
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
        let trial = MarbleVoyageCampaignSim.playCampaign(seed: 101, player: .motivated)
        XCTAssertGreaterThanOrEqual(trial.fightsCleared, 0)
        XCTAssertLessThanOrEqual(trial.fightsCleared, MarbleVoyageRun.campaignTotalFights)
    }
}
