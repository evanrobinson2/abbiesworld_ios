import AVFoundation
import Foundation

/// Short battle / voyage cues — Kenney Interface Sounds + UI Audio (CC0).
/// Files live under Resources/SFX/Plink/ (copied flat into the app bundle).
enum PlinkSFX {
    enum Cue: String, CaseIterable {
        case hit
        case pop
        case crit
        case launch
        case miss
        case win
        case hurt
        case ui
        /// Marble snaps into the deck.
        case drop
        /// Path march footfall / whoosh.
        case march
        /// Deck is “ready enough” (≥3).
        case ready
        /// Turbo armed release — punchy layered hits.
        case turbo

        var filenames: [String] {
            switch self {
            case .hit: return ["plink_hit_a", "plink_hit_b", "plink_hit_c"]
            case .pop: return ["plink_pop"]
            case .crit: return ["plink_hit_a", "plink_pop"]
            case .launch: return ["plink_launch"]
            case .miss: return ["plink_hurt", "plink_hit_b"]
            case .win: return ["plink_pop", "plink_hit_a"]
            case .hurt: return ["plink_hurt"]
            case .ui: return ["plink_ui"]
            case .drop: return ["plink_pop"]
            case .march: return ["plink_launch"]
            case .ready: return ["plink_hit_b"]
            case .turbo: return ["plink_crit", "plink_launch"]
            }
        }

        var volume: Float {
            switch self {
            case .hit: return 0.55
            case .pop: return 0.58
            case .crit: return 0.6
            case .launch: return 0.5
            case .miss: return 0.55
            case .win: return 0.72
            case .hurt: return 0.58
            case .ui: return 0.42
            case .drop: return 0.52
            case .march: return 0.45
            case .ready: return 0.55
            case .turbo: return 0.78
            }
        }
    }

    private static let lock = NSLock()
    private static var players: [AVAudioPlayer] = []
    private static var hitRotate = 0
    private static var dropRotate = 0
    private static var sessionReady = false

    static func play(_ cue: Cue) {
        let names = cue.filenames
        guard !names.isEmpty else { return }
        let name: String
        lock.lock()
        switch cue {
        case .hit:
            hitRotate = (hitRotate + 1) % names.count
            name = names[hitRotate]
        case .drop:
            dropRotate = (dropRotate + 1) % names.count
            name = names[dropRotate]
        case .turbo:
            // Layer punch + launch — play first immediately, second staggered.
            name = names[0]
            lock.unlock()
            playFile(name, volume: cue.volume)
            if names.count > 1 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                    playFile(names[1], volume: cue.volume * 0.85)
                }
            }
            return
        default:
            name = names[0]
        }
        lock.unlock()
        playFile(name, volume: cue.volume)
    }

    private static func playFile(_ name: String, volume: Float) {
        guard let url = url(for: name) else {
            World2Diagnostics.log("plink_sfx_missing", ["file": name])
            return
        }

        let work = {
            prepareSession()
            lock.lock()
            players.removeAll { !$0.isPlaying }
            lock.unlock()
            do {
                let player = try AVAudioPlayer(contentsOf: url)
                player.volume = volume
                player.prepareToPlay()
                player.play()
                lock.lock()
                players.append(player)
                if players.count > 28 {
                    players.removeFirst(players.count - 28)
                }
                lock.unlock()
            } catch {
                World2Diagnostics.log(
                    "plink_sfx_failed",
                    ["file": name, "error": error.localizedDescription]
                )
            }
        }

        if Thread.isMainThread {
            work()
        } else {
            DispatchQueue.main.async(execute: work)
        }
    }

    private static func prepareSession() {
        guard !sessionReady else { return }
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
            sessionReady = true
        } catch {
            World2Diagnostics.log(
                "plink_sfx_session_failed",
                ["error": error.localizedDescription]
            )
        }
    }

    private static func url(for filename: String) -> URL? {
        let subdirs: [String?] = ["Resources/SFX/Plink", "SFX/Plink", nil]
        for sub in subdirs {
            if let url = Bundle.main.url(
                forResource: filename,
                withExtension: "wav",
                subdirectory: sub
            ) {
                return url
            }
        }
        // Flat copy into bundle root (common with synchronized resource groups).
        if let url = Bundle.main.url(forResource: filename, withExtension: "wav") {
            return url
        }
        // Last resort: walk the bundle for a matching stem (survives nested folders).
        if let root = Bundle.main.resourceURL {
            let matches = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil)?
                .compactMap { $0 as? URL }
                .filter { $0.lastPathComponent == "\(filename).wav" }
            return matches?.first
        }
        return nil
    }
}
