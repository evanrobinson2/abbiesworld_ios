//
//  World2SceneCatalog.swift
//  abbies.world.ios
//
//  The shipped scenes of Abbie's World 2, with every place rigged onto a named
//  hardpoint.
//
//  The coordinates here are image-normalized points on the painted maps and were
//  carried over from the hand-tuned placements they replace, so nothing moves on
//  screen — each placement is simply a registered instance standing on a
//  registered pad now instead of a loose number.
//
//  Scenes also declare pads nobody stands on yet. Those open hardpoints are the
//  visible proof that the system works: they shimmer on the map and the scene
//  editor can drop any registered place onto one.
//

import Foundation

enum World2SceneCatalog {
    static func sceneID(for worldId: WorldId) -> String {
        worldId.sceneID
    }

    static let all: [World2SceneDefinition] = [
        homeWorld,
        workLand,
        farmLand,
        threeBears,
        World2SceneDefinition.blankSlate,
    ]

    static func scene(_ sceneID: String) -> World2SceneDefinition? {
        all.first { $0.id == sceneID }
    }

    static func scene(for worldId: WorldId) -> World2SceneDefinition? {
        scene(sceneID(for: worldId))
    }

    // MARK: - Home World

    static let homeWorld = World2SceneDefinition(
        id: sceneID(for: .home),
        name: "Home World",
        summary: "Three welcoming places to explore",
        backgroundAsset: "map.home",
        minimapIcon: "minimap.home",
        minimapIconStyle: .homeGrove,
        hardpoints: [
            World2SceneHardpoint(
                id: "hardpoint.home.abbiePad",
                name: "Abbie's dirt pad",
                position: World2NormalizedPoint(x: 0.326, y: 0.311),
                acceptedSizeClasses: [.medium, .large],
                isLocked: true,
                notes: "Painted clearing on the left of the map"
            ),
            World2SceneHardpoint(
                id: "hardpoint.home.aniPad",
                name: "Ani's dirt pad",
                position: World2NormalizedPoint(x: 0.722, y: 0.443),
                acceptedSizeClasses: [.medium, .large],
                isLocked: true,
                notes: "Painted clearing on the right of the map"
            ),
            World2SceneHardpoint(
                id: "hardpoint.home.factoryPad",
                name: "Workshop pad",
                position: World2NormalizedPoint(x: 0.440, y: 0.685),
                acceptedSizeClasses: [.medium, .large],
                isLocked: true,
                notes: "Painted clearing at the bottom of the map"
            ),
            World2SceneHardpoint(
                id: "hardpoint.home.creekPad",
                name: "Creekside spot",
                position: World2NormalizedPoint(x: 0.152, y: 0.566),
                acceptedSizeClasses: [.small, .medium],
                notes: "Open — proof that a registered place can be dropped here"
            ),
            World2SceneHardpoint(
                id: "hardpoint.home.hilltopPad",
                name: "Hilltop lookout",
                position: World2NormalizedPoint(x: 0.856, y: 0.203),
                acceptedSizeClasses: [.small],
                notes: "Open — small places only"
            ),
            World2SceneHardpoint(
                id: "hardpoint.home.skyPortal",
                name: "Sky gate",
                position: World2NormalizedPoint(x: 0.500, y: 0.168),
                acceptedSizeClasses: [.small],
                isLocked: true,
                notes: "Tap portal into Blank Slate"
            ),
            World2SceneHardpoint(
                id: "hardpoint.home.sceneWorksPad",
                name: "Scene Works lot",
                position: World2NormalizedPoint(x: 0.612, y: 0.618),
                acceptedSizeClasses: [.medium],
                isLocked: true,
                notes: "Scene kit mill — creek and hilltop stay open"
            ),
            compassPad(sceneKey: "home", .east),
            compassPad(sceneKey: "home", .south),
        ],
        poiInstances: [
            authored(
                "instance.home.abbieTreehouse",
                World2POIRegistry.abbieTreehouseID,
                scene: sceneID(for: .home),
                hardpoint: "hardpoint.home.abbiePad",
                x: 0.326,
                y: 0.311,
                scale: 1.00,
                zIndex: 1
            ),
            authored(
                "instance.home.aniTreehouse",
                World2POIRegistry.aniTreehouseID,
                scene: sceneID(for: .home),
                hardpoint: "hardpoint.home.aniPad",
                x: 0.722,
                y: 0.443,
                scale: 1.00,
                zIndex: 1
            ),
            authored(
                "instance.home.cardFactory",
                World2POIRegistry.cardFactoryID,
                scene: sceneID(for: .home),
                hardpoint: "hardpoint.home.factoryPad",
                x: 0.440,
                y: 0.685,
                scale: 1.05,
                zIndex: 2
            ),
            compassPortal(
                "instance.home.portal.east",
                scene: sceneID(for: .home),
                sceneKey: "home",
                compass: .east,
                destination: sceneID(for: .farm),
                reverse: "instance.farm.portal.west"
            ),
            compassPortal(
                "instance.home.portal.south",
                scene: sceneID(for: .home),
                sceneKey: "home",
                compass: .south,
                destination: sceneID(for: .work),
                reverse: "instance.work.portal.north"
            ),
            authored(
                "instance.home.portal.blankSlate",
                World2POIRegistry.scenePortalID,
                scene: sceneID(for: .home),
                hardpoint: "hardpoint.home.skyPortal",
                x: 0.500,
                y: 0.168,
                scale: 0.72,
                zIndex: 4,
                portal: World2PortalLink(
                    destinationSceneID: sceneID(for: .blankSlate),
                    reverseInstanceID: nil,
                    transition: .portal,
                    activation: .tap,
                    compass: nil,
                    name: "Blank Slate"
                )
            ),
            authored(
                "instance.home.sceneWorks",
                World2POIRegistry.sceneWorksID,
                scene: sceneID(for: .home),
                hardpoint: "hardpoint.home.sceneWorksPad",
                x: 0.612,
                y: 0.618,
                scale: 0.92,
                zIndex: 3
            ),
        ],
        showsOpenHardpointsToPlayers: true,
        createdAt: .distantPast
    )

