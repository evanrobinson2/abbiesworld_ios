import XCTest
@testable import abbies_world_ios

final class AbbieCottageDecorCatalogTests: XCTestCase {
    func testCottageTrayExcludesCozyRoomKit() {
        let cottage = FurnitureItem.abbieCottageDecorCatalog
        XCTAssertFalse(cottage.isEmpty)
        XCTAssertTrue(cottage.contains { $0.id == FurnitureItem.abbieStarterBed.id })
        XCTAssertFalse(cottage.contains { $0.id == FurnitureItem.aniStarterBed.id })
        XCTAssertFalse(cottage.contains { $0.id.hasPrefix("crk-") })
        XCTAssertFalse(cottage.contains { $0.assetName.hasPrefix("cozy_room_") })
    }

    func testArtDirectorFurnitureAndStuffiesAreInCottageCatalog() {
        let ids = Set(FurnitureItem.abbieCottageDecorCatalog.map(\.id))
        XCTAssertGreaterThanOrEqual(ids.filter { $0.hasPrefix("acd-furniture4-") }.count, 9)
        XCTAssertGreaterThanOrEqual(ids.filter { $0.hasPrefix("acd-stuffies2-") }.count, 9)
        XCTAssertGreaterThanOrEqual(ids.filter { $0.hasPrefix("acd-stuffies4-") }.count, 6)
        XCTAssertGreaterThanOrEqual(ids.filter { $0.hasPrefix("acd-lamps-") }.count, 6)
    }

    func testCottageCatalogAssetsResolveFromBundle() {
        for item in FurnitureItem.abbieCottageDecorCatalog {
            XCTAssertNotNil(
                UIImage(named: item.assetName),
                "Missing imageset for \(item.id) → \(item.assetName)"
            )
        }
    }

    func testCottageDecorItemsTaggedForCottage() {
        let pack = FurnitureItem.abbieCottageDecorCatalog.filter { $0.id.hasPrefix("acd-") }
        XCTAssertFalse(pack.isEmpty)
        for item in pack {
            XCTAssertTrue(
                FurnitureItem.isAbbieCottageDecor(item),
                item.id
            )
        }
    }
}
