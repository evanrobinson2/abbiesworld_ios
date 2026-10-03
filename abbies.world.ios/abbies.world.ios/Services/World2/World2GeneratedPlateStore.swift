//
//  World2GeneratedPlateStore.swift
//  abbies.world.ios
//
//  Finished scene and POI pictures, after /api/create (and carving for POIs).
//

import Combine
import UIKit

@MainActor
final class World2GeneratedPlateStore: ObservableObject {
    static let shared = World2GeneratedPlateStore()

    @Published private(set) var images: [String: UIImage] = [:]
    @Published private(set) var generating: Set<String> = []

    private let directory: URL

    private init(fileManager: FileManager = .default) {
        let root = fileManager.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first ?? fileManager.temporaryDirectory
        directory = root.appendingPathComponent("World2GeneratedPlates", isDirectory: true)
        try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        loadSaved()
    }

    func image(for key: String) -> UIImage? {
        images[key]
    }

    func setGenerating(_ key: String, _ isGenerating: Bool) {
        if isGenerating {
            generating.insert(key)
        } else {
            generating.remove(key)
        }
    }

    func store(_ image: UIImage, for key: String) {
        let prepared = DevAssetCarvingService.cutoutIfNeeded(image, semanticId: key)
        images[key] = prepared
        guard let data = prepared.pngData() else { return }
        try? data.write(to: fileURL(for: key), options: .atomic)
    }

    private func loadSaved() {
        guard let files = try? FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil
        ) else { return }
        for url in files where url.pathExtension == "png" {
            let key = url.deletingPathExtension().lastPathComponent
                .replacingOccurrences(of: "_", with: ".")
            if let image = UIImage(contentsOfFile: url.path) {
                let prepared = DevAssetCarvingService.cutoutIfNeeded(image, semanticId: key)
                images[key] = prepared
                if prepared !== image, let data = prepared.pngData() {
                    try? data.write(to: url, options: .atomic)
                }
            }
        }
    }

    private func fileURL(for key: String) -> URL {
        let safe = key.replacingOccurrences(of: ".", with: "_")
        return directory.appendingPathComponent(safe).appendingPathExtension("png")
    }
}

enum World2POIArtwork {
    @MainActor
    static func generate(
        assetKey: String,
        subject: String,
        placeName: String,
        quality: String = World2AssetGenerationService.quickQuality
    ) async -> Bool {
        let store = World2GeneratedPlateStore.shared
        store.setGenerating(assetKey, true)
        defer { store.setGenerating(assetKey, false) }
        if let placeholder = World2PlaceholderPack.image(for: .poi) {
            store.store(placeholder, for: assetKey)
        }
        do {
            let png = try await World2AssetGenerationService.fetchPNG(
                kind: .poi,
                subject: subject,
                placeName: placeName,
                quality: quality
            )
            let carved = World2AssetGenerationService.finish(png, kind: .poi)
            if let image = UIImage(data: carved) {
                store.store(image, for: assetKey)
                return true
            }
            return false
        } catch {
            World2Diagnostics.log(
                "poi_generate_failed",
                ["asset": assetKey, "reason": error.localizedDescription]
            )
            return false
        }
    }
}

