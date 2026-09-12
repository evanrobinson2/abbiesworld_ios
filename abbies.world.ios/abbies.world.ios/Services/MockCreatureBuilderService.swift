//
//  MockCreatureBuilderService.swift
//  abbies.world.ios
//
//  Mock server for testing Creature Card Builder without real server.
//  Simulates the full generation flow with realistic delays.
//

import Foundation
import SwiftUI

class MockCreatureBuilderService {
    static let shared = MockCreatureBuilderService()
    
    private var jobs: [String: GenerationJob] = [:]
    private var cards: [String: CreatureCard] = [:]
    private let generationTime: TimeInterval = 5.0
    
    // MARK: - Create Generation
    
    func createGeneration(creatureId: String, outfitId: String, buddyId: String) async -> CreateCreatureResponse {
        let generationId = "gen_\(UUID().uuidString.prefix(8))"
        let cardId = "card_\(UUID().uuidString.prefix(8))"
        
        let job = GenerationJob(
            id: generationId,
            cardId: cardId,
            creatureId: creatureId,
            outfitId: outfitId,
            buddyId: buddyId,
            status: .queued,
            createdAt: Date(),
            updatedAt: Date()
        )
        
        jobs[generationId] = job
        
        Task {
            await simulateGeneration(generationId: generationId, cardId: cardId, creatureId: creatureId, outfitId: outfitId, buddyId: buddyId)
        }
        
        return CreateCreatureResponse(
            generationId: generationId,
            cardId: cardId,
            status: .queued
        )
    }
    
    // MARK: - Get State
    
    func getState() -> CreatureBuilderState {
        let active = jobs.values.filter { $0.status == .generating || $0.status == .assembling }
        let queued = jobs.values.filter { $0.status == .queued }
        let failed = jobs.values.filter { $0.status == .failed }
        let ready = cards.values.filter { !$0.isRevealed }
        let collection = cards.values.filter { $0.isRevealed }
        
        return CreatureBuilderState(
            catalogVersion: "mock-v1",
            active: Array(active),
            queued: Array(queued),
            failed: Array(failed),
            readyToReveal: Array(ready).sorted { $0.createdAt > $1.createdAt },
            collection: Array(collection).sorted { $0.createdAt > $1.createdAt },
            concurrency: ConcurrencyInfo(scope: "mock", activeLimit: 3, queuedLimit: 20)
        )
    }
    
    // MARK: - Reveal Card
    
    func revealCard(cardId: String) -> CreatureCard? {
        guard var card = cards[cardId] else { return nil }
        card.isRevealed = true
        cards[cardId] = card
        return card
    }
    
    // MARK: - Favorite
    
    func setFavorite(cardId: String, isFavorite: Bool) {
        guard var card = cards[cardId] else { return }
        card.isFavorite = isFavorite
        cards[cardId] = card
    }
    
    // MARK: - Simulate Generation
    
    private func simulateGeneration(generationId: String, cardId: String, creatureId: String, outfitId: String, buddyId: String) async {
        try? await Task.sleep(nanoseconds: 500_000_000)
        
        if var job = jobs[generationId] {
            job.status = .generating
            job.updatedAt = Date()
            jobs[generationId] = job
        }
        
        try? await Task.sleep(nanoseconds: UInt64(generationTime * 1_000_000_000))
        
        if var job = jobs[generationId] {
            job.status = .assembling
            job.updatedAt = Date()
            jobs[generationId] = job
        }
        
        try? await Task.sleep(nanoseconds: 500_000_000)
        
        let name = generateCreatureName(creatureId: creatureId, outfitId: outfitId, buddyId: buddyId)
        let personality = generatePersonality(buddyId: buddyId)
        let power = generatePower(outfitId: outfitId)
        
        let card = CreatureCard(
            id: cardId,
            generationId: generationId,
            recipe: CreatureRecipe(creatureId: creatureId, outfitId: outfitId, buddyId: buddyId),
            name: name,
            personality: personality,
            powerName: power,
            imageURL: generateMockImageURL(creatureId: creatureId, outfitId: outfitId, buddyId: buddyId),
            createdAt: Date(),
            isFavorite: false,
            isRevealed: false
        )
        
        cards[cardId] = card
        
        if var job = jobs[generationId] {
            job.status = .ready
            job.updatedAt = Date()
            jobs[generationId] = job
        }
        
        jobs.removeValue(forKey: generationId)
    }
    
    // MARK: - Name Generation
    