    // MARK: - Work Land

    static let workLand = World2SceneDefinition(
        id: sceneID(for: .work),
        name: "Work Land",
        summary: "A bright workshop meadow with three empty lots",
        backgroundAsset: "map.workLand",
        minimapIcon: "minimap.workLand",
        minimapIconStyle: .workMeadow,
        hardpoints: [
            World2SceneHardpoint(
                id: "hardpoint.work.letterWorksPad",
                name: "Letter Works lot",
                position: World2NormalizedPoint(x: 0.443, y: 0.662),
                acceptedSizeClasses: [.medium, .large],
                isLocked: true,
                notes: "Sand circle, center-bottom"
            ),
            World2SceneHardpoint(
                id: "hardpoint.work.labPad",
                name: "Laboratory lot",
                position: World2NormalizedPoint(x: 0.693, y: 0.388),
                acceptedSizeClasses: [.small, .medium],
                isLocked: true,
                notes: "Sand circle, upper right"
            ),
            World2SceneHardpoint(
                id: "hardpoint.work.workbenchPad",
                name: "Workbench lot",
                position: World2NormalizedPoint(x: 0.722, y: 0.759),
                acceptedSizeClasses: [.small, .medium],
                isLocked: true,
                notes: "Sand circle, lower right"
            ),
            World2SceneHardpoint(
                id: "hardpoint.work.cornerLot",
                name: "Corner lot",
                position: World2NormalizedPoint(x: 0.221, y: 0.409),
                acceptedSizeClasses: [.small, .medium],
                notes: "Open — the third empty lot the art promises"
            ),
            World2SceneHardpoint(
                id: "hardpoint.work.poiFactoryPad",
                name: "POI Factory dock",
                position: World2NormalizedPoint(x: 0.175, y: 0.735),
                acceptedSizeClasses: [.medium],
                isLocked: true,
                notes: "Player fabricator — corner lot stays open"
            ),
            compassPad(sceneKey: "work", .north),
        ],
        poiInstances: [
            authored(
                "instance.work.letterWorks",
                World2POIRegistry.letterWorksID,
                scene: sceneID(for: .work),
                hardpoint: "hardpoint.work.letterWorksPad",
                x: 0.443,
                y: 0.662,
                scale: 0.92,
                zIndex: 1
            ),
            authored(
                "instance.work.creatureLab",
                World2POIRegistry.creatureLabID,
                scene: sceneID(for: .work),
                hardpoint: "hardpoint.work.labPad",
                x: 0.693,
                y: 0.388,
                scale: 0.88,
                zIndex: 2
            ),
            authored(
                "instance.work.assetWorkbench",
                World2POIRegistry.assetWorkbenchID,
                scene: sceneID(for: .work),
                hardpoint: "hardpoint.work.workbenchPad",
                x: 0.722,
                y: 0.759,
                scale: 0.88,
                zIndex: 3
            ),
            authored(
                "instance.work.poiFactory",
                World2POIRegistry.placeFactoryID,
                scene: sceneID(for: .work),
                hardpoint: "hardpoint.work.poiFactoryPad",
                x: 0.175,
                y: 0.735,
                scale: 0.90,
                zIndex: 4
            ),
            compassPortal(
                "instance.work.portal.north",
                scene: sceneID(for: .work),
                sceneKey: "work",
                compass: .north,
                destination: sceneID(for: .home),
                reverse: "instance.home.portal.south"
            ),
        ],
        showsOpenHardpointsToPlayers: true,
        createdAt: .distantPast
    )

