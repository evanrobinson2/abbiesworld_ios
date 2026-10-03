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

    func cancel(jobID: String)
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

    func cancel(jobID: String) {}

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
    private struct LiveJob {
        var stage: World2AssetWorkbenchJobStage
        var progress: Double
        var pack: World2AssetWorkbenchPack?
        var errorCode: String?
    }

    private var jobs: [String: LiveJob] = [:]
    private var tasks: [String: Task<Void, Never>] = [:]
    private var candidateData: [String: Data] = [:]
    let isPreview = true

    func cancel(jobID: String) {
        tasks[jobID]?.cancel()
        tasks[jobID] = nil
        jobs[jobID] = nil
    }

    func startGeneration(
        recipe: World2AssetWorkbenchRecipe,
        playerID: PlayerId
    ) async throws -> World2AssetWorkbenchJob {
        guard recipe.isValid else {
            throw World2AssetWorkbenchError.invalidRecipe
        }
        let id = "preview-\(UUID().uuidString.lowercased())"
        jobs[id] = LiveJob(stage: .queued, progress: 0.05, pack: nil, errorCode: nil)
        tasks[id] = Task { [weak self] in
            await self?.run(id: id, recipe: recipe)
        }
        return snapshot(id)
    }

    func job(id: String) async throws -> World2AssetWorkbenchJob {
        guard jobs[id] != nil else {
            return .init(id: id, stage: .failed, progress: 1, pack: nil, errorCode: "cancelled")
        }
        return snapshot(id)
    }

    func imageData(
        for candidate: World2AssetWorkbenchCandidate
    ) async throws -> Data {
        guard let data = candidateData[candidate.id] else {
            throw World2AssetWorkbenchError.generationUnavailable
        }
        return data
    }

    private func snapshot(_ id: String) -> World2AssetWorkbenchJob {
        let live = jobs[id]
        return .init(
            id: id,
            stage: live?.stage ?? .failed,
            progress: live?.progress ?? 0,
            pack: live?.pack,
            errorCode: live?.errorCode
        )
    }

    private func run(id: String, recipe: World2AssetWorkbenchRecipe) async {
        guard jobs[id] != nil else { return }
        jobs[id]?.stage = .generating
        jobs[id]?.progress = 0.2

        let object = World2WorkbenchIdeaCatalog.card(id: recipe.objectFamilyID)?.title ?? "Decoration"
        let finish = World2WorkbenchIdeaCatalog.card(id: recipe.finishID)?.title ?? "handmade"
        let personality = World2WorkbenchIdeaCatalog.card(id: recipe.personalityID)?.title ?? "playful"
        let count = World2AssetWorkbenchContract.candidateCount
        var raw: [Int: Data] = [:]

        await withTaskGroup(of: (Int, Data)?.self) { group in
            for index in 1...count {
                let subject = "\(finish) \(object) with a \(personality) personality. Variation \(index) of \(count), a different shape and color."
                group.addTask {
                    do {
                        let data = try await World2AssetGenerationService.fetchPNG(
                            kind: .decoration,
                            subject: subject,
                            placeName: "the workbench"
                        )
                        return (index, data)
                    } catch {
                        return nil
                    }
                }
            }
            for await item in group {
                if let (index, data) = item {
                    raw[index] = data
                }
            }
        }

        guard !Task.isCancelled, jobs[id] != nil else { return }
        guard raw.count == count else {
            jobs[id]?.stage = .failed
            jobs[id]?.progress = 1
            jobs[id]?.errorCode = "generation-failed"
            return
        }

        jobs[id]?.stage = .carving
        jobs[id]?.progress = 0.72
        var carved: [Int: Data] = [:]
        for index in 1...count {
            guard let data = raw[index] else { continue }
            carved[index] = World2AssetGenerationService.finish(data, kind: .decoration)
        }
        guard !Task.isCancelled, jobs[id] != nil, carved.count == count else {
            jobs[id]?.stage = .failed
            jobs[id]?.errorCode = "carve-failed"
            return
        }

        jobs[id]?.pack = makePack(id: id, recipe: recipe, images: carved)
        jobs[id]?.stage = .ready
        jobs[id]?.progress = 1
        World2Diagnostics.log("asset_workbench_generated", ["job": id])
    }

    private func makePack(
        id: String,
        recipe: World2AssetWorkbenchRecipe,
        images: [Int: Data]
    ) -> World2AssetWorkbenchPack {
        let objectName =
            World2WorkbenchIdeaCatalog.card(id: recipe.objectFamilyID)?.title
            ?? "Decoration"
        let placement: World2WorkbenchPlacementLayer =
            recipe.objectFamilyID == "object.wall-decoration" ? .wall : .floor
        var candidates: [World2AssetWorkbenchCandidate] = []
        for index in 1...World2AssetWorkbenchContract.candidateCount {
            let candidateID = "\(id)-candidate-\(index)"
            let data = images[index] ?? Data()
            candidateData[candidateID] = data
            let sha256 = SHA256.hash(data: data)
                .map { String(format: "%02x", $0) }
                .joined()
            let pixels = pixelSize(of: data)
            candidates.append(
                World2AssetWorkbenchCandidate(
                    id: candidateID,
                    label: "\(objectName) \(index)",
                    registryKey: "preview/workbench/packs/\(id)/candidates/\(index)",
                    registryRevision: 1,
                    sha256: sha256,
                    mimeType: "image/png",
                    pixelWidth: pixels.0,
                    pixelHeight: pixels.1,
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

    private func pixelSize(of data: Data) -> (Int, Int) {
        guard let image = UIImage(data: data) else { return (1, 1) }
        return (
            max(1, Int(image.size.width * image.scale)),
            max(1, Int(image.size.height * image.scale))
        )
    }
}
