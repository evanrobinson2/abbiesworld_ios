//
//  GoonPopperViewModel.swift
//  abbies.world.ios
//
//  Created for Goon Popper Minigame
//

import Foundation
import SwiftUI
import Combine
import SpriteKit

class GoonPopperViewModel: ObservableObject {
    @Published var gameState = GoonPopperGameState()
    
    private var cancellables = Set<AnyCancellable>()
    private var timer: Timer?
    let audioService = GoonPopperAudioService()
    
    // Asset base URL
    private var assetBaseURL: String {
        let base = ServerConfig.shared.baseURL
        return "\(base)/static/assets/minigames/goonpopper"
    }
    
    // MARK: - Initialization
    
    init() {
        // Forward nested game-state changes so the SwiftUI score and timer refresh.
        gameState.objectWillChange
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &cancellables)
    }
    
    deinit {
        timer?.invalidate()
        // Release all images to free memory
        clearImages()
    }
    
    /// Release all game images from memory
    private func clearImages() {
        gameState.backgroundImage = nil
        gameState.goonImages = []
        gameState.playButtonImage = nil
    }
    
    // MARK: - Asset Loading
    
    func loadAssets() async {
        print("BalloonPop: loading background")
        
        await loadBackground()
        
        audioService.playBackgroundMusic()
        print("BalloonPop: ready with \(gameState.totalGoons) balloons")
    }
    
    private func loadBackground() async {
        // Randomly select background (1-3)
        let backgroundIndex = Int.random(in: 1...3)
        gameState.selectedBackgroundIndex = backgroundIndex
        
        let backgroundURLString = "\(assetBaseURL)/b\(backgroundIndex).png"
        
        if let url = URL(string: backgroundURLString) {
            do {
                if let image = try await ImageCache.shared.loadImage(from: url) {
                    await MainActor.run {
                        gameState.backgroundImage = image
                        print("BalloonPop: background \(backgroundIndex) loaded")
                    }
                } else {
                    print("BalloonPop: background unavailable; using fallback")
                }
            } catch {
                print("BalloonPop: background load failed: \(error.localizedDescription)")
            }
        }
    }
    
    private func loadGoons() async {
        print("🖼️ Loading \(gameState.totalGoons) goon images...")
        var loadedGoons: [UIImage] = []
        
        for i in 1...gameState.totalGoons {
            let goonURLString = "\(assetBaseURL)/images/goon\(i).png"
            if let url = URL(string: goonURLString) {
                do {
                    if let image = try await ImageCache.shared.loadImage(from: url) {
                        loadedGoons.append(image)
                        print("   ✅ [\(i)/\(gameState.totalGoons)] goon\(i).png")
                    } else {
                        print("   ⚠️ [\(i)/\(gameState.totalGoons)] goon\(i).png - ImageCache returned nil")
                    }
                } catch {
                    print("   ❌ [\(i)/\(gameState.totalGoons)] goon\(i).png - Error: \(error)")
                }
            } else {
                print("   ❌ [\(i)/\(gameState.totalGoons)] goon\(i).png - Invalid URL")
            }
        }
        
        await MainActor.run {
            gameState.goonImages = loadedGoons
            print("🎉 Goon loading complete: \(loadedGoons.count)/\(gameState.totalGoons) goons loaded")
        }
    }
    
    private func loadPlayButton() async {
        let playButtonURLString = "\(assetBaseURL)/images/play.png"
        print("🖼️ Loading play button from: \(playButtonURLString)")
        
        if let url = URL(string: playButtonURLString) {
            do {
                if let image = try await ImageCache.shared.loadImage(from: url) {
                    await MainActor.run {
                        gameState.playButtonImage = image
                        print("✅ Play button loaded successfully")
                    }
                } else {
                    print("⚠️ Failed to load play button: ImageCache returned nil")
                }
            } catch {
                print("❌ Error loading play button: \(error)")
            }
        }
    }
    
    // MARK: - Game Control
    
    func startGame() {
        gameState.gameStarted = true
        gameState.gameOver = false
        gameState.startTime = Date()
        gameState.goonsPopped = 0
        gameState.score = 0
        gameState.bombsHit = 0
        gameState.elapsedTime = 0
        gameState.statusMessage = "Pop every balloon!"
        
        print("BalloonPop: game started")
        startTimer()
    }
    
    func resetGame() {
        timer?.invalidate()
        gameState.gameStarted = false
        gameState.gameOver = false
        gameState.startTime = nil
        gameState.goonsPopped = 0
        gameState.score = 0
        gameState.bombsHit = 0
        gameState.elapsedTime = 0
        gameState.statusMessage = "Tap a balloon to start!"
    }
    
    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.01, repeats: true) { [weak self] _ in
            guard let self = self,
                  let startTime = self.gameState.startTime,
                  !self.gameState.gameOver else {
                return
            }
            
            self.gameState.elapsedTime = Date().timeIntervalSince(startTime)
        }
    }
    
    func popGoon() {
        guard !gameState.gameOver else { return }
        
        gameState.goonsPopped += 1
        gameState.score += 10
        gameState.statusMessage = "Great pop! \(gameState.totalGoons - gameState.goonsPopped) left"
        print("BalloonPop: popped \(gameState.goonsPopped)/\(gameState.totalGoons), score \(gameState.score)")
        
        if gameState.allGoonsPopped {
            endGame()
        }
    }
    
    func hitBomb() {
        guard gameState.gameStarted, !gameState.gameOver else { return }
        
        gameState.bombsHit += 1
        gameState.score = max(0, gameState.score - 20)
        gameState.statusMessage = "Boom! Avoid the bombs. Score: \(gameState.score)"
        print("BalloonPop: bomb hit \(gameState.bombsHit), score \(gameState.score)")
    }
    
    func endGame() {
        gameState.gameOver = true
        timer?.invalidate()
        gameState.statusMessage = "All popped! Score: \(gameState.score). Tap Play Again!"
        print("BalloonPop: complete in \(gameState.formattedTime), score \(gameState.score)")
    }
    
    // MARK: - Cleanup
    
    func cleanup() {
        timer?.invalidate()
        audioService.stopAllAudio()
    }
}
