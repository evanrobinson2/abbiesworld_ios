//
//  MediaPackCache.swift
//  abbies.world.ios
//
//  Disk cache for server-managed media packs per CLIENT_MEDIA_PACK_CONTRACT_V1.
//  Caches by packId/version/checksum, retains last-known-good version.
//

import Foundation
import UIKit
import CommonCrypto

class MediaPackCache {
    static let shared = MediaPackCache()
    
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    private let manifestsDirectory: URL
    private let assetsDirectory: URL
    private let lkgDirectory: URL
    
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    
    init() {
        let caches = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        cacheDirectory = caches.appendingPathComponent("MediaPacks", isDirectory: true)
        manifestsDirectory = cacheDirectory.appendingPathComponent("manifests", isDirectory: true)
        assetsDirectory = cacheDirectory.appendingPathComponent("assets", isDirectory: true)
        lkgDirectory = cacheDirectory.appendingPathComponent("lkg", isDirectory: true)
        
        createDirectoriesIfNeeded()
    }
    
    private func createDirectoriesIfNeeded() {
        try? fileManager.createDirectory(at: manifestsDirectory, withIntermediateDirectories: true)
        try? fileManager.createDirectory(at: assetsDirectory, withIntermediateDirectories: true)
        try? fileManager.createDirectory(at: lkgDirectory, withIntermediateDirectories: true)
    }
    
    // MARK: - Manifest Cache
    
    private func manifestCacheKey(packId: String, version: Int, checksum: String) -> String {
        "\(packId)_v\(version)_\(checksum.prefix(16))"
    }
    
    private func manifestPath(packId: String, version: Int, checksum: String) -> URL {
        let key = manifestCacheKey(packId: packId, version: version, checksum: checksum)
        return manifestsDirectory.appendingPathComponent("\(key).json")
    }
    
    func cacheManifest(_ manifest: PackManifest) throws {
        let path = manifestPath(
            packId: manifest.packId,
            version: manifest.version,
            checksum: manifest.manifestChecksum
        )
        let data = try encoder.encode(manifest)
        try data.write(to: path)
        print("📦 Cached manifest: \(manifest.packId) v\(manifest.version)")
    }
    
    func loadCachedManifest(packId: String, version: Int, checksum: String) -> PackManifest? {
        let path = manifestPath(packId: packId, version: version, checksum: checksum)
        guard let data = try? Data(contentsOf: path),
              let manifest = try? decoder.decode(PackManifest.self, from: data) else {
            return nil
        }
        return manifest
    }
    
    // MARK: - Last Known Good (LKG) Management
    
    private func lkgManifestPath(packId: String) -> URL {
        lkgDirectory.appendingPathComponent("\(packId)_manifest.json")
    }
    
    func saveLKG(_ manifest: PackManifest) throws {
        let path = lkgManifestPath(packId: manifest.packId)
        let data = try encoder.encode(manifest)
        try data.write(to: path)
        print("✅ Saved LKG: \(manifest.packId) v\(manifest.version)")
    }
    
    func loadLKG(packId: String) -> PackManifest? {
        let path = lkgManifestPath(packId: packId)
        guard let data = try? Data(contentsOf: path),
              let manifest = try? decoder.decode(PackManifest.self, from: data) else {
            return nil
        }
        print("📦 Loaded LKG: \(packId) v\(manifest.version)")
        return manifest
    }
    
    func hasLKG(packId: String) -> Bool {
        let path = lkgManifestPath(packId: packId)
        return fileManager.fileExists(atPath: path.path)
    }
    
    // MARK: - Asset Cache
    
    private func assetCacheKey(url: String, checksum: String) -> String {
        let urlHash = sha256(string: url).prefix(16)
        return "\(urlHash)_\(checksum.prefix(16))"
    }
    
    private func assetPath(url: String, checksum: String, fileExtension: String = "dat") -> URL {
        let key = assetCacheKey(url: url, checksum: checksum)
        return assetsDirectory.appendingPathComponent("\(key).\(fileExtension)")
    }
    
    func cacheAsset(url: String, checksum: String, data: Data, fileExtension: String = "dat") throws {
        let path = assetPath(url: url, checksum: checksum, fileExtension: fileExtension)
        try data.write(to: path)
    }
    
    func loadCachedAsset(url: String, checksum: String, fileExtension: String = "dat") -> Data? {
        let path = assetPath(url: url, checksum: checksum, fileExtension: fileExtension)
        return try? Data(contentsOf: path)
    }
    
    func hasCachedAsset(url: String, checksum: String, fileExtension: String = "dat") -> Bool {
        let path = assetPath(url: url, checksum: checksum, fileExtension: fileExtension)
        return fileManager.fileExists(atPath: path.path)
    }
    
    // MARK: - Image Cache (convenience)
    
    func cacheImage(url: String, checksum: String, image: UIImage) throws {
        guard let data = image.pngData() else {
            throw NSError(domain: "MediaPackCache", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to encode image as PNG"])
        }
        try cacheAsset(url: url, checksum: checksum, data: data, fileExtension: "png")
    }
    
    func loadCachedImage(url: String, checksum: String) -> UIImage? {
        guard let data = loadCachedAsset(url: url, checksum: checksum, fileExtension: "png") else {
            return nil
        }
        return UIImage(data: data)
    }
    
    // MARK: - Pack Index Cache
    
    private var indexCachePath: URL {
        cacheDirectory.appendingPathComponent("pack_index.json")
    }
    
    func cachePackIndex(_ response: PackIndexResponse) throws {
        let data = try encoder.encode(response)
        try data.write(to: indexCachePath)
        print("📦 Cached pack index: \(response.packs.count) packs")
    }
    
    func loadCachedPackIndex() -> PackIndexResponse? {
        guard let data = try? Data(contentsOf: indexCachePath),
              let response = try? decoder.decode(PackIndexResponse.self, from: data) else {
            return nil
        }
        return response
    }
    
    // MARK: - Cache Cleanup
    
    func clearCache() {
        try? fileManager.removeItem(at: manifestsDirectory)
        try? fileManager.removeItem(at: assetsDirectory)
        createDirectoriesIfNeeded()
        print("🗑️ Cleared media pack cache (LKG preserved)")
    }
    
    func clearAll() {
        try? fileManager.removeItem(at: cacheDirectory)
        createDirectoriesIfNeeded()
        print("🗑️ Cleared all media pack data including LKG")
    }
    
    func cacheSize() -> Int64 {
        var size: Int64 = 0
        if let enumerator = fileManager.enumerator(at: cacheDirectory, includingPropertiesForKeys: [.fileSizeKey]) {
            for case let fileURL as URL in enumerator {
                if let fileSize = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                    size += Int64(fileSize)
                }
            }
        }
        return size
    }
    
    // MARK: - SHA-256 Helper
    
    private func sha256(string: String) -> String {
        guard let data = string.data(using: .utf8) else { return "" }
        return sha256(data: data)
    }
    
    private func sha256(data: Data) -> String {
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes {
            _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash)
        }
        return hash.map { String(format: "%02x", $0) }.joined()
    }
    
    func verifyChecksum(_ data: Data, expected: String) -> Bool {
        sha256(data: data) == expected
    }
}
