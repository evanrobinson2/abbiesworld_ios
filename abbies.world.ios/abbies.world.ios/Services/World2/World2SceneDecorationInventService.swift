//
//  World2SceneDecorationInventService.swift
//  abbies.world.ios
//
//  Invent decorations for the open scene. A storybook placeholder lands
//  immediately. /api/create paints one asset sheet (gpt-image-2.5-flare),
//  then local carving splits the sheet into cutouts.
//

import Combine
import CryptoKit
import Foundation
import UIKit

struct World2SceneInventProposal: Identifiable, Equatable {
    let id: String
    let label: String
    let reason: String
    let objectFamilyID: String
    let finishID: String
    let personalityID: String
    let placementLayer: World2WorkbenchPlacementLayer
    /// Relative size cue taken from the plate (0.55…1.15).
    let scaleHint: Double
}

struct World2SceneInventResult: Equatable {
    let awarded: [World2GeneratedDecoration]
    /// How many new inventory slots were created (0 if hash/store failed or dupes).
    let addedCount: Int
    let sceneName: String
    let sceneID: String
    /// What the player asked for — hints and freeform text, joined.
    let prompt: String
    /// How many of those props came back as real pictures, not the sticker.
    var picturesReady: Int = 0

    /// Treehouse room when invent ran from a room plate; nil for overland/mutable scenes.
    var treehouseRoom: TreehouseRoomID? {
        TreehouseRoomID.allCases.first { sceneID.hasSuffix(".\($0.rawValue)") }
    }
}

struct World2SceneInventHistoryEntry: Identifiable, Equatable {
    let id: String
    let createdAt: Date
    let result: World2SceneInventResult
}

struct World2InventHint: Identifiable, Equatable, Hashable {
    let id: String
    let title: String
    let symbol: String
    let objectFamilyID: String
    let finishID: String
    let personalityID: String
    let placementLayer: World2WorkbenchPlacementLayer

    /// Short, tappable ideas. The scene picture supplies the look.
    static let catalog: [World2InventHint] = [
        World2InventHint("lamp", "Lamp", "lamp.desk.fill", "object.lighting", "finish.glassy", "personality.dreamy", .floor),
        World2InventHint("pillow", "Pillow", "cloud.fill", "object.seating", "finish.plush", "personality.cozy", .floor),
        World2InventHint("rug", "Rug", "rectangle.pattern.checkered", "object.rug", "finish.plush", "personality.dreamy", .floor),
        World2InventHint("flower", "Flower", "leaf.fill", "object.furniture", "finish.hand-painted", "personality.botanical", .floor),
        World2InventHint("candy", "Candy", "birthday.cake.fill", "object.furniture", "finish.pearlescent", "personality.playful", .floor),
        World2InventHint("bench", "Bench", "sofa.fill", "object.seating", "finish.carved-wood", "personality.cozy", .floor),
        World2InventHint("picture", "Picture", "photo.artframe", "object.wall-decoration", "finish.hand-painted", "personality.storybook", .wall),
        World2InventHint("chest", "Chest", "cabinet.fill", "object.storage", "finish.patchwork", "personality.playful", .floor),
        World2InventHint("banner", "Banner", "flag.fill", "object.wall-decoration", "finish.hand-painted", "personality.fancy", .wall),
        World2InventHint("toy", "Toy", "teddybear.fill", "object.furniture", "finish.patchwork", "personality.playful", .floor),
    ]

    private init(
        _ id: String,
        _ title: String,
        _ symbol: String,
        _ objectFamilyID: String,
        _ finishID: String,
        _ personalityID: String,
        _ placementLayer: World2WorkbenchPlacementLayer
    ) {
        self.id = id
        self.title = title
        self.symbol = symbol
        self.objectFamilyID = objectFamilyID
        self.finishID = finishID
        self.personalityID = personalityID
        self.placementLayer = placementLayer
    }
}

