//
//  MemoryGameModels.swift
//  abbies.world.ios
//
//  Created for Memory/Concentration Minigame using user-generated images
//

import Foundation
import UIKit
import Combine

// MARK: - Card State

enum CardState {
    case hidden      // Card is face down
    case revealed    // Card is face up (temporarily shown)
    case matched     // Card has been matched with its pair
}

// MARK: - Memory Card

struct MemoryCard: Identifiable {
    let id: UUID
    let imageURL: String
    let imageFilename: String
    var state: CardState
    var image: UIImage?  // Loaded image
    
    init(imageURL: String, imageFilename: String) {
        self.id = UUID()
        self.imageURL = imageURL
        self.imageFilename = imageFilename
        self.state = .hidden
        self.image = nil
    }
}

// MARK: - Game Difficulty

enum GameDifficulty: String, CaseIterable {
    case easy = "Easy"      // 4 pairs (8 cards) - 2x4 grid
    case medium = "Medium"  // 6 pairs (12 cards) - 3x4 grid
    case hard = "Hard"      // 8 pairs (16 cards) - 4x4 grid
    
    var pairCount: Int {
        switch self {
        case .easy: return 4
        case .medium: return 6
        case .hard: return 8
        }
    }
    
    var gridColumns: Int {
        switch self {
        case .easy: return 2
        case .medium: return 3
        case .hard: return 4
        }
    }
}

// MARK: - Game State

class MemoryGameState: ObservableObject {
    @Published var cards: [MemoryCard] = []
    @Published var flippedCards: [UUID] = []  // Currently revealed cards (max 2)
    @Published var matchedPairs: Int = 0
    @Published var totalPairs: Int = 0
    @Published var moves: Int = 0
    @Published var gameComplete: Bool = false
    @Published var difficulty: GameDifficulty = .medium
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var canFlip: Bool = true  // Prevents flipping during animation
    
    // Computed properties
    var allCardsMatched: Bool {
        matchedPairs >= totalPairs && totalPairs > 0
    }
    
    var score: Int {
        // Score based on moves (fewer moves = higher score)
        guard totalPairs > 0 else { return 0 }
        let perfectScore = totalPairs * 2  // Perfect game: 2 moves per pair
        let maxScore = 1000
        let score = max(0, maxScore - (moves - perfectScore) * 10)
        return max(0, score)
    }
}
