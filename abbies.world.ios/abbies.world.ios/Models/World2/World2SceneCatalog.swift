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
        artGarden,
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
                notes: "Planning Department — world graph map room"
            ),
            World2SceneHardpoint(
                id: "hardpoint.home.hilltopPad",
                name: "Hilltop lookout",
                position: World2NormalizedPoint(x: 0.856, y: 0.203),
                acceptedSizeClasses: [.small],
                notes: "Open — small places only"
            ),
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
            authored(
                "instance.home.planningDept",
                World2POIRegistry.planningDeptID,
                scene: sceneID(for: .home),
                hardpoint: "hardpoint.home.creekPad",
                x: 0.152,
                y: 0.566,
                scale: 0.88,
                zIndex: 4
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
                notes: "Whizbang gadget barn stands here"
            ),
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
                "instance.work.whizbang",
                World2POIRegistry.whizbangID,
                scene: sceneID(for: .work),
                hardpoint: "hardpoint.work.cornerLot",
                x: 0.221,
                y: 0.409,
                scale: 0.90,
                zIndex: 4
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
            authored(
                "instance.farm.decoratorMachine",
                World2POIRegistry.decoratorMachineID,
                scene: sceneID(for: .farm),
                hardpoint: "hardpoint.farm.orchardPad",
                x: 0.213,
                y: 0.661,
                scale: 0.92,
                zIndex: 2
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
        ],
        showsOpenHardpointsToPlayers: true,
        createdAt: .distantPast
    )

    // MARK: - Art Garden
    //
    // Unconnected on purpose: no adjacency from Home / Farm / Work. Reach it
    // with the World Teleporter inventory item.
    //
    // ambientVideoAsset v1 is CRACKWARE (free-tier Luma watermark). Kid play
    // keeps the still poster; developer mode can enable the loop for wiring checks.

    static let artGarden = World2SceneDefinition(
        id: sceneID(for: .artGarden),
        name: "Art Garden",
        summary: "Terraced gardens, a Character Studio, and The Imagination Atelier",
        backgroundAsset: "map.artGarden",
        ambientVideoAsset: "map.artGarden.ambient",
        hardpoints: [
            World2SceneHardpoint(
                id: "hardpoint.artGarden.studioPad",
                name: "Sandy plaza",
                position: World2NormalizedPoint(x: 0.318, y: 0.548),
                acceptedSizeClasses: [.medium, .large],
                notes: "Circular clearing — Character Studio stands here"
            ),
            World2SceneHardpoint(
                id: "hardpoint.artGarden.atelierPad",
                name: "Easel terrace",
                position: World2NormalizedPoint(x: 0.620, y: 0.430),
                acceptedSizeClasses: [.medium, .large],
                notes: "Rocky atelier plateau — Imagination Atelier"
            ),
            World2SceneHardpoint(
                id: "hardpoint.artGarden.meadowPad",
                name: "Lower meadow",
                position: World2NormalizedPoint(x: 0.480, y: 0.780),
                acceptedSizeClasses: [.small, .medium],
                notes: "Open — colorful stepping stones"
            ),
            World2SceneHardpoint(
                id: "hardpoint.artGarden.cliffPad",
                name: "Pencil lookout",
                position: World2NormalizedPoint(x: 0.780, y: 0.280),
                acceptedSizeClasses: [.small, .medium],
                notes: "Open — near the orange pencil tower"
            ),
        ],
        poiInstances: [
            authored(
                "instance.artGarden.characterStudio",
                World2POIRegistry.characterStudioID,
                scene: sceneID(for: .artGarden),
                hardpoint: "hardpoint.artGarden.studioPad",
                x: 0.318,
                y: 0.548,
                scale: 0.92,
                zIndex: 1
            ),
            authored(
                "instance.artGarden.sceneBuilder",
                World2POIRegistry.sceneBuilderID,
                scene: sceneID(for: .artGarden),
                hardpoint: "hardpoint.artGarden.atelierPad",
                x: 0.620,
                y: 0.430,
                scale: 1.05,
                zIndex: 2
            ),
        ],
        showsOpenHardpointsToPlayers: true,
        createdAt: .distantPast
    )

    // MARK: - Authoring helper

    private static func authored(
        _ instanceID: String,
        _ archetypeID: String,
        scene sceneID: String,
        hardpoint hardpointID: String?,
        x: Double,
        y: Double,
        scale: Double,
        zIndex: Int
    ) -> World2POIInstance {
        World2POIInstance(
            id: instanceID,
            archetypeID: archetypeID,
            sceneID: sceneID,
            transform: World2POITransform(x: x, y: y, scale: scale),
            hardpointID: hardpointID,
            zIndex: zIndex,
            createdAt: .distantPast,
            isAuthored: true
        )
    }

    /// Validate the whole shipped catalog against the registry. Called on launch
    /// so a bad placement shows up as a log line instead of a missing building.
    static func validateAll() -> [World2POIRegistryIssue] {
        var issues: [World2POIRegistryIssue] = []
        for scene in all {
            issues.append(contentsOf: World2POIRegistry.validate(scene: scene))
        }
        return issues
    }

    /// Text summary of pads and occupancy, per scene. Printed on launch so the
    /// rigging can be reviewed without opening the editor.
    static func riggingReport() -> String {
        var lines = ["SCENE CATALOG — \(all.count) scenes"]
        for scene in all {
            let open = scene.openHardpoints
            lines.append(
                "  \(scene.id) — \(scene.poiInstances.count) placed, \(scene.hardpoints.count) hardpoints, \(open.count) open"
            )
            for instance in scene.instancesInDrawOrder {
                let pad = instance.hardpointID ?? "freehand"
                lines.append("    place \(instance.archetypeID) on \(pad)")
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
