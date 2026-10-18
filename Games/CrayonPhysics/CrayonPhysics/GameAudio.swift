import AVFoundation

@MainActor
final class GameAudio {
    private var player: AVAudioPlayer?
    private var entered = false
    private(set) var playbackRequested = false
    private(set) var musicStyle: MusicStyle = .normal
    var isMusicPlaying: Bool { player?.isPlaying ?? false }
    var musicDuration: TimeInterval { player?.duration ?? 0 }
    var musicVolume: Float { player?.volume ?? 0 }
    private let managesAudioSession: Bool
    private var cues: [String: AVAudioPlayer] = [:]
    private var drawIdleTask: Task<Void, Never>?
    var soundsMuted = false { didSet { if soundsMuted { stopCues() } } }
    var muted = false { didSet { player?.volume = muted ? 0 : 0.25 } }
    private(set) var status = "No production music supplied"

    init(presentation: Presentation = .vanilla, managesAudioSession: Bool = true, musicStyle: MusicStyle = .normal) {
        self.managesAudioSession = managesAudioSession
        for (name, filename) in presentation.cueFilenames {
            if let url = GameResources.bundle.url(forResource: filename, withExtension: nil),
               let cue = try? AVAudioPlayer(contentsOf: url) {
                cue.numberOfLoops = name == "draw" ? -1 : 0
                cue.prepareToPlay()
                cues[name] = cue
            }
        }
        selectMusic(musicStyle)
    }

    func selectMusic(_ style: MusicStyle) {
        guard player == nil || style != musicStyle else { return }
        guard let url = GameResources.bundle.url(forResource: style.filename, withExtension: nil) else {
            status = "Music file is missing: \(style.title)"
            return
        }
        do {
            let replacement = try AVAudioPlayer(contentsOf: url)
            replacement.numberOfLoops = -1
            replacement.volume = muted ? 0 : 0.25
            replacement.prepareToPlay()
            player?.stop()
            player = replacement
            musicStyle = style
            status = "Music ready: \(style.title)"
            // A choice in a paused menu changes the prepared track, not playback.
            if entered && playbackRequested { replacement.play() }
        } catch { status = "Music failed to load: \(error.localizedDescription)" }
    }
    func enter() {
        entered = true
        if managesAudioSession {
            do {
                try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
                try AVAudioSession.sharedInstance().setActive(true)
            } catch { status = "Audio session failed: \(error.localizedDescription)" }
        }
        resume()
    }
    func resume() {
        guard entered else { return }
        playbackRequested = true
        player?.volume = muted ? 0 : 0.25
        player?.play()
    }
    func cue(_ name: String) {
        guard entered, !soundsMuted, let cue = cues[name] else { return }
        if name == "draw" {
            drawIdleTask?.cancel()
            if !cue.isPlaying { cue.volume = 0; cue.play() }
            cue.setVolume(0.65, fadeDuration: 0.04)
            drawIdleTask = Task { [weak self, weak cue] in
                try? await Task.sleep(for: .milliseconds(120))
                guard !Task.isCancelled else { return }
                cue?.setVolume(0, fadeDuration: 0.06)
                try? await Task.sleep(for: .milliseconds(80))
                guard !Task.isCancelled else { return }
                cue?.stop()
                self?.drawIdleTask = nil
            }
            return
        }
        cue.currentTime = 0
        cue.play()
    }
    func stopDrawing() { drawIdleTask?.cancel(); drawIdleTask = nil; cues["draw"]?.stop() }
    private func stopCues() { stopDrawing(); for cue in cues.values { cue.stop() } }
    func pause() { playbackRequested = false; player?.pause(); stopCues() }
    func leave() {
        entered = false
        playbackRequested = false
        player?.stop()
        stopCues()
        player?.currentTime = 0
        if managesAudioSession {
            try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        }
    }
}