/// What the inventor shows while a picture is in flight.
/// Flare does not send progress events, so `startedAt` drives the timer.
struct World2InventCook: Equatable {
    enum Phase: String, Equatable {
        case drawing
        case carving
        case ready
        case failed
    }

    let id: String
    var title: String
    let sceneName: String
    let startedAt: Date
    var phase: Phase
    var detail: String = "Quick picture"

    func seconds(at date: Date) -> Int {
        max(0, Int(date.timeIntervalSince(startedAt)))
    }

    var headline: String {
        switch phase {
        case .drawing: return "Cooking \(title)"
        case .carving: return "Cutting out \(title)"
        case .ready: return "\(title) is ready"
        case .failed: return "\(title) didn't finish"
        }
    }
}

@MainActor
final class World2SceneDecorationInventService: ObservableObject {
    static let shared = World2SceneDecorationInventService()

    @Published private(set) var isBusy = false
    @Published private(set) var lastResult: World2SceneInventResult?
    @Published private(set) var history: [World2SceneInventHistoryEntry] = []
    @Published private(set) var statusMessage = "Pick a hint or type what you want."
    /// Live cook for the scene / POI inventor. The model does not stream, so this
    /// timer is what an impatient player watches. Stays up if they close the sheet.
    @Published var cook: World2InventCook?

    private let maxHistory = 24

    private init() {}

    /// Proposals grounded in this scene definition + its painted plate.
    func proposals(
        for scene: World2SceneDefinition,
        plate: UIImage?
    ) -> [World2SceneInventProposal] {
        let colors = Self.samplePlateColors(plate)
        let cues = Self.sceneCues(from: scene)
        let ideas = Self.ideas(from: cues, colors: colors)
        let scale = Self.scaleHint(for: plate)

        return ideas.enumerated().map { index, idea in
            World2SceneInventProposal(
                id: "invent-\(scene.id)-\(index)-\(idea.label.lowercased().replacingOccurrences(of: " ", with: "-"))",
                label: World2ChromeContract.shortDecorationLabel(idea.label),
                reason: idea.reason,
                objectFamilyID: idea.objectFamilyID,
                finishID: idea.finishID,
                personalityID: idea.personalityID,
                placementLayer: idea.objectFamilyID == "object.wall-decoration" ? .wall : .floor,
                scaleHint: scale
            )
        }
    }

    /// Player path: a few hint chips and/or freeform words. The plate colors the sprites.
    func inventFromPlayer(
        selectedHintIDs: Set<String>,
        freeform: String,
        scene: World2SceneDefinition,
        plate: UIImage?,
        into playerService: PlayerStateService = .shared
    ) async -> World2SceneInventResult? {
        let chosen = World2InventHint.catalog.filter { selectedHintIDs.contains($0.id) }
        let proposals = Self.playerProposals(
            hints: chosen,
            freeform: freeform,
            scene: scene,
            plate: plate
        )
        guard !proposals.isEmpty else {
            statusMessage = "Pick a hint or type what you want."
            return nil
        }
        isBusy = true
        let title = proposals.count == 1 ? proposals[0].label : "\(proposals.count) props"
        cook = World2InventCook(
            id: UUID().uuidString,
            title: title,
            sceneName: scene.name,
            startedAt: Date(),
            phase: .drawing
        )
        statusMessage = "Cooking \(title)"
        let prompt = proposals.map(\.label).joined(separator: ", ")
        guard var result = invent(
            proposals: proposals,
            scene: scene,
            plate: plate,
            prompt: prompt,
            into: playerService
        ), !result.awarded.isEmpty else {
            isBusy = false
            cook?.phase = .failed
            scheduleCookClear()
            return nil
        }
        let replaced = await replaceWithGeneratedArtwork(
            result,
            sceneName: scene.name,
            plate: plate,
            playerService: playerService
        )
        result.picturesReady = replaced
        isBusy = false
        if replaced == result.awarded.count, replaced > 0 {
            cook?.phase = .ready
            statusMessage = "Ready — \(replaced) new props for \(scene.name)."
        } else if replaced > 0 {
            cook?.phase = .ready
            statusMessage = "Ready — \(replaced) finished. The rest stayed as placeholders."
        } else {
            cook?.phase = .failed
            statusMessage = "The picture didn't finish. The placeholder is staying."
            scheduleCookClear()
        }
        return result
    }

