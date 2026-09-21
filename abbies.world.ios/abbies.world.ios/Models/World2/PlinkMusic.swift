import AVFoundation
import Combine
import Foundation
import UIKit

/// Temporary Plink soundtrack: three parent-supplied pieces. Beds may pick
/// a track later; until then safari plays Abbie's World and the board rotates
/// Cheerful Dance with Blocks in the Game.
final class PlinkMusicService: NSObject, ObservableObject, AVAudioPlayerDelegate {
    struct Track: Equatable {
        let id: String
        let filename: String
        let title: String
        let role: String
    }

    static let playlist = [
        Track(
            id: "abbies-world",
            filename: "world2_plink_music_abbiesWorld",
            title: "Abbie's World",
            role: "safari"
        ),
        Track(
            id: "cheerful-dance",
            filename: "world2_plink_music_cheerfulDance",
            title: "Cheerful Dance",
            role: "play"
        ),
        Track(
            id: "blocks-in-the-game",
            filename: "world2_plink_music_blocksInTheGame",
            title: "Blocks in the Game",
            role: "blocks"
        ),
    ]

    @Published private(set) var currentTrackTitle = "Abbie's World"
    @Published private(set) var isPlaying = false

    private var player: AVAudioPlayer?
    private var currentIndex = 0
    private var boardRotation = false

    func playSafari() {
        boardRotation = false
        play(id: "abbies-world", loop: true)
    }

    func playBoard() {
        boardRotation = true
        play(id: "cheerful-dance", loop: false)
    }

    func stop() {
        player?.stop()
        player = nil
        isPlaying = false
        boardRotation = false
    }

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        guard flag, boardRotation else {
            if boardRotation == false {
                playSafari()
            }
            return
        }
        let boardTracks = Self.playlist.filter { $0.role != "safari" }
        let currentID = Self.playlist.indices.contains(currentIndex)
            ? Self.playlist[currentIndex].id
            : "cheerful-dance"
        let next = boardTracks.first { $0.id != currentID } ?? boardTracks[0]
        play(id: next.id, loop: false)
    }

    private func play(id: String, loop: Bool) {
        guard let index = Self.playlist.firstIndex(where: { $0.id == id }) else { return }
        let track = Self.playlist[index]
        currentIndex = index
        currentTrackTitle = track.title
        guard let asset = NSDataAsset(name: track.filename) else {
            isPlaying = false
            return
        }
        do {
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
            let next = try AVAudioPlayer(data: asset.data)
            next.delegate = self
            next.numberOfLoops = loop ? -1 : 0
            next.volume = 0.58
            next.prepareToPlay()
            next.play()
            player = next
            isPlaying = true
        } catch {
            player = nil
            isPlaying = false
        }
    }
}
