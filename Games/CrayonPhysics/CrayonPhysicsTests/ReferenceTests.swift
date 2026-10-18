import XCTest
@testable import CrayonPhysicsKit

final class ReferenceTests: XCTestCase {
    func testSourceCoordinates() {
        let origin = WorldCoordinates.point(SourceVector(x: 0, y: 0))
        XCTAssertEqual(origin.x, 400)
        XCTAssertEqual(origin.y, 100)
        let topLeft = WorldCoordinates.point(SourceVector(x: -12.5, y: -15.625))
        XCTAssertEqual(topLeft.x, 0)
        XCTAssertEqual(topLeft.y, 600)
    }
    func testTinyStrokeDoesNotCreateBody() {
        XCTAssertNil(StrokeRecognizer.recognize([.zero, CGPoint(x: 1, y: 1), CGPoint(x: 2, y: 1)]))
    }
    func testRectangleFit() throws {
        let shape = try XCTUnwrap(StrokeRecognizer.recognize([
            CGPoint(x: 100, y: 100), CGPoint(x: 200, y: 100),
            CGPoint(x: 200, y: 150), CGPoint(x: 100, y: 150), CGPoint(x: 100, y: 100)
        ]))
        XCTAssertEqual(shape.center.x, 150, accuracy: 1)
        XCTAssertEqual(shape.center.y, 125, accuracy: 1)
        XCTAssertEqual(shape.size.width * shape.size.height, 5000, accuracy: 300)
    }
    func testSourceCandidateFamilies() {
        // Four distinct extrema do not qualify for the thin-stroke family.
        let rectangle = [CGPoint(x: 100, y: 125), CGPoint(x: 150, y: 100),
                         CGPoint(x: 200, y: 125), CGPoint(x: 150, y: 150)]
        let candidates = StrokeRecognizer.sourceCandidates(rectangle)
        XCTAssertEqual(candidates.count, 11) // seven axis-aligned + four rotated
        XCTAssertEqual(candidates[1].size.width, 95, accuracy: 0.001)
        XCTAssertEqual(candidates[1].size.height, 50, accuracy: 0.001)
        XCTAssertEqual(candidates[2].size.height, 47.5, accuracy: 0.001)
        let line = StrokeRecognizer.sourceCandidates([CGPoint(x: 0, y: 0), CGPoint(x: 50, y: 50), CGPoint(x: 100, y: 100)])
        XCTAssertEqual(line.count, 22) // eleven additional thin-stroke proposals
        XCTAssertEqual(line.first?.size.height, 2)
    }
    func testCornerTiesAlsoProposeThinRectangles() {
        // Source tests extrema proximity, not whether a path is closed. With
        // earliest left/top and latest right/bottom, these corners form a diagonal.
        let corners = [CGPoint(x: 100, y: 100), CGPoint(x: 200, y: 100),
                       CGPoint(x: 200, y: 150), CGPoint(x: 100, y: 150), CGPoint(x: 100, y: 100)]
        let candidates = StrokeRecognizer.sourceCandidates(corners)
        XCTAssertEqual(candidates.count, 22)
        XCTAssertEqual(candidates[0].size.width, hypot(100, 50) + 5, accuracy: 0.001)
        XCTAssertEqual(candidates[0].size.height, 2)
        XCTAssertEqual(candidates[11].size.width, 100)
        XCTAssertEqual(candidates[11].size.height, 50)
        XCTAssertEqual(candidates[12].size.width, 95, accuracy: 0.001)
    }
    @MainActor
    func testLevelPickerReturnsToPausedMenu() throws {
        let session = GameSession(defaults: UserDefaults(suiteName: UUID().uuidString)!)
        _ = try XCTUnwrap(session.catalog)
        session.openBox()
        session.start()
        session.pause()
        session.selectLevels()
        session.closeLevels()
        XCTAssertEqual(session.screen, .menu)
        XCTAssertTrue(session.scene?.isPaused == true)
        session.resume()
        XCTAssertEqual(session.screen, .playing)
    }
    @MainActor
    func testResetPreservesToolAndNextPuzzleClearsIt() throws {
        let session = GameSession(defaults: UserDefaults(suiteName: UUID().uuidString)!)
        _ = try XCTUnwrap(session.catalog)
        session.openBox()
        session.start()
        session.tool = .erase
        session.reset()
        XCTAssertEqual(session.tool, .erase)
        session.start(1)
        XCTAssertEqual(session.tool, .draw)
    }
}
