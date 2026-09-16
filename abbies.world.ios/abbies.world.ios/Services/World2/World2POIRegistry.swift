//
//  World2POIRegistry.swift
//  abbies.world.ios
//
//  The registered catalog of every kind of place in Abbie's World 2.
//
//  Registration happens here at authoring time rather than at runtime: a place
//  that is not in this file cannot be placed in a scene, and the validator will
//  say so by name. That is the whole point — the scene editor can offer a menu
//  of places and be certain each one knows how to open itself and what it is
//  allowed to do to the player's inventory.
//

import Foundation

enum World2POIRegistry {
    static let abbieTreehouseID = "poi.abbieTreehouse"
    static let aniTreehouseID = "poi.aniTreehouse"
    static let cardFactoryID = "poi.cardFactory"
    static let letterWorksID = "poi.letterWorks"
    static let furnitureStoreID = "poi.furnitureStore"
    static let assetWorkbenchID = "poi.assetWorkbench"
    static let creatureLabID = "poi.creatureLab"
    static let placeFactoryID = "poi.selfReplicatingFactory"
    static let threeBearsHouseID = "poi.threeBearsHouse"
    static let characterStudioID = "poi.characterStudio"
    static let sceneBuilderID = "poi.sceneBuilder"

    /// Every registered archetype, keyed by id.
    static let archetypes: [String: World2POIArchetype] = {
        var catalog: [String: World2POIArchetype] = [:]
        for archetype in all {
            catalog[archetype.id] = archetype
        }
        return catalog
    }()

    static let all: [World2POIArchetype] = [
        treehouse(for: .abbie),
        treehouse(for: .ani),
        cardFactory,
        letterWorks,
        furnitureStore,
        assetWorkbench,
        creatureLab,
        placeFactory,
        threeBearsHouse,
        characterStudio,
        sceneBuilder,
    ]

    static func archetype(_ id: String) -> World2POIArchetype? {
        archetypes[id]
    }

    /// Archetypes a developer may drop into a scene from the editor. Treehouses
    /// are excluded because each player has exactly one and it is authored.
    static var placeableInEditor: [World2POIArchetype] {
        all
            .filter { $0.kind != .home }
            .sorted { $0.name < $1.name }
    }

    // MARK: - Homes

    static func treehouse(for owner: PlayerId) -> World2POIArchetype {
        let isAbbie = owner == .abbie
        return World2POIArchetype(
            id: owner.homePoiId,
            name: "\(owner.displayName)'s Treehouse",
            kind: .home,
            sizeClass: .large,
            exteriorAsset: "\(owner.homePoiId).exterior",
            interiorAsset: "\(owner.homePoiId).interior",
            icon: "house.fill",
            lore: isAbbie
                ? "A bright place for making and imagining."
                : "A calm place for stories and stargazing.",
            activityDescription: "Step inside and add a cozy touch to make the space feel like yours.",
            callToAction: "Decorate My Space",
            musicTrackID: isAbbie ? "world2_family_adventure" : "world2_cliffside_morning",
            contract: World2POIContract(
                route: .playerHome,
                requiresOwnership: true
            ),
            ownerID: owner.rawValue
        )
    }

    // MARK: - Home World

    static let cardFactory = World2POIArchetype(
        id: cardFactoryID,
        name: "Card Factory",
        kind: .cardFactory,
        sizeClass: .large,
        exteriorAsset: "poi.cardFactory.exterior",
        interiorAsset: "poi.cardFactory.interior",
        icon: "wand.and.stars",
        lore: "A gentle workshop for combining three ideas.",
        activityDescription: "Choose a Creature, a Function, and a Context, then reveal the magical card they make together.",
        callToAction: "Create a Card",
        musicTrackID: "world2_joyful_bounce",
        contract: World2POIContract(
            route: .cardFactory,
            grants: [.creatureCards(count: 1)]
        )
    )

    // MARK: - Work Land

    static let letterWorks = World2POIArchetype(
        id: letterWorksID,
        name: "The Letter Works",
        kind: .minigame,
        sizeClass: .large,
        exteriorAsset: "poi.letterWorks.exterior",
        interiorAsset: "poi.letterWorks.interior",
        icon: "character.book.closed.fill",
        lore: "This marvelous municipal machine sorts and sends letters all across Abbie's World.",
        activityDescription: "Letters are escaping from the ceiling hoppers. Choose how wild the storm should be, then tap A, E, I, O, and U to send them safely into the collection tanks.",
        callToAction: "Save the Vowels",
        musicTrackID: "world2_working_song",
        contract: World2POIContract(
            route: .fallingTargets(configurationID: "save_the_vowels"),
            grants: [.gems(upTo: 12)],
            completionMilestone: "minigame.saveTheVowels.completed"
        )
    )

