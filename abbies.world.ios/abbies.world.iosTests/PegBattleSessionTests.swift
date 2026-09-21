import XCTest
@testable import abbies_world_ios

final class PegBattleSessionTests: XCTestCase {
    func testPackDecodesFromTheAppBundle() throws {
        let catalog = try PegBattleCatalogLoader.load(bundle: Bundle(for: World2ViewModel.self))
        XCTAssertEqual(catalog.pack.id, "peg-battle")
        XCTAssertEqual(catalog.enemies.first?.id, "bad-doggo")
        XCTAssertEqual(catalog.cards.count, 5)
        XCTAssertEqual(catalog.boards.first?.pegs.count, 39)
        XCTAssertEqual(catalog.levels.first?.id, "bad-doggo-duel")
    }

    func testSameSeedReproducesTheHand() throws {
        let catalog = try PegBattleCatalogLoader.load(bundle: Bundle(for: World2ViewModel.self))
        let a = PegBattleSession.create(catalog: catalog, seed: 1234)
        let b = PegBattleSession.create(catalog: catalog, seed: 1234)
        XCTAssertEqual(a.hand, b.hand)
        XCTAssertEqual(a.intent.id, "bark")
    }

    func testResetRecreatesInsteadOfPatching() throws {
        let catalog = try PegBattleCatalogLoader.load(bundle: Bundle(for: World2ViewModel.self))
        var session = PegBattleSession.create(catalog: catalog, seed: 99)
        session.playerHearts = 1
        session.pegs[0].charged = true
        session.turn = 4
        let again = PegBattleSession.reset(session)
        XCTAssertEqual(again.playerHearts, 6)
        XCTAssertEqual(again.turn, 1)
        XCTAssertFalse(again.pegs.contains(where: \.charged))
        XCTAssertEqual(again.seed, 99)
    }

    func testDestroyDropsTheLiveSession() throws {
        let catalog = try PegBattleCatalogLoader.load(bundle: Bundle(for: World2ViewModel.self))
        let session = PegBattleSession.create(catalog: catalog, seed: 1)
        XCTAssertNil(PegBattleSession.destroy(session))
    }

    func testPowerBecomesTinyHeartDamageAndEnemyPatternAdvances() throws {
        let catalog = try PegBattleCatalogLoader.load(bundle: Bundle(for: World2ViewModel.self))
        var session = PegBattleSession.create(catalog: catalog, seed: 7)
        session.chooseCard(session.hand[0])
        session.fire(angle: 0.2)
        XCTAssertEqual(session.lastDamage, session.lastPower / 10)
        XCTAssertTrue(["hitResolve", "victory", "defeat"].contains(session.phase))
        if session.phase == "hitResolve" {
            session.resolveEnemy()
            XCTAssertTrue(["playerAim", "defeat"].contains(session.phase))
            if session.phase == "playerAim" {
                XCTAssertEqual(session.intent.id, "scratch")
            }
        }
    }

    func testPavilionRouteStaysPlinkForTheWorldHook() {
        XCTAssertEqual(World2POIRegistry.pegglePavilion.route, .plink)
        XCTAssertEqual(World2POIRegistry.pegglePavilion.id, "poi.pegglePavilion")
        XCTAssertEqual(World2POIRegistry.pegglePavilion.kind, .minigame)
    }

    func testPackLoaderFindsPegBattleJSON() throws {
        let data = try World2MinigamePackLoader.data(
            packId: "peg-battle",
            resource: "pack",
            bundle: Bundle(for: World2ViewModel.self)
        )
        XCTAssertGreaterThan(data.count, 20)
        XCTAssertEqual(PegBattleArt.catalogName("balls/star"), "world2_peg_battle_balls_star")
    }
}
