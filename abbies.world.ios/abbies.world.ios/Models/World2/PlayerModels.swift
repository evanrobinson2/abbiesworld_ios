//
//  PlayerModels.swift
//  abbies.world.ios
//
//  Data models for player state in Abbie's World 2.
//

import Foundation

enum PlayerId: String, Codable, CaseIterable, Identifiable {
    case abbie = "player.abbie"
    case ani = "player.ani"
    
    var id: String { rawValue }
    
    var displayName: String {
        switch self {
        case .abbie: return "Abbie"
        case .ani: return "Ani"
        }
    }
    
    var homePoiId: String {
        switch self {
        case .abbie: return "poi.abbieTreehouse"
        case .ani: return "poi.aniTreehouse"
        }
    }
    
    var avatarAsset: String {
        switch self {
        case .abbie: return "avatar.abbie"
        case .ani: return "avatar.ani"
        }
    }
}

struct PlayerState: Codable, Identifiable {
    var id: String { playerId.rawValue }
    let playerId: PlayerId
    var name: String
    var gems: Int
    var creatureIngredients: [IngredientInstance]
    var functionIngredients: [IngredientInstance]
    var contextIngredients: [IngredientInstance]
    var cardCollection: CardCollection
    var decorations: [DecorationInstance]
    var homeLayout: HomeLayout
    var unlockedMusic: [String]
    var progression: PlayerProgression
    var settings: PlayerSettings
    var currentWorldId: WorldId
    var lastPlayedAt: Date
    
    var totalIngredientCount: Int {
        creatureIngredients.count + functionIngredients.count + contextIngredients.count
    }
    
    var activeDeckCount: Int {
        cardCollection.activeDeck.count
    }
    
    mutating func addGems(_ amount: Int) {
        gems += amount
    }
    
    mutating func spendGems(_ amount: Int) -> Bool {
        guard gems >= amount else { return false }
        gems -= amount
        return true
    }
    
    mutating func addIngredient(_ ingredient: IngredientInstance) {
        switch ingredient.category {
        case .creature:
            creatureIngredients.append(ingredient)
        case .function:
            functionIngredients.append(ingredient)
        case .context:
            contextIngredients.append(ingredient)
        }
    }
    
    func hasIngredient(id: String, category: IngredientCategory) -> Bool {
        switch category {
        case .creature:
            return creatureIngredients.contains { $0.ingredientId == id }
        case .function:
            return functionIngredients.contains { $0.ingredientId == id }
        case .context:
            return contextIngredients.contains { $0.ingredientId == id }
        }
    }
    
    static func newPlayer(id: PlayerId) -> PlayerState {
        PlayerState(
            playerId: id,
            name: id.displayName,
            gems: 5,
            creatureIngredients: [],
            functionIngredients: [],
            contextIngredients: [],
            cardCollection: CardCollection(playerId: id.rawValue, cards: [], activeDeck: []),
            decorations: [DecorationInstance.starterJukebox(for: id)],
            homeLayout: HomeLayout.default(for: id),
            unlockedMusic: ["music.home.light", "music.home.intense"],
            progression: PlayerProgression(),
            settings: PlayerSettings(),
            currentWorldId: .home,
            lastPlayedAt: Date()
        )
    }
}

struct IngredientInstance: Codable, Identifiable {
    let id: String
    let ingredientId: String
    let category: IngredientCategory
    let acquiredAt: Date
    let source: String?
    var used: Bool
    
    init(id: String? = nil, ingredientId: String, category: IngredientCategory, source: String? = nil) {
        self.id = id ?? UUID().uuidString
        self.ingredientId = ingredientId
        self.category = category
        self.acquiredAt = Date()
        self.source = source
        self.used = false
    }
}

enum IngredientCategory: String, Codable, CaseIterable {
    case creature
    case function
    case context
    
    var displayName: String {
        switch self {
        case .creature: return "Creature"
        case .function: return "Power/Costume"
        case .context: return "Place"
        }
    }
    
    var iconName: String {
        switch self {
        case .creature: return "pawprint.fill"
        case .function: return "bolt.fill"
        case .context: return "globe"
        }
    }
}

struct PlayerProgression: Codable {
    var completedPOIs: [String]
    var unlockedWorlds: [WorldId]
    var achievedMilestones: [String]
    var totalCardsCreated: Int
    var totalCardsSold: Int
    var totalGemsEarned: Int
    var totalMinigamesCompleted: Int
    
    init() {
        self.completedPOIs = []
        self.unlockedWorlds = [.home, .farm]  // Farm unlocked by default for core loop
        self.achievedMilestones = []
        self.totalCardsCreated = 0
        self.totalCardsSold = 0
        self.totalGemsEarned = 0
        self.totalMinigamesCompleted = 0
    }
}

struct PlayerSettings: Codable {
    var musicVolume: Double
    var sfxVolume: Double
    var hapticFeedbackEnabled: Bool
    var showTutorials: Bool
    
    init() {
        self.musicVolume = 0.7
        self.sfxVolume = 0.8
        self.hapticFeedbackEnabled = true
        self.showTutorials = true
    }
}