    /// Scene auto-decoration pack: propose from plate cues, mint, cook artwork.
    /// Idempotent per scene while a cook is already in flight.
    @discardableResult
    func autoInventPack(
        for scene: World2SceneDefinition,
        plate: UIImage?,
        labels: [String] = [],
        into playerService: PlayerStateService = .shared
    ) async -> World2SceneInventResult? {
        if isBusy { return nil }
        var proposals = proposals(for: scene, plate: plate)
        if !labels.isEmpty {
            let scale = Self.scaleHint(for: plate)
            proposals = labels.prefix(5).enumerated().map { index, raw in
                let label = World2ChromeContract.shortDecorationLabel(raw)
                let recipe = Self.freeformRecipe(label)
                return World2SceneInventProposal(
                    id: "autodecor-\(scene.id)-\(index)-\(label.lowercased())",
                    label: label,
                    reason: "Studio auto-decoration pack",
                    objectFamilyID: recipe.objectFamilyID,
                    finishID: recipe.finishID,
                    personalityID: recipe.personalityID,
                    placementLayer: recipe.layer,
                    scaleHint: scale
                )
            }
        }
        proposals = Array(proposals.prefix(5))
        guard !proposals.isEmpty else {
            statusMessage = "No prop ideas for this scene yet."
            return nil
        }
        isBusy = true
        let title = "\(proposals.count) props"
        cook = World2InventCook(
            id: UUID().uuidString,
            title: title,
            sceneName: scene.name,
            startedAt: Date(),
            phase: .drawing,
            detail: "Auto pack"
        )
        statusMessage = "Cooking auto pack for \(scene.name)"
        let prompt = proposals.map(\.label).joined(separator: ", ")
        guard var result = invent(
            proposals: proposals,
            scene: scene,
            plate: plate,
            prompt: prompt,
            into: playerService
        ), !result.awarded.isEmpty else {
            isBusy = false
            cook?.phase = .failed
            scheduleCookClear()
            return nil
        }
        let replaced = await replaceWithGeneratedArtwork(
            result,
            sceneName: scene.name,
            plate: plate,
            playerService: playerService
        )
        result.picturesReady = replaced
        isBusy = false
        if replaced > 0 {
            cook?.phase = .ready
            statusMessage = "Auto pack ready — \(replaced) props for \(scene.name)."
        } else {
            cook?.phase = .failed
            statusMessage = "Auto pack placeholders stayed."
            scheduleCookClear()
        }
        return result
    }

    func acknowledgeCook() {
        cook = nil
    }

    /// Dev redo uses the same timer. Play never chooses a model.
    func beginExternalCook(title: String, sceneName: String) {
        cook = World2InventCook(
            id: UUID().uuidString,
            title: title,
            sceneName: sceneName,
            startedAt: Date(),
            phase: .drawing
        )
    }

    func noteExternalCook(_ phase: World2InventCook.Phase) {
        cook?.phase = phase
        if phase == .ready || phase == .failed {
            scheduleCookClear()
        }
    }

    private func scheduleCookClear() {
        let id = cook?.id
        Task { @MainActor in
            try? await Task.sleep(for: .seconds(4))
            if cook?.id == id {
                cook = nil
            }
        }
    }

