//
//  VideoPlayerView.swift
//  abbies.world.ios
//
//  Video player component for playing MP4 videos in SwiftUI
//

import SwiftUI
import AVKit

struct VideoPlayerView: UIViewRepresentable {
    let videoName: String
    let isLooping: Bool
    
    init(videoName: String, isLooping: Bool = true) {
        self.videoName = videoName
        self.isLooping = isLooping
    }
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        let playerLayer = AVPlayerLayer()
        playerLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(playerLayer)
        
        context.coordinator.playerLayer = playerLayer
        context.coordinator.isLooping = isLooping
        context.coordinator.currentVideoName = videoName
        
        loadVideo(videoName: videoName, playerLayer: playerLayer, coordinator: context.coordinator)
        
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        guard let playerLayer = context.coordinator.playerLayer else { return }
        
        // Update frame when view size changes
        DispatchQueue.main.async {
            playerLayer.frame = uiView.bounds
        }
        
        // Check if video name changed
        if context.coordinator.currentVideoName != videoName {
            context.coordinator.currentVideoName = videoName
            context.coordinator.isLooping = isLooping
            loadVideo(videoName: videoName, playerLayer: playerLayer, coordinator: context.coordinator)
        }
    }
    
    private func loadVideo(videoName: String, playerLayer: AVPlayerLayer, coordinator: Coordinator) {
        // Remove old observer
        if let oldPlayer = playerLayer.player {
            NotificationCenter.default.removeObserver(
                coordinator,
                name: .AVPlayerItemDidPlayToEndTime,
                object: oldPlayer.currentItem
            )
        }
        
        // Load video from bundle
        guard let path = Bundle.main.path(forResource: videoName, ofType: "mp4") else {
            print("⚠️ Video file not found: \(videoName).mp4")
            return
        }
        
        let url = URL(fileURLWithPath: path)
        let player = AVPlayer(url: url)
        playerLayer.player = player
        
        // Set up looping
        if coordinator.isLooping {
            NotificationCenter.default.addObserver(
                coordinator,
                selector: #selector(Coordinator.playerDidFinishPlaying),
                name: .AVPlayerItemDidPlayToEndTime,
                object: player.currentItem
            )
        }
        
        // Start playing
        player.play()
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }
    
    class Coordinator: NSObject {
        var playerLayer: AVPlayerLayer?
        var currentVideoName: String?
        var isLooping: Bool = true
        
        @objc func playerDidFinishPlaying() {
            guard let player = playerLayer?.player, isLooping else { return }
            player.seek(to: .zero)
            player.play()
        }
    }
    
    static func dismantleUIView(_ uiView: UIView, coordinator: Coordinator) {
        coordinator.playerLayer?.player?.pause()
        coordinator.playerLayer?.player = nil
        NotificationCenter.default.removeObserver(coordinator)
    }
}

