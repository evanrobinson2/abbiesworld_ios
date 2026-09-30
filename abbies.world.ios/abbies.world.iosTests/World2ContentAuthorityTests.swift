import XCTest
@testable import abbies_world_ios

@MainActor
final class World2ContentAuthorityTests: XCTestCase {
    private var defaults: UserDefaults!

    override func setUp() {
        defaults = UserDefaults(suiteName: "world2.content.authority.tests")
        defaults.removePersistentDomain(forName: "world2.content.authority.tests")
    }

    override func tearDown() {
        World2WorldSync.shared.resetForTests()
        defaults.removePersistentDomain(forName: "world2.content.authority.tests")
        super.tearDown()
    }

    private func isolatedStore() -> World2SceneGraphStore {
        let store = World2SceneGraphStore(defaults: defaults)
        World2SceneGraphStoreHolder.store = store
        return store
    }

    func testNewAccountDocumentIsSingleConstructionScene() throws {
        let document = World2WorldSync.shared.documentForNewAccount()
        XCTAssertEqual(Array(document.scenes.keys), ["scene.home"])
        let home = try XCTUnwrap(document.scenes["scene.home"])
        XCTAssertEqual(home.name, "Abbie's World")
        XCTAssertEqual(home.backgroundAsset, "")
        XCTAssertTrue(home.poiInstances.isEmpty)
        XCTAssertEqual(document.activeSceneID, "scene.home")
        XCTAssertFalse(document.scenes.keys.contains("world.home"))
        XCTAssertFalse(document.scenes.keys.contains("world.evan"))
        XCTAssertEqual(document.places, [])
        XCTAssertEqual(document.songs, [])
        XCTAssertEqual(document.actors, [])
        XCTAssertNotNil(UIImage(named: "under_construction_scene"))
        XCTAssertNotNil(UIImage(named: "under_construction_poi"))
        XCTAssertNotNil(World2ConstructionArt.image(forSemantic: "map.home"))
        XCTAssertNotNil(World2ConstructionArt.image(forSemantic: "poi.portal.exterior"))
        XCTAssertNotNil(World2ConstructionArt.image(forSemantic: ""))
    }

