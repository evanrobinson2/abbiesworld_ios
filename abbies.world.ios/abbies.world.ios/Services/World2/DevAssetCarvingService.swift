import CryptoKit
import Foundation
import ImageIO
import UIKit

enum DevAssetReviewDecision: String, Codable, CaseIterable {
    case pending
    case approved
    case rejected
}

struct DevCarvedAsset: Identifiable, @unchecked Sendable {
    let id: String
    let sourceBounds: CGRect
    let originalCrop: UIImage
    let strippedImage: UIImage
    var label: String
    var category: String
    var decision: DevAssetReviewDecision

    var pixelSizeLabel: String {
        "\(Int(sourceBounds.width)) × \(Int(sourceBounds.height))"
    }
}

struct DevAssetCarvingResult: @unchecked Sendable {
    let sessionID: String
    let sourceImage: UIImage
    let sourceSHA256: String
    let processedPixelSize: CGSize
    let backgroundRGB: [Int]
    let assets: [DevCarvedAsset]
}

struct DevAssetCarvingSavedSession {
    let directoryURL: URL
    let manifestURL: URL
    let approvedCount: Int
}

enum DevAssetCarvingError: LocalizedError {
    case invalidURL
    case insecureURL
    case invalidResponse
    case httpStatus(Int)
    case unsupportedContentType
    case downloadTooLarge
    case imageTooLarge
    case invalidImage
    case noAssets
    case pendingReviews(Int)
    case writeFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Enter a complete CDN image URL."
        case .insecureURL:
            return "The carving lab accepts HTTPS URLs without embedded usernames or passwords."
        case .invalidResponse:
            return "The CDN did not return a valid response."
        case .httpStatus(let status):
            return "The CDN returned HTTP \(status)."
        case .unsupportedContentType:
            return "The URL did not return a supported image."
        case .downloadTooLarge:
            return "The image is larger than the 15 MB download limit."
        case .imageTooLarge:
            return "The image has too many pixels. Use an atlas no larger than 16 megapixels."
        case .invalidImage:
            return "The downloaded data could not be decoded as an image."
        case .noAssets:
            return "No distinct objects were found against the image border color."
        case .pendingReviews(let count):
            return "Review the remaining \(count) item\(count == 1 ? "" : "s") before saving."
        case .writeFailed:
            return "The approved set could not be saved on this device."
        }
    }
}

enum DevAssetCarvingService {
    nonisolated static let maximumDownloadBytes = 15 * 1024 * 1024
    nonisolated static let maximumSourcePixels = 16_000_000
    nonisolated static let maximumProcessingDimension = 2_048
    nonisolated static let edgeThreshold: Float = 18
    nonisolated static let alphaLowerBound: Float = 7
    nonisolated static let alphaUpperBound: Float = 30

