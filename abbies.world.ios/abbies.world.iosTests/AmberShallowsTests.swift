import XCTest
@testable import abbies_world_ios

final class AmberShallowsTests: XCTestCase {
    func testMicroscopeIsReachableFromHomeWithoutSpendingInventory() {
        let scene = World2SceneCatalog.homeWorld
        let instance = scene.poiInstances.first { $0.archetypeID == World2POIRegistry.microscopeID }
        XCTAssertNotNil(instance)
        XCTAssertEqual(World2POIRegistry.microscope.route, .microscope)
        XCTAssertTrue(World2POIRegistry.microscope.contract.costs.isEmpty)
        XCTAssertTrue(World2POIRegistry.microscope.contract.grants.isEmpty)
        XCTAssertTrue(World2POIRegistry.validate(scene: scene).isEmpty)
        XCTAssertFalse(scene.openHardpoints.isEmpty)
    }

    @MainActor
    func testOlderEditedHomeGetsMicroscopeWithoutLosingEditsOrDuplicatingIt() throws {
        let suite = "amber-migration-test." + UUID().uuidString
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suite))
        defer { defaults.removePersistentDomain(forName: suite) }
        var old = World2SceneCatalog.homeWorld
        old.poiInstances.removeAll { $0.archetypeID == World2POIRegistry.microscopeID }
        old.hardpoints.removeAll { $0.id == "hardpoint.home.microscopePad" }
        old.name = "Abbie’s edited home"
        let encoder = JSONEncoder(); encoder.dateEncodingStrategy = .iso8601
        defaults.set(try encoder.encode([old.id: old]), forKey: "world2.sceneGraph.v1.player.abbie")
        let store = World2SceneGraphStore(defaults: defaults)
        store.selectPlayer(.abbie)
        let updated = store.scene(old.id)
        XCTAssertEqual(updated.name, old.name)
        XCTAssertTrue(old.poiInstances.allSatisfy { updated.poiInstances.contains($0) })
        XCTAssertEqual(updated.poiInstances.filter { $0.archetypeID == World2POIRegistry.microscopeID }.count, 1)
        store.selectPlayer(.ani)
        store.selectPlayer(.abbie)
        XCTAssertEqual(store.scene(old.id), updated)
    }
}
