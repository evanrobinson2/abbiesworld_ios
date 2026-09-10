//
//  MediaPackManager.swift
//  abbies.world.ios
//
//  Orchestrates server-managed media packs with fallback to bundled packs.
//  Per CLIENT_MEDIA_PACK_CONTRACT_V1.
//

import Foundation
import Combine
import UIKit

@MainActor
class MediaPackManager: ObservableObject {
    static let shared = MediaPackManager()
    
    private let service = ServerMediaPackService.shared
    private let cache = MediaPackCache.shared
    private var cancellables = Set<AnyCancellable>()
    
    @Published private(set) var availablePacks: [PackIndexEntry] = []
    @Published private(set) var loadedManifests: [String: PackManifest] = [:]
    @Published private(set) var isLoading = false
    @Published private(set) var lastError: Error?
    
    private let bundledPackIds = ["halloween", "animal-avenue", "adventure"]
    
    init() {
        loadCachedIndex()
    }
    
    // MARK: - Public API
    
    func refreshPackIndex() async {
        isLoading = true
        lastError = nil
        
        do {
            let response = try await fetchPackIndexAsync()
            availablePacks = filterAvailablePacks(response.packs)
            try? cache.cachePackIndex(response)
            print("📦 Refreshed pack index: \(availablePacks.count) available packs")
        } catch {
            print("❌ Failed to refresh pack index: \(error)")
            lastError = error
            loadCachedIndex()
        }
        
        isLoading = false
    }
    
    func loadManifest(packId: String, version: Int, checksum: String) async -> PackManifest? {
        if let cached = cache.loadCachedManifest(packId: packId, version: version, checksum: checksum) {
            loadedManifests[packId] = cached
            return cached
        }
        
        do {
            let manifest = try await fetchManifestAsync(packId: packId, version: version)
            
            guard manifest.manifestChecksum == checksum else {
                throw ServerMediaPackError.checksumMismatch(
                    expected: checksum,
                    actual: manifest.manifestChecksum
                )
            }
            
            try? cache.cacheManifest(manifest)
            try? cache.saveLKG(manifest)
            loadedManifests[packId] = manifest
            
            return manifest
        } catch {
            print("❌ Failed to load manifest for \(packId): \(error)")
            lastError = error
            
            if let lkg = cache.loadLKG(packId: packId) {
                print("📦 Using LKG for \(packId) v\(lkg.version)")
                loadedManifests[packId] = lkg
                return lkg
            }
            
            return nil
        }
    }
    
    func loadManifest(for entry: PackIndexEntry) async -> PackManifest? {
        await loadManifest(packId: entry.packId, version: entry.version, checksum: entry.manifestChecksum)
    }
    
    func manifest(for packId: String) -> PackManifest? {
        loadedManifests[packId]
    }
    
    // MARK: - Asset Loading
    
    func loadImage(for asset: PackAsset) async -> UIImage? {
        if let cached = cache.loadCachedImage(url: asset.url, checksum: asset.checksum) {
            return cached
        }
        
        do {
            let data = try await service.downloadAsset(url: asset.url, expectedChecksum: asset.checksum)
            guard let image = UIImage(data: data) else {
                print("❌ Failed to decode image from \(asset.url)")
                return nil
            }
            try? cache.cacheImage(url: asset.url, checksum: asset.checksum, image: image)
            return image
        } catch {
            print("❌ Failed to load image \(asset.url): \(error)")
            return nil
        }
    }
    
    func loadThumbnail(for item: PackItem) async -> UIImage? {
        await loadImage(for: item.thumbnail)
    }
    
    func loadBackground(for manifest: PackManifest) async -> UIImage? {
        guard let background = manifest.background else { return nil }
        return await loadImage(for: background)
    }
    
    // MARK: - Prefetch Assets
    
    func prefetchAssets(for manifest: PackManifest) async {
        if let background = manifest.background {
            _ = await loadImage(for: background)
        }
        
        for row in manifest.rows {
            for item in row.items {
                _ = await loadThumbnail(for: item)
            }
        }
        
        print("✅ Prefetched assets for \(manifest.packId)")
    }
    
    // MARK: - Generation Request
    
