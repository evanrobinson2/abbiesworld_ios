import CoreGraphics
import XCTest
@testable import abbies_world_ios

final class World2SceneLabelLayoutTests: XCTestCase {
    func testSingleLabelStaysOnItsAnchor() {
        let item = World2SceneLabelItem(
            id: "one",
            text: "Treehouse",
            preferredCenter: CGPoint(x: 200, y: 180),
            size: CGSize(width: 120, height: 30),
            priority: 1
        )
        let bounds = CGRect(x: 0, y: 0, width: 800, height: 600)
        let centers = World2SceneLabelLayout.resolve(items: [item], bounds: bounds)
        XCTAssertEqual(centers["one"], item.preferredCenter)
    }

    func testOverlappingLabelsSeparate() {
        let size = CGSize(width: 140, height: 32)
        let shared = CGPoint(x: 300, y: 240)
        let items = [
            World2SceneLabelItem(id: "a", text: "Abbie", preferredCenter: shared, size: size, priority: 2),
            World2SceneLabelItem(id: "b", text: "Daddy", preferredCenter: shared, size: size, priority: 2),
        ]
        let bounds = CGRect(x: 0, y: 0, width: 800, height: 600)
        let centers = World2SceneLabelLayout.resolve(items: items, bounds: bounds)
        let a = centers["a"]!
        let b = centers["b"]!
        let aBox = CGRect(x: a.x - 70, y: a.y - 16, width: 140, height: 32)
        let bBox = CGRect(x: b.x - 70, y: b.y - 16, width: 140, height: 32)
        XCTAssertFalse(aBox.intersects(bBox))
        XCTAssertTrue(
            World2SceneLabelLayout.isClear(items: items, centers: centers)
        )
    }

    func testLabelMovesOffArtwork() {
        let item = World2SceneLabelItem(
            id: "poi",
            text: "Card Factory",
            preferredCenter: CGPoint(x: 200, y: 200),
            size: CGSize(width: 160, height: 32),
            priority: 1
        )
        let art = CGRect(x: 100, y: 120, width: 200, height: 160)
        let bounds = CGRect(x: 0, y: 0, width: 800, height: 600)
        let centers = World2SceneLabelLayout.resolve(
            items: [item],
            obstacles: [art],
            bounds: bounds
        )
        let center = centers["poi"]!
        let box = CGRect(x: center.x - 80, y: center.y - 16, width: 160, height: 32)
        XCTAssertFalse(box.intersects(art))
        XCTAssertGreaterThanOrEqual(center.y, art.maxY)
    }
}

final class World2ChromeContractTests: XCTestCase {
    func testHeaderFrameIsFixedInTheTitleSlot() {
        let bounds = CGRect(x: 0, y: 0, width: 1180, height: 820)
        let first = World2ChromeContract.headerFrame(in: bounds)
        let second = World2ChromeContract.headerFrame(in: bounds)
        XCTAssertEqual(first, second)
        XCTAssertEqual(first.size, World2ChromeContract.titleSlot)
        XCTAssertEqual(first.minX, World2ChromeContract.titleLeading, accuracy: 0.5)
        XCTAssertEqual(first.minY, World2ChromeContract.titleTop, accuracy: 0.5)
        XCTAssertLessThan(first.maxY, 120)
    }

    func testQRFrameSitsToTheRightOfTheTitleSlot() {
        let bounds = CGRect(x: 0, y: 0, width: 1180, height: 820)
        let frame = World2ChromeContract.qrFrame(in: bounds)
        XCTAssertEqual(frame.size, World2ChromeContract.qrSize)
        XCTAssertEqual(
            frame.minX,
            World2ChromeContract.titleLeading
                + World2ChromeContract.titleSlot.width
                + World2ChromeContract.qrGap,
            accuracy: 0.5
        )
        XCTAssertEqual(frame.minY, World2ChromeContract.titleTop, accuracy: 0.5)
        XCTAssertLessThan(frame.maxY, 120)
    }

    func testLongStringsInjectEllipsis() {
        XCTAssertEqual(
            World2ChromeContract.ellipsized("Open ground", budget: 16),
            "Open ground"
        )
        XCTAssertEqual(
            World2ChromeContract.ellipsized("Figurine Explorer", budget: 16),
            "Figurine Expl..."
        )
        XCTAssertEqual(
            World2ChromeContract.ellipsized("Daddy's Citadel", budget: World2ChromeContract.titleBudget),
            "Daddy's Citadel"
        )
        XCTAssertTrue(
            World2ChromeContract.ellipsized(
                "Drag to look around · choose a place to visit",
                budget: World2ChromeContract.titleBudget
            ).hasSuffix("...")
        )
    }
}
