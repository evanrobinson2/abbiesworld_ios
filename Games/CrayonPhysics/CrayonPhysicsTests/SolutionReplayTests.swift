import XCTest
@testable import CrayonPhysicsKit

/// Actual Swift recognition -> shared C++ solver -> source goal test.
/// This does not replace finger/Pencil or original-game playtests.
final class SolutionReplayTests: XCTestCase {
    private struct Fixture: Decodable { let results: [Replay] }
    private struct Replay: Decodable { let level: String; let actions: [Action] }
    private struct Action: Decodable { let step: Int; let box: [Double]?; let eraseAll: Bool? }

    @MainActor
    func testCandidateStrokesReachGoals() throws {
        let catalog = try LevelCatalog.load()
        let url = try XCTUnwrap(Bundle(for: Self.self).url(forResource: "solutions", withExtension: "json"))
        let fixture = try JSONDecoder().decode(Fixture.self, from: Data(contentsOf: url))
        XCTAssertEqual(fixture.results.map(\.level), Array(catalog.levels.prefix(7)).map(\.id))
        for replay in fixture.results {
            let level = try XCTUnwrap(catalog.levels.first { $0.id == replay.level })
            let physics = SourcePhysics(level: level)
            let ball = try XCTUnwrap(level.bodies.first { $0.special == "da_ball" })
            let handle = try XCTUnwrap(physics.handle(for: ball.id))
            var drawings: [Int32] = []
            var stars = level.stars
            var fits: [RecognizedRectangle] = []
            for step in 0..<3000 {
                for action in replay.actions where action.step == step {
                    if action.eraseAll == true {
                        drawings.forEach { physics.remove($0) }
                        drawings.removeAll()
                    } else {
                        let box = try XCTUnwrap(action.box)
                        let fit = try XCTUnwrap(StrokeRecognizer.recognize(stroke(for: box)), replay.level)
                        fits.append(fit)
                        drawings.append(physics.addDrawing(fit))
                    }
                }
                physics.step()
                var state = try XCTUnwrap(physics.state(handle))
                if (step+1).isMultiple(of: 101), state.y > 15 {
                    physics.restoreBall(ball)
                    state = try XCTUnwrap(physics.state(handle))
                }
                if (step+1).isMultiple(of: 101) {
                    let sourceHandles = level.bodies.compactMap { physics.handle(for: $0.id) }
                    for other in sourceHandles + drawings where other != handle {
                        if let body = physics.state(other), body.y > 30 { physics.remove(other) }
                    }
                }
                let threshold = ball.radius.x/2 + (stars.first?.radius ?? 0)
                stars.removeAll { hypot(Double(state.x)-$0.position.x, Double(state.y)-$0.position.y) < threshold }
                if stars.isEmpty { break }
            }
            XCTAssertTrue(stars.isEmpty, "\(replay.level) recognized strokes did not solve; remaining=\(stars.count); fits=\(fits)")
        }
    }

    private func stroke(for box: [Double]) -> [CGPoint] {
        let cosine: Double = cos(box[4])
        let sine: Double = sin(box[4])
        let halfWidth: Double = box[2] / 2.0
        let halfHeight: Double = box[3] / 2.0
        let signs: [(Double, Double)] = [(-1, -1), (1, -1), (1, 1), (-1, 1), (-1, -1)]
        var corners: [CGPoint] = []
        for (horizontal, vertical) in signs {
            let localX: Double = horizontal * halfWidth
            let localY: Double = vertical * halfHeight
            let rotatedX: Double = localX * cosine - localY * sine
            let rotatedY: Double = localX * sine + localY * cosine
            let source = SourceVector(x: box[0] + rotatedX, y: box[1] + rotatedY)
            corners.append(WorldCoordinates.point(source))
        }
        var points: [CGPoint] = []
        for edge in 0..<4 {
            let a = corners[edge], b = corners[edge+1]
            let count = max(1, Int(hypot(b.x-a.x, b.y-a.y) / 2))
            for index in 0..<count {
                let t = CGFloat(index) / CGFloat(count)
                points.append(CGPoint(x: a.x + t*(b.x-a.x), y: a.y + t*(b.y-a.y)))
            }
        }
        points.append(corners[0])
        return points
    }
}