    func createGenerationRequest(
        manifest: PackManifest,
        selections: [String: String],
        freeTextDescription: String? = nil,
        imageWidth: Int = 1024,
        imageHeight: Int = 1024
    ) -> PackGenerationRequest {
        let packSelections = selections.map { rowId, itemId in
            PackSelection(rowId: rowId, itemId: itemId)
        }
        
        return PackGenerationRequest(
            packId: manifest.packId,
            packVersion: manifest.version,
            packManifestChecksum: manifest.manifestChecksum,
            packSelections: packSelections,
            freeTextDescription: freeTextDescription,
            imageWidth: imageWidth,
            imageHeight: imageHeight
        )
    }
    
    // MARK: - Fallback to Bundled Packs
    
    func isBundledPack(_ packId: String) -> Bool {
        let normalized = packId.lowercased().replacingOccurrences(of: "_", with: "-")
        return bundledPackIds.contains(normalized)
    }
    
    func bundledFallback(for packId: String) -> MediaPack? {
        let normalized = packId.lowercased().replacingOccurrences(of: "_", with: "-")
        switch normalized {
        case "halloween":
            return .halloween
        case "animal-avenue", "animalavenue":
            return .animalAvenue
        default:
            return nil
        }
    }
    
    // MARK: - SSE Event Handling
    
    func handleMediaPacksUpdated() {
        Task {
            await refreshPackIndex()
            
            for entry in availablePacks {
                if loadedManifests[entry.packId] != nil {
                    _ = await loadManifest(for: entry)
                }
            }
        }
    }
    
    // MARK: - Private Helpers
    
    private func loadCachedIndex() {
        if let cached = cache.loadCachedPackIndex() {
            availablePacks = filterAvailablePacks(cached.packs)
            print("📦 Loaded cached pack index: \(availablePacks.count) packs")
        }
    }
    
    private func filterAvailablePacks(_ packs: [PackIndexEntry]) -> [PackIndexEntry] {
        packs.filter { entry in
            if let availability = entry.availability {
                guard availability.isAvailable else { return false }
                
                let now = Date()
                if let start = availability.startDate, now < start { return false }
                if let end = availability.endDate, now > end { return false }
            }
            
            if let compatibility = entry.compatibility {
                if let minIOS = compatibility.minIOSVersion {
                    let currentVersion = UIDevice.current.systemVersion
                    if currentVersion.compare(minIOS, options: .numeric) == .orderedAscending {
                        return false
                    }
                }
            }
            
            if let capabilities = entry.requiredCapabilities {
                for capability in capabilities {
                    if !isCapabilitySupported(capability) {
                        return false
                    }
                }
            }
            
            return true
        }
    }
    
    private func isCapabilitySupported(_ capability: String) -> Bool {
        switch capability.lowercased() {
        case "music_playback", "musicplayback":
            return true
        case "voice_cues", "voicecues":
            return true
        case "four_row_layout", "fourrowlayout":
            return true
        default:
            print("⚠️ Unknown capability: \(capability)")
            return true
        }
    }
    
    private func fetchPackIndexAsync() async throws -> PackIndexResponse {
        try await withCheckedThrowingContinuation { continuation in
            service.fetchPackIndex()
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            continuation.resume(throwing: error)
                        }
                    },
                    receiveValue: { response in
                        continuation.resume(returning: response)
                    }
                )
                .store(in: &cancellables)
        }
    }
    
    private func fetchManifestAsync(packId: String, version: Int) async throws -> PackManifest {
        try await withCheckedThrowingContinuation { continuation in
            service.fetchManifest(packId: packId, version: version)
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            continuation.resume(throwing: error)
                        }
                    },
                    receiveValue: { manifest in
                        continuation.resume(returning: manifest)
                    }
                )
                .store(in: &cancellables)
        }
    }
}

// MARK: - Selection Validation

extension MediaPackManager {
    
    func validateSelections(_ selections: [String: String], for manifest: PackManifest) -> [String: String] {
        var errors: [String: String] = [:]
        
        for row in manifest.rows {
            let selectedItemId = selections[row.rowId]
            
            if row.minimumSelections > 0 && selectedItemId == nil {
                errors[row.rowId] = "Selection required"
            }
            
            if let itemId = selectedItemId {
                if !row.items.contains(where: { $0.itemId == itemId }) {
                    errors[row.rowId] = "Invalid selection"
                }
            }
        }
        
        return errors
    }
    
    func isReadyToGenerate(_ selections: [String: String], for manifest: PackManifest) -> Bool {
        for row in manifest.rows {
            if row.minimumSelections > 0 {
                guard let itemId = selections[row.rowId],
                      row.items.contains(where: { $0.itemId == itemId }) else {
                    return false
                }
            }
        }
        return true
    }
}
