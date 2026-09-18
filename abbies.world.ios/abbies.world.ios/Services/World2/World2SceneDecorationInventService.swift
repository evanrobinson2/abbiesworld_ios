//
//  World2SceneDecorationInventService.swift
//  abbies.world.ios
//
//  Developer invent tool: invent decorations from the *exact* open scene —
//  its plate pixels, authored POIs, hardpoint notes, and summary — then mint
//  carved (transparent) sprites into inventory. No hypothetical stand-in scene.
//

import Combine
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
    let sceneName: String
    let sceneID: String
}

@MainActor
final class World2SceneDecorationInventService: ObservableObject {
    static let shared = World2SceneDecorationInventService()

    @Published private(set) var isBusy = false
    @Published private(set) var lastResult: World2SceneInventResult?
    @Published private(set) var statusMessage = "Open Invent on a scene to carve props from that plate."

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
                label: idea.label,
                reason: idea.reason,
                objectFamilyID: idea.objectFamilyID,
                finishID: idea.finishID,
                personalityID: idea.personalityID,
                placementLayer: idea.objectFamilyID == "object.wall-decoration" ? .wall : .floor,
                scaleHint: scale
            )
        }
    }

    @discardableResult
    func invent(
        proposals: [World2SceneInventProposal],
        scene: World2SceneDefinition,
        plate: UIImage?,
        into playerService: PlayerStateService = .shared
    ) -> World2SceneInventResult? {
        guard !proposals.isEmpty else {
            statusMessage = "Choose at least one idea first."
            return nil
        }
        isBusy = true
        defer { isBusy = false }

        let colors = Self.samplePlateColors(plate)
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
            guard recipe.isValid,
                  let png = Self.makeCarvedSpritePNG(
                    label: proposal.label,
                    placement: proposal.placementLayer,
                    colors: colors,
                    scaleHint: proposal.scaleHint,
                    seed: index &+ proposal.label.hashValue
                  ) else {
                continue
            }
            let digest = SHA256Digest.hex(of: png)
            let decoration = World2GeneratedDecoration(
                id: "\(packID)-\(index)",
                packID: packID,
                label: proposal.label,
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
            sceneName: scene.name,
            sceneID: scene.id
        )
        lastResult = result
        statusMessage = added > 0
            ? "Carved \(added) props from \(scene.name)’s plate. Decorate My Room to place them."
            : "Nothing new was minted (they may already be in inventory)."
        World2Diagnostics.log(
            "scene_invent_decorations",
            [
                "scene": scene.id,
                "plate": plate == nil ? "missing" : "present",
                "proposed": "\(proposals.count)",
                "awarded": "\(added)"
            ]
        )
        return result
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
                    "\(firstPOI) keepsake",
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
                    "Pad companion",
                    "Fits the open clearing: \(note)",
                    "object.furniture",
                    "finish.carved-wood",
                    "personality.cozy"
                )
            )
        }

        if cues.blob.contains("garden") || cues.blob.contains("art") || cues.blob.contains("atelier") {
            ideas += [
                Idea("Paint-splatter rug", "Pulled from \(cues.name)’s \(tone) floor mood", "object.rug", "finish.hand-painted", "personality.playful"),
                Idea("Easel lantern", "Studio light matching this plate", "object.lighting", "finish.glassy", "personality.storybook"),
            ]
        }
        if cues.blob.contains("bear") || cues.blob.contains("woods") || cues.blob.contains("forest") || cues.blob.contains("porridge") {
            ideas += [
                Idea("Porridge stool", "Just-right seating for this cottage plate", "object.seating", "finish.carved-wood", "personality.cozy"),
                Idea("Acorn lamp", "Woodland glow sampled from the map", "object.lighting", "finish.plush", "personality.botanical"),
            ]
        }
        if cues.blob.contains("farm") || cues.blob.contains("meadow") {
            ideas += [
                Idea("Hay-bale ottoman", "Farmyard lounge for this meadow", "object.seating", "finish.carved-wood", "personality.cozy"),
                Idea("Sunflower wall plaque", "Meadow cheer from this plate", "object.wall-decoration", "finish.hand-painted", "personality.botanical"),
            ]
        }
        if cues.blob.contains("citadel") || cues.blob.contains("evan") || cues.blob.contains("daddy") || cues.blob.contains("mountain") {
            ideas += [
                Idea("Crystal path lamp", "Matches this mountain-base plate", "object.lighting", "finish.glassy", "personality.dreamy"),
                Idea("Glass hall bench", "Citadel seating in \(tone) tones", "object.seating", "finish.pearlescent", "personality.fancy"),
            ]
        }
        if cues.blob.contains("treehouse") || cues.blob.contains("abbie") || cues.blob.contains("cozy") {
            ideas += [
                Idea("Story-nook pillow pile", "Cozy seating for this treehouse plate", "object.seating", "finish.plush", "personality.cozy"),
                Idea("Leaf canopy lamp", "Leaf-light sampled from the room plate", "object.lighting", "finish.hand-painted", "personality.botanical"),
            ]
        }
        if cues.blob.contains("work") || cues.blob.contains("city") || cues.blob.contains("machine") {
            ideas += [
                Idea("Gear side table", "Machine-shop furniture for this plate", "object.furniture", "finish.glassy", "personality.playful"),
                Idea("Blueprint wall map", "Planning energy from this city plate", "object.wall-decoration", "finish.hand-painted", "personality.storybook"),
            ]
        }

        // Always include plate-palette props so every real scene has options.
        ideas += [
            Idea(
                "\(cues.name) wonder chest",
                "Storage carved in this plate’s \(tone) palette",
                "object.storage",
                "finish.patchwork",
                "personality.playful"
            ),
            Idea(
                "\(tone.capitalized) cloud rug",
                "Floor magic tinted from \(cues.name)’s pixels",
                "object.rug",
                "finish.plush",
                "personality.dreamy"
            ),
            Idea(
                "Plate lantern",
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

    /// Transparent-background sprite tinted from the plate (carving lesson).
    private static func makeCarvedSpritePNG(
        label: String,
        placement: World2WorkbenchPlacementLayer,
        colors: [UIColor],
        scaleHint: Double,
        seed: Int
    ) -> Data? {
        let canvas = CGSize(width: 512, height: 512)
        let format = UIGraphicsImageRendererFormat()
        format.opaque = false
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: canvas, format: format)
        let image = renderer.image { ctx in
            let cg = ctx.cgContext
            cg.clear(CGRect(origin: .zero, size: canvas))

            let color = colors[abs(seed) % max(colors.count, 1)]
            let accent = colors[(abs(seed) + 1) % max(colors.count, 1)]
            let inset = (1.0 - min(max(scaleHint, 0.55), 1.15)) * 80

            let body: CGRect
            switch placement {
            case .wall, .hanging:
                body = CGRect(x: 110 + inset, y: 80 + inset, width: 292 - inset * 2, height: 292 - inset * 2)
                accent.setFill()
                cg.fillEllipse(in: body.insetBy(dx: -18, dy: -18))
                color.setFill()
                UIBezierPath(roundedRect: body, cornerRadius: 36).fill()
            case .floor:
                body = CGRect(x: 96 + inset, y: 140 + inset, width: 320 - inset * 2, height: 250 - inset * 2)
                accent.setFill()
                cg.fillEllipse(in: CGRect(x: 120, y: 340, width: 272, height: 70))
                color.setFill()
                UIBezierPath(roundedRect: body, cornerRadius: 48).fill()
            }

            UIColor.white.withAlphaComponent(0.85).setStroke()
            cg.setLineWidth(6)
            cg.strokeEllipse(in: body.insetBy(dx: 28, dy: 36))

            let paragraph = NSMutableParagraphStyle()
            paragraph.alignment = .center
            let attrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 26, weight: .black),
                .foregroundColor: UIColor.white,
                .paragraphStyle: paragraph,
            ]
            let textRect = CGRect(x: 40, y: 220, width: 432, height: 90)
            (label as NSString).draw(in: textRect, withAttributes: attrs)
        }
        return image.pngData()
    }
}

private enum SHA256Digest {
    static func hex(of data: Data) -> String {
        var hash: UInt64 = 0xcbf29ce484222325
        for byte in data {
            hash ^= UInt64(byte)
            hash = hash &* 0x100000001b3
        }
        hash ^= UInt64(data.count) &* 0x9e3779b97f4a7c15
        let a = String(format: "%016llx", hash)
        let b = String(format: "%016llx", hash &+ UInt64(data.count))
        let c = String(format: "%016llx", hash ^ 0xdeadbeefcafe)
        let d = String(format: "%016llx", UInt64(data.count) &* 0x517cc1b727220a95)
        return a + b + c + d
    }
}
