import CryptoKit
import Foundation
import UIKit

@MainActor
protocol World2AssetWorkbenchServing {
    var isPreview: Bool { get }

    func startGeneration(
        recipe: World2AssetWorkbenchRecipe,
        playerID: PlayerId
    ) async throws -> World2AssetWorkbenchJob

    func job(id: String) async throws -> World2AssetWorkbenchJob

    func imageData(
        for candidate: World2AssetWorkbenchCandidate
    ) async throws -> Data
}

@MainActor
final class World2AssetWorkbenchHTTPService: World2AssetWorkbenchServing {
    private struct StartRequest: Encodable {
        let schemaVersion = 1
        let playerID: String
        let recipe: World2AssetWorkbenchRecipe
        let candidateCount = World2AssetWorkbenchContract.candidateCount
        let selectionCount = World2AssetWorkbenchContract.selectionCount
    }

    private let gameKey: String
    private let baseURL: URL
    private let session: URLSession

    let isPreview = false

    init(
        gameKey: String? = nil,
        baseURL: URL? = nil,
        session: URLSession = .shared
    ) throws {
        let resolvedKey = gameKey ?? GameAssetRegistryClient.world2GameKey
        guard let resolvedURL = baseURL ?? URL(string: ServerConfig.shared.baseURL) else {
            throw World2AssetWorkbenchError.generationUnavailable
        }
        self.gameKey = resolvedKey
        self.baseURL = resolvedURL
        self.session = session
    }

    func startGeneration(
        recipe: World2AssetWorkbenchRecipe,
        playerID: PlayerId
    ) async throws -> World2AssetWorkbenchJob {
        guard recipe.isValid else {
            throw World2AssetWorkbenchError.invalidRecipe
        }
        var request = URLRequest(url: jobsURL)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        request.httpBody = try JSONEncoder().encode(
            StartRequest(playerID: playerID.rawValue, recipe: recipe)
        )
        return try await response(for: request)
    }

    func job(id: String) async throws -> World2AssetWorkbenchJob {
        var request = URLRequest(url: jobsURL.appendingPathComponent(id))
        request.timeoutInterval = 10
        ServerConfig.shared.addAPIKeyHeader(to: &request)
        return try await response(for: request)
    }

    func imageData(
        for candidate: World2AssetWorkbenchCandidate
    ) async throws -> Data {
        guard candidate.qualificationState == .qualified,
              candidate.mimeType == "image/png",
              candidate.sha256.count == 64 else {
            throw World2AssetWorkbenchError.unqualifiedPack
        }
        let registry = try GameAssetRegistryClient(
            gameKey: gameKey,
            baseURL: baseURL,
            session: session
        )
        let record = try await registry.revision(
            candidate.registryRevision,
            of: candidate.registryKey
        )
        guard record.sha256?.lowercased() == candidate.sha256.lowercased(),
              record.mimeType?.lowercased() == candidate.mimeType else {
            throw World2AssetWorkbenchError.unqualifiedPack
        }
        return try await registry.data(for: record)
    }

    private var jobsURL: URL {
        var url = baseURL
        for component in [
            "api",
            "v1",
            "games",
            gameKey,
            "asset-workbench",
            "jobs",
        ] {
            url.appendPathComponent(component)
        }
        return url
    }

    private func response(for request: URLRequest) async throws -> World2AssetWorkbenchJob {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw World2AssetWorkbenchError.invalidServerResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw World2AssetWorkbenchError.serverFailure("http-\(http.statusCode)")
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let job = try decoder.decode(World2AssetWorkbenchJob.self, from: data)
        if let pack = job.pack {
            try pack.validateForPlayerPresentation()
        }
        return job
    }
}

@MainActor
final class World2AssetWorkbenchPreviewService: World2AssetWorkbenchServing {
    private struct PreviewJob {
        let recipe: World2AssetWorkbenchRecipe
        var stageIndex: Int
    }

    private var jobs: [String: PreviewJob] = [:]
    private var candidateData: [String: Data] = [:]
    let isPreview = true
    private let stageSequence: [World2AssetWorkbenchJobStage] = [
        .queued,
        .generating,
        .carving,
        .qualifying,
        .publishing,
        .ready,
    ]

    func startGeneration(
        recipe: World2AssetWorkbenchRecipe,
        playerID: PlayerId
    ) async throws -> World2AssetWorkbenchJob {
        guard recipe.isValid else {
            throw World2AssetWorkbenchError.invalidRecipe
        }
        let id = "preview-\(UUID().uuidString.lowercased())"
        jobs[id] = PreviewJob(recipe: recipe, stageIndex: 0)
        return .init(id: id, stage: .queued, progress: 0.05, pack: nil, errorCode: nil)
    }

