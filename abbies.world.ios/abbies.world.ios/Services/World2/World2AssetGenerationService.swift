//
//  World2AssetGenerationService.swift
//  abbies.world.ios
//
//  iPad image generation goes through Evan's server (`POST /api/create`),
//  never OpenAI directly. Decorations and POIs ask for gpt-image-2.5-flare
//  at quality=low — that model does not stream partials, so the cook toast
//  is a local timer. A higher-quality reprompt can be added later.
//  Scene plates stay whole. The open plate cannot be uploaded as a reference
//  id, so its colors are named in the prompt.
//

import UIKit

enum World2AssetGenerationService {
    /// Fastest everyday model from the image-gen contract. Not a streaming model.
    static let quickModel = "gpt-image-2.5-flare"
    static let quickQuality = "low"
    /// Dev-only redo. Never offered as a choice during play.
    static let fineQuality = "high"

    enum Failure: LocalizedError {
        case undecodable

        var errorDescription: String? {
            "The picture didn't come back."
        }
    }

    static func generatePNG(
        kind: World2PlaceholderKind,
        subject: String,
        placeName: String,
        plate: UIImage? = nil
    ) async throws -> Data {
        let raw = try await fetchPNG(
            kind: kind,
            subject: subject,
            placeName: placeName,
            plate: plate
        )
        return finish(raw, kind: kind)
    }

    static func fetchPNG(
        kind: World2PlaceholderKind,
        subject: String,
        placeName: String,
        plate: UIImage? = nil,
        quality: String = quickQuality,
        onStatus: (@MainActor (String) -> Void)? = nil
    ) async throws -> Data {
        let prompt = prompt(
            kind: kind,
            subject: subject,
            placeName: placeName,
            palette: palettePhrase(from: plate)
        )
        let image = try await HeadDAGService.shared.generatePicture(
            prompt: prompt,
            quality: quality,
            imageModel: quickModel,
            onStatus: onStatus
        )
        guard let data = image.pngData() else {
            throw Failure.undecodable
        }
        return data
    }

    /// One atlas of several isolated props. The caller carves the cells.
    static func fetchDecorationSheetPNG(
        subjects: [String],
        placeName: String,
        plate: UIImage? = nil,
        quality: String = quickQuality,
        onStatus: (@MainActor (String) -> Void)? = nil
    ) async throws -> Data {
        let names = subjects
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        guard !names.isEmpty else { throw Failure.undecodable }
        let size = World2AssetSheetLayout.pixelSize(for: names.count)
        let image = try await HeadDAGService.shared.generatePicture(
            prompt: sheetPrompt(
                subjects: names,
                placeName: placeName,
                palette: palettePhrase(from: plate)
            ),
            quality: quality,
            imageModel: quickModel,
            imageWidth: size.width,
            imageHeight: size.height,
            onStatus: onStatus
        )
        guard let data = image.pngData() else {
            throw Failure.undecodable
        }
        return data
    }

    /// Carve a cutout for decorations and POIs. Scenes stay a full plate.
    static func finish(_ data: Data, kind: World2PlaceholderKind) -> Data {
        guard kind != .scene else { return data }
        let cut = DevAssetCarvingService.spriteCutoutPNG(from: data)
        if cut == data {
            World2Diagnostics.log(
                "asset_carve_kept_full_image",
                ["kind": kind.rawValue]
            )
        }
        return cut
    }

    private static func prompt(
        kind: World2PlaceholderKind,
        subject: String,
        placeName: String,
        palette: String
    ) -> String {
        let colors = palette.isEmpty ? "" : " Echo these colors from the place: \(palette)."
        switch kind {
        case .decoration:
            return """
            Safe for young children. One single decoration object: \(subject). \
            Isolated, centered, sticker cutout on a plain flat light-grey background. \
            No text, no letters, no watermark, no frame, no people. \
            Storybook illustration, inspired by the place "\(placeName)".\(colors)
            """
        case .scene:
            return """
            Safe for young children. A wide landscape plate of a place: \(subject). \
            Watercolor storybook world, sky and ground, room to walk. \
            No text, no letters, no watermark, no UI, no characters in the foreground.\(colors)
            """
        case .poi:
            return """
            Safe for young children. One building or landmark you can walk up to: \(subject). \
            Isolated, centered, chunky clay-sculpture look on a plain flat light-grey background. \
            No text, no letters, no watermark, no people. Inspired by "\(placeName)".\(colors)
            """
        }
    }

    private static func sheetPrompt(
        subjects: [String],
        placeName: String,
        palette: String
    ) -> String {
        let columns = World2AssetSheetLayout.columns(for: subjects.count)
        let rows = World2AssetSheetLayout.rows(for: subjects.count)
        let listed = subjects.enumerated()
            .map { "\($0.offset + 1). \($0.element)" }
            .joined(separator: "\n")
        let colors = palette.isEmpty ? "" : " Echo these colors from the place: \(palette)."
        return """
        Safe for young children. Asset sheet of exactly \(subjects.count) isolated \
        decoration objects on a plain flat light-grey background. \
        Arrange them in a \(columns) by \(rows) grid with generous empty gaps so \
        objects never touch. Each cell holds one object, centered, sticker-cutout style. \
        No text, no letters, no numbers, no labels, no watermark, no frame, no people. \
        Left to right, then top to bottom:
        \(listed)
        Storybook illustration inspired by the place "\(placeName)".\(colors)
        """
    }

    private static func palettePhrase(from plate: UIImage?) -> String {
        guard let plate, let cg = plate.cgImage else { return "" }
        let width = 8
        let height = 8
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
            return ""
        }
        context.interpolationQuality = .low
        context.draw(cg, in: CGRect(x: 0, y: 0, width: width, height: height))
        var names: [String] = []
        for index in stride(from: 0, to: rgba.count, by: 4) {
            let alpha = Double(rgba[index + 3]) / 255
            guard alpha > 0.2 else { continue }
            let name = colorName(
                r: Double(rgba[index]) / 255,
                g: Double(rgba[index + 1]) / 255,
                b: Double(rgba[index + 2]) / 255
            )
            if !names.contains(name) {
                names.append(name)
            }
            if names.count == 3 { break }
        }
        return names.joined(separator: ", ")
    }

    private static func colorName(r: Double, g: Double, b: Double) -> String {
        if r > 0.72 && g > 0.62 && b < 0.45 { return "gold" }
        if r > 0.65 && g < 0.45 && b < 0.45 { return "red" }
        if r > 0.7 && g > 0.35 && g < 0.7 && b < 0.4 { return "orange" }
        if r > 0.6 && b > 0.45 && g < 0.65 { return "pink" }
        if g > r && g > b && g > 0.35 { return "green" }
        if b > r && b > g && b > 0.35 { return "blue" }
        if r > 0.7 && g > 0.6 && b > 0.5 { return "cream" }
        if r < 0.25 && g < 0.25 && b < 0.25 { return "ink" }
        return "soft color"
    }
}

enum World2AssetSheetLayout {
    static func columns(for count: Int) -> Int {
        switch count {
        case ...1: return 1
        case 2...4: return 2
        default: return 3
        }
    }

    static func rows(for count: Int) -> Int {
        let cols = columns(for: count)
        guard cols > 0 else { return 1 }
        return max(1, Int(ceil(Double(max(count, 1)) / Double(cols))))
    }

    static func pixelSize(for count: Int) -> (width: Int, height: Int) {
        count <= 4 ? (1024, 1024) : (1536, 1024)
    }
}
