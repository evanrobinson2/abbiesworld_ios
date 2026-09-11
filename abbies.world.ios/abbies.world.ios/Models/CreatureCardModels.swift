//
//  CreatureCardModels.swift
//  abbies.world.ios
//
//  Data models for Creature Card Builder minigame.
//

import Foundation
import SwiftUI

// MARK: - Ingredient Types

enum IngredientType: String, Codable, CaseIterable {
    case creature
    case outfit
    case buddy
}

struct CreatureIngredient: Identifiable, Codable, Hashable {
    let id: String
    let type: IngredientType
    let name: String
    let icon: String?
    let iconEmoji: String?
    let promptDefinition: String?
    let powerConcept: String?
    let personality: [String]?
    
    var displayIcon: String {
        iconEmoji ?? "✨"
    }
}

// MARK: - Generation Job

enum GenerationStatus: String, Codable {
    case queued
    case generating
    case assembling
    case ready
    case failed
}

struct GenerationJob: Identifiable, Codable {
    let id: String
    let cardId: String
    let creatureId: String
    let outfitId: String
    let buddyId: String
    var status: GenerationStatus
    let createdAt: Date
    var updatedAt: Date
    var errorMessage: String?
    
    var recipe: CreatureRecipe {
        CreatureRecipe(creatureId: creatureId, outfitId: outfitId, buddyId: buddyId)
    }
}

struct ConcurrencyInfo: Codable {
    let scope: String
    let activeLimit: Int
    let queuedLimit: Int
}

struct CreatureRecipe: Codable, Hashable {
    let creatureId: String
    let outfitId: String
    let buddyId: String
}

// MARK: - Creature Card

struct CreatureCard: Identifiable, Codable {
    let id: String
    let generationId: String
    let recipe: CreatureRecipe
    let name: String
    let personality: String
    let powerName: String?
    let imageURL: String
    let createdAt: Date
    var isFavorite: Bool
    var isRevealed: Bool
    
    var creatureId: String { recipe.creatureId }
    var outfitId: String { recipe.outfitId }
    var buddyId: String { recipe.buddyId }
}

// MARK: - Game State (Server Response)

struct CreatureBuilderState: Codable {
    let catalogVersion: String?
    let active: [GenerationJob]
    let queued: [GenerationJob]
    let failed: [GenerationJob]?
    let readyToReveal: [CreatureCard]
    let collection: [CreatureCard]
    let concurrency: ConcurrencyInfo?
    
    var allJobs: [GenerationJob] {
        active + queued
    }
    
    var failedJobs: [GenerationJob] {
        failed ?? []
    }
    
    var readyCount: Int {
        readyToReveal.count
    }
    
    var isGenerating: Bool {
        !active.isEmpty
    }
    
    var shouldPoll: Bool {
        !active.isEmpty || !queued.isEmpty
    }
}

// MARK: - API Request/Response

struct CreateCreatureRequest: Codable {
    let creatureId: String
    let outfitId: String
    let buddyId: String
    let requestId: String?
}

struct CreateCreatureResponse: Codable {
    let generationId: String
    let cardId: String
    let status: GenerationStatus
}

struct RevealCardResponse: Codable {
    let card: CreatureCard
}

struct FavoriteCardResponse: Codable {
    let success: Bool?
    let favorite: Bool
}

struct ServerError: Codable {
    let error: String
    let code: String
}

// MARK: - Initial Content

struct CreatureBuilderContent {
    static let creatures: [CreatureIngredient] = [
        CreatureIngredient(id: "abbie", type: .creature, name: "Abbie", icon: nil, iconEmoji: "👧", promptDefinition: "a cheerful young girl with bright curious eyes", powerConcept: nil, personality: nil),
        CreatureIngredient(id: "dragon", type: .creature, name: "Dragon", icon: nil, iconEmoji: "🐉", promptDefinition: "a powerful but friendly dragon with expressive eyes", powerConcept: nil, personality: nil),
        CreatureIngredient(id: "robot", type: .creature, name: "Robot", icon: nil, iconEmoji: "🤖", promptDefinition: "a cute robot with glowing eyes and friendly demeanor", powerConcept: nil, personality: nil),
        CreatureIngredient(id: "bunny", type: .creature, name: "Bunny", icon: nil, iconEmoji: "🐰", promptDefinition: "an adorable bunny with soft fur and big ears", powerConcept: nil, personality: nil),
        CreatureIngredient(id: "cat", type: .creature, name: "Cat", icon: nil, iconEmoji: "🐱", promptDefinition: "a playful cat with bright eyes and fluffy tail", powerConcept: nil, personality: nil),
        CreatureIngredient(id: "dinosaur", type: .creature, name: "Dinosaur", icon: nil, iconEmoji: "🦖", promptDefinition: "a friendly dinosaur with a big smile", powerConcept: nil, personality: nil),
        CreatureIngredient(id: "alien", type: .creature, name: "Alien", icon: nil, iconEmoji: "👽", promptDefinition: "a cute alien with big eyes and antennae", powerConcept: nil, personality: nil),
        CreatureIngredient(id: "monster", type: .creature, name: "Monster", icon: nil, iconEmoji: "👾", promptDefinition: "a silly friendly monster with a goofy grin", powerConcept: nil, personality: nil)
    ]
    