    func job(id: String) async throws -> World2AssetWorkbenchJob {
        guard var preview = jobs[id] else {
            throw World2AssetWorkbenchError.invalidServerResponse
        }
        preview.stageIndex = min(preview.stageIndex + 1, stageSequence.count - 1)
        jobs[id] = preview
        let stage = stageSequence[preview.stageIndex]
        let progress = Double(preview.stageIndex + 1) / Double(stageSequence.count)
        let pack = stage == .ready ? makePack(id: id, recipe: preview.recipe) : nil
        return .init(id: id, stage: stage, progress: progress, pack: pack, errorCode: nil)
    }

    func imageData(
        for candidate: World2AssetWorkbenchCandidate
    ) async throws -> Data {
        guard let data = candidateData[candidate.id] else {
            throw World2AssetWorkbenchError.generationUnavailable
        }
        return data
    }

    private func makePack(
        id: String,
        recipe: World2AssetWorkbenchRecipe
    ) -> World2AssetWorkbenchPack {
        let objectName =
            World2WorkbenchIdeaCatalog.card(id: recipe.objectFamilyID)?.title
            ?? "Decoration"
        let placement: World2WorkbenchPlacementLayer =
            recipe.objectFamilyID == "object.wall-decoration" ? .wall : .floor
        var candidates: [World2AssetWorkbenchCandidate] = []
        for index in 1...World2AssetWorkbenchContract.candidateCount {
            let candidateID = "\(id)-candidate-\(index)"
            let data = makePreviewImageData(
                index: index,
                placement: placement
            )
            candidateData[candidateID] = data
            let digest = SHA256.hash(data: data)
            var sha256 = ""
            for byte in digest {
                sha256 += String(format: "%02x", byte)
            }
            candidates.append(
                World2AssetWorkbenchCandidate(
                    id: candidateID,
                    label: "\(objectName) Idea \(index)",
                    registryKey: "preview/workbench/packs/\(id)/candidates/\(index)",
                    registryRevision: 1,
                    sha256: sha256,
                    mimeType: "image/png",
                    pixelWidth: 1024,
                    pixelHeight: 1024,
                    placementLayer: placement,
                    qualificationState: .qualified
                )
            )
        }
        return .init(
            id: id.replacingOccurrences(of: "preview-", with: "pack-"),
            recipe: recipe,
            candidates: candidates,
            createdAt: Date()
        )
    }

    private func makePreviewImageData(
        index: Int,
        placement: World2WorkbenchPlacementLayer
    ) -> Data {
        let colors: [(UIColor, UIColor)] = [
            (.systemPink, .systemPurple),
            (.systemTeal, .systemBlue),
            (.systemOrange, .systemPink),
            (.systemIndigo, .systemTeal),
            (.systemYellow, .systemOrange),
            (.systemPurple, .systemPink),
        ]
        let pair = colors[(index - 1) % colors.count]
        let symbolName = placement == .wall
            ? "photo.artframe"
            : (placement == .hanging ? "lamp.ceiling.fill" : "chair.lounge.fill")
        let format = UIGraphicsImageRendererFormat()
        format.opaque = false
        format.scale = 1
        return UIGraphicsImageRenderer(
            size: CGSize(width: 1024, height: 1024),
            format: format
        ).pngData { context in
            context.cgContext.clear(CGRect(x: 0, y: 0, width: 1024, height: 1024))
            context.cgContext.setShadow(
                offset: CGSize(width: 0, height: 22),
                blur: 26,
                color: UIColor.black.withAlphaComponent(0.25).cgColor
            )
            pair.0.withAlphaComponent(0.94).setFill()
            UIBezierPath(
                roundedRect: CGRect(x: 170, y: 185, width: 684, height: 654),
                cornerRadius: CGFloat(120 + (index * 7))
            ).fill()
            context.cgContext.setShadow(offset: .zero, blur: 0)

            pair.1.setStroke()
            let border = UIBezierPath(
                roundedRect: CGRect(x: 190, y: 205, width: 644, height: 614),
                cornerRadius: CGFloat(105 + (index * 7))
            )
            border.lineWidth = 24
            border.stroke()

            let configuration = UIImage.SymbolConfiguration(
                pointSize: 360,
                weight: .bold
            )
            if let symbol = UIImage(systemName: symbolName, withConfiguration: configuration)?
                .withTintColor(.white, renderingMode: .alwaysOriginal) {
                symbol.draw(
                    in: CGRect(x: 282, y: 290, width: 460, height: 420),
                    blendMode: .normal,
                    alpha: 0.94
                )
            }

            UIColor.white.withAlphaComponent(0.92).setFill()
            for sparkle in 0..<6 {
                let x = CGFloat(238 + ((sparkle * 113 + index * 41) % 548))
                let y = CGFloat(230 + ((sparkle * 97 + index * 53) % 540))
                let diameter = CGFloat(18 + ((sparkle + index) % 3) * 8)
                UIBezierPath(
                    ovalIn: CGRect(x: x, y: y, width: diameter, height: diameter)
                ).fill()
            }
        }
    }
}
