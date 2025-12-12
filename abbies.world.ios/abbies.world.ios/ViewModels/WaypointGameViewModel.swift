//
//  WaypointGameViewModel.swift
//  My First Swift
//
//  Created for Waypoint Navigation Minigame
//

import Foundation
import SwiftUI
import Combine
import UIKit

class WaypointGameViewModel: ObservableObject {
    @Published var gameState = WaypointGameState()
    
    private var cancellables = Set<AnyCancellable>()
    private var buggyAnimationTimer: Timer?
    private var pulseTimer: Timer?
    private let audioService = WaypointGameAudioService()
    
    // Asset base URL - uses centralized ServerConfig
    private var assetBaseURL: String {
        let base = ServerConfig.shared.baseURL
        return "\(base)/static/minigame_waypoint"
    }
    
    // MARK: - Initialization
    
    init() {
        loadDefaultWaypoints()
        setupPulseAnimation()
    }
    
    deinit {
        buggyAnimationTimer?.invalidate()
        pulseTimer?.invalidate()
    }
    
    // MARK: - Game Setup
    
    func loadDefaultWaypoints() {
        gameState.waypoints = WaypointGameState.defaultWaypoints()
        
        // Build good nodes order
        let goodNodes = gameState.waypoints.filter { $0.isTraversable }
        gameState.totalGoodNodes = goodNodes.count
        gameState.goodNodesOrder = gameState.waypoints
            .enumerated()
            .filter { $0.element.isTraversable }
            .map { $0.offset }
        gameState.currentGoodNodeIndex = 0
        
        updateStatusMessage()
    }
    
    // MARK: - Asset Loading
    
    func loadAssets() async {
        print("🎮 Starting asset loading...")
        print("📍 Asset base URL: \(assetBaseURL)")
        await loadCriticalAssets()
        // Pre-load victory assets in background
        Task {
            await loadVictoryAssets()
        }
        // Start background music
        audioService.playBackgroundMusic()
    }
    
    private func loadCriticalAssets() async {
        // Load buggy sprite
        let buggyURLString = "\(assetBaseURL)/moon_buggy_sprite.png"
        print("🖼️ Loading buggy sprite from: \(buggyURLString)")
        if let url = URL(string: buggyURLString) {
            do {
                if let image = try await ImageCache.shared.loadImage(from: url) {
                    await MainActor.run {
                        gameState.buggyImage = processBuggyImage(image)
                        print("✅ Buggy sprite loaded successfully")
                    }
                } else {
                    print("⚠️ Failed to load buggy sprite: ImageCache returned nil")
                }
            } catch {
                print("❌ Error loading buggy sprite: \(error)")
            }
        } else {
            print("❌ Invalid URL for buggy sprite: \(buggyURLString)")
        }
        
        // Load moonbase icon
        let moonbaseURLString = "\(assetBaseURL)/moonbase.png"
        print("🖼️ Loading moonbase from: \(moonbaseURLString)")
        if let url = URL(string: moonbaseURLString) {
            do {
                if let image = try await ImageCache.shared.loadImage(from: url) {
                    await MainActor.run {
                        gameState.moonbaseImage = image
                        print("✅ Moonbase loaded successfully")
                    }
                } else {
                    print("⚠️ Failed to load moonbase: ImageCache returned nil")
                }
            } catch {
                print("❌ Error loading moonbase: \(error)")
            }
        } else {
            print("❌ Invalid URL for moonbase: \(moonbaseURLString)")
        }
        
        // Load destination banner
        let bannerURLString = "\(assetBaseURL)/trio_at_base_pixel.png"
        print("🖼️ Loading destination banner from: \(bannerURLString)")
        if let url = URL(string: bannerURLString) {
            do {
                if let image = try await ImageCache.shared.loadImage(from: url) {
                    await MainActor.run {
                        gameState.destinationBannerImage = image
                        print("✅ Destination banner loaded successfully")
                    }
                } else {
                    print("⚠️ Failed to load destination banner: ImageCache returned nil")
                }
            } catch {
                print("❌ Error loading destination banner: \(error)")
            }
        } else {
            print("❌ Invalid URL for destination banner: \(bannerURLString)")
        }
    }
    
