//
//  HeadDAGService.swift
//  abbies.world.ios
//
//  Head pipeline for Whizbang.
//
//  The iPad never talks to OpenAI. Reasoning and draw-only heads go through
//  Evan's OpenAIClient on the Abbie server:
//    reason  → OpenAIClient.generate_prompt / reason (vision JSON bbox)
//    draw    → OpenAIClient.generate_image via POST /api/create
//

import Foundation
import UIKit

struct HeadReasonResponse: Decodable {
    let text: String?
    let bbox: NormalizedRect?
}

final class HeadDAGService {
    static let shared = HeadDAGService()

    private init() {}

    private var baseURL: String { ServerConfig.shared.baseURL }

    /// Extract a head: load → reason (openai_client) → crop.
    func extractHead(from image: UIImage, sourcePath: String?, name: String) async -> FlyerHead {
        print("🧠 HeadDAG: \(HeadDAGNode.loadSource.rawValue) → \(HeadDAGNode.reasonHeadBox.rawValue) → \(HeadDAGNode.cropHead.rawValue)")
        let box = await reasonHeadBox(sourcePath: sourcePath, fallbackImage: image)
        let cropped = crop(image, bbox: box)
        return FlyerHead(
            id: "extracted-\(name)-\(UUID().uuidString)",
            name: name,
            image: cropped,
            source: .extracted
        )
    }

    /// Draw-only head: OpenAIClient.generate_image via existing /api/create.
    func drawHead(referencePath: String?, name: String) async throws -> (url: String, image: UIImage) {
        print("🎨 HeadDAG: \(HeadDAGNode.drawHead.rawValue) via /api/create → OpenAIClient.generate_image")
        let prompt = """
        Draw ONLY the character's head. Isolated head and a little neck, no body, \
        no hands, no background clutter. Cute, kid-friendly, facing forward, \
        centered like a sticker cutout on a plain light background.
        """
        let request = CreateRequest(
            recipeItems: [],
            freeTextDescription: prompt,
            referenceImageIds: referencePath.map { [$0] }
        )
        return try await streamCreate(request: request)
    }

