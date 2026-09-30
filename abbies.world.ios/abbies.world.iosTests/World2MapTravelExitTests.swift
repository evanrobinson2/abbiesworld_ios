import XCTest
@testable import abbies_world_ios

final class World2MapTravelExitTests: XCTestCase {
    func testBuildPrefersGraphConnectorsForDirection() {
        let connectors = [
            World2SceneConnector(
                id: "c.north",
                fromSceneID: "scene.peglin.crashLand",
                direction: .north,
                toSceneID: "scene.peglin.foxLand",
                isLocked: true
            ),
            World2SceneConnector(
                id: "c.south",
                fromSceneID: "scene.peglin.crashLand",
                direction: .south,
                toSceneID: nil,
                isLocked: false
            ),
        ]
        let exits = World2MapTravelExit.build(
            connectors: connectors,
            travelPads: [
                (destinationSceneID: "scene.peglin.foxLand", x: 0.9, y: 0.5),
            ],
            presentation: { id in
                (title: id == "scene.peglin.foxLand" ? "Fox Land" : id, plateAsset: "map.peglin.foxLand")
            }
        )
        XCTAssertEqual(exits.count, 1)
        XCTAssertEqual(exits[0].destinationSceneID, "scene.peglin.foxLand")
        XCTAssertEqual(exits[0].direction, .north)
        XCTAssertEqual(exits[0].title, "Fox Land")
        XCTAssertEqual(exits[0].plateAsset, "map.peglin.foxLand")
    }

    func testBuildFallsBackToTravelPadCardinal() {
        let exits = World2MapTravelExit.build(
            connectors: [],
            travelPads: [
                (destinationSceneID: "scene.peglin.foxLand", x: 0.52, y: 0.18),
                (destinationSceneID: "scene.home", x: 0.5, y: 0.88),
            ],
            presentation: { id in
                if id.contains("fox") {
                    return ("Fox Land", "map.peglin.foxLand")
                }
                return ("Abbie's World", "map.home")
            }
        )
        XCTAssertEqual(exits.count, 2)
        let fox = exits.first { $0.destinationSceneID.contains("fox") }
        let home = exits.first { $0.destinationSceneID == "scene.home" }
        XCTAssertEqual(fox?.direction, .north)
        XCTAssertEqual(home?.direction, .south)
        XCTAssertEqual(World2ExitEdge(cardinal: .north), .top)
        XCTAssertEqual(World2ExitEdge(cardinal: .south), .bottom)
    }

    func testPlateCardinalFromNormalizedPosition() {
        XCTAssertEqual(World2MinimapAutoLayout.direction(fromPlateX: 0.5, y: 0.1), .north)
        XCTAssertEqual(World2MinimapAutoLayout.direction(fromPlateX: 0.5, y: 0.9), .south)
        XCTAssertEqual(World2MinimapAutoLayout.direction(fromPlateX: 0.1, y: 0.5), .west)
        XCTAssertEqual(World2MinimapAutoLayout.direction(fromPlateX: 0.9, y: 0.5), .east)
    }
}