    static func fetchAndCarve(urlString: String) async throws -> DevAssetCarvingResult {
        let url = try validatedURL(urlString)
        var request = URLRequest(url: url)
        request.setValue("image/avif,image/webp,image/png,image/jpeg,image/*", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 30

        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 45
        configuration.urlCache = nil
        let session = URLSession(configuration: configuration)
        defer { session.invalidateAndCancel() }
        let (bytes, response) = try await session.bytes(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              let finalURL = httpResponse.url,
              finalURL.scheme?.lowercased() == "https" else {
            throw DevAssetCarvingError.invalidResponse
        }
        guard (200..<300).contains(httpResponse.statusCode) else {
            throw DevAssetCarvingError.httpStatus(httpResponse.statusCode)
        }
        guard httpResponse.expectedContentLength <= Int64(maximumDownloadBytes) else {
            throw DevAssetCarvingError.downloadTooLarge
        }
        let mimeType = httpResponse.mimeType?.lowercased() ?? ""
        guard mimeType.hasPrefix("image/") || mimeType == "application/octet-stream" else {
            throw DevAssetCarvingError.unsupportedContentType
        }

        var data = Data()
        if httpResponse.expectedContentLength > 0 {
            data.reserveCapacity(Int(httpResponse.expectedContentLength))
        }
        for try await byte in bytes {
            guard data.count < maximumDownloadBytes else {
                throw DevAssetCarvingError.downloadTooLarge
            }
            data.append(byte)
        }

        return try await Task.detached(priority: .userInitiated) {
            try carve(data: data)
        }.value
    }

    static func save(
        result: DevAssetCarvingResult,
        assets: [DevCarvedAsset],
        sourceURLString: String
    ) throws -> DevAssetCarvingSavedSession {
        let pendingCount = assets.filter { $0.decision == .pending }.count
        guard pendingCount == 0 else {
            throw DevAssetCarvingError.pendingReviews(pendingCount)
        }

        let approved = assets.filter { $0.decision == .approved }
        let root = try FileManager.default.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let directory = root
            .appendingPathComponent("DevAssetCarving", isDirectory: true)
            .appendingPathComponent(result.sessionID, isDirectory: true)
        let assetsDirectory = directory.appendingPathComponent("assets", isDirectory: true)

        do {
            try FileManager.default.createDirectory(
                at: assetsDirectory,
                withIntermediateDirectories: true
            )
            for asset in approved {
                guard let data = asset.strippedImage.pngData() else {
                    throw DevAssetCarvingError.writeFailed
                }
                try data.write(
                    to: assetsDirectory.appendingPathComponent("\(asset.id).png"),
                    options: .atomic
                )
            }

            let manifest = DevAssetCarvingManifest(
                schemaVersion: 1,
                sessionID: result.sessionID,
                source: .init(
                    urlWithoutQuery: redactedSourceURL(sourceURLString),
                    sha256: result.sourceSHA256,
                    pixelWidth: Int(result.processedPixelSize.width),
                    pixelHeight: Int(result.processedPixelSize.height)
                ),
                extractor: .init(
                    version: 1,
                    edgeThreshold: edgeThreshold,
                    alphaLowerBound: alphaLowerBound,
                    alphaUpperBound: alphaUpperBound,
                    backgroundRGB: result.backgroundRGB
                ),
                items: assets.map {
                    .init(
                        id: $0.id,
                        label: $0.label,
                        category: $0.category,
                        decision: $0.decision,
                        sourceBounds: [
                            Int($0.sourceBounds.minX),
                            Int($0.sourceBounds.minY),
                            Int($0.sourceBounds.width),
                            Int($0.sourceBounds.height),
                        ],
                        pngPath: $0.decision == .approved ? "assets/\($0.id).png" : nil
                    )
                }
            )
            let encoder = JSONEncoder()
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
            let manifestData = try encoder.encode(manifest)
            let manifestURL = directory.appendingPathComponent("review-manifest.json")
            try manifestData.write(to: manifestURL, options: .atomic)

            return DevAssetCarvingSavedSession(
                directoryURL: directory,
                manifestURL: manifestURL,
                approvedCount: approved.count
            )
        } catch let error as DevAssetCarvingError {
            throw error
        } catch {
            throw DevAssetCarvingError.writeFailed
        }
    }

    static func redactedSourceURL(_ value: String) -> String {
        guard var components = URLComponents(string: value) else { return "invalid" }
        components.query = nil
        components.fragment = nil
        components.user = nil
        components.password = nil
        return components.string ?? "invalid"
    }

    private static func validatedURL(_ value: String) throws -> URL {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let components = URLComponents(string: trimmed),
              let url = components.url,
              let host = components.host,
              !host.isEmpty else {
            throw DevAssetCarvingError.invalidURL
        }
        guard components.scheme?.lowercased() == "https",
              components.user == nil,
              components.password == nil else {
            throw DevAssetCarvingError.insecureURL
        }
        return url
    }

    private nonisolated static func carve(data: Data) throws -> DevAssetCarvingResult {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil)
                as? [CFString: Any],
              let sourceWidth = properties[kCGImagePropertyPixelWidth] as? Int,
              let sourceHeight = properties[kCGImagePropertyPixelHeight] as? Int else {
            throw DevAssetCarvingError.invalidImage
        }
        guard sourceWidth * sourceHeight <= maximumSourcePixels else {
            throw DevAssetCarvingError.imageTooLarge
        }

        let options: [CFString: Any] = [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maximumProcessingDimension,
            kCGImageSourceShouldCacheImmediately: true,
        ]
        guard let image = CGImageSourceCreateThumbnailAtIndex(
            source,
            0,
            options as CFDictionary
        ) else {
            throw DevAssetCarvingError.invalidImage
        }

        let width = image.width
        let height = image.height
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
            throw DevAssetCarvingError.invalidImage
        }
        context.interpolationQuality = .high
        context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

        let background = borderMedian(rgba: rgba, width: width, height: height)
        let distance = colorDistance(
            rgba: rgba,
            width: width,
            height: height,
            background: background
        )
        let hardMask = closeMask(
            distance.map { $0 > edgeThreshold ? 1 : 0 },
            width: width,
            height: height
        )
        let minimumArea = max(180, width * height / 4_000)
        let components = connectedComponents(
            mask: hardMask,
            width: width,
            height: height,
            minimumArea: minimumArea
        )
        guard !components.isEmpty else {
            throw DevAssetCarvingError.noAssets
        }

        let sourceImage = try makeImage(rgba: rgba, width: width, height: height)
        let assets = try components.enumerated().map { offset, component in
            try carveComponent(
                component,
                index: offset + 1,
                sourceRGBA: rgba,
                distance: distance,
                background: background,
                width: width,
                height: height
            )
        }
        return DevAssetCarvingResult(
            sessionID: String(UUID().uuidString.lowercased().prefix(12)),
            sourceImage: sourceImage,
            sourceSHA256: SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined(),
            processedPixelSize: CGSize(width: width, height: height),
            backgroundRGB: background.map(Int.init),
            assets: assets
        )
    }

