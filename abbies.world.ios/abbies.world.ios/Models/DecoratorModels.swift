//
//  DecoratorModels.swift
//  abbies.world.ios
//
//  Models for the Decorator Machine minigame.
//

import Foundation
import SwiftUI

// MARK: - Essence Categories

enum EssenceCategory: String, Codable, CaseIterable {
    case feelings = "Feelings"
    case critters = "Critters"
    case weather = "Weather & Sky"
    case flavors = "Flavors & Textures"
    case wildCards = "Wild Cards"
    
    var symbol: String {
        switch self {
        case .feelings: return "heart.fill"
        case .critters: return "pawprint.fill"
        case .weather: return "cloud.sun.fill"
        case .flavors: return "birthday.cake.fill"
        case .wildCards: return "sparkles"
        }
    }
    
    var tint: Color {
        switch self {
        case .feelings: return .pink
        case .critters: return .orange
        case .weather: return .cyan
        case .flavors: return .purple
        case .wildCards: return .yellow
        }
    }
}

// MARK: - Decorator Essence

struct DecoratorEssence: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let category: EssenceCategory
    let flavorText: String
    let promptTags: [String]
    let imageName: String?
    let emoji: String
    
    var artworkName: String {
        imageName ?? "essence_default"
    }
}

// MARK: - Decoration (Output)

struct Decoration: Codable, Identifiable {
    let id: String
    let generationId: String
    let recipe: DecoratorRecipe
    let name: String
    let description: String
    let imageURL: String
    let promptUsed: String
    let createdAt: Date
    var isRevealed: Bool
    var isFavorite: Bool
    
    var recipeEssenceIds: [String] {
        recipe.essenceIds
    }
}

// MARK: - Decorator Recipe

struct DecoratorRecipe: Codable, Hashable {
    let essenceIds: [String]
    
    var count: Int {
        essenceIds.count
    }
}

// MARK: - Decorator Job

struct DecoratorJob: Codable, Identifiable {
    let id: String
    let decorationId: String?
    let recipe: DecoratorRecipe
    let status: DecoratorJobStatus
    let createdAt: Date
    let updatedAt: Date
    let errorMessage: String?
    
    var essenceIds: [String] {
        recipe.essenceIds
    }
}

enum DecoratorJobStatus: String, Codable {
    case queued
    case composingPrompt = "composing_prompt"
    case generating
    case complete
    case failed
}

// MARK: - Decorator State

struct DecoratorState: Codable {
    let active: [DecoratorJob]
    let queued: [DecoratorJob]
    let failedJobs: [DecoratorJob]
    let readyToReveal: [Decoration]
    let inventory: [Decoration]
    
    var shouldPoll: Bool {
        !active.isEmpty || !queued.isEmpty
    }
}

// MARK: - API Models

struct CreateDecorationRequest: Codable {
    let essenceIds: [String]
    let requestId: String
}

struct CreateDecorationResponse: Codable {
    let generationId: String
    let decorationId: String?
    let status: DecoratorJobStatus
}

// MARK: - Essence Content Catalog

struct DecoratorEssenceContent {
    
    // MARK: - Feelings
    
    static let feelings: [DecoratorEssence] = [
        DecoratorEssence(
            id: "cozy_nap_energy",
            name: "Cozy Nap Energy",
            category: .feelings,
            flavorText: "The feeling of sinking into a cloud",
            promptTags: ["cozy", "sleepy", "soft", "comfortable", "dreamy"],
            imageName: "essence_cozy_nap",
            emoji: "😴"
        ),
        DecoratorEssence(
            id: "giggle_fizz",
            name: "Giggle Fizz",
            category: .feelings,
            flavorText: "Bubbles of pure joy",
            promptTags: ["playful", "bubbly", "cheerful", "whimsical", "bouncy"],
            imageName: "essence_giggle_fizz",
            emoji: "🤭"
        ),
        DecoratorEssence(
            id: "warm_hug_aura",
            name: "Warm Hug Aura",
            category: .feelings,
            flavorText: "Like being wrapped in sunshine",
            promptTags: ["warm", "comforting", "embracing", "gentle", "loving"],
            imageName: "essence_warm_hug",
            emoji: "🤗"
        ),
        DecoratorEssence(
            id: "mischief_sparkle",
            name: "Mischief Sparkle",
            category: .feelings,
            flavorText: "That twinkle before something fun happens",
            promptTags: ["mischievous", "playful", "sparkling", "sneaky", "fun"],
            imageName: "essence_mischief",
            emoji: "😈"
        ),
        DecoratorEssence(
            id: "sleepy_mumbles",
            name: "Sleepy Mumbles",
            category: .feelings,
            flavorText: "Half-awake happy thoughts",
            promptTags: ["drowsy", "peaceful", "murmuring", "gentle", "relaxed"],
            imageName: "essence_sleepy_mumbles",
            emoji: "💤"
        ),
    ]
    
