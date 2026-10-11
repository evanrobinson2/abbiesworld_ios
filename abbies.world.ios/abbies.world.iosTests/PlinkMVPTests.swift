import XCTest
@testable import abbies_world_ios

final class PlinkMVPTests: XCTestCase {
    func testPlinkRouteResolvesFromWorldBehavior() {
        XCTAssertEqual(World2POIRoute.resolved(from: "plink"), .plink)
        XCTAssertEqual(World2POIRoute.plink.minigameConfigurationID, "plink")
        XCTAssertEqual(World2POIRoute.resolved(from: "moonGuidance"), .moonGuidance)
        XCTAssertEqual(World2POIRoute.resolved(from: "moonBase"), .moonBase)
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
        XCTAssertEqual(PlinkPowerUp.defaultSlotCapacity, 2)

        let player = "unit.\(UUID().uuidString)"
        let seeded = PlinkPowerUpStore.inventory(for: player)
        XCTAssertEqual(seeded.slotCapacity, 2)
        XCTAssertEqual(seeded.slots.count, 2)
        XCTAssertEqual(seeded.count(of: .refresh), 1)
        XCTAssertEqual(seeded.count(of: .fire), 1)
        XCTAssertEqual(seeded.count(of: .split), 1)
        XCTAssertEqual(seeded.count(of: .tilt), 1)
        // Front two slots filled FIFO; rest wait behind.
        XCTAssertNotNil(seeded.slots[0])
        XCTAssertNotNil(seeded.slots[1])
        XCTAssertEqual(seeded.waitingCount, 2)

        XCTAssertTrue(PlinkPowerUpStore.award(.refresh, for: player))
        XCTAssertEqual(PlinkPowerUpStore.count(.refresh, for: player), 2)
        XCTAssertFalse(PlinkPowerUpStore.award(.refresh, for: player))

        let spent = PlinkPowerUpStore.spendSlot(0, for: player)
        XCTAssertNotNil(spent)
        var after = PlinkPowerUpStore.inventory(for: player)
        XCTAssertEqual(after.slots.count, 2)
        // Using a slot pulls the next waiting charge into the tray.
        XCTAssertEqual(after.waitingCount, max(0, after.queue.count - after.slotCapacity))

        XCTAssertTrue(PlinkPowerUpStore.spend(.fire, for: player))
        XCTAssertEqual(PlinkPowerUpStore.count(.fire, for: player), 0)

        // Empty both visible slots → dashed empty wells.
        after = PlinkPowerUpStore.inventory(for: player)
        while let _ = PlinkPowerUpStore.spendSlot(0, for: player) {}
        let empty = PlinkPowerUpStore.inventory(for: player)
        XCTAssertTrue(empty.slots.allSatisfy { $0 == nil })
        XCTAssertEqual(empty.waitingCount, 0)
    }
}
