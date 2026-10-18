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
            ("level_07", [-2.994401604454627, -1.6743645674570187, 16.251016720142896, 0.15467899865115337, -0.008623489144129692]),
            ("level_05", [-8.531709148514953, -11.583130621654572, 5.467497026539276, 1.807817566899688, 0.5757409027281276]),
            ("level_06", [-6.955050436942671, 0.49291275886056085, 1.4054096126626319, 2.2596866129145865, -0.585451941933924]),
            ("level_04", [-6.133406805519389, -7.374790136694596, 6.1808076047116725, 2.7203366101953543, 0.5653642371529858])
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
