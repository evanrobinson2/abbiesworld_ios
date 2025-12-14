//
//  MemoryGameViewModel.swift
//  abbies.world.ios
//
//  Created for Memory/Concentration Minigame
//

import Foundation
import SwiftUI
import Combine

class MemoryGameViewModel: ObservableObject {
    @Published var gameState = MemoryGameState()
    
    private let apiClient = APIClient.shared
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init() {
        // Default difficulty is already set in gameState
    }
    
    // MARK: - Game Setup
    
    func startNewGame(difficulty: GameDifficulty) async {
        await MainActor.run {
            gameState.difficulty = difficulty
            gameState.isLoading = true
            gameState.errorMessage = nil
            gameState.gameComplete = false
            gameState.matchedPairs = 0
            gameState.moves = 0
            gameState.flippedCards = []
        }
        
        // Load user-generated images
        await loadUserImages()
    }
    
    private func loadUserImages() async {
        print("🎮 MemoryGame: Loading user-generated images...")
        
        do {
            let images = try await apiClient.getGeneratedImages().async()
            
            // Filter out deleted images
            let availableImages = images.filter { $0.deleted != true }
            
            guard !availableImages.isEmpty else {
                await MainActor.run {
                    gameState.isLoading = false
                    gameState.errorMessage = "No images found! Create some images first to play the memory game."
                }
                return
            }
            
            // Check if we have enough images for the selected difficulty
            let requiredCount = gameState.difficulty.pairCount
            guard availableImages.count >= requiredCount else {
                await MainActor.run {
                    gameState.isLoading = false
                    gameState.errorMessage = "You need at least \(requiredCount) images to play on \(gameState.difficulty.rawValue) difficulty. You have \(availableImages.count) image(s)."
                }
                return
            }
            
            // Select random images for the game
            let selectedImages = Array(availableImages.shuffled().prefix(requiredCount))
            
            // Build full URLs for images
            let baseURL = apiClient.baseURL
            var cards: [MemoryCard] = []
            
            for image in selectedImages {
                let fullURL: String
                if image.url.hasPrefix("http") {
                    fullURL = image.url
                } else if image.url.hasPrefix("/") {
                    fullURL = "\(baseURL)\(image.url)"
                } else {
                    fullURL = "\(baseURL)/\(image.url)"
                }
                
                // Create a pair of cards for each image
                let card1 = MemoryCard(imageURL: fullURL, imageFilename: image.filename)
                let card2 = MemoryCard(imageURL: fullURL, imageFilename: image.filename)
                cards.append(card1)
                cards.append(card2)
            }
            
            // Shuffle the cards
            cards.shuffle()
            
            // Load images asynchronously
            await loadCardImages(cards: &cards)
            
            await MainActor.run {
                gameState.cards = cards
                gameState.totalPairs = requiredCount
                gameState.isLoading = false
                print("✅ MemoryGame: Game setup complete with \(requiredCount) pairs")
            }
            
        } catch {
            await MainActor.run {
                gameState.isLoading = false
                gameState.errorMessage = "Failed to load images: \(error.localizedDescription)"
                print("❌ MemoryGame: Error loading images: \(error)")
            }
        }
    }
    
    private func loadCardImages(cards: inout [MemoryCard]) async {
        print("🖼️ MemoryGame: Loading \(cards.count) card images...")
        
        // Load unique images (each image URL appears twice, so we only need to load once per URL)
        var imageCache: [String: UIImage] = [:]
        let uniqueURLs = Set(cards.map { $0.imageURL })
        
        for urlString in uniqueURLs {
            guard let url = URL(string: urlString) else {
                print("⚠️ MemoryGame: Invalid URL: \(urlString)")
                continue
            }
            
            do {
                if let image = try await ImageCache.shared.loadImage(from: url) {
                    imageCache[urlString] = image
                    print("✅ MemoryGame: Loaded image: \(urlString)")
                } else {
                    print("⚠️ MemoryGame: Failed to load image: \(urlString)")
                }
            } catch {
                print("❌ MemoryGame: Error loading image \(urlString): \(error)")
            }
        }
        
        // Assign loaded images to cards
        for i in 0..<cards.count {
            if let image = imageCache[cards[i].imageURL] {
                cards[i].image = image
            }
        }
        
        print("✅ MemoryGame: Loaded \(imageCache.count) unique images")
    }
    
    // MARK: - Game Actions
    
    func flipCard(cardId: UUID) {
        guard !gameState.gameComplete else { return }
        guard gameState.canFlip else { return }
        
        // Find the card
        guard let cardIndex = gameState.cards.firstIndex(where: { $0.id == cardId }) else { return }
        var card = gameState.cards[cardIndex]
        
        // Can't flip if already matched or revealed
        guard card.state == .hidden else { return }
        
        // Can't flip if we already have 2 cards flipped
        guard gameState.flippedCards.count < 2 else { return }
        
        // Flip the card
        card.state = .revealed
        gameState.cards[cardIndex] = card
        gameState.flippedCards.append(cardId)
        
        // Check if we have a pair
        if gameState.flippedCards.count == 2 {
            checkForMatch()
        }
    }
    
    private func checkForMatch() {
        guard gameState.flippedCards.count == 2 else { return }
        
        gameState.canFlip = false
        gameState.moves += 1
        
        let card1Id = gameState.flippedCards[0]
        let card2Id = gameState.flippedCards[1]
        
        guard let card1Index = gameState.cards.firstIndex(where: { $0.id == card1Id }),
              let card2Index = gameState.cards.firstIndex(where: { $0.id == card2Id }) else {
            resetFlippedCards()
            return
        }
        
        let card1 = gameState.cards[card1Index]
        let card2 = gameState.cards[card2Index]
        
        // Check if they match (same image URL)
        if card1.imageURL == card2.imageURL {
            // Match!
            gameState.cards[card1Index].state = .matched
            gameState.cards[card2Index].state = .matched
            gameState.matchedPairs += 1
            
            // Clear flipped cards
            gameState.flippedCards = []
            gameState.canFlip = true
            
            // Check if game is complete
            if gameState.allCardsMatched {
                completeGame()
            }
        } else {
            // No match - flip back after a delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in
                self?.flipBackCards()
            }
        }
    }
    
    private func flipBackCards() {
        for cardId in gameState.flippedCards {
            if let cardIndex = gameState.cards.firstIndex(where: { $0.id == cardId }) {
                var card = gameState.cards[cardIndex]
                if card.state == .revealed {
                    card.state = .hidden
                    gameState.cards[cardIndex] = card
                }
            }
        }
        resetFlippedCards()
    }
    
    private func resetFlippedCards() {
        gameState.flippedCards = []
        gameState.canFlip = true
    }
    
    private func completeGame() {
        gameState.gameComplete = true
        print("🎉 MemoryGame: Game complete! Moves: \(gameState.moves), Score: \(gameState.score)")
    }
    
    // MARK: - Reset
    
    func resetGame() {
        gameState = MemoryGameState()
        gameState.difficulty = .medium
    }
    
    func cleanup() {
        cancellables.removeAll()
    }
}

// MARK: - Combine Extensions

extension Publisher {
    func async() async throws -> Output {
        return try await withCheckedThrowingContinuation { continuation in
            var cancellable: AnyCancellable?
            cancellable = self
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            continuation.resume(throwing: error)
                        }
                        cancellable?.cancel()
                    },
                    receiveValue: { value in
                        continuation.resume(returning: value)
                        cancellable?.cancel()
                    }
                )
        }
    }
}
