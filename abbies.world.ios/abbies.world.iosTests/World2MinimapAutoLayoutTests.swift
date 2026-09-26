import XCTest
@testable import abbies_world_ios

final class World2MinimapAutoLayoutTests: XCTestCase {
    func testPeglinChainLaysOutOnASingleRow() {
        let ids = PeglinEdition.allSceneIDs
        let edges = zip(ids, ids.dropFirst()).map {
            World2MinimapAutoLayout.Edge(from: $0.0, to: $0.1, direction: .north)
        }
        let positions = World2MinimapAutoLayout.positions(
            sceneIDs: ids,
            edges: edges,
            originSceneID: PeglinEdition.crashLandSceneID
        )
        XCTAssertEqual(positions.count, 5)
        let ys = Set(positions.values.map(\.y))
        XCTAssertEqual(ys, [0], "Peglin lands should share one row so paths never cross")
        let xs = ids.compactMap { positions[$0]?.x }
        XCTAssertEqual(xs, [0, 1, 2, 3, 4])
    }

    func testCollisionSpiralNeverStacksNodes() {
        let occupied: Set<String> = ["0,0", "1,0", "-1,0", "0,1", "0,-1"]
        let cell = World2MinimapAutoLayout.firstFreeCell(
            preferred: (0, 0),
            around: (0, 0),
            occupied: occupied
        )
        XCTAssertFalse(occupied.contains("\(cell.x),\(cell.y)"))
    }

    func testPlatePositionPicksCardinal() {
        XCTAssertEqual(World2MinimapAutoLayout.direction(fromPlateX: 0.5, y: 0.15), .north)
        XCTAssertEqual(World2MinimapAutoLayout.direction(fromPlateX: 0.5, y: 0.9), .south)
        XCTAssertEqual(World2MinimapAutoLayout.direction(fromPlateX: 0.1, y: 0.5), .west)
        XCTAssertEqual(World2MinimapAutoLayout.direction(fromPlateX: 0.9, y: 0.5), .east)
    }
}
