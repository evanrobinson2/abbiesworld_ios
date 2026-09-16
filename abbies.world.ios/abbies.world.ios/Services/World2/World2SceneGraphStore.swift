//
//  World2SceneGraphStore.swift
//  abbies.world.ios
//
//  Holds the working scene graph: which pads exist in each scene and which
//  registered places stand on them.
//
//  Scenes start from the shipped catalog. The moment a developer edits one, the
//  whole edited scene is stored as an override for that player, which keeps the
//  saved shape obvious and hand-readable instead of a pile of diffs. Everything
//  autosaves, survives relaunch, and can be exported as JSON to be baked back
//  into World2SceneCatalog.
//
//  This replaces World2POILayoutStore, whose saved POI transforms are migrated
//  forward on first load so nobody loses hand-tuned positions.
//

import Combine
import Foundation

@MainActor
final class World2DeveloperSession: ObservableObject {
    static let shared = World2DeveloperSession()

    @Published var isEnabled = false

    private init() {}
}

/// Which layer of the scene editor is accepting edits. Only one layer is live at
/// a time, which is what keeps a single drag unambiguous.
enum World2SceneEditorLayer: String, CaseIterable, Identifiable, Sendable {
    case pois
    case hardpoints

    var id: String { rawValue }

    var title: String {
        switch self {
        case .pois: return "Places"
        case .hardpoints: return "Hardpoints"
        }
    }

    var symbolName: String {
        switch self {
        case .pois: return "building.2.fill"
        case .hardpoints: return "target"
        }
    }

    var instruction: String {
        switch self {
        case .pois:
            return "Drag a place to move it. It snaps to a nearby pad; drag further to break away."
        case .hardpoints:
            return "Tap bare map to add a pad, drag a pad to move it. Places re-pin to where their pad went."
        }
    }
}

@MainActor
final class World2SceneGraphStore: ObservableObject {
    private static let schemaVersion = 1
    private static let storeKeyPrefix = "world2.sceneGraph.v1"
    /// The store this one replaces. Read once, then retired.
    private static let legacyLayoutKeyPrefix = "world2.layout.overrides.v4"

    @Published private(set) var draftScenes: [String: World2SceneDefinition] = [:]
    @Published private(set) var savedScenes: [String: World2SceneDefinition] = [:]
    @Published private(set) var saveMessage = "No unsaved scene changes"

    private let defaults: UserDefaults
    private var pendingSave: Task<Void, Never>?
    private var playerScope = "unselected"

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    // MARK: - Scope and persistence

    private var storeKey: String { "\(Self.storeKeyPrefix).\(playerScope)" }
    private var legacyLayoutKey: String { "\(Self.legacyLayoutKeyPrefix).\(playerScope)" }

    func selectPlayer(_ playerID: PlayerId?) {
        let nextScope = playerID?.rawValue ?? "unselected"
        guard nextScope != playerScope else { return }
        if hasUnsavedChanges {
            save()
        }
        pendingSave?.cancel()
        playerScope = nextScope

        var loaded = Self.decodeScenes(defaults.data(forKey: storeKey))
        if loaded.isEmpty,
           let migrated = migrateLegacyLayouts(), !migrated.isEmpty {
            loaded = migrated
            World2Diagnostics.log(
                "scene_graph_migrated_from_layout_store",
                ["player": playerScope, "scenes": "\(migrated.count)"]
            )
        }
        draftScenes = loaded
        savedScenes = loaded
        saveMessage = "No unsaved scene changes"
        logValidation()
    }

    var hasUnsavedChanges: Bool { draftScenes != savedScenes }

    /// The scene as it should be drawn right now: the developer's override when
    /// there is one, otherwise the shipped catalog, otherwise a blank slate.
    func scene(_ sceneID: String) -> World2SceneDefinition {
        var resolved = draftScenes[sceneID]
            ?? World2SceneCatalog.scene(sceneID)
            ?? World2SceneDefinition(
                id: sceneID,
                name: "Untitled Scene",
                summary: "",
                isMutableByPlayer: true
            )
        // Ambient video ships in the catalog; older saved overrides may omit it.
        if resolved.ambientVideoAsset == nil,
           let catalogAmbient = World2SceneCatalog.scene(sceneID)?.ambientVideoAsset {
            resolved.ambientVideoAsset = catalogAmbient
        }
        return resolved
    }