    // MARK: - Farm Land

    static let farmLand = World2SceneDefinition(
        id: sceneID(for: .farm),
        name: "Farm Land",
        summary: "An open meadow with a store, and a path into the woods",
        backgroundAsset: "map.farm",
        minimapIcon: "minimap.farm",
        minimapIconStyle: .farmMeadow,
        hardpoints: [
            World2SceneHardpoint(
                id: "hardpoint.farm.storePad",
                name: "Store clearing",
                position: World2NormalizedPoint(x: 0.538, y: 0.480),
                acceptedSizeClasses: [.medium, .large],
                isLocked: true,
                notes: "Center of the meadow"
            ),
            World2SceneHardpoint(
                id: "hardpoint.farm.orchardPad",
                name: "Orchard corner",
                position: World2NormalizedPoint(x: 0.213, y: 0.661),
                acceptedSizeClasses: [.small, .medium],
                notes: "Open"
            ),
            World2SceneHardpoint(
                id: "hardpoint.farm.gatePad",
                name: "Gatepost",
                position: World2NormalizedPoint(x: 0.844, y: 0.703),
                acceptedSizeClasses: [.small],
                notes: "Open — small places only"
            ),
            compassPad(sceneKey: "farm", .west),
            compassPad(sceneKey: "farm", .east),
        ],
        poiInstances: [
            authored(
                "instance.farm.furnitureStore",
                World2POIRegistry.furnitureStoreID,
                scene: sceneID(for: .farm),
                hardpoint: "hardpoint.farm.storePad",
                x: 0.538,
                y: 0.480,
                scale: 1.15,
                zIndex: 1
            ),
            compassPortal(
                "instance.farm.portal.west",
                scene: sceneID(for: .farm),
                sceneKey: "farm",
                compass: .west,
                destination: sceneID(for: .home),
                reverse: "instance.home.portal.east"
            ),
            compassPortal(
                "instance.farm.portal.east",
                scene: sceneID(for: .farm),
                sceneKey: "farm",
                compass: .east,
                destination: sceneID(for: .threeBears),
                reverse: "instance.threeBears.portal.west"
            ),
        ],
        showsOpenHardpointsToPlayers: true,
        createdAt: .distantPast
    )

    // MARK: - Three Bears

    static let threeBears = World2SceneDefinition(
        id: sceneID(for: .threeBears),
        name: "Three Bears Woods",
        summary: "A quiet clearing in the woods where somebody is cooking",
        backgroundAsset: "map.threeBears",
        backdropStyle: .threeBearsWoods,
        minimapIcon: "minimap.threeBears",
        minimapIconStyle: .woodsCottage,
        hardpoints: [
            World2SceneHardpoint(
                id: "hardpoint.threeBears.cottagePad",
                name: "Cottage clearing",
                position: World2NormalizedPoint(x: 0.500, y: 0.512),
                acceptedSizeClasses: [.medium, .large],
                notes: "The bears' house stands here"
            ),
            World2SceneHardpoint(
                id: "hardpoint.threeBears.berryPatch",
                name: "Berry patch",
                position: World2NormalizedPoint(x: 0.196, y: 0.668),
                acceptedSizeClasses: [.small],
                notes: "Open — small places only"
            ),
            World2SceneHardpoint(
                id: "hardpoint.threeBears.woodshedPad",
                name: "Woodshed spot",
                position: World2NormalizedPoint(x: 0.812, y: 0.617),
                acceptedSizeClasses: [.small, .medium],
                notes: "Open"
            ),
            compassPad(sceneKey: "threeBears", .west),
        ],
        poiInstances: [
            authored(
                "instance.threeBears.house",
                World2POIRegistry.threeBearsHouseID,
                scene: sceneID(for: .threeBears),
                hardpoint: "hardpoint.threeBears.cottagePad",
                x: 0.500,
                y: 0.512,
                scale: 1.05,
                zIndex: 1
            ),
            compassPortal(
                "instance.threeBears.portal.west",
                scene: sceneID(for: .threeBears),
                sceneKey: "threeBears",
                compass: .west,
                destination: sceneID(for: .farm),
                reverse: "instance.farm.portal.east"
            ),
        ],
        showsOpenHardpointsToPlayers: true,
        createdAt: .distantPast
    )

