import XCTest
@testable import abbies_world_ios

final class PlinkFlightProfilerTests: XCTestCase {
    func testRingKeepsRecentQuarterSecond() {
        for i in 0..<20 {
            PlinkFlightProfiler.record(
                currentTime: TimeInterval(i) * (1.0 / 60.0),
                dt: 1.0 / 60.0,
                updateMs: Double(i),
                phase: "flying",
                pegHits: i == 19 ? 12 : 0,
                shotAge: TimeInterval(i) * (1.0 / 60.0),
                note: i == 19 ? "BOMB" : ""
            )
        }
        let window = PlinkFlightProfiler.recentWindow()
        XCTAssertEqual(window.count, 16)
        XCTAssertEqual(window.last?.note, "BOMB")
        XCTAssertEqual(window.last?.pegHits, 12)
        guard let first = window.first else {
            XCTFail("empty window")
            return
        }
        XCTAssertEqual(first.updateMs, 4, accuracy: 0.01) // 20-16=4
    }
}
