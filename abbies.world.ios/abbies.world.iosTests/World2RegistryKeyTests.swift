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

    func testNewSemanticIdsUseTheConventionWithoutANewBinary() {
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "poi.figurineExplorer.exterior"),
            "pois/figurine-explorer/exterior"
        )
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "poi.figurineExplorer.interior"),
            "pois/figurine-explorer/interior"
        )
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "map.minimap"),
            "maps/minimap"
        )
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "map.threeBears"),
            "maps/three-bears"
        )
    }

    func testIrregularHistoricalKeysWinOverTheConvention() {
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "map.evan"),
            "maps/evan-citadel"
        )
        XCTAssertNotEqual(
            World2RegistryKey.conventionalKey(for: "map.evan"),
            "maps/evan-citadel"
        )
    }

    func testLivePortalUsesTheConventionalRegistryKey() {
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "poi.portal.exterior"),
            "pois/portal/exterior"
        )
        XCTAssertTrue(DevAssetCarvingService.shouldCutoutSprite(semanticId: "poi.portal.exterior"))
        XCTAssertFalse(DevAssetCarvingService.shouldCutoutSprite(semanticId: "map.home"))
    }
}
