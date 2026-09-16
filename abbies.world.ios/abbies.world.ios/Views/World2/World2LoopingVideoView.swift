//
//  World2LoopingVideoView.swift
//  abbies.world.ios
//
//  Muted looping MP4 plate for World 2 map / POI surfaces.
//  Same player pattern as the World 2 intro, reusable by semantic bundle video.
//

import AVFoundation
import SwiftUI
import UIKit

struct World2LoopingVideoView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> World2LoopingVideoPlayerView {
        let view = World2LoopingVideoPlayerView()
        view.play(url: url)
        return view
    }

    func updateUIView(_ uiView: World2LoopingVideoPlayerView, context: Context) {
        uiView.play(url: url)
    }

    static func dismantleUIView(
        _ uiView: World2LoopingVideoPlayerView,
        coordinator: ()
    ) {
        uiView.stop()
    }
}

final class World2LoopingVideoPlayerView: UIView {
    private var queuePlayer: AVQueuePlayer?
    private var playerLooper: AVPlayerLooper?
    private var playingURL: URL?

    override class var layerClass: AnyClass {
        AVPlayerLayer.self
    }

    private var playerLayer: AVPlayerLayer {
        layer as! AVPlayerLayer
    }

    func play(url: URL) {
        if playingURL == url, queuePlayer != nil {
            return
        }
        stop()
        let player = AVQueuePlayer()
        player.isMuted = true
        playerLayer.player = player
        playerLayer.videoGravity = .resizeAspect
        playerLooper = AVPlayerLooper(
            player: player,
            templateItem: AVPlayerItem(url: url)
        )
        queuePlayer = player
        playingURL = url
        player.play()
    }

    func stop() {
        queuePlayer?.pause()
        playerLooper?.disableLooping()
        playerLayer.player = nil
        playerLooper = nil
        queuePlayer = nil
        playingURL = nil
    }
}
