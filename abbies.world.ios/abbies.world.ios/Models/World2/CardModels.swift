//
//  CardModels.swift
//  abbies.world.ios
//
//  Data models for the Card system in Abbie's World.
//  Cards are crafted by combining any 3 ingredients.
//

import Foundation

enum CardRarity: String, Codable, CaseIterable, Comparable {
    case common
    case uncommon
    case rare
    case epic
    case legendary
    
    var displayName: String {
        switch self {
        case .common: return "Common"
        case .uncommon: return "Uncommon"
        case .rare: return "Rare"
        case .epic: return "Epic"
        case .legendary: return "Legendary"
        }
    }
    
    var colorHex: String {
        switch self {
        case .common: return "#9E9E9E"
        case .uncommon: return "#4CAF50"
        case .rare: return "#2196F3"
        case .epic: return "#9C27B0"
        case .legendary: return "#FF9800"
        }
    }
    
    private var sortOrder: Int {
        switch self {
        case .common: return 0
        case .uncommon: return 1
        case .rare: return 2
        case .epic: return 3
        case .legendary: return 4
        }
    }
    
    static func < (lhs: CardRarity, rhs: CardRarity) -> Bool {
        lhs.sortOrder < rhs.sortOrder
    }
}

enum CardGenerationStatus: String, Codable {
    case pending
    case generating
    case completed
    case failed
    case rejected
}

struct CreatureCard: Codable, Identifiable {
    let id: String
    let playerId: String
    
    // Ingredients can be any 3, stored in slots but not category-restricted
    let creatureIngredient: IngredientReference?
    let functionIngredient: IngredientReference?
    let contextIngredient: IngredientReference?
    
    let prompt: String?
    let generatedImageUrl: String?
    let thumbnailUrl: String?
    let createdAt: Date
    var accepted: Bool
    var inActiveDeck: Bool
    var rarity: CardRarity
    var score: Int?
    var generationStatus: CardGenerationStatus
    
    // Deterministic hash of sorted ingredient IDs - same combo = same hash
    var recipeHash: String?
    
    struct IngredientReference: Codable {
        let id: String
        let name: String
        let category: IngredientCategory
    }
    
    var allIngredients: [IngredientReference] {
        [creatureIngredient, functionIngredient, contextIngredient].compactMap { $0 }
    }
    
    var displayName: String {
        let names = allIngredients.map { $0.name }
        if names.count >= 2 {
            return "\(names[0]) \(names[1])"
        } else if names.count == 1 {
            return names[0]
        }
        return "Mystery Creature"
    }
    
    var fullDescription: String {
        let names = allIngredients.map { $0.name }
        return names.joined(separator: " + ")
    }
}

struct CardCollection: Codable {
    let playerId: String
    var cards: [CreatureCard]
    var activeDeck: [String]
    
    static let maxActiveDeckSize = 5
    
    var activeDeckCards: [CreatureCard] {
        cards.filter { activeDeck.contains($0.id) }
    }
    
    var acceptedCards: [CreatureCard] {
        cards.filter { $0.accepted }
    }
    
    func cardWithRecipeHash(_ hash: String) -> CreatureCard? {
        cards.first { $0.recipeHash == hash }
    }
    
    func hasCardWithRecipeHash(_ hash: String) -> Bool {
        cards.contains { $0.recipeHash == hash }
    }
    
    mutating func addToActiveDeck(_ cardId: String) -> Bool {
        guard activeDeck.count < Self.maxActiveDeckSize else { return false }
        guard !activeDeck.contains(cardId) else { return false }
        guard cards.contains(where: { $0.id == cardId && $0.accepted }) else { return false }
        activeDeck.append(cardId)
        if let index = cards.firstIndex(where: { $0.id == cardId }) {
            cards[index].inActiveDeck = true
        }
        return true
    }
    
    mutating func removeFromActiveDeck(_ cardId: String) -> Bool {
        guard let index = activeDeck.firstIndex(of: cardId) else { return false }
        activeDeck.remove(at: index)
        if let cardIndex = cards.firstIndex(where: { $0.id == cardId }) {
            cards[cardIndex].inActiveDeck = false
        }
        return true
    }
}

struct CardGenerationRequest: Codable {
    let ingredientIds: [String]
    let playerId: String
    let recipeHash: String
}

struct CardGenerationResponse: Codable {
    let cardId: String
    let status: CardGenerationStatus
    let imageUrl: String?
    let thumbnailUrl: String?
    let prompt: String?
    let rarity: CardRarity?
    let error: String?
    let cached: Bool?
}