    @discardableResult
    func invent(
        proposals: [World2SceneInventProposal],
        scene: World2SceneDefinition,
        plate: UIImage?,
        prompt: String = "",
        into playerService: PlayerStateService = .shared
    ) -> World2SceneInventResult? {
        guard !proposals.isEmpty else {
            statusMessage = "Choose at least one idea first."
            return nil
        }
        guard let placeholderPNG = World2PlaceholderPack.pngData(for: .decoration) else {
            statusMessage = "Placeholder pack is missing."
            return nil
        }

        var decorations: [World2GeneratedDecoration] = []
        var images: [String: Data] = [:]
        let packID = "scene-invent-\(scene.id)-\(UUID().uuidString.lowercased())"
        let awardedAt = Date()

        for (index, proposal) in proposals.enumerated() {
            let recipe = World2AssetWorkbenchRecipe(
                finishID: proposal.finishID,
                objectFamilyID: proposal.objectFamilyID,
                personalityID: proposal.personalityID
            )
            guard recipe.isValid else { continue }
            let png = placeholderPNG
            let digest = SHA256Digest.hex(of: png)
            let decoration = World2GeneratedDecoration(
                id: "\(packID)-\(index)",
                packID: packID,
                label: World2ChromeContract.shortDecorationLabel(proposal.label),
                registryKey: "scene-invent/\(scene.id)/\(packID)/\(index)",
                registryRevision: 1,
                sha256: digest,
                placementLayer: proposal.placementLayer,
                recipe: recipe,
                awardedAt: awardedAt
            )
            decorations.append(decoration)
            images[decoration.id] = png
        }

        let added = playerService.awardWorkbenchDecorations(decorations, images: images)
        let result = World2SceneInventResult(
            awarded: decorations,
            addedCount: added,
            sceneName: scene.name,
            sceneID: scene.id,
            prompt: prompt
        )
        lastResult = result
        if added > 0 {
            let entry = World2SceneInventHistoryEntry(
                id: "\(packID)-history",
                createdAt: awardedAt,
                result: result
            )
            history.insert(entry, at: 0)
            if history.count > maxHistory {
                history = Array(history.prefix(maxHistory))
            }
        } else if decorations.isEmpty {
            statusMessage = "Couldn’t start. Try again."
        } else {
            statusMessage = "The placeholder didn’t land in inventory."
        }
        World2Diagnostics.log(
            "scene_invent_decorations",
            [
                "scene": scene.id,
                "plate": plate == nil ? "missing" : "present",
                "proposed": "\(proposals.count)",
                "minted": "\(decorations.count)",
                "awarded": "\(added)"
            ]
        )
        return result
    }

    private func replaceWithGeneratedArtwork(
        _ result: World2SceneInventResult,
        sceneName: String,
        plate: UIImage?,
        playerService: PlayerStateService
    ) async -> Int {
        let store = World2GeneratedDecorationImageStore.shared
        let awarded = result.awarded
        for decoration in awarded {
            store.setGenerating(decoration.id, isGenerating: true)
        }
        cook?.phase = .drawing
        cook?.title = awarded.count == 1 ? awarded[0].label : "\(awarded.count) props"
        statusMessage = awarded.count == 1
            ? "Cooking \(awarded[0].label)"
            : "Cooking a sheet of \(awarded.count)"
        do {
            let sheet = try await World2AssetGenerationService.fetchDecorationSheetPNG(
                subjects: awarded.map(\.label),
                placeName: sceneName,
                plate: plate
            )
            cook?.phase = .carving
            statusMessage = "Carving the sheet"
            let islands = (try? DevAssetCarvingService.carveSheetIslands(from: sheet)) ?? []
            World2Diagnostics.log(
                "scene_invent_sheet_carved",
                [
                    "scene": result.sceneID,
                    "expected": "\(awarded.count)",
                    "islands": "\(islands.count)",
                    "model": World2AssetGenerationService.quickModel,
                    "quality": World2AssetGenerationService.quickQuality,
                ]
            )
            var replaced = 0
            for (index, decoration) in awarded.enumerated() {
                let png: Data?
                if index < islands.count {
                    png = islands[index]
                } else if islands.isEmpty, index == 0 {
                    png = World2AssetGenerationService.finish(sheet, kind: .decoration)
                } else {
                    png = nil
                }
                if let png,
                   playerService.replaceGeneratedDecorationArtwork(id: decoration.id, png: png) {
                    replaced += 1
                }
                store.setGenerating(decoration.id, isGenerating: false)
            }
            return replaced
        } catch {
            World2Diagnostics.log(
                "scene_invent_generate_failed",
                [
                    "scene": result.sceneID,
                    "reason": error.localizedDescription,
                    "model": World2AssetGenerationService.quickModel,
                    "quality": World2AssetGenerationService.quickQuality,
                ]
            )
            for decoration in awarded {
                store.setGenerating(decoration.id, isGenerating: false)
            }
            return 0
        }
    }