    private nonisolated static func borderMedian(
        rgba: [UInt8],
        width: Int,
        height: Int
    ) -> [UInt8] {
        let inset = max(1, min(width, height) / 40)
        let stride = max(1, min(width, height) / 256)
        var channels = [[UInt8](), [UInt8](), [UInt8]()]

        func sample(x: Int, y: Int) {
            let offset = (y * width + x) * 4
            for channel in 0..<3 {
                channels[channel].append(rgba[offset + channel])
            }
        }

        for x in Swift.stride(from: 0, to: width, by: stride) {
            for y in 0..<inset {
                sample(x: x, y: y)
                sample(x: x, y: height - 1 - y)
            }
        }
        for y in Swift.stride(from: inset, to: height - inset, by: stride) {
            for x in 0..<inset {
                sample(x: x, y: y)
                sample(x: width - 1 - x, y: y)
            }
        }
        return channels.map {
            let values = $0.sorted()
            return values[values.count / 2]
        }
    }

    private nonisolated static func colorDistance(
        rgba: [UInt8],
        width: Int,
        height: Int,
        background: [UInt8]
    ) -> [Float] {
        (0..<(width * height)).map { index in
            let offset = index * 4
            let red = Float(Int(rgba[offset]) - Int(background[0]))
            let green = Float(Int(rgba[offset + 1]) - Int(background[1]))
            let blue = Float(Int(rgba[offset + 2]) - Int(background[2]))
            return sqrt(red * red + green * green + blue * blue)
        }
    }

    private nonisolated static func closeMask(
        _ mask: [UInt8],
        width: Int,
        height: Int
    ) -> [UInt8] {
        // A radius-four close is equivalent to the previous pipeline's
        // five-by-five close run twice, but can be evaluated in linear time.
        let radius = 4
        let horizontalDilation = morphologyHorizontal(
            mask,
            width: width,
            height: height,
            radius: radius,
            dilating: true
        )
        let dilation = morphologyVertical(
            horizontalDilation,
            width: width,
            height: height,
            radius: radius,
            dilating: true
        )
        let horizontalErosion = morphologyHorizontal(
            dilation,
            width: width,
            height: height,
            radius: radius,
            dilating: false
        )
        return morphologyVertical(
            horizontalErosion,
            width: width,
            height: height,
            radius: radius,
            dilating: false
        )
    }