    static let creatureLab = World2POIArchetype(
        id: creatureLabID,
        name: "Creature Lab",
        kind: .minigame,
        sizeClass: .medium,
        exteriorAsset: "poi.creatureLab.exterior",
        icon: "wand.and.stars",
        lore: "A bright laboratory where three ideas become a brand-new creature card.",
        activityDescription: "Build creatures, watch the machine work, and keep your favorites.",
        callToAction: "Open Creature Lab",
        musicTrackID: "world2_cliffside_morning",
        contract: World2POIContract(
            route: .creatureLab,
            grants: [.creatureCards(count: 1)]
        )
    )

    static let assetWorkbench = World2POIArchetype(
        id: assetWorkbenchID,
        name: "Asset Workbench",
        kind: .minigame,
        sizeClass: .medium,
        exteriorAsset: "poi.assetWorkbench.exterior",
        interiorAsset: "poi.assetWorkbench.interior",
        icon: "hammer.circle.fill",
        lore: "A cozy invention cottage where three little ideas become six magical room creations.",
        activityDescription: "Choose a finish, an object, and a personality. Make six ideas, then keep your favorite three.",
        callToAction: "Make a Decoration",
        musicTrackID: "world2_well_make_a_way",
        contract: World2POIContract(
            route: .assetWorkbench,
            grants: [.generatedDecorations(count: World2AssetWorkbenchContract.selectionCount)],
            completionMilestone: "minigame.assetWorkbench.completed"
        )
    )

    // MARK: - Farm Land

    static let furnitureStore = World2POIArchetype(
        id: furnitureStoreID,
        name: "Furniture Store",
        kind: .minigame,
        sizeClass: .large,
        exteriorAsset: "poi.furnitureStore.exterior",
        interiorAsset: "poi.furnitureStore.interior",
        icon: "chair.lounge.fill",
        lore: "A pink rainbow workshop piled high with cozy possibilities.",
        activityDescription: "Solve friendly little math tasks to earn ingredients. Any three ingredients can make any one furniture piece you choose for your treehouse.",
        callToAction: "Make Furniture",
        musicTrackID: "world2_bright_new_day",
        contract: World2POIContract(
            route: .furnitureStore,
            grants: [.furnitureIngredients(upTo: 3)],
            costs: [.furnitureIngredients(FurnitureItem.ingredientCost)],
            completionMilestone: "minigame.furnitureStore.completed"
        )
    )

    // MARK: - Player-made places

    static let placeFactory = World2POIArchetype(
        id: placeFactoryID,
        name: "POI Factory",
        kind: .factory,
        sizeClass: .medium,
        exteriorAsset: "poi.selfReplicatingFactory.exterior",
        interiorAsset: "poi.selfReplicatingFactory.interior",
        icon: "building.2.crop.circle.fill",
        lore: "A small factory that makes another small factory.",
        activityDescription: "Step inside and make one more factory to place somewhere else.",
        callToAction: "Go Inside",
        musicTrackID: "world2_cliffside_morning",
        contract: World2POIContract(
            route: .placeFactory,
            grants: [
                .placeInventoryItem(
                    templateID: World2PlaceTemplateID.selfReplicatingFactory.rawValue
                )
            ]
        )
    )

    // MARK: - Three Bears

    static let threeBearsHouse = World2POIArchetype(
        id: threeBearsHouseID,
        name: "The Three Bears' House",
        kind: .story,
        sizeClass: .large,
        exteriorAsset: "poi.threeBearsHouse.exterior",
        interiorAsset: "poi.threeBearsHouse.interior",
        drawnArtStyle: .bearsCottage,
        icon: "house.and.flag.fill",
        lore: "Three bowls are steaming on the table and nobody is home yet.",
        activityDescription: "Papa's porridge is too hot and Mama's is too cold. Find the one that is just right three times and the bears will let you keep the magic bowl.",
        callToAction: "Taste the Porridge",
        musicTrackID: "world2_family_adventure",
        contract: World2POIContract(
            route: .threeBearsHouse,
            grants: [.storyDecoration(decorationID: World2StoryDecoration.perfectPorridge.id)],
            completionMilestone: "minigame.justRightPorridge.completed"
        )
    )

    // MARK: - Art Garden

