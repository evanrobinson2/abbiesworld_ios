import XCTest
@testable import abbies_world_ios

final class AbbieHomeDefaultTests: XCTestCase {
    func testPeglinIsNotDefaultDestination() {
        XCTAssertFalse(PeglinEdition.isDefaultDestination)
    }

    func testNewAccountDocumentHasOnlyAbbieCottage() {
        let doc = World2WorldSync.shared.documentForNewAccount()
        XCTAssertEqual(doc.activeSceneID, "scene.home")
        guard let home = doc.scenes["scene.home"] else {
            return XCTFail("scene.home missing from new-account document")
        }
        XCTAssertEqual(home.backgroundAsset, "map.home")
        let arch = Set(home.poiInstances.map(\.archetypeID))
        XCTAssertEqual(arch, [World2POIRegistry.abbieTreehouseID])
        let placeIDs = Set((doc.places ?? []).map(\.id))
        XCTAssertEqual(placeIDs, [World2POIRegistry.abbieTreehouseID])
    }

    func testHomeCatalogOnlyHasAbbieCottage() {
        let home = World2SceneCatalog.homeWorld
        let arch = Set(home.poiInstances.map(\.archetypeID))
        XCTAssertEqual(arch, [World2POIRegistry.abbieTreehouseID])
        let abbie = home.poiInstances.first!
        XCTAssertEqual(abbie.transform.position.x, 0.65, accuracy: 0.001)
        XCTAssertEqual(abbie.transform.position.y, 0.64, accuracy: 0.001)
    }

    @MainActor
    func testBundledHomePlatesResolveFromRuntimeManifest() {
        XCTAssertNotNil(
            AssetBootstrapService.shared.image(for: "map.home"),
            "map.home should resolve from world2_runtime_manifest / asset catalog"
        )
        XCTAssertNotNil(
            AssetBootstrapService.shared.image(for: "poi.abbieTreehouse.exterior"),
            "Abbie treehouse exterior should resolve from bundled catalog"
        )
    }
}
