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
    /// Bumps when a hosted plate replaces the bundled one, so screens redraw.
    @Published private(set) var registryGeneration = 0
    
    private let cacheDirectory: URL
    private let manifestCacheKey = "world2_asset_manifest"
    private let localCacheKey = "world2_local_asset_cache"
    private var registryImages: [String: UIImage] = [:]
    private var fileURLs: [String: URL] = [:]
    private var remoteFetchInFlight: Set<String> = []
    private var remoteFetchFailed: Set<String> = []
    private var pendingRemoteSemanticIDs: Set<String> = []
    
    private init() {
        let cachesDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        cacheDirectory = cachesDir.appendingPathComponent("World2Assets", isDirectory: true)
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
        // Server is source of truth: hosted registry bytes, https on the world
        // document, or the household plate proxy. Missing art is
        // `under_construction` at the call site — never a silent wrong plate.
        if let registryImage = registryImages[semanticName] {
            return registryImage
        }
        // Peglin Edition ships early plates in the asset catalog until registry
        // publish catches up (`world2_map_peglin_*` / `world2_poi_peglin_*`).
        if let bundled = Self.bundledPeglinPlate(for: semanticName) {
            return bundled
        }
        if Self.isRemotePlateURL(semanticName) {
            noteHTTPInterest(semanticName)
            return nil
        }
        noteRemoteInterest(semanticName)
        notePlateProxyInterest(semanticName)
        World2Diagnostics.log("asset_placeholder", ["semantic_id": semanticName])
        return nil
    }

    /// `map.peglin.bramble` → `world2_map_peglin_bramble`
    /// `token.peglin.wreck` → `world2_token_peglin_wreck`
    private static func bundledPeglinPlate(for semanticName: String) -> UIImage? {
        if semanticName == "title.marbleVoyage" {
            return UIImage(named: "world2_title_marbleVoyage")
        }
        if semanticName == MarbleVoyageClimbMap.semanticID
            || semanticName == "map.marbleVoyage.climb"
        {
            return UIImage(named: MarbleVoyageClimbMap.catalogName)
        }
        if semanticName.hasPrefix("map.peglin.") || semanticName.hasPrefix("poi.peglin.") {
            let catalogName = "world2_" + semanticName.replacingOccurrences(of: ".", with: "_")
            if let image = UIImage(named: catalogName) { return image }
        }
        if semanticName.hasPrefix("token.peglin.") {
            let catalogName = "world2_" + semanticName.replacingOccurrences(of: ".", with: "_")
            return UIImage(named: catalogName)
        }
        // Circular kid power icons + legacy poker-chip ids.
        if semanticName.hasPrefix("ui.plink.power.icon.") {
            let suffix = String(semanticName.dropFirst("ui.plink.power.icon.".count))
            return UIImage(named: "world2_plink_power_icon_\(suffix)")
        }
        if semanticName.hasPrefix("ui.plink.powerUp.") {
            let catalogName = "world2_" + semanticName.replacingOccurrences(of: ".", with: "_")
            return UIImage(named: catalogName)
        }
        // Rescue cage + burst plates.
        switch semanticName {
        case "ui.plink.cage.frame":
            return UIImage(named: "world2_plink_cage_frame")
        case "ui.plink.cage.broken":
            return UIImage(named: "world2_plink_cage_broken")
        case "ui.plink.rescue.burst":
            return UIImage(named: "world2_plink_rescue_burst")
        default:
            break
        }
        return nil
    }

    /// Pull every plate the live world document names so the iPad matches server.
    func prefetchAssets(referencedBy document: World2WorldDocument) {
        var ids = Set<String>()
        for scene in document.scenes.values {
            let bg = scene.backgroundAsset.trimmingCharacters(in: .whitespacesAndNewlines)
            if !bg.isEmpty { ids.insert(bg) }
        }
        for place in document.places ?? [] {
            let exterior = place.exteriorAsset.trimmingCharacters(in: .whitespacesAndNewlines)
            if !exterior.isEmpty { ids.insert(exterior) }
            if let interior = place.interiorAsset?.trimmingCharacters(in: .whitespacesAndNewlines),
               !interior.isEmpty {
                ids.insert(interior)
            }
            for room in place.rooms ?? [] {
                let image = room.image.trimmingCharacters(in: .whitespacesAndNewlines)
                if !image.isEmpty { ids.insert(image) }
            }
        }
        for id in ids {
            _ = image(for: id)
        }
        World2Diagnostics.log("asset_world_prefetch", ["count": String(ids.count)])
    }

    private static func isRemotePlateURL(_ value: String) -> Bool {
        guard let url = URL(string: value), let scheme = url.scheme?.lowercased() else {
            return false
        }
        return scheme == "http" || scheme == "https"
    }

    private func noteHTTPInterest(_ urlString: String) {
        guard registryImages[urlString] == nil else { return }
        guard !remoteFetchFailed.contains(urlString) else { return }
        guard !remoteFetchInFlight.contains(urlString) else { return }
        remoteFetchInFlight.insert(urlString)
        Task { [weak self] in
            defer { self?.remoteFetchInFlight.remove(urlString) }
            guard let self else { return }
            guard let url = URL(string: urlString) else {
                self.remoteFetchFailed.insert(urlString)
                return
            }
            do {
                let (data, response) = try await URLSession.shared.data(from: url)
                let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                guard (200..<300).contains(status), let image = UIImage(data: data) else {
                    self.remoteFetchFailed.insert(urlString)
                    return
                }
                self.registryImages[urlString] = image
                self.registryGeneration += 1
                World2Diagnostics.log("asset_http_plate_accepted", ["url": urlString])
            } catch {
                self.remoteFetchFailed.insert(urlString)
                World2Diagnostics.log(
                    "asset_http_plate_failed",
                    ["url": urlString, "error": error.localizedDescription]
                )
            }
        }
    }

    /// Downloaded sound or model. Matches the registry key or its file name.
    func cachedFileURL(named name: String) -> URL? {
        let hyphen = name.replacingOccurrences(of: "_", with: "-")
        let wanted = Set([name, hyphen])
        for (key, url) in fileURLs {
            let file = (key as NSString).lastPathComponent
            let stem = (file as NSString).deletingPathExtension
            if wanted.contains(key) || wanted.contains(file) || wanted.contains(stem) {
                return url
            }
        }
        return nil
    }

    /// Hosted looping video for a semantic ID (map ambient plates, etc.).
    func videoURL(for semanticName: String) -> URL? {
        cachedFileURL(named: semanticName)
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
            World2Diagnostics.log("asset_registry_unavailable", ["fallback": "none"])
            return
        }

        await ingestRegistryCatalog(client)

        let requested = registeredSemanticIDs().union(pendingRemoteSemanticIDs)
        var accepted = 0
        for semanticId in requested.sorted() {
            if await fetchRemotePlate(semanticId, client: client) {
                accepted += 1
            }
        }

        World2Diagnostics.log(
            "asset_registry_ready",
            [
                "accepted": String(accepted),
                "requested": String(requested.count),
            ]
        )
    }

    /// Places and maps the running app may need. Prefetch from registry only.
    private func registeredSemanticIDs() -> Set<String> {
        var ids = Set<String>()
        for archetype in World2POIRegistry.all {
            ids.insert(archetype.exteriorAsset)
            if let interior = archetype.interiorAsset {
                ids.insert(interior)
            }
        }
        for scene in World2SceneCatalog.all {
            if !scene.backgroundAsset.isEmpty {
                ids.insert(scene.backgroundAsset)
            }
        }
        return ids
    }

    private func noteRemoteInterest(_ semanticName: String) {
        guard registryImages[semanticName] == nil else { return }
        guard World2RegistryKey.assetKey(for: semanticName) != nil else { return }
        guard !remoteFetchInFlight.contains(semanticName) else { return }
        pendingRemoteSemanticIDs.insert(semanticName)
        Task { [weak self] in
            guard let self else { return }
            // Auth0 loads the world; registry reads still want an API key.
            // If the key is missing, fall through to the household plate proxy
            // so semantic ids on the server document still paint.
            if self.registryAvailability == .failed || self.registryAvailability == .unavailable {
                _ = await self.fetchViaPlateProxy(semanticName)
                return
            }
            let client: GameAssetRegistryClient
            do {
                client = try GameAssetRegistryClient()
                if self.registryAvailability == .unchecked {
                    self.registryAvailability = try await client.availability()
                }
            } catch {
                self.registryAvailability = .failed
                _ = await self.fetchViaPlateProxy(semanticName)
                return
            }
            if self.registryAvailability == .available {
                _ = await self.fetchRemotePlate(semanticName, client: client)
            } else {
                _ = await self.fetchViaPlateProxy(semanticName)
            }
        }
    }

    @discardableResult
    private func fetchRemotePlate(
        _ semanticId: String,
        client: GameAssetRegistryClient
    ) async -> Bool {
        guard !remoteFetchInFlight.contains(semanticId) else { return false }
        guard let registryKey = World2RegistryKey.assetKey(for: semanticId) else {
            return false
        }
        remoteFetchInFlight.insert(semanticId)
        defer { remoteFetchInFlight.remove(semanticId) }

        do {
            let record = try await client.current(registryKey)
            let location = try client.location(for: record)
            switch location {
            case .bundled(let name):
                if let image = UIImage(named: name) {
                    registryImages[semanticId] = image
                    registryRevisions[semanticId] = record.revision
                    registryGeneration += 1
                    World2Diagnostics.log(
                        "asset_registry_bundled_accepted",
                        ["semantic_id": semanticId, "bundle": name]
                    )
                    return true
                }
                World2Diagnostics.log(
                    "asset_registry_bundled_missing_from_client",
                    ["semantic_id": semanticId, "bundle": name]
                )
                return await fetchViaPlateProxy(semanticId)
            case .remote:
                do {
                    guard let image = try await registryImage(
                        semanticId: semanticId,
                        record: record,
                        client: client
                    ) else {
                        return await fetchViaPlateProxy(semanticId)
                    }
                    registryImages[semanticId] = image
                    registryRevisions[semanticId] = record.revision
                    registryGeneration += 1
                    World2Diagnostics.log(
                        "asset_registry_remote_accepted",
                        [
                            "asset_key": registryKey,
                            "semantic_id": semanticId,
                            "revision": String(record.revision),
                        ]
                    )
                    return true
                } catch {
                    World2Diagnostics.log(
                        "asset_registry_asset_unavailable",
                        ["asset_key": registryKey, "semantic_id": semanticId]
                    )
                    return await fetchViaPlateProxy(semanticId)
                }
            }
        } catch {
            World2Diagnostics.log(
                "asset_registry_asset_unavailable",
                ["asset_key": registryKey, "semantic_id": semanticId]
            )
            return await fetchViaPlateProxy(semanticId)
        }
    }

    private func notePlateProxyInterest(_ semanticName: String) {
        guard registryImages[semanticName] == nil else { return }
        guard !Self.isRemotePlateURL(semanticName) else { return }
        guard World2RegistryKey.assetKey(for: semanticName) != nil
                || semanticName.contains(".") else { return }
        guard !remoteFetchFailed.contains("proxy:\(semanticName)") else { return }
        guard !remoteFetchInFlight.contains("proxy:\(semanticName)") else { return }
        Task { [weak self] in
            _ = await self?.fetchViaPlateProxy(semanticName)
        }
    }

    @discardableResult
    private func fetchViaPlateProxy(_ semanticId: String) async -> Bool {
        let gate = "proxy:\(semanticId)"
        guard registryImages[semanticId] == nil else { return true }
        guard !remoteFetchFailed.contains(gate) else { return false }
        guard !remoteFetchInFlight.contains(gate) else { return false }
        remoteFetchInFlight.insert(gate)
        defer { remoteFetchInFlight.remove(gate) }

        var components = URLComponents(string: ServerConfig.shared.plateProxyURL)
        var items = components?.queryItems ?? []
        items.append(URLQueryItem(name: "semantic", value: semanticId))
        components?.queryItems = items
        guard let url = components?.url else {
            remoteFetchFailed.insert(gate)
            return false
        }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            guard (200..<300).contains(status), let image = UIImage(data: data) else {
                remoteFetchFailed.insert(gate)
                World2Diagnostics.log(
                    "asset_plate_proxy_failed",
                    ["semantic_id": semanticId, "status": String(status)]
                )
                return false
            }
            let prepared = DevAssetCarvingService.cutoutIfNeeded(image, semanticId: semanticId)
            registryImages[semanticId] = prepared
            registryGeneration += 1
            World2Diagnostics.log("asset_plate_proxy_accepted", ["semantic_id": semanticId])
            return true
        } catch {
            remoteFetchFailed.insert(gate)
            World2Diagnostics.log(
                "asset_plate_proxy_failed",
                ["semantic_id": semanticId, "error": error.localizedDescription]
            )
            return false
        }
    }

    private func registryImage(
        semanticId: String,
        record: GameAssetRecord,
        client: GameAssetRegistryClient
    ) async throws -> UIImage? {
        let cacheId = "registry:\(semanticId)"
        let recordHash = record.sha256?.lowercased() ?? ""
        if let cached = localCache.cachedAsset(byId: cacheId),
           cached.version == record.revision,
           cached.hash.lowercased() == recordHash,
           !recordHash.isEmpty {
            let url = cacheDirectory.appendingPathComponent(cached.localPath)
            if let image = UIImage(contentsOfFile: url.path) {
                let prepared = DevAssetCarvingService.cutoutIfNeeded(image, semanticId: semanticId)
                if prepared !== image, let png = prepared.pngData() {
                    try? png.write(to: url, options: .atomic)
                }
                return prepared
            }
        }

        let data = try await client.data(for: record)
        let prepared = DevAssetCarvingService.shouldCutoutSprite(semanticId: semanticId)
            ? DevAssetCarvingService.spriteCutoutPNG(from: data)
            : data
        guard let image = UIImage(data: prepared) else {
            return nil
        }

        let localPath = "registry-\(semanticId.replacingOccurrences(of: ".", with: "-"))-r\(record.revision).png"
        try prepared.write(
            to: cacheDirectory.appendingPathComponent(localPath),
            options: .atomic
        )
        localCache.updateCachedAsset(
            .init(
                id: cacheId,
                localPath: localPath,
                version: record.revision,
                hash: recordHash,
                downloadedAt: Date(),
                lastAccessedAt: Date()
            )
        )
        saveLocalCache()
        return image
    }

    private func ingestRegistryCatalog(_ client: GameAssetRegistryClient) async {
        let records: [GameAssetRecord]
        do {
            records = try await client.listAll()
        } catch {
            World2Diagnostics.log("asset_registry_list_failed")
            return
        }
        for record in records {
            let mime = record.mimeType?.lowercased() ?? ""
            if mime.hasPrefix("image"), let semantic = record.metadata?.semanticId {
                _ = await fetchRemotePlate(semantic, client: client)
            } else if Self.storesDownloadedFile(mime: mime, key: record.key),
                      let url = try? await cacheRegistryFile(record, client: client) {
                fileURLs[record.key] = url
            }
        }
        registryGeneration += 1
        MusicService.shared.reloadContentPlaylist()
    }

    private static func storesDownloadedFile(mime: String, key: String) -> Bool {
        if mime.hasPrefix("audio") || mime.hasPrefix("model") || mime.hasPrefix("video") {
            return true
        }
        return key.hasPrefix("music/") || key.hasPrefix("actors/") || key.hasPrefix("models/")
    }

    private func cacheRegistryFile(
        _ record: GameAssetRecord,
        client: GameAssetRegistryClient
    ) async throws -> URL? {
        let location = try client.location(for: record)
        guard case .remote = location else { return nil }
        let safe = record.key.replacingOccurrences(of: "/", with: "-")
        let ext = record.source.filename.flatMap { URL(fileURLWithPath: $0).pathExtension }
        let suffix = ext?.isEmpty == false ? ".\(ext!)" : ""
        let localPath = "registry-file-\(safe)-r\(record.revision)\(suffix)"
        let url = cacheDirectory.appendingPathComponent(localPath)
        if FileManager.default.fileExists(atPath: url.path) {
            return url
        }
        let data = try await client.data(for: record)
        try data.write(to: url, options: .atomic)
        return url
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

enum World2RegistryKey {
    private static let assetKeys: [String: String] = [
        "title.background": "backgrounds/title",
        "title.marbleVoyage": "backgrounds/title-marble-voyage",
        "logo.abbiesWorld": "ui/logo-abbies-world",
        "map.home": "maps/home",
        "map.workLand": "maps/work-land",
        "map.farm": "maps/farm-land",
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
        "poi.evanHome.exterior": "pois/evan-citadel/exterior",
        "poi.evanHome.interior": "pois/evan-citadel/interior",
        "map.evan": "maps/evan-citadel",
        "map.artGarden": "maps/art-garden",
        "map.artGarden.ambient": "maps/art-garden/ambient",
        "poi.characterStudio.exterior": "pois/character-studio/exterior",
        "poi.characterStudio.interior": "pois/character-studio/interior",
        "poi.sceneBuilder.exterior": "pois/scene-builder/exterior",
        "poi.sceneBuilder.interior": "pois/scene-builder/interior",
    ]

    static func assetKey(for semanticId: String) -> String? {
        if let known = assetKeys[semanticId] {
            return known
        }
        return conventionalKey(for: semanticId)
    }

    /// New plates do not need a new binary. Publish under this key.
    /// `poi.figurineExplorer.exterior` → `pois/figurine-explorer/exterior`.
    /// Irregular historical keys stay in `assetKeys` and win over this rule.
    static func conventionalKey(for semanticId: String) -> String? {
        let parts = semanticId.split(separator: ".").map(String.init)
        guard let head = parts.first, parts.count >= 2 else { return nil }
        let tail = parts.dropFirst().map(kebab).joined(separator: "/")
        switch head {
        case "poi":
            guard parts.count >= 3 else { return nil }
            return "pois/\(tail)"
        case "map":
            return "maps/\(tail)"
        case "scene":
            return "scenes/\(tail)"
        case "furniture":
            return "furniture/\(tail)"
        case "ui":
            return "ui/\(tail)"
        default:
            return nil
        }
    }

    private static func kebab(_ token: String) -> String {
        var out = ""
        for character in token {
            if character.isUppercase {
                if !out.isEmpty { out.append("-") }
                out.append(contentsOf: character.lowercased())
            } else {
                out.append(character)
            }
        }
        return out
    }
}
