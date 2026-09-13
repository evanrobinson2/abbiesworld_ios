import Combine
import Foundation
import UIKit

@MainActor
final class DevAssetCarvingViewModel: ObservableObject {
    static let sourceURLDefaultsKey = "world2.assetCarving.lastUnsignedSourceURL.v1"

    @Published var sourceURL: String
    @Published private(set) var sourceImage: UIImage?
    @Published var assets: [DevCarvedAsset] = []
    @Published private(set) var isLoading = false
    @Published private(set) var isSaving = false
    @Published private(set) var statusMessage = "Paste an HTTPS CDN image link to begin."
    @Published private(set) var errorMessage: String?
    @Published private(set) var savedSession: DevAssetCarvingSavedSession?

    private var result: DevAssetCarvingResult?
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        sourceURL = defaults.string(forKey: Self.sourceURLDefaultsKey) ?? ""
    }

    var pendingCount: Int {
        assets.filter { $0.decision == .pending }.count
    }

    var approvedCount: Int {
        assets.filter { $0.decision == .approved }.count
    }

    var rejectedCount: Int {
        assets.filter { $0.decision == .rejected }.count
    }

    var canSave: Bool {
        result != nil && !assets.isEmpty && pendingCount == 0 && !isSaving
    }

    var diagnosticSummary: String {
        let value: [String: Any] = [
            "approved": approvedCount,
            "items": assets.count,
            "pending": pendingCount,
            "rejected": rejectedCount,
            "session": result?.sessionID ?? "none",
            "source_sha256_prefix": result.map { String($0.sourceSHA256.prefix(12)) } ?? "none",
            "state": isLoading ? "loading" : (savedSession == nil ? "review" : "saved"),
        ]
        guard let data = try? JSONSerialization.data(
            withJSONObject: value,
            options: [.sortedKeys]
        ) else {
            return #"{"state":"invalid"}"#
        }
        return String(data: data, encoding: .utf8) ?? #"{"state":"invalid"}"#
    }

    func loadPreview() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        savedSession = nil
        statusMessage = "Downloading and finding object edges…"

        do {
            let loaded = try await DevAssetCarvingService.fetchAndCarve(
                urlString: sourceURL
            )
            result = loaded
            sourceImage = loaded.sourceImage
            assets = loaded.assets
            statusMessage = "Found \(assets.count) candidate item\(assets.count == 1 ? "" : "s"). Review each one."
            persistUnsignedSourceURLIfSafe()
            logDiagnostic(event: "preview_ready")
        } catch {
            result = nil
            sourceImage = nil
            assets = []
            errorMessage = error.localizedDescription
            statusMessage = "Preview unavailable"
            logDiagnostic(event: "preview_failed")
        }
        isLoading = false
    }

    func saveApprovedSet() {
        guard let result, !isSaving else { return }
        isSaving = true
        errorMessage = nil

        do {
            savedSession = try DevAssetCarvingService.save(
                result: result,
                assets: assets,
                sourceURLString: sourceURL
            )
            statusMessage = "Saved \(savedSession?.approvedCount ?? 0) approved transparent asset\(savedSession?.approvedCount == 1 ? "" : "s") on this device."
            logDiagnostic(event: "review_saved")
        } catch {
            errorMessage = error.localizedDescription
            statusMessage = "Could not save review"
            logDiagnostic(event: "review_save_failed")
        }
        isSaving = false
    }

    func resetReview() {
        result = nil
        sourceImage = nil
        assets = []
        savedSession = nil
        errorMessage = nil
        statusMessage = "Paste an HTTPS CDN image link to begin."
        logDiagnostic(event: "review_reset")
    }

    func nextPendingID(after itemID: String) -> String? {
        guard let currentIndex = assets.firstIndex(where: { $0.id == itemID }) else {
            return assets.first(where: { $0.decision == .pending })?.id
        }
        let later = assets.dropFirst(currentIndex + 1)
            .first(where: { $0.decision == .pending })?.id
        return later ?? assets.prefix(currentIndex)
            .first(where: { $0.decision == .pending })?.id
    }

    private func persistUnsignedSourceURLIfSafe() {
        guard let components = URLComponents(string: sourceURL),
              components.query == nil,
              components.fragment == nil else {
            return
        }
        defaults.set(sourceURL, forKey: Self.sourceURLDefaultsKey)
    }

    private func logDiagnostic(event: String) {
        print("ASSET_CARVER_DIAGNOSTIC event=\(event) \(diagnosticSummary)")
    }
}