    private func loadVictoryAssets() async {
        // Load victory image (filename has space, need URL encoding)
        let victoryFilename = "abbie star child.png"
        if let encodedFilename = victoryFilename.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
           let url = URL(string: "\(assetBaseURL)/\(encodedFilename)") {
            if let image = try? await ImageCache.shared.loadImage(from: url) {
                await MainActor.run {
                    gameState.victoryImage = image
                }
            }
        }
        
        // Load cutscene
        if let url = URL(string: "\(assetBaseURL)/cinematic_01_moonbase_wide.png") {
            if let image = try? await ImageCache.shared.loadImage(from: url) {
                await MainActor.run {
                    gameState.cutsceneImage = image
                }
            }
        }
        
        // Load cover (filename has spaces, need URL encoding)
        let coverFilename = "moon mission 1.png"
        if let encodedFilename = coverFilename.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed),
           let url = URL(string: "\(assetBaseURL)/\(encodedFilename)") {
            if let image = try? await ImageCache.shared.loadImage(from: url) {
                await MainActor.run {
                    gameState.coverImage = image
                }
            }
        }
        
        // Load polaroids
        let polaroidFilenames = [
            "polaroid_01_ice_cream_party.png",
            "polaroid_02_chase_scene.png",
            "polaroid_03_beard_bows.png",
            "polaroid_04_tea_party.png",
            "polaroid_05_story_time.png",
            "polaroid_06_silly_faces.png",
            "polaroid_07_game_night.png",
            "polaroid_08_art_lesson.png",
            "polaroid_09_group_hug.png",
            "polaroid_10_window_view.png"
        ]
        
        var loadedPolaroids: [UIImage] = []
        for filename in polaroidFilenames {
            if let url = URL(string: "\(assetBaseURL)/\(filename)") {
                if let image = try? await ImageCache.shared.loadImage(from: url) {
                    loadedPolaroids.append(image)
                }
            }
        }
        
