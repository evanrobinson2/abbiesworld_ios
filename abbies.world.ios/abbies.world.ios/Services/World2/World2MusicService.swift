//
//  World2MusicService.swift
//  abbies.world.ios
//
//  Music service extension for Abbie's World 2 light/intense track system.
//  Builds on top of MusicService patterns.
//

import Foundation
import AVFoundation
import Combine

enum MusicIntensity: String, Codable {
    case light
    case intense
}

struct LocationMusic: Codable {
    let locationId: String
    let lightTrackId: String
    let intenseTrackId: String
}

@MainActor
class World2MusicService: ObservableObject {
    static let shared = World2MusicService()
    
    private var audioPlayer: AVAudioPlayer?
    private var crossfadePlayer: AVAudioPlayer?
    private let assetService = AssetBootstrapService.shared
    
    @Published private(set) var currentLocationId: String?
    @Published private(set) var currentIntensity: MusicIntensity = .light
    @Published private(set) var isPlaying = false
    @Published var isMusicEnabled = true
    @Published var volume: Float = 0.7
    
    private var locationMusicMap: [String: LocationMusic] = [:]
    private let crossfadeDuration: TimeInterval = 1.5
    
    private init() {
        setupAudioSession()
        loadLocationMusicMap()
    }
    
    private func setupAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("⚠️ World2MusicService: Failed to setup audio session: \(error)")
        }
    }
    
    private func loadLocationMusicMap() {
        locationMusicMap = [
            "world.home": LocationMusic(
                locationId: "world.home",
                lightTrackId: "music.home.light",
                intenseTrackId: "music.home.intense"
            ),
            "world.adventure": LocationMusic(
                locationId: "world.adventure",
                lightTrackId: "music.adventure.light",
                intenseTrackId: "music.adventure.intense"
            ),
            "poi.abbieTreehouse": LocationMusic(
                locationId: "poi.abbieTreehouse",
                lightTrackId: "music.abbieTreehouse.light",
                intenseTrackId: "music.abbieTreehouse.intense"
            ),
            "poi.aniTreehouse": LocationMusic(
                locationId: "poi.aniTreehouse",
                lightTrackId: "music.aniTreehouse.light",
                intenseTrackId: "music.aniTreehouse.intense"
            ),
            "poi.cardFactory": LocationMusic(
                locationId: "poi.cardFactory",
                lightTrackId: "music.cardFactory.light",
                intenseTrackId: "music.cardFactory.intense"
            ),
            "poi.cardVault": LocationMusic(
                locationId: "poi.cardVault",
                lightTrackId: "music.cardVault.light",
                intenseTrackId: "music.cardVault.intense"
            ),
            "poi.creatureIngredient": LocationMusic(
                locationId: "poi.creatureIngredient",
                lightTrackId: "music.creaturePOI.light",
                intenseTrackId: "music.creaturePOI.intense"
            ),
            "poi.functionIngredient": LocationMusic(
                locationId: "poi.functionIngredient",
                lightTrackId: "music.functionPOI.light",
                intenseTrackId: "music.functionPOI.intense"
            ),
            "poi.contextIngredient": LocationMusic(
                locationId: "poi.contextIngredient",
                lightTrackId: "music.contextPOI.light",
                intenseTrackId: "music.contextPOI.intense"
            ),
            "poi.gemReward": LocationMusic(
                locationId: "poi.gemReward",
                lightTrackId: "music.gemPOI.light",
                intenseTrackId: "music.gemPOI.intense"
            )
        ]
    }
    
    func enterLocation(_ locationId: String) {
        guard isMusicEnabled else { return }
        
        if currentLocationId == locationId && isPlaying {
            return
        }
        
        currentLocationId = locationId
        currentIntensity = .light
        
        playTrackForCurrentState()
    }
    
    func transitionToIntense() {
        guard currentIntensity != .intense else { return }
        currentIntensity = .intense
        crossfadeToCurrentTrack()
    }
    
    func transitionToLight() {
        guard currentIntensity != .light else { return }
        currentIntensity = .light
        crossfadeToCurrentTrack()
    }
    
    func exitLocation(returningTo parentLocationId: String? = nil) {
        if let parentId = parentLocationId {
            currentLocationId = parentId
            currentIntensity = .light
            crossfadeToCurrentTrack()
        } else {
            fadeOutAndStop()
        }
    }
    
    func toggleMusic() {
        isMusicEnabled.toggle()
        
        if isMusicEnabled {
            if currentLocationId != nil {
                playTrackForCurrentState()
            }
        } else {
            fadeOutAndStop()
        }
    }
    
    func setVolume(_ newVolume: Float) {
        volume = max(0, min(1, newVolume))
        audioPlayer?.volume = volume
    }
    
    private func playTrackForCurrentState() {
        guard let locationId = currentLocationId,
              let locationMusic = locationMusicMap[locationId] else {
            print("⚠️ World2MusicService: No music config for location: \(currentLocationId ?? "nil")")
            return
        }
        
        let trackId = currentIntensity == .light
            ? locationMusic.lightTrackId
            : locationMusic.intenseTrackId
        
        playTrack(trackId)
    }
    
    private func crossfadeToCurrentTrack() {
        guard let locationId = currentLocationId,
              let locationMusic = locationMusicMap[locationId] else {
            return
        }
        
        let trackId = currentIntensity == .light
            ? locationMusic.lightTrackId
            : locationMusic.intenseTrackId
        
        guard let trackUrl = assetService.music(trackId) else {
            if let bundledUrl = Bundle.main.url(
                forResource: trackId.replacingOccurrences(of: ".", with: "_"),
                withExtension: "mp3"
            ) {
                crossfadeTo(url: bundledUrl)
            } else {
                print("⚠️ World2MusicService: Track not available: \(trackId)")
            }
            return
        }
        
        crossfadeTo(url: trackUrl)
    }
    
    private func playTrack(_ trackId: String) {
        guard let trackUrl = assetService.music(trackId) else {
            if let bundledUrl = Bundle.main.url(
                forResource: trackId.replacingOccurrences(of: ".", with: "_"),
                withExtension: "mp3"
            ) {
                playUrl(bundledUrl)
            } else {
                print("⚠️ World2MusicService: Track not available: \(trackId)")
            }
            return
        }
        
        playUrl(trackUrl)
    }
    
    private func playUrl(_ url: URL) {
        do {
            audioPlayer?.stop()
            audioPlayer = try AVAudioPlayer(contentsOf: url)
            audioPlayer?.numberOfLoops = -1
            audioPlayer?.volume = volume
            audioPlayer?.prepareToPlay()
            audioPlayer?.play()
            isPlaying = true
            print("🎵 World2MusicService: Playing \(url.lastPathComponent)")
        } catch {
            print("❌ World2MusicService: Failed to play track: \(error)")
        }
    }
    
    private func crossfadeTo(url: URL) {
        guard let currentPlayer = audioPlayer, currentPlayer.isPlaying else {
            playUrl(url)
            return
        }
        
        do {
            crossfadePlayer = try AVAudioPlayer(contentsOf: url)
            crossfadePlayer?.numberOfLoops = -1
            crossfadePlayer?.volume = 0
            crossfadePlayer?.prepareToPlay()
            crossfadePlayer?.play()
            
            let fadeSteps = 20
            let stepDuration = crossfadeDuration / Double(fadeSteps)
            
            for step in 0..<fadeSteps {
                DispatchQueue.main.asyncAfter(deadline: .now() + stepDuration * Double(step)) { [weak self] in
                    guard let self = self else { return }
                    let progress = Float(step + 1) / Float(fadeSteps)
                    currentPlayer.volume = self.volume * (1 - progress)
                    self.crossfadePlayer?.volume = self.volume * progress
                }
            }
            
            DispatchQueue.main.asyncAfter(deadline: .now() + crossfadeDuration) { [weak self] in
                currentPlayer.stop()
                self?.audioPlayer = self?.crossfadePlayer
                self?.crossfadePlayer = nil
            }
            
            print("🎵 World2MusicService: Crossfading to \(url.lastPathComponent)")
            
        } catch {
            playUrl(url)
        }
    }
    
    private func fadeOutAndStop() {
        guard let player = audioPlayer, player.isPlaying else {
            isPlaying = false
            return
        }
        
        let fadeSteps = 10
        let stepDuration = 0.5 / Double(fadeSteps)
        let volumeStep = player.volume / Float(fadeSteps)
        
        for step in 0..<fadeSteps {
            DispatchQueue.main.asyncAfter(deadline: .now() + stepDuration * Double(step)) {
                player.volume = max(0, player.volume - volumeStep)
            }
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            player.stop()
            self?.audioPlayer = nil
            self?.isPlaying = false
        }
    }
    
    func pause() {
        audioPlayer?.pause()
        isPlaying = false
    }
    
    func resume() {
        guard isMusicEnabled else { return }
        audioPlayer?.play()
        isPlaying = audioPlayer?.isPlaying ?? false
    }
    
    func stop() {
        audioPlayer?.stop()
        audioPlayer = nil
        crossfadePlayer?.stop()
        crossfadePlayer = nil
        isPlaying = false
        currentLocationId = nil
    }
}