    static let characterStudio = World2POIArchetype(
        id: characterStudioID,
        name: "Character Studio",
        kind: .minigame,
        sizeClass: .large,
        exteriorAsset: "poi.characterStudio.exterior",
        interiorAsset: "poi.characterStudio.interior",
        icon: "paintpalette.fill",
        lore: "A round doorway under a giant palette. Inside, a brass viewport waits for an avatar on a pedestal.",
        activityDescription: "Step into the workshop and dress up your avatar. The big circle is where the pedestal will live.",
        callToAction: "Open the Studio",
        musicTrackID: "world2_joyful_bounce",
        contract: World2POIContract(
            route: .characterStudio,
            completionMilestone: "minigame.characterStudio.opened"
        )
    )

    static let sceneBuilder = World2POIArchetype(
        id: sceneBuilderID,
        name: "The Imagination Atelier",
        kind: .factory,
        sizeClass: .large,
        exteriorAsset: "poi.sceneBuilder.exterior",
        interiorAsset: "poi.sceneBuilder.interior",
        icon: "map.fill",
        lore: "A giant parchment roof and a compass door. Inside, the cartographer's table waits to cook a new world scene.",
        activityDescription: "Choose place, theme, atmosphere, special feature, vibe, and hardpoints. Tap Generate and watch the atelier cook your scene.",
        callToAction: "Open the Atelier",
        musicTrackID: "world2_joyful_bounce",
        contract: World2POIContract(
            route: .sceneBuilder,
            grants: [.storyDecoration(decorationID: World2StoryDecoration.propertyDeed.id)],
            completionMilestone: "minigame.sceneBuilder.completed"
        )
    )

    // MARK: - Validation

    /// Check a scene's instances against the registry and against the scene's
    /// own hardpoints. Runs on launch in debug and from the scene editor.
    static func validate(scene: World2SceneDefinition) -> [World2POIRegistryIssue] {
        var issues: [World2POIRegistryIssue] = []

        var seenHardpointIDs: Set<String> = []
        for hardpoint in scene.hardpoints {
            if !seenHardpointIDs.insert(hardpoint.id).inserted {
                issues.append(
                    .duplicateHardpointID(hardpointID: hardpoint.id, sceneID: scene.id)
                )
            }
        }

        var seenInstanceIDs: Set<String> = []
        var bookings: [String: [String]] = [:]
        let hardpointsByID = Dictionary(
            scene.hardpoints.map { ($0.id, $0) },
            uniquingKeysWith: { first, _ in first }
        )

        for instance in scene.poiInstances {
            if !seenInstanceIDs.insert(instance.id).inserted {
                issues.append(
                    .duplicateInstanceID(instanceID: instance.id, sceneID: scene.id)
                )
            }

            guard let archetype = archetype(instance.archetypeID) else {
                issues.append(
                    .unknownArchetype(
                        instanceID: instance.id,
                        archetypeID: instance.archetypeID,
                        sceneID: scene.id
                    )
                )
                continue
            }

            guard let hardpointID = instance.hardpointID else { continue }
            bookings[hardpointID, default: []].append(instance.id)

            guard let hardpoint = hardpointsByID[hardpointID] else {
                issues.append(
                    .unknownHardpoint(
                        instanceID: instance.id,
                        hardpointID: hardpointID,
                        sceneID: scene.id
                    )
                )
                continue
            }

            if !archetype.fits(hardpoint) {
                issues.append(
                    .hardpointRejectsSize(
                        instanceID: instance.id,
                        hardpointID: hardpointID,
                        sceneID: scene.id
                    )
                )
            }
        }

        for (hardpointID, instanceIDs) in bookings where instanceIDs.count > 1 {
            issues.append(
                .hardpointDoubleBooked(
                    hardpointID: hardpointID,
                    sceneID: scene.id,
                    instanceIDs: instanceIDs.sorted()
                )
            )
        }

        return issues.sorted { $0.description < $1.description }
    }

    /// A text dump of the whole catalog. Printed once on launch so the registered
    /// contracts can be reviewed from a console log instead of a debugger.
    static func contractReport() -> String {
        var lines = ["POI REGISTRY — \(all.count) registered archetypes"]
        for archetype in all.sorted(by: { $0.id < $1.id }) {
            lines.append(
                "  \(archetype.id) [\(archetype.kind.rawValue), \(archetype.sizeClass.rawValue)] — \(archetype.contract.auditLine)"
            )
        }
        return lines.joined(separator: "\n")
    }
}