        await MainActor.run {
            gameState.polaroidImages = loadedPolaroids
        }
    }
    
    // MARK: - Buggy Image Processing
    
    private func processBuggyImage(_ image: UIImage) -> UIImage? {
        guard let cgImage = image.cgImage else { return image }
        
        let width = cgImage.width
        let height = cgImage.height
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let bytesPerPixel = 4
        let bytesPerRow = bytesPerPixel * width
        let bitsPerComponent = 8
        
        guard let context = CGContext(
            data: nil,
            width: width,
            height: height,
            bitsPerComponent: bitsPerComponent,
            bytesPerRow: bytesPerRow,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return image
        }
        
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        
        guard let pixelData = context.data else { return image }
        let data = pixelData.assumingMemoryBound(to: UInt8.self)
        
        // Get top-left pixel color (background color to remove)
        let bgR = Int(data[0])
        let bgG = Int(data[1])
        let bgB = Int(data[2])
        
        // Make matching pixels transparent (within 30 RGB tolerance)
        for y in 0..<height {
            for x in 0..<width {
                let pixelIndex = (y * width + x) * bytesPerPixel
                let r = Int(data[pixelIndex])
                let g = Int(data[pixelIndex + 1])
                let b = Int(data[pixelIndex + 2])
                
                if abs(r - bgR) < 30 && abs(g - bgG) < 30 && abs(b - bgB) < 30 {
                    data[pixelIndex + 3] = 0 // Make transparent
                }
            }
        }
        
        guard let processedCGImage = context.makeImage() else { return image }
        return UIImage(cgImage: processedCGImage)
    }
    
    // MARK: - Waypoint Click Handling
    
    func handleWaypointClick(at point: CGPoint, canvasSize: CGSize) {
        guard !gameState.gameComplete else { return }
        
        // Convert point to canvas coordinates (assuming point is already in canvas space)
        for index in 0..<gameState.waypoints.count {
            let waypoint = gameState.waypoints[index]
            
            if waypoint.isClicked { continue }
            
            let distance = sqrt(
                pow(point.x - waypoint.position.x, 2) +
                pow(point.y - waypoint.position.y, 2)
            )
            
            if distance < waypoint.size {
                processWaypointClick(waypointIndex: index)
                break
            }
        }
    }
    
    private func processWaypointClick(waypointIndex: Int) {
        var waypoint = gameState.waypoints[waypointIndex]
        waypoint.isClicked = true
        
        if waypoint.isTraversable {
            // Check if it's the correct next waypoint
            let expectedIndex = gameState.goodNodesOrder[gameState.currentGoodNodeIndex]
            
            if waypointIndex != expectedIndex {
                // Wrong order - shake screen and show error
                triggerScreenShake()
                gameState.statusMessage = "⚠️ You must find the waypoints in order! (\(gameState.clickedGoodNodes)/\(gameState.totalGoodNodes))"
                return
            }
            
            // Correct waypoint!
            waypoint.state = .good
            gameState.clickedGoodNodes += 1
            gameState.currentGoodNodeIndex += 1
            
            // Animate buggy to waypoint
            animateBuggyToPosition(waypoint.position)
            
            if gameState.clickedGoodNodes >= gameState.totalGoodNodes {
                // All waypoints found!
                gameState.statusMessage = "🎉 ALL SAFE WAYPOINTS FOUND! 🎉"
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self] in
                    self?.completeGame()
                }
            } else {
                gameState.statusMessage = "Safe waypoint found! Find the next one. (\(gameState.clickedGoodNodes)/\(gameState.totalGoodNodes))"
            }
        } else {
            // Unsafe waypoint
            waypoint.state = .bad
            triggerScreenShake()
            gameState.statusMessage = "⚠️ Unsafe waypoint! Keep searching. (\(gameState.clickedGoodNodes)/\(gameState.totalGoodNodes))"
        }
        
        gameState.waypoints[waypointIndex] = waypoint
    }
    
    // MARK: - Animations
    
    private func setupPulseAnimation() {
        pulseTimer = Timer.scheduledTimer(withTimeInterval: 1.0/60.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            
            self.gameState.buggyPulse += self.gameState.buggyPulseDirection * 0.003
            
            if self.gameState.buggyPulse > 0.15 {
                self.gameState.buggyPulse = 0.15
                self.gameState.buggyPulseDirection = -1
            } else if self.gameState.buggyPulse < -0.05 {
                self.gameState.buggyPulse = -0.05
                self.gameState.buggyPulseDirection = 1
            }
        }
    }
    
    private func animateBuggyToPosition(_ target: CGPoint) {
        let duration: TimeInterval = 0.5
        let startPosition = gameState.buggyPosition
        let startTime = Date()
        
        buggyAnimationTimer?.invalidate()
        buggyAnimationTimer = Timer.scheduledTimer(withTimeInterval: 1.0/60.0, repeats: true) { [weak self] timer in
            guard let self = self else {
                timer.invalidate()
                return
            }
            
            let elapsed = Date().timeIntervalSince(startTime)
            let progress = min(elapsed / duration, 1.0)
            
            self.gameState.buggyPosition = CGPoint(
                x: startPosition.x + (target.x - startPosition.x) * CGFloat(progress),
                y: startPosition.y + (target.y - startPosition.y) * CGFloat(progress)
            )
            
            if progress >= 1.0 {
                timer.invalidate()
                self.buggyAnimationTimer = nil
            }
        }
    }
    
    private func triggerScreenShake() {
        gameState.screenShake = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.gameState.screenShake = false
        }
    }
    
    // MARK: - Status Messages
    
    private func updateStatusMessage() {
        if gameState.clickedGoodNodes == 0 {
            gameState.statusMessage = "Click any waypoint to begin discovering the safe path!"
        } else {
            gameState.statusMessage = "Find the first safe waypoint! (0/\(gameState.totalGoodNodes))"
        }
    }
    
    // MARK: - Game Completion
    
    private func completeGame() {
        gameState.gameComplete = true
        // Fade out background music and start victory music
        audioService.fadeOutBackgroundMusic {
            self.audioService.startVictoryMusic()
        }
        // Victory sequence will be handled by the view
    }
    
    // MARK: - Reset
    
    func resetGame() {
        buggyAnimationTimer?.invalidate()
        audioService.stopAllAudio()
        gameState = WaypointGameState()
        loadDefaultWaypoints()
        setupPulseAnimation()
        audioService.playBackgroundMusic()
    }
    
    func cleanup() {
        audioService.stopAllAudio()
        buggyAnimationTimer?.invalidate()
        pulseTimer?.invalidate()
    }
}

