//
//  CreatureBuilderAudioService.swift
//  abbies.world.ios
//
//  Embedded soundtrack for Creature Card Builder.
//

import AVFoundation
import Combine
import Foundation
import UIKit

final class CreatureBuilderAudioService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    struct Track: Equatable {
        let filename: String
        let title: String
    }

    @Published private(set) var currentTrackTitle = "Build a Beast"
    @Published private(set) var isPlaying = false
    @Published private(set) var loadError: String?

    private let tracks = [
        Track(filename: "creature_builder_build_a_beast", title: "Build a Beast"),
        Track(filename: "creature_builder_creature_of_your_dream", title: "Creature of Your Dream"),
        Track(filename: "creature_builder_we_ll_make_a_way", title: "We’ll Make a Way")
    ]

    private var player: AVAudioPlayer?
    private var currentIndex = 0

    override init() {
        super.init()
        configureAudioSession()
    }

    deinit {
        player?.stop()
    }

    func start() {
        guard !isPlaying else { return }
        if let player, player.currentTime > 0 {
            player.play()
            isPlaying = true
            log("resumed")
            return
        }
        playTrack(at: currentIndex)
    }

    func togglePlayback() {
        if isPlaying {
            player?.pause()
            isPlaying = false
            log("paused")
        } else {
            start()
        }
    }

    func playNext() {
        guard !tracks.isEmpty else { return }
        currentIndex = (currentIndex + 1) % tracks.count
        playTrack(at: currentIndex)
    }

    func stopAllAudio() {
        player?.stop()
        player = nil
        isPlaying = false
        log("stopped")
    }

    func audioPlayerDidFinishPlaying(
        _ player: AVAudioPlayer,
        successfully flag: Bool
    ) {
        if flag {
            playNext()
        } else {
            isPlaying = false
            log("playback_failed")
        }
    }

    func audioPlayerDecodeErrorDidOccur(
        _ player: AVAudioPlayer,
        error: Error?
    ) {
        isPlaying = false
        loadError = "This song could not be played."
        log("decode_failed", details: [
            "reason": error?.localizedDescription ?? "unknown"
        ])
    }

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            loadError = "Creature Lab music is unavailable."
            log("session_failed", details: [
                "reason": error.localizedDescription
            ])
        }
    }

    private func playTrack(at index: Int) {
        guard tracks.indices.contains(index) else { return }
        let track = tracks[index]
        currentTrackTitle = track.title
        loadError = nil

        guard let dataAsset = NSDataAsset(name: track.filename) else {
            isPlaying = false
            loadError = "Missing \(track.title)."
            log("track_missing", details: [
                "asset_name": track.filename
            ])
            return
        }

        do {
            let nextPlayer = try AVAudioPlayer(data: dataAsset.data)
            nextPlayer.delegate = self
            nextPlayer.numberOfLoops = 0
            nextPlayer.volume = 0.58
            nextPlayer.prepareToPlay()
            nextPlayer.play()
            player = nextPlayer
            isPlaying = true
            log("track_started", details: [
                "title": track.title,
                "index": index,
                "track_count": tracks.count
            ])
        } catch {
            player = nil
            isPlaying = false
            loadError = "This song could not be played."
            log("track_failed", details: [
                "title": track.title,
                "reason": error.localizedDescription
            ])
        }
    }

    private func log(
        _ event: String,
        details: [String: Any] = [:]
    ) {
        var payload = details
        payload["event"] = "creature_builder_audio.\(event)"

        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(
                  withJSONObject: payload,
                  options: [.sortedKeys]
              ),
              let json = String(data: data, encoding: .utf8) else {
            return
        }
        print("CREATURE_BUILDER_AUDIO_EVENT \(json)")
    }
}
