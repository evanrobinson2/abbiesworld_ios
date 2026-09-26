import XCTest
@testable import abbies_world_ios

final class PlinkMVPTests: XCTestCase {
    func testPlinkRouteResolvesFromWorldBehavior() {
        XCTAssertEqual(World2POIRoute.resolved(from: "plink"), .plink)
        XCTAssertEqual(World2POIRoute.plink.minigameConfigurationID, "plink")
    }

    func testRemotePlinkPlaceBecomesPlayableArchetype() {
        let place = World2RemotePlace(
            id: "poi.plinkPavilion",
            name: "Plink Pavilion",
            behavior: "plink",
            exteriorAsset: "https://peggle-theta.vercel.app/pavilion.png?v=2"
        )
        let archetype = place.archetype()
        XCTAssertEqual(archetype?.contract.route, .plink)
        XCTAssertEqual(archetype?.callToAction, "Play Plink")
        XCTAssertEqual(archetype?.exteriorAsset.contains("pavilion.png"), true)
    }

    func testAimClampKeepsShotsForward() {
        // Mirror the playfield clamp used by PlinkMinigameView / PlinkMVP.
        func clamp(_ a: Double) -> Double { min(max(a, -1.15), 1.15) }
        XCTAssertEqual(clamp(4), 1.15)
        XCTAssertEqual(clamp(-4), -1.15)
        XCTAssertEqual(clamp(0.2), 0.2)
    }

    @MainActor
    func testPlinkSoundtrackPlaylistMatchesParentDrops() {
        let ids = PlinkMusicService.playlist.map(\.id)
        XCTAssertTrue(ids.contains("marble-voyage"))
        XCTAssertTrue(ids.contains("marble-time"))
        XCTAssertEqual(PlinkMusicService.playlist.first?.id, "marble-voyage")
        let filenames = PlinkMusicService.playlist.map(\.filename)
        XCTAssertTrue(filenames.contains("plink_marble_voyage"))
        XCTAssertTrue(filenames.contains("plink_marble_time"))
        XCTAssertEqual(
            PlinkMusicService.playlist.first(where: { $0.id == "marble-time" })?.role,
            "play"
        )
        XCTAssertEqual(
            PlinkMusicService.playlist.first(where: { $0.id == "marble-voyage" })?.role,
            "safari"
        )
    }

    func testPlinkSFXCuesHaveKenneyFilenames() {
        XCTAssertEqual(PlinkSFX.Cue.hit.filenames.count, 3)
        XCTAssertTrue(PlinkSFX.Cue.allCases.contains(.win))
        XCTAssertTrue(PlinkSFX.Cue.pop.filenames.contains("plink_pop"))
    }

    func testEnemyCounterAttackAfterHit() {
        XCTAssertEqual(PeglinBattleRules.enemyAttackDamage, 12)
        XCTAssertEqual(PeglinBattleRules.enemyCounterAttack(for: .foxSpirit), 12)
        XCTAssertEqual(PeglinBattleRules.enemyCounterAttack(for: .stagSpirit), 12)
        XCTAssertEqual(PeglinBattleRules.emptyShotPenalty, PeglinBattleRules.enemyAttackDamage)
        XCTAssertEqual(PeggleFeel.minBallSpeed, 0)
        XCTAssertEqual(PhysicsPreset.salon.tuning.woodDamping, 0)
        XCTAssertEqual(PhysicsPreset.salon.tuning.bumperKick, 0)
        XCTAssertEqual(PhysicsPreset.salon.tuning.wallRestitution, 1.0)
        XCTAssertEqual(OrbKind.sparkle.bounciness, 1.0, accuracy: 0.0001)
        XCTAssertEqual(PeglinBattleRules.refreshPegChance, 0.08, accuracy: 0.0001)
        // Fox motif boards stay refresh-free in their authored peg list; cavern places explicit R pegs.
        XCTAssertFalse(BoardLevel.catalog.filter { $0.id.hasPrefix("fox.") }.contains { level in
            level.pegs.contains { $0.kind == .refresh }
        })
        XCTAssertTrue(BoardLevel.level(id: "peglin.cavernArcs")!.pegs.contains { $0.kind == .refresh })
    }

    func testPegMonasteryRouteAndPowerUpCap() {
        XCTAssertEqual(World2POIRoute.resolved(from: "pegMonastery"), .pegMonastery)
        XCTAssertEqual(World2POIRegistry.peglinPegMonastery.route, .pegMonastery)
        XCTAssertEqual(PlinkPowerUp.refresh.chipAssetID, "ui.plink.power.icon.refresh")
        XCTAssertEqual(PlinkPowerUp.fire.chipAssetID, "ui.plink.power.icon.fire")
        XCTAssertEqual(PlinkPowerUp.split.chipAssetID, "ui.plink.power.icon.split")
        XCTAssertEqual(World2RegistryKey.assetKey(for: "ui.plink.power.icon.refresh"), "ui/plink/power/icon/refresh")
        XCTAssertEqual(PlinkPowerUp.maxOwned, 2)
        let player = "unit.\(UUID().uuidString)"
        let seeded = PlinkPowerUpStore.counts(for: player)
        XCTAssertEqual(seeded[.refresh], 1)
        XCTAssertEqual(seeded[.fire], 1)
        XCTAssertEqual(seeded[.split], 1)
        XCTAssertTrue(PlinkPowerUpStore.award(.refresh, for: player))
        XCTAssertEqual(PlinkPowerUpStore.count(.refresh, for: player), 2)
        XCTAssertFalse(PlinkPowerUpStore.award(.refresh, for: player))
        XCTAssertTrue(PlinkPowerUpStore.spend(.fire, for: player))
        XCTAssertEqual(PlinkPowerUpStore.count(.fire, for: player), 0)
    }
}