    // MARK: - Authoring helper

    private static func compassPad(
        sceneKey: String,
        _ compass: World2Compass
    ) -> World2SceneHardpoint {
        World2SceneHardpoint(
            id: "hardpoint.\(sceneKey).\(compass.rawValue)",
            name: "\(compass.label) edge",
            position: compass.edgeAnchor,
            acceptedSizeClasses: [.small],
            isLocked: true,
            notes: "Compass socket"
        )
    }

    private static func compassPortal(
        _ instanceID: String,
        scene sceneID: String,
        sceneKey: String,
        compass: World2Compass,
        destination: String,
        reverse: String
    ) -> World2POIInstance {
        authored(
            instanceID,
            World2POIRegistry.scenePortalID,
            scene: sceneID,
            hardpoint: "hardpoint.\(sceneKey).\(compass.rawValue)",
            x: compass.edgeAnchor.x,
            y: compass.edgeAnchor.y,
            scale: 0.55,
            zIndex: 8,
            portal: World2PortalLink(
                destinationSceneID: destination,
                reverseInstanceID: reverse,
                transition: .slide(compass),
                activation: .swipe(compass),
                compass: compass,
                name: nil
            )
        )
    }

    private static func authored(
        _ instanceID: String,
        _ archetypeID: String,
        scene sceneID: String,
        hardpoint hardpointID: String?,
        x: Double,
        y: Double,
        scale: Double,
        zIndex: Int,
        portal: World2PortalLink? = nil
    ) -> World2POIInstance {
        World2POIInstance(
            id: instanceID,
            archetypeID: archetypeID,
            sceneID: sceneID,
            transform: World2POITransform(x: x, y: y, scale: scale),
            hardpointID: hardpointID,
            zIndex: zIndex,
            createdAt: .distantPast,
            isAuthored: true,
            portal: portal
        )
    }

    /// Validate the whole shipped catalog against the registry. Called on launch
    /// so a bad placement shows up as a log line instead of a missing building.
    static func validateAll() -> [World2POIRegistryIssue] {
        var issues: [World2POIRegistryIssue] = []
        for scene in all {
            issues.append(contentsOf: World2POIRegistry.validate(scene: scene))
            if scene.minimapIcon.isEmpty {
                issues.append(.sceneMissingMinimapIcon(sceneID: scene.id))
            }
        }
        issues.append(contentsOf: World2PortalGraph.validate(scenes: all))
        return issues
    }

    /// Text summary of pads and occupancy, per scene. Printed on launch so the
    /// rigging can be reviewed without opening the editor.
    static func riggingReport() -> String {
        var lines = ["SCENE CATALOG — \(all.count) scenes"]
        for scene in all {
            let open = scene.openHardpoints
            lines.append(
                "  \(scene.id) — \(scene.poiInstances.count) placed, \(scene.hardpoints.count) hardpoints, \(open.count) open, minimap \(scene.resolvedMinimapIcon)"
            )
            for instance in scene.instancesInDrawOrder {
                let pad = instance.hardpointID ?? "freehand"
                var place = "    place \(instance.archetypeID) on \(pad)"
                if let portal = instance.portal {
                    let dest = portal.destinationSceneID ?? "none"
                    place += " → \(dest) [\(portal.transition.diagnosticName)/\(portal.activation.diagnosticName)]"
                }
                lines.append(place)
            }
            for hardpoint in open {
                lines.append(
                    "    open  \(hardpoint.id) (\(hardpoint.acceptedSizeSummary)) — \(hardpoint.name)"
                )
            }
        }
        return lines.joined(separator: "\n")
    }
}
