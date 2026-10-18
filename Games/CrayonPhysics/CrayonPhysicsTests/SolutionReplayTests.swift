import XCTest
@testable import CrayonPhysicsKit

/// Headless gameplay regression: actual Swift recognition -> shared C++ solver ->
/// source goal test. These do not replace finger/Pencil or original-game playtests.
final class SolutionReplayTests: XCTestCase {
    @MainActor
    func testCandidateStrokesReachGoals() throws {
        let catalog = try LevelCatalog.load()
        let candidates: [(String, [Double])] = [
            ("level_01", [-8.442300367862895, -9.889520606092628, 2.4374749301937317, 2.4233006608483376, 0.4771351633095532]),
            ("level_02", [-0.26975901076228137, -9.717865639606572, 19.242436975425115, 0.3105919069811579, -0.3886035153493903]),
            ("level_07", [-1.1761950139992767, 0.04550109983670514, 20.23863069710617, 1.6616905375030904, 0.17118877958882384]),
            ("level_05", [-9.08365176314707, -12.463779708888364, 1.5451488949988523, 0.73912586825915, -0.2232285069575643]),
            ("level_06", [-9.039038559544625, 0.2720362496424047, 6.615955363485399, 1.8091627901835294, 0.5419744517227248]),
            ("level_04", [-0.44766679046928326, -9.553221837470641, 15.122849605243083, 2.516275044225561, -0.1596908312828807])
        ]
        for (id, box) in candidates {
            let level = try XCTUnwrap(catalog.levels.first { $0.id == id })
            let physics = SourcePhysics(level: level)
            let ball = try XCTUnwrap(level.bodies.first { $0.special == "da_ball" })
            let handle = try XCTUnwrap(physics.handle(for: ball.id))
            let c = cos(box[4]), s = sin(box[4])
            // Sample the four edges, matching the live input's roughly2px spacing.
            let corners = [(-1.0, -1.0), (1.0, -1.0), (1.0, 1.0), (-1.0, 1.0), (-1.0, -1.0)].map { x, y in
                WorldCoordinates.point(SourceVector(x: box[0] + x*box[2]/2*c - y*box[3]/2*s,
                                                     y: box[1] + x*box[2]/2*s + y*box[3]/2*c))
            }
            var stroke: [CGPoint] = []
            for edge in 0..<4 {
                let a = corners[edge], b = corners[edge+1]
                let count = max(1, Int(hypot(b.x-a.x, b.y-a.y) / 2))
                for index in 0..<count {
                    let t = CGFloat(index) / CGFloat(count)
                    stroke.append(CGPoint(x: a.x + t*(b.x-a.x), y: a.y + t*(b.y-a.y)))
                }
            }
            stroke.append(corners[0])
            let recognized = try XCTUnwrap(StrokeRecognizer.recognize(stroke), id)
            var stars = level.stars
            for step in 0..<900 {
                if step == 60 { _ = physics.addDrawing(recognized) }
                physics.step()
                var state = try XCTUnwrap(physics.state(handle))
                if (step+1).isMultiple(of: 101), state.y > 15 {
                    physics.restoreBall(ball)
                    state = try XCTUnwrap(physics.state(handle))
                }
                let threshold = ball.radius.x/2 + (stars.first?.radius ?? 0)
                stars.removeAll { hypot(Double(state.x)-$0.position.x, Double(state.y)-$0.position.y) < threshold }
                if stars.isEmpty { break }
            }
            XCTAssertTrue(stars.isEmpty, "\(id) recognized candidate did not solve; fit=\(recognized)")
        }
    }
}