    // MARK: - Critters
    
    static let critters: [DecoratorEssence] = [
        DecoratorEssence(
            id: "cat_whisker",
            name: "Cat Whisker",
            category: .critters,
            flavorText: "Curious and a little bit sassy",
            promptTags: ["cat-like", "curious", "elegant", "whiskers", "feline"],
            imageName: "essence_cat_whisker",
            emoji: "🐱"
        ),
        DecoratorEssence(
            id: "bunny_bounce",
            name: "Bunny Bounce",
            category: .critters,
            flavorText: "Hop hop hop with joy",
            promptTags: ["bouncy", "fluffy", "rabbit", "hoppy", "soft ears"],
            imageName: "essence_bunny_bounce",
            emoji: "🐰"
        ),
        DecoratorEssence(
            id: "owl_wisdom",
            name: "Owl Wisdom",
            category: .critters,
            flavorText: "Knows things you haven't thought of yet",
            promptTags: ["wise", "nocturnal", "owl-like", "mysterious", "knowing"],
            imageName: "essence_owl_wisdom",
            emoji: "🦉"
        ),
        DecoratorEssence(
            id: "frog_song",
            name: "Frog Song",
            category: .critters,
            flavorText: "Ribbit ribbit! Pond party vibes",
            promptTags: ["amphibian", "green", "lily pad", "pond", "croaking"],
            imageName: "essence_frog_song",
            emoji: "🐸"
        ),
        DecoratorEssence(
            id: "penguin_waddle",
            name: "Penguin Waddle",
            category: .critters,
            flavorText: "Fancy and a little clumsy",
            promptTags: ["penguin", "tuxedo", "waddling", "arctic", "dapper"],
            imageName: "essence_penguin_waddle",
            emoji: "🐧"
        ),
    ]
    
    // MARK: - Weather & Sky
    
    static let weather: [DecoratorEssence] = [
        DecoratorEssence(
            id: "moonbeam",
            name: "Moonbeam",
            category: .weather,
            flavorText: "Silver light from a sleepy sky",
            promptTags: ["lunar", "silver", "glowing", "nighttime", "ethereal"],
            imageName: "essence_moonbeam",
            emoji: "🌙"
        ),
        DecoratorEssence(
            id: "thundersnuggle",
            name: "Thundersnuggle",
            category: .weather,
            flavorText: "Cozy inside while it storms outside",
            promptTags: ["stormy", "cozy", "thunder", "rain", "snuggly"],
            imageName: "essence_thundersnuggle",
            emoji: "⛈️"
        ),
        DecoratorEssence(
            id: "rainbow_hiccup",
            name: "Rainbow Hiccup",
            category: .weather,
            flavorText: "Oops! Colors everywhere!",
            promptTags: ["rainbow", "colorful", "prismatic", "multicolored", "vibrant"],
            imageName: "essence_rainbow_hiccup",
            emoji: "🌈"
        ),
        DecoratorEssence(
            id: "cloud_fluff",
            name: "Cloud Fluff",
            category: .weather,
            flavorText: "Softer than soft, floatier than float",
            promptTags: ["cloud", "fluffy", "floating", "puffy", "airy"],
            imageName: "essence_cloud_fluff",
            emoji: "☁️"
        ),
        DecoratorEssence(
            id: "starlight_dust",
            name: "Starlight Dust",
            category: .weather,
            flavorText: "Sprinkled from a passing comet",
            promptTags: ["sparkly", "stellar", "twinkling", "cosmic", "glittery"],
            imageName: "essence_starlight_dust",
            emoji: "✨"
        ),
    ]
    
