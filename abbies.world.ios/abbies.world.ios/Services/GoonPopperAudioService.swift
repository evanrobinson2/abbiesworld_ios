//
//  GoonPopperAudioService.swift
//  abbies.world.ios
//
//  Audio service for Goon Popper Minigame
//  Follows the BaseGameAudioService pattern for consistent audio coordination
//

import Foundation
import AVFoundation
import Combine

class GoonPopperAudioService: BaseGameAudioService {
    // Asset base URL - uses centralized ServerConfig
    // Music is in the music/goonpopper folder
    override var assetBaseURL: String {
        let base = ServerConfig.shared.baseURL
        return "\(base)/static/assets/music/goonpopper"
    }
    
    // Music filename - change this if your file has a different name
    override var musicFilename: String {
        return "background.mp3"
    }
}