    func scene(for worldId: WorldId) -> World2SceneDefinition {
        scene(World2SceneCatalog.sceneID(for: worldId))
    }

    func isOverridden(_ sceneID: String) -> Bool {
        draftScenes[sceneID] != nil
    }

    // MARK: - Reading

    func archetype(for instance: World2POIInstance) -> World2POIArchetype? {
        World2POIRegistry.archetype(instance.archetypeID)
    }

    func openHardpoints(in sceneID: String) -> [World2SceneHardpoint] {
        scene(sceneID).openHardpoints
    }

    /// Resolve a drag without committing it, so the editor can light up the pad
    /// the place is about to take.
    func previewSnap(
        instanceID: String,
        in sceneID: String,
        to position: World2NormalizedPoint,
        snappingEnabled: Bool,
        aspectRatio: Double
    ) -> World2HardpointSnapEngine.Resolution {
        let scene = scene(sceneID)
        let instance = scene.instance(instanceID)
        let sizeClass = instance
            .flatMap { World2POIRegistry.archetype($0.archetypeID) }?
            .sizeClass ?? .medium
        return World2HardpointSnapEngine.resolve(
            World2HardpointSnapEngine.Request(
                proposedPosition: position,
                sizeClass: sizeClass,
                hardpoints: scene.hardpoints,
                occupancy: scene.occupancy,
                movingInstanceID: instanceID,
                currentHardpointID: instance?.hardpointID,
                snappingEnabled: snappingEnabled,
                aspectRatio: aspectRatio
            )
        )
    }

    // MARK: - POI layer edits

    /// Move a place and let the snap engine decide where it lands.
    @discardableResult
    func moveInstance(
        _ instanceID: String,
        in sceneID: String,
        to position: World2NormalizedPoint,
        snappingEnabled: Bool,
        aspectRatio: Double
    ) -> World2HardpointSnapEngine.Resolution {
        let resolution = previewSnap(
            instanceID: instanceID,
            in: sceneID,
            to: position,
            snappingEnabled: snappingEnabled,
            aspectRatio: aspectRatio
        )
        mutate(sceneID) { scene in
            guard let index = scene.poiInstances.firstIndex(where: { $0.id == instanceID }) else {
                return
            }
            scene.poiInstances[index].transform = scene.poiInstances[index]
                .transform
                .moved(to: resolution.position)
                .clamped()
            scene.poiInstances[index].hardpointID = resolution.hardpointID
        }
        World2Diagnostics.log(
            "scene_editor_instance_moved",
            [
                "instance": instanceID,
                "scene": sceneID,
                "hardpoint": resolution.hardpointID ?? "freehand",
            ]
        )
        return resolution
    }

    func setScale(_ scale: Double, instanceID: String, in sceneID: String) {
        mutate(sceneID) { scene in
            guard let index = scene.poiInstances.firstIndex(where: { $0.id == instanceID }) else {
                return
            }
            scene.poiInstances[index].transform.scale = scale
            scene.poiInstances[index].transform = scene.poiInstances[index].transform.clamped()
        }
    }

    func setRotation(_ degrees: Double, instanceID: String, in sceneID: String) {
        mutate(sceneID) { scene in
            guard let index = scene.poiInstances.firstIndex(where: { $0.id == instanceID }) else {
                return
            }
            scene.poiInstances[index].transform.rotationDegrees = degrees
            scene.poiInstances[index].transform = scene.poiInstances[index].transform.clamped()
        }
    }

    /// Let go of the pad but stay exactly where you are. This is the "unsnap"
    /// the design calls for: pinning is the default, not a cage.
    func unsnapInstance(_ instanceID: String, in sceneID: String) {
        mutate(sceneID) { scene in
            guard let index = scene.poiInstances.firstIndex(where: { $0.id == instanceID }) else {
                return
            }
            scene.poiInstances[index].hardpointID = nil
        }
        World2Diagnostics.log(
            "scene_editor_instance_unsnapped",
            ["instance": instanceID, "scene": sceneID]
        )
    }

