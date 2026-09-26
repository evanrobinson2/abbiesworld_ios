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

    func testSingleCampaignTerminates() {
        let trial = MarbleVoyageCampaignSim.playCampaign(seed: 101, policy: .greedySustain)
        XCTAssertGreaterThanOrEqual(trial.fightsCleared, 0)
        XCTAssertLessThanOrEqual(trial.fightsCleared, MarbleVoyageRun.campaignTotalFights)
    }
}
