import XCTest
@testable import abbies_world_ios

final class World2RegistryKeyTests: XCTestCase {
    func testSelfReplicatingFactoryHasStableRegistryKeys() {
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "poi.selfReplicatingFactory.exterior"),
            "pois/poi-factory/exterior"
        )
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "poi.selfReplicatingFactory.interior"),
            "pois/poi-factory/interior"
        )
    }

    func testAssetWorkbenchHasStableRegistryKeys() {
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "poi.assetWorkbench.exterior"),
            "pois/asset-workbench/exterior"
        )
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "poi.assetWorkbench.interior"),
            "pois/asset-workbench/interior"
        )
    }

    func testPlinkHasStableRegistryKeys() {
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "map.peggleLand"),
            "maps/peggle-land"
        )
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "poi.pegglePavilion.exterior"),
            "pois/peggle-pavilion/exterior"
        )
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "poi.pegglePavilion.interior"),
            "pois/peggle-pavilion/interior"
        )
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "peggle.spriteBoard"),
            "minigames/plink/sprite-board"
        )
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "peg.battle.enemy.bad-doggo.confident"),
            "minigames/peg-battle/bad-doggo/confident"
        )
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "peg.battle.arena.pavilion"),
            "minigames/peg-battle/arena/pavilion"
        )
    }
}
