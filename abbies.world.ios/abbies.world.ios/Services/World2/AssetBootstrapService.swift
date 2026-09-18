//
//  AssetBootstrapService.swift
//  abbies.world.ios
//
//  Asset bootstrap service for Abbie's World 2.
//  Manages manifest-driven content loading, caching, and offline support.
//

import Foundation
import Combine
import UIKit

@MainActor
class AssetBootstrapService: ObservableObject {
    static let shared = AssetBootstrapService()
    
    @Published private(set) var state: BootstrapState = .initial
    @Published private(set) var manifest: AssetManifest?
    @Published private(set) var localCache: LocalAssetCache = .empty
    @Published private(set) var registryAvailability: GameAssetRegistryAvailability = .unchecked
    @Published private(set) var registryRevisions: [String: Int] = [:]
    
    private let cacheDirectory: URL
    private let manifestCacheKey = "world2_asset_manifest"
    private let localCacheKey = "world2_local_asset_cache"
    private let qualifiedImageNames: [String: String]
    private let qualifiedImages: [String: World2QualifiedImage]
    private var registryImages: [String: UIImage] = [:]
    
    private init() {
        let cachesDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        cacheDirectory = cachesDir.appendingPathComponent("World2Assets", isDirectory: true)
        let runtimeImages = Self.loadQualifiedImages()
        qualifiedImages = Dictionary(
            uniqueKeysWithValues: runtimeImages.map { ($0.semanticId, $0) }
        )
        qualifiedImageNames = Dictionary(
            uniqueKeysWithValues: runtimeImages.map {
                ($0.semanticId, $0.assetCatalogName)
            }
        )
        try? FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        
        loadLocalCache()
    }
    
    var isReady: Bool { state.isReady }
    var overallProgress: Double { state.overallProgress }
    
    func bootstrap() async {
        state = .initial
        state.phase = .fetchingManifest

        // The vertical slice never waits for a network request. A bundled manifest,
        // then a cached manifest, then a truthful in-code fallback are all playable.
        let source: String
        if let bundledManifest = loadBundledManifest() {
            manifest = bundledManifest
            source = "bundled"
        } else if let cachedManifest = loadCachedManifest() {
            manifest = cachedManifest
            source = "cache"
        } else {
            manifest = Self.sampleManifest
            source = "fallback"
        }

        state.manifestVersion = manifest?.version
        state.totalAssets = max(1, manifest?.assets.count ?? 0)
        state.downloadedAssets = state.totalAssets
        state.phase = .ready
        World2Diagnostics.log("bootstrap_ready", ["source": source])

        // Registry content is an enhancement. Failure cannot move the app out of ready.
        Task { [weak self] in
            guard let self else { return }
            await self.refreshRegistry()
        }
    }
    
    func asset(_ assetId: String) -> URL? {
        guard let cached = localCache.cachedAsset(byId: assetId) else {
            return nil
        }
        return cacheDirectory.appendingPathComponent(cached.localPath)
    }

    func image(for semanticName: String) -> UIImage? {
        // World 2 image art is fail-closed: only an asset named by the generated,
        // qualification-backed runtime manifest can reach a game screen.
        if let registryImage = registryImages[semanticName] {
            return registryImage
        }
        guard let catalogName = qualifiedImageNames[semanticName] else {
            World2Diagnostics.log("asset_placeholder", ["semantic_id": semanticName])
            return nil
        }
        return UIImage(named: catalogName)
    }

