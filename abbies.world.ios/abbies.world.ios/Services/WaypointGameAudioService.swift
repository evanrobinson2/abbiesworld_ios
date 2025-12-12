//
//  WaypointGameAudioService.swift
//  My First Swift
//
//  Audio service for Waypoint Navigation Minigame
//

import Foundation
import AVFoundation
import Combine

class WaypointGameAudioService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    private var backgroundMusicPlayer: AVAudioPlayer?
    private var victoryMusicPlayer1: AVAudioPlayer?
    private var victoryMusicPlayer2: AVAudioPlayer?
    private var currentVictoryTrack: Int = 1
    private var fadeOutTimer: Timer?
    
    // Asset base URL - uses centralized ServerConfig
    private var assetBaseURL: String {
        let base = ServerConfig.shared.baseURL
        return "\(base)/static/minigame_waypoint"
    }
    
    override init() {
        super.init()
        setupAudioSession()
    }
    
    deinit {
        stopAllAudio()
        fadeOutTimer?.invalidate()
    }
    
    // MARK: - Audio Session Setup
    
    private func setupAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("⚠️ Failed to setup audio session: \(error)")
        }
    }
    
    // MARK: - Background Music
    
    func playBackgroundMusic() {
        guard backgroundMusicPlayer == nil else { return }
        
        let musicURL = URL(string: "\(assetBaseURL)/moon_base_return.mp3")!
        
        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: musicURL)
                
                await MainActor.run {
                    do {
                        self.backgroundMusicPlayer = try AVAudioPlayer(data: data)
                        self.backgroundMusicPlayer?.numberOfLoops = -1 // Infinite loop
                        self.backgroundMusicPlayer?.volume = 0.5
                        self.backgroundMusicPlayer?.prepareToPlay()
                        self.backgroundMusicPlayer?.play()
                        print("✅ Background music started")
                    } catch {
                        print("⚠️ Failed to create audio player: \(error)")
                        print("⚠️ Error code: \((error as NSError).code)")
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
    }
    
    func fadeOutBackgroundMusic(completion: @escaping () -> Void) {
        guard backgroundMusicPlayer != nil else {
            completion()
            return
        }
        
        fadeOutTimer?.invalidate()
        fadeOutTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] timer in
            guard let self = self, let player = self.backgroundMusicPlayer else {
                timer.invalidate()
                completion()
                return
            }
            
            if player.volume > 0.05 {
                player.volume = max(0, player.volume - 0.05)
            } else {
                player.stop()
                self.backgroundMusicPlayer = nil
                timer.invalidate()
                self.fadeOutTimer = nil
                completion()
            }
        }
    }
    
    // MARK: - Victory Music
    
    func startVictoryMusic() {
        playNextVictoryTrack()
    }
    
    private func playNextVictoryTrack() {
        let trackNumber = currentVictoryTrack
        let filename = trackNumber == 1 ? "victory_1.mp3" : "victory_2.mp3"
        let musicURL = URL(string: "\(assetBaseURL)/\(filename)")!
        
        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: musicURL)
                
                await MainActor.run {
                    do {
                        let player = try AVAudioPlayer(data: data)
                        player.numberOfLoops = 0 // Play once, then switch
                        player.volume = 0.6
                        player.prepareToPlay()
                        player.play()
                        
                        player.delegate = self
                        
                        if trackNumber == 1 {
                            self.victoryMusicPlayer1 = player
                        } else {
                            self.victoryMusicPlayer2 = player
                        }
                        
                        print("✅ Victory music track \(trackNumber) started")
                    } catch {
                        print("⚠️ Failed to create victory music player: \(error)")
                    }
                }
            } catch {
                print("⚠️ Failed to load victory music from \(musicURL): \(error)")
            }
        }
    }
    
    private func switchVictoryTrack() {
        currentVictoryTrack = currentVictoryTrack == 1 ? 2 : 1
        
        // Stop current track
        if currentVictoryTrack == 2 {
            victoryMusicPlayer1?.stop()
            victoryMusicPlayer1 = nil
        } else {
            victoryMusicPlayer2?.stop()
            victoryMusicPlayer2 = nil
        }
        
        // Play next track
        playNextVictoryTrack()
    }
    
    func stopVictoryMusic() {
        victoryMusicPlayer1?.stop()
        victoryMusicPlayer2?.stop()
        victoryMusicPlayer1 = nil
        victoryMusicPlayer2 = nil
    }
    
    // MARK: - AVAudioPlayerDelegate
    
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        // Check if this is a victory music track
        if player == victoryMusicPlayer1 || player == victoryMusicPlayer2 {
            switchVictoryTrack()
        }
    }
    
    // MARK: - Cleanup
    
    func stopAllAudio() {
        stopBackgroundMusic()
        stopVictoryMusic()
        fadeOutTimer?.invalidate()
        fadeOutTimer = nil
    }
}