    private func generateCreatureName(creatureId: String, outfitId: String, buddyId: String) -> String {
        let prefixes: [String: [String]] = [
            "bat": ["Night", "Shadow", "Dark", "Midnight"],
            "cheetah": ["Swift", "Flash", "Rapid", "Comet"],
            "puppy": ["Happy", "Sunny", "Jolly", "Bright"],
            "owl": ["Wise", "Mystic", "Ancient", "Sage"],
            "unicorn": ["Sparkle", "Dream", "Magic", "Star"],
            "peacock": ["Dazzle", "Glitter", "Radiant", "Shimmer"],
            "frog": ["Bouncy", "Hoppy", "Spring", "Leap"],
            "fox": ["Clever", "Sly", "Tricky", "Quick"]
        ]
        
        let suffixes: [String: [String]] = [
            "lightning-racer": ["Bolt", "Racer", "Streak", "Flash"],
            "astronaut": ["Star", "Nova", "Comet", "Galaxy"],
            "ninja": ["Shadow", "Strike", "Blade", "Stealth"],
            "wizard": ["Spell", "Magic", "Mystic", "Arcane"],
            "knight": ["Shield", "Valor", "Guard", "Champion"],
            "firefighter": ["Blaze", "Flame", "Rescue", "Hero"],
            "superhero": ["Power", "Force", "Mighty", "Ultra"],
            "pirate": ["Wave", "Treasure", "Sail", "Storm"]
        ]
        
        let creatureNames: [String: String] = [
            "abbie": "Abbie",
            "dragon": "Dragon",
            "robot": "Bot",
            "bunny": "Bunny",
            "cat": "Cat",
            "dinosaur": "Rex",
            "alien": "Zyx",
            "monster": "Monster"
        ]
        
        let prefix = prefixes[buddyId]?.randomElement() ?? "Super"
        let suffix = suffixes[outfitId]?.randomElement() ?? "Star"
        let creature = creatureNames[creatureId] ?? "Creature"
        
        return "\(prefix)\(suffix) \(creature)"
    }
    
    private func generatePersonality(buddyId: String) -> String {
        let personalities: [String: [String]] = [
            "bat": [
                "Mischievous, fearless, and happiest after dark.",
                "Mysterious and playful, with a love for moonlit adventures.",
                "Spooky but sweet, always up for a nighttime quest."
            ],
            "cheetah": [
                "Fast, competitive, and always ready to race!",
                "Energetic and athletic, never sits still for long.",
                "Quick and confident, loves to be number one."
            ],
            "puppy": [
                "Happy, loyal, and loves to play!",
                "Friendly and playful, everyone's best friend.",
                "Cheerful and bouncy, always wagging with joy."
            ],
            "owl": [
                "Wise and calm, full of magical knowledge.",
                "Clever and mysterious, sees everything clearly.",
                "Thoughtful and patient, always has good advice."
            ],
            "unicorn": [
                "Magical and graceful, leaves sparkles everywhere.",
                "Dreamy and pure, believes in the impossible.",
                "Enchanted and kind, spreads joy wherever they go."
            ],
            "peacock": [
                "Dramatic and proud, loves to show off!",
                "Colorful and glamorous, the star of every show.",
                "Bold and beautiful, impossible to ignore."
            ],
            "frog": [
                "Bouncy and silly, loves to make everyone laugh!",
                "Adventurous and nature-loving, always exploring.",
                "Cheerful and energetic, hops into any adventure."
            ],
            "fox": [
                "Clever and curious, always finding new tricks.",
                "Cunning and playful, one step ahead of everyone.",
                "Quick-witted and charming, a true trickster at heart."
            ]
        ]
        
        return personalities[buddyId]?.randomElement() ?? "A truly unique and wonderful creature!"
    }
    
    private func generatePower(outfitId: String) -> String {
        let powers: [String: [String]] = [
            "lightning-racer": ["Thunder Speed", "Lightning Dash", "Electric Sprint", "Volt Rush"],
            "astronaut": ["Zero-G Float", "Cosmic Beam", "Star Jump", "Galaxy Glide"],
            "ninja": ["Shadow Step", "Stealth Strike", "Silent Wind", "Dark Mist"],
            "wizard": ["Magic Spark", "Mystic Wave", "Spell Burst", "Arcane Shield"],
            "knight": ["Shield Bash", "Valor Charge", "Honor Guard", "Brave Strike"],
            "firefighter": ["Flame Shield", "Rescue Rush", "Heat Wave", "Blaze Dash"],
            "superhero": ["Power Punch", "Super Leap", "Mighty Shield", "Ultra Speed"],
            "pirate": ["Wave Rider", "Treasure Sense", "Storm Call", "Sea Sprint"]
        ]
        
        return powers[outfitId]?.randomElement() ?? "Special Power"
    }
    
    private func generateMockImageURL(creatureId: String, outfitId: String, buddyId: String) -> String {
        "mock://creature/\(creatureId)_\(outfitId)_\(buddyId)"
    }
    
    // MARK: - Reset (for testing)
    
    func reset() {
        jobs.removeAll()
        cards.removeAll()
    }
}
