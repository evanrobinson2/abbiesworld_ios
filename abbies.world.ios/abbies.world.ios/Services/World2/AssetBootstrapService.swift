//
//  AssetBootstrapService.swift
//  abbies.world.ios
//
//  Asset bootstrap service for Abbie's World.
//  Manages manifest-driven content loading, caching, and offline support.
//

import Foundation
import Combine
import CryptoKit
import UIKit

@MainActor
class AssetBootstrapService: ObservableObject {
    static let shared = AssetBootstrapService()
    
    private let apiClient = APIClient.shared
    private var cancellables = Set<AnyCancellable>()
    
    @Published private(set) var state: BootstrapState = .initial
    @Published private(set) var manifest: AssetManifest?
    @Published private(set) var localCache: LocalAssetCache = .empty
    
    private let cacheDirectory: URL
    private let manifestCacheKey = "world2_asset_manifest"
    private let localCacheKey = "world2_local_asset_cache"
    
    private init() {
        let cachesDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        cacheDirectory = cachesDir.appendingPathComponent("World2Assets", isDirectory: true)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        
        loadLocalCache()
    }
    
    var isReady: Bool { state.isReady }
    var overallProgress: Double { state.overallProgress }
    
    func bootstrap() async {
        state.phase = .fetchingManifest
        
        do {
            let fetchedManifest = try await fetchManifest()
            manifest = fetchedManifest
            state.manifestVersion = fetchedManifest.version
            
            state.phase = .comparingAssets
            let assetsToDownload = compareAssets(manifest: fetchedManifest)
            
            if assetsToDownload.isEmpty {
                print("✅ AssetBootstrapService: All assets up to date")
                state.phase = .ready
                return
            }
            
            state.phase = .downloadingAssets
            state.totalAssets = assetsToDownload.count
            state.downloadedAssets = 0
            
            let requiredAssets = assetsToDownload.filter { $0.isRequired }
            let optionalAssets = assetsToDownload.filter { !$0.isRequired }
            
            for asset in requiredAssets {
                do {
                    try await downloadAsset(asset)
                    state.downloadedAssets += 1
                } catch {
                    let bootstrapError = BootstrapState.BootstrapError(
                        assetId: asset.id,
                        message: "Failed to download required asset: \(asset.id)",
                        underlyingError: error,
                        timestamp: Date()
                    )
                    state.errors.append(bootstrapError)
                    print("❌ AssetBootstrapService: Failed to download \(asset.id): \(error)")
                }
            }
            
            state.phase = .verifying
            
            let requiredMissing = requiredAssets.filter { asset in
                localCache.cachedAsset(byId: asset.id) == nil
            }
            
            if !requiredMissing.isEmpty {
                state.phase = .failed
                print("❌ AssetBootstrapService: Missing required assets: \(requiredMissing.map { $0.id })")
                return
            }
            
            state.phase = .ready
            print("✅ AssetBootstrapService: Bootstrap complete")
            
            Task.detached { [weak self] in
                for asset in optionalAssets {
                    try? await self?.downloadAsset(asset)
                    await MainActor.run {
                        self?.state.downloadedAssets += 1
                    }
                }
            }
            
        } catch {
            if let cachedManifest = loadCachedManifest() {
                print("⚠️ AssetBootstrapService: Using cached manifest due to network error")
                manifest = cachedManifest
                state.manifestVersion = cachedManifest.version
                state.phase = .ready
            } else {
                state.phase = .failed
                state.errors.append(BootstrapState.BootstrapError(
                    assetId: nil,
                    message: "Failed to fetch manifest and no cache available",
                    underlyingError: error,
                    timestamp: Date()
                ))
                print("❌ AssetBootstrapService: Bootstrap failed: \(error)")
            }
        }
    }
    
    func asset(_ assetId: String) -> URL? {
        guard let cached = localCache.cachedAsset(byId: assetId) else {
            return nil
        }
        return cacheDirectory.appendingPathComponent(cached.localPath)
    }
    
    func assetImage(_ assetId: String) async -> UIImage? {
        guard let url = asset(assetId) else {
            if let entry = manifest?.asset(byId: assetId) {
                try? await downloadAsset(entry)
                if let newUrl = asset(assetId) {
                    return UIImage(contentsOfFile: newUrl.path)
                }
            }
            return nil
        }
        return UIImage(contentsOfFile: url.path)
    }
    
    func music(_ trackId: String) -> URL? {
        return asset(trackId)
    }
    
    func hasAsset(_ assetId: String) -> Bool {
        localCache.cachedAsset(byId: assetId) != nil
    }
    
    func assetVersion(_ assetId: String) -> Int? {
        localCache.cachedAsset(byId: assetId)?.version
    }
    
    private func fetchManifest() async throws -> AssetManifest {
        guard let url = URL(string: "\(apiClient.baseURL)/api/world2/manifest") else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let manifest = try decoder.decode(AssetManifest.self, from: data)
        
        cacheManifest(manifest)
        
        return manifest
    }
    
    private func compareAssets(manifest: AssetManifest) -> [AssetManifest.AssetEntry] {
        return manifest.assets.filter { entry in
            guard let cached = localCache.cachedAsset(byId: entry.id) else {
                return true
            }
            return !cached.isUpToDate(with: entry)
        }
    }
    
