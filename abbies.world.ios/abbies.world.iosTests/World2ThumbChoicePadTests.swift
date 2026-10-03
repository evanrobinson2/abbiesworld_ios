import XCTest
@testable import abbies_world_ios

final class World2ThumbChoicePadTests: XCTestCase {
    func testAPageHoldsUpToFourChoices() {
        let items = (0..<9).map { index in
            World2ZoneInteraction(
                id: "poi.\(index)",
                title: "Place \(index)",
                actionTitle: "Go",
                asset: "poi.portal.exterior",
                icon: "sparkles",
                kind: .poi(archetypeID: "poi.\(index)")
            )
        }
        XCTAssertEqual(World2ThumbChoicePad.page(of: items, page: 0).map(\.id), [
            "poi.0", "poi.1", "poi.2", "poi.3",
        ])
        XCTAssertEqual(World2ThumbChoicePad.page(of: items, page: 1).map(\.id), [
            "poi.4", "poi.5", "poi.6", "poi.7",
        ])
        XCTAssertEqual(World2ThumbChoicePad.page(of: items, page: 2).map(\.id), [
            "poi.8",
        ])
        XCTAssertEqual(
            World2ThumbChoicePad.page(of: items, page: 9).map(\.id),
            World2ThumbChoicePad.page(of: items, page: 2).map(\.id)
        )
        XCTAssertEqual(
            World2ThumbChoicePad.page(of: [World2ZoneInteraction](), page: 0),
            []
        )
    }

    func testInteriorExitSitsLast() {
        let extras = [
            World2ThumbAction(id: "decorate", title: "Decorate", icon: "paintbrush"),
        ]
        let stacked = extras + [.exit(accessibilityID: "world2.interior.back")]
        XCTAssertEqual(stacked.map(\.id), ["decorate", World2ThumbAction.exitID])
    }
}