    // MARK: - Player prompts

    private static func playerProposals(
        hints: [World2InventHint],
        freeform: String,
        scene: World2SceneDefinition,
        plate: UIImage?
    ) -> [World2SceneInventProposal] {
        let scale = scaleHint(for: plate)
        var proposals: [World2SceneInventProposal] = []
        for hint in hints {
            proposals.append(
                World2SceneInventProposal(
                    id: "invent-\(scene.id)-hint-\(hint.id)",
                    label: World2ChromeContract.shortDecorationLabel(hint.title),
                    reason: "Inspired by \(scene.name)",
                    objectFamilyID: hint.objectFamilyID,
                    finishID: hint.finishID,
                    personalityID: hint.personalityID,
                    placementLayer: hint.placementLayer,
                    scaleHint: scale
                )
            )
        }
        let phrases = freeform
            .split(whereSeparator: { $0 == "," || $0 == "\n" })
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .prefix(4)
        for (index, phrase) in phrases.enumerated() {
            let titled = phrase.prefix(1).uppercased() + phrase.dropFirst()
            let recipe = freeformRecipe(phrase)
            proposals.append(
                World2SceneInventProposal(
                    id: "invent-\(scene.id)-words-\(index)-\(titled.lowercased())",
                    label: World2ChromeContract.shortDecorationLabel(String(titled)),
                    reason: "Your words, colored from \(scene.name)",
                    objectFamilyID: recipe.objectFamilyID,
                    finishID: recipe.finishID,
                    personalityID: recipe.personalityID,
                    placementLayer: recipe.layer,
                    scaleHint: scale
                )
            )
        }
        return proposals
    }

    private static func freeformRecipe(_ phrase: String) -> (
        objectFamilyID: String,
        finishID: String,
        personalityID: String,
        layer: World2WorkbenchPlacementLayer
    ) {
        let lower = phrase.lowercased()
        if lower.contains("lamp") || lower.contains("light") || lower.contains("lantern") {
            return ("object.lighting", "finish.glassy", "personality.dreamy", .floor)
        }
        if lower.contains("rug") || lower.contains("carpet") {
            return ("object.rug", "finish.plush", "personality.dreamy", .floor)
        }
        if lower.contains("pillow") || lower.contains("bench") || lower.contains("chair") || lower.contains("stool") {
            return ("object.seating", "finish.plush", "personality.cozy", .floor)
        }
        if lower.contains("picture") || lower.contains("banner") || lower.contains("sign") || lower.contains("poster") {
            return ("object.wall-decoration", "finish.hand-painted", "personality.storybook", .wall)
        }
        if lower.contains("chest") || lower.contains("box") || lower.contains("cabinet") {
            return ("object.storage", "finish.patchwork", "personality.playful", .floor)
        }
        if lower.contains("flower") || lower.contains("plant") || lower.contains("leaf") {
            return ("object.furniture", "finish.hand-painted", "personality.botanical", .floor)
        }
        return ("object.furniture", "finish.hand-painted", "personality.playful", .floor)
    }

    // MARK: - Scene cues (exact place, not a guess-world)

    private struct SceneCues {
        let name: String
        let summary: String
        let poiNames: [String]
        let hardpointNotes: [String]
        let blob: String
    }

    private struct Idea {
        let label: String
        let reason: String
        let objectFamilyID: String
        let finishID: String
        let personalityID: String

