import XCTest
@testable import CrayonPhysicsKit

final class MusicTests: XCTestCase {
    @MainActor
    func testAllCanonicalTracksDecodeWithoutStartingPlayback() {
        let audio = GameAudio(managesAudioSession: false)
        for style in MusicStyle.allCases {
            audio.selectMusic(style)
            XCTAssertEqual(audio.musicStyle, style)
            XCTAssertGreaterThan(audio.musicDuration, 100, style.title)
            XCTAssertFalse(audio.isMusicPlaying)
            XCTAssertFalse(audio.playbackRequested)
        }
    }

    @MainActor
    func testSelectionPersistsAndUnknownPreferenceUsesNormal() {
        let suite = "CrayonMusicTests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let initial = GameSession(defaults: defaults, managesAudioSession: false)
        XCTAssertEqual(initial.musicStyle, .normal)
        for style in MusicStyle.allCases {
            initial.musicStyle = style
            let reopened = GameSession(defaults: defaults, managesAudioSession: false)
            XCTAssertEqual(reopened.musicStyle, style)
            XCTAssertEqual(reopened.audio.musicStyle, style)
            XCTAssertFalse(reopened.audio.isMusicPlaying)
        }
        defaults.set("removed-style", forKey: "musicStyle")
        XCTAssertEqual(GameSession(defaults: defaults, managesAudioSession: false).musicStyle, .normal)
    }

    @MainActor
    func testSwitchingRespectsMutePauseAndExit() {
        let audio = GameAudio(managesAudioSession: false)
        audio.muted = true
        audio.enter()
        XCTAssertTrue(audio.playbackRequested)
        audio.selectMusic(.tense)
        XCTAssertEqual(audio.musicStyle, .tense)
        XCTAssertEqual(audio.musicVolume, 0)
        audio.pause()
        audio.selectMusic(.frenchHouse)
        XCTAssertFalse(audio.playbackRequested)
        XCTAssertFalse(audio.isMusicPlaying)
        audio.muted = false
        XCTAssertEqual(audio.musicVolume, 0.25, accuracy: 0.001)
        XCTAssertFalse(audio.isMusicPlaying, "Unmuting a paused menu must not start music")
        audio.muted = true
        audio.resume()
        XCTAssertTrue(audio.playbackRequested)
        audio.leave()
        audio.selectMusic(.pop)
        audio.resume()
        XCTAssertEqual(audio.musicStyle, .pop)
        XCTAssertFalse(audio.playbackRequested)
        XCTAssertFalse(audio.isMusicPlaying)
    }

    @MainActor
    func testMenuSelectionBackgroundAndReturnPreserveChoice() {
        let suite = "CrayonMusicLifecycle.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let session = GameSession(defaults: defaults, managesAudioSession: false)
        session.muted = true
        session.openBox()
        session.start()
        session.pause()
        session.musicStyle = .pop
        XCTAssertFalse(session.audio.isMusicPlaying)
        XCTAssertFalse(session.audio.playbackRequested)
        session.resume()
        XCTAssertTrue(session.audio.playbackRequested)
        session.backgrounded()
        session.musicStyle = .tense
        session.foregrounded()
        XCTAssertFalse(session.audio.playbackRequested)
        session.resume()
        XCTAssertTrue(session.audio.playbackRequested)
        session.returnToPlayroom()
        XCTAssertEqual(session.musicStyle, .tense)
        XCTAssertFalse(session.audio.isMusicPlaying)
        XCTAssertFalse(session.audio.playbackRequested)
    }
}
