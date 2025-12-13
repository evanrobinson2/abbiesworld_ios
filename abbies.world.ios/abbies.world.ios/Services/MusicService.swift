//
//  MusicService.swift
//  abbies.world.ios
//
//  Background music playback service
//

import Foundation
import AVFoundation
import Combine

class MusicService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    static let shared = MusicService()
    
    private let apiClient = APIClient.shared
    private let assetsService = AssetsService.shared
    private var cancellables = Set<AnyCancellable>()
    
    // Published state
    @Published var isPlaying: Bool = false
    @Published var currentSong: MusicTrack?
    @Published var playlist: [MusicTrack] = []
    @Published var isShuffleEnabled: Bool = false
    @Published var isMusicEnabled: Bool = true
    @Published var repeatMode: RepeatMode = .all
    @Published var isLoading: Bool = false
    
    // Playback state
    private var audioPlayer: AVAudioPlayer?
    private var currentIndex: Int = 0
    private var shuffledQueue: [Int] = []
    private var wasPlayingBeforeGame: Bool = false
    private var wasPlayingBeforeInterruption: Bool = false
    
    // Cache keys
    private let playlistCacheKey = "music_playlist_cache"
    private let playlistTimestampKey = "music_playlist_timestamp"
    private let settingsKey = "music_settings"
    
    // Cache directory
    private var cacheDirectory: URL {
        let paths = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        let documentsDirectory = paths[0]
        let cacheDir = documentsDirectory.appendingPathComponent("MusicCache")
        try? FileManager.default.createDirectory(at: cacheDir, withIntermediateDirectories: true)
        return cacheDir
    }
    
    override init() {
        super.init()
        setupAudioSession()
        loadSettings()
        setupInterruptionHandling()
        loadPlaylist()
    }
    
    deinit {
        stop()
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - Audio Session Setup
    
    private func setupAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("⚠️ MusicService: Failed to setup audio session: \(error)")
        }
    }
    
    // MARK: - Interruption Handling
    
    private func setupInterruptionHandling() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAudioInterruption),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
    }
    
    @objc private func handleAudioInterruption(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }
        
        switch type {
        case .began:
            print("🔇 MusicService: Audio interruption began")
            wasPlayingBeforeInterruption = isPlaying
            if isPlaying {
                pause()
            }
            
        case .ended:
            print("🔊 MusicService: Audio interruption ended")
            if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                if options.contains(.shouldResume) && wasPlayingBeforeInterruption && isMusicEnabled {
                    play()
                }
            }
        @unknown default:
            break
        }
    }
    
    // MARK: - Game Coordination
    
    func setGameActive(_ active: Bool) {
        if active {
            wasPlayingBeforeGame = isPlaying
            if isPlaying {
                pause()
            }
            print("🎮 MusicService: Game started, music paused")
        } else {
            if wasPlayingBeforeGame && isMusicEnabled {
                play()
            }
            wasPlayingBeforeGame = false
            print("🎮 MusicService: Game ended, music resumed")
        }
    }
    
    // MARK: - Settings Management
    
    private func loadSettings() {
        if let data = UserDefaults.standard.data(forKey: settingsKey),
           let settings = try? JSONDecoder().decode(MusicSettings.self, from: data) {
            isShuffleEnabled = settings.isShuffleEnabled
            isMusicEnabled = settings.isMusicEnabled
            repeatMode = settings.repeatMode
            currentIndex = settings.currentIndex
        }
    }
    
    private func saveSettings() {
        let settings = MusicSettings(
            isShuffleEnabled: isShuffleEnabled,
            isMusicEnabled: isMusicEnabled,
            repeatMode: repeatMode,
            currentIndex: currentIndex
        )
        if let data = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(data, forKey: settingsKey)
        }
    }
    
    // MARK: - Playlist Loading
    
    func loadPlaylist() {
        // Check cache first
        if let cachedPlaylist = loadCachedPlaylist(), isCacheFresh() {
            print("✅ MusicService: Using cached playlist (\(cachedPlaylist.count) songs)")
            playlist = cachedPlaylist
            restorePlaybackState()
            return
        }
        
        // Fetch from server
        isLoading = true
        assetsService.getAssets(type: "music")
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    if case .failure(let error) = completion {
                        print("❌ MusicService: Error loading playlist: \(error)")
                        // Try to use stale cache if available
                        if let cached = self?.loadCachedPlaylist() {
                            print("⚠️ MusicService: Using stale cached playlist")
                            self?.playlist = cached
                        }
                    }
                },
                receiveValue: { [weak self] assets in
                    guard let self = self else { return }
                    let tracks = assets.map { MusicTrack(from: $0) }
                    self.playlist = tracks
                    self.cachePlaylist(tracks)
                    print("✅ MusicService: Loaded \(tracks.count) songs from server")
                    
                    // Auto-start if music is enabled
                    if self.isMusicEnabled && !self.isPlaying && !tracks.isEmpty {
                        self.play()
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    private func loadCachedPlaylist() -> [MusicTrack]? {
        guard let data = UserDefaults.standard.data(forKey: playlistCacheKey),
              let tracks = try? JSONDecoder().decode([MusicTrack].self, from: data) else {
            return nil
        }
        return tracks
    }
    
    private func cachePlaylist(_ tracks: [MusicTrack]) {
        if let data = try? JSONEncoder().encode(tracks) {
            UserDefaults.standard.set(data, forKey: playlistCacheKey)
            UserDefaults.standard.set(Date().timeIntervalSince1970, forKey: playlistTimestampKey)
        }
    }
    
    private func isCacheFresh() -> Bool {
        let timestamp = UserDefaults.standard.double(forKey: playlistTimestampKey)
        guard timestamp > 0 else { return false }
        let cacheDate = Date(timeIntervalSince1970: timestamp)
        let hoursSinceCache = Date().timeIntervalSince(cacheDate) / 3600
        return hoursSinceCache < 24 // Cache valid for 24 hours
    }
    
    private func restorePlaybackState() {
        // Restore to last played song if valid
        if currentIndex >= 0 && currentIndex < playlist.count {
            currentSong = playlist[currentIndex]
        }
        
        // Auto-start if music was enabled
        if isMusicEnabled && !playlist.isEmpty {
            play()
        }
    }
    
    // MARK: - Playback Control
    
    func play() {
        guard isMusicEnabled, !playlist.isEmpty else { return }
        
        // Don't start if already playing
        if audioPlayer?.isPlaying == true {
            return
        }
        
        // If no current song, start from beginning
        if currentSong == nil {
            currentIndex = 0
            currentSong = playlist[currentIndex]
        }
        
        // If player exists but paused, resume
        if let player = audioPlayer {
            player.play()
            isPlaying = true
            saveSettings()
            return
        }
        
        // Load and play current song
        loadAndPlayCurrentSong()
    }
    
    func pause() {
        audioPlayer?.pause()
        isPlaying = false
        saveSettings()
    }
    
    func stop() {
        audioPlayer?.stop()
        audioPlayer?.delegate = nil // Remove delegate to prevent callbacks
        audioPlayer = nil
        isPlaying = false
        // Don't clear currentSong here - we might want to know what was playing
        saveSettings()
    }
    
    func toggleMusic() {
        isMusicEnabled.toggle()
        saveSettings()
        
        if isMusicEnabled {
            play()
        } else {
            stop()
        }
    }
    
    func toggleShuffle() {
        isShuffleEnabled.toggle()
        saveSettings()
        
        // Regenerate shuffle queue if enabled
        if isShuffleEnabled {
            generateShuffleQueue()
        }
    }
    
    func playSong(_ track: MusicTrack) {
        guard let index = playlist.firstIndex(where: { $0.id == track.id }) else {
            print("⚠️ MusicService: Track not found in playlist")
            return
        }
        
        print("🎵 MusicService: Switching to song: \(track.displayName)")
        
        // Stop current playback and clean up properly
        if let player = audioPlayer {
            player.stop()
            player.delegate = nil // Remove delegate to prevent callbacks during transition
        }
        audioPlayer = nil
        isPlaying = false
        
        // Update to new song BEFORE loading (so loadAndPlayCurrentSong can find it)
        currentIndex = index
        currentSong = track
        
        // Small delay to ensure audio system is ready and old player is fully stopped
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            guard let self = self else { return }
            // Double-check we still have a current song (shouldn't be nil at this point)
            guard self.currentSong != nil else {
                print("❌ MusicService: currentSong became nil before loading")
                return
            }
            self.loadAndPlayCurrentSong()
        }
    }
    
    // MARK: - Queue Management
    
    private func generateShuffleQueue() {
        var indices = Array(0..<playlist.count)
        indices.shuffle()
        shuffledQueue = indices
    }
    
    private func getNextIndex() -> Int? {
        guard !playlist.isEmpty else { return nil }
        
        if isShuffleEnabled {
            // Find current position in shuffle queue
            if let currentPos = shuffledQueue.firstIndex(of: currentIndex) {
                let nextPos = currentPos + 1
                if nextPos < shuffledQueue.count {
                    return shuffledQueue[nextPos]
                } else if repeatMode == .all {
                    // Reshuffle and start over
                    generateShuffleQueue()
                    return shuffledQueue.first
                }
            } else {
                // Current song not in queue, start from beginning
                generateShuffleQueue()
                return shuffledQueue.first
            }
        } else {
            // Normal order
            let nextIndex = currentIndex + 1
            if nextIndex < playlist.count {
                return nextIndex
            } else if repeatMode == .all {
                return 0 // Loop back to start
            }
        }
        
        return nil // No more songs
    }
    
    private func playNext() {
        guard let nextIndex = getNextIndex() else {
            // No more songs
            stop()
            return
        }
        
        // Clean up current player before switching
        if let player = audioPlayer {
            player.stop()
            player.delegate = nil
        }
        audioPlayer = nil
        isPlaying = false
        
        currentIndex = nextIndex
        currentSong = playlist[nextIndex]
        
        // Small delay to ensure audio system is ready
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.loadAndPlayCurrentSong()
        }
    }
    
    // MARK: - Audio Loading & Playback
    
    private func loadAndPlayCurrentSong() {
        guard let song = currentSong else { return }
        
        // Build full URL
        let baseURL = apiClient.baseURL
        let fullURL = song.url.hasPrefix("http") ? song.url : "\(baseURL)\(song.url)"
        
        guard let url = URL(string: fullURL) else {
            print("❌ MusicService: Invalid URL for song: \(fullURL)")
            playNext() // Skip to next
            return
        }
        
        // Check cache first
        let cachedPath = cacheDirectory.appendingPathComponent("\(song.id).mp3")
        if FileManager.default.fileExists(atPath: cachedPath.path) {
            loadFromCache(cachedPath)
            return
        }
        
        // Load from network
        Task {
            do {
                var request = URLRequest(url: url)
                ServerConfig.shared.addAPIKeyHeader(to: &request)
                
                let (data, response) = try await URLSession.shared.data(for: request)
                
                guard let httpResponse = response as? HTTPURLResponse,
                      httpResponse.statusCode == 200 else {
                    print("❌ MusicService: Failed to load song")
                    await MainActor.run {
                        self.playNext() // Skip to next
                    }
                    return
                }
                
                // Cache the file
                try? data.write(to: cachedPath)
                
                await MainActor.run {
                    self.playAudioData(data)
                }
            } catch {
                print("❌ MusicService: Error loading song: \(error)")
                await MainActor.run {
                    self.playNext() // Skip to next
                }
            }
        }
    }
    
    private func loadFromCache(_ path: URL) {
        guard let data = try? Data(contentsOf: path) else {
            print("⚠️ MusicService: Failed to read cached file")
            playNext()
            return
        }
        playAudioData(data)
    }
    
    private func playAudioData(_ data: Data) {
        // Ensure we're not creating multiple players
        if audioPlayer != nil {
            print("⚠️ MusicService: Audio player already exists, cleaning up first")
            audioPlayer?.stop()
            audioPlayer?.delegate = nil
            audioPlayer = nil
        }
        
        do {
            let player = try AVAudioPlayer(data: data)
            player.delegate = self
            player.numberOfLoops = (repeatMode == .one) ? -1 : 0
            player.volume = 0.5
            
            // Prepare before playing to reduce audio system load
            guard player.prepareToPlay() else {
                print("❌ MusicService: Failed to prepare audio player")
                playNext()
                return
            }
            
            guard player.play() else {
                print("❌ MusicService: Failed to start audio playback")
                playNext()
                return
            }
            
            audioPlayer = player
            isPlaying = true
            saveSettings()
            
            print("✅ MusicService: Now playing: \(currentSong?.displayName ?? "Unknown")")
        } catch {
            print("❌ MusicService: Failed to create audio player: \(error)")
            playNext() // Skip to next
        }
    }
    
    // MARK: - AVAudioPlayerDelegate
    
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        guard player == audioPlayer else { return }
        
        if repeatMode == .one {
            // Already looping, nothing to do
            return
        }
        
        // Move to next song
        playNext()
    }
    
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        print("❌ MusicService: Audio decode error: \(error?.localizedDescription ?? "Unknown")")
        playNext() // Skip corrupted file
    }
}

// MARK: - Settings Model

private struct MusicSettings: Codable {
    let isShuffleEnabled: Bool
    let isMusicEnabled: Bool
    let repeatMode: RepeatMode
    let currentIndex: Int
}