    // MARK: - Flavors & Textures
    
    static let flavors: [DecoratorEssence] = [
        DecoratorEssence(
            id: "bubblegum_dream",
            name: "Bubblegum Dream",
            category: .flavors,
            flavorText: "Pink and stretchy and sweet",
            promptTags: ["pink", "bubbly", "sweet", "chewy", "candy-like"],
            imageName: "essence_bubblegum_dream",
            emoji: "🍬"
        ),
        DecoratorEssence(
            id: "marshmallow_squish",
            name: "Marshmallow Squish",
            category: .flavors,
            flavorText: "Soft and squishy and huggable",
            promptTags: ["marshmallow", "squishy", "puffy", "soft", "pillowy"],
            imageName: "essence_marshmallow_squish",
            emoji: "🍡"
        ),
        DecoratorEssence(
            id: "cinnamon_swirl",
            name: "Cinnamon Swirl",
            category: .flavors,
            flavorText: "Warm and spicy and spirally",
            promptTags: ["cinnamon", "swirling", "warm", "spiced", "coiled"],
            imageName: "essence_cinnamon_swirl",
            emoji: "🌀"
        ),
        DecoratorEssence(
            id: "velvet_whisper",
            name: "Velvet Whisper",
            category: .flavors,
            flavorText: "Touch it with your eyes closed",
            promptTags: ["velvet", "luxurious", "smooth", "rich", "textured"],
            imageName: "essence_velvet_whisper",
            emoji: "🎀"
        ),
        DecoratorEssence(
            id: "crinkle_crunch",
            name: "Crinkle Crunch",
            category: .flavors,
            flavorText: "Satisfying sounds in furniture form",
            promptTags: ["textured", "crinkled", "crunchy", "layered", "crispy"],
            imageName: "essence_crinkle_crunch",
            emoji: "🥨"
        ),
    ]
    
    // MARK: - Wild Cards
    
    static let wildCards: [DecoratorEssence] = [
        DecoratorEssence(
            id: "yesterdays_wish",
            name: "Yesterday's Wish",
            category: .wildCards,
            flavorText: "A wish that's still floating around",
            promptTags: ["nostalgic", "wistful", "dreamy", "faded", "hopeful"],
            imageName: "essence_yesterdays_wish",
            emoji: "🌟"
        ),
        DecoratorEssence(
            id: "forgotten_lullaby",
            name: "Forgotten Lullaby",
            category: .wildCards,
            flavorText: "A tune you almost remember",
            promptTags: ["musical", "gentle", "mysterious", "soothing", "melodic"],
            imageName: "essence_forgotten_lullaby",
            emoji: "🎵"
        ),
        DecoratorEssence(
            id: "upside_down_tuesday",
            name: "Upside-Down Tuesday",
            category: .wildCards,
            flavorText: "When everything goes delightfully wrong",
            promptTags: ["topsy-turvy", "quirky", "unexpected", "silly", "inverted"],
            imageName: "essence_upside_down_tuesday",
            emoji: "🙃"
        ),
        DecoratorEssence(
            id: "pocket_giggles",
            name: "Pocket Full of Giggles",
            category: .wildCards,
            flavorText: "Carry laughter wherever you go",
            promptTags: ["joyful", "hidden", "surprise", "laughing", "pocketed"],
            imageName: "essence_pocket_giggles",
            emoji: "😂"
        ),
        DecoratorEssence(
            id: "dancing_shadows",
            name: "Dancing Shadows",
            category: .wildCards,
            flavorText: "Shapes that move when you're not looking",
            promptTags: ["shadowy", "dancing", "playful", "mysterious", "animated"],
            imageName: "essence_dancing_shadows",
            emoji: "👤"
        ),
    ]
    
    // MARK: - All Essences
    
    static var all: [DecoratorEssence] {
        feelings + critters + weather + flavors + wildCards
    }
    
    static func essences(for category: EssenceCategory) -> [DecoratorEssence] {
        switch category {
        case .feelings: return feelings
        case .critters: return critters
        case .weather: return weather
        case .flavors: return flavors
        case .wildCards: return wildCards
        }
    }
    
    static func essence(for id: String) -> DecoratorEssence? {
        all.first { $0.id == id }
    }
}