    /// Re-pin a freehand place onto the nearest pad that will take it.
    @discardableResult
    func snapInstanceToNearestHardpoint(
        _ instanceID: String,
        in sceneID: String,
        aspectRatio: Double
    ) -> World2SceneHardpoint? {
        let currentScene = scene(sceneID)
        guard let instance = currentScene.instance(instanceID),
              let archetype = World2POIRegistry.archetype(instance.archetypeID),
              let hardpoint = World2HardpointSnapEngine.suggestedHardpoint(
                for: archetype.sizeClass,
                near: instance.transform.position,
                hardpoints: currentScene.hardpoints,
                occupancy: currentScene.occupancy,
                aspectRatio: aspectRatio
              ) else {
            return nil
        }
        mutate(sceneID) { scene in
            guard let index = scene.poiInstances.firstIndex(where: { $0.id == instanceID }) else {
                return
            }
            scene.poiInstances[index].hardpointID = hardpoint.id
            scene.poiInstances[index].transform = scene.poiInstances[index]
                .transform
                .moved(to: hardpoint.position)
        }
        World2Diagnostics.log(
            "scene_editor_instance_snapped",
            ["instance": instanceID, "scene": sceneID, "hardpoint": hardpoint.id]
        )
        return hardpoint
    }

    /// Swap which registered place stands here, keeping the pad and transform.
    func replaceArchetype(
        of instanceID: String,
        in sceneID: String,
        with archetypeID: String
    ) {
        guard let replacement = World2POIRegistry.archetype(archetypeID) else { return }
        let currentScene = scene(sceneID)
        guard let existing = currentScene.instance(instanceID) else { return }

        // If the pad will not take the new place, drop the pin rather than
        // leaving an invalid binding behind.
        var hardpointID = existing.hardpointID
        if let padID = hardpointID,
           let pad = currentScene.hardpoint(padID),
           !replacement.fits(pad) {
            hardpointID = nil
        }

        mutate(sceneID) { scene in
            guard let index = scene.poiInstances.firstIndex(where: { $0.id == instanceID }) else {
                return
            }
            let previous = scene.poiInstances[index]
            scene.poiInstances[index] = World2POIInstance(
                id: previous.id,
                archetypeID: archetypeID,
                sceneID: previous.sceneID,
                transform: previous.transform,
                hardpointID: hardpointID,
                zIndex: previous.zIndex,
                createdAt: previous.createdAt,
                createdByPlayerID: previous.createdByPlayerID,
                isAuthored: previous.isAuthored
            )
        }
        World2Diagnostics.log(
            "scene_editor_archetype_replaced",
            ["instance": instanceID, "scene": sceneID, "archetype": archetypeID]
        )
    }

    /// Drop a registered place into a scene, preferring an open compatible pad.
    @discardableResult
    func addInstance(
        archetypeID: String,
        in sceneID: String,
        near position: World2NormalizedPoint = .center,
        aspectRatio: Double = 4.0 / 3.0,
        createdByPlayerID: String? = nil
    ) -> World2POIInstance? {
        guard let archetype = World2POIRegistry.archetype(archetypeID) else {
            World2Diagnostics.log(
                "scene_editor_add_rejected_unregistered",
                ["archetype": archetypeID, "scene": sceneID]
            )
            return nil
        }
        let currentScene = scene(sceneID)
        let hardpoint = World2HardpointSnapEngine.suggestedHardpoint(
            for: archetype.sizeClass,
            near: position,
            hardpoints: currentScene.hardpoints,
            occupancy: currentScene.occupancy,
            aspectRatio: aspectRatio
        )
        let nextZ = (currentScene.poiInstances.map(\.zIndex).max() ?? 0) + 1
        let instance = World2POIInstance(
            archetypeID: archetypeID,
            sceneID: sceneID,
            transform: World2POITransform(
                position: hardpoint?.position ?? position.clamped()
            ),
            hardpointID: hardpoint?.id,
            zIndex: nextZ,
            createdByPlayerID: createdByPlayerID
        )
        mutate(sceneID) { scene in
            scene.poiInstances.append(instance)
        }
        World2Diagnostics.log(
            "scene_editor_instance_added",
            [
                "archetype": archetypeID,
                "instance": instance.id,
                "scene": sceneID,
                "hardpoint": hardpoint?.id ?? "freehand",
            ]
        )
        return instance
    }

