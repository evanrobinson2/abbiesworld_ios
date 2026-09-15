//
//  POIModels.swift
//  abbies.world.ios
//
//  The reward vocabulary shared with the backend.
//
//  The `POI` struct that used to live here has been replaced by
//  World2POIArchetype (see World2POIArchetypeModels.swift), which carries the
//  same art and copy plus an explicit contract, and by World2POIInstance, which
//  carries placement. A place is registered once and placed many times.
//

import Foundation

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
