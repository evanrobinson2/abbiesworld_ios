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

        var filenames: [String] {
            switch self {
            case .hit: return ["plink_hit_a", "plink_hit_b", "plink_hit_c"]
            case .pop: return ["plink_pop"]
            case .crit: return ["plink_crit"]
            case .launch: return ["plink_launch"]
            case .miss: return ["plink_miss"]
            case .win: return ["plink_win"]
            case .hurt: return ["plink_hurt"]
            case .ui: return ["plink_ui", "plink_ui_click"]
            case .drop: return ["plink_pop", "plink_ui_click"]
            case .march: return ["plink_launch"]
            case .ready: return ["plink_crit"]
            }
        }

        var volume: Float {
            switch self {
            case .hit: return 0.55
            case .pop: return 0.58
            case .crit: return 0.62
            case .launch: return 0.5
            case .miss: return 0.58
            case .win: return 0.7
            case .hurt: return 0.58
            case .ui: return 0.48
            case .drop: return 0.52
            case .march: return 0.45
            case .ready: return 0.55
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
        default:
            name = names[0]
        }
        lock.unlock()

        guard let url = url(for: name) else {
            World2Diagnostics.log("plink_sfx_missing", ["cue": cue.rawValue, "file": name])
            return
        }

        let work = {
            prepareSession()
            lock.lock()
            players.removeAll { !$0.isPlaying }
            lock.unlock()
            do {
                let player = try AVAudioPlayer(contentsOf: url)
                player.volume = cue.volume
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
                    ["cue": cue.rawValue, "error": error.localizedDescription]
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