    /// Reasoning node. Hits /api/reason so the server can call OpenAIClient.
    /// If that route is missing, fall back to a top-of-frame crop — never call OpenAI here.
    func reasonHeadBox(sourcePath: String?, fallbackImage: UIImage) async -> NormalizedRect {
        guard let sourcePath, !sourcePath.isEmpty else {
            print("🧠 HeadDAG: no source path, using fallback crop")
            return NormalizedRect.topCenterHead
        }

        guard let url = URL(string: "\(baseURL)/api/reason") else {
            return NormalizedRect.topCenterHead
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        request.httpBody = try? JSONSerialization.data(withJSONObject: [
            "instruction": """
            Look at this picture. Return JSON only, no markdown: \
            {"bbox":{"x":0-1,"y":0-1,"w":0-1,"h":0-1},"notes":"short"} \
            bbox is the character's head and a little neck, origin top-left.
            """,
            "referenceImageIds": [sourcePath],
            "via": "openai_client"
        ])

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                return NormalizedRect.topCenterHead
            }
            guard http.statusCode == 200 else {
                print("🧠 HeadDAG: /api/reason returned \(http.statusCode); using fallback crop until the server node exists")
                return NormalizedRect.topCenterHead
            }
            let decoded = try JSONDecoder().decode(HeadReasonResponse.self, from: data)
            if let bbox = decoded.bbox {
                print("🧠 HeadDAG: openai_client bbox \(bbox)")
                return bbox.clamped()
            }
            if let text = decoded.text, let parsed = parseBBox(from: text) {
                return parsed.clamped()
            }
        } catch {
            print("🧠 HeadDAG: reason failed (\(error.localizedDescription)); fallback crop")
        }
        return NormalizedRect.topCenterHead
    }

    func crop(_ image: UIImage, bbox: NormalizedRect) -> UIImage {
        let box = bbox.clamped()
        guard let cg = image.cgImage else { return image }
        let pixel = CGRect(
            x: box.x * Double(cg.width),
            y: box.y * Double(cg.height),
            width: box.w * Double(cg.width),
            height: box.h * Double(cg.height)
        ).integral
        guard let sliced = cg.cropping(to: pixel) else { return image }
        return UIImage(cgImage: sliced, scale: image.scale, orientation: image.imageOrientation)
    }

    func bundledHeads() -> [FlyerHead] {
        var heads: [FlyerHead] = []
        for item in HalloweenCatalog.monsters.prefix(6) {
            if let image = MediaPackImageLoader.image(named: item.bundleImageName) {
                heads.append(FlyerHead(id: item.id, name: item.name, image: image, source: .bundled))
            }
        }
        if heads.isEmpty {
            heads = DoodleHead.allCases.map {
                FlyerHead(id: $0.id, name: $0.title, image: DoodleHeadFactory.image(for: $0), source: .bundled)
            }
        }
        return heads
    }

    func fetchGallery() async throws -> [GeneratedImage] {
        guard let url = URL(string: "\(baseURL)/api/generated-images") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode([GeneratedImage].self, from: data)
            .filter { $0.deleted != true && !$0.isPartial }
    }

    func loadImage(for generated: GeneratedImage) async throws -> UIImage {
        let urlString = generated.url.hasPrefix("http")
            ? generated.url
            : "\(baseURL)\(generated.url)"
        guard let url = URL(string: urlString),
              let image = try await ImageCache.shared.loadImage(from: url) else {
            throw URLError(.cannotDecodeContentData)
        }
        return image
    }

    func assetPath(for generated: GeneratedImage) -> String {
        if generated.url.hasPrefix("/static/") { return generated.url }
        if let url = URL(string: generated.url) { return url.path }
        return "/static/generated/\(generated.filename)"
    }

    private func parseBBox(from text: String) -> NormalizedRect? {
        let trimmed = text
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard let data = trimmed.data(using: .utf8) else { return nil }
        struct Envelope: Decodable { let bbox: NormalizedRect }
        return try? JSONDecoder().decode(Envelope.self, from: data).bbox
    }

    private func streamCreate(request: CreateRequest) async throws -> (url: String, image: UIImage) {
        guard let url = URL(string: "\(baseURL)/api/create") else {
            throw URLError(.badURL)
        }
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        ServerConfig.shared.addAPIKeyHeader(to: &urlRequest)
        urlRequest.httpBody = try JSONEncoder().encode(request)

        let (asyncBytes, response) = try await URLSession.shared.bytes(for: urlRequest)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }

        var buffer = ""
        var lastURL: String?
        for try await byte in asyncBytes {
            guard let char = String(data: Data([byte]), encoding: .utf8) else { continue }
            buffer += char
            while let newline = buffer.firstIndex(of: "\n") {
                let line = String(buffer[..<newline])
                buffer.removeSubrange(...newline)
                guard line.hasPrefix("data: ") else { continue }
                let jsonString = String(line.dropFirst(6))
                guard let data = jsonString.data(using: .utf8),
                      let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    continue
                }
                if let message = json["message"] as? String, (json["status"] as? String) == "error" {
                    throw NSError(domain: "HeadDAG", code: -1, userInfo: [NSLocalizedDescriptionKey: message])
                }
                if let imageURL = json["image_url"] as? String {
                    lastURL = imageURL
                    let status = json["status"] as? String ?? ""
                    let isFinal = json["is_final"] as? Bool ?? false
                    let type = json["type"] as? String ?? ""
                    if status == "done" || status == "completed" || type == "final" || isFinal {
                        return try await loadGenerated(imageURL)
                    }
                }
            }
        }
        if let lastURL {
            return try await loadGenerated(lastURL)
        }
        throw URLError(.cannotDecodeContentData)
    }

    private func loadGenerated(_ imageURL: String) async throws -> (url: String, image: UIImage) {
        let full = imageURL.hasPrefix("http") ? imageURL : "\(baseURL)\(imageURL)"
        guard let url = URL(string: full),
              let image = try await ImageCache.shared.loadImage(from: url) else {
            throw URLError(.cannotDecodeContentData)
        }
        return (imageURL, image)
    }
}
