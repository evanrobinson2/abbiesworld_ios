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

    func testMinimapIconsHaveStableRegistryKeys() {
        XCTAssertEqual(World2RegistryKey.assetKey(for: "minimap.home"), "maps/minimap/home")
        XCTAssertEqual(
            World2RegistryKey.assetKey(for: "minimap.threeBears"),
            "maps/minimap/three-bears"
        )
    }
}