    func testEmptyDocumentReplacesTheCompiledScene() {
        let store = isolatedStore()
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 1,
                scenes: [:],
                players: [:],
                skin: nil,
                props: nil,
                places: nil,
                songs: nil,
                actors: nil,
                activeSceneID: nil
            )
        )
        let scene = store.scene("world.home")
        XCTAssertTrue(World2WorldSync.shared.usesServerDocument)
        XCTAssertFalse(World2WorldSync.shared.presentsParty)
        XCTAssertTrue(scene.poiInstances.isEmpty)
        XCTAssertEqual(scene.backgroundAsset, "")
        XCTAssertEqual(scene.name, "Open ground")
        XCTAssertNotEqual(scene.name, "Daddy's Citadel")
        XCTAssertTrue(World2WorldSync.shared.scenesToPush().isEmpty)
    }

    func testDocumentHomePlateIsNotTheCompiledWorldID() {
        let store = isolatedStore()
        let home = World2SceneDefinition(
            id: "scene.home",
            name: "Abbie's World",
            summary: "",
            backgroundAsset: "map.home"
        )
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 4,
                scenes: [home.id: home],
                players: [:],
                skin: nil,
                props: nil,
                places: nil,
                songs: nil,
                actors: nil,
                activeSceneID: home.id
            )
        )
        XCTAssertEqual(World2WorldSync.shared.activeSceneID, "scene.home")
        XCTAssertEqual(store.scene("scene.home").backgroundAsset, "map.home")
        XCTAssertEqual(store.scene("scene.home").name, "Abbie's World")
        let compiled = store.scene(WorldId.home.sceneID)
        XCTAssertEqual(compiled.name, "Open ground")
        XCTAssertEqual(compiled.backgroundAsset, "")
    }

    func testDocumentPlaceOpensAnExistingScreen() throws {
        let place = World2RemotePlace(
            id: "place.lantern",
            name: "Lantern House",
            behavior: "figurineExplorer",
            exteriorAsset: "poi.lantern.exterior",
            interiorAsset: "poi.lantern.interior",
            musicTrackID: "song.lantern",
            icon: "lamp.desk.fill"
        )
        let archetype = try XCTUnwrap(place.archetype())
        XCTAssertEqual(archetype.route, .figurineExplorer)
        XCTAssertEqual(archetype.exteriorAsset, "poi.lantern.exterior")
        XCTAssertNil(World2POIRoute.resolved(from: "brandNewScreen"))

        let store = isolatedStore()
        let scene = World2SceneDefinition(
            id: "scene.lantern",
            name: "Lantern Yard",
            summary: "",
            backgroundAsset: "map.lantern",
            poiInstances: [
                World2POIInstance(
                    id: "instance.lantern",
                    archetypeID: place.id,
                    sceneID: "scene.lantern",
                    transform: World2POITransform(x: 0.5, y: 0.5)
                )
            ],
            isMutableByPlayer: true
        )
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 2,
                scenes: [scene.id: scene],
                players: [:],
                skin: World2ContentSkin(accent: "#112233", railBackground: nil),
                props: [World2RemoteProp(id: "prop.lantern", name: "Lantern", image: "prop.lantern")],
                places: [place],
                songs: [World2RemoteSong(id: "song.lantern", name: "Lantern", file: "lantern")],
                actors: [World2RemoteActor(id: "daddy", walk: "daddy_custom", run: "daddy_custom_run", idle: nil)],
                activeSceneID: scene.id
            )
        )
        XCTAssertEqual(store.scene("scene.lantern").name, "Lantern Yard")
        XCTAssertEqual(store.scene("world.evan").poiInstances.count, 0)
        XCTAssertEqual(World2WorldSync.shared.archetype("place.lantern")?.route, .figurineExplorer)
        XCTAssertNil(World2POIRegistry.archetype(World2POIRegistry.figurineExplorerID))
        XCTAssertEqual(World2WorldSync.shared.clipFile(engineName: "daddy_walk"), "daddy_custom")
        XCTAssertTrue(World2WorldSync.shared.presentsParty)
        XCTAssertNil(World2WorldSync.shared.clipFile(engineName: "abbie"))
        XCTAssertEqual(World2WorldSync.shared.skin.accent, "#112233")
        XCTAssertEqual(World2WorldSync.shared.activeSceneID, "scene.lantern")
    }

    func testDeletingDocumentContentClearsIt() {
        let store = isolatedStore()
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 3,
                scenes: [:],
                players: [:],
                skin: nil,
                props: [],
                places: [],
                songs: [],
                actors: [],
                activeSceneID: nil
            )
        )
        XCTAssertNil(World2WorldSync.shared.skin.accent)
        XCTAssertTrue(World2WorldSync.shared.props.isEmpty)
        XCTAssertTrue(World2WorldSync.shared.songs.isEmpty)
        XCTAssertNil(World2WorldSync.shared.clipFile(engineName: "daddy_walk"))
        XCTAssertNil(World2POIRegistry.archetype("place.lantern"))
    }

    func testTravelAndRoomsResolveFromDocumentBehaviors() {
        XCTAssertEqual(
            World2POIRoute.resolved(from: "travel:scene.spookyLand"),
            .travel(sceneID: "scene.spookyLand")
        )
        XCTAssertEqual(World2POIRoute.resolved(from: "rooms"), .rooms)
        XCTAssertEqual(World2POIRoute.resolved(from: "plink"), .plink)
        XCTAssertNil(World2POIRoute.resolved(from: "travel:"))

        let data = Data(#"{"id":"scene.spookyLand","name":"Spooky Land","musicTrackID":"song.spookyWorld"}"#.utf8)
        let scene = try? JSONDecoder().decode(World2SceneDefinition.self, from: data)
        XCTAssertEqual(scene?.musicTrackID, "song.spookyWorld")
    }

    func testSignedInPlayUsesDocumentScenesNotCatalogWorlds() {
        let store = isolatedStore()
        let home = World2SceneDefinition(
            id: "scene.home",
            name: "Abbie's World",
            summary: "Live home",
            backgroundAsset: "map.home",
            poiInstances: [
                World2POIInstance(
                    id: "poi.homePortal",
                    archetypeID: "poi.homePortal",
                    sceneID: "scene.home",
                    transform: World2POITransform(x: 0.5, y: 0.5)
                )
            ]
        )
        let spooky = World2SceneDefinition(
            id: "scene.spookyLand",
            name: "Spooky Land",
            summary: "Live spooky",
            backgroundAsset: "map.spookyLand"
        )
        let portal = World2RemotePlace(
            id: "poi.homePortal",
            name: "To Spooky Land",
            behavior: "travel:scene.spookyLand",
            exteriorAsset: "poi.portal.exterior",
            interiorAsset: nil,
            musicTrackID: nil,
            icon: nil,
            rooms: nil
        )
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 16,
                scenes: [home.id: home, spooky.id: spooky],
                players: [:],
                skin: nil,
                props: nil,
                places: [portal],
                songs: nil,
                actors: nil,
                activeSceneID: home.id
            )
        )

        XCTAssertEqual(World2WorldSync.shared.activeSceneID, "scene.home")
        XCTAssertEqual(store.scene("scene.home").name, "Abbie's World")
        XCTAssertEqual(store.scene("world.home").name, "Open ground")
        XCTAssertEqual(store.scene("world.evan").name, "Open ground")
        XCTAssertEqual(
            Set(World2WorldSync.shared.scenesToPush().keys),
            ["scene.home", "scene.spookyLand"]
        )

        let graph = World2WorldGraphStore(defaults: defaults)
        graph.loadFromDocument(
            scenes: [home, spooky],
            places: [portal],
            originSceneID: home.id
        )
        XCTAssertEqual(Set(graph.knownSceneIDs), ["scene.home", "scene.spookyLand"])
        XCTAssertFalse(graph.knownSceneIDs.contains(WorldId.evan.sceneID))
        XCTAssertEqual(graph.snapshot(currentSceneID: home.id).nodes.map(\.name).sorted(), [
            "Abbie's World",
            "Spooky Land",
        ])

        XCTAssertEqual(
            World2DecorateTarget.fromInvent(sceneID: "scene.spookyLand", sceneName: "Spooky Land"),
            .scene(sceneID: "scene.spookyLand", name: "Spooky Land", worldID: nil)
        )
    }

    func testLivePortalDoesNotUseBundledWorldArt() {
        _ = isolatedStore()
        World2WorldSync.shared.apply(
            World2WorldDocument(
                schemaVersion: 1,
                revision: 16,
                scenes: [:],
                players: [:],
                skin: nil,
                props: nil,
                places: [
                    World2RemotePlace(
                        id: "poi.homePortal",
                        name: "To Spooky Land",
                        behavior: "travel:scene.spookyLand",
                        exteriorAsset: "poi.portal.exterior",
                        interiorAsset: nil,
                        musicTrackID: nil,
                        icon: nil,
                        rooms: nil
                    )
                ],
                songs: nil,
                actors: nil,
                activeSceneID: nil
            )
        )
        XCTAssertTrue(World2WorldSync.shared.usesServerDocument)
        // Without a registry hit, the app must not invent bundled portal art.
        XCTAssertNil(AssetBootstrapService.shared.image(for: "poi.portal.exterior"))
        XCTAssertNotNil(World2ConstructionArt.image(forSemantic: "poi.portal.exterior"))
        XCTAssertNotNil(World2ConstructionArt.image(forSemantic: "map.home"))
    }

    func testFractionalISODateDoesNotDropTheWorld() throws {
        let json = Data(#"""
        {
          "schemaVersion": 1,
          "revision": 16,
          "scenes": {
            "scene.home": {
              "id": "scene.home",
              "name": "Abbie's World",
              "createdAt": "2026-09-19T12:00:00.123Z"
            }
          },
          "players": {},
          "activeSceneID": "scene.home"
        }
        """#.utf8)
        let document = try World2WorldDocument.decode(json)
        XCTAssertEqual(document.scenes["scene.home"]?.name, "Abbie's World")
        XCTAssertEqual(document.activeSceneID, "scene.home")
    }
}
