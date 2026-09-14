//
//  IngredientModels.swift
//  abbies.world.ios
//
//  Data models for ingredients in Abbie's World card creation system.
//

import Foundation

struct IngredientDefinition: Codable, Identifiable {
    let id: String
    let name: String
    let category: IngredientCategory
    let assetId: String
    let thumbnailAsset: String?
    let description: String?
    let styleInjection: String
    let rarity: CardRarity
    let tags: [String]?
    
    var displayDescription: String {
        description ?? name
    }
}

struct IngredientCatalog: Codable {
    let version: Int
    let lastUpdated: Date
    var creatures: [IngredientDefinition]
    var functions: [IngredientDefinition]
    var contexts: [IngredientDefinition]
    
    var allIngredients: [IngredientDefinition] {
        creatures + functions + contexts
    }
    
    func ingredient(byId id: String) -> IngredientDefinition? {
        allIngredients.first { $0.id == id }
    }
    
    func ingredients(for category: IngredientCategory) -> [IngredientDefinition] {
        switch category {
        case .creature: return creatures
        case .function: return functions
        case .context: return contexts
        }
    }
    
    static var empty: IngredientCatalog {
        IngredientCatalog(version: 0, lastUpdated: Date(), creatures: [], functions: [], contexts: [])
    }
    
    static var sampleCatalog: IngredientCatalog {
        IngredientCatalog(
            version: 1,
            lastUpdated: Date(),
            creatures: [
                IngredientDefinition(id: "creature.cat", name: "Cat", category: .creature, assetId: "ingredient.creature.cat", thumbnailAsset: nil, description: "A curious feline friend", styleInjection: "a playful cartoon cat", rarity: .common, tags: ["pet", "furry"]),
                IngredientDefinition(id: "creature.dragon", name: "Dragon", category: .creature, assetId: "ingredient.creature.dragon", thumbnailAsset: nil, description: "A friendly baby dragon", styleInjection: "a cute baby dragon", rarity: .rare, tags: ["mythical", "scaly"]),
                IngredientDefinition(id: "creature.robot", name: "Robot", category: .creature, assetId: "ingredient.creature.robot", thumbnailAsset: nil, description: "A helpful robot buddy", styleInjection: "a friendly robot companion", rarity: .uncommon, tags: ["tech", "metal"]),
                IngredientDefinition(id: "creature.octopus", name: "Octopus", category: .creature, assetId: "ingredient.creature.octopus", thumbnailAsset: nil, description: "A clever eight-armed friend", styleInjection: "a whimsical cartoon octopus", rarity: .uncommon, tags: ["ocean", "tentacles"]),
                IngredientDefinition(id: "creature.bat", name: "Bat", category: .creature, assetId: "ingredient.creature.bat", thumbnailAsset: nil, description: "A night-flying friend", styleInjection: "a cute fruit bat", rarity: .common, tags: ["flying", "nocturnal"]),
                IngredientDefinition(id: "creature.cheetah", name: "Cheetah", category: .creature, assetId: "ingredient.creature.cheetah", thumbnailAsset: nil, description: "The fastest friend", styleInjection: "a speedy cartoon cheetah", rarity: .rare, tags: ["fast", "spotted"])
            ],
            functions: [
                IngredientDefinition(id: "function.astronaut", name: "Astronaut", category: .function, assetId: "ingredient.function.astronaut", thumbnailAsset: nil, description: "Space explorer gear", styleInjection: "wearing an astronaut space suit", rarity: .rare, tags: ["space", "exploration"]),
                IngredientDefinition(id: "function.wizard", name: "Wizard", category: .function, assetId: "ingredient.function.wizard", thumbnailAsset: nil, description: "Magical robes and hat", styleInjection: "dressed as a wizard with a magical wand", rarity: .uncommon, tags: ["magic", "fantasy"]),
                IngredientDefinition(id: "function.superhero", name: "Superhero", category: .function, assetId: "ingredient.function.superhero", thumbnailAsset: nil, description: "Cape and mask", styleInjection: "wearing a superhero costume with cape", rarity: .uncommon, tags: ["hero", "powerful"]),
                IngredientDefinition(id: "function.chef", name: "Chef", category: .function, assetId: "ingredient.function.chef", thumbnailAsset: nil, description: "Chef's hat and apron", styleInjection: "dressed as a chef with a tall hat", rarity: .common, tags: ["cooking", "food"]),
                IngredientDefinition(id: "function.racer", name: "Racer", category: .function, assetId: "ingredient.function.racer", thumbnailAsset: nil, description: "Racing suit and helmet", styleInjection: "wearing a colorful racing suit", rarity: .common, tags: ["speed", "competition"]),
                IngredientDefinition(id: "function.ninja", name: "Ninja", category: .function, assetId: "ingredient.function.ninja", thumbnailAsset: nil, description: "Stealthy ninja outfit", styleInjection: "dressed as a sneaky ninja", rarity: .rare, tags: ["stealth", "martial"])
            ],
            contexts: [
                IngredientDefinition(id: "context.space", name: "Outer Space", category: .context, assetId: "ingredient.context.space", thumbnailAsset: nil, description: "Among the stars", styleInjection: "floating in outer space with stars and planets", rarity: .rare, tags: ["cosmic", "vast"]),
                IngredientDefinition(id: "context.underwater", name: "Underwater", category: .context, assetId: "ingredient.context.underwater", thumbnailAsset: nil, description: "Deep in the ocean", styleInjection: "swimming underwater with colorful coral and fish", rarity: .uncommon, tags: ["ocean", "aquatic"]),
                IngredientDefinition(id: "context.jungle", name: "Jungle", category: .context, assetId: "ingredient.context.jungle", thumbnailAsset: nil, description: "Wild tropical forest", styleInjection: "in a lush green jungle with vines and exotic plants", rarity: .common, tags: ["tropical", "wild"]),
                IngredientDefinition(id: "context.volcano", name: "Volcano", category: .context, assetId: "ingredient.context.volcano", thumbnailAsset: nil, description: "Near a fiery volcano", styleInjection: "on a volcanic island with glowing lava", rarity: .rare, tags: ["fire", "dramatic"]),
                IngredientDefinition(id: "context.castle", name: "Castle", category: .context, assetId: "ingredient.context.castle", thumbnailAsset: nil, description: "In a magical castle", styleInjection: "inside a grand fairytale castle", rarity: .uncommon, tags: ["royal", "medieval"]),
                IngredientDefinition(id: "context.candyworld", name: "Candy World", category: .context, assetId: "ingredient.context.candyworld", thumbnailAsset: nil, description: "A land made of sweets", styleInjection: "in a whimsical candy land with lollipops and gumdrops", rarity: .epic, tags: ["sweet", "colorful"])
            ]
        )
    }
}
