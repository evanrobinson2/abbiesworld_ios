import XCTest
@testable import abbies_world_ios

final class DecorationInstanceSkewTests: XCTestCase {
    func testLegacySavesDecodeWithZeroSkew() throws {
        let json = """
        {
          "id": "inv_1",
          "decorationId": "acd-lamps-01-sleepy-dragon-globe-lamp",
          "x": 0.4,
          "y": 0.5,
          "scale": 1.0,
          "rotation": 12,
          "zIndex": 2,
          "acquiredAt": 0
        }
        """.data(using: .utf8)!
        let decoded = try JSONDecoder().decode(DecorationInstance.self, from: json)
        XCTAssertEqual(decoded.skewX, 0)
        XCTAssertEqual(decoded.skewY, 0)
        XCTAssertEqual(decoded.rotation, 12)
    }

    func testSkewRoundTrips() throws {
        let original = DecorationInstance(
            id: "inv_2",
            decorationId: "furniture.abbie.starterBed",
            x: 0.5,
            y: 0.5,
            scale: 0.9,
            rotation: -8,
            skewX: 0.25,
            skewY: -0.1
        )
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(DecorationInstance.self, from: data)
        XCTAssertEqual(decoded.skewX, 0.25, accuracy: 0.0001)
        XCTAssertEqual(decoded.skewY, -0.1, accuracy: 0.0001)
    }
}
