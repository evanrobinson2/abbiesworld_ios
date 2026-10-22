import Combine
import CryptoKit
import Foundation
import SwiftUI
import UIKit

@MainActor
final class World2GeneratedDecorationImageStore: ObservableObject {
    static let shared = World2GeneratedDecorationImageStore()

    @Published private var memoryImages: [String: UIImage] = [:]
    @Published private(set) var generatingIDs: Set<String> = []
    private let directory: URL

    private init(fileManager: FileManager = .default) {
        let root = fileManager.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first ?? fileManager.temporaryDirectory
        directory = root.appendingPathComponent(
            "World2GeneratedDecorations",
            isDirectory: true
        )
        try? fileManager.createDirectory(
            at: directory,
            withIntermediateDirectories: true
        )
    }

    func image(for decoration: World2GeneratedDecoration) -> UIImage? {
        if let image = memoryImages[decoration.id] {
            return image
        }
        let url = localURL(for: decoration)
        guard let data = try? Data(contentsOf: url),
              sha256(data) == decoration.sha256.lowercased(),
              let image = UIImage(data: data) else {
            return nil
        }
        memoryImages[decoration.id] = image
        return image
    }

    @discardableResult
    func store(_ data: Data, for decoration: World2GeneratedDecoration) -> Bool {
        guard sha256(data) == decoration.sha256.lowercased(),
              let image = UIImage(data: data) else {
            World2Diagnostics.log(
                "asset_workbench_image_rejected",
                ["decoration": decoration.id, "reason": "hash_or_decode"]
            )
            return false
        }
        do {
            try data.write(to: localURL(for: decoration), options: .atomic)
            memoryImages[decoration.id] = image
            return true
        } catch {
            World2Diagnostics.log(
                "asset_workbench_image_store_failed",
                ["decoration": decoration.id]
            )
            return false
        }
    }

    func setGenerating(_ decorationID: String, isGenerating: Bool) {
        if isGenerating {
            generatingIDs.insert(decorationID)
        } else {
            generatingIDs.remove(decorationID)
        }
    }

    /// Writes a new PNG for an existing decoration id and returns its sha256.
    @discardableResult
    func replace(_ data: Data, decorationID: String) -> String? {
        guard let image = UIImage(data: data) else { return nil }
        let hash = sha256(data)
        do {
            try data.write(
                to: directory.appendingPathComponent("\(hash).png"),
                options: .atomic
            )
            memoryImages[decorationID] = image
            return hash
        } catch {
            World2Diagnostics.log(
                "asset_workbench_image_store_failed",
                ["decoration": decorationID]
            )
            return nil
        }
    }

    func loadIfNeeded(_ decoration: World2GeneratedDecoration) async {
        guard image(for: decoration) == nil,
              !decoration.registryKey.hasPrefix("preview/") else {
            return
        }
        do {
            let registry = try GameAssetRegistryClient()
            let record = try await registry.revision(
                decoration.registryRevision,
                of: decoration.registryKey
            )
            guard record.sha256?.lowercased() == decoration.sha256.lowercased(),
                  record.mimeType?.lowercased() == "image/png" else {
                throw World2AssetWorkbenchError.unqualifiedPack
            }
            let data = try await registry.data(for: record)
            _ = store(data, for: decoration)
        } catch {
            World2Diagnostics.log(
                "asset_workbench_image_load_failed",
                ["decoration": decoration.id]
            )
        }
    }

    private func localURL(for decoration: World2GeneratedDecoration) -> URL {
        directory.appendingPathComponent("\(decoration.sha256.lowercased()).png")
    }

    func digest(_ data: Data) -> String {
        sha256(data)
    }

    private func sha256(_ data: Data) -> String {
        SHA256.hash(data: data)
            .map { String(format: "%02x", $0) }
            .joined()
    }
}

struct World2GeneratedDecorationArtwork: View {
    let decoration: World2GeneratedDecoration
    var showsGenAIBadge: Bool = true
    @ObservedObject private var store = World2GeneratedDecorationImageStore.shared

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Group {
                if let image = store.image(for: decoration) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                } else {
                    Image(systemName: "sparkles.square.filled.on.square")
                        .resizable()
                        .scaledToFit()
                        .foregroundStyle(.indigo)
                        .padding(18)
                }
            }

            if showsGenAIBadge {
                let pending = store.generatingIDs.contains(decoration.id)
                Text(pending ? "…" : "AI")
                    .font(.system(size: 9, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 5)
                    .padding(.vertical, 2)
                    .background((pending ? Color.orange : Color.purple).opacity(0.92), in: Capsule())
                    .padding(4)
                    .accessibilityLabel(pending ? "Generation in progress" : "Generated artwork")
            }
        }
        .task(id: "\(decoration.registryKey)#\(decoration.registryRevision)") {
            await store.loadIfNeeded(decoration)
        }
        .accessibilityLabel(decoration.label)
    }
}
