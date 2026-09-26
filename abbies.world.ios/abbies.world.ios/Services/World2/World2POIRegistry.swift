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
    static let evanHomeID = "poi.evanHome"
    static let cardFactoryID = "poi.cardFactory"
    static let letterWorksID = "poi.letterWorks"
    static let furnitureStoreID = "poi.furnitureStore"
    static let assetWorkbenchID = "poi.assetWorkbench"
    static let creatureLabID = "poi.creatureLab"
    static let placeFactoryID = "poi.selfReplicatingFactory"
    static let threeBearsHouseID = "poi.threeBearsHouse"
    static let characterStudioID = "poi.characterStudio"
    static let figurineExplorerID = "poi.figurineExplorer"
    static let sceneBuilderID = "poi.sceneBuilder"
    static let whizbangID = "poi.whizbang"
    static let planningDeptID = "poi.planningDept"

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
        treehouse(for: .evan),
        cardFactory,
        letterWorks,
        furnitureStore,
        assetWorkbench,
        creatureLab,
        placeFactory,
        threeBearsHouse,
        characterStudio,
        figurineExplorer,
        sceneBuilder,
        whizbang,
        planningDept,
        peglinWreck,
        peglinPegMonastery,
        peglinBattleClearing,
        peglinSalvageWorkshop,
        peglinBrokenPath,
        peglinBrambleGuardian,
        peglinFoxGuardian,
        peglinStagGuardian,
        peglinForgottenOrb,
        peglinPathToFox,
        peglinPathToStag,
        peglinPathToForgotten,
        peglinPathBackToCrash,
        peglinPathBackToBramble,
        peglinPathBackToFox,
        peglinPathBackToStag,
        peglinPathHomeToFox,
        peglinPathFoxToHome,
    ]

    static func archetype(_ id: String) -> World2POIArchetype? {
        if let remote = World2WorldSync.shared.archetype(id) {
            return remote
        }
        // Peglin Edition shells stay available even when the household document
        // is server-backed (until MCP seed lands those places remotely).
        if id.hasPrefix("poi.peglin.") {
            return archetypes[id]
        }
        if World2WorldSync.shared.usesServerDocument {
            return nil
        }
        return archetypes[id]
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
        let name: String
        let lore: String
        let music: String
        switch owner {
        case .abbie:
            name = "\(owner.displayName)'s Treehouse"
            lore = "A bright place for making and imagining."
            music = "world2_family_adventure"
        case .ani:
            name = "\(owner.displayName)'s Treehouse"
            lore = "A calm place for stories and stargazing."
            music = "world2_cliffside_morning"
        case .evan:
            name = "Daddy's Citadel"
            lore = "A glowing white base on the mountain — blue paths, glass halls, and a view of the water."
            music = "world2_glassy_bells"
        }
        return World2POIArchetype(
            id: owner.homePoiId,
            name: name,
            kind: .home,
            sizeClass: .large,
            exteriorAsset: "\(owner.homePoiId).exterior",
            interiorAsset: "\(owner.homePoiId).interior",
            icon: owner == .evan ? "building.2.fill" : "house.fill",
            lore: lore,
            activityDescription: owner == .evan
                ? "Say hello — Daddy always has candy or a hug waiting."
                : "Step inside and add a cozy touch to make the space feel like yours.",
            callToAction: owner == .evan ? "Say Hello" : "Decorate My Space",
            musicTrackID: music,
            contract: World2POIContract(
                route: .playerHome,
                grants: owner == .evan
                    ? [
                        .storyDecoration(decorationID: World2StoryDecoration.daddyCandy.id),
                        .storyDecoration(decorationID: World2StoryDecoration.daddyHug.id),
                    ]
                    : [],
                requiresOwnership: owner != .evan
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

    static let figurineExplorer = World2POIArchetype(
        id: figurineExplorerID,
        name: "Figurine Explorer",
        kind: .minigame,
        sizeClass: .medium,
        exteriorAsset: "poi.figurineExplorer.exterior",
        interiorAsset: "poi.figurineExplorer.interior",
        icon: "figure.walk",
        lore: "A little pedestal on the lookout ring. Spin a figurine and watch it run in place.",
        activityDescription: "Cycle Abbie and Daddy, pick a clip, and drag to walk around the figure. They stay put and run on the spot.",
        callToAction: "Open the Explorer",
        musicTrackID: "world2_joyful_bounce",
        contract: World2POIContract(
            route: .figurineExplorer,
            completionMilestone: "minigame.figurineExplorer.opened"
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

    static let whizbang = World2POIArchetype(
        id: whizbangID,
        name: "Whizbang",
        kind: .minigame,
        sizeClass: .medium,
        exteriorAsset: "poi.whizbang.exterior",
        drawnArtStyle: .whizbangGadgetBarn,
        icon: "gearshape.2.fill",
        lore: "A rattly gadget barn that launches floppy flyers into a cloud bed.",
        activityDescription: "Twist the knobs, flip Fan / Bounce / Balloon, then LAUNCH. Land in the clouds.",
        callToAction: "Launch Whizbang",
        musicTrackID: "world2_joyful_bounce",
        contract: World2POIContract(
            route: .whizbang,
            grants: [.gems(upTo: 8)],
            completionMilestone: "minigame.whizbang.landed"
        )
    )

    static let planningDept = World2POIArchetype(
        id: planningDeptID,
        name: "Planning Department",
        kind: .factory,
        sizeClass: .medium,
        exteriorAsset: "poi.planningDept.exterior",
        icon: "map.fill",
        lore: "Blueprints, pins, and a table-sized map of every land you know.",
        activityDescription: "See the world graph, find open North / South / East / West expansion tunnels, and plan where a new land can attach.",
        callToAction: "Open the Map Room",
        musicTrackID: "world2_working_song",
        contract: World2POIContract(
            route: .planningDept,
            completionMilestone: "minigame.planningDept.opened"
        )
    )

    // MARK: - Peglin Edition

    static let peglinWreck = World2POIArchetype(
        id: PeglinEdition.wreckPlaceID,
        name: "The Wreck",
        kind: .story,
        sizeClass: .large,
        // Scene crop of the crash craft (same idea as land guardians using their plate).
        exteriorAsset: "token.peglin.wreck",
        interiorAsset: "poi.peglin.wreck.interior",
        icon: "airplane",
        lore: "Half-buried fantasy-tech craft — your point of origin on this floating isle.",
        activityDescription: "Step into the damaged control chamber and reclaim what you can.",
        callToAction: "Enter the Wreck",
        musicTrackID: "plink_abbies_world",
        contract: World2POIContract(
            route: .rooms,
            completionMilestone: "peglin.wreck.entered"
        )
    )

    /// Peg Monastery — Crash World home land; math challenge earns Plink blessings.
    static let peglinPegMonastery = World2POIArchetype(
        id: PeglinEdition.pegMonasteryID,
        name: "Peg Monastery",
        kind: .minigame,
        sizeClass: .large,
        exteriorAsset: "poi.peglin.pegMonastery.exterior",
        interiorAsset: "poi.peglin.pegMonastery.interior",
        icon: "bell.fill",
        lore: "A floating cloister of bells — solve a sum to earn Refresh, Super Peg, or Bomb Peg.",
        activityDescription: "Enter the hall and answer a math challenge. Max two of each blessing.",
        callToAction: "Enter Monastery",
        musicTrackID: "plink_abbies_world",
        contract: World2POIContract(
            route: .pegMonastery,
            grants: [.gems(upTo: 2)],
            completionMilestone: "peglin.monastery.blessing"
        )
    )

    static let peglinBattleClearing = World2POIArchetype(
        id: PeglinEdition.battlePlaceID,
        name: "Battle Clearing",
        kind: .minigame,
        sizeClass: .large,
        exteriorAsset: "token.peglin.battle",
        icon: "circle.grid.cross.fill",
        lore: "A natural bowl where wreckage and crystals become the pegboard.",
        activityDescription: "Aim, bounce, clear orange pegs — the Peglin machine lives here.",
        callToAction: "Enter Battle",
        musicTrackID: "plink_fell_from_the_blue",
        contract: World2POIContract(
            route: .plink,
            grants: [.gems(upTo: 12)],
            completionMilestone: "peglin.battle.clearing"
        )
    )

    static let peglinSalvageWorkshop = World2POIArchetype(
        id: PeglinEdition.workshopPlaceID,
        name: "Salvage Workshop",
        kind: .story,
        sizeClass: .medium,
        exteriorAsset: "token.peglin.workshop",
        interiorAsset: "poi.peglin.salvageWorkshop.interior",
        icon: "wrench.and.screwdriver.fill",
        lore: "A lean-to of wreck panels — future home for orbs and upgrades.",
        activityDescription: "Warm bench light, shelves of salvage, room to grow.",
        callToAction: "Enter Workshop",
        musicTrackID: "plink_abbies_world",
        contract: World2POIContract(
            route: .rooms,
            completionMilestone: "peglin.workshop.entered"
        )
    )

    static let peglinBrokenPath = World2POIArchetype(
        id: PeglinEdition.brokenPathPlaceID,
        name: "To Fox Land",
        kind: .story,
        sizeClass: .medium,
        exteriorAsset: "map.peglin.foxLand",
        icon: "bridge",
        lore: "A fractured path north toward Fox Land.",
        activityDescription: "Step north to challenge the Fox Spirit.",
        callToAction: "Go to Fox Land",
        contract: World2POIContract(
            route: .travel(sceneID: PeglinEdition.Land.foxLand.sceneID),
            completionMilestone: "peglin.brokenPath.toFox"
        )
    )

    static let peglinBrambleGuardian = World2POIArchetype(
        id: PeglinEdition.brambleGuardianID,
        name: "Bramble Spirit",
        kind: .minigame,
        sizeClass: .large,
        exteriorAsset: "token.peglin.bramble",
        icon: "hare.fill",
        lore: "A glowing rabbit-fawn rooted in the clover bowl — the board is the clearing.",
        activityDescription: "Aim into the burrow pockets. Clear the spirit's trial.",
        callToAction: "Challenge Bramble",
        musicTrackID: "plink_things_in_the_grass",
        contract: World2POIContract(
            route: .plink,
            grants: [.gems(upTo: 10)],
            completionMilestone: "peglin.bramble.clear"
        )
    )

    static let peglinFoxGuardian = World2POIArchetype(
        id: PeglinEdition.foxGuardianID,
        name: "Fox Spirit",
        kind: .minigame,
        sizeClass: .large,
        exteriorAsset: "token.peglin.foxLand",
        icon: "flame.fill",
        lore: "A many-tailed kitsune among pink trees and lantern mushrooms.",
        activityDescription: "Bounce through the fox grove — lanterns and caps are your pegs.",
        callToAction: "Challenge Fox Land",
        musicTrackID: "plink_electronic_folk_dance",
        contract: World2POIContract(
            route: .plink,
            grants: [.gems(upTo: 12)],
            completionMilestone: "peglin.foxLand.clear"
        )
    )

    static let peglinStagGuardian = World2POIArchetype(
        id: PeglinEdition.stagGuardianID,
        name: "Stag Spirit",
        kind: .minigame,
        sizeClass: .large,
        exteriorAsset: "token.peglin.stagLand",
        icon: "leaf.fill",
        lore: "Crystal antlers over a ley-line pool — standing stones hum as bumpers.",
        activityDescription: "Fight the stag's trial on the floating green.",
        callToAction: "Challenge Stag Land",
        musicTrackID: "plink_cheerful_khorovod",
        contract: World2POIContract(
            route: .plink,
            grants: [.gems(upTo: 14)],
            completionMilestone: "peglin.stagLand.clear"
        )
    )

    static let peglinForgottenOrb = World2POIArchetype(
        id: PeglinEdition.forgottenOrbID,
        name: "Forgotten Orb",
        kind: .story,
        sizeClass: .medium,
        exteriorAsset: "token.peglin.forgottenRealm",
        icon: "sparkles",
        lore: "A free power-up waits on the ruined pedestal under the ancient tree.",
        activityDescription: "Claim the glowing teardrop — no battle, just a gift.",
        callToAction: "Claim Power-Up",
        musicTrackID: "plink_abbies_world",
        contract: World2POIContract(
            route: .rooms,
            grants: [.gems(upTo: 8)],
            completionMilestone: "peglin.forgottenRealm.orb"
        )
    )

    static let peglinPathToFox = peglinPath(
        id: PeglinEdition.pathToFoxID,
        name: "Path to Fox Land",
        destination: .foxLand,
        exterior: "token.peglin.travel"
    )

    static let peglinPathToStag = peglinPath(
        id: PeglinEdition.pathToStagID,
        name: "Path to Stag Land",
        destination: .stagLand,
        exterior: "token.peglin.travel"
    )

    static let peglinPathToForgotten = peglinPath(
        id: PeglinEdition.pathToForgottenID,
        name: "Path to Forgotten Realm",
        destination: .forgottenRealm,
        exterior: "token.peglin.travel"
    )

    static let peglinPathBackToCrash = peglinPath(
        id: PeglinEdition.pathBackToCrashID,
        name: "Back to Crash World",
        destination: .crashWorld,
        exterior: "token.peglin.travel"
    )

    static let peglinPathBackToBramble = peglinPath(
        id: PeglinEdition.pathBackToBrambleID,
        name: "Back to Bramble",
        destination: .bramble,
        exterior: "token.peglin.travel"
    )

    static let peglinPathBackToFox = peglinPath(
        id: PeglinEdition.pathBackToFoxID,
        name: "Back to Fox Land",
        destination: .foxLand,
        exterior: "token.peglin.travel"
    )

    static let peglinPathBackToStag = peglinPath(
        id: PeglinEdition.pathBackToStagID,
        name: "Back to Stag Land",
        destination: .stagLand,
        exterior: "token.peglin.travel"
    )

    static let peglinPathHomeToFox = peglinTravel(
        id: PeglinEdition.pathHomeToFoxID,
        name: "To Fox Land",
        destinationSceneID: PeglinEdition.Land.foxLand.sceneID,
        exterior: "map.peglin.foxLand"
    )

    static let peglinPathFoxToHome = peglinTravel(
        id: PeglinEdition.pathFoxToHomeID,
        name: "Back to Wreck",
        destinationSceneID: PeglinEdition.crashLandSceneID,
        exterior: "map.peglin.crashLand"
    )

    private static func peglinPath(
        id: String,
        name: String,
        destination: PeglinEdition.Land,
        exterior: String
    ) -> World2POIArchetype {
        peglinTravel(
            id: id,
            name: name,
            destinationSceneID: destination.sceneID,
            exterior: exterior,
            lore: "A floating fragment path toward \(destination.displayName).",
            milestone: "peglin.travel.\(destination.rawValue)"
        )
    }

    private static func peglinTravel(
        id: String,
        name: String,
        destinationSceneID: String,
        exterior: String,
        lore: String? = nil,
        milestone: String? = nil
    ) -> World2POIArchetype {
        World2POIArchetype(
            id: id,
            name: name,
            kind: .story,
            sizeClass: .small,
            exteriorAsset: exterior,
            icon: "arrow.triangle.swap",
            lore: lore ?? "A path toward \(name).",
            activityDescription: "Travel via \(name).",
            callToAction: name,
            contract: World2POIContract(
                route: .travel(sceneID: destinationSceneID),
                completionMilestone: milestone ?? "peglin.travel.\(id)"
            )
        )
    }

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
