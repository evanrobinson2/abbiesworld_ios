import AVFoundation
import Combine
import Foundation

/// Peglin Edition soundtrack — parent-supplied drops under Resources/Music/World2.
/// Voyage chart / title: Marble Voyage · Battle: Marble Time (+ legacy board rotation).
@MainActor
final class PlinkMusicService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    struct Track: Equatable {
        let id: String
        let filename: String
        let title: String
        let role: String
    }

    static let playlist: [Track] = [
        Track(
            id: "marble-voyage",
            filename: "plink_marble_voyage",
            title: "Marble Voyage",
            role: "safari"
        ),
        Track(
            id: "marble-time",
            filename: "plink_marble_time",
            title: "Marble Time",
            role: "play"
        ),
        Track(
            id: "meadow-remembers",
            filename: "plink_meadow_remembers",
            title: "Meadow Remembers",
            role: "safari"
        ),
        Track(
            id: "meadow-remembers-2",
            filename: "plink_meadow_remembers_2",
            title: "Meadow Remembers 2",
            role: "safari"
        ),
        Track(
            id: "abbies-world",
            filename: "plink_abbies_world",
            title: "Abbie's World",
            role: "safari"
        ),
        Track(
            id: "fell-from-the-blue",
            filename: "plink_fell_from_the_blue",
            title: "Fell From the Blue",
            role: "crash"
        ),
        Track(
            id: "things-in-the-grass",
            filename: "plink_things_in_the_grass",
            title: "Things in the Grass",
            role: "nature"
        ),
        Track(
            id: "music-box-battle",
            filename: "plink_music_box_battle",
            title: "Music Box Battle",
            role: "play"
        ),
        Track(
            id: "music-box-battle-2",
            filename: "plink_music_box_battle_2",
            title: "Music Box Battle 2",
            role: "play"
        ),
        Track(
            id: "music-box-techno",
            filename: "plink_music_box_techno",
            title: "Music-Box Techno",
            role: "blocks"
        ),
        Track(
            id: "music-box-techno-2",
            filename: "plink_music_box_techno_2",
            title: "Music-Box Techno 2",
            role: "blocks"
        ),
        Track(
            id: "cheerful-khorovod",
            filename: "plink_cheerful_khorovod",
            title: "Cheerful Round Dance",
            role: "play"
        ),
        Track(
            id: "electronic-folk-dance",
            filename: "plink_electronic_folk_dance",
            title: "Electronic Folk Dance",
            role: "blocks"
        ),
    ]

    /// Battle / board tracks that rotate when a fight song ends.
    static var boardTracks: [Track] {
        playlist.filter { $0.role == "play" || $0.role == "blocks" }
    }

    static var safariTracks: [Track] {
        playlist.filter { $0.role == "safari" }
    }

    @Published private(set) var currentTrackID = "marble-voyage"
    @Published private(set) var currentTrackTitle = "Marble Voyage"
    @Published private(set) var isPlaying = false

    private var player: AVAudioPlayer?
    private var fadingOut: AVAudioPlayer?
    /// When true, finished tracks auto-advance through the full playlist.
    private var autoAdvance = true
    private var boardRotateIndex = 0
    private var crossfadeToken = UUID()
    private let musicVolume: Float = 0.52
    private let crossfadeSeconds: TimeInterval = 0.85

    func playSafari() {
        autoAdvance = true
        play(id: "marble-voyage", loop: true, crossfade: true)
    }

    /// Voyage chart / title bed — Marble Voyage (variant2 keeps a meadow alternate).
    func playMeadow(variant2: Bool = false) {
        autoAdvance = true
        play(id: variant2 ? "meadow-remembers-2" : "marble-voyage", loop: true, crossfade: true)
    }

    func playBoard() {
        autoAdvance = true
        let board = Self.boardTracks
        guard !board.isEmpty else { return }
        // Prefer Marble Time first, then legacy battle / techno rotation.
        let preferred = [
            "marble-time",
            "music-box-battle",
            "music-box-battle-2",
            "music-box-techno",
            "music-box-techno-2",
        ]
        let ordered = preferred.compactMap { id in board.first { $0.id == id } }
            + board.filter { track in !preferred.contains(track.id) }
        guard !ordered.isEmpty else { return }
        let pick = ordered[boardRotateIndex % ordered.count]
        boardRotateIndex = (boardRotateIndex + 1) % ordered.count
        play(id: pick.id, loop: false, crossfade: true)
    }

    /// Player-picked track — loops until they skip or leave.
    func selectTrack(id: String) {
        autoAdvance = false
        play(id: id, loop: true, crossfade: true)
    }

    func cycleNext() {
        guard let idx = Self.playlist.firstIndex(where: { $0.id == currentTrackID }) else {
            selectTrack(id: Self.playlist[0].id)
            return
        }
        let next = Self.playlist[(idx + 1) % Self.playlist.count]
        selectTrack(id: next.id)
    }

    func cyclePrevious() {
        guard let idx = Self.playlist.firstIndex(where: { $0.id == currentTrackID }) else {
            selectTrack(id: Self.playlist[0].id)
            return
        }
        let prev = Self.playlist[(idx - 1 + Self.playlist.count) % Self.playlist.count]
        selectTrack(id: prev.id)
    }

    func stop() {
        crossfadeToken = UUID()
        fadingOut?.stop()
        fadingOut = nil
        player?.stop()
        player = nil
        isPlaying = false
        autoAdvance = false
    }

    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            guard flag, self.autoAdvance else { return }
            // Ignore the outgoing crossfade player finishing.
            guard player === self.player else { return }
            let board = Self.boardTracks
            if board.contains(where: { $0.id == self.currentTrackID }) {
                self.playBoard()
            } else {
                self.playSafari()
            }
        }
    }

    private func play(id: String, loop: Bool, crossfade: Bool) {
        guard let track = Self.playlist.first(where: { $0.id == id }) else { return }
        if currentTrackID == id, player?.isPlaying == true {
            return
        }
        currentTrackID = id
        currentTrackTitle = track.title
        guard let url = Self.url(for: track.filename) else {
            isPlaying = false
            World2Diagnostics.log("plink_music_missing", ["track": track.filename])
            return
        }
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
            let next = try AVAudioPlayer(contentsOf: url)
            next.delegate = self
            next.numberOfLoops = loop ? -1 : 0
            next.prepareToPlay()

            let outgoing = player
            fadingOut?.stop()
            fadingOut = nil

            if crossfade, let outgoing, outgoing.isPlaying {
                let token = UUID()
                crossfadeToken = token
                next.volume = 0
                next.play()
                player = next
                isPlaying = true
                fadingOut = outgoing
                let steps = 18
                let stepTime = crossfadeSeconds / Double(steps)
                for step in 0...steps {
                    DispatchQueue.main.asyncAfter(deadline: .now() + stepTime * Double(step)) {
                        guard self.crossfadeToken == token else { return }
                        let t = Float(step) / Float(steps)
                        self.player?.volume = self.musicVolume * t
                        self.fadingOut?.volume = self.musicVolume * (1 - t)
                        if step == steps {
                            self.fadingOut?.stop()
                            self.fadingOut = nil
                        }
                    }
                }
            } else {
                outgoing?.stop()
                next.volume = musicVolume
                next.play()
                player = next
                isPlaying = true
            }
            World2Diagnostics.log("plink_music_play", ["track": id, "loop": loop ? "1" : "0"])
        } catch {
            player = nil
            isPlaying = false
            World2Diagnostics.log(
                "plink_music_failed",
                ["track": track.filename, "error": error.localizedDescription]
            )
        }
    }

    private static func url(for filename: String) -> URL? {
        let subdirs = ["Resources/Music/World2", "Music/World2", nil as String?]
        for sub in subdirs {
            if let url = Bundle.main.url(
                forResource: filename,
                withExtension: "mp3",
                subdirectory: sub
            ) {
                return url
            }
        }
        return Bundle.main.url(forResource: filename, withExtension: "mp3")
    }
}
