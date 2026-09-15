import XCTest
@testable import abbies_world_ios

final class SnapEngineTests: XCTestCase {
    private let aspect = 4.0 / 3.0

    private func pad(
        _ id: String,
        x: Double,
        y: Double,
        accepts: Set<World2POISizeClass> = World2SceneHardpoint.anySizeClass,
        radius: Double = World2SceneHardpoint.defaultSnapRadius
    ) -> World2SceneHardpoint {
        World2SceneHardpoint(
            id: id,
            name: id,
            position: World2NormalizedPoint(x: x, y: y),
            acceptedSizeClasses: accepts,
            snapRadius: radius
        )
    }

    private func resolve(
        at x: Double,
        _ y: Double,
        pads: [World2SceneHardpoint],
        size: World2POISizeClass = .medium,
        occupancy: [String: String] = [:],
        moving: String? = nil,
        current: String? = nil,
        snapping: Bool = true
    ) -> World2HardpointSnapEngine.Resolution {
        World2HardpointSnapEngine.resolve(
            World2HardpointSnapEngine.Request(
                proposedPosition: World2NormalizedPoint(x: x, y: y),
                sizeClass: size,
                hardpoints: pads,
                occupancy: occupancy,
                movingInstanceID: moving,
                currentHardpointID: current,
                snappingEnabled: snapping,
                aspectRatio: aspect
            )
        )
    }

    func testSnapsToNearbyPadAndReportsIt() {
        let pads = [pad("a", x: 0.50, y: 0.50)]
        let result = resolve(at: 0.52, 0.51, pads: pads)
        XCTAssertEqual(result.hardpointID, "a")
        XCTAssertEqual(result.position, World2NormalizedPoint(x: 0.50, y: 0.50))
        XCTAssertEqual(result.highlightedHardpointID, "a")
        XCTAssertNil(result.rejection)
    }

    func testStaysFreeWhenNoPadIsClose() {
        let pads = [pad("a", x: 0.10, y: 0.10)]
        let result = resolve(at: 0.80, 0.80, pads: pads)
        XCTAssertNil(result.hardpointID)
        XCTAssertNil(result.highlightedHardpointID)
        XCTAssertEqual(result.position, World2NormalizedPoint(x: 0.80, y: 0.80))
    }

    func testSnappingDisabledNeverSnapsOrHighlights() {
        let pads = [pad("a", x: 0.50, y: 0.50)]
        let result = resolve(at: 0.50, 0.50, pads: pads, snapping: false)
        XCTAssertNil(result.hardpointID)
        XCTAssertNil(result.highlightedHardpointID)
        XCTAssertEqual(result.position, World2NormalizedPoint(x: 0.50, y: 0.50))
    }

    func testPicksNearestOfTwoCandidates() {
        let pads = [
            pad("far", x: 0.50, y: 0.50),
            pad("near", x: 0.56, y: 0.50),
        ]
        let result = resolve(at: 0.55, 0.50, pads: pads)
        XCTAssertEqual(result.hardpointID, "near")
    }

    func testOccupiedPadIsRejectedWithReason() {
        let pads = [pad("a", x: 0.50, y: 0.50)]
        let result = resolve(
            at: 0.50,
            0.50,
            pads: pads,
            occupancy: ["a": "instance.other"]
        )
        XCTAssertNil(result.hardpointID)
        XCTAssertEqual(result.highlightedHardpointID, "a")
        XCTAssertEqual(
            result.rejection,
            .occupied(hardpointID: "a", byInstanceID: "instance.other")
        )
    }

    func testAPlaceDoesNotBlockItselfFromItsOwnPad() {
        let pads = [pad("a", x: 0.50, y: 0.50)]
        let result = resolve(
            at: 0.50,
            0.50,
            pads: pads,
            occupancy: ["a": "instance.me"],
            moving: "instance.me"
        )
        XCTAssertEqual(result.hardpointID, "a")
        XCTAssertNil(result.rejection)
    }

    func testWrongSizePadIsRejectedWithReason() {
        let pads = [pad("small", x: 0.50, y: 0.50, accepts: [.small])]
        let result = resolve(at: 0.50, 0.50, pads: pads, size: .large)
        XCTAssertNil(result.hardpointID)
        XCTAssertEqual(result.highlightedHardpointID, "small")
        XCTAssertEqual(
            result.rejection,
            .wrongSize(hardpointID: "small", accepts: "small")
        )
    }