    private nonisolated static func morphologyHorizontal(
        _ mask: [UInt8],
        width: Int,
        height: Int,
        radius: Int,
        dilating: Bool
    ) -> [UInt8] {
        var result = [UInt8](repeating: 0, count: mask.count)
        var prefix = [Int](repeating: 0, count: width + 1)
        for y in 0..<height {
            prefix[0] = 0
            for x in 0..<width {
                prefix[x + 1] = prefix[x] + Int(mask[y * width + x])
            }
            for x in 0..<width {
                let left = max(0, x - radius)
                let right = min(width - 1, x + radius)
                let count = prefix[right + 1] - prefix[left]
                let windowSize = right - left + 1
                result[y * width + x] = dilating
                    ? (count > 0 ? 1 : 0)
                    : (windowSize == radius * 2 + 1 && count == windowSize ? 1 : 0)
            }
        }
        return result
    }

    private nonisolated static func morphologyVertical(
        _ mask: [UInt8],
        width: Int,
        height: Int,
        radius: Int,
        dilating: Bool
    ) -> [UInt8] {
        var result = [UInt8](repeating: 0, count: mask.count)
        var prefix = [Int](repeating: 0, count: height + 1)
        for x in 0..<width {
            prefix[0] = 0
            for y in 0..<height {
                prefix[y + 1] = prefix[y] + Int(mask[y * width + x])
            }
            for y in 0..<height {
                let top = max(0, y - radius)
                let bottom = min(height - 1, y + radius)
                let count = prefix[bottom + 1] - prefix[top]
                let windowSize = bottom - top + 1
                result[y * width + x] = dilating
                    ? (count > 0 ? 1 : 0)
                    : (windowSize == radius * 2 + 1 && count == windowSize ? 1 : 0)
            }
        }
        return result
    }

    private struct PixelComponent {
        let indices: [Int]
        let minX: Int
        let minY: Int
        let maxX: Int
        let maxY: Int
    }

    private nonisolated static func connectedComponents(
        mask: [UInt8],
        width: Int,
        height: Int,
        minimumArea: Int
    ) -> [PixelComponent] {
        var visited = [UInt8](repeating: 0, count: mask.count)
        var components: [PixelComponent] = []

        for start in mask.indices where mask[start] != 0 && visited[start] == 0 {
            var queue = [start]
            visited[start] = 1
            var cursor = 0
            var minX = start % width
            var maxX = minX
            var minY = start / width
            var maxY = minY

            while cursor < queue.count {
                let index = queue[cursor]
                cursor += 1
                let x = index % width
                let y = index / width
                minX = min(minX, x)
                maxX = max(maxX, x)
                minY = min(minY, y)
                maxY = max(maxY, y)

                if x > 0 {
                    enqueue(index - 1, mask: mask, visited: &visited, queue: &queue)
                }
                if x + 1 < width {
                    enqueue(index + 1, mask: mask, visited: &visited, queue: &queue)
                }
                if y > 0 {
                    enqueue(index - width, mask: mask, visited: &visited, queue: &queue)
                }
                if y + 1 < height {
                    enqueue(index + width, mask: mask, visited: &visited, queue: &queue)
                }
            }

            if queue.count >= minimumArea {
                components.append(
                    PixelComponent(
                        indices: queue,
                        minX: minX,
                        minY: minY,
                        maxX: maxX,
                        maxY: maxY
                    )
                )
            }
        }

        let rowBand = max(1, height / 10)
        return components.sorted {
            let firstRow = $0.minY / rowBand
            let secondRow = $1.minY / rowBand
            return firstRow == secondRow ? $0.minX < $1.minX : firstRow < secondRow
        }
    }

    private nonisolated static func enqueue(
        _ index: Int,
        mask: [UInt8],
        visited: inout [UInt8],
        queue: inout [Int]
    ) {
        guard mask[index] != 0, visited[index] == 0 else { return }
        visited[index] = 1
        queue.append(index)
    }

