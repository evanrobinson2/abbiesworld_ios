import Foundation

/// Generic lookup for JSON that lives in a World 2 minigame pack.
///
/// Packs are authored under `AssetSources/World2/minigames/<packId>/` and copied
/// into the app bundle. Combat code should not hard-code those paths.
enum World2MinigamePackLoader {
    static func data(
        packId: String,
        resource: String,
        bundle: Bundle = .main
    ) throws -> Data {
        let roots = [
            "minigames/\(packId)",
            "World2/minigames/\(packId)",
            packId,
            "minigames/\(packId)/content",
            "World2/minigames/\(packId)/content",
            "\(packId)/content",
        ]
        for root in roots {
            if let url = bundle.url(forResource: resource, withExtension: "json", subdirectory: root) {
                return try Data(contentsOf: url)
            }
        }
        if let url = bundle.url(forResource: resource, withExtension: "json") {
            return try Data(contentsOf: url)
        }
        throw NSError(
            domain: "World2MinigamePack",
            code: 1,
            userInfo: [NSLocalizedDescriptionKey: "Missing \(resource).json in minigame pack \(packId)"]
        )
    }

    static func catalogName(packPrefix: String, semantic: String) -> String {
        packPrefix + semantic.replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "-", with: "_")
    }
}
