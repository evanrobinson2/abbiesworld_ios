//
//  AssetManifestModels.swift
//  abbies.world.ios
//
//  Data models for the asset manifest system in Abbie's World 2.
//

import Foundation

enum AssetType: String, Codable, CaseIterable {
    case map
    case poiExterior = "poi_exterior"
    case poiInterior = "poi_interior"
    case logo
    case background
    case decoration
    case ingredientArt = "ingredient_art"
    case cardFrame = "card_frame"
    case cardBack = "card_back"
    case hudIcon = "hud_icon"
    case gameIcon = "game_icon"
    case rewardIcon = "reward_icon"
    case vfx
    case sfx
    case music
    case minigameAsset = "minigame_asset"
    
    var displayName: String {
        switch self {
        case .map: return "Map"
        case .poiExterior: return "POI Exterior"
        case .poiInterior: return "POI Interior"
        case .logo: return "Logo"
        case .background: return "Background"
        case .decoration: return "Decoration"
        case .ingredientArt: return "Ingredient Art"
        case .cardFrame: return "Card Frame"
        case .cardBack: return "Card Back"
        case .hudIcon: return "HUD Icon"
        case .gameIcon: return "Game Icon"
        case .rewardIcon: return "Reward Icon"
        case .vfx: return "VFX"
        case .sfx: return "Sound Effect"
        case .music: return "Music"
        case .minigameAsset: return "Minigame Asset"
        }
    }
    
    var fileExtensions: [String] {
        switch self {
        case .music: return ["mp3", "m4a", "wav"]
        case .sfx: return ["mp3", "m4a", "wav", "aiff"]
        case .vfx: return ["json", "png"]
        default: return ["png", "jpg", "webp"]
        }
    }
}

enum AssetPriority: Int, Codable, Comparable {
    case critical = 0
    case required = 1
    case recommended = 2
    case optional = 3
    
    static func < (lhs: AssetPriority, rhs: AssetPriority) -> Bool {
        lhs.rawValue < rhs.rawValue
    }
    
    var displayName: String {
        switch self {
        case .critical: return "Critical"
        case .required: return "Required"
        case .recommended: return "Recommended"
        case .optional: return "Optional"
        }
    }
}

struct AssetManifest: Codable {
    let version: Int
    let lastUpdated: Date
    let baseUrl: String
    let assets: [AssetEntry]
    
    struct AssetEntry: Codable, Identifiable {
        let id: String
        let type: AssetType
        let url: String
        let version: Int
        let hash: String
        let size: Int
        let dimensions: Dimensions?
        let transparencyRequired: Bool?
        let priority: AssetPriority
        let usage: [String]?
        let mapId: String?
        let poiId: String?
        let tags: [String]?
        let metadata: [String: String]?
        
        struct Dimensions: Codable {
            let width: Int
            let height: Int
        }
        
        var isRequired: Bool {
            priority == .critical || priority == .required
        }
        
        var fullUrl: String {
            url.hasPrefix("http") ? url : ""
        }
    }
    
    var requiredAssets: [AssetEntry] {
        assets.filter { $0.isRequired }
    }
    
    var optionalAssets: [AssetEntry] {
        assets.filter { !$0.isRequired }
    }
    
    func assets(ofType type: AssetType) -> [AssetEntry] {
        assets.filter { $0.type == type }
    }
    
    func asset(byId id: String) -> AssetEntry? {
        assets.first { $0.id == id }
    }
    
    func assets(forMap mapId: String) -> [AssetEntry] {
        assets.filter { $0.mapId == mapId }
    }
    
    func assets(forPOI poiId: String) -> [AssetEntry] {
        assets.filter { $0.poiId == poiId }
    }
}

struct LocalAssetCache: Codable {
    var cachedAssets: [CachedAsset]
    var lastSyncedManifestVersion: Int
    var lastSyncedAt: Date
    
    struct CachedAsset: Codable, Identifiable {
        let id: String
        let localPath: String
        let version: Int
        let hash: String
        let downloadedAt: Date
        var lastAccessedAt: Date
        
        func isUpToDate(with entry: AssetManifest.AssetEntry) -> Bool {
            version >= entry.version && hash == entry.hash
        }
    }
    
    func cachedAsset(byId id: String) -> CachedAsset? {
        cachedAssets.first { $0.id == id }
    }
    
    mutating func updateCachedAsset(_ asset: CachedAsset) {
        if let index = cachedAssets.firstIndex(where: { $0.id == asset.id }) {
            cachedAssets[index] = asset
        } else {
            cachedAssets.append(asset)
        }
    }
    
    mutating func removeCachedAsset(byId id: String) {
        cachedAssets.removeAll { $0.id == id }
    }
    
    static var empty: LocalAssetCache {
        LocalAssetCache(
            cachedAssets: [],
            lastSyncedManifestVersion: 0,
            lastSyncedAt: Date.distantPast
        )
    }
}

struct AssetDownloadProgress: Identifiable {
    let id: String
    let assetId: String
    let assetName: String
    var bytesDownloaded: Int64
    var totalBytes: Int64
    var status: DownloadStatus
    
    enum DownloadStatus {
        case pending
        case downloading
        case completed
        case failed(Error)
        case cancelled
    }
    
    var progress: Double {
        guard totalBytes > 0 else { return 0 }
        return Double(bytesDownloaded) / Double(totalBytes)
    }
    
    var isComplete: Bool {
        if case .completed = status { return true }
        return false
    }
}

struct BootstrapState {
    var phase: Phase
    var manifestVersion: Int?
    var totalAssets: Int
    var downloadedAssets: Int
    var currentDownloads: [AssetDownloadProgress]
    var errors: [BootstrapError]
    
    enum Phase {
        case idle
        case fetchingManifest
        case comparingAssets
        case downloadingAssets
        case verifying
        case ready
        case failed
    }
    
    struct BootstrapError: Identifiable {
        let id = UUID()
        let assetId: String?
        let message: String
        let underlyingError: Error?
        let timestamp: Date
    }
    
    var overallProgress: Double {
        guard totalAssets > 0 else { return 0 }
        return Double(downloadedAssets) / Double(totalAssets)
    }
    
    var isReady: Bool {
        phase == .ready
    }
    
    static var initial: BootstrapState {
        BootstrapState(
            phase: .idle,
            manifestVersion: nil,
            totalAssets: 0,
            downloadedAssets: 0,
            currentDownloads: [],
            errors: []
        )
    }
}