    private nonisolated static func carveComponent(
        _ component: PixelComponent,
        index: Int,
        sourceRGBA: [UInt8],
        distance: [Float],
        background: [UInt8],
        width: Int,
        height: Int
    ) throws -> DevCarvedAsset {
        let padding = max(8, min(width, height) / 80)
        let left = max(0, component.minX - padding)
        let top = max(0, component.minY - padding)
        let right = min(width - 1, component.maxX + padding)
        let bottom = min(height - 1, component.maxY + padding)
        let cropWidth = right - left + 1
        let cropHeight = bottom - top + 1

        var allowed = [UInt8](repeating: 0, count: cropWidth * cropHeight)
        for sourceIndex in component.indices {
            let x = sourceIndex % width - left
            let y = sourceIndex / width - top
            if x >= 0, x < cropWidth, y >= 0, y < cropHeight {
                allowed[y * cropWidth + x] = 1
            }
        }
        allowed = dilate(mask: allowed, width: cropWidth, height: cropHeight, radius: 2)

        var original = [UInt8](repeating: 0, count: cropWidth * cropHeight * 4)
        var stripped = [UInt8](repeating: 0, count: cropWidth * cropHeight * 4)
        for y in 0..<cropHeight {
            for x in 0..<cropWidth {
                let sourceIndex = (top + y) * width + left + x
                let sourceOffset = sourceIndex * 4
                let cropIndex = y * cropWidth + x
                let cropOffset = cropIndex * 4
                for channel in 0..<4 {
                    original[cropOffset + channel] = sourceRGBA[sourceOffset + channel]
                }

                guard allowed[cropIndex] != 0 else { continue }
                let normalized = max(
                    0,
                    min(
                        1,
                        (distance[sourceIndex] - alphaLowerBound)
                            / (alphaUpperBound - alphaLowerBound)
                    )
                )
                let alpha = normalized * normalized * (3 - 2 * normalized)
                guard alpha > 0.01 else { continue }
                for channel in 0..<3 {
                    let value = (
                        Float(sourceRGBA[sourceOffset + channel])
                            - Float(background[channel]) * (1 - alpha)
                    ) / alpha
                    let premultiplied = value * alpha
                    stripped[cropOffset + channel] = UInt8(
                        max(0, min(255, Int(premultiplied.rounded())))
                    )
                }
                stripped[cropOffset + 3] = UInt8(max(0, min(255, Int((alpha * 255).rounded()))))
            }
        }

        let itemID = String(format: "item-%03d", index)
        return DevCarvedAsset(
            id: itemID,
            sourceBounds: CGRect(
                x: left,
                y: top,
                width: cropWidth,
                height: cropHeight
            ),
            originalCrop: try makeImage(rgba: original, width: cropWidth, height: cropHeight),
            strippedImage: try makeImage(rgba: stripped, width: cropWidth, height: cropHeight),
            label: "Item \(index)",
            category: "Uncategorized",
            decision: .pending
        )
    }

    private nonisolated static func dilate(
        mask: [UInt8],
        width: Int,
        height: Int,
        radius: Int
    ) -> [UInt8] {
        var result = mask
        for y in 0..<height {
            for x in 0..<width where mask[y * width + x] != 0 {
                for neighborY in max(0, y - radius)...min(height - 1, y + radius) {
                    for neighborX in max(0, x - radius)...min(width - 1, x + radius) {
                        result[neighborY * width + neighborX] = 1
                    }
                }
            }
        }
        return result
    }

    private nonisolated static func makeImage(
        rgba: [UInt8],
        width: Int,
        height: Int
    ) throws -> UIImage {
        let data = Data(rgba) as CFData
        guard let provider = CGDataProvider(data: data),
              let image = CGImage(
                width: width,
                height: height,
                bitsPerComponent: 8,
                bitsPerPixel: 32,
                bytesPerRow: width * 4,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGBitmapInfo(
                    rawValue: CGImageAlphaInfo.premultipliedLast.rawValue
                ),
                provider: provider,
                decode: nil,
                shouldInterpolate: true,
                intent: .defaultIntent
              ) else {
            throw DevAssetCarvingError.invalidImage
        }
        return UIImage(cgImage: image)
    }
}

private struct DevAssetCarvingManifest: Codable {
    let schemaVersion: Int
    let sessionID: String
    let source: Source
    let extractor: Extractor
    let items: [Item]

    struct Source: Codable {
        let urlWithoutQuery: String
        let sha256: String
        let pixelWidth: Int
        let pixelHeight: Int
    }

    struct Extractor: Codable {
        let version: Int
        let edgeThreshold: Float
        let alphaLowerBound: Float
        let alphaUpperBound: Float
        let backgroundRGB: [Int]
    }

    struct Item: Codable {
        let id: String
        let label: String
        let category: String
        let decision: DevAssetReviewDecision
        let sourceBounds: [Int]
        let pngPath: String?
    }
}