    /// Remove a place. Authored instances are kept so a shipped map cannot be
    /// emptied out by accident; they can still be moved or swapped.
    @discardableResult
    func removeInstance(_ instanceID: String, in sceneID: String) -> Bool {
        guard let instance = scene(sceneID).instance(instanceID),
              !instance.isAuthored else {
            return false
        }
        mutate(sceneID) { scene in
            scene.poiInstances.removeAll { $0.id == instanceID }
        }
        World2Diagnostics.log(
            "scene_editor_instance_removed",
            ["instance": instanceID, "scene": sceneID]
        )
        return true
    }

    func bringInstanceToFront(_ instanceID: String, in sceneID: String) {
        mutate(sceneID) { scene in
            guard let index = scene.poiInstances.firstIndex(where: { $0.id == instanceID }) else {
                return
            }
            scene.poiInstances[index].zIndex =
                (scene.poiInstances.map(\.zIndex).max() ?? 0) + 1
        }
    }

    // MARK: - Hardpoint layer edits

    @discardableResult
    func addHardpoint(
        in sceneID: String,
        at position: World2NormalizedPoint,
        name: String? = nil,
        acceptedSizeClasses: Set<World2POISizeClass> = World2SceneHardpoint.anySizeClass
    ) -> World2SceneHardpoint {
        let existing = scene(sceneID).hardpoints
        let hardpoint = World2SceneHardpoint(
            id: "hardpoint.\(UUID().uuidString.prefix(8).lowercased())",
            name: name ?? "Pad \(existing.count + 1)",
            position: position.clamped(),
            acceptedSizeClasses: acceptedSizeClasses
        )
        mutate(sceneID) { scene in
            scene.hardpoints.append(hardpoint)
        }
        World2Diagnostics.log(
            "scene_editor_hardpoint_added",
            ["hardpoint": hardpoint.id, "scene": sceneID]
        )
        return hardpoint
    }

    /// Move a pad. Anything pinned to it comes along, which is the behaviour a
    /// developer expects: the pad is the thing that defines the spot.
    func moveHardpoint(
        _ hardpointID: String,
        in sceneID: String,
        to position: World2NormalizedPoint
    ) {
        let clamped = position.clamped()
        mutate(sceneID) { scene in
            guard let index = scene.hardpoints.firstIndex(where: { $0.id == hardpointID }),
                  !scene.hardpoints[index].isLocked else {
                return
            }
            scene.hardpoints[index].position = clamped
            for instanceIndex in scene.poiInstances.indices
            where scene.poiInstances[instanceIndex].hardpointID == hardpointID {
                scene.poiInstances[instanceIndex].transform =
                    scene.poiInstances[instanceIndex].transform.moved(to: clamped)
            }
        }
    }

    func renameHardpoint(_ hardpointID: String, in sceneID: String, to name: String) {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        mutate(sceneID) { scene in
            guard let index = scene.hardpoints.firstIndex(where: { $0.id == hardpointID }) else {
                return
            }
            scene.hardpoints[index].name = trimmed
        }
    }

    func setAcceptedSizeClasses(
        _ sizeClasses: Set<World2POISizeClass>,
        hardpointID: String,
        in sceneID: String
    ) {
        let resolved = sizeClasses.isEmpty ? World2SceneHardpoint.anySizeClass : sizeClasses
        mutate(sceneID) { scene in
            guard let index = scene.hardpoints.firstIndex(where: { $0.id == hardpointID }) else {
                return
            }
            scene.hardpoints[index].acceptedSizeClasses = resolved
            // A place that no longer fits keeps its position but loses its pin.
            for instanceIndex in scene.poiInstances.indices
            where scene.poiInstances[instanceIndex].hardpointID == hardpointID {
                let archetypeID = scene.poiInstances[instanceIndex].archetypeID
                if let archetype = World2POIRegistry.archetype(archetypeID),
                   !resolved.contains(archetype.sizeClass) {
                    scene.poiInstances[instanceIndex].hardpointID = nil
                }
            }
        }
    }

