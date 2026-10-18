import AVFoundation

@MainActor
final class GameAudio {
    private var player: AVAudioPlayer?
    private var entered = false
    private var cues: [String: AVAudioPlayer] = [:]
    private var drawIdleTask: Task<Void, Never>?
    var soundsMuted = false { didSet { if soundsMuted { stopCues() } } }
    var muted = false { didSet { player?.volume = muted ? 0 : 0.65 } }
    private(set) var status = "No production music supplied"

    init(presentation: Presentation = .vanilla) {
        for (name, filename) in presentation.cueFilenames {
            if let url = GameResources.bundle.url(forResource: filename, withExtension: nil),
               let cue = try? AVAudioPlayer(contentsOf: url) {
                cue.numberOfLoops = name == "draw" ? -1 : 0
                cue.prepareToPlay()
                cues[name] = cue
            }
        }
        guard let url = GameResources.bundle.url(forResource: presentation.musicFilename, withExtension: nil) else { return }
        do {
            player = try AVAudioPlayer(contentsOf: url)
            player?.numberOfLoops = -1
            player?.prepareToPlay()
            status = "Music ready"
        } catch { status = "Music failed to load: \(error.localizedDescription)" }
    }
    func enter() {
        entered = true
        do {
            try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch { status = "Audio session failed: \(error.localizedDescription)" }
        resume()
    }
    func resume() {
        guard entered else { return }
        player?.volume = muted ? 0 : 0.65
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
    func pause() { player?.pause(); stopCues() }
    func leave() {
        entered = false
        player?.stop()
        stopCues()
        player?.currentTime = 0
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
