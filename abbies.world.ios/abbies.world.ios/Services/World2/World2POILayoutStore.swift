import Combine
import Foundation

@MainActor
final class World2DeveloperSession: ObservableObject {
    static let shared = World2DeveloperSession()

    @Published var isEnabled = false

    private init() {}
}

struct World2POILayout: Codable, Equatable {
    var x: Double
    var y: Double
    var scale: Double
    var rotationDegrees: Double
}

@MainActor
final class World2POILayoutStore: ObservableObject {
    private static let legacyOverridesKey = "world2.layout.overrides.v1"
    private static let overridesKeyPrefix = "world2.layout.overrides.v2"

    @Published private(set) var drafts: [String: World2POILayout]
    @Published private(set) var savedLayouts: [String: World2POILayout]
    @Published private(set) var saveMessage = "No unsaved layout changes"

    private let defaults: UserDefaults
    private var pendingSave: Task<Void, Never>?
    private var playerScope = "unselected"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        drafts = [:]
        savedLayouts = [:]
    }

    private var overridesKey: String {
        "\(Self.overridesKeyPrefix).\(playerScope)"
    }

    func selectPlayer(_ playerID: PlayerId?) {
        let nextScope = playerID?.rawValue ?? "unselected"
        guard nextScope != playerScope else { return }
        if hasUnsavedChanges {
            save()
        }
        pendingSave?.cancel()
        playerScope = nextScope

        let scopedData = defaults.data(forKey: overridesKey)
        let legacyData = defaults.data(forKey: Self.legacyOverridesKey)
        let loaded = Self.decodeLayouts(scopedData ?? legacyData)
        drafts = loaded
        savedLayouts = loaded
        saveMessage = "No unsaved layout changes"

        if scopedData == nil, legacyData != nil {
            if let encoded = try? Self.encoder.encode(loaded) {
                defaults.set(encoded, forKey: overridesKey)
            }
            defaults.removeObject(forKey: Self.legacyOverridesKey)
        }
    }

    var hasUnsavedChanges: Bool {
        drafts != savedLayouts
    }

    func layout(for placement: POIPlacement) -> World2POILayout {
        drafts[placement.poiId]
            ?? World2POILayout(
                x: placement.x,
                y: placement.y,
                scale: placement.scale,
                rotationDegrees: 0
            )
    }

    func update(_ layout: World2POILayout, for poiId: String) {
        var constrained = layout
        constrained.x = min(max(constrained.x, 0.05), 0.95)
        constrained.y = min(max(constrained.y, 0.12), 0.90)
        constrained.scale = min(max(constrained.scale, 0.45), 2.25)
        constrained.rotationDegrees = constrained.rotationDegrees
            .truncatingRemainder(dividingBy: 360)
        drafts[poiId] = constrained
        scheduleSave()
    }

    func move(_ poiId: String, from layout: World2POILayout, dx: Double, dy: Double) {
        var updated = drafts[poiId] ?? layout
        updated.x = layout.x + dx
        updated.y = layout.y + dy
        update(updated, for: poiId)
    }

    func setScale(_ scale: Double, for poiId: String, fallback: World2POILayout) {
        var updated = drafts[poiId] ?? fallback
        updated.scale = scale
        update(updated, for: poiId)
    }

    func setRotation(
        _ rotationDegrees: Double,
        for poiId: String,
        fallback: World2POILayout
    ) {
        var updated = drafts[poiId] ?? fallback
        updated.rotationDegrees = rotationDegrees
        update(updated, for: poiId)
    }

    func reset(_ placement: POIPlacement) {
        drafts[placement.poiId] = World2POILayout(
            x: placement.x,
            y: placement.y,
            scale: placement.scale,
            rotationDegrees: 0
        )
        scheduleSave()
    }

    func discardChanges() {
        pendingSave?.cancel()
        drafts = savedLayouts
        saveMessage = "Unsaved changes discarded"
    }

    func save() {
        do {
            let data = try Self.encoder.encode(drafts)
            defaults.set(data, forKey: overridesKey)
            savedLayouts = drafts
            saveMessage = "Saved on this device"
            print("WORLD2_LAYOUT_SAVED \(exportJSON())")
        } catch {
            saveMessage = "Could not save layout"
            print("WORLD2_LAYOUT_SAVE_FAILED error=\(error.localizedDescription)")
        }
    }

    private func scheduleSave() {
        pendingSave?.cancel()
        saveMessage = "Saving changes…"
        pendingSave = Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(250))
            guard !Task.isCancelled else { return }
            self?.save()
        }
    }

    func exportJSON() -> String {
        let export = World2POILayoutExport(
            schemaVersion: 1,
            placements: drafts
                .map {
                    World2POILayoutExport.Placement(
                        poiId: $0.key,
                        x: $0.value.x,
                        y: $0.value.y,
                        scale: $0.value.scale,
                        rotationDegrees: $0.value.rotationDegrees
                    )
                }
                .sorted { $0.poiId < $1.poiId }
        )
        guard let data = try? Self.encoder.encode(export),
              let value = String(data: data, encoding: .utf8) else {
            return #"{"schemaVersion":1,"placements":[]}"#
        }
        return value
    }

    private static var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        return encoder
    }

    private static func decodeLayouts(_ data: Data?) -> [String: World2POILayout] {
        guard let data,
              let decoded = try? JSONDecoder().decode(
                  [String: World2POILayout].self,
                  from: data
              ) else {
            return [:]
        }
        return decoded
    }
}

private struct World2POILayoutExport: Codable {
    let schemaVersion: Int
    let placements: [Placement]

    struct Placement: Codable {
        let poiId: String
        let x: Double
        let y: Double
        let scale: Double
        let rotationDegrees: Double
    }
}
