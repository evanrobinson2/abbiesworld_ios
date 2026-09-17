import SwiftUI
import UIKit

/// Theme colors pulled from a scene backdrop so chrome (title chip, etc.)
/// reads against the art instead of sitting on a generic white slab.
struct World2ScenePalette: Equatable, Sendable {
    var chromeFill: Color
    var chromeStroke: Color
    var titleInk: Color
    var subtitleInk: Color
    var accent: Color

    static let blankWorld = World2ScenePalette(
        chromeFill: Color(red: 0.12, green: 0.18, blue: 0.28).opacity(0.78),
        chromeStroke: Color.white.opacity(0.28),
        titleInk: .white,
        subtitleInk: Color.white.opacity(0.78),
        accent: Color(red: 0.45, green: 0.78, blue: 1.0)
    )

    static func detect(from image: UIImage?) -> World2ScenePalette {
        guard let image, let sample = image.averageColorSample() else {
            return .blankWorld
        }
        let luminance = sample.luminance
        let isLight = luminance > 0.62
        let fill = isLight
            ? Color(
                red: max(0, sample.red - 0.18),
                green: max(0, sample.green - 0.16),
                blue: max(0, sample.blue - 0.10)
            ).opacity(0.82)
            : Color(
                red: min(1, sample.red + 0.08),
                green: min(1, sample.green + 0.10),
                blue: min(1, sample.blue + 0.14)
            ).opacity(0.78)
        let ink: Color = isLight ? Color(white: 0.12) : .white
        let subtitle = isLight ? Color(white: 0.28) : Color.white.opacity(0.78)
        let accent = Color(
            red: min(1, sample.red + 0.22),
            green: min(1, sample.green + 0.18),
            blue: min(1, sample.blue + 0.12)
        )
        return World2ScenePalette(
            chromeFill: fill,
            chromeStroke: accent.opacity(0.55),
            titleInk: ink,
            subtitleInk: subtitle,
            accent: accent
        )
    }
}

private struct RGBSample {
    let red: Double
    let green: Double
    let blue: Double

    var luminance: Double {
        0.2126 * red + 0.7152 * green + 0.0722 * blue
    }
}

private extension UIImage {
    /// Coarse grid average — good enough for chrome theming, cheap on iPad.
    func averageColorSample() -> RGBSample? {
        guard let cgImage else { return nil }
        let width = 24
        let height = 24
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
            return nil
        }
        context.interpolationQuality = .low
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))

        var r = 0.0, g = 0.0, b = 0.0, count = 0.0
        for i in stride(from: 0, to: rgba.count, by: 4) {
            let a = Double(rgba[i + 3]) / 255.0
            guard a > 0.08 else { continue }
            r += Double(rgba[i]) / 255.0
            g += Double(rgba[i + 1]) / 255.0
            b += Double(rgba[i + 2]) / 255.0
            count += 1
        }
        guard count > 0 else { return nil }
        return RGBSample(red: r / count, green: g / count, blue: b / count)
    }
}
