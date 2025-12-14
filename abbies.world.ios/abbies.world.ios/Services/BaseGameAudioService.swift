//
//  BaseGameAudioService.swift
//  abbies.world.ios
//
//  Base protocol and implementation for minigame audio services
//  Ensures consistent audio coordination across all minigames
//

import Foundation
import AVFoundation
import Combine

/// Protocol that all minigame audio services should conform to
protocol GameAudioServiceProtocol: AnyObject {
    func playBackgroundMusic()
    func stopAllAudio()
}

/// Base class for minigame audio services
/// Provides common functionality and ensures consistent audio session management
class BaseGameAudioService: NSObject, ObservableObject, AVAudioPlayerDelegate, GameAudioServiceProtocol {
    private var backgroundMusicPlayer: AVAudioPlayer?
    
    /// Override this in subclasses to provide the asset base URL
    var assetBaseURL: String {
        fatalError("Subclasses must override assetBaseURL")
    }
    
    /// Override this in subclasses to provide the music filename
    var musicFilename: String {
        fatalError("Subclasses must override musicFilename")
    }
    
    override init() {
        super.init()
        setupAudioSession()
    }
    
    deinit {
        stopAllAudio()
    }
    
    // MARK: - Audio Session Setup
    
    private func setupAudioSession() {
        do {
            // Use .playback category to allow background audio
            // Use .mixWithOthers option so game audio can play alongside system sounds
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("⚠️ BaseGameAudioService: Failed to setup audio session: \(error)")
        }
    }
    
    // MARK: - Background Music (Default Implementation)
    
    func playBackgroundMusic() {
        guard backgroundMusicPlayer == nil else { return }
        
        let musicURL = URL(string: "\(assetBaseURL)/\(musicFilename)")!
        
        print("🎵 Loading background music from: \(musicURL)")
        
        Task {
            do {
                var request = URLRequest(url: musicURL)
                ServerConfig.shared.addAPIKeyHeader(to: &request)
                
                let (data, response) = try await URLSession.shared.data(for: request)
                
                // Validate response
                guard let httpResponse = response as? HTTPURLResponse else {
                    print("❌ Invalid response type for background music")
                    return
                }
                
                guard httpResponse.statusCode == 200 else {
                    print("❌ Server returned status \(httpResponse.statusCode) for background music")
                    if let errorBody = String(data: data, encoding: .utf8) {
                        print("   Response body: \(errorBody.prefix(200))")
                    }
                    return
                }
                
                // Validate data size
                guard data.count > 1024 else {
                    print("❌ Audio data too small (\(data.count) bytes)")
                    return
                }
                
                await MainActor.run {
                    do {
                        self.backgroundMusicPlayer = try AVAudioPlayer(data: data)
                        self.backgroundMusicPlayer?.numberOfLoops = -1 // Infinite loop
                        self.backgroundMusicPlayer?.volume = 0.5
                        self.backgroundMusicPlayer?.delegate = self
                        self.backgroundMusicPlayer?.prepareToPlay()
                        self.backgroundMusicPlayer?.play()
                        print("✅ Background music started (size: \(data.count) bytes)")
                    } catch {
                        print("⚠️ Failed to create audio player: \(error)")
                    }
                }
            } catch {
                print("❌ Failed to load background music from \(musicURL): \(error)")
            }
        }
    }
    
    func stopBackgroundMusic() {
        backgroundMusicPlayer?.stop()
        backgroundMusicPlayer = nil
        print("🔇 Background music stopped")
    }
    
    // MARK: - AVAudioPlayerDelegate
    
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        // Background music loops infinitely, so this shouldn't be called
        // But if it is, restart it
        if player == backgroundMusicPlayer && flag {
            player.play()
        }
    }
    
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        print("⚠️ Audio decode error: \(error?.localizedDescription ?? "unknown")")
    }
    
    // MARK: - GameAudioServiceProtocol
    
    func stopAllAudio() {
        stopBackgroundMusic()
    }
}