    func testPrefersCompatiblePadOverIncompatibleNearerOne() {
        let pads = [
            pad("smallOnly", x: 0.50, y: 0.50, accepts: [.small]),
            pad("anySize", x: 0.53, y: 0.50),
        ]
        let result = resolve(at: 0.50, 0.50, pads: pads, size: .large)
        XCTAssertEqual(result.hardpointID, "anySize")
        XCTAssertNil(result.rejection)
    }

    // MARK: - Hysteresis

    func testSnappedPlaceHoldsItsPadInsideBreakawayRadius() {
        let padA = pad("a", x: 0.50, y: 0.50, radius: 0.08)
        // 0.10 away is outside the 0.08 snap radius but inside breakaway (0.14).
        let result = resolve(at: 0.50, 0.60, pads: [padA], current: "a")
        XCTAssertEqual(result.hardpointID, "a", "should still be held by its pad")
        XCTAssertEqual(result.position, padA.position)
    }

    func testDraggingPastBreakawayRadiusUnsnaps() {
        let padA = pad("a", x: 0.50, y: 0.50, radius: 0.08)
        let result = resolve(at: 0.50, 0.75, pads: [padA], current: "a")
        XCTAssertNil(result.hardpointID, "should have broken away")
        XCTAssertEqual(result.position, World2NormalizedPoint(x: 0.50, y: 0.75))
    }

    func testBreakawayIsWiderThanSnapSoOneDragDoesNotChatter() {
        let padA = pad("a", x: 0.50, y: 0.50)
        XCTAssertGreaterThan(padA.breakawayRadius, padA.snapRadius)
    }

    // MARK: - Geometry

    func testDistanceIsAspectCorrectedSoPullRadiusIsCircular() {
        let center = World2NormalizedPoint(x: 0.5, y: 0.5)
        // On a 4:3 map the same normalized offset is a bigger real distance
        // horizontally than vertically.
        let horizontal = center.distance(
            to: World2NormalizedPoint(x: 0.6, y: 0.5),
            aspectRatio: aspect
        )
        let vertical = center.distance(
            to: World2NormalizedPoint(x: 0.5, y: 0.6),
            aspectRatio: aspect
        )
        XCTAssertGreaterThan(horizontal, vertical)
        XCTAssertEqual(horizontal / vertical, aspect, accuracy: 0.0001)
    }

    func testPositionsAreClampedOntoTheMap() {
        let result = resolve(at: 5.0, -3.0, pads: [])
        XCTAssertLessThanOrEqual(result.position.x, 1.0)
        XCTAssertGreaterThanOrEqual(result.position.y, 0.0)
    }

    // MARK: - Occupancy helpers

    func testOccupancyMapsPadsToTheInstancesStandingOnThem() {
        let instances = [
            instance("i1", pad: "a"),
            instance("i2", pad: nil),
            instance("i3", pad: "b"),
        ]
        let occupancy = World2HardpointSnapEngine.occupancy(of: instances)
        XCTAssertEqual(occupancy, ["a": "i1", "b": "i3"])
    }

    func testOpenHardpointsExcludesOccupiedPads() {
        let pads = [pad("a", x: 0.2, y: 0.2), pad("b", x: 0.8, y: 0.8)]
        let open = World2HardpointSnapEngine.openHardpoints(
            in: pads,
            occupancy: ["a": "i1"]
        )
        XCTAssertEqual(open.map(\.id), ["b"])
    }

    func testSuggestedHardpointPicksNearestOpenCompatiblePad() {
        let pads = [
            pad("taken", x: 0.50, y: 0.50),
            pad("smallOnly", x: 0.52, y: 0.50, accepts: [.small]),
            pad("good", x: 0.60, y: 0.50),
        ]
        let suggestion = World2HardpointSnapEngine.suggestedHardpoint(
            for: .large,
            near: World2NormalizedPoint(x: 0.50, y: 0.50),
            hardpoints: pads,
            occupancy: ["taken": "i1"],
            aspectRatio: aspect
        )
        XCTAssertEqual(suggestion?.id, "good")
    }

    private func instance(_ id: String, pad: String?) -> World2POIInstance {
        World2POIInstance(
            id: id,
            archetypeID: "poi.test",
            sceneID: "scene.test",
            transform: World2POITransform(x: 0.5, y: 0.5),
            hardpointID: pad
        )
    }
}
