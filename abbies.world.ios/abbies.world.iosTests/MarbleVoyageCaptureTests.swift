import XCTest
@testable import abbies_world_ios

final class MarbleVoyageCaptureTests: XCTestCase {
    func testParsesStageArguments() {
        XCTAssertEqual(
            MarbleVoyageCapture.parseStage(from: ["-voyageCapture=title"]),
            .title
        )
        XCTAssertEqual(
            MarbleVoyageCapture.parseStage(from: ["-world2SkipAuth", "-voyageCapture=FIGHT"]),
            .fight
        )
        XCTAssertNil(MarbleVoyageCapture.parseStage(from: ["-world2SkipAuth"]))
        XCTAssertNil(MarbleVoyageCapture.parseStage(from: ["-voyageCapture=nope"]))
    }

    func testParsesSeedArgument() {
        XCTAssertEqual(
            MarbleVoyageCapture.parseSeed(from: ["-voyageCaptureSeed=99"]),
            99
        )
        XCTAssertNil(MarbleVoyageCapture.parseSeed(from: ["-voyageCapture=chart"]))
    }

    func testMakeRunParksFightOnTrailScrap() {
        let run = MarbleVoyageCapture.makeRun(for: .fight, seed: 42)
        XCTAssertNotNil(run)
        guard let run else { return }
        XCTAssertEqual(run.seed, 42)
        if case .fight(let id) = run.phase {
            XCTAssertEqual(id, MarbleVoyageCapture.captureFightNodeID)
            XCTAssertEqual(run.node(id)?.title, "Trail scrap")
        } else {
            XCTFail("expected fight phase, got \(run.phase)")
        }
    }

    func testMakeRunOpensShop() {
        let run = MarbleVoyageCapture.makeRun(for: .shop, seed: 42)
        XCTAssertNotNil(run)
        guard let run else { return }
        if case .shop = run.phase {
            XCTAssertNotNil(run.shop)
            XCTAssertGreaterThanOrEqual(run.coins, 80)
        } else {
            XCTFail("expected shop phase, got \(run.phase)")
        }
    }

    func testMakeRunParksEvent() {
        let run = MarbleVoyageCapture.makeRun(for: .event, seed: 42)
        XCTAssertNotNil(run)
        guard let run else { return }
        if case .event(let id) = run.phase {
            XCTAssertEqual(id, MarbleVoyageCapture.captureEventNodeID)
            let kind = run.node(id)?.kind
            XCTAssertTrue(
                kind == .treasure || kind == .mystery || kind == .shrine,
                "event node should be non-fight, got \(String(describing: kind))"
            )
        } else {
            XCTFail("expected event phase, got \(run.phase)")
        }
    }

    func testTitleHasNoRun() {
        XCTAssertNil(MarbleVoyageCapture.makeRun(for: .title, seed: 42))
    }

    func testDefaultMatrixIsAppStoreCore() {
        XCTAssertEqual(
            MarbleVoyageCaptureStage.defaultMatrix,
            [.title, .chart, .fight]
        )
    }
}