    static let outfits: [CreatureIngredient] = [
        CreatureIngredient(id: "lightning-racer", type: .outfit, name: "Lightning Racer", icon: nil, iconEmoji: "⚡", promptDefinition: "wearing a sleek racing uniform crackling with electricity", powerConcept: "extreme speed and electrical energy", personality: nil),
        CreatureIngredient(id: "astronaut", type: .outfit, name: "Astronaut", icon: nil, iconEmoji: "🚀", promptDefinition: "wearing a space suit with helmet and cosmic gear", powerConcept: "space exploration and zero gravity", personality: nil),
        CreatureIngredient(id: "ninja", type: .outfit, name: "Ninja", icon: nil, iconEmoji: "🥷", promptDefinition: "wearing stealthy ninja outfit with mask", powerConcept: "stealth, agility, and shadow powers", personality: nil),
        CreatureIngredient(id: "wizard", type: .outfit, name: "Wizard", icon: nil, iconEmoji: "🧙", promptDefinition: "wearing a magical robe with wizard hat and staff", powerConcept: "magic spells and mystical powers", personality: nil),
        CreatureIngredient(id: "knight", type: .outfit, name: "Knight", icon: nil, iconEmoji: "⚔️", promptDefinition: "wearing shining armor with sword and shield", powerConcept: "bravery, protection, and honor", personality: nil),
        CreatureIngredient(id: "firefighter", type: .outfit, name: "Firefighter", icon: nil, iconEmoji: "🚒", promptDefinition: "wearing firefighter gear with helmet and coat", powerConcept: "fire resistance and rescue abilities", personality: nil),
        CreatureIngredient(id: "superhero", type: .outfit, name: "Superhero", icon: nil, iconEmoji: "🦸", promptDefinition: "wearing a colorful superhero costume with cape", powerConcept: "super strength and flying", personality: nil),
        CreatureIngredient(id: "pirate", type: .outfit, name: "Pirate", icon: nil, iconEmoji: "🏴‍☠️", promptDefinition: "wearing pirate outfit with hat and eyepatch", powerConcept: "treasure hunting and sea adventures", personality: nil)
    ]
    
    static let buddies: [CreatureIngredient] = [
        CreatureIngredient(id: "bat", type: .buddy, name: "Bat", icon: nil, iconEmoji: "🦇", promptDefinition: "with a tiny bat companion", powerConcept: nil, personality: ["spooky", "mischievous", "gothic", "nocturnal"]),
        CreatureIngredient(id: "cheetah", type: .buddy, name: "Cheetah", icon: nil, iconEmoji: "🐆", promptDefinition: "with a small cheetah cub companion", powerConcept: nil, personality: ["fast", "competitive", "energetic", "athletic", "confident"]),
        CreatureIngredient(id: "puppy", type: .buddy, name: "Puppy", icon: nil, iconEmoji: "🐕", promptDefinition: "with an adorable puppy companion", powerConcept: nil, personality: ["happy", "loyal", "playful", "friendly"]),
        CreatureIngredient(id: "owl", type: .buddy, name: "Owl", icon: nil, iconEmoji: "🦉", promptDefinition: "with a wise owl companion", powerConcept: nil, personality: ["clever", "mysterious", "calm", "magical"]),
        CreatureIngredient(id: "unicorn", type: .buddy, name: "Unicorn", icon: nil, iconEmoji: "🦄", promptDefinition: "with a magical unicorn companion", powerConcept: nil, personality: ["magical", "graceful", "pure", "dreamy"]),
        CreatureIngredient(id: "peacock", type: .buddy, name: "Peacock", icon: nil, iconEmoji: "🦚", promptDefinition: "with a colorful peacock companion", powerConcept: nil, personality: ["dramatic", "proud", "colorful", "glamorous"]),
        CreatureIngredient(id: "frog", type: .buddy, name: "Frog", icon: nil, iconEmoji: "🐸", promptDefinition: "with a cheerful frog companion", powerConcept: nil, personality: ["bouncy", "silly", "nature-loving", "adventurous"]),
        CreatureIngredient(id: "fox", type: .buddy, name: "Fox", icon: nil, iconEmoji: "🦊", promptDefinition: "with a clever fox companion", powerConcept: nil, personality: ["clever", "cunning", "curious", "playful"])
    ]
    
    static func creature(for id: String) -> CreatureIngredient? {
        creatures.first { $0.id == id }
    }
    
    static func outfit(for id: String) -> CreatureIngredient? {
        outfits.first { $0.id == id }
    }
    
    static func buddy(for id: String) -> CreatureIngredient? {
        buddies.first { $0.id == id }
    }
}
