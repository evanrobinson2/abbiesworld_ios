import XCTest
import UIKit
@testable import abbies_world_ios

final class MarbleVoyageCharmTests: XCTestCase {
    func testCharmCatalogCoversPeglinRolesAndShippedArt() {
        let roles = Set(MarbleVoyageCharm.allCases.map(\.peglinRole))
        XCTAssertEqual(roles.count, MarbleVoyageCharm.allCases.count, "roles should be distinct")
        for charm in MarbleVoyageCharm.allCases {
            XCTAssertFalse(charm.peglinExemplars.isEmpty, charm.title)
            XCTAssertTrue(charm.assetSemanticID.hasPrefix("ench_"), charm.title)
            XCTAssertGreaterThanOrEqual(charm.basePrice, 30)
            XCTAssertLessThanOrEqual(charm.basePrice, 40)
        }
        XCTAssertEqual(
            MarbleVoyageCharm.goldValueMultiplier(moonGleamStacks: 2),
            1.2,
            accuracy: 0.001
        )
        XCTAssertEqual(MarbleVoyageCharm.shopHealBonusFraction(stacks: 2), 0.10, accuracy: 0.001)
        XCTAssertEqual(MarbleVoyageCharm.biteDamageReduction(softPurrStacks: 3), 3)
        XCTAssertEqual(MarbleVoyageCharm.foeAttackReduction(lullabyStacks: 2), 2)
        XCTAssertEqual(MarbleVoyageCharm.bombClearCoins(sockSnatchStacks: 2), 6)
    }

    func testRunCarriesCharmsCoinsEconomyAndRecord() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 42)
        XCTAssertEqual(run.coins, 0)
        XCTAssertEqual(run.ballLevel, 1)
        XCTAssertEqual(run.economy.goldPegPrevalence, 0.15, accuracy: 0.001)
        XCTAssertEqual(run.economy.goldPegValue, 6)
        XCTAssertEqual(run.record.kind, .live)
        XCTAssertEqual(run.record.seed, 42)
        XCTAssertEqual(run.record.schemaVersion, MarbleVoyageRunRecord.currentSchemaVersion)

        run.addCharm(.moonGleam)
        run.addCharm(.moonGleam)
        run.addCharm(.bloom)
        XCTAssertEqual(run.charmStack(.moonGleam), 2)
        XCTAssertEqual(run.charmStack(.bloom), 1)
        XCTAssertEqual(run.record.charmStacks["moonGleam"], 2)
        XCTAssertEqual(run.effectiveGoldPegValue, 7) // 6 * 1.2 → 7
        XCTAssertEqual(run.shopHealAmount(), 30) // 20%+5% of 120

        run.choose("land0_poi1")
        XCTAssertEqual(run.record.path.count, 1)
        XCTAssertEqual(run.record.path[0].to, "land0_poi1")
    }

    func testCharmArtIsBundledUnderCatalogName() {
        for charm in MarbleVoyageCharm.allCases {
            XCTAssertEqual(charm.catalogImageName, "world2_plink_charm_\(charm.rawValue)")
            XCTAssertNotNil(UIImage(named: charm.catalogImageName), charm.title)
        }
    }

    func testRunRecordJSONRoundTrip() throws {
        var record = MarbleVoyageRunRecord.fresh(
            kind: .simulation,
            seed: 7,
            mode: .campaign,
            notes: "unit roundtrip"
        )
        record.addCharmStack(.prismBurst, count: 2)
        record.coins = 44
        record.fights.append(
            .init(
                nodeID: "A1 Pack1 Top",
                title: "A1 Pack1 Top",
                role: "henchman",
                waveAttacker: "cawScout",
                foes: ["cawScout", "briarToad", "hyena"],
                won: true,
                rounds: 7,
                damageDealt: 120,
                damageTaken: 24,
                hpBefore: 120,
                hpAfter: 96,
                goldEarned: 30,
                goldPegHits: 5,
                pegsLit: 31,
                boardPegs: 34,
                fightSeed: 99
            )
        )
        record.shops.append(
            .init(
                afterNodeID: "A1 Pack1 Top",
                walletBefore: 30,
                walletAfter: 5,
                hpBefore: 96,
                hpAfter: 120,
                charmOffers: ["bloom", "moonGleam"],
                purchases: [
                    .init(sku: "heal", pricePaid: 25, detail: "+24 HP")
                ]
            )
        )
        record.outcome = .ongoing
        let data = try record.jsonData()
        let loaded = try MarbleVoyageRunRecord.load(from: data)
        XCTAssertEqual(loaded.seed, 7)
        XCTAssertEqual(loaded.kind, .simulation)
        XCTAssertEqual(loaded.charmStacks["prismBurst"], 2)
        XCTAssertEqual(loaded.fights.count, 1)
        XCTAssertEqual(loaded.shops.first?.purchases.first?.sku, "heal")
        XCTAssertEqual(loaded.economy.goldPegValue, 6)
    }

    func testLullabyLowersDocumentedEnemyAttack() {
        var run = MarbleVoyageRun.make(mode: .campaign, seed: 3)
        let node = run.node("land0_boss")!
        let base = run.enemyAttack(for: node)
        run.addCharm(.lullaby, count: 2)
        XCTAssertEqual(run.enemyAttack(for: node), max(1, base - 2))
    }
}