    func setSnapRadius(_ radius: Double, hardpointID: String, in sceneID: String) {
        mutate(sceneID) { scene in
            guard let index = scene.hardpoints.firstIndex(where: { $0.id == hardpointID }) else {
                return
            }
            scene.hardpoints[index].snapRadius = min(max(radius, 0.02), 0.30)
        }
    }

    func setHardpointLocked(_ isLocked: Bool, hardpointID: String, in sceneID: String) {
        mutate(sceneID) { scene in
            guard let index = scene.hardpoints.firstIndex(where: { $0.id == hardpointID }) else {
                return
            }
            scene.hardpoints[index].isLocked = isLocked
        }
    }

    /// Delete a pad. Whatever stood on it stays put, unpinned, so no place ever
    /// vanishes because a pad did.
    @discardableResult
    func removeHardpoint(_ hardpointID: String, in sceneID: String) -> Bool {
        guard let hardpoint = scene(sceneID).hardpoint(hardpointID),
              !hardpoint.isLocked else {
            return false
        }
        mutate(sceneID) { scene in
            scene.hardpoints.removeAll { $0.id == hardpointID }
            for index in scene.poiInstances.indices
            where scene.poiInstances[index].hardpointID == hardpointID {
                scene.poiInstances[index].hardpointID = nil
            }
        }
        World2Diagnostics.log(
            "scene_editor_hardpoint_removed",
            ["hardpoint": hardpointID, "scene": sceneID]
        )
        return true
    }

    // MARK: - Save, reset, export

    func save() {
        do {
            let data = try Self.encoder.encode(draftScenes)
            defaults.set(data, forKey: storeKey)
            savedScenes = draftScenes
            saveMessage = "Saved on this device"
            print("WORLD2_SCENE_GRAPH_SAVED scenes=\(draftScenes.count)")
        } catch {
            saveMessage = "Could not save scenes"
            print("WORLD2_SCENE_GRAPH_SAVE_FAILED error=\(error.localizedDescription)")
        }
    }

    func discardChanges() {
        pendingSave?.cancel()
        draftScenes = savedScenes
        saveMessage = "Unsaved changes discarded"
    }

    /// Throw away every edit to one scene and go back to the shipped catalog.
    func resetScene(_ sceneID: String) {
        pendingSave?.cancel()
        draftScenes.removeValue(forKey: sceneID)
        scheduleSave()
        World2Diagnostics.log("scene_editor_scene_reset", ["scene": sceneID])
    }

    func validationIssues(for sceneID: String) -> [World2POIRegistryIssue] {
        World2POIRegistry.validate(scene: scene(sceneID))
    }

    /// JSON for one scene, shaped to be pasted back into World2SceneCatalog.
    func exportJSON(sceneID: String? = nil) -> String {
        var scenes: [World2SceneDefinition]
        if let sceneID {
            scenes = [scene(sceneID)]
        } else {
            var ids = Set(draftScenes.keys)
            ids.formUnion(World2SceneCatalog.all.map(\.id))
            scenes = ids.sorted().map { scene($0) }
        }
        scenes.sort { $0.id < $1.id }
        let export = World2SceneGraphExport(
            schemaVersion: Self.schemaVersion,
            exportedAt: Date(),
            scenes: scenes
        )
        guard let data = try? Self.encoder.encode(export),
              let value = String(data: data, encoding: .utf8) else {
            return #"{"schemaVersion":1,"scenes":[]}"#
        }
        return value
    }