        init(
            _ label: String,
            _ reason: String,
            _ objectFamilyID: String,
            _ finishID: String,
            _ personalityID: String
        ) {
            self.label = label
            self.reason = reason
            self.objectFamilyID = objectFamilyID
            self.finishID = finishID
            self.personalityID = personalityID
        }
    }

    private static func sceneCues(from scene: World2SceneDefinition) -> SceneCues {
        let poiNames = scene.poiInstances.compactMap {
            World2POIRegistry.archetype($0.archetypeID)?.name
        }
        let notes = scene.hardpoints.compactMap(\.notes)
        let blob = ([scene.name, scene.summary] + poiNames + notes + scene.hardpoints.map(\.name))
            .joined(separator: " ")
            .lowercased()
        return SceneCues(
            name: scene.name,
            summary: scene.summary,
            poiNames: poiNames,
            hardpointNotes: notes,
            blob: blob
        )
    }

    private static func ideas(from cues: SceneCues, colors: [UIColor]) -> [Idea] {
        var ideas: [Idea] = []
        let tone = colorToneLabel(colors)

        // Ground every idea in *this* scene's written facts.
        if let firstPOI = cues.poiNames.first {
            ideas.append(
                Idea(
                    World2ChromeContract.shortDecorationLabel("\(firstPOI) keep"),
                    "Sized for \(cues.name) — echoes \(firstPOI) on this plate",
                    "object.wall-decoration",
                    "finish.hand-painted",
                    "personality.storybook"
                )
            )
        }
        if let note = cues.hardpointNotes.first {
            ideas.append(
                Idea(
                    "Pad buddy",
                    "Fits the open clearing: \(note)",
                    "object.furniture",
                    "finish.carved-wood",
                    "personality.cozy"
                )
            )
        }

        if cues.blob.contains("garden") || cues.blob.contains("art") || cues.blob.contains("atelier") {
            ideas += [
                Idea("Paint rug", "Pulled from \(cues.name)’s \(tone) floor mood", "object.rug", "finish.hand-painted", "personality.playful"),
                Idea("Easel lamp", "Studio light matching this plate", "object.lighting", "finish.glassy", "personality.storybook"),
            ]
        }
        if cues.blob.contains("bear") || cues.blob.contains("woods") || cues.blob.contains("forest") || cues.blob.contains("porridge") {
            ideas += [
                Idea("Stool", "Just-right seating for this cottage plate", "object.seating", "finish.carved-wood", "personality.cozy"),
                Idea("Acorn lamp", "Woodland glow sampled from the map", "object.lighting", "finish.plush", "personality.botanical"),
            ]
        }
        if cues.blob.contains("farm") || cues.blob.contains("meadow") {
            ideas += [
                Idea("Hay seat", "Farmyard lounge for this meadow", "object.seating", "finish.carved-wood", "personality.cozy"),
                Idea("Sunflower", "Meadow cheer from this plate", "object.wall-decoration", "finish.hand-painted", "personality.botanical"),
            ]
        }
        if cues.blob.contains("citadel") || cues.blob.contains("evan") || cues.blob.contains("daddy") || cues.blob.contains("mountain") {
            ideas += [
                Idea("Crystal lamp", "Matches this mountain-base plate", "object.lighting", "finish.glassy", "personality.dreamy"),
                Idea("Glass bench", "Citadel seating in \(tone) tones", "object.seating", "finish.pearlescent", "personality.fancy"),
            ]
        }
        if cues.blob.contains("treehouse") || cues.blob.contains("abbie") || cues.blob.contains("cozy") {
            ideas += [
                Idea("Pillow pile", "Cozy seating for this treehouse plate", "object.seating", "finish.plush", "personality.cozy"),
                Idea("Leaf lamp", "Leaf-light sampled from the room plate", "object.lighting", "finish.hand-painted", "personality.botanical"),
            ]
        }
        if cues.blob.contains("work") || cues.blob.contains("city") || cues.blob.contains("machine") {
            ideas += [
                Idea("Gear table", "Machine-shop furniture for this plate", "object.furniture", "finish.glassy", "personality.playful"),
                Idea("Blueprint", "Planning energy from this city plate", "object.wall-decoration", "finish.hand-painted", "personality.storybook"),
            ]
        }

        // Always include plate-palette props so every real scene has options.
        ideas += [
            Idea(
                "Chest",
                "Storage carved in this plate’s \(tone) palette",
                "object.storage",
                "finish.patchwork",
                "personality.playful"
            ),
            Idea(
                "Cloud rug",
                "Floor magic tinted from \(cues.name)’s pixels",
                "object.rug",
                "finish.plush",
                "personality.dreamy"
            ),
            Idea(
                "Lantern",
                "Gentle light using colors sampled from this exact scene",
                "object.lighting",
                "finish.pearlescent",
                "personality.storybook"
            ),
        ]

        var seen = Set<String>()
        var unique: [Idea] = []
        for idea in ideas where seen.insert(idea.label).inserted {
            unique.append(idea)
            if unique.count == 6 { break }
        }
        return unique
    }

