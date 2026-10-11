import XCTest
@testable import abbies_world_ios

final class World2WaterfallStrokeTests: XCTestCase {
    func testHomeSeedHasUsablePolyline() throws {
        let seed = World2WaterfallStroke.homeSeed()
        XCTAssertGreaterThanOrEqual(seed.points.count, 2)
        XCTAssertFalse(seed.isEmpty)
        let mid = try XCTUnwrap(seed.sample(at: 0.5))
        // Seed sits in the painted falls (~0.28–0.32 x after +1" nudge).
        XCTAssertGreaterThan(mid.x, 0.22)
        XCTAssertLessThan(mid.x, 0.40)
        XCTAssertGreaterThan(mid.y, 0.45)
        XCTAssertLessThan(mid.y, 0.85)
    }

    func testSampleEndpointsMatchPoints() throws {
        let stroke = World2WaterfallStroke(
            sceneID: "test",
            points: [
                .init(id: "a", x: 0.2, y: 0.1, halfWidth: 0.02),
                .init(id: "b", x: 0.4, y: 0.9, halfWidth: 0.04),
            ]
        )
        let top = try XCTUnwrap(stroke.sample(at: 0))
        let bot = try XCTUnwrap(stroke.sample(at: 1))
        XCTAssertEqual(top.x, 0.2, accuracy: 0.0001)
        XCTAssertEqual(top.y, 0.1, accuracy: 0.0001)
        XCTAssertEqual(bot.x, 0.4, accuracy: 0.0001)
        XCTAssertEqual(bot.y, 0.9, accuracy: 0.0001)
    }
}