    /// One-line-per-pad text summary of the live graph, for console inspection.
    func riggingReport(sceneID: String) -> String {
        let scene = scene(sceneID)
        var lines = [
            "SCENE \(scene.id) — \(scene.poiInstances.count) placed, \(scene.hardpoints.count) pads, \(scene.openHardpoints.count) open"
        ]
        let occupancy = scene.occupancy
        for hardpoint in scene.hardpoints {
            let occupant = occupancy[hardpoint.id]
                .flatMap { scene.instance($0) }
                .map(\.archetypeID) ?? "OPEN"
            lines.append(
                String(
                    format: "  %@ (%.3f, %.3f) accepts %@%@ -> %@",
                    hardpoint.id,
                    hardpoint.position.x,
                    hardpoint.position.y,
                    hardpoint.acceptedSizeSummary,
                    hardpoint.isLocked ? " [locked]" : "",
                    occupant
                )
            )
        }
        for instance in scene.poiInstances where !instance.isSnapped {
            lines.append("  freehand \(instance.archetypeID) — \(instance.transform.debugSummary)")
        }
        return lines.joined(separator: "\n")
    }

    // MARK: - Internals

    private func mutate(
        _ sceneID: String,
        _ body: (inout World2SceneDefinition) -> Void
    ) {
        var working = scene(sceneID)
        body(&working)
        draftScenes[sceneID] = working
        scheduleSave()
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

    private func logValidation() {
        var issues: [World2POIRegistryIssue] = []
        for sceneID in draftScenes.keys.sorted() {
            issues.append(contentsOf: validationIssues(for: sceneID))
        }
        guard !issues.isEmpty else { return }
        for issue in issues {
            World2Diagnostics.log("scene_graph_issue", ["detail": issue.description])
        }
    }

    /// The previous store kept `[poiId: {x, y, scale, rotationDegrees}]`. Apply
    /// those to the matching catalog instances so hand-tuned layouts carry over,
    /// then retire the old key.
    private func migrateLegacyLayouts() -> [String: World2SceneDefinition]? {
        guard let data = defaults.data(forKey: legacyLayoutKey),
              let layouts = try? JSONDecoder().decode(
                  [String: World2LegacyPOILayout].self,
                  from: data
              ),
              !layouts.isEmpty else {
            return nil
        }

        var migrated: [String: World2SceneDefinition] = [:]
        for catalogScene in World2SceneCatalog.all {
            var working = catalogScene
            var touched = false
            for index in working.poiInstances.indices {
                let archetypeID = working.poiInstances[index].archetypeID
                guard let layout = layouts[archetypeID] else { continue }
                let position = World2NormalizedPoint(x: layout.x, y: layout.y)
                working.poiInstances[index].transform = World2POITransform(
                    position: position,
                    scale: layout.scale,
                    rotationDegrees: layout.rotationDegrees
                ).clamped()
                // The old store had no pads, so a migrated position is only
                // still pinned if it happens to land on its pad.
                if let padID = working.poiInstances[index].hardpointID,
                   let pad = working.hardpoint(padID),
                   pad.position.distance(to: position, aspectRatio: 4.0 / 3.0)
                    > pad.snapRadius {
                    working.poiInstances[index].hardpointID = nil
                }
                touched = true
            }
            if touched {
                migrated[working.id] = working
            }
        }

        defaults.removeObject(forKey: legacyLayoutKey)
        return migrated
    }

    private static var encoder: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }

    private static func decodeScenes(_ data: Data?) -> [String: World2SceneDefinition] {
        guard let data else { return [:] }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        if let decoded = try? decoder.decode(
            [String: World2SceneDefinition].self,
            from: data
        ) {
            return decoded
        }
        // Dates were not always ISO-8601; fall back rather than lose a save.
        return (try? JSONDecoder().decode(
            [String: World2SceneDefinition].self,
            from: data
        )) ?? [:]
    }
}

private struct World2SceneGraphExport: Codable {
    let schemaVersion: Int
    let exportedAt: Date
    let scenes: [World2SceneDefinition]
}

private struct World2LegacyPOILayout: Codable {
    let x: Double
    let y: Double
    let scale: Double
    let rotationDegrees: Double
}