    // MARK: - Plate sampling

    private static func samplePlateColors(_ plate: UIImage?) -> [UIColor] {
        guard let plate, let cg = plate.cgImage else {
            return [
                UIColor(red: 0.98, green: 0.62, blue: 0.78, alpha: 1),
                UIColor(red: 0.45, green: 0.78, blue: 0.92, alpha: 1),
                UIColor(red: 0.98, green: 0.82, blue: 0.42, alpha: 1),
            ]
        }
        let width = 16
        let height = 16
        var rgba = [UInt8](repeating: 0, count: width * height * 4)
        guard let context = CGContext(
            data: &rgba,
            width: width,
            height: height,
            bitsPerComponent: 8,
            bytesPerRow: width * 4,
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return samplePlateColors(nil)
        }
        context.interpolationQuality = .low
        context.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))

        var samples: [(r: Double, g: Double, b: Double, sat: Double)] = []
        for i in stride(from: 0, to: rgba.count, by: 4) {
            let a = Double(rgba[i + 3]) / 255.0
            guard a > 0.12 else { continue }
            let r = Double(rgba[i]) / 255.0
            let g = Double(rgba[i + 1]) / 255.0
            let b = Double(rgba[i + 2]) / 255.0
            let maxC = max(r, g, b)
            let minC = min(r, g, b)
            let sat = maxC - minC
            samples.append((r, g, b, sat))
        }
        guard !samples.isEmpty else { return samplePlateColors(nil) }

        let vivid = samples.sorted { $0.sat > $1.sat }
        let picks = [vivid[0], vivid[min(3, vivid.count - 1)], vivid[min(7, vivid.count - 1)]]
        return picks.map {
            UIColor(red: $0.r, green: $0.g, blue: $0.b, alpha: 1)
        }
    }

    private static func colorToneLabel(_ colors: [UIColor]) -> String {
        guard let first = colors.first else { return "soft" }
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        first.getRed(&r, green: &g, blue: &b, alpha: &a)
        if b > r && b > g { return "cool" }
        if r > g && r > b { return "warm" }
        if g > r && g > b { return "leafy" }
        return "soft"
    }

    /// Smaller plates → slightly smaller props so scale matches the scene.
    private static func scaleHint(for plate: UIImage?) -> Double {
        guard let plate else { return 0.85 }
        let longest = max(plate.size.width, plate.size.height)
        if longest < 900 { return 0.72 }
        if longest > 1800 { return 1.05 }
        return 0.88
    }
}

private enum SHA256Digest {
    /// Must match `World2GeneratedDecorationImageStore` (CryptoKit), or store rejects every PNG.
    static func hex(of data: Data) -> String {
        SHA256.hash(data: data)
            .map { String(format: "%02x", $0) }
            .joined()
    }
}
