//
//  World2SceneCookService.swift
//  abbies.world.ios
//
//  Runs Scene Builder cooks. The watercolor placeholder shows at once.
//  The finished plate comes from /api/create (a full landscape, not a cutout).
//

import Combine
import Foundation
import UIKit

@MainActor
final class World2SceneCookService: ObservableObject {
    static let shared = World2SceneCookService()

    @Published private(set) var activeJob: World2SceneCookJob?
    @Published private(set) var lastReadyJob: World2SceneCookJob?
    @Published private(set) var plateImage: UIImage?
    @Published private(set) var statusMessage = "Generation in progress"

    /// Exterior map badge is true whenever a cook is in flight.
    var isCooking: Bool { activeJob?.phase == .cooking }

    private var cookTask: Task<Void, Never>?

    private init() {}

    func startCook(recipe: World2SceneBuilderRecipe) {
        guard recipe.isComplete else { return }
        cookTask?.cancel()

        let job = World2SceneCookJob(
            id: "cook_\(UUID().uuidString)",
            recipe: recipe,
            phase: .cooking,
            previewCatalogName: nil,
            startedAt: Date(),
            finishedAt: nil
        )
        activeJob = job
        lastReadyJob = nil
        plateImage = World2PlaceholderPack.image(for: .scene)
        statusMessage = "Generation in progress"
        World2Diagnostics.log(
            "scene_builder_cook_started",
            ["summary": recipe.summaryLine]
        )

        cookTask = Task { [weak self] in
            await self?.performCook(jobID: job.id)
        }
    }

    func dismissReady() {
        guard activeJob?.phase == .ready || activeJob?.phase == .failed else { return }
        lastReadyJob = activeJob
        activeJob = nil
    }

    private func performCook(jobID: String) async {
        guard let recipeLine = activeJob?.recipe.summaryLine, activeJob?.id == jobID else { return }
        do {
            let data = try await World2AssetGenerationService.generatePNG(
                kind: .scene,
                subject: recipeLine,
                placeName: recipeLine
            )
            guard !Task.isCancelled, var job = activeJob, job.id == jobID else { return }
            if let image = UIImage(data: data) {
                plateImage = image
            }
            job.phase = .ready
            job.previewCatalogName = nil
            job.finishedAt = Date()
            activeJob = job
            lastReadyJob = job
            statusMessage = "Ready"
            World2Diagnostics.log(
                "scene_builder_cook_ready",
                ["preview": "generated", "summary": job.recipe.summaryLine]
            )
        } catch {
            guard !Task.isCancelled, var job = activeJob, job.id == jobID else { return }
            job.phase = .failed
            job.finishedAt = Date()
            activeJob = job
            statusMessage = "The picture didn't finish. The placeholder is staying."
            World2Diagnostics.log(
                "scene_builder_cook_failed",
                ["reason": error.localizedDescription]
            )
        }
    }
}
