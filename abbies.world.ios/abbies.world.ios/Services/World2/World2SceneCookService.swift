//
//  World2SceneCookService.swift
//  abbies.world.ios
//
//  Runs Scene Builder cooks. While cooking, the atelier shows a COOKING badge;
//  when the image is ready the phase flips to ready and a deed can be awarded.
//
//  v1 uses a timed local cook that reveals a bundled sample landscape so the
//  loop is playable offline. Swap the body of `performCook` for a real
//  generation pipeline without changing the badge / reward surface.
//

import Combine
import Foundation
import UIKit

@MainActor
final class World2SceneCookService: ObservableObject {
    static let shared = World2SceneCookService()

    @Published private(set) var activeJob: World2SceneCookJob?
    @Published private(set) var lastReadyJob: World2SceneCookJob?

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
        // Kid-readable wait: long enough to notice the badge, short enough to play.
        try? await Task.sleep(nanoseconds: 3_200_000_000)
        guard !Task.isCancelled else { return }
        guard var job = activeJob, job.id == jobID else { return }

        // Offline-proof result: bundled sample cook. Real generation replaces this.
        let preview = "world2_scene_builder_sample_cook"
        if UIImage(named: preview) == nil {
            job.phase = .failed
            job.finishedAt = Date()
            activeJob = job
            World2Diagnostics.log("scene_builder_cook_failed", ["reason": "missing_preview"])
            return
        }

        job.phase = .ready
        job.previewCatalogName = preview
        job.finishedAt = Date()
        activeJob = job
        lastReadyJob = job
        World2Diagnostics.log(
            "scene_builder_cook_ready",
            ["preview": preview, "summary": job.recipe.summaryLine]
        )
    }
}
