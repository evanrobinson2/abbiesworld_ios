import XCTest
@testable import abbies_world_ios

final class World2WorldUpdateTests: XCTestCase {
    func testNewSceneAndPortalShowUpInWhatsNew() {
        let old = World2PlayableSnapshot(
            revision: 16,
            scenes: [
                "scene.home": .init(
                    name: "Abbie's World",
                    backgroundAsset: "map.home",
                    poiIDs: ["poi.homePortal"]
                )
            ],
            places: ["poi.homePortal": "To Spooky Land"]
        )
        let new = World2PlayableSnapshot(
            revision: 17,
            scenes: [
                "scene.home": .init(
                    name: "Abbie's World",
                    backgroundAsset: "map.home",
                    poiIDs: ["poi.homePortal"]
                ),
                "scene.candy": .init(
                    name: "Candy Land",
                    backgroundAsset: "map.candy",
                    poiIDs: ["poi.candyGate"]
                )
            ],
            places: [
                "poi.homePortal": "To Spooky Land",
                "poi.candyGate": "Candy Gate",
            ]
        )
        let summary = World2WorldUpdateSummary.diff(from: old, to: new)
        XCTAssertEqual(summary.headline, "New lands!")
        XCTAssertTrue(summary.lines.contains("New land: Candy Land"))
        XCTAssertTrue(summary.lines.contains("New place: Candy Gate"))
        XCTAssertEqual(summary.toRevision, 17)
        XCTAssertTrue(summary.unseenIDs.contains("scene.candy"))
        XCTAssertTrue(summary.unseenIDs.contains("poi.candyGate"))
    }

    func testBackgroundChangeIsANewPicture() {
        let old = World2PlayableSnapshot(
            revision: 4,
            scenes: [
                "scene.home": .init(
                    name: "Abbie's World",
                    backgroundAsset: "map.home",
                    poiIDs: []
                )
            ],
            places: [:]
        )
        let new = World2PlayableSnapshot(
            revision: 5,
            scenes: [
                "scene.home": .init(
                    name: "Abbie's World",
                    backgroundAsset: "map.home.v2",
                    poiIDs: []
                )
            ],
            places: [:]
        )
        let summary = World2WorldUpdateSummary.diff(from: old, to: new)
        XCTAssertEqual(summary.headline, "New pictures!")
        XCTAssertEqual(summary.lines, ["New picture for Abbie's World"])
    }

    func testUnchangedLayoutStillHasALine() {
        let snap = World2PlayableSnapshot(
            revision: 8,
            scenes: [
                "scene.home": .init(name: "Home", backgroundAsset: "map.home", poiIDs: [])
            ],
            places: [:]
        )
        let summary = World2WorldUpdateSummary.diff(
            from: snap,
            to: World2PlayableSnapshot(revision: 9, scenes: snap.scenes, places: snap.places)
        )
        XCTAssertEqual(summary.headline, "The map changed!")
        XCTAssertEqual(summary.lines, ["The layout got an update."])
    }

    @MainActor
    func testLaunchPullOfANewerRevisionShowsWhatsNew() {
        let suite = "world2.whatsnew.tests"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        World2SceneGraphStoreHolder.store = World2SceneGraphStore(defaults: defaults)
        World2WorldSync.shared.resetForTests()

        let home = World2SceneDefinition(
            id: "scene.home",
            name: "Abbie's World",
            summary: "Home",
            backgroundAsset: "map.home"
        )
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 16,
                scenes: [home.id: home],
                players: [:],
                skin: nil,
                props: nil,
                places: nil,
                songs: nil,
                actors: nil,
                activeSceneID: home.id
            ),
            source: .launchPull
        )
        XCTAssertNil(World2WorldSync.shared.whatsNew)

        let candy = World2SceneDefinition(
            id: "scene.candy",
            name: "Candy Land",
            summary: "Sweet",
            backgroundAsset: "map.candy"
        )
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 17,
                scenes: [home.id: home, candy.id: candy],
                players: [:],
                skin: nil,
                props: nil,
                places: nil,
                songs: nil,
                actors: nil,
                activeSceneID: home.id
            ),
            source: .launchPull
        )
        XCTAssertEqual(World2WorldSync.shared.whatsNew?.headline, "New lands!")
        XCTAssertTrue(World2WorldSync.shared.whatsNew?.lines.contains("New land: Candy Land") == true)
        XCTAssertTrue(World2WorldSync.shared.unseenIDs.contains("scene.candy"))
        World2WorldSync.shared.setNoticesSuppressed(true)
        XCTAssertFalse(World2WorldSync.shared.showsNewBadge(for: "scene.candy"))
        XCTAssertTrue(World2WorldSync.shared.unseenIDs.contains("scene.candy"))
        World2WorldSync.shared.markSeen("scene.candy")
        XCTAssertFalse(World2WorldSync.shared.unseenIDs.contains("scene.candy"))
        World2WorldSync.shared.resetForTests()
    }

    @MainActor
    func testAcknowledgeWorldNoticesAlwaysClearsWhatsNew() {
        let suite = "world2.whatsnew.accept.tests"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        World2SceneGraphStoreHolder.store = World2SceneGraphStore(defaults: defaults)
        World2WorldSync.shared.resetForTests()

        let home = World2SceneDefinition(
            id: "scene.home",
            name: "Abbie's World",
            summary: "Home",
            backgroundAsset: "map.home"
        )
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 1,
                scenes: [home.id: home],
                players: [:],
                skin: nil,
                props: nil,
                places: nil,
                songs: nil,
                actors: nil,
                activeSceneID: home.id
            ),
            source: .launchPull
        )
        let candy = World2SceneDefinition(
            id: "scene.candy",
            name: "Candy Land",
            summary: "Sweet",
            backgroundAsset: "map.candy"
        )
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 2,
                scenes: [home.id: home, candy.id: candy],
                players: [:],
                skin: nil,
                props: nil,
                places: nil,
                songs: nil,
                actors: nil,
                activeSceneID: home.id
            ),
            source: .launchPull
        )
        XCTAssertNotNil(World2WorldSync.shared.whatsNew)
        World2WorldSync.shared.acknowledgeWorldNotices()
        XCTAssertNil(World2WorldSync.shared.whatsNew)
        XCTAssertNil(World2WorldSync.shared.pendingOffer)

        // Re-applying the same revision must not resurrect the sheet.
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 2,
                scenes: [home.id: home, candy.id: candy],
                players: [:],
                skin: nil,
                props: nil,
                places: nil,
                songs: nil,
                actors: nil,
                activeSceneID: home.id
            ),
            source: .launchPull
        )
        XCTAssertNil(World2WorldSync.shared.whatsNew)
        World2WorldSync.shared.resetForTests()
    }
}
