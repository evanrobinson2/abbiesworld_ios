//
//  World2ViewModel.swift
//  abbies.world.ios
//
//  Main ViewModel for Abbie's World game shell.
//  Coordinates navigation, POI interaction, and game state.
//

import Foundation
import Combine
import SwiftUI

enum World2Screen: Equatable {
    case loading
    case playerSelect
    case worldMap
    case poiInterior(poiId: String)
    case cardFactory
    case cardVault
    case cardShop
    case playerHome
    case minigame(poiId: String, minigameType: String)
}

struct POIInspection: Identifiable {
    let id: String
    let poi: POI
    let placement: POIPlacement
}

@MainActor
class World2ViewModel: ObservableObject {
    
    private let assetService = AssetBootstrapService.shared
    private let playerService = PlayerStateService.shared
    private let musicService = World2MusicService.shared
    private var cancellables = Set<AnyCancellable>()
    
    @Published var currentScreen: World2Screen = .loading
    @Published var currentWorld: World?
    @Published var inspectedPOI: POIInspection?
    @Published var showingPOISheet = false
    @Published var isTransitioning = false
    @Published var toastMessage: String?
    
    private(set) var worlds: [WorldId: World] = [:]
    private(set) var pois: [String: POI] = [:]
    private(set) var ingredientCatalog: IngredientCatalog = .empty
    
    var bootstrapProgress: Double { assetService.overallProgress }
    var isBootstrapReady: Bool { assetService.isReady }
    var gems: Int { playerService.gems }
    var totalIngredients: Int { playerService.totalIngredients }
    var activeDeckCount: Int { playerService.activeDeckCount }
    var currentPlayerId: PlayerId? { playerService.currentPlayer?.playerId }
    
    init() {
        setupBindings()
        loadGameContent()
    }
    
    private func setupBindings() {
        assetService.$state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                if state.isReady && self?.currentScreen == .loading {
                    self?.onBootstrapComplete()
                }
            }
            .store(in: &cancellables)