    func assetImage(_ assetId: String) async -> UIImage? {
        guard let url = asset(assetId) else { return nil }
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
    
    private func refreshRegistry() async {
        let client: GameAssetRegistryClient
        do {
            client = try GameAssetRegistryClient()
            registryAvailability = try await client.availability()
        } catch {
            registryAvailability = .failed
            World2Diagnostics.log("asset_registry_readiness_failed")
            return
        }

        guard registryAvailability == .available else {
            World2Diagnostics.log("asset_registry_unavailable", ["fallback": "bundled"])
            return
        }

        var accepted = 0
        for descriptor in qualifiedImages.values.sorted(by: {
            $0.semanticId < $1.semanticId
        }) {
            guard let registryKey = World2RegistryKey.assetKey(
                for: descriptor.semanticId
            ) else {
                continue
            }

            do {
                let record = try await client.current(registryKey)
                let location = try client.location(for: record)
                switch location {
                case .bundled(let bundleName):
                    guard bundleName == descriptor.assetCatalogName,
                          record.sha256 == nil
                            || record.sha256?.lowercased()
                                == descriptor.derivativeSha256.lowercased() else {
                        World2Diagnostics.log(
                            "asset_registry_record_rejected",
                            ["asset_key": registryKey, "reason": "bundled_identity"]
                        )
                        continue
                    }
                case .remote:
                    guard record.sha256?.lowercased()
                            == descriptor.derivativeSha256.lowercased() else {
                        World2Diagnostics.log(
                            "asset_registry_record_rejected",
                            ["asset_key": registryKey, "reason": "qualification_hash"]
                        )
                        continue
                    }
                    guard let image = try await registryImage(
                        for: descriptor,
                        record: record,
                        client: client
                    ) else {
                        continue
                    }
                    registryImages[descriptor.semanticId] = image
                }

                registryRevisions[descriptor.semanticId] = record.revision
                accepted += 1
            } catch {
                World2Diagnostics.log(
                    "asset_registry_asset_unavailable",
                    ["asset_key": registryKey]
                )
            }
        }

        World2Diagnostics.log(
            "asset_registry_ready",
            [
                "accepted": String(accepted),
                "requested": String(qualifiedImages.count),
            ]
        )
    }

    private func registryImage(
        for descriptor: World2QualifiedImage,
        record: GameAssetRecord,
        client: GameAssetRegistryClient
    ) async throws -> UIImage? {
        let cacheId = "registry:\(descriptor.semanticId)"
        if let cached = localCache.cachedAsset(byId: cacheId),
           cached.version == record.revision,
           cached.hash.lowercased() == descriptor.derivativeSha256.lowercased() {
            let url = cacheDirectory.appendingPathComponent(cached.localPath)
            if let image = UIImage(contentsOfFile: url.path) {
                return image
            }
        }

        let data = try await client.data(for: record)
        guard let image = UIImage(data: data) else {
            return nil
        }

        let localPath = "registry-\(descriptor.assetId)-r\(record.revision).png"
        try data.write(
            to: cacheDirectory.appendingPathComponent(localPath),
            options: .atomic
        )
        localCache.updateCachedAsset(
            .init(
                id: cacheId,
                localPath: localPath,
                version: record.revision,
                hash: descriptor.derivativeSha256,
                downloadedAt: Date(),
                lastAccessedAt: Date()
            )
        )
        saveLocalCache()
        return image
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

    private func loadBundledManifest() -> AssetManifest? {
        let candidates = ["world2_asset_manifest", "World2AssetManifest"]
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        for name in candidates {
            guard let url = Bundle.main.url(forResource: name, withExtension: "json"),
                  let data = try? Data(contentsOf: url),
                  let decoded = try? decoder.decode(AssetManifest.self, from: data) else {
                continue
            }
            return decoded
        }
        return nil
    }

    private static func loadQualifiedImages() -> [World2QualifiedImage] {
        let data: Data?
        if let catalogData = NSDataAsset(name: "world2_runtime_manifest")?.data {
            data = catalogData
        } else if let url = Bundle.main.url(
                forResource: "world2_runtime_manifest",
                withExtension: "json"
            ) {
            data = try? Data(contentsOf: url)
        } else {
            data = nil
        }

        guard let data,
              let runtimeManifest = try? JSONDecoder().decode(
                World2RuntimeAssetManifest.self,
                from: data
            )
        else {
            return []
        }

        return runtimeManifest.assets.map {
            World2QualifiedImage(
                assetId: $0.assetId,
                semanticId: $0.semanticId,
                assetCatalogName: $0.assetCatalogName,
                derivativeSha256: $0.derivativeSha256
            )
        }
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

private struct World2RuntimeAssetManifest: Decodable {
    let assets: [Asset]

    struct Asset: Decodable {
        let assetId: String
        let semanticId: String
        let assetCatalogName: String
        let derivativeSha256: String
    }
}

private struct World2QualifiedImage {
    let assetId: String
    let semanticId: String
    let assetCatalogName: String
    let derivativeSha256: String
}

enum World2RegistryKey {
    private static let assetKeys: [String: String] = [
        "title.background": "backgrounds/title",
        "map.home": "maps/home",
        "map.workLand": "maps/work-land",
        "map.farm": "maps/farm-land",
        "minimap.home": "maps/minimap/home",
        "minimap.workLand": "maps/minimap/work-land",
        "minimap.farm": "maps/minimap/farm-land",
        "minimap.threeBears": "maps/minimap/three-bears",
        "minimap.blankSlate": "maps/minimap/blank-slate",
        "minimap.placeholder": "maps/minimap/placeholder",
        "poi.abbieTreehouse.exterior": "pois/abbie-treehouse/exterior",
        "poi.abbieTreehouse.interior": "pois/abbie-treehouse/interior",
        "poi.aniTreehouse.exterior": "pois/ani-treehouse/exterior",
        "poi.aniTreehouse.interior": "pois/ani-treehouse/interior",
        "poi.cardFactory.exterior": "pois/card-factory/exterior",
        "poi.cardFactory.interior": "pois/card-factory/interior",
        "poi.letterWorks.exterior": "pois/letter-works/exterior",
        "poi.letterWorks.interior": "pois/letter-works/interior",
        "poi.furnitureStore.exterior": "pois/furniture-store/exterior",
        "poi.furnitureStore.interior": "pois/furniture-store/interior",
        "poi.selfReplicatingFactory.exterior": "pois/poi-factory/exterior",
        "poi.selfReplicatingFactory.interior": "pois/poi-factory/interior",
        "poi.assetWorkbench.exterior": "pois/asset-workbench/exterior",
        "poi.assetWorkbench.interior": "pois/asset-workbench/interior",
        "ui.appIcon": "ui/app-icon",
        "furniture.abbieStarterBed": "furniture/beds/abbie-starter",
        "furniture.aniStarterBed": "furniture/beds/ani-starter",
    ]

    static func assetKey(for semanticId: String) -> String? {
        assetKeys[semanticId]
    }
}