    private func downloadAsset(_ entry: AssetManifest.AssetEntry) async throws {
        let fullUrl: String
        if entry.url.hasPrefix("http") {
            fullUrl = entry.url
        } else {
            fullUrl = "\(manifest?.baseUrl ?? apiClient.baseURL)\(entry.url)"
        }
        
        guard let url = URL(string: fullUrl) else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let downloadedHash = sha256(data: data)
        if downloadedHash != entry.hash {
            print("⚠️ AssetBootstrapService: Hash mismatch for \(entry.id)")
        }
        
        let filename = "\(entry.id).\(url.pathExtension.isEmpty ? "bin" : url.pathExtension)"
        let localPath = filename
        let fileURL = cacheDirectory.appendingPathComponent(localPath)
        
        try data.write(to: fileURL)
        
        let cachedAsset = LocalAssetCache.CachedAsset(
            id: entry.id,
            localPath: localPath,
            version: entry.version,
            hash: downloadedHash,
            downloadedAt: Date(),
            lastAccessedAt: Date()
        )
        
        localCache.updateCachedAsset(cachedAsset)
        saveLocalCache()
        
        print("✅ AssetBootstrapService: Downloaded \(entry.id)")
    }
    
    private func sha256(data: Data) -> String {
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }
    
    private func loadLocalCache() {
        guard let data = UserDefaults.standard.data(forKey: localCacheKey),
              let cache = try? JSONDecoder().decode(LocalAssetCache.self, from: data) else {
            localCache = .empty
            return
        }
        localCache = cache
    }
    
    private func saveLocalCache() {
        guard let data = try? JSONEncoder().encode(localCache) else { return }
        UserDefaults.standard.set(data, forKey: localCacheKey)
    }
    
    private func cacheManifest(_ manifest: AssetManifest) {
        guard let data = try? JSONEncoder().encode(manifest) else { return }
        UserDefaults.standard.set(data, forKey: manifestCacheKey)
    }
    
    private func loadCachedManifest() -> AssetManifest? {
        guard let data = UserDefaults.standard.data(forKey: manifestCacheKey),
              let manifest = try? JSONDecoder().decode(AssetManifest.self, from: data) else {
            return nil
        }
        return manifest
    }
    
    func clearCache() {
        try? FileManager.default.removeItem(at: cacheDirectory)
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        localCache = .empty
        saveLocalCache()
        UserDefaults.standard.removeObject(forKey: manifestCacheKey)
    }
    
    func cacheSize() -> Int64 {
        guard let files = try? FileManager.default.contentsOfDirectory(
            at: cacheDirectory,
            includingPropertiesForKeys: [.fileSizeKey]
        ) else {
            return 0
        }
        
        return files.reduce(0) { total, file in
            let size = (try? file.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
            return total + Int64(size)
        }
    }
}

extension AssetBootstrapService {
    static var sampleManifest: AssetManifest {
        AssetManifest(
            version: 1,
            lastUpdated: Date(),
            baseUrl: APIClient.shared.baseURL,
            assets: [
                AssetManifest.AssetEntry(
                    id: "map.home",
                    type: .map,
                    url: "/static/world2/maps/home_world.png",
                    version: 1,
                    hash: "",
                    size: 500000,
                    dimensions: .init(width: 2048, height: 1536),
                    transparencyRequired: false,
                    priority: .critical,
                    usage: ["home_world"],
                    mapId: "world.home",
                    poiId: nil,
                    tags: ["map", "home"],
                    metadata: nil
                ),
                AssetManifest.AssetEntry(
                    id: "map.adventure",
                    type: .map,
                    url: "/static/world2/maps/adventure_world.png",
                    version: 1,
                    hash: "",
                    size: 600000,
                    dimensions: .init(width: 2048, height: 1536),
                    transparencyRequired: false,
                    priority: .critical,
                    usage: ["adventure_world"],
                    mapId: "world.adventure",
                    poiId: nil,
                    tags: ["map", "adventure"],
                    metadata: nil
                ),
                AssetManifest.AssetEntry(
                    id: "poi.abbieTreehouse.exterior",
                    type: .poiExterior,
                    url: "/static/world2/pois/abbie_treehouse_exterior.png",
                    version: 1,
                    hash: "",
                    size: 200000,
                    dimensions: .init(width: 512, height: 512),
                    transparencyRequired: true,
                    priority: .required,
                    usage: ["poi_exterior"],
                    mapId: "world.home",
                    poiId: "poi.abbieTreehouse",
                    tags: ["poi", "home", "abbie"],
                    metadata: nil
                ),
                AssetManifest.AssetEntry(
                    id: "music.home.light",
                    type: .music,
                    url: "/static/world2/music/home_light.mp3",
                    version: 1,
                    hash: "",
                    size: 3000000,
                    dimensions: nil,
                    transparencyRequired: nil,
                    priority: .required,
                    usage: ["music"],
                    mapId: "world.home",
                    poiId: nil,
                    tags: ["music", "home", "light"],
                    metadata: ["duration": "180"]
                ),
                AssetManifest.AssetEntry(
                    id: "music.home.intense",
                    type: .music,
                    url: "/static/world2/music/home_intense.mp3",
                    version: 1,
                    hash: "",
                    size: 3500000,
                    dimensions: nil,
                    transparencyRequired: nil,
                    priority: .required,
                    usage: ["music"],
                    mapId: "world.home",
                    poiId: nil,
                    tags: ["music", "home", "intense"],
                    metadata: ["duration": "180"]
                )
            ]
        )
    }
}
