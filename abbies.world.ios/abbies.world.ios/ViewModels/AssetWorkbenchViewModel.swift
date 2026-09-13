import Combine
import Foundation
import UIKit

@MainActor
final class World2AssetWorkbenchViewModel: ObservableObject {
    enum Phase: String {
        case composing
        case generating
        case choosing
        case awarded
    }

    @Published var selectedFinishIndex: Int?
    @Published var selectedObjectIndex: Int?
    @Published var selectedPersonalityIndex: Int?
    @Published private(set) var phase: Phase = .composing
    @Published private(set) var job: World2AssetWorkbenchJob?
    @Published private(set) var pack: World2AssetWorkbenchPack?
    @Published private(set) var selectedCandidateIDs: Set<String> = []
    @Published private(set) var candidateImages: [String: UIImage] = [:]
    @Published private(set) var award: World2AssetWorkbenchAward?
    @Published private(set) var errorMessage: String?

    let playerID: PlayerId
    private let service: any World2AssetWorkbenchServing
    private var generationTask: Task<Void, Never>?

    init(
        playerID: PlayerId,
        service: any World2AssetWorkbenchServing
    ) {
        self.playerID = playerID
        self.service = service
    }

    var recipe: World2AssetWorkbenchRecipe? {
        guard let finish = selectedCard(
            at: selectedFinishIndex,
            in: World2WorkbenchIdeaCatalog.finishes
        ),
        let object = selectedCard(
            at: selectedObjectIndex,
            in: World2WorkbenchIdeaCatalog.objectFamilies
        ),
        let personality = selectedCard(
            at: selectedPersonalityIndex,
            in: World2WorkbenchIdeaCatalog.personalities
        ) else {
            return nil
        }
        return .init(
            finishID: finish.id,
            objectFamilyID: object.id,
            personalityID: personality.id
        )
    }

    var canGenerate: Bool {
        phase == .composing && recipe?.isValid == true
    }

    var canConfirmSelection: Bool {
        phase == .choosing
            && selectedCandidateIDs.count == World2AssetWorkbenchContract.selectionCount
    }

    var selectionStatus: String {
        "\(selectedCandidateIDs.count) of \(World2AssetWorkbenchContract.selectionCount) chosen"
    }

    var diagnosticSummary: String {
        let value: [String: Any] = [
            "asset_class": World2AssetWorkbenchContract.assetClass,
            "candidate_count": pack?.candidates.count ?? 0,
            "job": job?.id ?? "none",
            "job_stage": job?.stage.rawValue ?? "none",
            "phase": phase.rawValue,
            "recipe": recipe?.ideaIDs ?? [],
            "selected_count": selectedCandidateIDs.count,
        ]
        guard let data = try? JSONSerialization.data(
            withJSONObject: value,
            options: [.sortedKeys]
        ) else {
            return #"{"phase":"invalid"}"#
        }
        return String(data: data, encoding: .utf8) ?? #"{"phase":"invalid"}"#
    }

    func generate() {
        guard let recipe, canGenerate else { return }
        generationTask?.cancel()
        phase = .generating
        job = nil
        pack = nil
        award = nil
        selectedCandidateIDs = []
        candidateImages = [:]
        errorMessage = nil

        generationTask = Task { [weak self] in
            guard let self else { return }
            do {
                var current = try await service.startGeneration(
                    recipe: recipe,
                    playerID: playerID
                )
                job = current

                var pollCount = 0
                while current.stage != .ready && current.stage != .failed {
                    try Task.checkCancellation()
                    guard pollCount < 180 else {
                        throw World2AssetWorkbenchError.serverFailure("poll-timeout")
                    }
                    try await Task.sleep(for: .milliseconds(700))
                    current = try await service.job(id: current.id)
                    job = current
                    pollCount += 1
                }

                guard current.stage == .ready, let readyPack = current.pack else {
                    throw World2AssetWorkbenchError.serverFailure(
                        current.errorCode ?? "generation-failed"
                    )
                }
                try readyPack.validateForPlayerPresentation()
                pack = readyPack
                phase = .choosing
                await loadCandidateImages(from: readyPack)
                logDiagnostic("pack_ready")
            } catch is CancellationError {
                return
            } catch {
                errorMessage = error.localizedDescription
                phase = .composing
                logDiagnostic("generation_failed")
            }
        }
    }

    func toggleCandidate(_ candidate: World2AssetWorkbenchCandidate) {
        guard phase == .choosing,
              pack?.candidates.contains(where: { $0.id == candidate.id }) == true else {
            return
        }
        if selectedCandidateIDs.contains(candidate.id) {
            selectedCandidateIDs.remove(candidate.id)
        } else if selectedCandidateIDs.count < World2AssetWorkbenchContract.selectionCount {
            selectedCandidateIDs.insert(candidate.id)
        }
    }

    func confirmSelection() {
        guard let pack, canConfirmSelection else { return }
        do {
            award = try World2AssetWorkbenchAward.make(
                from: pack,
                selectedCandidateIDs: selectedCandidateIDs
            )
            phase = .awarded
            errorMessage = nil
            logDiagnostic("selection_awarded")
        } catch {
            errorMessage = error.localizedDescription
            logDiagnostic("selection_failed")
        }
    }

    func reset() {
        generationTask?.cancel()
        generationTask = nil
        phase = .composing
        job = nil
        pack = nil
        award = nil
        selectedCandidateIDs = []
        candidateImages = [:]
        errorMessage = nil
        logDiagnostic("reset")
    }

    func cancelGeneration() {
        guard phase == .generating else { return }
        reset()
    }

    private func loadCandidateImages(from pack: World2AssetWorkbenchPack) async {
        for candidate in pack.candidates {
            guard !Task.isCancelled else { return }
            guard let data = try? await service.imageData(for: candidate),
                  let image = UIImage(data: data) else {
                continue
            }
            candidateImages[candidate.id] = image
        }
    }

    private func selectedCard(
        at index: Int?,
        in cards: [World2WorkbenchIdeaCard]
    ) -> World2WorkbenchIdeaCard? {
        guard let index, cards.indices.contains(index) else { return nil }
        return cards[index]
    }

    private func logDiagnostic(_ event: String) {
        World2Diagnostics.log(
            "asset_workbench_\(event)",
            ["summary": diagnosticSummary]
        )
    }
}
