import Combine
import Foundation
import UIKit

/// Per-scene custom backdrop images (URL / clipboard paste in developer mode).
@MainActor
final class World2SceneBackdropStore: ObservableObject {
    static let shared = World2SceneBackdropStore()

    @Published private(set) var revision = 0

    private let directory: URL
    private var memory: [String: UIImage] = [:]

    private init(fileManager: FileManager = .default) {
        let root = fileManager.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first ?? fileManager.temporaryDirectory
        directory = root.appendingPathComponent("World2SceneBackdrops", isDirectory: true)
        try? fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    func image(forSceneID sceneID: String) -> UIImage? {
        if let cached = memory[sceneID] {
            return cached
        }
        let url = fileURL(for: sceneID)
        guard let data = try? Data(contentsOf: url),
              let image = UIImage(data: data) else {
            return nil
        }
        memory[sceneID] = image
        return image
    }

    @discardableResult
    func store(_ image: UIImage, forSceneID sceneID: String) -> Bool {
        guard let data = image.pngData() ?? image.jpegData(compressionQuality: 0.92) else {
            return false
        }
        do {
            try data.write(to: fileURL(for: sceneID), options: .atomic)
            memory[sceneID] = image
            revision += 1
            World2Diagnostics.log(
                "scene_backdrop_stored",
                ["scene": sceneID, "bytes": "\(data.count)"]
            )
            return true
        } catch {
            World2Diagnostics.log(
                "scene_backdrop_store_failed",
                ["scene": sceneID]
            )
            return false
        }
    }

    @discardableResult
    func store(data: Data, forSceneID sceneID: String) -> Bool {
        guard let image = UIImage(data: data) else { return false }
        return store(image, forSceneID: sceneID)
    }

    func clear(sceneID: String) {
        memory.removeValue(forKey: sceneID)
        try? FileManager.default.removeItem(at: fileURL(for: sceneID))
        revision += 1
    }

    private func fileURL(for sceneID: String) -> URL {
        let safe = sceneID
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: ":", with: "_")
        return directory.appendingPathComponent("\(safe).png")
    }
}