        playerService.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
    }
    
    func startGame() async {
        currentScreen = .loading
        await assetService.bootstrap()
    }
    
    private func onBootstrapComplete() {
        if playerService.currentPlayer == nil {
            currentScreen = .playerSelect
        } else {
            enterWorldMap()
        }
    }
    
    func selectPlayer(_ playerId: PlayerId) {
        playerService.selectPlayer(playerId)
        enterWorldMap()
    }
    
    func enterWorldMap() {
        let worldId = playerService.currentWorldId
        guard let world = worlds[worldId] else {
            print("⚠️ World2ViewModel: World not found: \(worldId)")
            return
        }
        
        currentWorld = world
        currentScreen = .worldMap
        musicService.enterLocation(worldId.rawValue)
    }
    
    func navigateToWorld(_ worldId: WorldId) {
        guard let world = worlds[worldId] else {
            print("⚠️ World2ViewModel: Cannot navigate to unknown world: \(worldId)")
            return
        }
        
        guard playerService.currentPlayer?.progression.unlockedWorlds.contains(worldId) == true else {
            showToast("This world is still locked!")
            return
        }
        
        isTransitioning = true
        
        musicService.exitLocation(returningTo: nil)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.currentWorld = world
            self?.playerService.setCurrentWorld(worldId)
            self?.musicService.enterLocation(worldId.rawValue)
            self?.isTransitioning = false
        }
    }
    
    func inspectPOI(placement: POIPlacement) {
        guard let poi = pois[placement.poiId] else {
            print("⚠️ World2ViewModel: POI not found: \(placement.poiId)")
            return
        }
        
        inspectedPOI = POIInspection(id: placement.id, poi: poi, placement: placement)
        showingPOISheet = true
    }
    
    func dismissPOIInspection() {
        showingPOISheet = false
        inspectedPOI = nil
    }
    
    func enterPOI(_ poi: POI) {
        if let cost = poi.entryCost, let gemCost = cost.gems, gemCost > 0 {
            guard playerService.spendGems(gemCost) else {
                showToast("Not enough gems!")
                return
            }
        }
        
        dismissPOIInspection()
        
        musicService.enterLocation(poi.id)
        
        switch poi.type {
        case .home:
            currentScreen = .playerHome
        case .cardFactory:
            currentScreen = .cardFactory
        case .cardVault:
            currentScreen = .cardVault
        case .cardShop:
            currentScreen = .cardShop
        case .minigame, .farmPlot:
            if let minigameType = poi.minigameType {
                currentScreen = .minigame(poiId: poi.id, minigameType: minigameType)
                musicService.transitionToIntense()
            }
        case .creatureIngredient, .functionIngredient, .contextIngredient, .gemReward:
            if let minigameType = poi.minigameType {
                currentScreen = .minigame(poiId: poi.id, minigameType: minigameType)
                musicService.transitionToIntense()
            } else {
                currentScreen = .poiInterior(poiId: poi.id)
            }
        }
    }
    
    func exitPOI() {
        guard let worldId = currentWorld?.id else {
            enterWorldMap()
            return
        }
        
        musicService.transitionToLight()
        musicService.exitLocation(returningTo: worldId.rawValue)
        currentScreen = .worldMap
    }
    
    func completeMinigame(poiId: String, rewards: [RewardConfiguration.Reward], score: Int) {
        musicService.transitionToLight()
        
        for reward in rewards {
            applyReward(reward)
        }
        
        playerService.markPOICompleted(poiId)
        playerService.incrementMinigamesCompleted()
        
        let rewardSummary = summarizeRewards(rewards)
        showToast("Great job! \(rewardSummary)")
        
        exitPOI()
    }
    
    private func applyReward(_ reward: RewardConfiguration.Reward) {
        switch reward.type {
        case .gems:
            if let amount = reward.amount {
                playerService.addGems(amount)
            }
        case .creatureIngredient:
            if let itemId = reward.itemId {
                playerService.addIngredient(id: itemId, category: .creature, source: "minigame")
            }
        case .functionIngredient:
            if let itemId = reward.itemId {
                playerService.addIngredient(id: itemId, category: .function, source: "minigame")
            }
        case .contextIngredient:
            if let itemId = reward.itemId {
                playerService.addIngredient(id: itemId, category: .context, source: "minigame")
            }
        case .decoration:
            if let itemId = reward.itemId {
                let decoration = DecorationInstance(decorationId: itemId, x: 0.5, y: 0.5)
                playerService.addDecoration(decoration)
            }
        case .musicTrack:
            if let itemId = reward.itemId {
                playerService.unlockMusic(itemId)
            }
        case .card, .unlock:
            break
        }
    }
    
    private func summarizeRewards(_ rewards: [RewardConfiguration.Reward]) -> String {
        var parts: [String] = []
        
        let gems = rewards.filter { $0.type == .gems }.compactMap { $0.amount }.reduce(0, +)
        if gems > 0 {
            parts.append("\(gems) gem\(gems == 1 ? "" : "s")")
        }
        
        let ingredients = rewards.filter {
            $0.type == .creatureIngredient || $0.type == .functionIngredient || $0.type == .contextIngredient
        }.count
        if ingredients > 0 {
            parts.append("\(ingredients) ingredient\(ingredients == 1 ? "" : "s")")
        }
        
        return parts.isEmpty ? "Completed!" : "Earned \(parts.joined(separator: " and "))!"
    }
    
    func showToast(_ message: String) {
        toastMessage = message
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
            if self?.toastMessage == message {
                self?.toastMessage = nil
            }
        }
    }
    
    private func loadGameContent() {
        worlds = [
            .home: World(
                id: .home,
                name: "Home World",
                description: "A cozy, magical place where you can create and collect",
                backgroundAsset: "map.home",
                lightMusicTrack: "music.home.light",
                intenseMusicTrack: "music.home.intense",
                poiPlacements: [
                    POIPlacement(poiId: "poi.abbieTreehouse", x: 0.15, y: 0.35, scale: 1.0, zIndex: 1),
                    POIPlacement(poiId: "poi.aniTreehouse", x: 0.85, y: 0.35, scale: 1.0, zIndex: 1),
                    POIPlacement(poiId: "poi.cardFactory", x: 0.35, y: 0.65, scale: 1.2, zIndex: 2),
                    POIPlacement(poiId: "poi.cardVault", x: 0.65, y: 0.65, scale: 1.0, zIndex: 2),
                    POIPlacement(poiId: "poi.cardShop", x: 0.5, y: 0.85, scale: 1.0, zIndex: 2)
                ],
                adjacentWorlds: [.farm, .adventure],
                ambiance: World.WorldAmbiance(primaryColor: "#4CAF50", secondaryColor: "#8BC34A", mood: "magical")
            ),
            .farm: World(
                id: .farm,
                name: "Ingredient Farm",
                description: "Grow and harvest ingredients for your cards",
                backgroundAsset: "map.farm",
                lightMusicTrack: "music.farm.light",
                intenseMusicTrack: "music.farm.intense",
                poiPlacements: [
                    POIPlacement(poiId: "poi.farm.creatures", x: 0.25, y: 0.3, scale: 1.0, zIndex: 1),
                    POIPlacement(poiId: "poi.farm.costumes", x: 0.75, y: 0.3, scale: 1.0, zIndex: 1),
                    POIPlacement(poiId: "poi.farm.places", x: 0.25, y: 0.65, scale: 1.0, zIndex: 1),
                    POIPlacement(poiId: "poi.farm.mystery", x: 0.75, y: 0.65, scale: 1.0, zIndex: 1)
                ],
                adjacentWorlds: [.home],
                ambiance: World.WorldAmbiance(primaryColor: "#8BC34A", secondaryColor: "#CDDC39", mood: "pastoral")
            ),
            .adventure: World(
                id: .adventure,
                name: "Adventure World",
                description: "A rugged frontier where you earn ingredients and gems",
                backgroundAsset: "map.adventure",
                lightMusicTrack: "music.adventure.light",
                intenseMusicTrack: "music.adventure.intense",
                poiPlacements: [
                    POIPlacement(poiId: "poi.creatureIngredient", x: 0.2, y: 0.3, scale: 1.0, zIndex: 1),
                    POIPlacement(poiId: "poi.functionIngredient", x: 0.8, y: 0.3, scale: 1.0, zIndex: 1),
                    POIPlacement(poiId: "poi.contextIngredient", x: 0.2, y: 0.7, scale: 1.0, zIndex: 1),
                    POIPlacement(poiId: "poi.gemReward", x: 0.8, y: 0.7, scale: 1.0, zIndex: 1)
                ],
                adjacentWorlds: [.home],
                ambiance: World.WorldAmbiance(primaryColor: "#FF9800", secondaryColor: "#795548", mood: "adventurous")
            )
        ]
        
        pois = [
            "poi.abbieTreehouse": POI(
                id: "poi.abbieTreehouse",
                name: "Abbie's Treehouse",
                type: .home,
                mapId: .home,
                exteriorAsset: "poi.abbieTreehouse.exterior",
                interiorAsset: "poi.abbieTreehouse.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 250),
                lore: "Abbie's magical treehouse filled with wonder",
                description: "Your cozy home in the trees",
                entryCost: nil,
                rewardConfiguration: nil,
                minigameType: nil,
                lightMusicTrack: "music.abbieTreehouse.light",
                intenseMusicTrack: "music.abbieTreehouse.intense",
                icon: "house.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: "player.abbie"
            ),
            "poi.aniTreehouse": POI(
                id: "poi.aniTreehouse",
                name: "Ani's Treehouse",
                type: .home,
                mapId: .home,
                exteriorAsset: "poi.aniTreehouse.exterior",
                interiorAsset: "poi.aniTreehouse.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 250),
                lore: "Ani's dreamy treehouse full of mystery",
                description: "A mystical home among the branches",
                entryCost: nil,
                rewardConfiguration: nil,
                minigameType: nil,
                lightMusicTrack: "music.aniTreehouse.light",
                intenseMusicTrack: "music.aniTreehouse.intense",
                icon: "house.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: "player.ani"
            ),
            "poi.cardFactory": POI(
                id: "poi.cardFactory",
                name: "Card Factory",
                type: .cardFactory,
                mapId: .home,
                exteriorAsset: "poi.cardFactory.exterior",
                interiorAsset: "poi.cardFactory.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 250, height: 300),
                lore: "Where magical creature cards come to life",
                description: "Create your own creature cards!",
                entryCost: nil,
                rewardConfiguration: nil,
                minigameType: nil,
                lightMusicTrack: "music.cardFactory.light",
                intenseMusicTrack: "music.cardFactory.intense",
                icon: "wand.and.stars",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.cardVault": POI(
                id: "poi.cardVault",
                name: "Card Vault",
                type: .cardVault,
                mapId: .home,
                exteriorAsset: "poi.cardVault.exterior",
                interiorAsset: "poi.cardVault.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 250),
                lore: "A secure vault for your precious card collection",
                description: "View and manage your cards",
                entryCost: nil,
                rewardConfiguration: nil,
                minigameType: nil,
                lightMusicTrack: "music.cardVault.light",
                intenseMusicTrack: "music.cardVault.intense",
                icon: "archivebox.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.cardShop": POI(
                id: "poi.cardShop",
                name: "Card Shop",
                type: .cardShop,
                mapId: .home,
                exteriorAsset: "poi.cardShop.exterior",
                interiorAsset: "poi.cardShop.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 220, height: 280),
                lore: "Trade your cards for shiny gems!",
                description: "Sell cards for gems, buy decorations",
                entryCost: nil,
                rewardConfiguration: nil,
                minigameType: nil,
                lightMusicTrack: "music.cardShop.light",
                intenseMusicTrack: "music.cardShop.intense",
                icon: "bag.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            // MARK: - Farm POIs (4 mini-games for farming ingredients)
            "poi.farm.creatures": POI(
                id: "poi.farm.creatures",
                name: "Creature Garden",
                type: .farmPlot,
                mapId: .farm,
                exteriorAsset: "poi.farm.creatures.exterior",
                interiorAsset: "poi.farm.creatures.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 200),
                lore: "Tend to magical creatures and earn their friendship",
                description: "Farm creature ingredients!",
                entryCost: nil,
                rewardConfiguration: RewardConfiguration(
                    baseRewards: [
                        RewardConfiguration.Reward(type: .creatureIngredient, itemId: "creature.cat", probability: 0.4),
                        RewardConfiguration.Reward(type: .creatureIngredient, itemId: "creature.dragon", probability: 0.2),
                        RewardConfiguration.Reward(type: .creatureIngredient, itemId: "creature.robot", probability: 0.2),
                        RewardConfiguration.Reward(type: .creatureIngredient, itemId: "creature.octopus", probability: 0.2)
                    ],
                    bonusRewards: [
                        RewardConfiguration.BonusReward(
                            condition: "perfect_score",
                            reward: RewardConfiguration.Reward(type: .creatureIngredient, itemId: "creature.cheetah", probability: 1.0)
                        )
                    ],
                    performanceTiers: nil
                ),
                minigameType: "watering",
                lightMusicTrack: "music.farm.light",
                intenseMusicTrack: "music.farm.intense",
                icon: "pawprint.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.farm.costumes": POI(
                id: "poi.farm.costumes",
                name: "Costume Orchard",
                type: .farmPlot,
                mapId: .farm,
                exteriorAsset: "poi.farm.costumes.exterior",
                interiorAsset: "poi.farm.costumes.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 200),
                lore: "Harvest magical outfits from enchanted trees",
                description: "Farm costume ingredients!",
                entryCost: nil,
                rewardConfiguration: RewardConfiguration(
                    baseRewards: [
                        RewardConfiguration.Reward(type: .functionIngredient, itemId: "function.wizard", probability: 0.3),
                        RewardConfiguration.Reward(type: .functionIngredient, itemId: "function.superhero", probability: 0.3),
                        RewardConfiguration.Reward(type: .functionIngredient, itemId: "function.chef", probability: 0.2),
                        RewardConfiguration.Reward(type: .functionIngredient, itemId: "function.ninja", probability: 0.2)
                    ],
                    bonusRewards: [
                        RewardConfiguration.BonusReward(
                            condition: "perfect_score",
                            reward: RewardConfiguration.Reward(type: .functionIngredient, itemId: "function.astronaut", probability: 1.0)
                        )
                    ],
                    performanceTiers: nil
                ),
                minigameType: "harvesting",
                lightMusicTrack: "music.farm.light",
                intenseMusicTrack: "music.farm.intense",
                icon: "tshirt.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.farm.places": POI(
                id: "poi.farm.places",
                name: "Portal Pond",
                type: .farmPlot,
                mapId: .farm,
                exteriorAsset: "poi.farm.places.exterior",
                interiorAsset: "poi.farm.places.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 200),
                lore: "Fish for magical places in the enchanted waters",
                description: "Farm place ingredients!",
                entryCost: nil,
                rewardConfiguration: RewardConfiguration(
                    baseRewards: [
                        RewardConfiguration.Reward(type: .contextIngredient, itemId: "context.jungle", probability: 0.3),
                        RewardConfiguration.Reward(type: .contextIngredient, itemId: "context.underwater", probability: 0.3),
                        RewardConfiguration.Reward(type: .contextIngredient, itemId: "context.castle", probability: 0.2),
                        RewardConfiguration.Reward(type: .contextIngredient, itemId: "context.volcano", probability: 0.2)
                    ],
                    bonusRewards: [
                        RewardConfiguration.BonusReward(
                            condition: "perfect_score",
                            reward: RewardConfiguration.Reward(type: .contextIngredient, itemId: "context.space", probability: 1.0)
                        )
                    ],
                    performanceTiers: nil
                ),
                minigameType: "fishing",
                lightMusicTrack: "music.farm.light",
                intenseMusicTrack: "music.farm.intense",
                icon: "globe",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.farm.mystery": POI(
                id: "poi.farm.mystery",
                name: "Mystery Patch",
                type: .farmPlot,
                mapId: .farm,
                exteriorAsset: "poi.farm.mystery.exterior",
                interiorAsset: "poi.farm.mystery.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 200),
                lore: "What grows here? Only luck knows!",
                description: "Random ingredients + bonus gems!",
                entryCost: nil,
                rewardConfiguration: RewardConfiguration(
                    baseRewards: [
                        RewardConfiguration.Reward(type: .creatureIngredient, itemId: "creature.bat", probability: 0.2),
                        RewardConfiguration.Reward(type: .functionIngredient, itemId: "function.racer", probability: 0.2),
                        RewardConfiguration.Reward(type: .contextIngredient, itemId: "context.candyworld", probability: 0.1),
                        RewardConfiguration.Reward(type: .gems, amount: 2, probability: 0.5)
                    ],
                    bonusRewards: [
                        RewardConfiguration.BonusReward(
                            condition: "perfect_score",
                            reward: RewardConfiguration.Reward(type: .gems, amount: 5, probability: 1.0)
                        )
                    ],
                    performanceTiers: nil
                ),
                minigameType: "digging",
                lightMusicTrack: "music.farm.light",
                intenseMusicTrack: "music.farm.intense",
                icon: "questionmark.circle.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.creatureIngredient": POI(
                id: "poi.creatureIngredient",
                name: "Creature Den",
                type: .creatureIngredient,
                mapId: .adventure,
                exteriorAsset: "poi.creatureDen.exterior",
                interiorAsset: "poi.creatureDen.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 200),
                lore: "Home to wild and wonderful creatures",
                description: "Earn creature ingredients here",
                entryCost: nil,
                rewardConfiguration: RewardConfiguration(
                    baseRewards: [
                        RewardConfiguration.Reward(type: .creatureIngredient, itemId: "creature.random", probability: 1.0)
                    ],
                    bonusRewards: nil,
                    performanceTiers: nil
                ),
                minigameType: "matching",
                lightMusicTrack: "music.creaturePOI.light",
                intenseMusicTrack: "music.creaturePOI.intense",
                icon: "pawprint.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.functionIngredient": POI(
                id: "poi.functionIngredient",
                name: "Costume Workshop",
                type: .functionIngredient,
                mapId: .adventure,
                exteriorAsset: "poi.costumeWorkshop.exterior",
                interiorAsset: "poi.costumeWorkshop.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 200),
                lore: "Where outfits and powers are crafted",
                description: "Earn costume ingredients here",
                entryCost: nil,
                rewardConfiguration: RewardConfiguration(
                    baseRewards: [
                        RewardConfiguration.Reward(type: .functionIngredient, itemId: "function.random", probability: 1.0)
                    ],
                    bonusRewards: nil,
                    performanceTiers: nil
                ),
                minigameType: "sequence",
                lightMusicTrack: "music.functionPOI.light",
                intenseMusicTrack: "music.functionPOI.intense",
                icon: "tshirt.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.contextIngredient": POI(
                id: "poi.contextIngredient",
                name: "Portal Gateway",
                type: .contextIngredient,
                mapId: .adventure,
                exteriorAsset: "poi.portalGateway.exterior",
                interiorAsset: "poi.portalGateway.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 200),
                lore: "Doorways to wondrous places",
                description: "Earn place ingredients here",
                entryCost: nil,
                rewardConfiguration: RewardConfiguration(
                    baseRewards: [
                        RewardConfiguration.Reward(type: .contextIngredient, itemId: "context.random", probability: 1.0)
                    ],
                    bonusRewards: nil,
                    performanceTiers: nil
                ),
                minigameType: "puzzle",
                lightMusicTrack: "music.contextPOI.light",
                intenseMusicTrack: "music.contextPOI.intense",
                icon: "globe",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            ),
            "poi.gemReward": POI(
                id: "poi.gemReward",
                name: "Gem Mine",
                type: .gemReward,
                mapId: .adventure,
                exteriorAsset: "poi.gemMine.exterior",
                interiorAsset: "poi.gemMine.interior",
                tapHitbox: POI.HitBox(x: 0, y: 0, width: 200, height: 200),
                lore: "Sparkling gems await discovery",
                description: "Earn gems to create cards",
                entryCost: nil,
                rewardConfiguration: RewardConfiguration(
                    baseRewards: [
                        RewardConfiguration.Reward(type: .gems, amount: 3, probability: 1.0)
                    ],
                    bonusRewards: [
                        RewardConfiguration.BonusReward(
                            condition: "perfect_score",
                            reward: RewardConfiguration.Reward(type: .gems, amount: 2, probability: 1.0)
                        )
                    ],
                    performanceTiers: nil
                ),
                minigameType: "reaction",
                lightMusicTrack: "music.gemPOI.light",
                intenseMusicTrack: "music.gemPOI.intense",
                icon: "diamond.fill",
                embellishmentSlots: nil,
                interactiveDecorationHooks: nil,
                ownerId: nil
            )
        ]
        
        ingredientCatalog = .sampleCatalog
    }
}
