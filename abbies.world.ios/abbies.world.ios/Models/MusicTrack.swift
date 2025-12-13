//
//  MusicTrack.swift
//  abbies.world.ios
//
//  Model for music track metadata
//

import Foundation

struct MusicTrack: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let url: String // Server path like "/static/assets/music/song.mp3"
    let size: Int
    let mimeType: String
    
    // Display name (cleaned up)
    var displayName: String {
        name.replacingOccurrences(of: ".mp3", with: "")
            .replacingOccurrences(of: "_", with: " ")
            .capitalized
    }
    
    // Initialize from Asset
    init(from asset: Asset) {
        self.id = asset.id
        self.name = asset.name
        self.url = asset.url
        self.size = asset.size
        self.mimeType = asset.mimeType
    }
    
    // Direct initializer
    init(id: String, name: String, url: String, size: Int, mimeType: String) {
        self.id = id
        self.name = name
        self.url = url
        self.size = size
        self.mimeType = mimeType
    }
}

enum RepeatMode: String, Codable {
    case all = "all"
    case one = "one"
    case none = "none"
}

