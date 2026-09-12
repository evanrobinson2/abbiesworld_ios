//
//  POIModels.swift
//  abbies.world.ios
//
//  Data models for Points of Interest (POIs) in Abbie's World 2.
//

import Foundation

enum POIType: String, Codable, CaseIterable {
    case home = "home"
    case cardFactory = "card_factory"
    case cardVault = "card_vault"
    case cardShop = "card_shop"
    case creatureIngredient = "creature_ingredient"
    case functionIngredient = "function_ingredient"
    case contextIngredient = "context_ingredient"
    case gemReward = "gem_reward"
    case minigame = "minigame"
    case farmPlot = "farm_plot"
    
    var displayName: String {
        switch self {
        case .home: return "Home"
        case .cardFactory: return "Card Factory"
        case .cardVault: return "Card Vault"
        case .cardShop: return "Card Shop"
        case .creatureIngredient: return "Creature Den"
        case .functionIngredient: return "Costume Workshop"
        case .contextIngredient: return "Portal Gateway"
        case .gemReward: return "Gem Mine"
        case .minigame: return "Game"
        case .farmPlot: return "Farm Plot"
        }
    }
    
    var iconName: String {
        switch self {
        case .home: return "house.fill"
        case .cardFactory: return "wand.and.stars"
        case .cardVault: return "archivebox.fill"
        case .cardShop: return "bag.fill"
        case .creatureIngredient: return "pawprint.fill"
        case .functionIngredient: return "tshirt.fill"
        case .contextIngredient: return "globe"
        case .gemReward: return "diamond.fill"
        case .minigame: return "gamecontroller.fill"
        case .farmPlot: return "leaf.fill"
        }
    }
}

struct POI: Codable, Identifiable {
    let id: String
    let name: String
    let type: POIType
    let mapId: WorldId
    let exteriorAsset: String
    let interiorAsset: String?
    let tapHitbox: HitBox
    let lore: String?
    let description: String
    let entryCost: EntryCost?
    let rewardConfiguration: RewardConfiguration?
    let minigameType: String?
    let lightMusicTrack: String
    let intenseMusicTrack: String
    let icon: String?
    let embellishmentSlots: [EmbellishmentSlot]?
    let interactiveDecorationHooks: [DecorationHook]?
    let ownerId: String?
    
    struct HitBox: Codable {
        let x: Double
        let y: Double
        let width: Double
        let height: Double
    }
    
    struct EntryCost: Codable {
        let gems: Int?
        let requiredItem: String?
    }
    
    struct EmbellishmentSlot: Codable, Identifiable {
        let id: String
        let x: Double
        let y: Double
        let maxWidth: Double
        let maxHeight: Double
        let allowedTypes: [String]
    }
    
    struct DecorationHook: Codable, Identifiable {
        let id: String
        let x: Double
        let y: Double
        let interactionType: String
    }
}

struct RewardConfiguration: Codable {
    let baseRewards: [Reward]
    let bonusRewards: [BonusReward]?
    let performanceTiers: [PerformanceTier]?
    
    struct Reward: Codable, Identifiable {
        let id: String
        let type: RewardType
        let amount: Int?
        let itemId: String?
        let probability: Double
        
        init(id: String? = nil, type: RewardType, amount: Int? = nil, itemId: String? = nil, probability: Double = 1.0) {
            self.id = id ?? UUID().uuidString
            self.type = type
            self.amount = amount
            self.itemId = itemId
            self.probability = probability
        }
    }
    
    struct BonusReward: Codable {
        let condition: String
        let reward: Reward
    }
    
    struct PerformanceTier: Codable {
        let tier: Int
        let minScore: Int
        let multiplier: Double
        let bonusRewards: [Reward]?
    }
}

enum RewardType: String, Codable {
    case gems
    case creatureIngredient = "creature_ingredient"
    case functionIngredient = "function_ingredient"
    case contextIngredient = "context_ingredient"
    case card
    case decoration
    case musicTrack = "music_track"
    case unlock
}
