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
        return "\(base)/static/minigames/goonpopper"
    }
    
    // MARK: - Initialization
    
    init() {
        // Default state
    }
    
    deinit {
        timer?.invalidate()
    }
    
    // MARK: - Asset Loading
    
    func loadAssets() async {
        print("🎮 GoonPopper: Starting asset loading...")
        print("📍 Asset base URL: \(assetBaseURL)")
        
        await loadBackground()
        await loadGoons()
        await loadPlayButton()
        
        // Start background music
        audioService.playBackgroundMusic()
    }
    
    private func loadBackground() async {
        // Randomly select background (1-3)
        let backgroundIndex = Int.random(in: 1...3)
        gameState.selectedBackgroundIndex = backgroundIndex
        
        let backgroundURLString = "\(assetBaseURL)/images/b\(backgroundIndex).png"
        print("🖼️ Loading background \(backgroundIndex) from: \(backgroundURLString)")
        
        if let url = URL(string: backgroundURLString) {
            do {
                if let image = try await ImageCache.shared.loadImage(from: url) {
                    await MainActor.run {
                        gameState.backgroundImage = image
                        print("✅ Background loaded successfully")
                    }
                } else {
                    print("⚠️ Failed to load background: ImageCache returned nil")
                }
            } catch {
                print("❌ Error loading background: \(error)")
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
        gameState.elapsedTime = 0
        
        startTimer()
    }
    
    func resetGame() {
        timer?.invalidate()
        gameState.gameStarted = false
        gameState.gameOver = false
        gameState.startTime = nil
        gameState.goonsPopped = 0
        gameState.elapsedTime = 0
    }
    
    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.001, repeats: true) { [weak self] _ in
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
        
        if gameState.allGoonsPopped {
            endGame()
        }
    }
    
    func endGame() {
        gameState.gameOver = true
        timer?.invalidate()
        print("🎉 GoonPopper: Game complete! Time: \(gameState.formattedTime)")
    }
    
    // MARK: - Cleanup
    
    func cleanup() {
        timer?.invalidate()
        audioService.stopAllAudio()
    }
}
