//
//  MusicService.swift
//  abbies.world.ios
//
//  Background music playback service
//

import Foundation
import UIKit
import AVFoundation
import Combine

class MusicService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    static let shared = MusicService()
    
    private let apiClient = APIClient.shared
    private var activeMediaPack: MediaPack = .classic
    
    // Published state
    @Published var isPlaying: Bool = false
    @Published var currentSong: MusicTrack?
    @Published var playlist: [MusicTrack] = []
    @Published var isShuffleEnabled: Bool = false
    @Published var isMusicEnabled: Bool = true
    @Published var repeatMode: RepeatMode = .all
    @Published var isLoading: Bool = false
    @Published var currentSongArtwork: UIImage? = nil // Album art from MP3 metadata
    @Published var isMuted: Bool = false
    
    // Playback state
    private var audioPlayer: AVAudioPlayer?
    private var outgoingPlayer: AVAudioPlayer?
    private var transitionToken = UUID()
    private let songFadeDuration: TimeInterval = 0.5
    private var currentIndex: Int = 0
    private var shuffledQueue: [Int] = []
    private var wasPlayingBeforeGame: Bool = false
    private var wasPlayingBeforeInterruption: Bool = false
    private var audibleVolume: Float { isMuted ? 0 : 0.5 }
    
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
        if ProcessInfo.processInfo.arguments.contains("-mediaPackHalloween") {
            activeMediaPack = .halloween
        } else if ProcessInfo.processInfo.arguments.contains("-mediaPackAnimals") {
            activeMediaPack = .animalAvenue
        } else if ProcessInfo.processInfo.arguments.contains("-mediaPackAdventure") {
            activeMediaPack = .adventure
        } else if let savedPack = UserDefaults.standard.string(forKey: "mediaPack"),
                  let mediaPack = MediaPack(rawValue: savedPack) {
            activeMediaPack = mediaPack
        }
        setupAudioSession()
        loadSettings()
        setupInterruptionHandling()
        loadPlaylist(autostart: false)
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
            isMuted = settings.isMuted
        }
    }
    
    private func saveSettings() {
        let settings = MusicSettings(
            isShuffleEnabled: isShuffleEnabled,
            isMusicEnabled: isMusicEnabled,
            repeatMode: repeatMode,
            currentIndex: currentIndex,
            isMuted: isMuted
        )
        if let data = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(data, forKey: settingsKey)
        }
    }
    
    // MARK: - Playlist Loading

    func setMediaPack(_ mediaPack: MediaPack) {
        guard mediaPack != activeMediaPack else { return }

        stop()
        currentSong = nil
        playlist = []
        currentIndex = 0
        shuffledQueue = []
        activeMediaPack = mediaPack

        loadPlaylist()
    }
    
    func loadPlaylist(autostart: Bool = true) {
        clearCache()
        isLoading = false

        playlist = Self.bundledWorld2Tracks()
        currentIndex = min(max(currentIndex, 0), max(playlist.count - 1, 0))
        currentSong = playlist.indices.contains(currentIndex) ? playlist[currentIndex] : nil
        shuffledQueue = []
        if isShuffleEnabled {
            generateShuffleQueue()
        }
        print("🎵 MusicService: Loaded \(playlist.count) bundled World 2 tracks")

        if autostart && isMusicEnabled && !playlist.isEmpty {
            play()
        }
    }

    /// Everyday World 2 + Peglin Edition soundtrack shipped in the app bundle.
    /// Document `songs[]` can add/override; an empty document must not silence play.
    static func bundledWorld2Tracks() -> [MusicTrack] {
        // (playlistId, filename without ext, display name, ext)
        let definitions: [(String, String, String, String)] = [
            ("world2_abbies_world", "abbies_world", "Abbie's World", "mp3"),
            ("world2_glassy_bells", "glassy_bells", "Glassy Bells", "mp3"),
            ("world2_ciel_de_lumiere", "ciel_de_lumiere", "Ciel de Lumière", "mp3"),
            ("world2_bright_new_day", "bright_new_day", "Bright New Day", "m4a"),
            ("world2_cliffside_morning", "cliffside_morning", "Cliffside Morning", "m4a"),
            ("world2_family_adventure", "family_adventure", "Family Adventure", "m4a"),
            ("world2_joyful_bounce", "joyful_bounce", "Joyful Bounce", "m4a"),
            ("world2_well_make_a_way", "well_make_a_way", "We’ll Make a Way", "m4a"),
            ("world2_working_song", "working_song", "Working Song", "m4a"),
            // Peglin / Plink parent drops (also used as scene musicTrackID).
            ("plink_abbies_world", "plink_abbies_world", "Abbie's World (Peglin)", "mp3"),
            ("plink_fell_from_the_blue", "plink_fell_from_the_blue", "Fell From the Blue", "mp3"),
            ("plink_things_in_the_grass", "plink_things_in_the_grass", "Things in the Grass", "mp3"),
            ("plink_cheerful_khorovod", "plink_cheerful_khorovod", "Cheerful Round Dance", "mp3"),
            ("plink_electronic_folk_dance", "plink_electronic_folk_dance", "Electronic Folk Dance", "mp3"),
        ]

        return definitions.compactMap { playlistId, file, name, ext -> MusicTrack? in
            let remote = AssetBootstrapService.shared.cachedFileURL(named: file)
            guard let url = remote
                ?? Bundle.main.url(
                    forResource: file,
                    withExtension: ext,
                    subdirectory: "Resources/Music/World2"
                )
                ?? Bundle.main.url(forResource: file, withExtension: ext) else {
                print("❌ MusicService: Missing World 2 track: \(file).\(ext)")
                return nil
            }

            let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            return MusicTrack(
                id: playlistId,
                name: name,
                url: url.absoluteString,
                size: size,
                mimeType: ext == "mp3" ? "audio/mpeg" : "audio/mp4"
            )
        }
    }

    /// Merge household document songs on top of the bundled smattering.
    /// Never replace with an empty list — that was silencing Peglin Edition.
    func reloadContentPlaylist() {
        guard World2WorldSync.shared.usesServerDocument else { return }
        var byID = Dictionary(uniqueKeysWithValues: Self.bundledWorld2Tracks().map { ($0.id, $0) })
        for song in World2WorldSync.shared.songs {
            let url = AssetBootstrapService.shared.cachedFileURL(named: song.file)
                ?? Bundle.main.url(forResource: song.file, withExtension: "mp3")
                ?? Bundle.main.url(forResource: song.file, withExtension: "m4a")
                ?? Bundle.main.url(
                    forResource: song.file,
                    withExtension: "mp3",
                    subdirectory: "Resources/Music/World2"
                )
            guard let url else { continue }
            let ext = url.pathExtension.lowercased()
            byID[song.id] = MusicTrack(
                id: song.id,
                name: song.name,
                url: url.absoluteString,
                size: 0,
                mimeType: ext == "mp3" ? "audio/mpeg" : "audio/mp4"
            )
            // Scene musicTrackID often matches the file stem.
            if byID[song.file] == nil {
                byID[song.file] = MusicTrack(
                    id: song.file,
                    name: song.name,
                    url: url.absoluteString,
                    size: 0,
                    mimeType: ext == "mp3" ? "audio/mpeg" : "audio/mp4"
                )
            }
        }
        playlist = Array(byID.values).sorted { $0.name < $1.name }
        currentIndex = 0
        currentSong = playlist.first
        shuffledQueue = []
        print("🎵 MusicService: Content playlist \(playlist.count) tracks (bundled + document)")
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
    
    private func clearCache() {
        UserDefaults.standard.removeObject(forKey: playlistCacheKey)
        UserDefaults.standard.removeObject(forKey: playlistTimestampKey)
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
        let token = UUID()
        transitionToken = token
        let players = [audioPlayer, outgoingPlayer].compactMap { $0 }
        outgoingPlayer = nil
        guard !players.isEmpty else {
            isPlaying = false
            currentSongArtwork = nil
            saveSettings()
            return
        }
        for player in players {
            player.setVolume(0, fadeDuration: songFadeDuration)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + songFadeDuration) { [weak self] in
            guard let self, self.transitionToken == token else { return }
            for player in players {
                player.stop()
                player.delegate = nil
            }
            if let current = self.audioPlayer, players.contains(where: { $0 === current }) {
                self.audioPlayer = nil
            }
            self.isPlaying = false
            self.currentSongArtwork = nil
            self.saveSettings()
        }
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
    
    func toggleMute() {
        isMuted.toggle()
        audioPlayer?.volume = audibleVolume
        saveSettings()
    }
    
    func playSong(_ track: MusicTrack) {
        guard let index = playlist.firstIndex(where: { $0.id == track.id }) else {
            print("⚠️ MusicService: Track not found in playlist")
            return
        }
        
        print("🎵 MusicService: Switching to song: \(track.displayName)")
        currentIndex = index
        currentSong = track
        currentSongArtwork = nil
        loadAndPlayCurrentSong()
    }

    func playSong(id: String) {
        if currentSong?.id == id, isPlaying {
            return
        }
        if let track = playlist.first(where: { $0.id == id }) {
            playSong(track)
            return
        }
        // Bundled Peglin / World2 cue not yet merged into playlist (empty songs[] wipe).
        if let bundled = Self.bundledWorld2Tracks().first(where: { $0.id == id }) {
            playlist.append(bundled)
            playSong(bundled)
            return
        }
        print("⚠️ MusicService: Track not found in playlist: \(id)")
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
    
    func playNext() {
        guard let nextIndex = getNextIndex() else {
            // No more songs
            stop()
            return
        }
        
        currentIndex = nextIndex
        currentSong = playlist[nextIndex]
        currentSongArtwork = nil
        loadAndPlayCurrentSong()
    }
    
    func playPrevious() {
        guard let previousIndex = getPreviousIndex() else {
            // No previous song, restart current
            if let player = audioPlayer {
                player.currentTime = 0
                if !player.isPlaying {
                    player.play()
                    isPlaying = true
                }
            }
            return
        }
        
        currentIndex = previousIndex
        currentSong = playlist[previousIndex]
        currentSongArtwork = nil
        loadAndPlayCurrentSong()
    }
    
    private func getPreviousIndex() -> Int? {
        guard !playlist.isEmpty else { return nil }
        
        if isShuffleEnabled {
            // Find current position in shuffle queue
            if let currentPos = shuffledQueue.firstIndex(of: currentIndex) {
                let previousPos = currentPos - 1
                if previousPos >= 0 {
                    return shuffledQueue[previousPos]
                } else if repeatMode == .all {
                    // Loop to end of shuffle queue
                    return shuffledQueue.last
                }
            }
        } else {
            // Normal order
            let previousIndex = currentIndex - 1
            if previousIndex >= 0 {
                return previousIndex
            } else if repeatMode == .all {
                return playlist.count - 1 // Loop to end
            }
        }
        
        return nil // No previous song
    }
    
    // MARK: - Audio Loading & Playback
    
    private func loadAndPlayCurrentSong() {
        guard let song = currentSong else { return }

        if let bundledURL = URL(string: song.url), bundledURL.isFileURL {
            loadBundledTrack(bundledURL)
            return
        }
        
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

    private func loadBundledTrack(_ url: URL) {
        do {
            let player = try AVAudioPlayer(contentsOf: url)
            prepareAndPlay(player)
        } catch {
            print("❌ MusicService: Failed to load bundled track \(url.lastPathComponent): \(error)")
            playNext()
        }
    }
    
    private func loadFromCache(_ path: URL) {
        guard let data = try? Data(contentsOf: path) else {
            print("⚠️ MusicService: Failed to read cached file")
            playNext()
            return
        }
        // Extract artwork and play
        playAudioData(data)
    }
    
    private func playAudioData(_ data: Data) {
        do {
            let player = try AVAudioPlayer(data: data)
            prepareAndPlay(player)
        } catch {
            print("❌ MusicService: Failed to create audio player: \(error)")
            playNext() // Skip to next
        }
    }

    private func prepareAndPlay(_ player: AVAudioPlayer) {
        let token = UUID()
        transitionToken = token

        if let parked = outgoingPlayer {
            parked.stop()
            parked.delegate = nil
        }
        if let current = audioPlayer, current !== player {
            current.delegate = nil
            current.setVolume(0, fadeDuration: songFadeDuration)
            outgoingPlayer = current
            DispatchQueue.main.asyncAfter(deadline: .now() + songFadeDuration) { [weak self, weak current] in
                guard let self, let current else { return }
                guard self.outgoingPlayer === current else { return }
                current.stop()
                self.outgoingPlayer = nil
            }
        }

        player.delegate = self
        player.numberOfLoops = (repeatMode == .one) ? -1 : 0
        player.volume = 0

        guard player.prepareToPlay(), player.play() else {
            print("❌ MusicService: Failed to prepare or start audio player")
            playNext()
            return
        }

        if audibleVolume > 0 {
            player.setVolume(audibleVolume, fadeDuration: songFadeDuration)
        }
        audioPlayer = player
        isPlaying = true
        saveSettings()
        print("✅ MusicService: Now playing: \(currentSong?.displayName ?? "Unknown")")
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
    let isMuted: Bool
    
    enum CodingKeys: String, CodingKey {
        case isShuffleEnabled, isMusicEnabled, repeatMode, currentIndex, isMuted
    }
    
    // Regular initializer for creating instances
    init(isShuffleEnabled: Bool, isMusicEnabled: Bool, repeatMode: RepeatMode, currentIndex: Int, isMuted: Bool) {
        self.isShuffleEnabled = isShuffleEnabled
        self.isMusicEnabled = isMusicEnabled
        self.repeatMode = repeatMode
        self.currentIndex = currentIndex
        self.isMuted = isMuted
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        isShuffleEnabled = try container.decode(Bool.self, forKey: .isShuffleEnabled)
        isMusicEnabled = try container.decode(Bool.self, forKey: .isMusicEnabled)
        repeatMode = try container.decode(RepeatMode.self, forKey: .repeatMode)
        currentIndex = try container.decode(Int.self, forKey: .currentIndex)
        isMuted = try container.decodeIfPresent(Bool.self, forKey: .isMuted) ?? false
    }
}

