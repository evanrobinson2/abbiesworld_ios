import XCTest
@testable import abbies_world_ios

final class PlinkPhysicsTests: XCTestCase {
    func testCampaignDecodesFromTheAppBundle() throws {
        let campaign = try PlinkCampaignLoader.load(bundle: Bundle(for: World2ViewModel.self))
        XCTAssertEqual(campaign.gameKey, "peggle")
        XCTAssertEqual(campaign.kidName, "Plink")
        XCTAssertEqual(campaign.land.id, "world.peggle")
        XCTAssertEqual(campaign.poi.id, "poi.pegglePavilion")
        XCTAssertEqual(campaign.beds.count, 8)
        XCTAssertEqual(campaign.beds.first?.id, "dewdrop-nursery")
        XCTAssertEqual(campaign.beds.last?.awardsDecoration, World2StoryDecoration.plinkFountain.id)
        XCTAssertTrue((campaign.beds.first?.pegs.contains { $0.kind == "glow" }) ?? false)
    }

    func testAimIsClamped() {
        XCTAssertEqual(PlinkPhysics.clampAim(4), 1.15)
        XCTAssertEqual(PlinkPhysics.clampAim(-4), -1.15)
    }

    func testStraightDropOnTheNurseryEnds() throws {
        let campaign = try PlinkCampaignLoader.load(bundle: Bundle(for: World2ViewModel.self))
        let bed = campaign.beds[0]
        let result = PlinkPhysics.simulateShot(campaign: campaign, pegs: bed.pegs, angle: 0)
        XCTAssertGreaterThan(result.steps, 10)
        XCTAssertFalse(result.catch.effect.isEmpty)
    }

    func testFreshProgressUnlocksOnlyTheNursery() throws {
        let campaign = try PlinkCampaignLoader.load(bundle: Bundle(for: World2ViewModel.self))
        let progress = PlinkProgress.fresh(from: campaign)
        XCTAssertEqual(progress.unlockedBedIds, ["dewdrop-nursery"])
        var round = PlinkRound.start(campaign: campaign, bed: campaign.beds[0], progress: progress)
        XCTAssertEqual(round.glowRemaining, 3)
        PlinkPhysics.resolveShot(&round, angle: 0)
        XCTAssertTrue(round.phase == .aim || round.phase == .cleared || round.phase == .retry)
    }
}
