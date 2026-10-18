import SwiftUI
import SpriteKit

@MainActor
final class GameSession: ObservableObject {
    enum Screen: Equatable { case playroom, title, playing, menu, levels, completed, ending, credits }
    enum Tool: String, CaseIterable { case draw = "Draw", erase = "Erase" }
    @Published var screen: Screen = .playroom
    @Published var tool: Tool = .draw { didSet { scene?.eraseMode = tool == .erase; if oldValue != tool { audio.cue("tap") } } }
    @Published private(set) var levelIndex = 0
    @Published private(set) var completed: Set<String>
    @Published private(set) var scene: CrayonScene?
    @Published var error: String?
    @Published var muted: Bool { didSet { defaults.set(muted, forKey: "musicMuted"); audio.muted = muted } }
    @Published var soundsMuted: Bool { didSet { defaults.set(soundsMuted, forKey: "soundsMuted"); audio.soundsMuted = soundsMuted } }
    @Published private(set) var catalog: LevelCatalog?
    let presentation: Presentation
    let audio: GameAudio
    let exitLabel: String
    private let onExit: () -> Void
    private let defaults: UserDefaults
    private var returnScreen: Screen = .title
    private var levelPickerOrigin: Screen = .title

    init(defaults: UserDefaults = .standard, presentation: Presentation = .vanilla,
         exitLabel: String = "Back to Playroom", managesAudioSession: Bool = true,
         onExit: @escaping () -> Void = {}) {
        self.defaults = defaults
        self.exitLabel = exitLabel
        self.onExit = onExit
        self.presentation = presentation
        audio = GameAudio(presentation: presentation, managesAudioSession: managesAudioSession)
        completed = Set(defaults.stringArray(forKey: "completedSourceLevels") ?? [])
        muted = defaults.bool(forKey: "musicMuted")
        soundsMuted = defaults.bool(forKey: "soundsMuted")
        do { catalog = try LevelCatalog.load() }
        catch { catalog = nil; self.error = error.localizedDescription }
        audio.muted = muted
        audio.soundsMuted = soundsMuted
    }

    func openBox() {
        guard screen == .playroom else { return }
        if catalog == nil { retryLoad(); return }
        screen = .title
        audio.enter()
        audio.cue("tap")
    }
    func retryLoad() {
        do { catalog = try LevelCatalog.load(); error = nil; screen = .title; audio.enter() }
        catch { self.error = error.localizedDescription; screen = .title }
    }
    func start(_ index: Int = 0, preserveTool: Bool = false) {
        guard let catalog, catalog.levels.indices.contains(index) else { return }
        scene?.cancelStroke()
        scene?.isPaused = true
        if !preserveTool { tool = .draw }
        levelIndex = index
        let newScene = CrayonScene(level: catalog.levels[index], sprites: catalog.sprites, presentation: presentation)
        newScene.onComplete = { [weak self] in self?.finishLevel() }
        newScene.onCue = { [weak self] name in self?.audio.cue(name) }
        newScene.onStrokeStopped = { [weak self] in self?.audio.stopDrawing() }
        newScene.scaleMode = .aspectFit
        newScene.eraseMode = tool == .erase
        scene = newScene
        screen = catalog.levels[index].isEnding ? .ending : .playing
        audio.resume()
        audio.cue("tap")
    }

    func reset() { start(levelIndex, preserveTool: true) }
    func pause() {
        guard screen == .playing || screen == .ending else { return }
        returnScreen = screen
        scene?.cancelStroke()
        scene?.isPaused = true
        screen = .menu
        audio.pause()
    }
    func resume() {
        guard screen == .menu else { return }
        screen = returnScreen
        scene?.isPaused = screen != .playing && screen != .ending
        if screen == .playing || screen == .ending || screen == .title { audio.resume() }
    }
    func selectLevels() {
        guard screen != .levels else { return }
        levelPickerOrigin = screen
        scene?.cancelStroke()
        scene?.isPaused = true
        audio.pause()
        screen = .levels
    }
    func closeLevels() {
        guard screen == .levels else { return }
        screen = levelPickerOrigin
        scene?.isPaused = screen != .playing && screen != .ending
        if screen == .playing || screen == .ending || screen == .title { audio.resume() }
    }
    func next() {
        guard screen == .completed else { return }
        start(levelIndex + 1)
    }
    func returnToPlayroom() {
        scene?.cancelStroke()
        scene?.isPaused = true
        scene = nil
        screen = .playroom
        audio.leave()
        onExit()
    }
    func suspendForHostDismissal() {
        scene?.cancelStroke()
        scene?.isPaused = true
        audio.leave()
    }
    func backgrounded() { if screen == .playing || screen == .ending { pause() }; audio.pause() }
    func foregrounded() { if screen == .title || screen == .credits { audio.resume() } }
    private func finishLevel() {
        guard screen == .playing, let catalog else { return }
        completed.insert(catalog.levels[levelIndex].id)
        defaults.set(completed.sorted(), forKey: "completedSourceLevels")
        scene?.cancelStroke()
        scene?.isPaused = true
        screen = .completed
    }
}
